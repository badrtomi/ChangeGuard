# ChangeGuard

Consensus compatibility reviews for API changes.

ChangeGuard is a GenLayer app for teams that need an auditable answer to a deceptively hard question: will this API change break existing clients? A maintainer submits the current API contract and the proposed change. GenLayer validators independently review the change and agree on impact, version lane, compatibility score, migration requirement, notice, and reason.

## Live status

- App: [https://changeguard-genlayer.vercel.app](https://changeguard-genlayer.vercel.app)
- Contract: [0x76bBbfEd4eFEC26BC788B6B22fEb1fb700b74105](https://explorer-bradbury.genlayer.com/address/0x76bBbfEd4eFEC26BC788B6B22fEb1fb700b74105)
- Network: GenLayer Bradbury Testnet, Chain ID `4221`
- RPC: `https://rpc-bradbury.genlayer.com`
- Deployment transaction: [0xafd706917574d767018283d4c8c3afd45a30cc197d8d84a8be62edb088ce2352](https://explorer-bradbury.genlayer.com/tx/0xafd706917574d767018283d4c8c3afd45a30cc197d8d84a8be62edb088ce2352) — `ACCEPTED / AGREE / FINISHED_WITH_RETURN`
- Contract source: [`contracts/changeguard.py`](contracts/changeguard.py)

## Why GenLayer matters

API compatibility is subjective but structured. A rename can be safe in one payload and breaking in another. A new default can silently alter client behavior. A stricter validator can reject previously valid requests. ChangeGuard puts this judgment into a validator-agreed on-chain review instead of a private comment thread.

Validators must independently agree on:

- `impact`
- `version_lane`
- `migration_required`
- `compatibility_score` and impact family with tolerance, so validators can agree on the same compatibility direction without needing identical prose

## Output

Each finalized review stores:

- API area
- current API contract
- proposed change
- impact: `SAFE`, `NOTICE`, `MIGRATION`, or `BREAKING`
- version lane: `patch`, `minor`, `major`, or `hold`
- compatibility score
- migration requirement
- developer notice
- reasoning

## Local

```bash
npm install
npm run schema
npm run typecheck
npm run build
```

Run locally:

```bash
cp .env.example .env
npm run dev
```

Set after deployment:

```bash
VITE_CONTRACT_ADDRESS=<deployed-contract-address>
VITE_GENLAYER_RPC_URL=https://rpc-bradbury.genlayer.com
```
