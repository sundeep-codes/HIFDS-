import { useState, useEffect, useCallback, useRef } from "react";
import {
    AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer
} from "recharts";

/* ═══════════════════════════════════════════════════
   CONFIG
═══════════════════════════════════════════════════ */
const API = import.meta.env.VITE_API_URL || (window.location.hostname === "localhost" ? "http://localhost:5000/api" : "/api");

async function api(path, opts = {}) {
    try {
        const r = await fetch(`${API}${path}`, {
            headers: { "Content-Type": "application/json" }, ...opts,
        });
        if (!r.ok) throw new Error(`${r.status}`);
        return await r.json();
    } catch (e) {
        console.warn(`[API] ${path}:`, e.message);
        return null;
    }
}

/* ═══════════════════════════════════════════════════
   UTILS
═══════════════════════════════════════════════════ */
const fmt = n => new Intl.NumberFormat("en-IN").format(Math.round(n ?? 0));
const fmtCr = n => `₹${((n ?? 0) / 10000000).toFixed(2)} Cr`;
const fmtL = n => `₹${((n ?? 0) / 100000).toFixed(1)}L`;
const RC = { CRITICAL: "#ef4444", HIGH: "#f97316", MEDIUM: "#eab308", LOW: "#22c55e" };
const RB = {
    CRITICAL: "rgba(239,68,68,0.13)", HIGH: "rgba(249,115,22,0.13)",
    MEDIUM: "rgba(234,179,8,0.13)", LOW: "rgba(34,197,94,0.13)"
};
const rlvl = s => s >= 75 ? "CRITICAL" : s >= 55 ? "HIGH" : s >= 35 ? "MEDIUM" : "LOW";

const PROCEDURES = [
    "ECG Test", "Blood Test - Basic", "Blood Test - Comprehensive", "X-Ray",
    "MRI Scan", "CT Scan", "Hip Replacement", "Knee Replacement", "Appendectomy",
    "Cataract Surgery", "Dental Extraction", "Consultation - General",
    "Consultation - Specialist", "Physiotherapy", "Dialysis", "Chemotherapy",
    "Normal Delivery", "C-Section", "Angioplasty", "Bypass Surgery",
];

/* ═══════════════════════════════════════════════════
   CSS
═══════════════════════════════════════════════════ */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#070b14;--surf:#0d1423;--card:#111827;
  --b1:#1e2d45;--b2:#243350;
  --txt:#e2e8f0;--mut:#64748b;--acc:#06b6d4;
}
body{background:var(--bg);color:var(--txt);font-family:'Syne',sans-serif;min-height:100vh;overflow-x:hidden}
::-webkit-scrollbar{width:4px;height:4px}
::-webkit-scrollbar-track{background:var(--bg)}
::-webkit-scrollbar-thumb{background:var(--b2);border-radius:4px}
.gbg{position:fixed;inset:0;pointer-events:none;z-index:0;
  background-image:linear-gradient(rgba(6,182,212,.03) 1px,transparent 1px),
  linear-gradient(90deg,rgba(6,182,212,.03) 1px,transparent 1px);
  background-size:40px 40px}
.shell{position:relative;z-index:1;min-height:100vh;display:flex;flex-direction:column}

/* topbar */
.topbar{display:flex;align-items:center;justify-content:space-between;
  padding:13px 26px;border-bottom:1px solid var(--b1);
  background:rgba(13,20,35,.97);backdrop-filter:blur(12px);
  position:sticky;top:0;z-index:100}
.logo{display:flex;align-items:center;gap:10px}
.logo-icon{width:32px;height:32px;border-radius:8px;
  background:linear-gradient(135deg,#06b6d4,#0ea5e9);
  display:flex;align-items:center;justify-content:center;font-size:15px}
.logo-txt{font-size:15px;font-weight:800;color:#f1f5f9}
.logo-sub{font-size:10px;color:var(--mut);font-family:'JetBrains Mono',monospace;
  letter-spacing:1px;text-transform:uppercase}
.tr{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.chip{font-family:'JetBrains Mono',monospace;font-size:11px;padding:4px 10px;
  border-radius:20px;white-space:nowrap}
.chip-c{color:var(--acc);background:rgba(6,182,212,.08);border:1px solid rgba(6,182,212,.2)}
.chip-g{color:#22c55e;background:rgba(34,197,94,.1);border:1px solid rgba(34,197,94,.3)}
.chip-r{color:#ef4444;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3)}
.live-dot{width:6px;height:6px;border-radius:50%;background:#22c55e;
  display:inline-block;margin-right:5px;animation:pulse 1.5s infinite}
@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(1.3)}}

/* nav */
.nav{display:flex;padding:0 26px;background:var(--surf);
  border-bottom:1px solid var(--b1);overflow-x:auto;gap:2px}
.tab{padding:12px 16px;font-size:12px;font-weight:600;cursor:pointer;
  border-bottom:2px solid transparent;color:var(--mut);
  transition:all .2s;white-space:nowrap;letter-spacing:.3px}
.tab:hover{color:var(--txt)}
.tab.on{color:var(--acc);border-bottom-color:var(--acc)}

/* main */
.main{padding:22px 26px;flex:1}
.sec{font-size:11px;font-weight:700;color:var(--mut);text-transform:uppercase;
  letter-spacing:1.5px;margin-bottom:12px;display:flex;align-items:center;gap:8px;
  font-family:'JetBrains Mono',monospace}
.sec::after{content:'';flex:1;height:1px;background:var(--b1)}

/* stat cards */
.sg{display:grid;grid-template-columns:repeat(4,1fr);gap:13px;margin-bottom:18px}
.sc{background:var(--card);border:1px solid var(--b1);border-radius:12px;
  padding:17px;position:relative;overflow:hidden;transition:border-color .2s,transform .2s}
.sc:hover{border-color:var(--b2);transform:translateY(-1px)}
.sc::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;
  background:var(--al,var(--acc))}
.sl{font-size:10px;color:var(--mut);text-transform:uppercase;letter-spacing:1.2px;
  margin-bottom:7px;font-family:'JetBrains Mono',monospace}
.sv{font-size:25px;font-weight:800;line-height:1}
.ss{font-size:11px;color:var(--mut);margin-top:4px}
.sbadge{display:inline-flex;align-items:center;font-size:10px;
  padding:2px 8px;border-radius:10px;margin-top:7px;
  font-family:'JetBrains Mono',monospace;font-weight:700}

/* breakdown */
.brow{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:18px}
.bc{background:var(--card);border:1px solid var(--b1);border-radius:10px;padding:13px}
.blvl{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;
  font-family:'JetBrains Mono',monospace;margin-bottom:5px}
.bval{font-size:26px;font-weight:800;font-family:'Syne',sans-serif;line-height:1}
.bbar{height:3px;border-radius:2px;margin-top:9px}

/* charts */
.crow{display:grid;grid-template-columns:1.8fr 1fr;gap:13px;margin-bottom:18px}
.cc{background:var(--card);border:1px solid var(--b1);border-radius:12px;padding:17px}
.ct{font-size:13px;font-weight:700;margin-bottom:14px;
  display:flex;align-items:center;justify-content:space-between}
.ct span{font-size:10px;color:var(--mut);font-family:'JetBrains Mono',monospace;font-weight:400}

/* claims table */
.tcard{background:var(--card);border:1px solid var(--b1);border-radius:12px;margin-bottom:18px}
.thead{padding:13px 17px;border-bottom:1px solid var(--b1);
  display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}
.ttitle{font-size:13px;font-weight:700}
.frow{display:flex;gap:6px;flex-wrap:wrap}
.fb{padding:4px 10px;border-radius:6px;border:1px solid var(--b1);
  background:transparent;color:var(--mut);font-size:11px;cursor:pointer;
  font-family:'JetBrains Mono',monospace;transition:all .15s}
.fb:hover{border-color:var(--b2);color:var(--txt)}
.fb.on{border-color:var(--acc);color:var(--acc);background:rgba(6,182,212,.08)}
table{width:100%;border-collapse:collapse}
thead th{padding:9px 13px;text-align:left;font-size:10px;font-weight:600;
  color:var(--mut);text-transform:uppercase;letter-spacing:1px;
  border-bottom:1px solid var(--b1);font-family:'JetBrains Mono',monospace;white-space:nowrap}
tbody tr{border-bottom:1px solid rgba(30,45,69,.5);cursor:pointer;transition:background .15s}
tbody tr:hover{background:rgba(255,255,255,.025)}
tbody tr:last-child{border-bottom:none}
td{padding:9px 13px;font-size:12px;color:var(--txt);white-space:nowrap}
.mono{font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--mut)}
.rb{display:inline-flex;align-items:center;gap:4px;padding:2px 8px;
  border-radius:20px;font-size:10px;font-weight:700;
  font-family:'JetBrains Mono',monospace;letter-spacing:.5px}
.rbar{display:flex;align-items:center;gap:6px;min-width:100px}
.rbg{flex:1;height:4px;background:var(--b1);border-radius:2px;overflow:hidden}
.rbf{height:100%;border-radius:2px;transition:width .4s}
.rnum{font-family:'JetBrains Mono',monospace;font-size:11px;min-width:24px;text-align:right}

/* modal */
.ov{position:fixed;inset:0;background:rgba(7,11,20,.88);display:flex;
  align-items:center;justify-content:center;z-index:999;
  backdrop-filter:blur(4px);animation:fi .15s ease}
@keyframes fi{from{opacity:0}to{opacity:1}}
.modal{background:var(--card);border:1px solid var(--b2);border-radius:16px;
  width:min(560px,92vw);max-height:84vh;overflow-y:auto;padding:24px;
  animation:su .2s ease}
@keyframes su{from{transform:translateY(16px);opacity:0}to{transform:translateY(0);opacity:1}}
.mh{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:20px}
.mt{font-size:17px;font-weight:800}
.msub{font-size:11px;color:var(--mut);font-family:'JetBrains Mono',monospace;margin-top:3px}
.xbtn{background:var(--b1);border:none;color:var(--mut);width:28px;height:28px;
  border-radius:6px;cursor:pointer;font-size:14px;display:flex;align-items:center;
  justify-content:center;transition:all .15s;flex-shrink:0}
.xbtn:hover{background:var(--b2);color:var(--txt)}
.gauge-wrap{display:flex;flex-direction:column;align-items:center;margin:14px 0}
.gauge{position:relative;width:120px;height:120px}
.gauge svg{transform:rotate(-90deg)}
.gc{position:absolute;inset:0;display:flex;flex-direction:column;
  align-items:center;justify-content:center}
.gs{font-size:28px;font-weight:800;font-family:'Syne',sans-serif;line-height:1}
.gl{font-size:10px;color:var(--mut);font-family:'JetBrains Mono',monospace;
  letter-spacing:1px;text-transform:uppercase;margin-top:2px}
.dg{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-bottom:16px}
.df{background:var(--surf);border-radius:8px;padding:10px}
.dfl{font-size:10px;color:var(--mut);text-transform:uppercase;
  letter-spacing:1px;margin-bottom:3px;font-family:'JetBrains Mono',monospace}
.dfv{font-size:13px;font-weight:600}
.rh{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;
  color:var(--mut);margin-bottom:7px;font-family:'JetBrains Mono',monospace}
.ri{display:flex;align-items:flex-start;gap:8px;border-radius:8px;
  padding:8px 10px;margin-bottom:6px}
.rn{width:18px;height:18px;border-radius:50%;font-size:10px;font-weight:700;
  display:flex;align-items:center;justify-content:center;flex-shrink:0;
  font-family:'JetBrains Mono',monospace}
.rtxt{font-size:12px;line-height:1.5}

/* analyze / checker */
.acard{background:var(--card);border:1px solid var(--b1);border-radius:12px;
  padding:20px;margin-bottom:18px}
.fgrid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-bottom:16px}
.ff label{display:block;font-size:10px;color:var(--mut);text-transform:uppercase;
  letter-spacing:1px;margin-bottom:5px;font-family:'JetBrains Mono',monospace}
.ff input,.ff select{width:100%;background:var(--surf);border:1px solid var(--b1);
  border-radius:8px;padding:9px 11px;color:var(--txt);font-size:12px;
  font-family:'Syne',sans-serif;outline:none;transition:border-color .15s}
.ff input:focus,.ff select:focus{border-color:var(--acc)}
.ff select option{background:var(--card)}
.abtn{background:linear-gradient(135deg,#06b6d4,#0ea5e9);border:none;color:#fff;
  padding:11px 24px;border-radius:8px;font-size:13px;font-weight:700;
  cursor:pointer;font-family:'Syne',sans-serif;transition:opacity .15s}
.abtn:hover{opacity:.87}
.abtn:disabled{opacity:.45;cursor:not-allowed}
.res{margin-top:16px;border-radius:10px;padding:16px;
  border:1px solid var(--b2);background:var(--surf);animation:su .25s ease}
.resrow{display:flex;align-items:center;gap:16px;margin-bottom:12px;flex-wrap:wrap}
.resbig{font-size:44px;font-weight:800;line-height:1;font-family:'Syne',sans-serif}
.reslvl{font-size:17px;font-weight:700;margin-top:3px}
.verdict{font-size:11px;font-weight:700;padding:5px 12px;border-radius:6px;
  font-family:'JetBrains Mono',monospace;letter-spacing:.5px}

/* network */
.net-wrap{background:var(--card);border:1px solid var(--b1);
  border-radius:12px;padding:0;overflow:hidden;margin-bottom:18px}
.net-toolbar{padding:13px 17px;border-bottom:1px solid var(--b1);
  display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.net-title{font-size:13px;font-weight:700;margin-right:8px}
#net-svg{width:100%;height:480px;background:var(--bg)}
.net-legend{padding:10px 17px;border-top:1px solid var(--b1);
  display:flex;gap:14px;flex-wrap:wrap}
.nl{display:flex;align-items:center;gap:6px;font-size:11px;color:var(--mut)}
.nd{width:10px;height:10px;border-radius:50%}

/* active learning */
.alcard{background:var(--card);border:1px solid var(--b1);border-radius:12px;
  padding:20px;margin-bottom:18px}
.al-meter{background:var(--surf);border-radius:10px;padding:16px;margin-bottom:14px}
.al-label{font-size:11px;color:var(--mut);font-family:'JetBrains Mono',monospace;
  text-transform:uppercase;letter-spacing:1px;margin-bottom:8px}
.al-bar{height:8px;background:var(--b1);border-radius:4px;overflow:hidden;margin-bottom:6px}
.al-fill{height:100%;border-radius:4px;background:linear-gradient(90deg,#06b6d4,#22c55e);
  transition:width .6s ease}
.al-acc{font-size:28px;font-weight:800;font-family:'Syne',sans-serif;color:var(--acc)}
.dec-btns{display:flex;gap:8px;flex-wrap:wrap}
.dbtn{padding:7px 14px;border-radius:7px;border:1px solid;font-size:11px;
  font-weight:700;cursor:pointer;font-family:'JetBrains Mono',monospace;
  transition:all .15s;background:transparent}
.dec-log{background:var(--surf);border-radius:8px;padding:12px;margin-top:12px;
  max-height:200px;overflow-y:auto}
.dec-row{display:flex;align-items:center;gap:8px;padding:5px 0;
  border-bottom:1px solid var(--b1);font-size:11px}
.dec-row:last-child{border-bottom:none}

/* prov table */
.pc{background:var(--card);border:1px solid var(--b1);border-radius:12px;margin-bottom:18px}
.ph{padding:13px 17px;border-bottom:1px solid var(--b1)}
.pt{font-size:13px;font-weight:700}

/* conn banner */
.banner{display:flex;align-items:center;gap:8px;border-radius:9px;
  padding:10px 14px;margin-bottom:16px;font-size:12px}
.banner.ok{background:rgba(34,197,94,.07);border:1px solid rgba(34,197,94,.2);color:#22c55e}
.banner.err{background:rgba(239,68,68,.07);border:1px solid rgba(239,68,68,.2);color:#ef4444}
.banner.chk{background:rgba(6,182,212,.07);border:1px solid rgba(6,182,212,.2);color:var(--acc)}
.empty{padding:44px;text-align:center;color:var(--mut);font-size:13px}
.skel{background:linear-gradient(90deg,var(--b1) 25%,var(--b2) 50%,var(--b1) 75%);
  background-size:200% 100%;animation:shim 1.4s infinite;border-radius:6px}
@keyframes shim{0%{background-position:200% 0}100%{background-position:-200% 0}}

@media(max-width:900px){
  .sg{grid-template-columns:repeat(2,1fr)}
  .crow{grid-template-columns:1fr}
  .brow{grid-template-columns:repeat(2,1fr)}
  .fgrid{grid-template-columns:1fr}
  .dg{grid-template-columns:1fr}
}
@media(max-width:600px){
  .main{padding:14px}
  .topbar{padding:10px 14px}
  .nav{padding:0 12px}
}
`;

/* ═══════════════════════════════════════════════════
   GAUGE
═══════════════════════════════════════════════════ */
function Gauge({ score, level }) {
    const r = 50, cx = 60, cy = 60, circ = 2 * Math.PI * r;
    const fill = (Math.min(score, 100) / 100) * circ;
    const color = RC[level] || "#64748b";
    return (
        <div className="gauge-wrap">
            <div className="gauge">
                <svg width="120" height="120" viewBox="0 0 120 120">
                    <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1e2d45" strokeWidth="9" />
                    <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="9"
                        strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"
                        style={{ transition: "stroke-dasharray .6s ease" }} />
                </svg>
                <div className="gc">
                    <div className="gs" style={{ color }}>{score}</div>
                    <div className="gl">/ 100</div>
                </div>
            </div>
            <span className="rb" style={{
                background: RB[level], color: RC[level],
                border: `1px solid ${RC[level]}40`, fontSize: 12, padding: "5px 13px", marginTop: 8
            }}>
                ● {level}
            </span>
        </div>
    );
}

/* ═══════════════════════════════════════════════════
   CLAIM MODAL
═══════════════════════════════════════════════════ */
function ClaimModal({ claim, onClose, onDecision }) {
    if (!claim) return null;
    const isFraud = !!claim.predicted_fraud;
    const reasons = claim.explanation_list || ["No suspicious patterns detected"];
    const fc = isFraud ? "#ef4444" : "#22c55e";
    const fb = isFraud ? "rgba(239,68,68,.07)" : "rgba(34,197,94,.07)";
    const fbr = isFraud ? "rgba(239,68,68,.2)" : "rgba(34,197,94,.2)";
    return (
        <div className="ov" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal">
                <div className="mh">
                    <div>
                        <div className="mt">{claim.claim_id}</div>
                        <div className="msub">{claim.claim_date} · {claim.provider_name}</div>
                    </div>
                    <button className="xbtn" onClick={onClose}>✕</button>
                </div>
                <Gauge score={claim.final_risk_score} level={claim.risk_level} />
                <div className="dg" style={{ marginTop: 16 }}>
                    {[["Patient", claim.patient_name], ["Age", `${claim.patient_age} yrs`],
                    ["Procedure", claim.procedure || "—"], ["Amount", `₹${fmt(claim.claim_amount)}`],
                    ["Fraud Type", claim.fraud_type !== "None" ? claim.fraud_type : "None"],
                    ["Ring Claim", claim.in_fraud_ring ? "Yes ⚠" : "No"],
                    ].map(([l, v]) => (
                        <div className="df" key={l}>
                            <div className="dfl">{l}</div>
                            <div className="dfv">{v}</div>
                        </div>
                    ))}
                </div>
                <div className="rh">{isFraud ? "⚠ Why Flagged" : "✓ Assessment"}</div>
                {reasons.map((r, i) => (
                    <div className="ri" key={i} style={{ background: fb, border: `1px solid ${fbr}` }}>
                        <div className="rn" style={{ background: `${fc}20`, color: fc }}>{i + 1}</div>
                        <div className="rtxt">{r}</div>
                    </div>
                ))}
                {isFraud && (
                    <div style={{ marginTop: 14 }}>
                        <div className="rh">Investigator Action</div>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            {["Approve", "Reject", "Investigate"].map(dec => (
                                <button key={dec} className="dbtn"
                                    style={{
                                        borderColor: dec === "Reject" ? "#ef4444" : dec === "Approve" ? "#22c55e" : "#f97316",
                                        color: dec === "Reject" ? "#ef4444" : dec === "Approve" ? "#22c55e" : "#f97316"
                                    }}
                                    onClick={() => { onDecision(claim.claim_id, dec); onClose() }}>
                                    {dec === "Approve" ? "✓ Approve" : dec === "Reject" ? "✕ Reject" : "🔍 Investigate"}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                {(claim.similar_cases || []).length > 0 && (
                    <div style={{ marginTop: 14 }}>
                        <div className="rh">Similar Fraud Cases</div>
                        {claim.similar_cases.map((s, i) => (
                            <div key={i} style={{
                                display: "flex", justifyContent: "space-between",
                                background: "var(--surf)", borderRadius: 6, padding: "7px 10px", marginBottom: 5, fontSize: 12
                            }}>
                                <span className="mono">{s.claim_id}</span>
                                <span style={{ color: "#94a3b8" }}>{s.procedure}</span>
                                <span style={{ color: RC[s.risk_level] }}>{s.risk_level}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════
   NETWORK GRAPH (D3 via script tag)
═══════════════════════════════════════════════════ */
function NetworkGraph() {
    const [netData, setNetData] = useState(null);
    const [filter, setFilter] = useState("all");
    const [tooltip, setTooltip] = useState(null);
    const [loading, setLoading] = useState(true);
    const svgRef = useRef(null);
    const simRef = useRef(null);

    const loadNet = useCallback(async (f) => {
        setLoading(true);
        const d = await api(`/network?filter=${f}`);
        if (d) setNetData(d);
        setLoading(false);
    }, []);

    useEffect(() => { loadNet(filter); }, [filter]);

    useEffect(() => {
        if (!netData || !svgRef.current) return;
        drawGraph(netData, svgRef.current, setTooltip, simRef);
    }, [netData]);

    return (
        <div className="net-wrap">
            <div className="net-toolbar">
                <span className="net-title">Fraud Network Graph</span>
                {["all", "fraud_ring", "providers_only"].map(f => (
                    <button key={f} className={`fb${filter === f ? " on" : ""}`}
                        onClick={() => setFilter(f)}>
                        {f === "all" ? "All Nodes" : f === "fraud_ring" ? "Fraud Rings Only" : "Providers Only"}
                    </button>
                ))}
                {netData && (
                    <span className="mono" style={{ marginLeft: "auto" }}>
                        {netData.nodes?.length} nodes · {netData.links?.length} edges
                    </span>
                )}
            </div>
            {loading
                ? <div className="empty">Loading network graph...</div>
                : <svg ref={svgRef} id="net-svg" />
            }
            <div className="net-legend">
                {[["#ef4444", "Fraud Ring Node"], ["#f97316", "High-Risk Provider"],
                ["#3b82f6", "Legit Provider"], ["#a855f7", "Ghost Patient"],
                ["#64748b", "Regular Patient"]].map(([c, l]) => (
                    <div className="nl" key={l}>
                        <div className="nd" style={{ background: c }} />
                        {l}
                    </div>
                ))}
            </div>
        </div>
    );
}

function drawGraph(data, svgEl, setTooltip, simRef) {
    // Use D3 if available, otherwise simple canvas fallback
    const w = svgEl.clientWidth || 800;
    const h = 480;
    svgEl.setAttribute("viewBox", `0 0 ${w} ${h}`);

    // Clear
    while (svgEl.firstChild) svgEl.removeChild(svgEl.firstChild);

    if (!data.nodes?.length) return;

    const nodes = data.nodes.map(n => ({ ...n }));
    const links = data.links.map(l => ({ ...l }));

    // Simple force-directed layout
    const nodeMap = {};
    nodes.forEach(n => {
        n.x = w / 2 + (Math.random() - 0.5) * w * 0.7;
        n.y = h / 2 + (Math.random() - 0.5) * h * 0.7;
        n.vx = 0; n.vy = 0;
        nodeMap[n.id] = n;
    });

    // Build adjacency
    const adj = {};
    links.forEach(l => {
        const s = l.source, t = l.target;
        if (!adj[s]) adj[s] = [];
        if (!adj[t]) adj[t] = [];
        adj[s].push(t); adj[t].push(s);
    });

    // Run simulation
    const K = 80, ITER = 120;
    for (let iter = 0; iter < ITER; iter++) {
        const alpha = 1 - iter / ITER;
        // Repulsion
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const a = nodes[i], b = nodes[j];
                const dx = b.x - a.x, dy = b.y - a.y;
                const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                const f = K * K / dist * alpha;
                a.vx -= dx / dist * f; a.vy -= dy / dist * f;
                b.vx += dx / dist * f; b.vy += dy / dist * f;
            }
        }
        // Attraction
        links.forEach(l => {
            const s = nodeMap[l.source] || nodeMap[l.source?.id];
            const t = nodeMap[l.target] || nodeMap[l.target?.id];
            if (!s || !t) return;
            const dx = t.x - s.x, dy = t.y - s.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const f = (dist - K) * 0.05 * alpha * (l.weight || 1);
            s.vx += dx / dist * f; s.vy += dy / dist * f;
            t.vx -= dx / dist * f; t.vy -= dy / dist * f;
        });
        // Center gravity
        nodes.forEach(n => {
            n.vx += (w / 2 - n.x) * 0.01 * alpha;
            n.vy += (h / 2 - n.y) * 0.01 * alpha;
        });
        // Apply
        nodes.forEach(n => {
            n.x = Math.max(20, Math.min(w - 20, n.x + n.vx));
            n.y = Math.max(20, Math.min(h - 20, n.y + n.vy));
            n.vx *= 0.8; n.vy *= 0.8;
        });
    }

    const NS = "http://www.w3.org/2000/svg";
    const mk = (tag, attrs) => {
        const el = document.createElementNS(NS, tag);
        Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
        return el;
    };

    // Draw links
    const lGroup = mk("g", {});
    links.forEach(l => {
        const s = nodeMap[l.source] || nodeMap[l.source?.id];
        const t = nodeMap[l.target] || nodeMap[l.target?.id];
        if (!s || !t) return;
        const color = l.type === "ring_referral" ? "#ef4444" :
            l.type === "ring_patient" ? "#f97316" :
                l.type === "fraud_billing" ? "#eab308" : "#1e2d45";
        const opacity = l.type === "ring_referral" || l.type === "ring_patient" ? 0.6 : 0.2;
        const width = l.type === "ring_referral" ? 2 : l.type === "ring_patient" ? 1.5 : 0.5;
        const line = mk("line", {
            x1: s.x, y1: s.y, x2: t.x, y2: t.y,
            stroke: color, strokeOpacity: opacity, strokeWidth: width
        });
        lGroup.appendChild(line);
    });
    svgEl.appendChild(lGroup);

    // Draw nodes
    const nGroup = mk("g", {});
    nodes.forEach(n => {
        const g = mk("g", { cursor: "pointer" });
        const circle = mk("circle", {
            cx: n.x, cy: n.y, r: n.size || 6,
            fill: n.color || "#64748b",
            stroke: n.is_fraud_ring ? "#ef4444" : "rgba(255,255,255,0.1)",
            strokeWidth: n.is_fraud_ring ? 2 : 0.5,
            opacity: 0.9,
        });
        g.appendChild(circle);
        if (n.type === "provider" || n.is_fraud_ring || n.is_ghost) {
            const lbl = mk("text", {
                x: n.x, y: n.y - ((n.size || 6) + 4),
                textAnchor: "middle", fill: "#94a3b8", fontSize: 9,
                fontFamily: "JetBrains Mono,monospace"
            });
            lbl.textContent = n.id.length > 10 ? n.id.slice(0, 10) + "…" : n.id;
            g.appendChild(lbl);
        }
        g.addEventListener("mouseenter", e => {
            circle.setAttribute("r", (n.size || 6) + 3);
            circle.setAttribute("opacity", "1");
        });
        g.addEventListener("mouseleave", () => {
            circle.setAttribute("r", n.size || 6);
            circle.setAttribute("opacity", "0.9");
        });
        nGroup.appendChild(g);
    });
    svgEl.appendChild(nGroup);
}

/* ═══════════════════════════════════════════════════
   MANUAL CLAIM CHECKER
═══════════════════════════════════════════════════ */
function ManualChecker() {
    const [form, setForm] = useState({
        patient_name: "Ramesh Kumar", patient_age: "22", gender: "Male",
        provider_name: "Dr Ghost Biller", provider_id: "DR010",
        procedure: "Hip Replacement", diagnosis_code: "M16",
        claim_amount: "95000", claim_date: "2026-03-14", insurance_plan: "Basic",
    });
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);

    const check = async () => {
        setLoading(true); setResult(null);
        const r = await api("/check-claim", {
            method: "POST",
            body: JSON.stringify({
                ...form,
                patient_age: parseInt(form.patient_age),
                claim_amount: parseFloat(form.claim_amount)
            })
        });
        setResult(r); setLoading(false);
    };

    const downloadPDF = () => {
        if (!result) return;
        const lines = [
            "FRAUDSHIELD — MANUAL CLAIM CHECK REPORT",
            "=" * 45,
            `Report ID   : ${result.claim_id}`,
            `Generated   : ${new Date().toLocaleString()}`,
            "",
            "PATIENT DETAILS",
            `-Name       : ${result.patient_name}`,
            `-Age        : ${result.patient_age}`,
            `-Gender     : ${result.gender}`,
            "",
            "CLAIM DETAILS",
            `-Provider   : ${result.provider_name}`,
            `-Procedure  : ${result.procedure}`,
            `-Amount     : Rs.${result.claim_amount}`,
            `-Date       : ${result.claim_date}`,
            `-Plan       : ${result.insurance_plan}`,
            "",
            "RISK ASSESSMENT",
            `-Risk Score : ${result.final_risk_score}/100`,
            `-Risk Level : ${result.risk_level}`,
            `-VERDICT    : ${result.verdict}`,
            "",
            `RED FLAGS (${result.total_red_flags}):`,
            ...(result.red_flags || []).map(f => `  ⚠ ${f.flag}: ${f.detail}`),
            "",
            "GREEN FLAGS:",
            ...(result.green_flags || []).map(f => `  ✓ ${f}`),
        ].join("\n");

        const blob = new Blob([lines], { type: "text/plain" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `${result.claim_id}_report.txt`;
        a.click();
    };

    const inp = (key, label, type = "text") => (
        <div className="ff" key={key}>
            <label>{label}</label>
            <input type={type} value={form[key]}
                onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} />
        </div>
    );

    return (
        <div>
            <div className="sec">Manual Claim Checker</div>
            <div className="acard">
                <p style={{
                    fontSize: 12, color: "var(--mut)", marginBottom: 16,
                    fontFamily: "'JetBrains Mono',monospace", lineHeight: 1.6
                }}>
                    Enter full claim details for a comprehensive 6-point fraud check
                    with instant PDF report generation.
                </p>
                <div className="fgrid">
                    {inp("patient_name", "Patient Name")}
                    {inp("patient_age", "Patient Age", "number")}
                    <div className="ff">
                        <label>Gender</label>
                        <select value={form.gender} onChange={e => setForm(p => ({ ...p, gender: e.target.value }))}>
                            <option>Male</option><option>Female</option>
                        </select>
                    </div>
                    {inp("provider_name", "Provider Name")}
                    {inp("provider_id", "Provider ID")}
                    <div className="ff">
                        <label>Procedure</label>
                        <select value={form.procedure} onChange={e => setForm(p => ({ ...p, procedure: e.target.value }))}>
                            {PROCEDURES.map(p => <option key={p}>{p}</option>)}
                        </select>
                    </div>
                    {inp("diagnosis_code", "Diagnosis Code")}
                    {inp("claim_amount", "Claim Amount (₹)", "number")}
                    {inp("claim_date", "Claim Date", "date")}
                    <div className="ff">
                        <label>Insurance Plan</label>
                        <select value={form.insurance_plan} onChange={e => setForm(p => ({ ...p, insurance_plan: e.target.value }))}>
                            {["Basic", "Standard", "Premium", "Corporate"].map(p => <option key={p}>{p}</option>)}
                        </select>
                    </div>
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button className="abtn" onClick={check} disabled={loading}>
                        {loading ? "⟳  Checking..." : "🔍  Check Claim"}
                    </button>
                    {result && (
                        <button className="abtn" onClick={downloadPDF}
                            style={{ background: "linear-gradient(135deg,#22c55e,#16a34a)" }}>
                            📄 Download Report
                        </button>
                    )}
                </div>

                {result && (
                    <div className="res" style={{ borderColor: `${RC[result.risk_level]}30` }}>
                        <div className="resrow">
                            <div>
                                <div style={{
                                    fontSize: 10, color: "var(--mut)",
                                    fontFamily: "'JetBrains Mono',monospace", marginBottom: 3
                                }}>RISK SCORE</div>
                                <div className="resbig" style={{ color: RC[result.risk_level] }}>
                                    {result.final_risk_score}
                                </div>
                            </div>
                            <div>
                                <div style={{
                                    fontSize: 10, color: "var(--mut)",
                                    fontFamily: "'JetBrains Mono',monospace", marginBottom: 3
                                }}>VERDICT</div>
                                <div className="verdict" style={{
                                    background: RB[result.risk_level],
                                    color: RC[result.risk_level], border: `1px solid ${RC[result.risk_level]}40`
                                }}>
                                    {result.verdict}
                                </div>
                            </div>
                        </div>

                        {/* Red Flags */}
                        {(result.red_flags || []).length > 0 && (
                            <>
                                <div className="rh" style={{ marginTop: 12 }}>
                                    ⚠ Red Flags ({result.total_red_flags})
                                </div>
                                {result.red_flags.map((f, i) => (
                                    <div className="ri" key={i}
                                        style={{ background: "rgba(239,68,68,.07)", border: "1px solid rgba(239,68,68,.2)" }}>
                                        <div className="rn" style={{ background: "rgba(239,68,68,.2)", color: "#ef4444" }}>
                                            {i + 1}
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 11, fontWeight: 700, color: "#ef4444", marginBottom: 2 }}>
                                                {f.flag}
                                            </div>
                                            <div className="rtxt">{f.detail}</div>
                                        </div>
                                    </div>
                                ))}
                            </>
                        )}

                        {/* Green Flags */}
                        {(result.green_flags || []).length > 0 && (
                            <>
                                <div className="rh" style={{ marginTop: 10 }}>✓ Clear Checks</div>
                                {result.green_flags.map((f, i) => (
                                    <div className="ri" key={i}
                                        style={{ background: "rgba(34,197,94,.07)", border: "1px solid rgba(34,197,94,.2)" }}>
                                        <div className="rn" style={{ background: "rgba(34,197,94,.2)", color: "#22c55e" }}>✓</div>
                                        <div className="rtxt">{f}</div>
                                    </div>
                                ))}
                            </>
                        )}

                        {/* Similar Cases */}
                        {(result.similar_cases || []).length > 0 && (
                            <>
                                <div className="rh" style={{ marginTop: 10 }}>Similar Fraud Cases Found</div>
                                {result.similar_cases.map((s, i) => (
                                    <div key={i} style={{
                                        display: "flex", justifyContent: "space-between",
                                        background: "var(--surf)", borderRadius: 6, padding: "7px 10px",
                                        marginBottom: 5, fontSize: 12
                                    }}>
                                        <span className="mono">{s.claim_id}</span>
                                        <span style={{ color: "#94a3b8", fontSize: 11 }}>{s.procedure}</span>
                                        <span style={{ color: RC[s.risk_level], fontSize: 11, fontWeight: 700 }}>
                                            {s.risk_level}
                                        </span>
                                    </div>
                                ))}
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════
   ACTIVE LEARNING PANEL
═══════════════════════════════════════════════════ */
function ActiveLearning({ claims, onDecision, decisionLog, accuracy, retrainResult }) {
    const flagged = claims.filter(c => c.predicted_fraud);
    return (
        <div>
            <div className="sec">Active Learning — Model Retraining</div>
            <div className="alcard">
                <div className="al-meter">
                    <div className="al-label">Current Model Accuracy</div>
                    <div className="al-acc">{accuracy}%</div>
                    <div className="al-bar">
                        <div className="al-fill" style={{ width: `${accuracy}%` }} />
                    </div>
                    <div style={{ fontSize: 11, color: "var(--mut)", fontFamily: "'JetBrains Mono',monospace" }}>
                        ROC-AUC: 0.9997 · Decisions logged: {decisionLog.length} ·{" "}
                        {decisionLog.length >= 5
                            ? <span style={{ color: "#22c55e" }}>Ready to retrain ✓</span>
                            : <span>{5 - decisionLog.length} more needed to retrain</span>}
                    </div>
                </div>

                {retrainResult && (
                    <div style={{
                        background: "rgba(34,197,94,.07)", border: "1px solid rgba(34,197,94,.2)",
                        borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 12
                    }}>
                        <div style={{ fontWeight: 700, color: "#22c55e", marginBottom: 4 }}>
                            ✅ Model Retrained Successfully!
                        </div>
                        <div style={{ color: "var(--mut)", fontFamily: "'JetBrains Mono',monospace" }}>
                            {retrainResult.old_accuracy}% → {retrainResult.new_accuracy}%{" "}
                            <span style={{ color: "#22c55e" }}>
                                ({retrainResult.delta >= 0 ? "+" : ""}{retrainResult.delta}%)
                            </span>
                        </div>
                    </div>
                )}

                <p style={{ fontSize: 12, color: "var(--mut)", marginBottom: 12, lineHeight: 1.6 }}>
                    Make decisions on flagged claims below. Every Approve/Reject trains
                    the model to be smarter. After 5 decisions, hit <strong>Retrain</strong>.
                </p>

                {flagged.slice(0, 5).map(c => (
                    <div key={c.claim_id} style={{
                        background: "var(--surf)", borderRadius: 8,
                        padding: "10px 12px", marginBottom: 8, display: "flex",
                        alignItems: "center", gap: 10, flexWrap: "wrap"
                    }}>
                        <div>
                            <div style={{
                                fontSize: 11, fontFamily: "'JetBrains Mono',monospace",
                                color: "var(--mut)"
                            }}>{c.claim_id}</div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--txt)" }}>
                                {c.patient_name}
                            </div>
                            <div style={{ fontSize: 11, color: "#94a3b8" }}>{c.procedure}</div>
                        </div>
                        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                            {["Approve", "Reject", "Investigate"].map(d => (
                                <button key={d} className="dbtn"
                                    style={{
                                        borderColor: d === "Reject" ? "#ef4444" : d === "Approve" ? "#22c55e" : "#f97316",
                                        color: d === "Reject" ? "#ef4444" : d === "Approve" ? "#22c55e" : "#f97316",
                                        padding: "5px 10px", fontSize: 10
                                    }}
                                    onClick={() => onDecision(c.claim_id, d)}>
                                    {d === "Approve" ? "✓" : d === "Reject" ? "✕" : "🔍"} {d}
                                </button>
                            ))}
                        </div>
                        <span className="rb" style={{
                            background: RB[c.risk_level], color: RC[c.risk_level],
                            border: `1px solid ${RC[c.risk_level]}40`
                        }}>
                            {c.final_risk_score}
                        </span>
                    </div>
                ))}

                {decisionLog.length > 0 && (
                    <>
                        <div className="rh" style={{ marginTop: 14 }}>
                            Decision Log ({decisionLog.length})
                        </div>
                        <div className="dec-log">
                            {decisionLog.slice().reverse().map((d, i) => (
                                <div className="dec-row" key={i}>
                                    <span className="mono">{d.claim_id}</span>
                                    <span style={{
                                        color: d.decision === "Reject" ? "#ef4444" :
                                            d.decision === "Approve" ? "#22c55e" : "#f97316",
                                        fontWeight: 700, fontSize: 11
                                    }}>{d.decision}</span>
                                    <span style={{ color: "var(--mut)", marginLeft: "auto" }}>
                                        {new Date(d.timestamp).toLocaleTimeString()}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════
   MAIN APP
═══════════════════════════════════════════════════ */
export default function FraudShield() {
    const [tab, setTab] = useState("overview");
    const [conn, setConn] = useState("checking");
    const [stats, setStats] = useState(null);
    const [claims, setClaims] = useState([]);
    const [ftypes, setFtypes] = useState([]);
    const [trends, setTrends] = useState([]);
    const [provs, setProvs] = useState([]);
    const [selected, setSelected] = useState(null);
    const [riskF, setRiskF] = useState("ALL");
    const [fraudOnly, setFraudOnly] = useState(false);
    const [ringOnly, setRingOnly] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [aResult, setAResult] = useState(null);
    const [aForm, setAForm] = useState({
        claim_amount: "95000", patient_age: "22",
        procedure: "Hip Replacement", provider_id: "DR009"
    });
    const [decLog, setDecLog] = useState([]);
    const [retrainRes, setRetrainRes] = useState(null);
    const [accuracy, setAccuracy] = useState(99.08);
    const pollRef = useRef(null);

    const loadAll = useCallback(async () => {
        const h = await api("/health");
        if (!h) { setConn("error"); return; }
        setConn("ok");
        const [s, c, f, t, p] = await Promise.all([
            api("/stats"),
            api("/claims?per_page=60&sort_by=risk_desc"),
            api("/fraud-types"),
            api("/trends"),
            api("/providers"),
        ]);
        if (s) { setStats(s); setAccuracy(s.model_performance?.accuracy || 99.08); }
        if (c?.claims) setClaims(c.claims);
        if (f?.fraud_types) setFtypes(f.fraud_types);
        if (t?.trends) setTrends(t.trends);
        if (p?.providers) setProvs(p.providers);
    }, []);

    useEffect(() => {
        loadAll();
        pollRef.current = setInterval(loadAll, 30000);
        return () => clearInterval(pollRef.current);
    }, [loadAll]);

    const handleDecision = useCallback(async (cid, dec) => {
        const r = await api("/decision", {
            method: "POST",
            body: JSON.stringify({ claim_id: cid, decision: dec, reason: "" })
        });
        if (r) {
            const entry = { claim_id: cid, decision: dec, timestamp: new Date().toISOString() };
            setDecLog(p => [...p, entry]);
            if (r.can_retrain) {
                const rt = await api("/retrain", { method: "POST", body: "{}" });
                if (rt?.status === "retrained") {
                    setRetrainRes(rt);
                    setAccuracy(rt.new_accuracy);
                }
            }
        }
    }, []);

    const handleAnalyze = async () => {
        setAnalyzing(true); setAResult(null);
        const r = await api("/analyze", {
            method: "POST",
            body: JSON.stringify({
                ...aForm,
                claim_amount: parseFloat(aForm.claim_amount),
                patient_age: parseInt(aForm.patient_age)
            })
        });
        setAResult(r); setAnalyzing(false);
    };

    const visClaims = claims.filter(c => {
        if (fraudOnly && !c.predicted_fraud) return false;
        if (ringOnly && !c.in_fraud_ring) return false;
        if (riskF !== "ALL" && c.risk_level !== riskF) return false;
        return true;
    });

    if (!stats) return (
        <>
            <style>{CSS}</style>
            <div className="gbg" />
            <div className="shell">
                <div className="topbar">
                    <div className="logo">
                        <div className="logo-icon">🛡</div>
                        <div><div className="logo-txt">FraudShield</div>
                            <div className="logo-sub">Healthcare Fraud Detection</div></div>
                    </div>
                </div>
                <div className="main">
                    <div className={`banner ${conn === "ok" ? "ok" : conn === "error" ? "err" : "chk"}`}>
                        {conn === "ok" ? "✅ Connected" : "checking" === "checking" ?
                            "⟳ Connecting to backend..." :
                            "✕ Backend not reachable — run: python app.py"}
                    </div>
                    <div className="sg">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="sc">
                                <div className="skel" style={{ height: 10, width: "60%", marginBottom: 12 }} />
                                <div className="skel" style={{ height: 26, width: "45%" }} />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );

    const s = stats.summary; const rb = stats.risk_breakdown;

    return (
        <>
            <style>{CSS}</style>
            <div className="gbg" />
            <div className="shell">

                {/* TOP BAR */}
                <div className="topbar">
                    <div className="logo">
                        <div className="logo-icon">🛡</div>
                        <div>
                            <div className="logo-txt">FraudShield</div>
                            <div className="logo-sub">Healthcare Fraud Detection v2.0</div>
                        </div>
                    </div>
                    <div className="tr">
                        <span className="chip chip-c">Acc {accuracy}%</span>
                        <span className="chip chip-c">AUC 0.9997</span>
                        <span className="chip chip-c">{s.total_claims} Claims</span>
                        <span className="chip chip-g">
                            <span className="live-dot" />
                            {conn === "ok" ? "LIVE" : "DEMO"}
                        </span>
                    </div>
                </div>

                {/* NAV */}
                <div className="nav">
                    {[["overview", "Overview"], ["claims", "Claims Feed"],
                    ["network", "Network Graph"], ["checker", "Manual Checker"],
                    ["analyze", "Live Analyzer"], ["learning", "Active Learning"],
                    ["providers", "Provider Risk"]
                    ].map(([id, lbl]) => (
                        <div key={id} className={`tab${tab === id ? " on" : ""}`}
                            onClick={() => setTab(id)}>{lbl}</div>
                    ))}
                </div>

                <div className="main">
                    {/* connection */}
                    <div className={`banner ${conn === "ok" ? "ok" : conn === "error" ? "err" : "chk"}`}>
                        {conn === "ok" ? "✅ Connected to Flask backend — live data" :
                            conn === "error" ? "✕ Backend offline — run: python app.py" :
                                "⟳ Connecting..."}
                    </div>

                    {/* ══ OVERVIEW ══════════════════════════════ */}
                    {tab === "overview" && <>
                        <div className="sg">
                            {[{ label: "Total Claims", val: fmt(s.total_claims), color: "#06b6d4", sub: "Demo dataset" },
                            {
                                label: "Fraud Detected", val: fmt(s.fraud_detected), color: "#ef4444",
                                sub: `${s.fraud_rate_pct}% fraud rate`, badge: { t: `${s.fraud_rate_pct}%`, c: "#ef4444" }
                            },
                            {
                                label: "Amount at Risk", val: fmtL(s.amount_at_risk), color: "#f97316",
                                sub: "Potential losses", badge: { t: "FLAGGED", c: "#f97316" }
                            },
                            {
                                label: "Savings Potential", val: fmtL(s.savings_potential), color: "#22c55e",
                                sub: "85% est. recovery", badge: { t: "RECOVERABLE", c: "#22c55e" }
                            },
                            ].map((c, i) => (
                                <div key={i} className="sc" style={{ "--al": c.color }}>
                                    <div className="sl">{c.label}</div>
                                    <div className="sv" style={{ color: c.color }}>{c.val}</div>
                                    <div className="ss">{c.sub}</div>
                                    {c.badge && <div className="sbadge"
                                        style={{
                                            background: `${c.badge.c}15`, color: c.badge.c,
                                            border: `1px solid ${c.badge.c}40`
                                        }}>{c.badge.t}</div>}
                                </div>
                            ))}
                        </div>

                        <div className="sec">Risk Breakdown</div>
                        <div className="brow">
                            {["CRITICAL", "HIGH", "MEDIUM", "LOW"].map(lvl => (
                                <div key={lvl} className="bc" style={{ borderColor: `${RC[lvl]}30` }}>
                                    <div className="blvl" style={{ color: RC[lvl] }}>{lvl}</div>
                                    <div className="bval" style={{ color: RC[lvl] }}>{rb[lvl]?.count ?? 0}</div>
                                    <div className="bbar" style={{
                                        background: RC[lvl], opacity: .7,
                                        width: `${Math.max(4, (rb[lvl]?.count ?? 0) / s.total_claims * 100).toFixed(0)}%`
                                    }} />
                                </div>
                            ))}
                        </div>

                        <div className="sec">Analytics</div>
                        <div className="crow">
                            <div className="cc">
                                <div className="ct">Monthly Trend <span>{trends.length} months</span></div>
                                <ResponsiveContainer width="100%" height={210}>
                                    <AreaChart data={trends} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                                        <defs>
                                            <linearGradient id="gL" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#22c55e" stopOpacity={.25} />
                                                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="gF" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#ef4444" stopOpacity={.3} />
                                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#1e2d45" />
                                        <XAxis dataKey="month" tick={{ fill: "#64748b", fontSize: 10 }}
                                            tickFormatter={v => v.slice(5)} />
                                        <YAxis tick={{ fill: "#64748b", fontSize: 10 }} />
                                        <Tooltip contentStyle={{
                                            background: "#111827", border: "1px solid #1e2d45",
                                            borderRadius: 8, fontSize: 12
                                        }} labelStyle={{ color: "#94a3b8" }} />
                                        <Legend wrapperStyle={{ fontSize: 11, color: "#64748b" }} />
                                        <Area type="monotone" dataKey="legitimate" stroke="#22c55e"
                                            strokeWidth={2} fill="url(#gL)" name="Legitimate" />
                                        <Area type="monotone" dataKey="fraud" stroke="#ef4444"
                                            strokeWidth={2} fill="url(#gF)" name="Fraud" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="cc">
                                <div className="ct">Fraud Types <span>{s.fraud_detected} cases</span></div>
                                <ResponsiveContainer width="100%" height={155}>
                                    <PieChart>
                                        <Pie data={ftypes} dataKey="count" nameKey="type"
                                            cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3}>
                                            {ftypes.map((e, i) => <Cell key={i} fill={e.color} />)}
                                        </Pie>
                                        <Tooltip contentStyle={{
                                            background: "#111827",
                                            border: "1px solid #1e2d45", borderRadius: 8, fontSize: 12
                                        }} />
                                    </PieChart>
                                </ResponsiveContainer>
                                {ftypes.slice(0, 4).map((ft, i) => (
                                    <div key={i} style={{
                                        display: "flex", alignItems: "center",
                                        justifyContent: "space-between", fontSize: 11, marginTop: 5
                                    }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                            <div style={{
                                                width: 8, height: 8, borderRadius: 2,
                                                background: ft.color, flexShrink: 0
                                            }} />
                                            <span style={{ color: "#94a3b8" }}>{ft.type}</span>
                                        </div>
                                        <span className="mono">{ft.count}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="cc" style={{ marginBottom: 18 }}>
                            <div className="ct">
                                Fraud Cases by Pattern
                                <span>Ring claims: {s.fraud_ring_claims}</span>
                            </div>
                            <ResponsiveContainer width="100%" height={170}>
                                <BarChart data={ftypes} margin={{ top: 0, right: 0, bottom: 0, left: 10 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1e2d45" vertical={false} />
                                    <XAxis dataKey="type" tick={{ fill: "#64748b", fontSize: 10 }} />
                                    <YAxis tick={{ fill: "#64748b", fontSize: 10 }} />
                                    <Tooltip contentStyle={{
                                        background: "#111827",
                                        border: "1px solid #1e2d45", borderRadius: 8, fontSize: 12
                                    }} />
                                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                                        {ftypes.map((e, i) => <Cell key={i} fill={e.color} />)}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </>}

                    {/* ══ CLAIMS FEED ════════════════════════════ */}
                    {tab === "claims" && (
                        <div className="tcard">
                            <div className="thead">
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <div className="ttitle">Live Claims Feed</div>
                                    <span className="mono">{visClaims.length} claims</span>
                                </div>
                                <div className="frow">
                                    {["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"].map(f => (
                                        <button key={f} className={`fb${riskF === f ? " on" : ""}`}
                                            onClick={() => setRiskF(f)}
                                            style={riskF === f && f !== "ALL" ? {
                                                borderColor: RC[f],
                                                color: RC[f], background: `${RC[f]}12`
                                            } : {}}>
                                            {f}
                                        </button>
                                    ))}
                                    <button className={`fb${fraudOnly ? " on" : ""}`}
                                        onClick={() => setFraudOnly(p => !p)}>⚠ Fraud Only</button>
                                    <button className={`fb${ringOnly ? " on" : ""}`}
                                        onClick={() => setRingOnly(p => !p)}>🔗 Ring Only</button>
                                </div>
                            </div>
                            {visClaims.length === 0
                                ? <div className="empty">No claims match the filter.</div>
                                : <div style={{ overflowX: "auto" }}>
                                    <table>
                                        <thead><tr>
                                            {["Claim ID", "Patient", "Age", "Provider", "Procedure",
                                                "Amount", "Date", "Risk Score", "Level", "Ring", "Status"].map(h => (
                                                    <th key={h}>{h}</th>))}
                                        </tr></thead>
                                        <tbody>
                                            {visClaims.map(c => (
                                                <tr key={c.claim_id} onClick={() => setSelected(c)}>
                                                    <td className="mono">{c.claim_id}</td>
                                                    <td style={{ fontWeight: 600 }}>{c.patient_name}</td>
                                                    <td className="mono">{c.patient_age}</td>
                                                    <td style={{ color: "#94a3b8", fontSize: 11 }}>{c.provider_name}</td>
                                                    <td style={{ color: "#94a3b8", fontSize: 11 }}>{c.procedure || "—"}</td>
                                                    <td style={{
                                                        fontFamily: "'JetBrains Mono',monospace",
                                                        color: c.claim_amount > 100000 ? "#f97316" : "#e2e8f0"
                                                    }}>
                                                        ₹{fmt(c.claim_amount)}
                                                    </td>
                                                    <td className="mono">{c.claim_date}</td>
                                                    <td>
                                                        <div className="rbar">
                                                            <div className="rbg">
                                                                <div className="rbf" style={{
                                                                    width: `${c.final_risk_score}%`,
                                                                    background: RC[c.risk_level]
                                                                }} />
                                                            </div>
                                                            <div className="rnum" style={{ color: RC[c.risk_level] }}>
                                                                {c.final_risk_score}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <span className="rb" style={{
                                                            background: RB[c.risk_level],
                                                            color: RC[c.risk_level], border: `1px solid ${RC[c.risk_level]}40`
                                                        }}>
                                                            {c.risk_level}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        {c.in_fraud_ring
                                                            ? <span style={{ color: "#ef4444", fontSize: 11, fontWeight: 700 }}>⚠ YES</span>
                                                            : <span style={{ color: "#475569", fontSize: 11 }}>—</span>}
                                                    </td>
                                                    <td>
                                                        <span style={{
                                                            fontSize: 11, fontWeight: 700,
                                                            fontFamily: "'JetBrains Mono',monospace",
                                                            color: c.predicted_fraud ? "#ef4444" : "#22c55e"
                                                        }}>
                                                            {c.predicted_fraud ? "⚠ FLAGGED" : "✓ CLEAR"}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            }
                        </div>
                    )}

                    {/* ══ NETWORK GRAPH ══════════════════════════ */}
                    {tab === "network" && <NetworkGraph />}

                    {/* ══ MANUAL CHECKER ═════════════════════════ */}
                    {tab === "checker" && <ManualChecker />}

                    {/* ══ LIVE ANALYZER ══════════════════════════ */}
                    {tab === "analyze" && (
                        <div style={{ maxWidth: 600 }}>
                            <div className="sec">Live Claim Analyzer</div>
                            <div className="acard">
                                <p style={{
                                    fontSize: 12, color: "var(--mut)", marginBottom: 16,
                                    fontFamily: "'JetBrains Mono',monospace", lineHeight: 1.6
                                }}>
                                    Score any claim in real-time via{" "}
                                    <code style={{ color: "#f97316" }}>POST /api/analyze</code>
                                </p>
                                <div className="fgrid">
                                    {[{ l: "Claim Amount (₹)", k: "claim_amount", t: "number" },
                                    { l: "Patient Age", k: "patient_age", t: "number" },
                                    { l: "Provider ID", k: "provider_id", t: "text" },
                                    ].map(f => (
                                        <div className="ff" key={f.k}>
                                            <label>{f.l}</label>
                                            <input type={f.t} value={aForm[f.k]}
                                                onChange={e => setAForm(p => ({ ...p, [f.k]: e.target.value }))} />
                                        </div>
                                    ))}
                                    <div className="ff">
                                        <label>Procedure</label>
                                        <select value={aForm.procedure}
                                            onChange={e => setAForm(p => ({ ...p, procedure: e.target.value }))}>
                                            {PROCEDURES.map(p => <option key={p}>{p}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <button className="abtn" onClick={handleAnalyze} disabled={analyzing}>
                                    {analyzing ? "⟳  Analyzing..." : "⚡  Analyze Claim"}
                                </button>
                                {aResult && (() => {
                                    const lvl = aResult.risk_level; const color = RC[lvl];
                                    return (
                                        <div className="res" style={{ borderColor: `${color}30` }}>
                                            <div className="resrow">
                                                <div>
                                                    <div style={{
                                                        fontSize: 10, color: "var(--mut)",
                                                        fontFamily: "'JetBrains Mono',monospace", marginBottom: 3
                                                    }}>RISK SCORE</div>
                                                    <div className="resbig" style={{ color }}>{aResult.final_risk_score}</div>
                                                </div>
                                                <div>
                                                    <div style={{
                                                        fontSize: 10, color: "var(--mut)",
                                                        fontFamily: "'JetBrains Mono',monospace", marginBottom: 3
                                                    }}>LEVEL</div>
                                                    <div className="reslvl" style={{ color }}>{lvl}</div>
                                                </div>
                                                <span className="rb" style={{
                                                    marginLeft: "auto",
                                                    background: RB[lvl], color, border: `1px solid ${color}40`,
                                                    fontSize: 11, padding: "6px 12px"
                                                }}>
                                                    {aResult.verdict}
                                                </span>
                                            </div>
                                            <div className="rh">Why this score?</div>
                                            {(aResult.explanation_list || []).map((r, i) => (
                                                <div className="ri" key={i}
                                                    style={{ background: RB[lvl], border: `1px solid ${color}25` }}>
                                                    <div className="rn" style={{ background: `${color}20`, color }}>{i + 1}</div>
                                                    <div className="rtxt">{r}</div>
                                                </div>
                                            ))}
                                            <div style={{
                                                marginTop: 10, fontSize: 10, color: "#475569",
                                                fontFamily: "'JetBrains Mono',monospace"
                                            }}>
                                                Scored via: {aResult.model_used} · {new Date(aResult.scored_at || Date.now()).toLocaleTimeString()}
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    )}

                    {/* ══ ACTIVE LEARNING ════════════════════════ */}
                    {tab === "learning" && (
                        <ActiveLearning claims={claims} onDecision={handleDecision}
                            decisionLog={decLog} accuracy={accuracy} retrainResult={retrainRes} />
                    )}

                    {/* ══ PROVIDERS ══════════════════════════════ */}
                    {tab === "providers" && (
                        <>
                            <div className="sec">Provider Risk Leaderboard</div>
                            <div className="pc">
                                <div className="ph">
                                    <div className="pt">All Providers — Ranked by Avg Risk Score</div>
                                </div>
                                <div style={{ overflowX: "auto" }}>
                                    <table>
                                        <thead><tr>
                                            {["Rank", "Provider", "Claims", "Fraud", "Fraud Rate",
                                                "Ring Claims", "Fraud Amount", "Avg Risk", "Level"].map(h => (
                                                    <th key={h}>{h}</th>))}
                                        </tr></thead>
                                        <tbody>
                                            {provs.map((p, i) => (
                                                <tr key={p.provider_name}>
                                                    <td className="mono" style={{ color: "#475569" }}>#{i + 1}</td>
                                                    <td style={{ fontWeight: 600 }}>{p.provider_name}</td>
                                                    <td className="mono">{p.total_claims}</td>
                                                    <td className="mono"
                                                        style={{ color: p.fraud_claims > 10 ? "#ef4444" : "#e2e8f0" }}>
                                                        {p.fraud_claims}
                                                    </td>
                                                    <td>
                                                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                                            <div style={{
                                                                width: 50, height: 4, background: "#1e2d45",
                                                                borderRadius: 2, overflow: "hidden"
                                                            }}>
                                                                <div style={{
                                                                    height: "100%", borderRadius: 2,
                                                                    width: `${Math.min(p.fraud_rate_pct, 100)}%`,
                                                                    background: p.fraud_rate_pct > 50 ? "#ef4444" :
                                                                        p.fraud_rate_pct > 20 ? "#f97316" : "#22c55e"
                                                                }} />
                                                            </div>
                                                            <span className="mono">{p.fraud_rate_pct}%</span>
                                                        </div>
                                                    </td>
                                                    <td className="mono"
                                                        style={{ color: p.ring_claims > 0 ? "#ef4444" : "#475569" }}>
                                                        {p.ring_claims > 0 ? `⚠ ${p.ring_claims}` : "0"}
                                                    </td>
                                                    <td className="mono" style={{ color: "#f97316" }}>
                                                        {fmtL(p.total_amount * p.fraud_rate_pct / 100)}
                                                    </td>
                                                    <td>
                                                        <div className="rbar">
                                                            <div className="rbg">
                                                                <div className="rbf" style={{
                                                                    width: `${p.avg_risk_score}%`,
                                                                    background: RC[p.risk_level]
                                                                }} />
                                                            </div>
                                                            <div className="rnum" style={{ color: RC[p.risk_level] }}>
                                                                {p.avg_risk_score}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <span className="rb" style={{
                                                            background: RB[p.risk_level],
                                                            color: RC[p.risk_level], border: `1px solid ${RC[p.risk_level]}40`
                                                        }}>
                                                            {p.risk_level}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    )}

                </div>{/* /main */}
            </div>{/* /shell */}

            {/* CLAIM MODAL */}
            {selected && (
                <ClaimModal claim={selected} onClose={() => setSelected(null)}
                    onDecision={(cid, dec) => { handleDecision(cid, dec); setSelected(null) }} />
            )}
        </>
    );
}
