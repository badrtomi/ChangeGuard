# ChangeGuard

** reviews for API changes on GenLayer.**

ChangeGuard helps product and engineering teams answer a high-impact question before shipping: **will this API change break existing clients?** A maintainer submits the current API contract and a proposed change. A GenLayer Intelligent Contract asks independent validators to review the compatibility risk, then stores the finalized review on-chain.

Instead of treating release risk as a private checklist or a vague AI answer, ChangeGuard turns it into a structured consensus record: impact, version lane, compatibility score, migration requirement, developer notice, and reasoning.

## Live deployment

- App: [https://changeguard-genlayer-eight.vercel.app] (https://changeguard-genlayer-eight.vercel.app)

- Network: GenLayer Bradbury Testnet, Chain ID `4221`
- RPC: `https://rpc-bradbury.genlayer.com`
- Explorer: [https://explorer-bradbury.genlayer.com](https://explorer-bradbury.genlayer.com)
- Contract: [0x76bBbfEd4eFEC26BC788B6B22fEb1fb700b74105](https://explorer-bradbury.genlayer.com/address/0x76bBbfEd4eFEC26BC788B6B22fEb1fb700b74105)
- Deployment transaction: [0xafd706917574d767018283d4c8c3afd45a30cc197d8d84a8be62edb088ce2352](https://explorer-bradbury.genlayer.com/tx/0xafd706917574d767018283d4c8c3afd45a30cc197d8d84a8be62edb088ce2352) — `ACCEPTED / AGREE / FINISHED_WITH_RETURN`
- Verified app transaction: [0x2144bb084a879724c75faddc0156bbba7710cb978c5b8ca5c0601142a679384b](https://explorer-bradbury.genlayer.com/tx/0x2144bb084a879724c75faddc0156bbba7710cb978c5b8ca5c0601142a679384b) — `FINALIZED / AGREE / FINISHED_WITH_RETURN`

## What the app does

ChangeGuard provides a small but complete workflow:

1. Connect a wallet on GenLayer Bradbury Testnet.
2. Submit an API area, current API contract, and proposed change.
3. The GenLayer contract asks validators to independently judge compatibility.
4. Validators agree on a structured review.
5. The finalized review is stored on-chain and displayed in the app ledger.
6. The app exposes the latest transaction hash with a direct explorer link.

## Why GenLayer is central

API compatibility is not a simple yes/no check. The same change can be safe, risky, or breaking depending on response shape, defaults, pagination, validation rules, auth behavior, and client expectations.

ChangeGuard uses GenLayer because the core judgment is subjective but still needs a neutral, reproducible settlement process. The Intelligent Contract runs a validator-reviewed analysis and requires validators to agree on the same compatibility direction instead of trusting one server-side AI response.

The contract evaluates:

- removed or renamed fields
- response-shape changes
- new defaults or stricter validation
- auth and status-code behavior
- pagination and filtering changes
- migration burden for existing clients

## Consensus output

Each finalized review stores:

- `api_area`
- `current_contract`
- `proposed_change`
- `impact`: `SAFE`, `NOTICE`, `MIGRATION`, or `BREAKING`
- `version_lane`: `patch`, `minor`, `major`, or `hold`
- `compatibility_score`: integer from `0` to `100`
- `migration_required`: `true` or `false`
- `notice`: short developer-facing instruction
- `reason`: validator-approved compatibility reasoning

## Contract design

The contract source lives in [`contracts/changeguard.py`](contracts/changeguard.py).

Important implementation details:

- Uses a pinned GenVM runner dependency.
- Exposes `review_change(api_area, current_contract, proposed_change)` as the main write method.
- Exposes `get_reviews()` and `get_count()` as read methods.
- Parses validator output as strict JSON.
- Restricts impact and version-lane values to known enums.
- Uses a tolerant validator comparison so independent validators can agree on the same risk family without needing identical prose.
- Stores finalized review records as JSON strings on-chain.

## Frontend

The frontend is a Vite + React app with a blueprint-style API review interface:

- wallet connection
- Bradbury network setup
- compatibility intake form
- latest transaction explorer panel
- on-chain review ledger
- responsive layout for desktop and mobile

## Reproduce locally

```bash
npm install
npm run schema
npm run typecheck
npm run build
```

Run the app locally:

```bash
cp .env.example .env
npm run dev
```

Required environment variables:

```bash
VITE_CONTRACT_ADDRESS=0x76bBbfEd4eFEC26BC788B6B22fEb1fb700b74105
VITE_GENLAYER_RPC_URL=https://rpc-bradbury.genlayer.com
```

## Test flow

1. Open the live app.
2. Connect MetaMask.
3. Keep the sample API change or submit another detailed API change.
4. Click **Run compatibility consensus**.
5. Open the generated transaction in the explorer.
6. Wait for `FINALIZED / AGREE`.
7. Refresh the app ledger to see the finalized review.

## Project structure

```txt
contracts/changeguard.py        GenLayer Intelligent Contract
scripts/validate-contract.mjs   lightweight contract schema check
src/                            React frontend
src/App.tsx                     wallet, contract calls, app UI
src/styles.css                  responsive blueprint-style design
```

## Submission note

ChangeGuard is a complete GenLayer project: it includes a real Intelligent Contract deployed on Bradbury Testnet, a public frontend that interacts with the contract, finalized transaction evidence, and reproducible local instructions.
