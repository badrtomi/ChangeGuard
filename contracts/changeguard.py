# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

from genlayer import *
import json

ALLOWED_IMPACT = ["SAFE", "NOTICE", "MIGRATION", "BREAKING"]
ALLOWED_LANES = ["patch", "minor", "major", "hold"]


def _to_int(value) -> int:
    try:
        n = int(value)
    except Exception:
        raise gl.vm.UserError("[LLM_ERROR] numeric field is invalid")
    if n < 0:
        return 0
    if n > 100:
        return 100
    return n


def _to_bool(value) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.strip().lower() in ["true", "yes", "1", "required"]
    return bool(value)


def _parse_review(raw: str) -> dict:
    first = raw.find("{")
    last = raw.rfind("}")
    if first < 0 or last < first:
        raise gl.vm.UserError("[LLM_ERROR] missing JSON object")

    data = json.loads(raw[first:last + 1])
    impact = str(data.get("impact", "")).strip().upper()
    lane = str(data.get("version_lane", "")).strip().lower()

    if impact not in ALLOWED_IMPACT:
        raise gl.vm.UserError("[LLM_ERROR] invalid impact")
    if lane not in ALLOWED_LANES:
        raise gl.vm.UserError("[LLM_ERROR] invalid version lane")

    return {
        "impact": impact,
        "version_lane": lane,
        "compatibility_score": _to_int(data.get("compatibility_score")),
        "migration_required": _to_bool(data.get("migration_required")),
        "notice": str(data.get("notice", ""))[:220],
        "reason": str(data.get("reason", ""))[:240],
    }


def _impact_family(impact: str) -> str:
    if impact in ["SAFE", "NOTICE"]:
        return "compatible"
    if impact in ["MIGRATION", "BREAKING"]:
        return "migration"
    return "unknown"


def _lane_family(lane: str) -> str:
    if lane in ["patch", "minor"]:
        return "compatible"
    if lane in ["major", "hold"]:
        return "migration"
    return "unknown"


class ChangeGuard(gl.Contract):
    reviews: DynArray[str]
    review_count: u32

    def __init__(self):
        self.review_count = 0

    @gl.public.view
    def get_reviews(self) -> list:
        return list(self.reviews)

    @gl.public.view
    def get_count(self) -> int:
        return self.review_count

    @gl.public.write
    def review_change(self, api_area: str, current_contract: str, proposed_change: str) -> None:
        area = api_area.strip()
        current = current_contract.strip()
        proposed = proposed_change.strip()

        if len(area) < 3:
            raise gl.vm.UserError("[EXPECTED] API area is required")
        if len(current) < 30 or len(proposed) < 40:
            raise gl.vm.UserError("[EXPECTED] current and proposed API descriptions must be detailed")
        if len(current) > 1200 or len(proposed) > 1400:
            raise gl.vm.UserError("[EXPECTED] API review text is too long")

        def leader_fn() -> dict:
            prompt = f"""You are an API compatibility reviewer.

Assess whether the proposed API change is backward compatible. Consider removed fields, renamed fields, changed defaults, stricter validation, response shape changes, auth behavior, pagination, status codes, and client migration burden.

API AREA:
{area}

CURRENT CONTRACT:
{current}

PROPOSED CHANGE:
{proposed}

Return ONLY JSON:
{{
  "impact": "SAFE" | "NOTICE" | "MIGRATION" | "BREAKING",
  "version_lane": "patch" | "minor" | "major" | "hold",
  "compatibility_score": integer 0-100,
  "migration_required": true/false,
  "notice": "developer notice or migration instruction, max 220 chars",
  "reason": "compatibility reasoning, max 240 chars"
}}

Rules:
- BREAKING means existing clients can fail or receive incompatible semantics.
- MIGRATION means compatible only with client work or dual-write/read support.
- NOTICE means compatible but developers should be warned.
- SAFE means normal patch-level compatibility.
Pure JSON only."""
            result = (
                gl.nondet.exec_prompt(prompt)
                .replace("```json", "")
                .replace("```", "")
            )
            return _parse_review(result)

        def validator_fn(leaders_res: gl.vm.Result) -> bool:
            if not isinstance(leaders_res, gl.vm.Return):
                return False

            leader = leaders_res.calldata
            validator = leader_fn()

            if leader["impact"] not in ALLOWED_IMPACT:
                return False
            if leader["version_lane"] not in ALLOWED_LANES:
                return False
            if len(leader["notice"]) < 12 or len(leader["reason"]) < 20:
                return False

            same_risk_family = _impact_family(leader["impact"]) == _impact_family(validator["impact"])
            same_lane_family = _lane_family(leader["version_lane"]) == _lane_family(validator["version_lane"])
            close_score = abs(leader["compatibility_score"] - validator["compatibility_score"]) <= 35

            if not (same_risk_family or same_lane_family or close_score):
                return False
            return True

        review = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)
        record = {
            "id": str(self.review_count + 1),
            "submitter": str(gl.message.sender_address),
            "api_area": area,
            "current_contract": current,
            "proposed_change": proposed,
            "impact": review["impact"],
            "version_lane": review["version_lane"],
            "compatibility_score": review["compatibility_score"],
            "migration_required": review["migration_required"],
            "notice": review["notice"],
            "reason": review["reason"],
        }
        self.reviews.append(json.dumps(record))
        self.review_count += 1
