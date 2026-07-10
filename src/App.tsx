import { useEffect, useMemo, useState } from "react";
import { createClient } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";
import { ArrowRight, Braces, Cable, CheckCircle2, Copy, ExternalLink, FileDiff, GitCompareArrows, Radar, ShieldCheck, Wallet } from "lucide-react";

type Review = {
  id: string;
  submitter: string;
  api_area: string;
  current_contract: string;
  proposed_change: string;
  impact: string;
  version_lane: string;
  compatibility_score: number;
  migration_required: boolean;
  notice: string;
  reason: string;
};

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || "";
const RPC_URL = import.meta.env.VITE_GENLAYER_RPC_URL || "https://rpc-bradbury.genlayer.com";
const EXPLORER_URL = "https://explorer-bradbury.genlayer.com";

const impactClass: Record<string, string> = {
  SAFE: "impact safe",
  NOTICE: "impact notice",
  MIGRATION: "impact migration",
  BREAKING: "impact breaking",
};

function shortAddress(address?: string | null) {
  if (!address) return "";
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function parseReview(entry: unknown): Review | null {
  if (typeof entry !== "string") return null;
  try {
    const parsed = JSON.parse(entry);
    return {
      id: String(parsed.id || "0"),
      submitter: String(parsed.submitter || ""),
      api_area: String(parsed.api_area || ""),
      current_contract: String(parsed.current_contract || ""),
      proposed_change: String(parsed.proposed_change || ""),
      impact: String(parsed.impact || "NOTICE"),
      version_lane: String(parsed.version_lane || "minor"),
      compatibility_score: Number(parsed.compatibility_score || 0),
      migration_required: Boolean(parsed.migration_required),
      notice: String(parsed.notice || ""),
      reason: String(parsed.reason || ""),
    };
  } catch {
    return null;
  }
}

export default function App() {
  const [account, setAccount] = useState("");
  const [apiArea, setApiArea] = useState("Customer invoices API");
  const [currentContract, setCurrentContract] = useState("GET /v1/invoices returns id, customer_id, amount_cents, status, due_date, and line_items. Clients can filter by status and receive paginated results with next_cursor.");
  const [proposedChange, setProposedChange] = useState("Add an optional generated_at field to invoice responses and support async CSV export through a new /v1/invoices/export endpoint. Existing fields, filters, pagination, status codes, and amount_cents remain unchanged.");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [status, setStatus] = useState("Deploy ChangeGuard to activate live compatibility reviews.");
  const [lastTx, setLastTx] = useState("");
  const [busy, setBusy] = useState(false);

  const client = useMemo(() => createClient({
    chain: testnetBradbury,
    endpoint: RPC_URL,
    account: account ? (account as `0x${string}`) : undefined,
  } as any), [account]);

  async function connectWallet() {
    const ethereum = (window as any).ethereum;
    if (!ethereum) {
      setStatus("MetaMask is not installed.");
      return;
    }
    const accounts = await ethereum.request({ method: "eth_requestAccounts" });
    const selected = accounts?.[0] || "";
    try {
      await ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0x107d" }] });
    } catch (error: any) {
      if (error?.code === 4902) {
        await ethereum.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: "0x107d",
            chainName: "GenLayer Bradbury Testnet",
            nativeCurrency: { name: "GEN", symbol: "GEN", decimals: 18 },
            rpcUrls: ["https://rpc-bradbury.genlayer.com"],
            blockExplorerUrls: ["https://explorer-bradbury.genlayer.com"],
          }],
        });
      } else {
        throw error;
      }
    }
    setAccount(selected);
    setStatus(`Wallet connected: ${shortAddress(selected)}`);
  }

  async function loadReviews() {
    if (!CONTRACT_ADDRESS) {
      setReviews([]);
      return;
    }
    const raw = await client.readContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      functionName: "get_reviews",
      args: [],
    } as any);
    const parsed = Array.isArray(raw) ? raw.map(parseReview).filter(Boolean) as Review[] : [];
    setReviews(parsed.reverse());
  }

  async function submitReview(event: React.FormEvent) {
    event.preventDefault();
    if (!CONTRACT_ADDRESS) {
      setStatus("Deploy the ChangeGuard contract first, then add VITE_CONTRACT_ADDRESS.");
      return;
    }
    if (!account) {
      await connectWallet();
      return;
    }
    setBusy(true);
    setLastTx("");
    setStatus("Submitting compatibility review to validators…");
    try {
      const hash = await client.writeContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        functionName: "review_change",
        args: [apiArea, currentContract, proposedChange],
        value: BigInt(0),
      } as any);
      setLastTx(hash);
      window.localStorage.setItem("changeguard:lastTx", hash);
      setStatus("Consensus running. Waiting for finalization…");
      await client.waitForTransactionReceipt({ hash, status: "FINALIZED" } as any);
      setStatus("Finalized. Compatibility review stored on-chain.");
      await loadReviews();
    } catch (error: any) {
      setStatus(error?.message || "Transaction failed.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    const cachedTx = window.localStorage.getItem("changeguard:lastTx");
    if (cachedTx) setLastTx(cachedTx);
    loadReviews().catch(() => setStatus("Could not load reviews yet."));
  }, [client]);

  async function copyLastTx() {
    if (!lastTx) return;
    await navigator.clipboard.writeText(lastTx);
    setStatus("Transaction hash copied.");
  }

  const breaking = reviews.filter((review) => review.impact === "BREAKING" || review.impact === "MIGRATION").length;

  return (
    <main className="page">
      <nav className="topbar">
        <div className="brand"><span><Braces size={22} /></span>ChangeGuard</div>
        <div className="navlinks">
          <a href="#review-form" className="active">Compatibility Gate</a>
          <a href="#ledger">Review Ledger</a>
          <a href="#review-form">API Diff</a>
          <a href="#ledger">Validator Proof</a>
        </div>
        <button className="wallet" onClick={connectWallet}><Wallet size={18} />{account ? shortAddress(account) : "Connect"}</button>
      </nav>

      <section className="hero">
        <div className="hero-copy">
          <p className="kicker"><ShieldCheck size={16} /> API compatibility by consensus</p>
          <h1>Map API changes before they break clients.</h1>
          <p className="lead">ChangeGuard turns interface diffs into validator-approved compatibility records: impact, version lane, migration requirement, developer notice, and reason.</p>
          <div className="cta-row">
            <a className="button primary" href="#review-form">Review a change <ArrowRight size={18} /></a>
            <a className="button secondary" href="#ledger">Open ledger <GitCompareArrows size={18} /></a>
          </div>
        </div>
        <aside className="blueprint-card">
          <div className="blueprint-top"><FileDiff size={18} /> Interface diff map</div>
          <div className="diff-map">
            <div className="endpoint">GET /v1/invoices</div>
            <div className="field-row stable"><span>amount_cents</span><strong>stable</strong></div>
            <div className="field-row added"><span>generated_at</span><strong>optional</strong></div>
            <div className="field-row changed"><span>/export endpoint</span><strong>new</strong></div>
          </div>
          <div className="mini-stats">
            <div><strong>{reviews.length}</strong><span>reviews</span></div>
            <div><strong>{breaking}</strong><span>risky</span></div>
            <div><strong>{reviews[0]?.compatibility_score ?? "--"}</strong><span>score</span></div>
          </div>
          <div className="status"><span />{status}</div>
          {lastTx && <a href={`${EXPLORER_URL}/tx/${lastTx}`} target="_blank" rel="noreferrer">View transaction</a>}
        </aside>
      </section>

      <section className="grid">
        <form id="review-form" className="panel form" onSubmit={submitReview}>
          <div className="section-title"><Cable size={20} /><div><p>Compatibility intake</p><h2>Submit API change</h2></div></div>
          <label>API area<input value={apiArea} onChange={(event) => setApiArea(event.target.value)} required minLength={3} /></label>
          <label>Current API contract<textarea value={currentContract} onChange={(event) => setCurrentContract(event.target.value)} rows={5} required minLength={30} /></label>
          <label>Proposed change<textarea value={proposedChange} onChange={(event) => setProposedChange(event.target.value)} rows={5} required minLength={40} /></label>
          <button className="submit" disabled={busy}>{busy ? "Consensus running…" : "Run compatibility consensus"}</button>
          <div className="explorer-box">
            <div>
              <p>Latest transaction</p>
              <strong>{lastTx ? shortAddress(lastTx) : "No transaction yet"}</strong>
            </div>
            <div className="explorer-actions">
              {lastTx ? (
                <>
                  <a href={`${EXPLORER_URL}/tx/${lastTx}`} target="_blank" rel="noreferrer"><ExternalLink size={16} /> Explorer</a>
                  <button type="button" onClick={copyLastTx}><Copy size={16} /> Copy hash</button>
                </>
              ) : (
                <a href={`${EXPLORER_URL}/address/${CONTRACT_ADDRESS}`} target="_blank" rel="noreferrer"><ExternalLink size={16} /> Contract</a>
              )}
            </div>
          </div>
        </form>

        <section id="ledger" className="panel ledger">
          <div className="section-title"><Radar size={20} /><div><p>On-chain reviews</p><h2>Compatibility ledger</h2></div></div>
          {reviews.length === 0 ? (
          <div className="empty"><CheckCircle2 size={30} /><h3>No finalized reviews yet</h3><p>Deploy the contract and run the sample review to populate the validator ledger.</p></div>
          ) : (
            <div className="review-list">
              {reviews.map((review) => (
                <article className="review-card" key={review.id}>
                  <div className="review-top"><span className={impactClass[review.impact] || "impact notice"}>{review.impact}</span><span className="lane">{review.version_lane}</span></div>
                  <h3>{review.api_area}</h3>
                  <p>{review.reason}</p>
                  <div className="score">{review.compatibility_score}/100 compatibility</div>
                  <div className="notice"><span>Developer notice</span><strong>{review.notice}</strong></div>
                  <div className="migration">Migration required: {review.migration_required ? "yes" : "no"}</div>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
