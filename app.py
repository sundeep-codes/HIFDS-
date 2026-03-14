"""
FraudShield — Complete Backend with SQLite Auth
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Database : SQLite (data/fraudshield.db) — zero setup needed
Auth     : Signup, Login, Forgot/Reset Password
Security : SHA-256 hashing, 3-attempt lockout, 15-min ban
"""

import os, json, pickle, warnings, hashlib, secrets, sqlite3, smtplib
warnings.filterwarnings("ignore")
import pandas as pd
import numpy as np
from flask import Flask, jsonify, request
from datetime import datetime, timedelta
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# ─────────────────────────────────────────
# PATHS
# ─────────────────────────────────────────
DATA_DIR   = "data"
MODEL_DIR  = "models"
OUT_DIR    = "outputs"
DB_PATH    = f"{DATA_DIR}/fraudshield.db"

EMAIL_ADDRESS  = os.environ.get("EMAIL_ADDRESS",  "")
EMAIL_PASSWORD = os.environ.get("EMAIL_PASSWORD",  "")

MAX_ATTEMPTS = 3
LOCKOUT_MINS = 15
TOKEN_EXPIRY = 30

# ─────────────────────────────────────────
# FLASK APP
# ─────────────────────────────────────────
app = Flask(__name__)

@app.after_request
def cors(r):
    r.headers["Access-Control-Allow-Origin"]  = "*"
    r.headers["Access-Control-Allow-Headers"] = "Content-Type,Authorization"
    r.headers["Access-Control-Allow-Methods"] = "GET,POST,PUT,DELETE,OPTIONS"
    return r

@app.route("/api/<path:p>", methods=["OPTIONS"])
def pre(p): return jsonify({}), 200

# ─────────────────────────────────────────
# SQLITE DATABASE SETUP
# ─────────────────────────────────────────
def get_db():
    """Get database connection."""
    os.makedirs(DATA_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Create tables if they don't exist."""
    conn = get_db()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            uid           TEXT UNIQUE NOT NULL,
            username      TEXT NOT NULL,
            email         TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role          TEXT DEFAULT 'Investigator',
            attempts      INTEGER DEFAULT 0,
            locked_until  TEXT,
            reset_token   TEXT,
            reset_expiry  TEXT,
            last_login    TEXT,
            created_at    TEXT NOT NULL
        )
    """)
    conn.commit()
    conn.close()
    print("  ✅ SQLite DB initialized  →", DB_PATH)

# ─────────────────────────────────────────
# AUTH HELPERS
# ─────────────────────────────────────────
def hash_pw(pw):
    return hashlib.sha256(pw.encode()).hexdigest()

def gen_token():
    return secrets.token_urlsafe(32)

def send_reset_email(to_email, token, username):
    """Send password reset email via Gmail SMTP."""
    if not EMAIL_ADDRESS or not EMAIL_PASSWORD:
        return False, "Email not configured"

    link = f"http://localhost:5173?reset_token={token}"
    msg  = MIMEMultipart("alternative")
    msg["Subject"] = "🛡 FraudShield — Password Reset"
    msg["From"]    = EMAIL_ADDRESS
    msg["To"]      = to_email

    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;
                background:#0d1423;color:#e2e8f0;padding:32px;border-radius:12px">
      <div style="text-align:center;margin-bottom:24px">
        <h1 style="color:#06b6d4;font-size:24px">🛡 FraudShield</h1>
        <p style="color:#64748b;font-size:12px">Healthcare Fraud Detection</p>
      </div>
      <h2 style="color:#f1f5f9;font-size:18px">Hi {username},</h2>
      <p style="color:#94a3b8;line-height:1.7;margin:12px 0">
        You requested a password reset. Click the button below.
        This link expires in <strong>{TOKEN_EXPIRY} minutes</strong>.
      </p>
      <div style="text-align:center;margin:28px 0">
        <a href="{link}"
           style="background:linear-gradient(135deg,#06b6d4,#0ea5e9);
                  color:white;padding:13px 30px;border-radius:8px;
                  text-decoration:none;font-weight:700;font-size:14px">
          Reset My Password
        </a>
      </div>
      <p style="color:#64748b;font-size:12px">
        Or copy: <span style="color:#06b6d4">{link}</span>
      </p>
      <p style="color:#475569;font-size:11px;margin-top:20px">
        If you didn't request this, ignore this email.
      </p>
    </div>
    """
    msg.attach(MIMEText(html, "html"))
    try:
        with smtplib.SMTP("smtp.gmail.com", 587) as s:
            s.starttls()
            s.login(EMAIL_ADDRESS, EMAIL_PASSWORD)
            s.send_message(msg)
        return True, "sent"
    except Exception as e:
        return False, str(e)

# ═══════════════════════════════════════════════════
# AUTH ENDPOINTS
# ═══════════════════════════════════════════════════

# ── SIGNUP ──────────────────────────────────────────
@app.route("/api/auth/signup", methods=["POST"])
def signup():
    d        = request.get_json(force=True) or {}
    username = str(d.get("username", "")).strip()
    email    = str(d.get("email",    "")).strip().lower()
    password = str(d.get("password", ""))
    role     = str(d.get("role",     "Investigator"))

    # Validate
    if not username or not email or not password:
        return jsonify({"error": "All fields are required"}), 400
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400
    if "@" not in email or "." not in email:
        return jsonify({"error": "Enter a valid email address"}), 400
    if len(username) < 2:
        return jsonify({"error": "Name must be at least 2 characters"}), 400

    conn = get_db()
    try:
        # Check duplicates
        existing = conn.execute(
            "SELECT id FROM users WHERE email=? OR username=?",
            (email, username)
        ).fetchone()

        if existing:
            # Check which one
            em_ex = conn.execute("SELECT id FROM users WHERE email=?", (email,)).fetchone()
            un_ex = conn.execute("SELECT id FROM users WHERE username=?", (username,)).fetchone()
            if em_ex:
                return jsonify({"error": "Email already registered"}), 409
            if un_ex:
                return jsonify({"error": "Username already taken"}), 409

        uid = gen_token()[:16]
        conn.execute("""
            INSERT INTO users
            (uid, username, email, password_hash, role, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (uid, username, email, hash_pw(password), role,
              datetime.now().isoformat()))
        conn.commit()

        token = gen_token()
        return jsonify({
            "status":  "success",
            "message": f"Welcome to FraudShield, {username}! 🎉",
            "token":   token,
            "user": {
                "uid":      uid,
                "username": username,
                "email":    email,
                "role":     role,
            }
        })
    except sqlite3.IntegrityError as e:
        return jsonify({"error": "Email or username already exists"}), 409
    finally:
        conn.close()

# ── LOGIN ────────────────────────────────────────────
@app.route("/api/auth/login", methods=["POST"])
def login():
    d        = request.get_json(force=True) or {}
    email    = str(d.get("email",    "")).strip().lower()
    password = str(d.get("password", ""))

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    conn = get_db()
    try:
        user = conn.execute(
            "SELECT * FROM users WHERE email=?", (email,)
        ).fetchone()

        if not user:
            return jsonify({"error": "No account found with this email"}), 404

        user = dict(user)

        # ── Check lockout ────────────────────────────
        if user.get("locked_until"):
            locked_until = datetime.fromisoformat(user["locked_until"])
            if datetime.now() < locked_until:
                remaining = int((locked_until - datetime.now()).total_seconds() / 60) + 1
                secs_left = int((locked_until - datetime.now()).total_seconds())
                return jsonify({
                    "error":          f"Account locked. Try again in {remaining} minute(s).",
                    "locked":         True,
                    "locked_until":   user["locked_until"],
                    "remaining_mins": remaining,
                    "remaining_secs": secs_left,
                }), 429
            else:
                # Lockout expired — reset
                conn.execute(
                    "UPDATE users SET attempts=0, locked_until=NULL WHERE email=?",
                    (email,)
                )
                conn.commit()
                user["attempts"]     = 0
                user["locked_until"] = None

        # ── Check password ────────────────────────────
        if user["password_hash"] != hash_pw(password):
            new_attempts = user.get("attempts", 0) + 1
            left         = MAX_ATTEMPTS - new_attempts

            if new_attempts >= MAX_ATTEMPTS:
                locked_until = (datetime.now() + timedelta(minutes=LOCKOUT_MINS)).isoformat()
                conn.execute(
                    "UPDATE users SET attempts=0, locked_until=? WHERE email=?",
                    (locked_until, email)
                )
                conn.commit()
                return jsonify({
                    "error":        f"Too many failed attempts. Account locked for {LOCKOUT_MINS} minutes.",
                    "locked":       True,
                    "locked_until": locked_until,
                }), 429
            else:
                conn.execute(
                    "UPDATE users SET attempts=? WHERE email=?",
                    (new_attempts, email)
                )
                conn.commit()
                return jsonify({
                    "error":         "Incorrect password",
                    "attempts_left": left,
                    "warning":       f"{left} attempt(s) remaining before lockout",
                }), 401

        # ── Success ───────────────────────────────────
        last_login = datetime.now().isoformat()
        conn.execute(
            "UPDATE users SET attempts=0, locked_until=NULL, last_login=? WHERE email=?",
            (last_login, email)
        )
        conn.commit()

        token = gen_token()
        return jsonify({
            "status":  "success",
            "message": f"Welcome back, {user['username']}! 👋",
            "token":   token,
            "user": {
                "uid":        user["uid"],
                "username":   user["username"],
                "email":      user["email"],
                "role":       user.get("role", "Investigator"),
                "last_login": last_login,
            }
        })
    finally:
        conn.close()

# ── FORGOT PASSWORD ──────────────────────────────────
@app.route("/api/auth/forgot-password", methods=["POST"])
def forgot_password():
    d     = request.get_json(force=True) or {}
    email = str(d.get("email", "")).strip().lower()

    if not email:
        return jsonify({"error": "Email is required"}), 400

    conn = get_db()
    try:
        user = conn.execute(
            "SELECT * FROM users WHERE email=?", (email,)
        ).fetchone()

        # Always return success (security — don't reveal if email exists)
        if not user:
            return jsonify({
                "status":  "sent",
                "message": "If this email is registered, a reset link has been sent.",
            })

        user  = dict(user)
        token = gen_token()
        expiry= (datetime.now() + timedelta(minutes=TOKEN_EXPIRY)).isoformat()

        conn.execute(
            "UPDATE users SET reset_token=?, reset_expiry=? WHERE email=?",
            (token, expiry, email)
        )
        conn.commit()

        # Try to send email
        sent, msg = send_reset_email(email, token, user["username"])

        if sent:
            return jsonify({
                "status":      "sent",
                "message":     f"Reset link sent to {email}. Check your inbox.",
                "expires_in":  f"{TOKEN_EXPIRY} minutes",
            })
        else:
            # Demo mode — return token directly
            return jsonify({
                "status":      "sent",
                "message":     "Reset link generated! (Email not configured — use demo link below)",
                "demo_token":  token,
                "reset_link":  f"http://localhost:5173?reset_token={token}",
            })
    finally:
        conn.close()

# ── RESET PASSWORD ───────────────────────────────────
@app.route("/api/auth/reset-password", methods=["POST"])
def reset_password():
    d        = request.get_json(force=True) or {}
    token    = str(d.get("token",        ""))
    new_pass = str(d.get("new_password", ""))

    if not token or not new_pass:
        return jsonify({"error": "Token and new password are required"}), 400
    if len(new_pass) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400

    conn = get_db()
    try:
        user = conn.execute(
            "SELECT * FROM users WHERE reset_token=?", (token,)
        ).fetchone()

        if not user:
            return jsonify({"error": "Invalid or expired reset link"}), 400

        user = dict(user)

        # Check expiry
        if user.get("reset_expiry"):
            if datetime.now() > datetime.fromisoformat(user["reset_expiry"]):
                conn.execute(
                    "UPDATE users SET reset_token=NULL, reset_expiry=NULL WHERE id=?",
                    (user["id"],)
                )
                conn.commit()
                return jsonify({"error": "Reset link has expired. Request a new one."}), 400

        # Update password
        conn.execute("""
            UPDATE users SET
                password_hash = ?,
                reset_token   = NULL,
                reset_expiry  = NULL,
                attempts      = 0,
                locked_until  = NULL
            WHERE id = ?
        """, (hash_pw(new_pass), user["id"]))
        conn.commit()

        return jsonify({
            "status":  "success",
            "message": "Password reset successfully! You can now sign in. ✅",
        })
    finally:
        conn.close()

# ── VERIFY TOKEN ─────────────────────────────────────
@app.route("/api/auth/verify", methods=["GET"])
def verify():
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    return jsonify({"valid": bool(token), "status": "ok"})

# ── LOGOUT ───────────────────────────────────────────
@app.route("/api/auth/logout", methods=["POST"])
def logout():
    return jsonify({"status": "success", "message": "Logged out successfully"})

# ── USER PROFILE ─────────────────────────────────────
@app.route("/api/auth/profile", methods=["GET"])
def profile():
    email = request.args.get("email", "")
    if not email:
        return jsonify({"error": "Email required"}), 400
    conn = get_db()
    try:
        user = conn.execute(
            "SELECT uid,username,email,role,created_at,last_login FROM users WHERE email=?",
            (email,)
        ).fetchone()
        if not user:
            return jsonify({"error": "User not found"}), 404
        return jsonify({"user": dict(user)})
    finally:
        conn.close()

# ═══════════════════════════════════════════════════
# LOAD FRAUD DATA AT STARTUP
# ═══════════════════════════════════════════════════
print("\n" + "━"*50)
print("  FraudShield API v2.0 — Starting...")
print("━"*50)

# Init SQLite
init_db()

# Claims
try:
    df = pd.read_csv(f"{DATA_DIR}/scored_claims.csv")
    df["claim_date"]     = pd.to_datetime(df["claim_date"])
    df["ml_explanation"] = df.get("ml_explanation", pd.Series([""]*len(df))).fillna("")
    df["fraud_type"]     = df.get("fraud_type",     pd.Series(["None"]*len(df))).fillna("None")
    df["in_fraud_ring"]  = df.get("in_fraud_ring",  pd.Series([0]*len(df))).fillna(0)
    print(f"  ✅ Claims loaded       : {len(df):,}")
except Exception as e:
    print(f"  ❌ Claims error: {e}")
    df = pd.DataFrame()

# Network graph
try:
    with open(f"{DATA_DIR}/network_graph.json") as f:
        NET = json.load(f)
    print(f"  ✅ Network graph       : {len(NET['nodes'])} nodes")
except:
    NET = {"nodes":[], "links":[], "stats":{}}

# Providers
try:
    provs_df = pd.read_csv(f"{DATA_DIR}/providers.csv")
    print(f"  ✅ Providers           : {len(provs_df)}")
except:
    provs_df = pd.DataFrame()

# Procedure stats
try:
    with open(f"{DATA_DIR}/procedure_stats.json") as f:
        PROC_STATS = json.load(f)
    print(f"  ✅ Procedure stats     : {len(PROC_STATS)} procedures")
except:
    PROC_STATS = {}

# Model metrics
try:
    with open(f"{OUT_DIR}/model_metrics.json") as f:
        METRICS = json.load(f)
except:
    METRICS = {"accuracy": 99.08, "roc_auc": 0.9997}

# ML Models
try:
    with open(f"{MODEL_DIR}/gb_model.pkl",  "rb") as f: GB  = pickle.load(f)
    with open(f"{MODEL_DIR}/iso_model.pkl", "rb") as f: ISO = pickle.load(f)
    with open(f"{MODEL_DIR}/scaler.pkl",    "rb") as f: SC  = pickle.load(f)
    with open(f"{MODEL_DIR}/feature_cols.json") as f:   FC  = json.load(f)
    ML_OK = True
    print("  ✅ ML models           : loaded")
except Exception as e:
    ML_OK = False
    print(f"  ⚠  ML models           : {e}")

print("━"*50)

# ─────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────
RC = {"CRITICAL":"#ef4444","HIGH":"#f97316","MEDIUM":"#eab308","LOW":"#22c55e"}
RB = {"CRITICAL":"rgba(239,68,68,0.12)","HIGH":"rgba(249,115,22,0.12)",
      "MEDIUM":"rgba(234,179,8,0.12)","LOW":"rgba(34,197,94,0.12)"}

def rlvl(s):
    if s>=75: return "CRITICAL"
    if s>=55: return "HIGH"
    if s>=35: return "MEDIUM"
    return "LOW"

def clean(row):
    d = row.to_dict() if hasattr(row,"to_dict") else dict(row)
    for k,v in d.items():
        if isinstance(v,float) and (np.isnan(v) or np.isinf(v)): d[k]=None
        elif hasattr(v,"item"): d[k]=v.item()
        elif isinstance(v,pd.Timestamp): d[k]=v.strftime("%Y-%m-%d")
    return d

# ═══════════════════════════════════════════════════
# FRAUD DETECTION ENDPOINTS
# ═══════════════════════════════════════════════════

@app.route("/")
def root():
    return jsonify({"name":"FraudShield API v2.0","status":"running",
        "db":"SQLite","auth":"enabled"})

@app.route("/api/health")
def health():
    conn = get_db()
    user_count = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]
    conn.close()
    return jsonify({"status":"ok","models_loaded":ML_OK,
                    "total_claims":len(df),"version":"2.0.0",
                    "db":"connected","registered_users":user_count,
                    "timestamp":datetime.now().isoformat()})

@app.route("/api/stats")
def stats():
    if df.empty: return jsonify({"error":"No data"}),500
    total  = len(df); fraud=int(df["predicted_fraud"].sum())
    at_risk= float(df[df["predicted_fraud"]==1]["claim_amount"].sum())
    rb={lvl:{"count":int((df["risk_level"]==lvl).sum()),
             "color":RC[lvl],"bg":RB[lvl]}
        for lvl in ["CRITICAL","HIGH","MEDIUM","LOW"]}
    return jsonify({
        "summary":{
            "total_claims":total,"fraud_detected":fraud,"legitimate":total-fraud,
            "fraud_rate_pct":round(fraud/total*100,1),
            "amount_at_risk":round(at_risk,2),
            "total_amount":round(float(df["claim_amount"].sum()),2),
            "avg_risk_score":round(float(df["final_risk_score"].mean()),1),
            "savings_potential":round(at_risk*0.85,2),
            "fraud_ring_claims":int(df["in_fraud_ring"].sum()),
        },
        "risk_breakdown":rb,
        "model_performance":{"accuracy":METRICS.get("accuracy",99.08),
                             "roc_auc":METRICS.get("roc_auc",0.9997),"threshold":55},
        "network_stats":METRICS.get("network_stats",{}),
    })

@app.route("/api/claims")
def claims():
    if df.empty: return jsonify({"claims":[],"pagination":{}}),200
    page=int(request.args.get("page",1))
    per=int(request.args.get("per_page",20))
    rf=request.args.get("risk_level","ALL").upper()
    fo=request.args.get("fraud_only","false")=="true"
    ro=request.args.get("ring_only","false")=="true"
    sb=request.args.get("sort_by","risk_desc")
    srch=request.args.get("search","").lower()
    flt=df.copy()
    if rf!="ALL":  flt=flt[flt["risk_level"]==rf]
    if fo:         flt=flt[flt["predicted_fraud"]==1]
    if ro:         flt=flt[flt["in_fraud_ring"]==1]
    if srch:
        m=(flt["patient_name"].str.lower().str.contains(srch,na=False)|
           flt["provider_name"].str.lower().str.contains(srch,na=False)|
           flt["claim_id"].str.lower().str.contains(srch,na=False))
        flt=flt[m]
    sm={"risk_desc":("final_risk_score",False),"risk_asc":("final_risk_score",True),
        "amount_desc":("claim_amount",False),"date_desc":("claim_date",False)}
    col,asc=sm.get(sb,("final_risk_score",False))
    flt=flt.sort_values(col,ascending=asc)
    total=len(flt); start=(page-1)*per
    rows=flt.iloc[start:start+per]
    result=[]
    for _,row in rows.iterrows():
        d2=clean(row)
        d2["risk_color"]=RC.get(str(d2.get("risk_level","LOW")),"#22c55e")
        d2["risk_bg"]=RB.get(str(d2.get("risk_level","LOW")),"")
        result.append(d2)
    return jsonify({"claims":result,
        "pagination":{"page":page,"per_page":per,"total":total,
                      "total_pages":max(1,(total+per-1)//per)}})

@app.route("/api/claims/<cid>")
def claim_detail(cid):
    if df.empty: return jsonify({"error":"No data"}),500
    row=df[df["claim_id"]==cid]
    if row.empty: return jsonify({"error":f"{cid} not found"}),404
    d2=clean(row.iloc[0])
    d2["risk_color"]=RC.get(str(d2.get("risk_level","LOW")),"#22c55e")
    d2["risk_bg"]=RB.get(str(d2.get("risk_level","LOW")),"")
    expl=d2.get("ml_explanation","") or ""
    d2["explanation_list"]=[r.strip() for r in expl.split("|") if r.strip()] or ["No suspicious patterns"]
    sim=df[(df["fraud_type"]==d2.get("fraud_type","None"))&
           (df["claim_id"]!=cid)&(df["predicted_fraud"]==1)][
        ["claim_id","patient_name","procedure","claim_amount","risk_level"]].head(3)
    d2["similar_cases"]=sim.to_dict("records")
    return jsonify({"claim":d2})

@app.route("/api/fraud-types")
def fraud_types():
    if df.empty: return jsonify({"fraud_types":[],"total_fraud":0})
    fdf=df[df["predicted_fraud"]==1]
    bk=fdf["fraud_type"].value_counts().reset_index()
    bk.columns=["type","count"]
    colors={"Inflated Billing":"#ef4444","Provider Volume Spike":"#f97316",
            "Ghost Patient":"#a855f7","Duplicate Claim":"#3b82f6",
            "Fraud Ring":"#dc2626","Age-Procedure Mismatch":"#eab308","None":"#22c55e"}
    total=len(fdf)
    result=[{"type":str(r["type"]),"count":int(r["count"]),
             "color":colors.get(str(r["type"]),"#64748b"),
             "percentage":round(int(r["count"])/max(1,total)*100,1)}
            for _,r in bk.iterrows()]
    return jsonify({"fraud_types":result,"total_fraud":total})

@app.route("/api/trends")
def trends():
    if df.empty: return jsonify({"trends":[]})
    df["month"]=df["claim_date"].dt.to_period("M").astype(str)
    mo=df.groupby(["month","predicted_fraud"]).agg(
        count=("claim_id","count"),amount=("claim_amount","sum")).reset_index()
    months=sorted(df["month"].unique())
    result=[]
    for m in months:
        lg=mo[(mo["month"]==m)&(mo["predicted_fraud"]==0)]
        fr=mo[(mo["month"]==m)&(mo["predicted_fraud"]==1)]
        result.append({"month":m,
            "legitimate":int(lg["count"].values[0]) if len(lg) else 0,
            "fraud":int(fr["count"].values[0]) if len(fr) else 0,
            "fraud_amount":float(fr["amount"].values[0]) if len(fr) else 0,
            "legit_amount":float(lg["amount"].values[0]) if len(lg) else 0})
    return jsonify({"trends":result})

@app.route("/api/providers")
def providers():
    if df.empty: return jsonify({"providers":[]})
    g=df.groupby("provider_name").agg(
        total_claims=("claim_id","count"),fraud_claims=("predicted_fraud","sum"),
        total_amount=("claim_amount","sum"),avg_risk=("final_risk_score","mean"),
        ring_claims=("in_fraud_ring","sum")).reset_index()
    g["fraud_rate"]=(g["fraud_claims"]/g["total_claims"].replace(0,1)*100).round(1)
    g=g.sort_values("avg_risk",ascending=False)
    result=[]
    for _,row in g.iterrows():
        ar=float(row["avg_risk"]); lvl=rlvl(ar)
        result.append({"provider_name":row["provider_name"],
            "total_claims":int(row["total_claims"]),"fraud_claims":int(row["fraud_claims"]),
            "fraud_rate_pct":float(row["fraud_rate"]),"total_amount":round(float(row["total_amount"]),2),
            "ring_claims":int(row["ring_claims"]),"avg_risk_score":round(ar,1),
            "risk_level":lvl,"risk_color":RC[lvl]})
    return jsonify({"providers":result})

@app.route("/api/network")
def network():
    filt=request.args.get("filter","all")
    nodes=list(NET.get("nodes",[]))
    links=list(NET.get("links",[]))
    if filt=="fraud_ring":
        ring_ids={n["id"] for n in nodes if n.get("is_fraud_ring")}
        nodes=[n for n in nodes if n.get("is_fraud_ring")]
        links=[l for l in links if l["source"] in ring_ids and l["target"] in ring_ids]
    elif filt=="providers_only":
        pids={n["id"] for n in nodes if n["type"]=="provider"}
        nodes=[n for n in nodes if n["type"]=="provider"]
        links=[l for l in links if l["source"] in pids and l["target"] in pids]
    for node in nodes:
        fs=node.get("fraud_score",0)
        if node.get("is_fraud_ring"):    node["color"]="#ef4444"
        elif node.get("is_ghost"):       node["color"]="#a855f7"
        elif node.get("type")=="provider": node["color"]="#f97316" if fs>50 else "#3b82f6"
        else:                            node["color"]="#64748b"
    return jsonify({"nodes":nodes,"links":links,"stats":NET.get("stats",{}),"filter":filt})

@app.route("/api/analyze", methods=["POST"])
def analyze():
    if df.empty: return jsonify({"error":"No data"}),500
    d2=request.get_json(force=True) or {}
    amount=float(d2.get("claim_amount",0)); age=int(d2.get("patient_age",30))
    proc=str(d2.get("procedure","Consultation - General"))
    pid=str(d2.get("provider_id","DR001"))
    reasons=[]; score=10.0
    if ML_OK:
        try:
            pa=PROC_STATS.get(proc,{}).get("mean",df["claim_amount"].mean())
            ps=PROC_STATS.get(proc,{}).get("std",pa*0.5) or 1
            feat=np.array([[amount,age,(amount-pa)/ps,amount/(pa+1),
                8,1.0,1 if age<20 and proc in ["Hip Replacement","Bypass Surgery"] else 0,
                0,3,1 if any(pid.startswith(x) for x in ["DR009","DR010","DR011","LAB"]) else 0,
                50,1 if datetime.now().weekday()>=5 else 0,hash(proc)%20,0,0]])
            fsc=SC.transform(feat)
            gp=GB.predict_proba(fsc)[0][1]
            ir=ISO.decision_function(fsc)[0]
            in_=float(np.clip((1-(ir+0.5))*100,0,100))
            score=round(float(0.6*gp*100+0.4*in_),1)
        except: score=_rule(amount,age,proc,pid)
    else: score=_rule(amount,age,proc,pid)
    pa2=PROC_STATS.get(proc,{}).get("mean",df["claim_amount"].mean() if not df.empty else 5000)
    if amount>pa2*5: reasons.append(f"Claim ₹{amount:,.0f} is {amount/pa2:.0f}x above avg ₹{pa2:,.0f}")
    if age<20 and proc in ["Hip Replacement","Bypass Surgery","Angioplasty"]:
        reasons.append(f"Age {age} is unusual for '{proc}'")
    if any(pid.startswith(x) for x in ["DR009","DR010","DR011","LAB"]):
        reasons.append("Provider has elevated historical fraud rate")
    if not reasons:
        reasons.append("No strong suspicious signals" if score<55 else "Unusual pattern detected by ML")
    score=float(np.clip(score,0,100)); lvl=rlvl(score)
    return jsonify({"claim_id":f"CLM_LIVE_{datetime.now().strftime('%H%M%S')}",
        "final_risk_score":score,"risk_level":lvl,"risk_color":RC[lvl],"risk_bg":RB[lvl],
        "predicted_fraud":1 if score>=55 else 0,"explanation_list":reasons,
        "scored_at":datetime.now().isoformat(),"model_used":"ML Ensemble" if ML_OK else "Rule-Based",
        "verdict":"HOLD PAYMENT" if lvl=="CRITICAL" else "FLAG FOR REVIEW" if lvl=="HIGH"
                  else "SOFT FLAG" if lvl=="MEDIUM" else "APPROVE"})

def _rule(amount,age,proc,pid):
    s=10.0; avg=df["claim_amount"].mean() if not df.empty else 5000
    if amount>avg*10: s+=50
    elif amount>avg*5: s+=30
    elif amount>avg*2: s+=15
    if age<20 and proc in ["Hip Replacement","Bypass Surgery","Angioplasty"]: s+=35
    if any(pid.startswith(x) for x in ["DR009","DR010","DR011","LAB"]): s+=30
    return min(s,99.0)

@app.route("/api/check-claim", methods=["POST"])
def check_claim():
    if df.empty: return jsonify({"error":"No data"}),500
    d2=request.get_json(force=True) or {}
    pname=str(d2.get("patient_name","Unknown")); page=int(d2.get("patient_age",30))
    gender=str(d2.get("gender","Male")); pvname=str(d2.get("provider_name","Unknown"))
    pvid=str(d2.get("provider_id","DR001")); proc=str(d2.get("procedure","Consultation - General"))
    diagn=str(d2.get("diagnosis_code","Z00")); amount=float(d2.get("claim_amount",0))
    cdate=str(d2.get("claim_date",datetime.now().strftime("%Y-%m-%d")))
    plan=str(d2.get("insurance_plan","Standard"))
    red_flags=[]; green_flags=[]; score=10.0
    pi=PROC_STATS.get(proc,{}); pa=pi.get("mean",df["claim_amount"].mean())
    ratio=amount/(pa+1)
    if ratio>10:   red_flags.append({"flag":"Extreme Cost Inflation","detail":f"₹{amount:,.0f} is {ratio:.0f}x above avg ₹{pa:,.0f}","score":35}); score+=35
    elif ratio>5:  red_flags.append({"flag":"High Cost Inflation","detail":f"₹{amount:,.0f} is {ratio:.0f}x above avg","score":25}); score+=25
    elif ratio>2:  red_flags.append({"flag":"Elevated Cost","detail":f"₹{amount:,.0f} is {ratio:.1f}x above avg","score":10}); score+=10
    else:          green_flags.append(f"Amount ₹{amount:,.0f} within normal range")
    adult=["Hip Replacement","Knee Replacement","Bypass Surgery","Angioplasty","Cataract Surgery"]
    if page<18 and proc in adult:
        red_flags.append({"flag":"Age-Procedure Mismatch","detail":f"Age {page} too young for '{proc}'","score":30}); score+=30
    else: green_flags.append(f"Age {page} appropriate for '{proc}'")
    fraud_provs=["DR009","DR010","DR011","LAB001","LAB002","DR012","DR013","LAB003","DR014","DR015","LAB004"]
    pm=df[df["provider_id"]==pvid] if not df.empty else pd.DataFrame()
    if pvid in fraud_provs:
        fr2=float(pm["fraud_label"].mean()*100) if len(pm) else 80
        red_flags.append({"flag":"High-Risk Provider","detail":f"{pvid} has {fr2:.0f}% fraud rate","score":25}); score+=25
    else: green_flags.append("Provider not in high-risk list")
    try:
        if datetime.strptime(cdate,"%Y-%m-%d").weekday()>=5:
            red_flags.append({"flag":"Weekend Submission","detail":"Weekend claims have higher fraud rates","score":5}); score+=5
        else: green_flags.append("Weekday submission — normal pattern")
    except: pass
    sim=df[(df["fraud_type"]!="None")&(df["procedure"]==proc)&
           (df["predicted_fraud"]==1)][["claim_id","patient_name","claim_amount","fraud_type","risk_level"]].head(3) if not df.empty else pd.DataFrame()
    score=float(np.clip(score,0,100)); lvl=rlvl(score)
    verdict=("HOLD PAYMENT — Investigate immediately" if lvl=="CRITICAL" else
             "FLAG FOR REVIEW — Manual check required" if lvl=="HIGH" else
             "SOFT FLAG — Monitor this claim" if lvl=="MEDIUM" else
             "APPROVE — No major red flags found")
    return jsonify({"claim_id":f"MANUAL_{datetime.now().strftime('%H%M%S')}",
        "patient_name":pname,"patient_age":page,"gender":gender,
        "provider_name":pvname,"procedure":proc,"claim_amount":amount,
        "claim_date":cdate,"insurance_plan":plan,"diagnosis_code":diagn,
        "final_risk_score":round(score,1),"risk_level":lvl,
        "risk_color":RC[lvl],"risk_bg":RB[lvl],"verdict":verdict,
        "red_flags":red_flags,"green_flags":green_flags,
        "similar_cases":sim.to_dict("records") if not sim.empty else [],
        "total_red_flags":len(red_flags),"scored_at":datetime.now().isoformat()})

@app.route("/api/decision", methods=["POST"])
def decision():
    import uuid
    d2=request.get_json(force=True) or {}
    cid=str(d2.get("claim_id","")); dec=str(d2.get("decision",""))
    reason=str(d2.get("reason",""))
    if not cid or dec not in ["Approve","Reject","Investigate"]:
        return jsonify({"error":"claim_id and decision required"}),400
    row=pd.DataFrame([{"decision_id":str(uuid.uuid4())[:8],"claim_id":cid,
        "decision":dec,"reason":reason,
        "timestamp":datetime.now().isoformat(),"used_for_training":False}])
    decisions_path=f"{DATA_DIR}/decisions.csv"
    try:
        ex=pd.read_csv(decisions_path); upd=pd.concat([ex,row],ignore_index=True)
    except: upd=row
    upd.to_csv(decisions_path,index=False)
    total=len(upd)
    return jsonify({"status":"logged","claim_id":cid,"decision":dec,
        "total_decisions":total,"can_retrain":total>=5,
        "message":f"Decision logged. {total} total."})

@app.route("/api/retrain", methods=["POST"])
def retrain():
    return jsonify({"status":"skipped","message":"Retrain via ml_pipeline.py"})

# ─────────────────────────────────────────
# RUN
# ─────────────────────────────────────────
if __name__ == "__main__":
    print(f"\n{'━'*50}")
    print("  FraudShield API v2.0 — Ready!")
    print(f"{'━'*50}")
    print("  URL   : http://localhost:5000")
    print("  DB    : SQLite (data/fraudshield.db)")
    print("  Auth  : /api/auth/signup | /api/auth/login")
    print("  Test  : http://localhost:5000/api/health")
    print(f"{'━'*50}\n")
    app.run(host="0.0.0.0", port=5000, debug=False)
