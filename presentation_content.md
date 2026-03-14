# FraudShield: AI-Powered Healthcare Fraud Detection System

## 1. Project Overview
- **Name:** FraudShield
- **Domain:** Healthcare Insurance Technology
- **Goal:** Detect and visualize insurance fraud in real-time, preventing financial losses through AI.
- **Problem Solved:** Rule-based legacy systems fail to catch complex fraud like orchestrated rings, ghost patients, and provider volume spikes. FraudShield uses an ML ensemble + graph analysis to find these hidden patterns.

## 2. Core Implementation Components

### A. Synthetic Data Generator (generate_dataset.py)
- Custom Python script safely generates a highly realistic healthcare dataset (to protect actual patient PHI).
- **Outputs generated:**
  - `claims.csv` (10,000+ synthetic claims)
  - `providers.csv` (Doctor & Lab metadata)
  - `network_edges.csv` (Patient-to-provider routing patterns)
- **Embedded Fraud Scenarios:** Deliberately injects 6 types of fraud: Inflated Billing, Ghost Patients, Duplicate Claims, Age Mismatches, Volume Spikes, and Coordinated Fraud Rings.

### B. Machine Learning Pipeline (ml_pipeline.py)
- **Feature Engineering:** Built 15 behavioral features (e.g., cost standard deviations, short-time duplicate claim detection, age-procedure mismatch logic).
- **Ensemble ML Architecture:**
  1. **Isolation Forest (Unsupervised):** Detects novel, never-before-seen anomalies and outlier claims.
  2. **Gradient Boosting (Supervised):** Learns from historical labeled fraud data to classify known fraud patterns.
  3. **Ensemble Logic:** Combines both scores (60% GB + 40% Iso) for a definitive `final_risk_score` (0-100).
- **Performance:** Achieved 99.08% Accuracy and 0.9997 ROC-AUC score.

### C. Network Graph Analysis (NetworkX)
- Converts claims and referrals into a massive mathematical graph.
- Calculates **Degree vs. Betweenness Centrality** to find "super-providers" referring unusually high volumes of suspicious patients.
- Uses **Greedy Modularity Community Detection** to isolate hidden fraud rings (groups of malicious providers and patients collaborating to steal funds).
- Exports data as a D3-ready JSON.

### D. Explainable AI (XAI) Engine
- "Black box" AI isn't trusted in healthcare. We implemented an explainability layer.
- Extracts feature importances from the Gradient Boosting model for every flagged claim.
- Translates math into human text (e.g., *"Claim ₹50,000 is 10x above average for Consultation (Imp: 0.45)"*), allowing human investigators to understand *why* the AI flagged it.

### E. Flask REST API Backend (app.py)
- Developed a fast, lightweight Python backend server (port 5000).
- **Database:** Implemented SQLite3 for zero-config persistence and investigator decision logging.
- **Endpoints:** Created 10+ REST endpoints to serve statistics, paginated claims lists, provider leaderboards, and handle live ML inference on new manual claim submissions.

### F. React + Vite Interactive Dashboard (Frontend)
- Built a modern, high-performance UI (port 5173).
- **KPI Overview:** Real-time stats on "Amount at Risk", "Fraud Rate", and "Savings Potential".
- **Dynamic Data Visualization:**
  - Integrated D3.js force-directed graph to visualize Fraud Rings.
  - Recharts for trend analysis and risk score distributions.
- **Investigator Tools:**
  - Sortable/filterable "Live Claims Feed" with color-coded risk badging (Critical, High, Medium, Low).
  - "Claim Detail View" comparing a flagged claim against similar historical cases.
  - "Manual Claim Checker Form" allowing users to input a new claim and get an AI verdict in milliseconds.

## 3. Technologies Stack Used
- **Backend:** Python 3.10+, Flask, SQLite
- **Machine Learning:** scikit-learn, Pandas, NumPy
- **Graph Mathematics:** NetworkX
- **Frontend:** React 18, Vite, Vanilla CSS3 (Custom Glassmorphism UI)
- **Charts/Viz:** D3.js, Recharts, Matplotlib, Seaborn

## 4. Business Impact Metrics
- **Scalability:** Capable of scoring thousands of claims per second using the pre-compiled `gb_model.pkl` and `iso_model.pkl`.
- **Accuracy VS False Positives:** Ensemble approach drastically reduces false positives, minimizing friction for legitimate healthcare providers while aggressively targeting real fraud.
- **Financial Defense:** Visualizes exact "Amount at Risk" indicating direct ROI for the insurance company adopting the software.
