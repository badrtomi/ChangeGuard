import fs from "node:fs";

const source = fs.readFileSync(new URL("../contracts/changeguard.py", import.meta.url), "utf8");
const required = [
  "class ChangeGuard(gl.Contract)",
  "def review_change(self, api_area: str, current_contract: str, proposed_change: str)",
  "def get_reviews(self) -> list",
  "def get_count(self) -> int",
  "run_nondet_unsafe",
  "impact",
  "version_lane",
  "compatibility_score",
];

for (const token of required) {
  if (!source.includes(token)) throw new Error(`Contract schema is missing: ${token}`);
}

if (!/def __init__\(self\):/.test(source)) throw new Error("ChangeGuard constructor must not require arguments");
if (source.includes("py-genlayer:test") || source.includes("py-genlayer:latest")) throw new Error("Contract must use a pinned GenVM runner.");

console.log("ChangeGuard contract schema looks valid.");
