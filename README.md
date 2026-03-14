<div align="center">

<img src="https://img.shields.io/badge/FraudShield-Healthcare%20Fraud%20Detection-06b6d4?style=for-the-badge&logo=shield&logoColor=white" alt="FraudShield"/>

# 🛡️ FraudShield — Healthcare Insurance Fraud Detection

> **Built in 24 hours · Hackathon 2026**  
> An end-to-end AI system to detect, analyze, and visualize healthcare insurance fraud in real time.

[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![Flask](https://img.shields.io/badge/Flask-REST%20API-000000?style=flat-square&logo=flask&logoColor=white)](https://flask.palletsprojects.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-Build%20Tool-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev)
[![scikit-learn](https://img.shields.io/badge/scikit--learn-ML-F7931E?style=flat-square&logo=scikit-learn&logoColor=white)](https://scikit-learn.org)
[![NetworkX](https://img.shields.io/badge/NetworkX-Graph%20Analysis-4B8BBE?style=flat-square)](https://networkx.org)
[![SQLite](https://img.shields.io/badge/SQLite-Database-003B57?style=flat-square&logo=sqlite&logoColor=white)](https://sqlite.org)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

</div>

---

## 🎯 Problem Statement

Healthcare insurance fraud costs billions annually and is notoriously hard to detect manually. Fraudulent claims — inflated billing, ghost patients, duplicate submissions, and coordinated fraud rings — slip through traditional rule-based systems undetected.

**FraudShield** solves this with a fully integrated AI pipeline: synthetic data generation → feature engineering → ensemble ML → live scoring → interactive visualization — all in one deployable system.

---

## ✨ Key Features

| Feature | Description |
|---|---|
| 🤖 **Ensemble ML** | Gradient Boosting + Isolation Forest with 99%+ accuracy & 0.9997 ROC-AUC |
| 🕸️ **Network Analysis** | NetworkX-powered fraud ring detection via graph centrality & community algorithms |
| 📊 **Live Dashboard** | React dashboard with real-time claim scoring, filtering, trend charts & network visualization |
| 🔍 **Manual Checker** | Submit any claim and get an instant AI risk verdict with explanation |
| 🧠 **Explainable AI** | Every fraud flag comes with human-readable reasons (why it's flagged) |
| 🗄️ **Zero-Setup DB** | SQLite backend — no external database required |
| ⚡ **Real-time API** | Flask REST API with CORS, health checks, and live ML inference |
| 📈 **Fraud Trends** | Month-over-month fraud pattern visualization |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     FraudShield                         │
│                                                         │
│  ┌──────────────┐    ┌──────────────┐    ┌───────────┐  │
│  │  Data Layer  │───▶│   ML Layer   │───▶│  API Layer│  │
│  │              │    │              │    │           │  │
│  │ generate_    │    │ Isolation    │    │ Flask     │  │
│  │ dataset.py   │    │ Forest       │    │ REST API  │  │
│  │              │    │    +         │    │ port 5000 │  │
│  │ claims.csv   │    │ Gradient     │    │           │  │
│  │ providers    │    │ Boosting     │    │ /api/stats│  │
│  │ network_     │    │    +         │    │ /api/claim│  │
│  │ edges.csv    │    │ NetworkX     │    │ /api/analy│  │
│  └──────────────┘    │ Graph        │    └─────┬─────┘  │
│                      └──────────────┘          │        │
│                                                ▼        │
│                              ┌─────────────────────────┐│
│                              │    React Dashboard      ││
│                              │    (Vite + port 5173)   ││
│                              │                         ││
│                              │  Overview · Claims      ││
│                              │  Network · Checker      ││
│                              │  Trends  · Providers    ││
│                              └─────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

---

## 🤖 ML Pipeline

### Models
- **Isolation Forest** — Unsupervised anomaly detection (200 estimators, contamination=0.17)
- **Gradient Boosting** — Supervised classifier (200 estimators, depth=5, lr=0.1)
- **Ensemble Score** — `0.6 × GB_prob + 0.4 × ISO_score` → final risk score (0–100)

### 15 Engineered Features
| Feature | What It Detects |
|---|---|
| `cost_deviation` | Claim cost vs. procedure average (σ) |
| `cost_ratio` | Billing inflation ratio |
| `volume_spike` | Provider filing surge |
| `age_mismatch` | Age-procedure incompatibility |
| `is_duplicate` | Same procedure within 7 days |
| `patient_claim_count` | Abnormal claim frequency |
| `is_high_risk_provider` | Provider fraud history > 30% |
| `amount_percentile` | Statistical outlier position |
| `is_weekend` | Weekend claim flag |
| + 6 more | Procedure, city, plan encodings |

### Risk Levels
```
🔴 CRITICAL  ≥ 75   →   HOLD PAYMENT
🟠 HIGH      ≥ 55   →   FLAG FOR REVIEW  
🟡 MEDIUM    ≥ 35   →   SOFT FLAG
🟢 LOW       < 35   →   APPROVE
```

### Network / Graph Analysis
- Builds a provider–patient graph from `network_edges.csv`
- Computes **degree centrality**, **betweenness centrality**, **eigenvector centrality**
- Detects **fraud rings** via `ring_referral` / `ring_patient` edge types
- Runs **greedy modularity community detection** (NetworkX)
- Exports a D3-ready JSON for interactive visualization

---

## 🚀 Fraud Patterns Detected

| Pattern | Detection Method |
|---|---|
| 💰 **Inflated Billing** | Cost ratio & deviation from procedure avg |
| 👻 **Ghost Patients** | Network graph — unconnected patient nodes |
| 📋 **Duplicate Claims** | Same procedure within 7-day window |
| 👶 **Age-Procedure Mismatch** | Age vs. procedure typical range |
| 📈 **Provider Volume Spike** | Daily claim count vs. provider average |
| 🕸️ **Fraud Rings** | Graph ring-referral edge community detection |

---

## 📦 Project Structure

```
fraud-detection/
├── 📄 generate_dataset.py    # Step 1: Synthetic data generation
├── 📄 ml_pipeline.py         # Step 2: Feature engineering + model training
├── 📄 app.py                 # Step 3: Flask REST API (port 5000)
│
├── data/
│   ├── claims.csv            # Raw synthetic claims
│   ├── providers.csv         # Provider metadata
│   ├── network_edges.csv     # Graph edges (provider↔patient)
│   ├── scored_claims.csv     # ML-scored output
│   ├── network_graph.json    # D3-ready graph JSON
│   └── fraudshield.db        # SQLite database
│
├── models/
│   ├── gb_model.pkl          # Gradient Boosting model
│   ├── iso_model.pkl         # Isolation Forest model
│   ├── scaler.pkl            # StandardScaler
│   └── feature_cols.json     # Feature column list
│
├── outputs/
│   ├── ml_results.png        # Evaluation charts
│   └── model_metrics.json    # Accuracy, AUC, stats
│
└── fraud-dashboard/          # React + Vite frontend
    └── src/
        ├── App.jsx
        └── FraudDashboard.jsx
```

---

## ⚙️ Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+

### 1. Install Python dependencies
```bash
pip install flask pandas numpy scikit-learn networkx matplotlib seaborn
```

### 2. Generate synthetic dataset
```bash
python generate_dataset.py
```

### 3. Train ML models
```bash
python ml_pipeline.py
```

### 4. Start the API server
```bash
python app.py
# → Running on http://localhost:5000
```

### 5. Start the React dashboard
```bash
cd fraud-dashboard
npm install
npm run dev
# → Running on http://localhost:5173
```

---

## 🔌 API Reference

| Endpoint | Method | Description |
|---|---|---|
| `/api/health` | GET | System health + model status |
| `/api/stats` | GET | Dashboard summary stats |
| `/api/claims` | GET | Paginated, filtered claims list |
| `/api/claims/<id>` | GET | Single claim detail + similar cases |
| `/api/fraud-types` | GET | Fraud type breakdown |
| `/api/trends` | GET | Monthly fraud trend data |
| `/api/providers` | GET | Provider risk leaderboard |
| `/api/network` | GET | Graph nodes & links (D3-ready) |
| `/api/analyze` | POST | Live ML scoring for a new claim |
| `/api/check-claim` | POST | Full manual claim checker |
| `/api/decision` | POST | Log investigator decision |

---

## 📊 Model Performance

```
Accuracy  :  99.08%
ROC-AUC   :  0.9997
Precision :  0.98   (Fraud class)
Recall    :  0.99   (Fraud class)
F1-Score  :  0.985
```

---

## 🖥️ Dashboard Tabs

| Tab | Purpose |
|---|---|
| **📊 Overview** | KPI cards, fraud rate, amount at risk, risk breakdown pie |
| **📋 Claims** | Searchable, filterable claims table with risk badges |
| **🔍 Claim Detail** | Full claim info, red/green flags, ML explanation, similar cases |
| **🕸️ Network** | Interactive D3 force graph — fraud rings, ghost nodes, communities |
| **🩺 Manual Checker** | Submit a real claim for instant AI analysis |
| **📈 Trends** | Month-over-month fraud vs. legitimate claim chart |
| **🏥 Providers** | Provider risk leaderboard with fraud rates |

---

## 🧑‍💻 Tech Stack

**Backend**
- Python · Flask · SQLite · Pandas · NumPy

**Machine Learning**
- scikit-learn (Gradient Boosting, Isolation Forest, StandardScaler)
- NetworkX (Graph analysis, community detection)
- Matplotlib · Seaborn (Evaluation charts)

**Frontend**
- React 18 · Vite · Vanilla CSS
- D3.js (Network force graph)
- Recharts (Trend & distribution charts)

---

## 👥 Team

> Built with ❤️ during a 24-hour hackathon sprint.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

<div align="center">

**⭐ If FraudShield impressed you, give it a star!**

`Built in 24 hours · Powered by AI · Fighting Healthcare Fraud`

</div>
