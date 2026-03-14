import { useState, useEffect, useCallback } from "react";

const API = "http://localhost:5000/api/auth";

async function authApi(path, body) {
    try {
        const r = await fetch(`${API}${path}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
        const d = await r.json();
        return { ok: r.ok, status: r.status, data: d };
    } catch (e) {
        return { ok: false, status: 0, data: { error: "Cannot connect to server" } };
    }
}

/* ═══════════════════════════════════════
   CSS
═══════════════════════════════════════ */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#070b14;--surf:#0d1423;--card:#111827;
  --b1:#1e2d45;--b2:#243350;
  --txt:#e2e8f0;--mut:#64748b;--acc:#06b6d4;
}
body{background:var(--bg);color:var(--txt);font-family:'Syne',sans-serif}

/* animated grid background */
.auth-bg{
  min-height:100vh;display:flex;align-items:center;justify-content:center;
  position:relative;overflow:hidden;padding:20px;
}
.auth-bg::before{
  content:'';position:fixed;inset:0;
  background-image:
    linear-gradient(rgba(6,182,212,.04) 1px,transparent 1px),
    linear-gradient(90deg,rgba(6,182,212,.04) 1px,transparent 1px);
  background-size:40px 40px;
  animation:bgMove 20s linear infinite;
}
@keyframes bgMove{from{background-position:0 0}to{background-position:40px 40px}}

/* glow orbs */
.orb{position:fixed;border-radius:50%;filter:blur(80px);pointer-events:none;opacity:.15}
.orb1{width:400px;height:400px;background:#06b6d4;top:-100px;left:-100px;animation:orbFloat 8s ease-in-out infinite}
.orb2{width:300px;height:300px;background:#ef4444;bottom:-80px;right:-80px;animation:orbFloat 10s ease-in-out infinite reverse}
@keyframes orbFloat{0%,100%{transform:translate(0,0)}50%{transform:translate(30px,20px)}}

/* card */
.auth-card{
  background:rgba(17,24,39,.95);backdrop-filter:blur(20px);
  border:1px solid var(--b2);border-radius:20px;
  padding:36px;width:100%;max-width:420px;
  position:relative;z-index:1;
  animation:cardIn .4s ease;
}
@keyframes cardIn{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}

/* logo */
.auth-logo{display:flex;align-items:center;gap:12px;margin-bottom:28px;justify-content:center}
.auth-logo-icon{width:44px;height:44px;border-radius:12px;
  background:linear-gradient(135deg,#06b6d4,#0ea5e9);
  display:flex;align-items:center;justify-content:center;font-size:20px}
.auth-logo-text{font-size:22px;font-weight:800;color:#f1f5f9}
.auth-logo-sub{font-size:10px;color:var(--mut);
  font-family:'JetBrains Mono',monospace;letter-spacing:1.5px;text-transform:uppercase}

/* screen title */
.auth-title{font-size:20px;font-weight:800;color:#f1f5f9;margin-bottom:4px;text-align:center}
.auth-sub{font-size:12px;color:var(--mut);text-align:center;margin-bottom:24px;line-height:1.5}

/* form */
.auth-field{margin-bottom:14px}
.auth-label{display:block;font-size:10px;color:var(--mut);
  text-transform:uppercase;letter-spacing:1px;margin-bottom:5px;
  font-family:'JetBrains Mono',monospace}
.auth-input-wrap{position:relative}
.auth-input{
  width:100%;background:var(--surf);border:1px solid var(--b1);
  border-radius:9px;padding:11px 40px 11px 14px;
  color:var(--txt);font-size:13px;font-family:'Syne',sans-serif;
  outline:none;transition:border-color .2s,box-shadow .2s;
}
.auth-input:focus{border-color:var(--acc);box-shadow:0 0 0 3px rgba(6,182,212,.1)}
.auth-input.error{border-color:#ef4444;box-shadow:0 0 0 3px rgba(239,68,68,.1)}
.auth-input.success{border-color:#22c55e}
.eye-btn{position:absolute;right:12px;top:50%;transform:translateY(-50%);
  background:none;border:none;color:var(--mut);cursor:pointer;font-size:14px;
  padding:2px;transition:color .15s}
.eye-btn:hover{color:var(--txt)}

/* strength meter */
.strength-wrap{margin-top:6px}
.strength-bar{display:flex;gap:3px;margin-bottom:4px}
.strength-seg{flex:1;height:3px;border-radius:2px;transition:background .3s}
.strength-label{font-size:10px;font-family:'JetBrains Mono',monospace}

/* select */
.auth-select{
  width:100%;background:var(--surf);border:1px solid var(--b1);
  border-radius:9px;padding:11px 14px;color:var(--txt);
  font-size:13px;font-family:'Syne',sans-serif;
  outline:none;transition:border-color .2s;appearance:none;cursor:pointer;
}
.auth-select:focus{border-color:var(--acc)}

/* lockout banner */
.lockout{background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);
  border-radius:10px;padding:14px;margin-bottom:16px;text-align:center}
.lockout-icon{font-size:28px;margin-bottom:6px}
.lockout-title{font-size:14px;font-weight:700;color:#ef4444;margin-bottom:4px}
.lockout-timer{font-size:24px;font-weight:800;color:#f87171;
  font-family:'JetBrains Mono',monospace;margin:8px 0}
.lockout-sub{font-size:11px;color:#94a3b8}

/* attempts warning */
.attempts-warn{
  background:rgba(234,179,8,.1);border:1px solid rgba(234,179,8,.25);
  border-radius:8px;padding:10px 12px;margin-bottom:12px;
  display:flex;align-items:center;gap:8px;font-size:12px;color:#fbbf24;
}
.dots{display:flex;gap:4px;margin-left:auto}
.dot{width:8px;height:8px;border-radius:50%}

/* submit button */
.auth-btn{
  width:100%;background:linear-gradient(135deg,#06b6d4,#0ea5e9);
  border:none;color:#fff;padding:12px;border-radius:9px;
  font-size:14px;font-weight:700;cursor:pointer;
  font-family:'Syne',sans-serif;letter-spacing:.3px;
  transition:opacity .15s,transform .1s;margin-top:4px;
  display:flex;align-items:center;justify-content:center;gap:8px;
}
.auth-btn:hover:not(:disabled){opacity:.88}
.auth-btn:active:not(:disabled){transform:scale(.99)}
.auth-btn:disabled{opacity:.45;cursor:not-allowed}

/* error / success message */
.msg{border-radius:8px;padding:10px 12px;margin-bottom:12px;
  font-size:12px;display:flex;align-items:flex-start;gap:8px;line-height:1.5}
.msg.err{background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.25);color:#fca5a5}
.msg.ok{background:rgba(34,197,94,.1);border:1px solid rgba(34,197,94,.25);color:#86efac}
.msg.info{background:rgba(6,182,212,.1);border:1px solid rgba(6,182,212,.25);color:#67e8f9}

/* links */
.auth-link{color:var(--acc);cursor:pointer;font-size:12px;
  text-decoration:none;transition:opacity .15s;background:none;border:none;padding:0}
.auth-link:hover{opacity:.75;text-decoration:underline}
.auth-footer{text-align:center;margin-top:18px;color:var(--mut);font-size:12px;
  display:flex;align-items:center;justify-content:center;gap:6px}

/* divider */
.divider{display:flex;align-items:center;gap:12px;margin:18px 0}
.divider-line{flex:1;height:1px;background:var(--b1)}
.divider-txt{font-size:11px;color:var(--mut);font-family:'JetBrains Mono',monospace}

/* success screen */
.success-screen{text-align:center;padding:16px 0}
.success-icon{font-size:52px;margin-bottom:16px;animation:popIn .4s ease}
@keyframes popIn{from{transform:scale(0)}to{transform:scale(1)}}
.success-title{font-size:20px;font-weight:800;color:#f1f5f9;margin-bottom:8px}
.success-sub{font-size:13px;color:var(--mut);line-height:1.6;margin-bottom:20px}

/* spinner */
@keyframes spin{to{transform:rotate(360deg)}}
.spinner{width:16px;height:16px;border:2px solid rgba(255,255,255,.3);
  border-top-color:#fff;border-radius:50%;animation:spin .7s linear infinite}

/* user info bar (shown after login) */
.user-bar{
  display:flex;align-items:center;gap:8px;
  background:var(--surf);border:1px solid var(--b1);
  border-radius:8px;padding:8px 12px;font-size:12px;
}
.user-avatar{width:28px;height:28px;border-radius:50%;
  background:linear-gradient(135deg,#06b6d4,#0ea5e9);
  display:flex;align-items:center;justify-content:center;
  font-size:13px;font-weight:700;color:#fff;flex-shrink:0}
`;

/* ═══════════════════════════════════════
   PASSWORD STRENGTH
═══════════════════════════════════════ */
function getStrength(pw) {
    if (!pw) return { score: 0, label: "", color: "" };
    let score = 0;
    if (pw.length >= 6) score++;
    if (pw.length >= 10) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    const levels = [
        { label: "", color: "var(--b1)" },
        { label: "Weak", color: "#ef4444" },
        { label: "Fair", color: "#f97316" },
        { label: "Good", color: "#eab308" },
        { label: "Strong", color: "#22c55e" },
        { label: "Very Strong", color: "#06b6d4" },
    ];
    return { score, ...levels[Math.min(score, 5)] };
}

function StrengthMeter({ password }) {
    const { score, label, color } = getStrength(password);
    if (!password) return null;
    return (
        <div className="strength-wrap">
            <div className="strength-bar">
                {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="strength-seg"
                        style={{ background: i <= score ? color : "var(--b1)" }} />
                ))}
            </div>
            <div className="strength-label" style={{ color }}>{label}</div>
        </div>
    );
}

/* ═══════════════════════════════════════
   LOCKOUT TIMER
═══════════════════════════════════════ */
function LockoutBanner({ lockedUntil, onUnlock }) {
    const [remaining, setRemaining] = useState(0);

    useEffect(() => {
        const calc = () => {
            const diff = Math.max(0, new Date(lockedUntil) - new Date());
            setRemaining(diff);
            if (diff === 0 && onUnlock) onUnlock();
        };
        calc();
        const t = setInterval(calc, 1000);
        return () => clearInterval(t);
    }, [lockedUntil, onUnlock]);

    const mins = Math.floor(remaining / 60000);
    const secs = Math.floor((remaining % 60000) / 1000);

    return (
        <div className="lockout">
            <div className="lockout-icon">🔒</div>
            <div className="lockout-title">Account Temporarily Locked</div>
            <div className="lockout-timer">
                {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
            </div>
            <div className="lockout-sub">
                Too many failed attempts. Please wait before trying again.
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════
   MAIN LOGIN PAGE
═══════════════════════════════════════ */
export default function LoginPage({ onLogin }) {
    const [screen, setScreen] = useState("signin"); // signin|signup|forgot|reset|success
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);     // {type, text}
    const [showPass, setShowPass] = useState(false);
    const [showPass2, setShowPass2] = useState(false);
    const [lockedUntil, setLockedUntil] = useState(null);
    const [attemptsLeft, setAttemptsLeft] = useState(null);
    const [resetToken, setResetToken] = useState("");

    // Check URL for reset token
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const t = params.get("reset_token") || params.get("token");
        if (t) { setResetToken(t); setScreen("reset"); }
    }, []);

    // Forms
    const [signIn, setSignIn] = useState({ email: "", password: "" });
    const [signUp, setSignUp] = useState({
        username: "", email: "", password: "", confirm: "", role: "Investigator"
    });
    const [forgot, setForgot] = useState({ email: "" });
    const [resetForm, setResetForm] = useState({ password: "", confirm: "" });

    const setMsg = (type, text) => setMessage({ type, text });
    const clearMsg = () => setMessage(null);

    const switchScreen = (s) => {
        setScreen(s); clearMsg();
        setAttemptsLeft(null);
    };

    /* ── SIGN IN ── */
    const handleSignIn = async () => {
        clearMsg();
        if (!signIn.email || !signIn.password) {
            return setMsg("err", "Please enter email and password");
        }
        setLoading(true);
        const { ok, status, data } = await authApi("/login", signIn);
        setLoading(false);

        if (ok) {
            localStorage.setItem("fs_token", data.token);
            localStorage.setItem("fs_user", JSON.stringify(data.user));
            setMsg("ok", data.message);
            setTimeout(() => onLogin(data.user), 800);
        } else if (status === 429) {
            if (data.locked) {
                setLockedUntil(data.locked_until);
                setAttemptsLeft(null);
            }
            setMsg("err", data.error);
        } else if (status === 401) {
            setAttemptsLeft(data.attempts_left);
            setMsg("err", data.error);
        } else {
            setMsg("err", data.error || "Login failed");
        }
    };

    /* ── SIGN UP ── */
    const handleSignUp = async () => {
        clearMsg();
        if (!signUp.username || !signUp.email || !signUp.password) {
            return setMsg("err", "All fields are required");
        }
        if (signUp.password !== signUp.confirm) {
            return setMsg("err", "Passwords do not match");
        }
        if (getStrength(signUp.password).score < 2) {
            return setMsg("err", "Please use a stronger password");
        }
        setLoading(true);
        const { ok, data } = await authApi("/signup", {
            username: signUp.username,
            email: signUp.email,
            password: signUp.password,
            role: signUp.role,
        });
        setLoading(false);

        if (ok) {
            localStorage.setItem("fs_token", data.token);
            localStorage.setItem("fs_user", JSON.stringify(data.user));
            setMsg("ok", data.message);
            setTimeout(() => onLogin(data.user), 800);
        } else {
            setMsg("err", data.error || "Signup failed");
        }
    };

    /* ── FORGOT PASSWORD ── */
    const handleForgot = async () => {
        clearMsg();
        if (!forgot.email) return setMsg("err", "Enter your email address");
        setLoading(true);
        const { ok, data } = await authApi("/forgot-password", { email: forgot.email });
        setLoading(false);

        if (ok || data.status === "sent") {
            setScreen("forgotSent");
            setMsg("ok", data.message);
            // Demo: if token returned (email not configured), auto-fill
            if (data.demo_token) {
                setResetToken(data.demo_token);
                setTimeout(() => {
                    setMsg("info",
                        `📧 Email service not configured. Demo mode: token copied for you.`);
                }, 1500);
            }
        } else {
            setMsg("err", data.error || "Request failed");
        }
    };

    /* ── RESET PASSWORD ── */
    const handleReset = async () => {
        clearMsg();
        if (!resetForm.password) return setMsg("err", "Enter new password");
        if (resetForm.password !== resetForm.confirm) return setMsg("err", "Passwords do not match");
        if (getStrength(resetForm.password).score < 2) return setMsg("err", "Please use a stronger password");
        setLoading(true);
        const { ok, data } = await authApi("/reset-password", {
            token: resetToken,
            new_password: resetForm.password,
        });
        setLoading(false);

        if (ok) {
            setScreen("resetDone");
        } else {
            setMsg("err", data.error || "Reset failed");
        }
    };

    /* ═══════════════════════════════════════
       RENDER
    ═══════════════════════════════════════ */
    return (
        <>
            <style>{CSS}</style>
            <div className="auth-bg">
                <div className="orb orb1" />
                <div className="orb orb2" />

                <div className="auth-card">

                    {/* LOGO */}
                    <div className="auth-logo">
                        <div className="auth-logo-icon">🛡</div>
                        <div>
                            <div className="auth-logo-text">FraudShield</div>
                            <div className="auth-logo-sub">Healthcare Fraud Detection</div>
                        </div>
                    </div>

                    {/* MESSAGE */}
                    {message && (
                        <div className={`msg ${message.type}`}>
                            <span>{message.type === "err" ? "⚠" : message.type === "ok" ? "✓" : "ℹ"}</span>
                            <span>{message.text}</span>
                        </div>
                    )}

                    {/* ── SIGN IN ─────────────────────── */}
                    {screen === "signin" && (
                        <>
                            <div className="auth-title">Welcome Back</div>
                            <div className="auth-sub">Sign in to your FraudShield account</div>

                            {/* Lockout */}
                            {lockedUntil && (
                                <LockoutBanner
                                    lockedUntil={lockedUntil}
                                    onUnlock={() => { setLockedUntil(null); setAttemptsLeft(3) }}
                                />
                            )}

                            {/* Attempts warning */}
                            {attemptsLeft !== null && attemptsLeft > 0 && !lockedUntil && (
                                <div className="attempts-warn">
                                    <span>⚠</span>
                                    <span>{attemptsLeft} attempt{attemptsLeft !== 1 ? "s" : ""} remaining before lockout</span>
                                    <div className="dots">
                                        {[1, 2, 3].map(i => (
                                            <div key={i} className="dot"
                                                style={{ background: i <= attemptsLeft ? "#fbbf24" : "var(--b1)" }} />
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="auth-field">
                                <label className="auth-label">Email Address</label>
                                <div className="auth-input-wrap">
                                    <input className="auth-input" type="email" placeholder="you@example.com"
                                        value={signIn.email}
                                        onChange={e => setSignIn(p => ({ ...p, email: e.target.value }))}
                                        onKeyDown={e => e.key === "Enter" && handleSignIn()}
                                        disabled={!!lockedUntil} />
                                </div>
                            </div>

                            <div className="auth-field">
                                <label className="auth-label">Password</label>
                                <div className="auth-input-wrap">
                                    <input className="auth-input" type={showPass ? "text" : "password"}
                                        placeholder="Enter your password"
                                        value={signIn.password}
                                        onChange={e => setSignIn(p => ({ ...p, password: e.target.value }))}
                                        onKeyDown={e => e.key === "Enter" && handleSignIn()}
                                        disabled={!!lockedUntil} />
                                    <button className="eye-btn" type="button"
                                        onClick={() => setShowPass(p => !p)}>
                                        {showPass ? "🙈" : "👁"}
                                    </button>
                                </div>
                            </div>

                            <div style={{ textAlign: "right", marginBottom: 16 }}>
                                <button className="auth-link"
                                    onClick={() => switchScreen("forgot")}>
                                    Forgot password?
                                </button>
                            </div>

                            <button className="auth-btn" onClick={handleSignIn}
                                disabled={loading || !!lockedUntil}>
                                {loading ? <><div className="spinner" /> Signing in...</> : "Sign In →"}
                            </button>

                            <div className="auth-footer">
                                Don't have an account?
                                <button className="auth-link"
                                    onClick={() => switchScreen("signup")}>
                                    Create one
                                </button>
                            </div>
                        </>
                    )}

                    {/* ── SIGN UP ─────────────────────── */}
                    {screen === "signup" && (
                        <>
                            <div className="auth-title">Create Account</div>
                            <div className="auth-sub">Join FraudShield to start detecting fraud</div>

                            <div className="auth-field">
                                <label className="auth-label">Full Name</label>
                                <input className="auth-input" type="text" placeholder="Ajay Kumar"
                                    value={signUp.username}
                                    onChange={e => setSignUp(p => ({ ...p, username: e.target.value }))} />
                            </div>

                            <div className="auth-field">
                                <label className="auth-label">Email Address</label>
                                <input className="auth-input" type="email" placeholder="you@example.com"
                                    value={signUp.email}
                                    onChange={e => setSignUp(p => ({ ...p, email: e.target.value }))} />
                            </div>

                            <div className="auth-field">
                                <label className="auth-label">Role</label>
                                <select className="auth-select" value={signUp.role}
                                    onChange={e => setSignUp(p => ({ ...p, role: e.target.value }))}>
                                    <option>Investigator</option>
                                    <option>Manager</option>
                                    <option>Analyst</option>
                                    <option>Admin</option>
                                </select>
                            </div>

                            <div className="auth-field">
                                <label className="auth-label">Password</label>
                                <div className="auth-input-wrap">
                                    <input className="auth-input" type={showPass ? "text" : "password"}
                                        placeholder="Min 6 characters"
                                        value={signUp.password}
                                        onChange={e => setSignUp(p => ({ ...p, password: e.target.value }))} />
                                    <button className="eye-btn" type="button"
                                        onClick={() => setShowPass(p => !p)}>
                                        {showPass ? "🙈" : "👁"}
                                    </button>
                                </div>
                                <StrengthMeter password={signUp.password} />
                            </div>

                            <div className="auth-field">
                                <label className="auth-label">Confirm Password</label>
                                <div className="auth-input-wrap">
                                    <input
                                        className={`auth-input ${signUp.confirm && signUp.password !== signUp.confirm ? "error" :
                                                signUp.confirm && signUp.password === signUp.confirm ? "success" : ""
                                            }`}
                                        type={showPass2 ? "text" : "password"}
                                        placeholder="Re-enter password"
                                        value={signUp.confirm}
                                        onChange={e => setSignUp(p => ({ ...p, confirm: e.target.value }))} />
                                    <button className="eye-btn" type="button"
                                        onClick={() => setShowPass2(p => !p)}>
                                        {showPass2 ? "🙈" : "👁"}
                                    </button>
                                </div>
                                {signUp.confirm && signUp.password !== signUp.confirm && (
                                    <div style={{ fontSize: 11, color: "#ef4444", marginTop: 4 }}>
                                        Passwords do not match
                                    </div>
                                )}
                            </div>

                            <button className="auth-btn" onClick={handleSignUp} disabled={loading}>
                                {loading ? <><div className="spinner" /> Creating account...</> : "Create Account →"}
                            </button>

                            <div className="auth-footer">
                                Already have an account?
                                <button className="auth-link"
                                    onClick={() => switchScreen("signin")}>
                                    Sign in
                                </button>
                            </div>
                        </>
                    )}

                    {/* ── FORGOT PASSWORD ─────────────── */}
                    {screen === "forgot" && (
                        <>
                            <div className="auth-title">Reset Password</div>
                            <div className="auth-sub">
                                Enter your email and we'll send you a reset link
                            </div>

                            <div className="auth-field">
                                <label className="auth-label">Email Address</label>
                                <input className="auth-input" type="email"
                                    placeholder="you@example.com"
                                    value={forgot.email}
                                    onChange={e => setForgot({ email: e.target.value })}
                                    onKeyDown={e => e.key === "Enter" && handleForgot()} />
                            </div>

                            <button className="auth-btn" onClick={handleForgot} disabled={loading}>
                                {loading ? <><div className="spinner" /> Sending...</> : "📧 Send Reset Link"}
                            </button>

                            <div className="auth-footer">
                                <button className="auth-link"
                                    onClick={() => switchScreen("signin")}>
                                    ← Back to sign in
                                </button>
                            </div>
                        </>
                    )}

                    {/* ── FORGOT SENT ─────────────────── */}
                    {screen === "forgotSent" && (
                        <div className="success-screen">
                            <div className="success-icon">📬</div>
                            <div className="success-title">Check Your Email</div>
                            <div className="success-sub">
                                We sent a password reset link to<br />
                                <strong style={{ color: "var(--acc)" }}>{forgot.email}</strong><br />
                                The link expires in 30 minutes.
                            </div>
                            {resetToken && (
                                <div className="msg info" style={{ textAlign: "left", marginBottom: 16 }}>
                                    <span>ℹ</span>
                                    <span>
                                        <strong>Demo mode:</strong> Email not configured.<br />
                                        <button className="auth-link"
                                            onClick={() => setScreen("reset")}>
                                            Click here to reset directly →
                                        </button>
                                    </span>
                                </div>
                            )}
                            <button className="auth-btn" style={{ marginTop: 0 }}
                                onClick={() => switchScreen("signin")}>
                                ← Back to Sign In
                            </button>
                        </div>
                    )}

                    {/* ── RESET PASSWORD ──────────────── */}
                    {screen === "reset" && (
                        <>
                            <div className="auth-title">Set New Password</div>
                            <div className="auth-sub">
                                Choose a strong password for your account
                            </div>

                            <div className="auth-field">
                                <label className="auth-label">New Password</label>
                                <div className="auth-input-wrap">
                                    <input className="auth-input"
                                        type={showPass ? "text" : "password"}
                                        placeholder="Min 6 characters"
                                        value={resetForm.password}
                                        onChange={e => setResetForm(p => ({ ...p, password: e.target.value }))} />
                                    <button className="eye-btn" type="button"
                                        onClick={() => setShowPass(p => !p)}>
                                        {showPass ? "🙈" : "👁"}
                                    </button>
                                </div>
                                <StrengthMeter password={resetForm.password} />
                            </div>

                            <div className="auth-field">
                                <label className="auth-label">Confirm New Password</label>
                                <div className="auth-input-wrap">
                                    <input
                                        className={`auth-input ${resetForm.confirm && resetForm.password !== resetForm.confirm
                                                ? "error" : resetForm.confirm ? "success" : ""
                                            }`}
                                        type={showPass2 ? "text" : "password"}
                                        placeholder="Re-enter new password"
                                        value={resetForm.confirm}
                                        onChange={e => setResetForm(p => ({ ...p, confirm: e.target.value }))}
                                        onKeyDown={e => e.key === "Enter" && handleReset()} />
                                    <button className="eye-btn" type="button"
                                        onClick={() => setShowPass2(p => !p)}>
                                        {showPass2 ? "🙈" : "👁"}
                                    </button>
                                </div>
                            </div>

                            <button className="auth-btn" onClick={handleReset} disabled={loading}>
                                {loading ? <><div className="spinner" /> Resetting...</> : "🔐 Reset Password"}
                            </button>

                            <div className="auth-footer">
                                <button className="auth-link"
                                    onClick={() => switchScreen("signin")}>
                                    ← Back to sign in
                                </button>
                            </div>
                        </>
                    )}

                    {/* ── RESET DONE ──────────────────── */}
                    {screen === "resetDone" && (
                        <div className="success-screen">
                            <div className="success-icon">✅</div>
                            <div className="success-title">Password Reset!</div>
                            <div className="success-sub">
                                Your password has been changed successfully.
                                You can now sign in with your new password.
                            </div>
                            <button className="auth-btn" style={{ marginTop: 0 }}
                                onClick={() => switchScreen("signin")}>
                                Sign In Now →
                            </button>
                        </div>
                    )}

                </div>
            </div>
        </>
    );
}
