import React, { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "./supabaseClient.js";
import {
  Home, ShoppingCart, UtensilsCrossed, Car, ShoppingBag, HeartPulse, Baby,
  Briefcase, Gamepad2, BookOpen, Landmark, User, Package, Plus, Search,
  Settings, X, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Minus,
  PieChart as PieChartIcon, BarChart3, CalendarDays, Wallet, Coins, Check,
  Eye, EyeOff, LogOut, Mail
} from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar,
  XAxis, YAxis, CartesianGrid
} from "recharts";

/* ---------------------------------------------------------------- */
/* Design tokens                                                     */
/* ---------------------------------------------------------------- */
const T = {
  ink: "#1B2A26", inkSoft: "#4B5A54", paper: "#E9EBDF", card: "#F8F6EC",
  cardAlt: "#F1EEDF", brass: "#C99A3C", brassDark: "#8F6A22", teal: "#2F6F62",
  tealDark: "#1F4E44", rust: "#B8503F", moss: "#3F7D5C", line: "#D9D2BC",
  lineSoft: "#E3DEC9",
};

const CATS = [
  { id: "housing", name: "Housing & Utilities", icon: Home, color: "#2F6F62", desc: "Rent, mortgage, electricity, water, internet" },
  { id: "groceries", name: "Groceries", icon: ShoppingCart, color: "#3F7D5C", desc: "Supermarket, wet market, food ingredients, household consumables" },
  { id: "dining", name: "Fine Dining", icon: UtensilsCrossed, color: "#B8503F", desc: "Restaurants, cafes, fast food, food delivery" },
  { id: "transport", name: "Transportation", icon: Car, color: "#5B7C99", desc: "Fuel, fare, tolls, ride-hailing, parking" },
  { id: "shopping", name: "Shopping", icon: ShoppingBag, color: "#8E5572", desc: "Clothes, gadgets, electronics, non-essential purchases" },
  { id: "health", name: "Health & Wellness", icon: HeartPulse, color: "#A8455A", desc: "Doctor visits, medicine, gym, personal care" },
  { id: "family", name: "Family & Kids", icon: Baby, color: "#C99A3C", desc: "Toys, diapers, children's activities, school-related purchases" },
  { id: "work", name: "Work & Business", icon: Briefcase, color: "#6E7F80", desc: "Office supplies, business trips, tools, subscriptions" },
  { id: "entertainment", name: "Entertainment", icon: Gamepad2, color: "#6B5B95", desc: "Movies, games, streaming, hobbies, events" },
  { id: "education", name: "Education", icon: BookOpen, color: "#4A6FA5", desc: "Tuition, books, courses, school supplies" },
  { id: "financial", name: "Financial", icon: Landmark, color: "#9C6644", desc: "Loans, credit card payments, insurance, bank fees, investments" },
  { id: "personal", name: "Personal", icon: User, color: "#B08968", desc: "Personal care, grooming, small indulgences" },
  { id: "misc", name: "Miscellaneous", icon: Package, color: "#7C9070", desc: "Anything that doesn't fit elsewhere" },
];
const catById = Object.fromEntries(CATS.map((c) => [c.id, c]));

/* ---------------------------------------------------------------- */
/* Helpers                                                            */
/* ---------------------------------------------------------------- */
const peso = (n) => "\u20B1" + (Number(n) || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pesoShort = (n) => "\u20B1" + Math.round(Number(n) || 0).toLocaleString("en-PH");
const todayISO = () => new Date().toISOString().slice(0, 10);
const monthKey = (iso) => iso.slice(0, 7);
const fmtDayLabel = (iso) => new Date(iso + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric" });
const fmtMonthLabel = (mk) => { const [y, m] = mk.split("-").map(Number); return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" }); };

/* ================================================================== */
/*  ROOT: session gate                                                 */
/* ================================================================== */
export default function App() {
  const [session, setSession] = useState(undefined); // undefined = loading, null = logged out
  const [authView, setAuthView] = useState("login"); // login | signup | forgot | checkEmail | resetPassword
  const [recoveryMode, setRecoveryMode] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((event, sess) => {
      if (event === "PASSWORD_RECOVERY") {
        setRecoveryMode(true);
        setAuthView("resetPassword");
      }
      setSession(sess);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (session === undefined) {
    return <div style={{ ...styles.pageBg, alignItems: "center" }}><style>{css}</style><span style={{ color: T.inkSoft, fontSize: 13 }}>Loading...</span></div>;
  }

  if (!session || recoveryMode) {
    return (
      <div style={styles.pageBg}>
        <style>{css}</style>
        <div style={styles.phone}>
          <div style={{ ...styles.phoneScreen, justifyContent: "center", padding: "0 22px" }}>
            {authView === "login" && <LoginScreen onSwitch={setAuthView} />}
            {authView === "signup" && <SignupScreen onSwitch={setAuthView} />}
            {authView === "forgot" && <ForgotPasswordScreen onSwitch={setAuthView} />}
            {authView === "checkEmail" && <CheckEmailScreen onSwitch={setAuthView} />}
            {authView === "resetPassword" && (
              <ResetPasswordScreen
                onDone={() => { setRecoveryMode(false); setAuthView("login"); }}
              />
            )}
          </div>
        </div>
      </div>
    );
  }

  return <MainApp session={session} />;
}

/* ================================================================== */
/*  AUTH SCREENS                                                       */
/* ================================================================== */
function AuthShell({ children }) {
  return (
    <div style={{ width: "100%" }}>
      <div style={{ textAlign: "center", marginBottom: 26 }}>
        <div style={styles.brandTitle}>Family Ledger</div>
        <div style={styles.brandSub}>Track your family's everyday spending</div>
      </div>
      {children}
    </div>
  );
}

function PasswordField({ value, onChange, placeholder, autoComplete }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <input
        style={{ ...styles.textInput, paddingRight: 40 }}
        type={show ? "text" : "password"}
        placeholder={placeholder || "Password"}
        value={value}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
      />
      <button type="button" aria-label={show ? "Hide password" : "Show password"} onClick={() => setShow((s) => !s)} style={styles.eyeBtn}>
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}

function LoginScreen({ onSwitch }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const loginGoogle = async () => {
    setError("");
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google" });
    if (error) setError(error.message);
  };

  const login = async () => {
    if (!email || !password) { setError("Enter your email and password."); return; }
    setLoading(true); setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setError(error.message);
  };

  return (
    <AuthShell>
      <button style={styles.googleBtn} onClick={loginGoogle}>
        <GoogleG /> Continue with Google
      </button>
      <div style={styles.dividerRow}><span style={styles.dividerLine} /><span style={styles.dividerText}>or</span><span style={styles.dividerLine} /></div>

      <label style={styles.fieldLabel}>Email</label>
      <input style={styles.textInput} type="email" placeholder="name@email.com" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />

      <label style={styles.fieldLabel}>Password</label>
      <PasswordField value={password} onChange={setPassword} autoComplete="current-password" />

      <div style={{ textAlign: "right", marginTop: 8 }}>
        <button style={styles.linkBtn} onClick={() => onSwitch("forgot")}>Forgot password?</button>
      </div>

      {error && <div style={styles.errorText}>{error}</div>}

      <button style={styles.saveBtn} onClick={login} disabled={loading}>{loading ? "Logging in..." : "Log in"}</button>

      <div style={styles.switchRow}>
        Don't have an account? <button style={styles.linkBtn} onClick={() => onSwitch("signup")}>Create account</button>
      </div>
    </AuthShell>
  );
}

function SignupScreen({ onSwitch }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const signup = async () => {
    if (!fullName || !email || !password) { setError("Fill in all required fields."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }
    setLoading(true); setError("");
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: fullName } },
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
    onSwitch("checkEmail");
  };

  return (
    <AuthShell>
      <div style={styles.modalTitleCenter}>Create account</div>

      <label style={styles.fieldLabel}>Full name</label>
      <input style={styles.textInput} placeholder="Juan Dela Cruz" value={fullName} onChange={(e) => setFullName(e.target.value)} />

      <label style={styles.fieldLabel}>Email</label>
      <input style={styles.textInput} type="email" placeholder="name@email.com" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />

      <label style={styles.fieldLabel}>Password</label>
      <PasswordField value={password} onChange={setPassword} autoComplete="new-password" />

      <label style={styles.fieldLabel}>Confirm password</label>
      <PasswordField value={confirm} onChange={setConfirm} placeholder="Re-enter password" autoComplete="new-password" />

      {error && <div style={styles.errorText}>{error}</div>}

      <button style={styles.saveBtn} onClick={signup} disabled={loading}>{loading ? "Creating account..." : "Create account"}</button>

      <div style={styles.switchRow}>
        Already have an account? <button style={styles.linkBtn} onClick={() => onSwitch("login")}>Log in</button>
      </div>
    </AuthShell>
  );
}

function ForgotPasswordScreen({ onSwitch }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const send = async () => {
    if (!email) { setError("Enter your email."); return; }
    setLoading(true); setError("");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setSent(true);
  };

  return (
    <AuthShell>
      <div style={styles.modalTitleCenter}>Reset password</div>
      {sent ? (
        <div style={{ textAlign: "center" }}>
          <Mail size={28} color={T.teal} style={{ margin: "8px auto 12px" }} />
          <div style={styles.infoText}>If an account exists for <b>{email}</b>, a password reset link is on its way.</div>
        </div>
      ) : (
        <>
          <div style={styles.infoText}>Enter the email on your account and we'll send a reset link.</div>
          <label style={styles.fieldLabel}>Email</label>
          <input style={styles.textInput} type="email" placeholder="name@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          {error && <div style={styles.errorText}>{error}</div>}
          <button style={styles.saveBtn} onClick={send} disabled={loading}>{loading ? "Sending..." : "Send reset link"}</button>
        </>
      )}
      <div style={styles.switchRow}>
        <button style={styles.linkBtn} onClick={() => onSwitch("login")}>Back to log in</button>
      </div>
    </AuthShell>
  );
}

function CheckEmailScreen({ onSwitch }) {
  return (
    <AuthShell>
      <div style={{ textAlign: "center" }}>
        <Mail size={30} color={T.teal} style={{ margin: "8px auto 14px" }} />
        <div style={styles.modalTitleCenter}>Verify your email</div>
        <div style={styles.infoText}>We sent a confirmation link to your inbox. Open it to activate your account, then log in.</div>
        <button style={{ ...styles.saveBtn, marginTop: 22 }} onClick={() => onSwitch("login")}>Go to log in</button>
      </div>
    </AuthShell>
  );
}

function ResetPasswordScreen({ onDone }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const update = async () => {
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }
    setLoading(true); setError("");
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) { setError(error.message); return; }
    onDone();
  };

  return (
    <AuthShell>
      <div style={styles.modalTitleCenter}>Set a new password</div>
      <label style={styles.fieldLabel}>New password</label>
      <PasswordField value={password} onChange={setPassword} autoComplete="new-password" />
      <label style={styles.fieldLabel}>Confirm new password</label>
      <PasswordField value={confirm} onChange={setConfirm} autoComplete="new-password" />
      {error && <div style={styles.errorText}>{error}</div>}
      <button style={styles.saveBtn} onClick={update} disabled={loading}>{loading ? "Saving..." : "Save new password"}</button>
    </AuthShell>
  );
}

function GoogleG() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" style={{ marginRight: 8 }}>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4c-7.4 0-13.8 4.2-17 10.3z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.3 35.4 26.8 36 24 36c-5.2 0-9.6-3.1-11.3-7.6l-6.5 5C9.9 39.6 16.4 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-0.8 2.3-2.3 4.3-4.1 5.5l6.3 5.3C40.9 36.3 44 30.9 44 24c0-1.3-.1-2.7-.4-3.5z" />
    </svg>
  );
}

/* ================================================================== */
/*  MAIN APP (post-login)                                              */
/* ================================================================== */
function MainApp({ session }) {
  const user = session.user;
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState({ full_name: "", email: user.email });
  const [expenses, setExpenses] = useState([]);
  const [budget, setBudget] = useState(50000);
  const [savingsGoal, setSavingsGoal] = useState(5000);
  const [screen, setScreen] = useState("dashboard");
  const [showAdd, setShowAdd] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ data: profileRow }, { data: settingsRow }, { data: expenseRows }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("user_settings").select("*").eq("user_id", user.id).single(),
        supabase.from("expenses").select("*").eq("user_id", user.id).order("date", { ascending: false }),
      ]);
      if (cancelled) return;
      if (profileRow) setProfile(profileRow);
      if (settingsRow) { setBudget(Number(settingsRow.monthly_budget)); setSavingsGoal(Number(settingsRow.savings_goal)); }
      if (expenseRows) setExpenses(expenseRows);
      setReady(true);
    })();
    return () => { cancelled = true; };
  }, [user.id]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 1800);
    return () => clearTimeout(t);
  }, [toast]);

  const addExpense = async (exp) => {
    const { data, error } = await supabase.from("expenses").insert({ ...exp, user_id: user.id }).select().single();
    if (!error && data) {
      setExpenses((prev) => [data, ...prev]);
      setShowAdd(false);
      setToast("Expense saved");
    }
  };

  const deleteExpense = async (id) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    await supabase.from("expenses").delete().eq("id", id).eq("user_id", user.id);
  };

  const saveSettings = async (nb, ns) => {
    setBudget(nb); setSavingsGoal(ns);
    await supabase.from("user_settings").upsert({ user_id: user.id, monthly_budget: nb, savings_goal: ns });
  };

  const logout = async () => { await supabase.auth.signOut(); };

  const thisMonth = monthKey(todayISO());
  const monthExpenses = useMemo(() => expenses.filter((e) => monthKey(e.date) === thisMonth), [expenses, thisMonth]);
  const todayExpenses = useMemo(() => expenses.filter((e) => e.date === todayISO()), [expenses]);
  const totalMonth = monthExpenses.reduce((s, e) => s + Number(e.amount), 0);
  const totalToday = todayExpenses.reduce((s, e) => s + Number(e.amount), 0);
  const remaining = budget - totalMonth;

  if (!ready) {
    return <div style={{ ...styles.pageBg, alignItems: "center" }}><style>{css}</style><span style={{ color: T.inkSoft, fontSize: 13 }}>Loading your ledger...</span></div>;
  }

  return (
    <div style={styles.pageBg}>
      <style>{css}</style>
      <div style={styles.phone}>
        <div style={styles.phoneScreen}>
          <ScreenHeader screen={screen} onSettings={() => setScreen("settings")} onBack={() => setScreen("dashboard")} />
          <div style={styles.content}>
            {screen === "dashboard" && (
              <Dashboard totalMonth={totalMonth} totalToday={totalToday} remaining={remaining} budget={budget} savingsGoal={savingsGoal} monthExpenses={monthExpenses} onDrill={(catId) => setScreen({ name: "history", cat: catId })} />
            )}
            {screen === "history" && <HistoryScreen expenses={expenses} onDelete={deleteExpense} initialCat={null} />}
            {typeof screen === "object" && screen.name === "history" && (
              <HistoryScreen expenses={expenses} onDelete={deleteExpense} initialCat={screen.cat} />
            )}
            {screen === "reports" && <ReportsScreen expenses={expenses} />}
            {screen === "settings" && (
              <SettingsScreen profile={profile} budget={budget} savingsGoal={savingsGoal} onSave={saveSettings} onLogout={logout} />
            )}
          </div>
          <BottomNav active={typeof screen === "object" ? screen.name : screen} onNav={setScreen} onAdd={() => setShowAdd(true)} />
          {showAdd && <AddExpenseModal onClose={() => setShowAdd(false)} onSave={addExpense} />}
          {toast && <div style={styles.toast}><Check size={14} style={{ marginRight: 6 }} />{toast}</div>}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
function ScreenHeader({ screen, onSettings, onBack }) {
  const isObj = typeof screen === "object";
  const name = isObj ? screen.name : screen;
  const titles = { dashboard: "Family Ledger", history: "Expense history", reports: "Reports", settings: "Account & settings" };
  return (
    <div style={styles.header}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {name !== "dashboard" && <button aria-label="Back" onClick={onBack} style={styles.iconBtn}><ChevronLeft size={19} /></button>}
        <div>
          <div style={styles.headerEyebrow}>{name === "dashboard" ? todayLongDate() : ""}</div>
          <div style={styles.headerTitle}>{titles[name]}</div>
        </div>
      </div>
      {name === "dashboard" && <button aria-label="Settings" onClick={onSettings} style={styles.iconBtn}><Settings size={19} /></button>}
    </div>
  );
}
function todayLongDate() { return new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }); }

function CoinMeter({ pct, danger }) {
  const total = 20;
  const filled = Math.max(0, Math.min(total, Math.round((pct / 100) * total)));
  const coins = [];
  for (let i = 0; i < total; i++) {
    coins.push(<span key={i} style={{ ...styles.coin, background: i < filled ? (danger ? T.rust : T.brass) : "transparent", borderColor: i < filled ? (danger ? T.rust : T.brassDark) : T.line }} />);
  }
  return <div style={styles.coinRow}>{coins}</div>;
}

function Dashboard({ monthExpenses, totalMonth, totalToday, remaining, budget, savingsGoal, onDrill }) {
  const pct = budget > 0 ? Math.min(999, (totalMonth / budget) * 100) : 0;
  const over = totalMonth > budget;
  const catTotals = useMemo(() => {
    const map = {};
    monthExpenses.forEach((e) => { map[e.category] = (map[e.category] || 0) + Number(e.amount); });
    return Object.entries(map).map(([id, amount]) => ({ id, amount, ...catById[id] })).sort((a, b) => b.amount - a.amount);
  }, [monthExpenses]);
  const top3 = catTotals.slice(0, 3);
  const medals = ["\uD83E\uDD47", "\uD83E\uDD48", "\uD83E\uDD49"];

  return (
    <div>
      <div style={styles.cardGrid}>
        <SummaryCard label="Total spent" sub="This month" value={pesoShort(totalMonth)} accent={T.teal} icon={<Wallet size={16} />} />
        <SummaryCard label="Today's spending" value={pesoShort(totalToday)} accent={T.brassDark} icon={<Coins size={16} />} />
        <SummaryCard label="Remaining budget" value={pesoShort(remaining)} accent={remaining < 0 ? T.rust : T.moss} icon={<PieChartIcon size={16} />} />
        <SummaryCard label="Savings goal" value={pesoShort(savingsGoal)} accent={T.tealDark} icon={<TrendingUp size={16} />} />
      </div>

      <div style={styles.ledgerCard}>
        <div style={styles.ledgerRowTop}>
          <span style={styles.ledgerLabel}>Budget used</span>
          <span style={{ ...styles.ledgerPct, color: over ? T.rust : T.tealDark }}>{pct.toFixed(1)}%</span>
        </div>
        <CoinMeter pct={pct} danger={over} />
        <div style={styles.ledgerRowBottom}>
          <span>{pesoShort(totalMonth)} spent</span>
          <span>{pesoShort(Math.max(budget, totalMonth))} budget</span>
        </div>
      </div>

      <SectionTitle text="Top spending categories" />
      {top3.length === 0 && <EmptyNote text="No expenses recorded this month yet." />}
      <div style={styles.card}>
        {top3.map((c, i) => (
          <div key={c.id} style={{ ...styles.rankRow, borderBottom: i < top3.length - 1 ? `1px solid ${T.lineSoft}` : "none" }} onClick={() => onDrill(c.id)}>
            <span style={styles.medal}>{medals[i]}</span>
            <span style={{ ...styles.catDot, background: c.color }} />
            <span style={styles.rankName}>{c.name}</span>
            <span style={styles.rankAmount}>{peso(c.amount)}</span>
          </div>
        ))}
      </div>

      <SectionTitle text="All categories" />
      <div style={styles.card}>
        {CATS.map((c, i) => {
          const amt = catTotals.find((t) => t.id === c.id)?.amount || 0;
          const Icon = c.icon;
          return (
            <div key={c.id} style={{ ...styles.catRow, borderBottom: i < CATS.length - 1 ? `1px solid ${T.lineSoft}` : "none", opacity: amt === 0 ? 0.45 : 1 }} onClick={() => onDrill(c.id)}>
              <span style={{ ...styles.catIconWrap, background: c.color + "22", color: c.color }}><Icon size={15} /></span>
              <span style={styles.catRowName}>{c.name}</span>
              <span style={styles.catRowAmount}>{amt ? peso(amt) : "\u2014"}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SummaryCard({ label, sub, value, accent, icon }) {
  return (
    <div style={styles.summaryCard}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <span style={styles.summaryLabel}>{label}{sub ? <><br /><span style={{ color: T.inkSoft, opacity: 0.7 }}>{sub}</span></> : null}</span>
        <span style={{ color: accent }}>{icon}</span>
      </div>
      <div style={{ ...styles.summaryValue, color: accent }}>{value}</div>
    </div>
  );
}
function SectionTitle({ text }) { return <div style={styles.sectionTitle}>{text}</div>; }
function EmptyNote({ text }) { return <div style={styles.emptyNote}>{text}</div>; }

function AddExpenseModal({ onClose, onSave }) {
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("groceries");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(todayISO());
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const amountRef = useRef(null);

  useEffect(() => { amountRef.current && amountRef.current.focus(); }, []);

  const submit = async () => {
    const n = parseFloat(amount);
    if (!amount || isNaN(n) || n <= 0) { setError("Enter an amount greater than 0."); return; }
    if (!category) { setError("Choose a category."); return; }
    setSaving(true);
    await onSave({ amount: n, category, description: description.trim(), date: date || todayISO() });
    setSaving(false);
  };

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modalSheet} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalHandle} />
        <div style={styles.modalHeaderRow}>
          <div style={styles.modalTitle}>Add expense</div>
          <button aria-label="Close" onClick={onClose} style={styles.iconBtn}><X size={18} /></button>
        </div>

        <label style={styles.fieldLabel}>Amount <span style={styles.req}>required</span></label>
        <div style={styles.amountInputWrap}>
          <span style={styles.pesoSign}>{"\u20B1"}</span>
          <input ref={amountRef} style={styles.amountInput} inputMode="decimal" placeholder="0.00" value={amount} onChange={(e) => { setAmount(e.target.value.replace(/[^0-9.]/g, "")); setError(""); }} />
        </div>

        <label style={styles.fieldLabel}>Category <span style={styles.req}>required</span></label>
        <div style={styles.catGrid}>
          {CATS.map((c) => {
            const Icon = c.icon;
            const sel = category === c.id;
            return (
              <button key={c.id} onClick={() => { setCategory(c.id); setError(""); }} style={{ ...styles.catPick, borderColor: sel ? c.color : T.line, background: sel ? c.color + "1c" : T.card }}>
                <span style={{ ...styles.catPickIcon, color: c.color }}><Icon size={16} /></span>
                <span style={{ ...styles.catPickLabel, color: sel ? T.ink : T.inkSoft }}>{c.name}</span>
              </button>
            );
          })}
        </div>

        <label style={styles.fieldLabel}>Description <span style={styles.optional}>optional</span></label>
        <input style={styles.textInput} placeholder="What was this for?" value={description} onChange={(e) => setDescription(e.target.value)} />

        <label style={styles.fieldLabel}>Date <span style={styles.optional}>optional</span></label>
        <input type="date" style={styles.textInput} value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} />

        {error && <div style={styles.errorText}>{error}</div>}

        <button style={styles.saveBtn} onClick={submit} disabled={saving}>{saving ? "Saving..." : "Save expense"}</button>
      </div>
    </div>
  );
}

function HistoryScreen({ expenses, onDelete, initialCat }) {
  const [filter, setFilter] = useState("month");
  const [query, setQuery] = useState("");
  const [catFilter, setCatFilter] = useState(initialCat || null);
  const [custom, setCustom] = useState({ from: todayISO(), to: todayISO() });

  const filtered = useMemo(() => {
    const today = todayISO();
    const now = new Date();
    let list = expenses;
    if (filter === "today") list = list.filter((e) => e.date === today);
    else if (filter === "week") { const d = new Date(now); d.setDate(d.getDate() - 7); const cutoff = d.toISOString().slice(0, 10); list = list.filter((e) => e.date >= cutoff && e.date <= today); }
    else if (filter === "month") list = list.filter((e) => monthKey(e.date) === monthKey(today));
    else if (filter === "custom") list = list.filter((e) => e.date >= custom.from && e.date <= custom.to);
    if (catFilter) list = list.filter((e) => e.category === catFilter);
    if (query.trim()) { const q = query.trim().toLowerCase(); list = list.filter((e) => (e.description || "").toLowerCase().includes(q) || catById[e.category].name.toLowerCase().includes(q)); }
    return [...list].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  }, [expenses, filter, query, catFilter, custom]);

  const grouped = useMemo(() => {
    const map = {};
    filtered.forEach((e) => { (map[e.date] = map[e.date] || []).push(e); });
    return Object.entries(map).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [filtered]);

  const total = filtered.reduce((s, e) => s + Number(e.amount), 0);

  return (
    <div>
      <div style={styles.searchWrap}>
        <Search size={15} color={T.inkSoft} />
        <input style={styles.searchInput} placeholder="Search description or category" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      <div style={styles.filterRow}>
        {["today", "week", "month", "custom"].map((f) => (
          <button key={f} onClick={() => setFilter(f)} style={{ ...styles.filterChip, ...(filter === f ? styles.filterChipActive : {}) }}>
            {f === "today" ? "Today" : f === "week" ? "This week" : f === "month" ? "This month" : "Custom"}
          </button>
        ))}
      </div>

      {filter === "custom" && (
        <div style={styles.customRange}>
          <input type="date" style={styles.textInputSm} value={custom.from} onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))} />
          <span style={{ color: T.inkSoft, fontSize: 12 }}>to</span>
          <input type="date" style={styles.textInputSm} value={custom.to} onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))} />
        </div>
      )}

      {catFilter && (
        <div style={styles.activeCatFilter}>
          Filtered by <b>{catById[catFilter].name}</b>
          <button style={styles.clearChip} onClick={() => setCatFilter(null)}>Clear</button>
        </div>
      )}

      <div style={styles.totalStrip}><span>Total</span><span style={{ fontFamily: "var(--mono)", fontWeight: 600 }}>{peso(total)}</span></div>

      {grouped.length === 0 && <EmptyNote text="No expenses match this filter." />}

      {grouped.map(([date, items]) => (
        <div key={date} style={{ marginBottom: 14 }}>
          <div style={styles.dayHeader}>{fmtDayLabel(date)}</div>
          <div style={styles.card}>
            {items.map((e, i) => {
              const c = catById[e.category];
              const Icon = c.icon;
              return (
                <div key={e.id} style={{ ...styles.expenseRow, borderBottom: i < items.length - 1 ? `1px dashed ${T.lineSoft}` : "none" }}>
                  <span style={{ ...styles.catIconWrap, background: c.color + "22", color: c.color }}><Icon size={14} /></span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={styles.expenseCat}>{c.name}</div>
                    {e.description && <div style={styles.expenseDesc}>{e.description}</div>}
                  </div>
                  <span style={styles.expenseAmount}>{peso(e.amount)}</span>
                  <button aria-label="Delete" style={styles.deleteBtn} onClick={() => onDelete(e.id)}><X size={13} /></button>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function ReportsScreen({ expenses }) {
  const [tab, setTab] = useState("category");
  const tabs = [
    { id: "category", label: "By category", icon: PieChartIcon },
    { id: "calendar", label: "Daily", icon: CalendarDays },
    { id: "compare", label: "Compare", icon: BarChart3 },
    { id: "trend", label: "Trend", icon: TrendingUp },
  ];
  return (
    <div>
      <div style={styles.reportTabs}>
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return <button key={t.id} onClick={() => setTab(t.id)} style={{ ...styles.reportTab, ...(active ? styles.reportTabActive : {}) }}><Icon size={14} /><span>{t.label}</span></button>;
        })}
      </div>
      {tab === "category" && <CategoryReport expenses={expenses} />}
      {tab === "calendar" && <CalendarReport expenses={expenses} />}
      {tab === "compare" && <CompareReport expenses={expenses} />}
      {tab === "trend" && <TrendReport expenses={expenses} />}
    </div>
  );
}

function CategoryReport({ expenses }) {
  const [drill, setDrill] = useState(null);
  const mk = monthKey(todayISO());
  const monthExp = expenses.filter((e) => monthKey(e.date) === mk);
  const data = useMemo(() => {
    const map = {};
    monthExp.forEach((e) => { map[e.category] = (map[e.category] || 0) + Number(e.amount); });
    return Object.entries(map).map(([id, value]) => ({ id, name: catById[id].name, value, color: catById[id].color })).sort((a, b) => b.value - a.value);
  }, [expenses]);
  const total = data.reduce((s, d) => s + d.value, 0);
  if (data.length === 0) return <EmptyNote text="No expenses this month to chart yet." />;

  return (
    <div>
      <div style={styles.card}>
        <div style={{ height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2} onClick={(d) => setDrill(d.id === drill ? null : d.id)}>
                {data.map((d) => <Cell key={d.id} fill={d.color} stroke={T.card} strokeWidth={2} opacity={drill && drill !== d.id ? 0.35 : 1} />)}
              </Pie>
              <Tooltip formatter={(v) => peso(v)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div style={styles.legendWrap}>
          {data.map((d) => (
            <button key={d.id} onClick={() => setDrill(d.id === drill ? null : d.id)} style={{ ...styles.legendItem, opacity: drill && drill !== d.id ? 0.4 : 1 }}>
              <span style={{ ...styles.legendDot, background: d.color }} />
              <span style={styles.legendName}>{d.name}</span>
              <span style={styles.legendPct}>{((d.value / total) * 100).toFixed(0)}%</span>
            </button>
          ))}
        </div>
      </div>
      {drill && (
        <>
          <SectionTitle text={catById[drill].name + " \u2014 this month"} />
          <div style={styles.card}>
            {monthExp.filter((e) => e.category === drill).sort((a, b) => (a.date < b.date ? 1 : -1)).map((e, i, arr) => (
              <div key={e.id} style={{ ...styles.expenseRow, borderBottom: i < arr.length - 1 ? `1px dashed ${T.lineSoft}` : "none" }}>
                <div style={{ flex: 1 }}>
                  <div style={styles.expenseCat}>{e.description || catById[e.category].name}</div>
                  <div style={styles.expenseDesc}>{fmtDayLabel(e.date)}</div>
                </div>
                <span style={styles.expenseAmount}>{peso(e.amount)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function CalendarReport({ expenses }) {
  const [monthOffset, setMonthOffset] = useState(0);
  const base = new Date();
  base.setMonth(base.getMonth() + monthOffset);
  const year = base.getFullYear(), month = base.getMonth();
  const mk = `${year}-${String(month + 1).padStart(2, "0")}`;
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const totals = useMemo(() => {
    const map = {};
    expenses.filter((e) => monthKey(e.date) === mk).forEach((e) => { map[e.date] = (map[e.date] || 0) + Number(e.amount); });
    return map;
  }, [expenses, mk]);
  const max = Math.max(1, ...Object.values(totals));
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div style={styles.card}>
      <div style={styles.calNav}>
        <button style={styles.iconBtn} onClick={() => setMonthOffset((m) => m - 1)}><ChevronLeft size={16} /></button>
        <span style={styles.calMonthLabel}>{fmtMonthLabel(mk)}</span>
        <button style={styles.iconBtn} onClick={() => setMonthOffset((m) => m + 1)}><ChevronRight size={16} /></button>
      </div>
      <div style={styles.calGridHead}>{["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <span key={i}>{d}</span>)}</div>
      <div style={styles.calGrid}>
        {cells.map((d, i) => {
          if (d === null) return <div key={i} />;
          const iso = `${mk}-${String(d).padStart(2, "0")}`;
          const amt = totals[iso] || 0;
          const intensity = amt / max;
          return (
            <div key={i} style={{ ...styles.calCell, background: amt ? `rgba(201,154,60,${0.18 + intensity * 0.6})` : "transparent" }}>
              <span style={styles.calDayNum}>{d}</span>
              {amt > 0 && <span style={styles.calAmt}>{pesoShort(amt)}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CompareReport({ expenses }) {
  const now = new Date();
  const curMk = monthKey(todayISO());
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMk = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;
  const sumsFor = (mk) => { const map = {}; expenses.filter((e) => monthKey(e.date) === mk).forEach((e) => { map[e.category] = (map[e.category] || 0) + Number(e.amount); }); return map; };
  const cur = sumsFor(curMk), prev = sumsFor(prevMk);
  const catsWithData = CATS.filter((c) => cur[c.id] || prev[c.id]);
  const curTotal = Object.values(cur).reduce((s, v) => s + v, 0);
  const prevTotal = Object.values(prev).reduce((s, v) => s + v, 0);
  if (catsWithData.length === 0) return <EmptyNote text="Add expenses to see a month-to-month comparison." />;

  return (
    <div style={styles.card}>
      <div style={styles.compareHeadRow}>
        <span style={{ flex: 2 }}>Category</span>
        <span style={styles.compareCol}>{fmtMonthLabel(prevMk).split(" ")[0]}</span>
        <span style={styles.compareCol}>{fmtMonthLabel(curMk).split(" ")[0]}</span>
        <span style={styles.compareCol}>Change</span>
      </div>
      {catsWithData.map((c, i) => {
        const p = prev[c.id] || 0, n = cur[c.id] || 0, diff = n - p;
        return (
          <div key={c.id} style={{ ...styles.compareRow, borderBottom: i < catsWithData.length - 1 ? `1px solid ${T.lineSoft}` : "none" }}>
            <span style={{ flex: 2, display: "flex", alignItems: "center", gap: 6 }}><span style={{ ...styles.catDot, background: c.color }} />{c.name}</span>
            <span style={styles.compareCol}>{pesoShort(p)}</span>
            <span style={styles.compareCol}>{pesoShort(n)}</span>
            <span style={{ ...styles.compareCol, color: diff > 0 ? T.rust : diff < 0 ? T.moss : T.inkSoft, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 2 }}>
              {diff > 0 ? <TrendingUp size={12} /> : diff < 0 ? <TrendingDown size={12} /> : <Minus size={12} />}{pesoShort(Math.abs(diff))}
            </span>
          </div>
        );
      })}
      <div style={styles.compareTotalRow}>
        <span style={{ flex: 2 }}>Total</span>
        <span style={styles.compareCol}>{pesoShort(prevTotal)}</span>
        <span style={styles.compareCol}>{pesoShort(curTotal)}</span>
        <span style={{ ...styles.compareCol, color: curTotal - prevTotal > 0 ? T.rust : T.moss }}>{curTotal - prevTotal >= 0 ? "\u2191" : "\u2193"} {pesoShort(Math.abs(curTotal - prevTotal))}</span>
      </div>
    </div>
  );
}

function TrendReport({ expenses }) {
  const mk = monthKey(todayISO());
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const totals = {};
  expenses.filter((e) => monthKey(e.date) === mk).forEach((e) => { totals[e.date] = (totals[e.date] || 0) + Number(e.amount); });
  const data = [];
  for (let d = 1; d <= daysInMonth; d++) { const iso = `${mk}-${String(d).padStart(2, "0")}`; data.push({ day: d, amount: totals[iso] || 0 }); }
  if (!data.some((d) => d.amount > 0)) return <EmptyNote text="No spending recorded this month yet." />;

  return (
    <div style={styles.card}>
      <div style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke={T.lineSoft} />
            <XAxis dataKey="day" tick={{ fontSize: 10, fill: T.inkSoft }} interval={2} axisLine={{ stroke: T.line }} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: T.inkSoft }} axisLine={false} tickLine={false} tickFormatter={pesoShort} width={56} />
            <Tooltip formatter={(v) => peso(v)} labelFormatter={(d) => `Day ${d}`} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            <Bar dataKey="amount" fill={T.teal} radius={[3, 3, 0, 0]} maxBarSize={14} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function SettingsScreen({ profile, budget, savingsGoal, onSave, onLogout }) {
  const [b, setB] = useState(String(budget));
  const [s, setS] = useState(String(savingsGoal));
  const [saved, setSaved] = useState(false);

  const save = () => {
    onSave(parseFloat(b) || 0, parseFloat(s) || 0);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const initials = (profile.full_name || profile.email || "?").trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div>
      <SectionTitle text="Account" />
      <div style={styles.card}>
        <div style={styles.accountRow}>
          <div style={styles.avatar}>{initials}</div>
          <div>
            <div style={styles.accountName}>{profile.full_name || "Family Ledger user"}</div>
            <div style={styles.accountEmail}>{profile.email}</div>
          </div>
        </div>
        <button style={styles.logoutRow} onClick={onLogout}><LogOut size={15} /> Log out</button>
      </div>

      <SectionTitle text="Monthly budget" />
      <div style={styles.card}>
        <label style={styles.fieldLabel}>Monthly budget</label>
        <div style={styles.amountInputWrap}>
          <span style={styles.pesoSign}>{"\u20B1"}</span>
          <input style={styles.amountInput} inputMode="decimal" value={b} onChange={(e) => setB(e.target.value.replace(/[^0-9.]/g, ""))} />
        </div>
        <label style={styles.fieldLabel}>Savings goal</label>
        <div style={styles.amountInputWrap}>
          <span style={styles.pesoSign}>{"\u20B1"}</span>
          <input style={styles.amountInput} inputMode="decimal" value={s} onChange={(e) => setS(e.target.value.replace(/[^0-9.]/g, ""))} />
        </div>
        <button style={styles.saveBtn} onClick={save}>{saved ? "Saved" : "Save settings"}</button>
      </div>

      <SectionTitle text="Categories" />
      <div style={styles.card}>
        {CATS.map((c, i) => {
          const Icon = c.icon;
          return (
            <div key={c.id} style={{ ...styles.catInfoRow, borderBottom: i < CATS.length - 1 ? `1px solid ${T.lineSoft}` : "none" }}>
              <span style={{ ...styles.catIconWrap, background: c.color + "22", color: c.color }}><Icon size={15} /></span>
              <div>
                <div style={styles.catInfoName}>{c.name}</div>
                <div style={styles.catInfoDesc}>{c.desc}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BottomNav({ active, onNav, onAdd }) {
  const items = [
    { id: "dashboard", label: "Home", icon: Home },
    { id: "history", label: "History", icon: CalendarDays },
    { id: "__add__", label: "Add", icon: Plus },
    { id: "reports", label: "Reports", icon: BarChart3 },
  ];
  return (
    <div style={styles.bottomNav}>
      {items.map((it) => {
        const Icon = it.icon;
        if (it.id === "__add__") return <button key={it.id} onClick={onAdd} aria-label="Add expense" style={styles.fab}><Plus size={22} color="#fff" /></button>;
        const isActive = active === it.id;
        return (
          <button key={it.id} onClick={() => onNav(it.id)} style={styles.navItem}>
            <Icon size={19} color={isActive ? T.teal : T.inkSoft} />
            <span style={{ ...styles.navLabel, color: isActive ? T.teal : T.inkSoft, fontWeight: isActive ? 600 : 400 }}>{it.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Styles                                                             */
/* ---------------------------------------------------------------- */
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap');
  :root { --mono: 'IBM Plex Mono', monospace; }
  * { box-sizing: border-box; }
  input[type=date] { font-family: 'Inter', sans-serif; }
  ::placeholder { color: #9C9784; }
  button { font-family: 'Inter', sans-serif; cursor: pointer; }
`;

const styles = {
  pageBg: { background: T.paper, minHeight: "100vh", display: "flex", justifyContent: "center", padding: "24px 12px", fontFamily: "'Inter', sans-serif", color: T.ink },
  phone: { width: 400, maxWidth: "100%" },
  phoneScreen: { background: T.card, borderRadius: 28, border: `1px solid ${T.line}`, boxShadow: "0 1px 2px rgba(27,42,38,0.06)", overflow: "hidden", display: "flex", flexDirection: "column", height: 780, maxHeight: "85vh", position: "relative" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 18px 14px", borderBottom: `1px solid ${T.lineSoft}`, background: T.card, flexShrink: 0 },
  headerEyebrow: { fontSize: 11, color: T.inkSoft, letterSpacing: 0.3, textTransform: "uppercase" },
  headerTitle: { fontFamily: "'Fraunces', serif", fontSize: 21, fontWeight: 600, marginTop: 2 },
  iconBtn: { background: T.cardAlt, border: `1px solid ${T.line}`, borderRadius: 10, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", color: T.ink },
  content: { flex: 1, overflowY: "auto", padding: "16px 16px 90px" },

  brandTitle: { fontFamily: "'Fraunces', serif", fontSize: 26, fontWeight: 700, color: T.tealDark },
  brandSub: { fontSize: 12.5, color: T.inkSoft, marginTop: 4 },
  googleBtn: { width: "100%", display: "flex", alignItems: "center", justifyContent: "center", border: `1.5px solid ${T.line}`, background: T.cardAlt, borderRadius: 12, padding: "11px", fontSize: 13.5, fontWeight: 500, color: T.ink },
  dividerRow: { display: "flex", alignItems: "center", gap: 10, margin: "16px 0" },
  dividerLine: { flex: 1, height: 1, background: T.line },
  dividerText: { fontSize: 11, color: T.inkSoft, textTransform: "uppercase", letterSpacing: 0.4 },
  eyeBtn: { position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", color: T.inkSoft, padding: 4 },
  linkBtn: { background: "transparent", border: "none", color: T.teal, fontSize: 12.5, fontWeight: 600, padding: 0 },
  switchRow: { textAlign: "center", fontSize: 12.5, color: T.inkSoft, marginTop: 18 },
  modalTitleCenter: { fontFamily: "'Fraunces', serif", fontSize: 19, fontWeight: 600, textAlign: "center", marginBottom: 14 },
  infoText: { fontSize: 12.5, color: T.inkSoft, textAlign: "center", lineHeight: 1.5, marginBottom: 14 },

  cardGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 },
  summaryCard: { background: T.cardAlt, border: `1px solid ${T.lineSoft}`, borderRadius: 14, padding: "12px 13px" },
  summaryLabel: { fontSize: 11.5, color: T.inkSoft, lineHeight: 1.3 },
  summaryValue: { fontFamily: "var(--mono)", fontWeight: 600, fontSize: 19, marginTop: 8 },

  ledgerCard: { background: T.cardAlt, border: `1px solid ${T.lineSoft}`, borderRadius: 14, padding: "14px 15px", marginBottom: 18 },
  ledgerRowTop: { display: "flex", justifyContent: "space-between", marginBottom: 10, fontSize: 13 },
  ledgerLabel: { color: T.inkSoft },
  ledgerPct: { fontFamily: "var(--mono)", fontWeight: 600 },
  ledgerRowBottom: { display: "flex", justifyContent: "space-between", marginTop: 10, fontSize: 11.5, color: T.inkSoft, fontFamily: "var(--mono)" },
  coinRow: { display: "flex", gap: 3, flexWrap: "wrap" },
  coin: { width: 12, height: 12, borderRadius: "50%", border: "1.5px solid", display: "inline-block" },

  sectionTitle: { fontFamily: "'Fraunces', serif", fontSize: 15, fontWeight: 600, margin: "18px 0 8px" },
  emptyNote: { fontSize: 12.5, color: T.inkSoft, padding: "14px 4px", fontStyle: "italic" },

  card: { background: T.card, border: `1px solid ${T.lineSoft}`, borderRadius: 14, overflow: "hidden", padding: "4px 4px" },

  rankRow: { display: "flex", alignItems: "center", gap: 10, padding: "11px 10px", cursor: "pointer" },
  medal: { fontSize: 16, width: 20, textAlign: "center" },
  catDot: { width: 8, height: 8, borderRadius: "50%", flexShrink: 0 },
  rankName: { flex: 1, fontSize: 13.5 },
  rankAmount: { fontFamily: "var(--mono)", fontWeight: 600, fontSize: 13.5 },

  catRow: { display: "flex", alignItems: "center", gap: 10, padding: "10px 10px", cursor: "pointer" },
  catIconWrap: { width: 30, height: 30, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  catRowName: { flex: 1, fontSize: 13 },
  catRowAmount: { fontFamily: "var(--mono)", fontSize: 12.5, color: T.inkSoft },

  toast: { position: "absolute", bottom: 92, left: "50%", transform: "translateX(-50%)", background: T.ink, color: "#F8F6EC", fontSize: 12.5, padding: "9px 16px", borderRadius: 20, display: "flex", alignItems: "center", boxShadow: "0 4px 14px rgba(0,0,0,0.18)", zIndex: 40 },

  modalOverlay: { position: "absolute", inset: 0, background: "rgba(27,42,38,0.45)", display: "flex", alignItems: "flex-end", zIndex: 50 },
  modalSheet: { background: T.card, width: "100%", maxHeight: "92%", overflowY: "auto", borderRadius: "22px 22px 0 0", padding: "10px 18px 22px" },
  modalHandle: { width: 36, height: 4, borderRadius: 4, background: T.line, margin: "4px auto 12px" },
  modalHeaderRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  modalTitle: { fontFamily: "'Fraunces', serif", fontSize: 19, fontWeight: 600 },

  fieldLabel: { display: "block", fontSize: 12, color: T.inkSoft, margin: "14px 0 6px", fontWeight: 500 },
  req: { color: T.rust, fontWeight: 400, fontSize: 10.5, textTransform: "uppercase", letterSpacing: 0.3 },
  optional: { color: T.inkSoft, fontWeight: 400, fontSize: 10.5, opacity: 0.7, textTransform: "uppercase", letterSpacing: 0.3 },

  amountInputWrap: { display: "flex", alignItems: "center", border: `1.5px solid ${T.line}`, borderRadius: 12, padding: "10px 14px", background: T.cardAlt },
  pesoSign: { fontFamily: "var(--mono)", fontSize: 20, color: T.brassDark, marginRight: 6, fontWeight: 600 },
  amountInput: { border: "none", outline: "none", background: "transparent", fontFamily: "var(--mono)", fontSize: 22, fontWeight: 600, width: "100%", color: T.ink },

  catGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 },
  catPick: { display: "flex", alignItems: "center", gap: 8, border: "1.5px solid", borderRadius: 12, padding: "9px 10px", background: T.card, textAlign: "left" },
  catPickIcon: { flexShrink: 0 },
  catPickLabel: { fontSize: 12 },

  textInput: { width: "100%", border: `1.5px solid ${T.line}`, borderRadius: 12, padding: "10px 14px", fontSize: 14, background: T.cardAlt, color: T.ink, outline: "none" },
  textInputSm: { border: `1.5px solid ${T.line}`, borderRadius: 10, padding: "7px 10px", fontSize: 12.5, background: T.cardAlt, color: T.ink, outline: "none" },

  errorText: { color: T.rust, fontSize: 12, marginTop: 10 },
  saveBtn: { width: "100%", background: T.teal, color: "#fff", border: "none", borderRadius: 12, padding: "13px", fontSize: 14.5, fontWeight: 600, marginTop: 18 },

  searchWrap: { display: "flex", alignItems: "center", gap: 8, border: `1.5px solid ${T.line}`, borderRadius: 12, padding: "9px 12px", background: T.cardAlt, marginBottom: 10 },
  searchInput: { border: "none", outline: "none", background: "transparent", fontSize: 13.5, width: "100%", color: T.ink },

  filterRow: { display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" },
  filterChip: { border: `1px solid ${T.line}`, background: T.cardAlt, borderRadius: 20, padding: "6px 12px", fontSize: 12, color: T.inkSoft },
  filterChipActive: { background: T.teal, borderColor: T.teal, color: "#fff" },

  customRange: { display: "flex", alignItems: "center", gap: 8, marginBottom: 10 },
  activeCatFilter: { display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: T.inkSoft, marginBottom: 10 },
  clearChip: { border: `1px solid ${T.line}`, background: "transparent", borderRadius: 20, padding: "3px 10px", fontSize: 11, color: T.rust },

  totalStrip: { display: "flex", justifyContent: "space-between", fontSize: 12.5, color: T.inkSoft, padding: "0 4px 12px", borderBottom: `1px solid ${T.lineSoft}`, marginBottom: 12 },

  dayHeader: { fontSize: 12, fontWeight: 600, color: T.inkSoft, margin: "0 0 6px 4px", textTransform: "uppercase", letterSpacing: 0.3 },
  expenseRow: { display: "flex", alignItems: "center", gap: 10, padding: "10px 10px" },
  expenseCat: { fontSize: 13 },
  expenseDesc: { fontSize: 11.5, color: T.inkSoft, marginTop: 1 },
  expenseAmount: { fontFamily: "var(--mono)", fontWeight: 600, fontSize: 13 },
  deleteBtn: { background: "transparent", border: "none", color: T.inkSoft, padding: 4 },

  reportTabs: { display: "flex", gap: 6, marginBottom: 14, overflowX: "auto" },
  reportTab: { display: "flex", alignItems: "center", gap: 5, border: `1px solid ${T.line}`, background: T.cardAlt, borderRadius: 20, padding: "7px 12px", fontSize: 12, color: T.inkSoft, whiteSpace: "nowrap" },
  reportTabActive: { background: T.ink, borderColor: T.ink, color: "#F8F6EC" },

  legendWrap: { padding: "6px 10px 8px", display: "flex", flexDirection: "column", gap: 2 },
  legendItem: { display: "flex", alignItems: "center", gap: 8, background: "transparent", border: "none", padding: "6px 4px", width: "100%", textAlign: "left" },
  legendDot: { width: 9, height: 9, borderRadius: "50%", flexShrink: 0 },
  legendName: { flex: 1, fontSize: 12.5, color: T.ink },
  legendPct: { fontFamily: "var(--mono)", fontSize: 12, color: T.inkSoft },

  calNav: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 8px 4px" },
  calMonthLabel: { fontFamily: "'Fraunces', serif", fontSize: 15, fontWeight: 600 },
  calGridHead: { display: "grid", gridTemplateColumns: "repeat(7,1fr)", textAlign: "center", fontSize: 10.5, color: T.inkSoft, padding: "4px 4px 2px" },
  calGrid: { display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2, padding: "0 4px 6px" },
  calCell: { borderRadius: 8, minHeight: 42, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "3px 0" },
  calDayNum: { fontSize: 11, color: T.inkSoft },
  calAmt: { fontFamily: "var(--mono)", fontSize: 9, color: T.brassDark, fontWeight: 600, marginTop: 1 },

  compareHeadRow: { display: "flex", padding: "8px 10px", fontSize: 10.5, color: T.inkSoft, textTransform: "uppercase", letterSpacing: 0.3, borderBottom: `1px solid ${T.lineSoft}` },
  compareCol: { flex: 1, textAlign: "right", fontFamily: "var(--mono)", fontSize: 12 },
  compareRow: { display: "flex", padding: "9px 10px", fontSize: 12.5, alignItems: "center" },
  compareTotalRow: { display: "flex", padding: "10px 10px", fontSize: 12.5, alignItems: "center", borderTop: `1.5px solid ${T.ink}`, fontWeight: 600, fontFamily: "var(--mono)" },

  catInfoRow: { display: "flex", gap: 10, padding: "11px 10px", alignItems: "flex-start" },
  catInfoName: { fontSize: 13, fontWeight: 600 },
  catInfoDesc: { fontSize: 11.5, color: T.inkSoft, marginTop: 2, lineHeight: 1.4 },

  accountRow: { display: "flex", alignItems: "center", gap: 12, padding: "12px 12px 14px" },
  avatar: { width: 44, height: 44, borderRadius: "50%", background: T.teal, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: 15, flexShrink: 0 },
  accountName: { fontSize: 14.5, fontWeight: 600 },
  accountEmail: { fontSize: 12, color: T.inkSoft, marginTop: 2 },
  logoutRow: { display: "flex", alignItems: "center", gap: 8, width: "calc(100% - 20px)", margin: "0 10px 8px", border: `1px solid ${T.line}`, background: T.cardAlt, borderRadius: 10, padding: "10px 12px", fontSize: 13, color: T.rust, borderTop: `1px solid ${T.lineSoft}` },

  bottomNav: { position: "absolute", bottom: 0, left: 0, right: 0, background: T.card, borderTop: `1px solid ${T.lineSoft}`, display: "flex", alignItems: "center", justifyContent: "space-around", padding: "8px 10px calc(8px + env(safe-area-inset-bottom))", height: 74 },
  navItem: { display: "flex", flexDirection: "column", alignItems: "center", gap: 3, background: "transparent", border: "none", padding: "4px 8px" },
  navLabel: { fontSize: 10.5 },
  fab: { width: 52, height: 52, borderRadius: "50%", background: T.brassDark, border: "none", display: "flex", alignItems: "center", justifyContent: "center", marginTop: -26, boxShadow: "0 3px 10px rgba(143,106,34,0.35)" },
};
