import {
  ArrowLeft,
  Banknote,
  Briefcase,
  Calendar,
  ChevronLeft,
  ChevronRight,
  FileDown,
  Lock,
  LogOut,
  Mail,
  Plus,
  TrendingUp,
  User as UserIcon,
  Users,
  Wallet,
  X,
} from "lucide-react-native";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import Svg, { G, Rect, Text as SvgText } from "react-native-svg";

import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";
import { Image } from "expo-image";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { initializeApp } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  getReactNativePersistence,
  initializeAuth,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getFirestore,
  onSnapshot,
  query,
  setDoc,
} from "firebase/firestore";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const firebaseConfig = {
  apiKey: "AIzaSyD56GDUPaErJ-0_H5OdtItTqMpUdVvXlnY",
  authDomain: "biztrack-e7367.firebaseapp.com",
  projectId: "biztrack-e7367",
  storageBucket: "biztrack-e7367.firebasestorage.app",
  messagingSenderId: "405562628967",
  appId: "1:405562628967:web:62420fa5abd83cfa45edc2",
};

const app = initializeApp(firebaseConfig);
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage),
});
const db = getFirestore(app);
const APP_ID = "biztrack-app";

// ── Constants ──────────────────────────────────────────────────────────────

const DEFAULT_CATEGORIES = [
  { id: "def_carb",  name: "Carburante",  color: "#f97316", emoji: "⛽" },
  { id: "def_furg",  name: "Furgone",     color: "#3b82f6", emoji: "🚛" },
  { id: "def_mat",   name: "Materiale",   color: "#22c55e", emoji: "🧱" },
  { id: "def_attr",  name: "Attrezzatura",color: "#a855f7", emoji: "🔧" },
  { id: "def_util",  name: "Utensili",    color: "#ec4899", emoji: "🔨" },
  { id: "def_vitt",  name: "Vitto",       color: "#f59e0b", emoji: "🍽️" },
  { id: "def_altro", name: "Altro",       color: "#94a3b8", emoji: "📦" },
];

const EMOJI_OPTIONS = [
  "⛽","🚛","🧱","🔧","🔨","🍽️","🏠","⚡","📦","🎯",
  "🛒","📱","🖥️","✈️","🚗","💡","🔑","📋","🏗️","🌿",
];

const COLOR_OPTIONS = [
  "#ef4444","#f97316","#eab308","#22c55e",
  "#3b82f6","#8b5cf6","#ec4899","#94a3b8",
];

const REPORT_CARDS = [
  { id: "overview",    title: "Panoramica",        desc: "Riepilogo entrate, costi e utile netto",         color: "#3b82f6" },
  { id: "monthly",     title: "Andamento Mensile", desc: "Grafico delle entrate e costi per mese",         color: "#22c55e" },
  { id: "clients",     title: "Analisi Clienti",   desc: "Top clienti, dettaglio ed esportazione PDF",     color: "#b45309" },
  { id: "categories",  title: "Spese per Categoria",desc: "Analisi costi per categoria e ricavi collegati",color: "#ef4444" },
  { id: "balance",     title: "Bilancio Completo",  desc: "Confronto entrate e costi mese per mese",       color: "#8b5cf6" },
];

const MONTH_NAMES = [
  "Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno",
  "Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre",
];
const MONTH_SHORT = ["Gen","Feb","Mar","Apr","Mag","Giu","Lug","Ago","Set","Ott","Nov","Dic"];

// ── Component ──────────────────────────────────────────────────────────────

export default function App() {
  const { width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // Auth
  const [user, setUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");
  const [isProcessingAuth, setIsProcessingAuth] = useState(false);

  // Data
  const [jobs, setJobs] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [customCategories, setCustomCategories] = useState([]);

  // Navigation
  const [activeTab, setActiveTab] = useState("calendar");
  const [activeReport, setActiveReport] = useState(null);
  const [selectedReportClient, setSelectedReportClient] = useState(null);

  // Job calendar
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);
  const [showClientSugg, setShowClientSugg] = useState(false);
  const [jobForm, setJobForm] = useState({ client: "", hours: "", hourlyRate: "", income: "" });

  // Expense calendar
  const [expCalDate, setExpCalDate] = useState(new Date());
  const [selectedExpDay, setSelectedExpDay] = useState(null);

  // Expense modal
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    description: "", amount: "", revenue: "",
    category: "Carburante", date: new Date(),
  });

  // Add-category modal
  const [isAddCatOpen, setIsAddCatOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatColor, setNewCatColor] = useState(COLOR_OPTIONS[4]);
  const [newCatEmoji, setNewCatEmoji] = useState(EMOJI_OPTIONS[0]);

  // Reports
  const [reportPeriod, setReportPeriod] = useState("month");

  // ── Helpers ──────────────────────────────────────────────────────────────

  const fmt = (n) => `€ ${Number(n || 0).toFixed(2)}`;
  const fmtDateStr = (d) => {
    const dt = d instanceof Date ? d : new Date(d);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
  };
  const getDaysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
  const getFirstDOW = (y, m) => { const d = new Date(y, m, 1).getDay(); return d === 0 ? 6 : d - 1; };

  const allCategories = useMemo(() => {
    const custom = customCategories.filter((c) => !DEFAULT_CATEGORIES.find((d) => d.name === c.name));
    return [...DEFAULT_CATEGORIES, ...custom];
  }, [customCategories]);

  const getCatInfo = (name) =>
    allCategories.find((c) => c.name === name) || { color: "#94a3b8", emoji: "📦", name };

  // ── Firebase Listeners ────────────────────────────────────────────────────

  React.useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => { setUser(u); setIsAuthLoading(false); });
    return unsub;
  }, []);

  React.useEffect(() => {
    if (!user) { setJobs([]); setExpenses([]); setCustomCategories([]); return; }
    const base = (col) => collection(db, "artifacts", APP_ID, "users", user.uid, col);
    const unJ = onSnapshot(query(base("jobs")), (s) => setJobs(s.docs.map((d) => ({ id: d.id, ...d.data() }))));
    const unE = onSnapshot(query(base("expenses")), (s) => setExpenses(s.docs.map((d) => ({ id: d.id, ...d.data() }))));
    const unC = onSnapshot(query(base("categories")), (s) => setCustomCategories(s.docs.map((d) => ({ id: d.id, ...d.data() }))));
    return () => { unJ(); unE(); unC(); };
  }, [user]);

  // ── Auth Actions ──────────────────────────────────────────────────────────

  const handleEmailAuth = async () => {
    if (!email || !password) { setAuthError("Inserisci email e password."); return; }
    setIsProcessingAuth(true); setAuthError("");
    try {
      if (isRegistering) await createUserWithEmailAndPassword(auth, email, password);
      else await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      if (err.code === "auth/invalid-email") setAuthError("Formato email non valido.");
      else if (["auth/user-not-found","auth/wrong-password","auth/invalid-credential"].includes(err.code)) setAuthError("Email o password errati.");
      else if (err.code === "auth/email-already-in-use") setAuthError("Email già registrata.");
      else if (err.code === "auth/weak-password") setAuthError("Password di almeno 6 caratteri.");
      else setAuthError("Errore. Riprova.");
    } finally { setIsProcessingAuth(false); }
  };

  const handleGuestLogin = async () => {
    setIsProcessingAuth(true);
    try { await signInAnonymously(auth); }
    catch { setAuthError("Errore accesso ospite."); }
    finally { setIsProcessingAuth(false); }
  };

  const handleForgotPassword = async () => {
    if (!email) { setAuthError("Inserisci la tua email."); return; }
    setIsProcessingAuth(true); setAuthError(""); setAuthSuccess("");
    try { await sendPasswordResetEmail(auth, email); setAuthSuccess("Email di ripristino inviata!"); }
    catch (err) {
      if (["auth/user-not-found","auth/invalid-credential"].includes(err.code)) setAuthError("Account non trovato.");
      else setAuthError("Errore. Riprova.");
    } finally { setIsProcessingAuth(false); }
  };

  const handleLogout = async () => { try { await signOut(auth); } catch {} };

  // ── CRUD ──────────────────────────────────────────────────────────────────

  const uid = () => user.uid;
  const docRef = (col, id) => doc(db, "artifacts", APP_ID, "users", uid(), col, id);
  const newId = () => Math.random().toString(36).substring(2, 15);

  const handleSaveJob = async () => {
    if (!user || !selectedDay) return;
    try {
      await setDoc(docRef("jobs", newId()), {
        date: fmtDateStr(selectedDay),
        client: jobForm.client,
        hours: Number(jobForm.hours?.replace(",", ".") || 0),
        hourlyRate: jobForm.hourlyRate ? Number(jobForm.hourlyRate.replace(",", ".")) : null,
        income: Number(jobForm.income?.replace(",", ".") || 0),
        createdAt: new Date().toISOString(),
      });
      setIsJobModalOpen(false);
    } catch (e) { console.error(e); }
  };

  const handleSaveExpense = async () => {
    if (!user) return;
    try {
      await setDoc(docRef("expenses", newId()), {
        date: fmtDateStr(expenseForm.date),
        description: expenseForm.description,
        amount: Number(expenseForm.amount || 0),
        revenue: Number(expenseForm.revenue || 0),
        category: expenseForm.category,
        createdAt: new Date().toISOString(),
      });
      setIsExpenseModalOpen(false);
      setExpenseForm({ description: "", amount: "", revenue: "", category: "Carburante", date: new Date() });
    } catch (e) { console.error(e); }
  };

  const handleAddCategory = async () => {
    if (!user || !newCatName.trim()) return;
    const name = newCatName.trim();
    try {
      await setDoc(docRef("categories", newId()), {
        name, color: newCatColor, emoji: newCatEmoji,
        createdAt: new Date().toISOString(),
      });
      setIsAddCatOpen(false);
      setNewCatName(""); setNewCatColor(COLOR_OPTIONS[4]); setNewCatEmoji(EMOJI_OPTIONS[0]);
      setExpenseForm((p) => ({ ...p, category: name }));
    } catch (e) { console.error(e); }
  };

  const handleDeleteJob = async (id) => { try { await deleteDoc(docRef("jobs", id)); } catch (e) { console.error(e); } };
  const handleDeleteExpense = async (id) => { try { await deleteDoc(docRef("expenses", id)); } catch (e) { console.error(e); } };

  // ── PDF ───────────────────────────────────────────────────────────────────

  const periodLabel = (p) => ({ week:"Ultimi 7 giorni", month:"Questo mese", year:"Quest'anno", all:"Tutto il periodo" })[p] || "";

  const generateClientPDF = async (clientName) => {
    const cJobs = reportJobs.filter((j) => j.client === clientName).sort((a, b) => a.date.localeCompare(b.date));
    const total = cJobs.reduce((s, j) => s + Number(j.income || 0), 0);
    const hours = cJobs.reduce((s, j) => s + Number(j.hours || 0), 0);
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      body{font-family:Arial,sans-serif;margin:40px;color:#1e293b}
      .hd{border-bottom:3px solid #b45309;padding-bottom:16px;margin-bottom:28px;display:flex;justify-content:space-between;align-items:flex-end}
      .brand{font-size:26px;font-weight:bold;color:#b45309}
      h2{color:#1e293b;margin:0 0 4px}
      .sub{color:#64748b;font-size:13px}
      table{width:100%;border-collapse:collapse;margin-top:20px}
      th{background:#f1f5f9;color:#475569;font-size:11px;text-transform:uppercase;padding:10px;text-align:left;border:1px solid #e2e8f0}
      td{padding:10px;border:1px solid #e2e8f0;font-size:13px}
      tr:nth-child(even) td{background:#f8fafc}
      .tot td{font-weight:bold;background:#fef3c7;color:#b45309}
      .ft{margin-top:36px;font-size:11px;color:#94a3b8;text-align:center}
    </style></head><body>
    <div class="hd"><div><div class="brand">BizTrack</div><div class="sub">Generato il ${new Date().toLocaleDateString("it-IT")}</div></div><div class="sub">${periodLabel(reportPeriod)}</div></div>
    <h2>Report Cliente: ${clientName}</h2>
    <p class="sub">Totale lavori: ${cJobs.length} &nbsp;|&nbsp; Ore lavorate: ${hours}h</p>
    <table><thead><tr><th>Data</th><th>Ore</th><th>Tariffa/h</th><th>Compenso</th></tr></thead><tbody>
    ${cJobs.map((j) => `<tr><td>${new Date(j.date).toLocaleDateString("it-IT")}</td><td>${j.hours}h</td><td>${j.hourlyRate ? `€${Number(j.hourlyRate).toFixed(2)}` : "—"}</td><td>€${Number(j.income).toFixed(2)}</td></tr>`).join("")}
    <tr class="tot"><td colspan="3">TOTALE</td><td>€${total.toFixed(2)}</td></tr>
    </tbody></table>
    <div class="ft">Documento generato da BizTrack</div>
    </body></html>`;
    try {
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { UTI: "com.adobe.pdf", mimeType: "application/pdf" });
    } catch (e) { console.error("PDF:", e); }
  };

  const generateExpensesPDF = async () => {
    const sorted = [...reportExpenses].sort((a, b) => a.date.localeCompare(b.date));
    const totCost = sorted.reduce((s, e) => s + Number(e.amount || 0), 0);
    const totRev = sorted.reduce((s, e) => s + Number(e.revenue || 0), 0);
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      body{font-family:Arial,sans-serif;margin:40px;color:#1e293b}
      .hd{border-bottom:3px solid #1e293b;padding-bottom:16px;margin-bottom:28px;display:flex;justify-content:space-between;align-items:flex-end}
      .brand{font-size:26px;font-weight:bold;color:#1e293b}
      .sub{color:#64748b;font-size:13px}
      table{width:100%;border-collapse:collapse}
      th{background:#f1f5f9;color:#475569;font-size:10px;text-transform:uppercase;padding:8px;text-align:left;border:1px solid #e2e8f0}
      td{padding:8px;border:1px solid #e2e8f0;font-size:12px}
      tr:nth-child(even) td{background:#f8fafc}
      .tot td{font-weight:bold;background:#fee2e2;color:#dc2626}
      .pos{color:#16a34a}.neg{color:#dc2626}
      .ft{margin-top:36px;font-size:11px;color:#94a3b8;text-align:center}
    </style></head><body>
    <div class="hd"><div><div class="brand">BizTrack</div><div class="sub">Generato il ${new Date().toLocaleDateString("it-IT")}</div></div><div class="sub">${periodLabel(reportPeriod)}</div></div>
    <h2 style="margin:0 0 20px">Report Spese</h2>
    <table><thead><tr><th>Data</th><th>Descrizione</th><th>Categoria</th><th>Costo</th><th>Ricavo</th><th>Netto</th></tr></thead><tbody>
    ${sorted.map((e) => { const net = Number(e.revenue||0)-Number(e.amount||0); return `<tr>
      <td>${new Date(e.date).toLocaleDateString("it-IT")}</td>
      <td>${e.description}</td><td>${e.category}</td>
      <td class="neg">-€${Number(e.amount||0).toFixed(2)}</td>
      <td class="pos">${e.revenue ? `+€${Number(e.revenue).toFixed(2)}` : "—"}</td>
      <td class="${net>=0?"pos":"neg"}">€${net.toFixed(2)}</td>
    </tr>`; }).join("")}
    <tr class="tot"><td colspan="3">TOTALE</td><td>-€${totCost.toFixed(2)}</td><td>+€${totRev.toFixed(2)}</td><td>€${(totRev-totCost).toFixed(2)}</td></tr>
    </tbody></table>
    <div class="ft">Documento generato da BizTrack</div>
    </body></html>`;
    try {
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { UTI: "com.adobe.pdf", mimeType: "application/pdf" });
    } catch (e) { console.error("PDF:", e); }
  };

  // ── Derived Data ──────────────────────────────────────────────────────────

  const currentMonthJobs = useMemo(() => {
    const m = currentDate.getMonth(), y = currentDate.getFullYear();
    return jobs.filter((j) => { const d = new Date(j.date); return d.getMonth() === m && d.getFullYear() === y; });
  }, [jobs, currentDate]);

  const expCalMonth = useMemo(() => {
    const m = expCalDate.getMonth(), y = expCalDate.getFullYear();
    return expenses.filter((e) => { const d = new Date(e.date); return d.getMonth() === m && d.getFullYear() === y; });
  }, [expenses, expCalDate]);

  const displayedExpenses = useMemo(() => {
    if (!selectedExpDay) return expCalMonth;
    const ds = fmtDateStr(selectedExpDay);
    return expCalMonth.filter((e) => e.date === ds);
  }, [expCalMonth, selectedExpDay]);

  const totalJobIncome = useMemo(() => currentMonthJobs.reduce((s, j) => s + Number(j.income || 0), 0), [currentMonthJobs]);
  const monthExpCost = useMemo(() => expCalMonth.reduce((s, e) => s + Number(e.amount || 0), 0), [expCalMonth]);
  const monthExpRevenue = useMemo(() => expCalMonth.reduce((s, e) => s + Number(e.revenue || 0), 0), [expCalMonth]);

  const clientSuggestions = useMemo(() => [...new Set(jobs.map((j) => j.client).filter(Boolean))].sort(), [jobs]);
  const filteredClientSugg = useMemo(() =>
    jobForm.client
      ? clientSuggestions.filter((c) => c.toLowerCase().includes(jobForm.client.toLowerCase()) && c.toLowerCase() !== jobForm.client.toLowerCase())
      : clientSuggestions,
    [clientSuggestions, jobForm.client]);

  const reportStartDate = useMemo(() => {
    const now = new Date();
    if (reportPeriod === "week") { const d = new Date(now); d.setDate(now.getDate() - 6); d.setHours(0,0,0,0); return d; }
    if (reportPeriod === "month") return new Date(now.getFullYear(), now.getMonth(), 1);
    if (reportPeriod === "year") return new Date(now.getFullYear(), 0, 1);
    return new Date(0);
  }, [reportPeriod]);

  const reportJobs = useMemo(() => jobs.filter((j) => new Date(j.date) >= reportStartDate), [jobs, reportStartDate]);
  const reportExpenses = useMemo(() => expenses.filter((e) => new Date(e.date) >= reportStartDate), [expenses, reportStartDate]);
  const repTotalIncome = useMemo(() => reportJobs.reduce((s, j) => s + Number(j.income || 0), 0), [reportJobs]);
  const repTotalCost = useMemo(() => reportExpenses.reduce((s, e) => s + Number(e.amount || 0), 0), [reportExpenses]);
  const repTotalRevenue = useMemo(() => reportExpenses.reduce((s, e) => s + Number(e.revenue || 0), 0), [reportExpenses]);

  const repTopClients = useMemo(() => {
    const map = {};
    reportJobs.forEach((j) => { if (j.client) map[j.client] = (map[j.client] || 0) + Number(j.income || 0); });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [reportJobs]);

  const repByCat = useMemo(() => {
    const map = {};
    reportExpenses.forEach((e) => {
      if (!map[e.category]) map[e.category] = { cost: 0, revenue: 0 };
      map[e.category].cost += Number(e.amount || 0);
      map[e.category].revenue += Number(e.revenue || 0);
    });
    return Object.entries(map)
      .map(([name, v]) => ({ name, ...v, net: v.revenue - v.cost }))
      .sort((a, b) => b.cost - a.cost);
  }, [reportExpenses]);

  const last12Months = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - (11 - i));
      const m = d.getMonth(), y = d.getFullYear();
      const inc = jobs.filter((j) => { const jd = new Date(j.date); return jd.getMonth() === m && jd.getFullYear() === y; }).reduce((s, j) => s + Number(j.income || 0), 0);
      const cost = expenses.filter((e) => { const ed = new Date(e.date); return ed.getMonth() === m && ed.getFullYear() === y; }).reduce((s, e) => s + Number(e.amount || 0), 0);
      return { label: MONTH_SHORT[m], income: inc, cost };
    });
  }, [jobs, expenses]);

  // ── Renderers ─────────────────────────────────────────────────────────────

  const renderAuthScreen = () => (
    <SafeAreaView style={styles.authContainer}>
      <View style={styles.authContent}>
        <View style={styles.authHeader}>
          <Image source={require("../assets/images/icon.png")} style={styles.logoImage} contentFit="contain" />
          <Text style={styles.authTitle}>BizTrack</Text>
          <Text style={styles.authSubtitle}>Gestisci il tuo lavoro, ovunque.</Text>
        </View>
        <View style={styles.authForm}>
          <Text style={styles.authModeTitle}>{isRegistering ? "Crea un Account" : "Bentornato"}</Text>
          {authError ? <Text style={styles.authErrorText}>{authError}</Text> : null}
          {authSuccess ? <Text style={styles.authSuccessText}>{authSuccess}</Text> : null}
          <View style={styles.inputContainer}>
            <Mail color="#94a3b8" size={20} style={styles.inputIcon} />
            <TextInput style={styles.authInput} placeholder="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          </View>
          <View style={styles.inputContainer}>
            <Lock color="#94a3b8" size={20} style={styles.inputIcon} />
            <TextInput style={styles.authInput} placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />
          </View>
          <TouchableOpacity style={styles.authPrimaryBtn} onPress={handleEmailAuth} disabled={isProcessingAuth}>
            {isProcessingAuth ? <ActivityIndicator color="white" /> : <Text style={styles.authPrimaryBtnText}>{isRegistering ? "Registrati" : "Accedi"}</Text>}
          </TouchableOpacity>
          {!isRegistering && (
            <TouchableOpacity style={styles.authForgotBtn} onPress={handleForgotPassword} disabled={isProcessingAuth}>
              <Text style={styles.authForgotBtnText}>Password dimenticata?</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.authToggleBtn} onPress={() => { setIsRegistering(!isRegistering); setAuthError(""); setAuthSuccess(""); }}>
            <Text style={styles.authToggleBtnText}>{isRegistering ? "Hai già un account? Accedi" : "Non hai un account? Registrati"}</Text>
          </TouchableOpacity>
          <View style={styles.authDivider}>
            <View style={styles.authDividerLine} /><Text style={styles.authDividerText}>OPPURE</Text><View style={styles.authDividerLine} />
          </View>
          <TouchableOpacity style={styles.authSecondaryBtn} onPress={handleGuestLogin} disabled={isProcessingAuth}>
            <Text style={styles.authSecondaryBtnText}>Continua come Ospite</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );

  const renderCalendar = () => {
    const y = currentDate.getFullYear(), m = currentDate.getMonth();
    const days = [];
    for (let i = 0; i < getFirstDOW(y, m); i++) days.push(<View key={`e${i}`} style={styles.dayCellEmpty} />);
    for (let day = 1; day <= getDaysInMonth(y, m); day++) {
      const ds = `${y}-${String(m+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
      const dayJobs = currentMonthJobs.filter((j) => j.date === ds);
      const isToday = new Date().toDateString() === new Date(y, m, day).toDateString();
      days.push(
        <TouchableOpacity key={day} onPress={() => { setSelectedDay(new Date(y, m, day)); setJobForm({ client:"",hours:"",hourlyRate:"",income:"" }); setShowClientSugg(false); setIsJobModalOpen(true); }}
          style={[styles.dayCell, isToday && styles.dayCellToday]}>
          <Text style={[styles.dayText, isToday && styles.dayTextToday]}>{day}</Text>
          <View style={styles.jobsListPreview}>
            {dayJobs.map((j) => <View key={j.id} style={styles.jobBadge}><Text style={styles.jobBadgeText} numberOfLines={1}>{j.client}</Text></View>)}
          </View>
        </TouchableOpacity>
      );
    }
    return (
      <View style={styles.tabContent}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={{ flexDirection:"row", alignItems:"center" }}>
              <Image source={require("../assets/images/icon.png")} style={{ width:32, height:32, borderRadius:8, marginRight:8 }} contentFit="contain" />
              <Text style={styles.headerTitle}>BizTrack</Text>
            </View>
            <View style={styles.userBadge}><Text style={styles.userBadgeText}>{user?.isAnonymous ? "Ospite" : "PRO"}</Text></View>
          </View>
          <View style={styles.monthSelector}>
            <TouchableOpacity onPress={() => setCurrentDate(new Date(y, m-1, 1))} style={styles.monthBtn}><ChevronLeft color="white" size={24} /></TouchableOpacity>
            <Text style={styles.monthText}>{MONTH_NAMES[m]} {y}</Text>
            <TouchableOpacity onPress={() => setCurrentDate(new Date(y, m+1, 1))} style={styles.monthBtn}><ChevronRight color="white" size={24} /></TouchableOpacity>
          </View>
          <View style={styles.statsCard}>
            <View><Text style={styles.statsLabel}>ENTRATE MESE</Text><Text style={styles.statsValue}>{fmt(totalJobIncome)}</Text></View>
            <View style={{ alignItems:"flex-end" }}><Text style={styles.statsLabel}>ORE MESE</Text><Text style={styles.statsValue}>{currentMonthJobs.reduce((a,j) => a + j.hours, 0)} h</Text></View>
          </View>
        </View>
        <ScrollView style={styles.calendarContainer}>
          <View style={styles.weekDaysRow}>
            {["Lun","Mar","Mer","Gio","Ven","Sab","Dom"].map((d) => <Text key={d} style={styles.weekDayText}>{d}</Text>)}
          </View>
          <View style={styles.daysGrid}>{days}</View>
        </ScrollView>
      </View>
    );
  };

  const renderExpenses = () => {
    const y = expCalDate.getFullYear(), m = expCalDate.getMonth();
    const calDays = [];
    for (let i = 0; i < getFirstDOW(y, m); i++) calDays.push(<View key={`ee${i}`} style={styles.dayCellEmpty} />);
    for (let day = 1; day <= getDaysInMonth(y, m); day++) {
      const ds = `${y}-${String(m+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
      const dayExps = expCalMonth.filter((e) => e.date === ds);
      const isSelDate = selectedExpDay && fmtDateStr(selectedExpDay) === ds;
      const isToday = new Date().toDateString() === new Date(y, m, day).toDateString();
      const hasCost = dayExps.some((e) => Number(e.amount) > 0);
      const hasRev = dayExps.some((e) => Number(e.revenue) > 0);
      calDays.push(
        <TouchableOpacity key={day}
          style={[styles.dayCell, isToday && styles.dayCellToday, isSelDate && styles.dayCellSelected]}
          onPress={() => setSelectedExpDay(isSelDate ? null : new Date(y, m, day))}>
          <Text style={[styles.dayText, isToday && styles.dayTextToday, isSelDate && { color:"white" }]}>{day}</Text>
          <View style={{ flexDirection:"row", justifyContent:"center", gap:2, marginTop:2 }}>
            {hasCost && <View style={styles.expDotRed} />}
            {hasRev && <View style={styles.expDotGreen} />}
          </View>
        </TouchableOpacity>
      );
    }

    return (
      <View style={styles.tabContent}>
        <View style={[styles.header, { backgroundColor:"#1e293b" }]}>
          <View style={styles.headerTop}>
            <View style={{ flexDirection:"row", alignItems:"center" }}>
              <Wallet color="white" size={22} style={{ marginRight:8 }} />
              <Text style={styles.headerTitle}>Spese & Finanze</Text>
            </View>
            <TouchableOpacity
              style={styles.addBtnHeader}
              onPress={() => { setExpenseForm({ description:"", amount:"", revenue:"", category: allCategories[0]?.name || "Carburante", date: selectedExpDay || new Date() }); setIsExpenseModalOpen(true); }}>
              <Plus color="white" size={20} />
            </TouchableOpacity>
          </View>
          <View style={styles.monthSelector}>
            <TouchableOpacity onPress={() => { setExpCalDate(new Date(y, m-1, 1)); setSelectedExpDay(null); }} style={styles.monthBtn}><ChevronLeft color="white" size={24} /></TouchableOpacity>
            <Text style={styles.monthText}>{MONTH_NAMES[m]} {y}</Text>
            <TouchableOpacity onPress={() => { setExpCalDate(new Date(y, m+1, 1)); setSelectedExpDay(null); }} style={styles.monthBtn}><ChevronRight color="white" size={24} /></TouchableOpacity>
          </View>
          <View style={styles.statsCard}>
            <View><Text style={styles.statsLabel}>COSTI MESE</Text><Text style={[styles.statsValue, { color:"#fca5a5" }]}>{fmt(monthExpCost)}</Text></View>
            {monthExpRevenue > 0 && <View><Text style={styles.statsLabel}>RICAVI SPESE</Text><Text style={[styles.statsValue, { color:"#86efac" }]}>{fmt(monthExpRevenue)}</Text></View>}
            <View style={{ alignItems:"flex-end" }}><Text style={styles.statsLabel}>ENTRATE LAV.</Text><Text style={styles.statsValue}>{fmt(totalJobIncome)}</Text></View>
          </View>
        </View>
        <ScrollView style={{ flex:1 }}>
          <View style={{ paddingHorizontal:12, paddingTop:10 }}>
            <View style={[styles.weekDaysRow, { marginBottom:4 }]}>
              {["L","M","M","G","V","S","D"].map((d, i) => <Text key={i} style={styles.weekDayText}>{d}</Text>)}
            </View>
            <View style={styles.daysGrid}>{calDays}</View>
            <View style={{ flexDirection:"row", gap:12, marginTop:6, marginBottom:2 }}>
              <View style={{ flexDirection:"row", alignItems:"center", gap:4 }}>
                <View style={[styles.expDotRed, { width:8, height:8 }]} /><Text style={{ fontSize:10, color:"#94a3b8" }}>Costo</Text>
              </View>
              <View style={{ flexDirection:"row", alignItems:"center", gap:4 }}>
                <View style={[styles.expDotGreen, { width:8, height:8 }]} /><Text style={{ fontSize:10, color:"#94a3b8" }}>Ricavo</Text>
              </View>
            </View>
          </View>
          <View style={{ padding:16 }}>
            <View style={styles.expensesTitleRow}>
              <Text style={styles.expensesTitle}>
                {selectedExpDay ? `${selectedExpDay.getDate()} ${MONTH_NAMES[selectedExpDay.getMonth()]}` : "Tutte le spese del mese"}
              </Text>
              {selectedExpDay && (
                <TouchableOpacity onPress={() => setSelectedExpDay(null)}>
                  <Text style={{ color:"#64748b", fontSize:13 }}>Tutto il mese</Text>
                </TouchableOpacity>
              )}
            </View>
            {displayedExpenses.length === 0 ? (
              <View style={styles.emptyState}>
                <Wallet color="#cbd5e1" size={40} />
                <Text style={styles.emptyStateText}>Nessuna spesa{selectedExpDay ? " per questo giorno" : ""}.</Text>
              </View>
            ) : (
              displayedExpenses.map((exp) => {
                const cat = getCatInfo(exp.category);
                const hasRev = Number(exp.revenue) > 0;
                const net = Number(exp.revenue || 0) - Number(exp.amount || 0);
                return (
                  <View key={exp.id} style={styles.expenseItem}>
                    <View style={[styles.catEmojiWrapper, { backgroundColor: cat.color + "22" }]}>
                      <Text style={{ fontSize:18 }}>{cat.emoji}</Text>
                    </View>
                    <View style={{ flex:1, marginLeft:12 }}>
                      <Text style={styles.expenseDesc}>{exp.description}</Text>
                      <Text style={styles.expenseDate}>{cat.name} · {new Date(exp.date).toLocaleDateString("it-IT")}</Text>
                    </View>
                    <View style={{ alignItems:"flex-end" }}>
                      <Text style={styles.expenseAmount}>-{fmt(exp.amount)}</Text>
                      {hasRev && <Text style={{ fontSize:12, color:"#16a34a", fontWeight:"bold" }}>+{fmt(exp.revenue)}</Text>}
                      {hasRev && <Text style={{ fontSize:11, color: net>=0 ? "#16a34a" : "#ef4444" }}>netto {fmt(net)}</Text>}
                      <TouchableOpacity onPress={() => handleDeleteExpense(exp.id)}>
                        <Text style={styles.deleteText}>Elimina</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>
      </View>
    );
  };

  // ── Reports ───────────────────────────────────────────────────────────────

  const PeriodFilter = () => (
    <View style={[styles.periodFilterRow, { marginBottom:16 }]}>
      {[{k:"week",l:"7gg"},{k:"month",l:"Mese"},{k:"year",l:"Anno"},{k:"all",l:"Tutto"}].map(({k,l}) => (
        <TouchableOpacity key={k} style={[styles.periodChipLight, reportPeriod===k && styles.periodChipLightActive]} onPress={() => setReportPeriod(k)}>
          <Text style={[styles.periodChipLightText, reportPeriod===k && { color:"white" }]}>{l}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderReports = () => activeReport ? renderActiveReport() : renderReportsDashboard();

  const renderReportsDashboard = () => (
    <View style={styles.tabContent}>
      <View style={[styles.header, { backgroundColor:"#0f172a" }]}>
        <View style={styles.headerTop}>
          <View style={{ flexDirection:"row", alignItems:"center" }}>
            <TrendingUp color="white" size={24} style={{ marginRight:8 }} />
            <Text style={styles.headerTitle}>Report</Text>
          </View>
        </View>
        <Text style={{ color:"rgba(255,255,255,0.55)", fontSize:13 }}>Seleziona un report da visualizzare</Text>
      </View>
      <ScrollView style={{ padding:16 }}>
        {REPORT_CARDS.map((card) => (
          <TouchableOpacity key={card.id} style={styles.reportDashCard} onPress={() => { setActiveReport(card.id); setSelectedReportClient(null); }}>
            <View style={[styles.reportDashIcon, { backgroundColor: card.color + "1a" }]}>
              {card.id === "overview" && <TrendingUp color={card.color} size={22} />}
              {card.id === "monthly" && <Wallet color={card.color} size={22} />}
              {card.id === "clients" && <Users color={card.color} size={22} />}
              {card.id === "categories" && <Wallet color={card.color} size={22} />}
              {card.id === "balance" && <Banknote color={card.color} size={22} />}
            </View>
            <View style={{ flex:1, marginLeft:14 }}>
              <Text style={styles.reportDashTitle}>{card.title}</Text>
              <Text style={styles.reportDashDesc}>{card.desc}</Text>
            </View>
            <ChevronRight color="#94a3b8" size={18} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderActiveReport = () => {
    const card = REPORT_CARDS.find((c) => c.id === activeReport);
    const chartW = screenWidth - 40;
    let content = null;

    if (activeReport === "overview") {
      const net = repTotalIncome + repTotalRevenue - repTotalCost;
      content = (
        <>
          <PeriodFilter />
          <View style={styles.reportCardsRow}>
            <View style={[styles.reportCard, { backgroundColor:"#f0fdf4", borderColor:"#bbf7d0" }]}>
              <Text style={styles.reportCardLabel}>ENTRATE LAV.</Text>
              <Text style={[styles.reportCardValue, { color:"#16a34a" }]}>{fmt(repTotalIncome)}</Text>
            </View>
            <View style={[styles.reportCard, { backgroundColor:"#fef2f2", borderColor:"#fecaca" }]}>
              <Text style={styles.reportCardLabel}>COSTI</Text>
              <Text style={[styles.reportCardValue, { color:"#dc2626" }]}>{fmt(repTotalCost)}</Text>
            </View>
          </View>
          {repTotalRevenue > 0 && (
            <View style={[styles.reportCard, { marginBottom:12, backgroundColor:"#f0fdf4", borderColor:"#bbf7d0" }]}>
              <Text style={styles.reportCardLabel}>RICAVI DA SPESE</Text>
              <Text style={[styles.reportCardValue, { color:"#16a34a" }]}>{fmt(repTotalRevenue)}</Text>
            </View>
          )}
          <View style={[styles.reportCardFull, { backgroundColor: net>=0 ? "#f0fdf4":"#fef2f2", borderColor: net>=0 ? "#bbf7d0":"#fecaca", marginBottom:16 }]}>
            <Text style={styles.reportCardLabel}>UTILE NETTO</Text>
            <Text style={[styles.reportCardValueLarge, { color: net>=0 ? "#16a34a":"#dc2626" }]}>{fmt(net)}</Text>
          </View>
        </>
      );
    }

    if (activeReport === "monthly") {
      const data6 = last12Months.slice(6);
      const maxV = Math.max(...data6.flatMap((d) => [d.income, d.cost]), 1);
      const bw = Math.floor((chartW - 20) / 6 - 14);
      content = (
        <>
          <Text style={[styles.reportSectionTitle, { marginBottom:12 }]}>Ultimi 6 mesi</Text>
          <View style={styles.reportSection}>
            <Svg width={chartW} height={200}>
              {data6.map((d, i) => {
                const iH = (d.income / maxV) * 140;
                const cH = (d.cost / maxV) * 140;
                const x = 10 + i * (bw * 2 + 16);
                return (
                  <G key={i}>
                    <Rect x={x} y={160-iH} width={bw} height={Math.max(iH,2)} fill="#22c55e" rx={3} />
                    <Rect x={x+bw+4} y={160-cH} width={bw} height={Math.max(cH,2)} fill="#ef4444" rx={3} />
                    <SvgText x={x+bw} y={180} textAnchor="middle" fontSize="9" fill="#94a3b8">{d.label}</SvgText>
                  </G>
                );
              })}
            </Svg>
            <View style={{ flexDirection:"row", justifyContent:"center", gap:20, marginTop:4 }}>
              <View style={{ flexDirection:"row", alignItems:"center", gap:5 }}><View style={{ width:10, height:10, borderRadius:2, backgroundColor:"#22c55e" }} /><Text style={{ fontSize:11, color:"#64748b" }}>Entrate</Text></View>
              <View style={{ flexDirection:"row", alignItems:"center", gap:5 }}><View style={{ width:10, height:10, borderRadius:2, backgroundColor:"#ef4444" }} /><Text style={{ fontSize:11, color:"#64748b" }}>Costi</Text></View>
            </View>
          </View>
          <Text style={[styles.reportSectionTitle, { marginTop:20, marginBottom:12 }]}>Ultimi 12 mesi — Entrate</Text>
          <View style={styles.reportSection}>
            {(() => {
              const maxI = Math.max(...last12Months.map((d) => d.income), 1);
              return last12Months.map((d, i) => (
                <View key={i} style={{ flexDirection:"row", alignItems:"center", marginBottom:8 }}>
                  <Text style={{ fontSize:11, color:"#64748b", width:30 }}>{d.label}</Text>
                  <View style={{ flex:1, height:8, backgroundColor:"#f1f5f9", borderRadius:4, marginHorizontal:8, overflow:"hidden" }}>
                    <View style={{ height:8, width:`${(d.income/maxI)*100}%`, backgroundColor:"#22c55e", borderRadius:4 }} />
                  </View>
                  <Text style={{ fontSize:11, color:"#64748b", width:68, textAlign:"right" }}>{fmt(d.income)}</Text>
                </View>
              ));
            })()}
          </View>
        </>
      );
    }

    if (activeReport === "clients") {
      if (selectedReportClient) {
        const cJobs = reportJobs.filter((j) => j.client === selectedReportClient).sort((a,b) => b.date.localeCompare(a.date));
        const cTotal = cJobs.reduce((s,j) => s + Number(j.income||0), 0);
        const cHours = cJobs.reduce((s,j) => s + Number(j.hours||0), 0);
        content = (
          <>
            <TouchableOpacity style={{ flexDirection:"row", alignItems:"center", marginBottom:16 }} onPress={() => setSelectedReportClient(null)}>
              <ArrowLeft color="#64748b" size={16} /><Text style={{ color:"#64748b", marginLeft:4, fontSize:13 }}>Tutti i clienti</Text>
            </TouchableOpacity>
            <View style={[styles.reportCardFull, { backgroundColor:"#fef3c7", borderColor:"#fcd34d", marginBottom:16 }]}>
              <Text style={styles.reportCardLabel}>CLIENTE</Text>
              <Text style={[styles.reportCardValueLarge, { color:"#b45309" }]}>{selectedReportClient}</Text>
              <Text style={{ color:"#b45309", fontSize:13, marginTop:4 }}>{fmt(cTotal)} · {cHours}h lavorate</Text>
            </View>
            {cJobs.map((j) => (
              <View key={j.id} style={styles.expenseItem}>
                <View style={{ flex:1 }}>
                  <Text style={styles.expenseDesc}>{new Date(j.date).toLocaleDateString("it-IT")}</Text>
                  <Text style={styles.expenseDate}>{j.hours}h{j.hourlyRate ? ` · €${j.hourlyRate}/h` : ""}</Text>
                </View>
                <Text style={{ fontWeight:"bold", color:"#16a34a", fontSize:15 }}>{fmt(j.income)}</Text>
              </View>
            ))}
            {cJobs.length > 0 && (
              <TouchableOpacity style={[styles.submitBtn, { backgroundColor:"#b45309", flexDirection:"row", gap:8, marginTop:8 }]} onPress={() => generateClientPDF(selectedReportClient)}>
                <FileDown color="white" size={20} /><Text style={styles.submitBtnText}>Esporta PDF</Text>
              </TouchableOpacity>
            )}
          </>
        );
      } else {
        content = (
          <>
            <PeriodFilter />
            {repTopClients.length === 0 ? (
              <View style={styles.emptyState}><Users color="#cbd5e1" size={40} /><Text style={styles.emptyStateText}>Nessun dato.</Text></View>
            ) : repTopClients.map(([name, inc], i) => {
              const maxA = repTopClients[0][1];
              return (
                <TouchableOpacity key={i} style={styles.clientCardItem} onPress={() => setSelectedReportClient(name)}>
                  <View style={[styles.clientRankBadge, { backgroundColor: i===0 ? "#b45309":"#64748b" }]}>
                    <Text style={styles.clientRankText}>{i+1}</Text>
                  </View>
                  <View style={{ flex:1, marginLeft:12 }}>
                    <Text style={styles.clientName}>{name}</Text>
                    <View style={styles.clientBarBg}>
                      <View style={[styles.clientBar, { width:`${(inc/maxA)*100}%` }]} />
                    </View>
                  </View>
                  <View style={{ alignItems:"flex-end", marginLeft:8 }}>
                    <Text style={{ fontWeight:"bold", color:"#16a34a" }}>{fmt(inc)}</Text>
                    <ChevronRight color="#94a3b8" size={14} />
                  </View>
                </TouchableOpacity>
              );
            })}
          </>
        );
      }
    }

    if (activeReport === "categories") {
      content = (
        <>
          <PeriodFilter />
          {repByCat.length === 0 ? (
            <View style={styles.emptyState}><Wallet color="#cbd5e1" size={40} /><Text style={styles.emptyStateText}>Nessuna spesa.</Text></View>
          ) : (
            <>
              {repByCat.map((cat, i) => {
                const info = getCatInfo(cat.name);
                const maxC = repByCat[0].cost;
                return (
                  <View key={i} style={[styles.reportSection, { marginBottom:12 }]}>
                    <View style={{ flexDirection:"row", alignItems:"center", marginBottom:8 }}>
                      <Text style={{ fontSize:20, marginRight:10 }}>{info.emoji}</Text>
                      <Text style={{ fontSize:14, fontWeight:"bold", color:"#1e293b", flex:1 }}>{cat.name}</Text>
                      <Text style={{ color:"#ef4444", fontWeight:"bold" }}>-{fmt(cat.cost)}</Text>
                    </View>
                    <View style={[styles.clientBarBg, { height:6, marginBottom:8 }]}>
                      <View style={[styles.clientBar, { width:`${(cat.cost/maxC)*100}%`, backgroundColor:info.color, height:6 }]} />
                    </View>
                    {cat.revenue > 0 && (
                      <View style={{ flexDirection:"row", justifyContent:"space-between" }}>
                        <Text style={{ color:"#64748b", fontSize:12 }}>Ricavi collegati</Text>
                        <Text style={{ color:"#16a34a", fontWeight:"600" }}>+{fmt(cat.revenue)}</Text>
                      </View>
                    )}
                    {cat.revenue > 0 && (
                      <View style={{ flexDirection:"row", justifyContent:"space-between", marginTop:4 }}>
                        <Text style={{ color:"#64748b", fontSize:12 }}>Netto categoria</Text>
                        <Text style={{ color: cat.net>=0 ? "#16a34a":"#ef4444", fontWeight:"600" }}>{fmt(cat.net)}</Text>
                      </View>
                    )}
                  </View>
                );
              })}
              <TouchableOpacity style={[styles.submitBtn, { flexDirection:"row", gap:8 }]} onPress={generateExpensesPDF}>
                <FileDown color="white" size={20} /><Text style={styles.submitBtnText}>Esporta PDF spese</Text>
              </TouchableOpacity>
            </>
          )}
        </>
      );
    }

    if (activeReport === "balance") {
      const filtered = last12Months.filter((d) => d.income > 0 || d.cost > 0);
      content = (
        <>
          {filtered.length === 0 ? (
            <View style={styles.emptyState}><Banknote color="#cbd5e1" size={40} /><Text style={styles.emptyStateText}>Nessun dato.</Text></View>
          ) : filtered.map((d, i) => {
            const net = d.income - d.cost;
            return (
              <View key={i} style={[styles.reportSection, { marginBottom:10 }]}>
                <Text style={{ fontWeight:"bold", color:"#1e293b", marginBottom:10 }}>{d.label}</Text>
                <View style={{ flexDirection:"row", justifyContent:"space-around" }}>
                  <View style={{ alignItems:"center" }}>
                    <Text style={{ fontSize:10, color:"#94a3b8", marginBottom:3 }}>ENTRATE</Text>
                    <Text style={{ color:"#16a34a", fontWeight:"bold", fontSize:14 }}>{fmt(d.income)}</Text>
                  </View>
                  <View style={{ width:1, backgroundColor:"#f1f5f9" }} />
                  <View style={{ alignItems:"center" }}>
                    <Text style={{ fontSize:10, color:"#94a3b8", marginBottom:3 }}>COSTI</Text>
                    <Text style={{ color:"#ef4444", fontWeight:"bold", fontSize:14 }}>{fmt(d.cost)}</Text>
                  </View>
                  <View style={{ width:1, backgroundColor:"#f1f5f9" }} />
                  <View style={{ alignItems:"center" }}>
                    <Text style={{ fontSize:10, color:"#94a3b8", marginBottom:3 }}>NETTO</Text>
                    <Text style={{ color: net>=0 ? "#16a34a":"#ef4444", fontWeight:"bold", fontSize:14 }}>{fmt(net)}</Text>
                  </View>
                </View>
              </View>
            );
          })}
        </>
      );
    }

    return (
      <View style={styles.tabContent}>
        <View style={[styles.header, { backgroundColor:"#0f172a" }]}>
          <TouchableOpacity style={{ flexDirection:"row", alignItems:"center", marginBottom:10 }} onPress={() => { setActiveReport(null); setSelectedReportClient(null); }}>
            <ArrowLeft color="rgba(255,255,255,0.65)" size={16} />
            <Text style={{ color:"rgba(255,255,255,0.65)", marginLeft:5, fontSize:12 }}>Report</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{card?.title}</Text>
        </View>
        <ScrollView style={{ padding:16 }} showsVerticalScrollIndicator={false}>
          {content}
        </ScrollView>
      </View>
    );
  };

  const renderProfile = () => (
    <View style={styles.tabContent}>
      <View style={styles.profileContainer}>
        <View style={styles.avatarWrapper}><UserIcon color="#b45309" size={48} /></View>
        <Text style={styles.profileName}>{user?.isAnonymous ? "Utente Ospite" : "Il tuo Profilo"}</Text>
        <Text style={styles.profileRole}>{user?.email || "Account Temporaneo"}</Text>
        <View style={styles.infoBox}>
          <Text style={styles.infoBoxLabel}>STATO ACCOUNT</Text>
          <Text style={styles.infoBoxValue}>Connesso a Firebase</Text>
          <Text style={[styles.infoBoxSub, { fontFamily:"monospace", fontSize:10, marginTop:4 }]}>ID: {user?.uid}</Text>
          {user?.isAnonymous && <Text style={[styles.infoBoxSub, { color:"#ef4444", marginTop:12 }]}>Attenzione: sei un utente ospite. Se disinstalli l'app perderai i tuoi dati.</Text>}
        </View>
        <View style={[styles.infoBox, { marginTop:16 }]}>
          <Text style={styles.infoBoxLabel}>CATEGORIE PERSONALIZZATE</Text>
          {customCategories.length === 0
            ? <Text style={styles.infoBoxSub}>Nessuna categoria aggiunta.</Text>
            : customCategories.map((c) => (
              <View key={c.id} style={{ flexDirection:"row", alignItems:"center", marginTop:8 }}>
                <Text style={{ fontSize:16, marginRight:8 }}>{c.emoji}</Text>
                <View style={{ width:10, height:10, borderRadius:5, backgroundColor:c.color, marginRight:8 }} />
                <Text style={{ fontSize:13, color:"#334155" }}>{c.name}</Text>
              </View>
            ))
          }
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <LogOut color="#ef4444" size={20} style={{ marginRight:8 }} />
          <Text style={styles.logoutBtnText}>Esci dall'account</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ── Main Render ───────────────────────────────────────────────────────────

  if (isAuthLoading) {
    return (
      <View style={[styles.container, { justifyContent:"center", alignItems:"center" }]}>
        <Briefcase color="#b45309" size={48} style={{ marginBottom:16 }} />
        <ActivityIndicator size="large" color="#b45309" />
      </View>
    );
  }

  if (!user) return renderAuthScreen();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={{ flex:1 }}>
        {activeTab === "calendar" && renderCalendar()}
        {activeTab === "expenses" && renderExpenses()}
        {activeTab === "reports" && renderReports()}
        {activeTab === "profile" && renderProfile()}
      </View>

      {/* Bottom Navigation */}
      <View style={[styles.bottomNav, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        {[
          { id:"calendar", label:"Lavori", Icon:Calendar, activeColor:"#b45309" },
          { id:"expenses", label:"Spese", Icon:Wallet, activeColor:"#1e293b" },
          { id:"reports",  label:"Report", Icon:TrendingUp, activeColor:"#b45309" },
          { id:"profile",  label:"Profilo", Icon:UserIcon, activeColor:"#b45309" },
        ].map(({ id, label, Icon, activeColor }) => (
          <TouchableOpacity key={id} style={styles.navItem} onPress={() => setActiveTab(id)}>
            <Icon color={activeTab===id ? activeColor : "#94a3b8"} size={24} />
            <Text style={[styles.navText, activeTab===id && { color:activeColor }]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── JOB MODAL ── */}
      <Modal visible={isJobModalOpen} animationType="slide" transparent>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS==="ios" ? "padding" : "height"}>
          <TouchableOpacity style={{ flex:1 }} activeOpacity={1} onPress={() => setShowClientSugg(false)} />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Lavoro del {selectedDay?.getDate()}</Text>
              <TouchableOpacity onPress={() => setIsJobModalOpen(false)} style={styles.closeBtn}><X color="#64748b" size={20} /></TouchableOpacity>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>CLIENTE / CANTIERE</Text>
              <TextInput
                style={styles.input}
                placeholder="Es. Mario Rossi"
                value={jobForm.client}
                onChangeText={(t) => { setJobForm({...jobForm, client:t}); setShowClientSugg(true); }}
                onFocus={() => setShowClientSugg(true)}
                onBlur={() => setTimeout(() => setShowClientSugg(false), 150)}
              />
              {showClientSugg && filteredClientSugg.length > 0 && (
                <View style={styles.suggestionList}>
                  {filteredClientSugg.map((name) => (
                    <TouchableOpacity key={name} style={styles.suggestionItem} onPress={() => { setJobForm({...jobForm, client:name}); setShowClientSugg(false); }}>
                      <Text style={styles.suggestionText}>{name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              <View style={{ flexDirection:"row", gap:12 }}>
                <View style={{ flex:1 }}>
                  <Text style={styles.inputLabel}>ORE</Text>
                  <TextInput style={styles.input} keyboardType="numeric" placeholder="8" value={jobForm.hours}
                    onFocus={() => setShowClientSugg(false)}
                    onChangeText={(t) => {
                      const h = parseFloat(t.replace(",",".")), r = parseFloat(jobForm.hourlyRate?.replace(",","."));
                      setJobForm({...jobForm, hours:t, income: (!isNaN(h)&&!isNaN(r)) ? String((r*h).toFixed(2)) : jobForm.income });
                    }} />
                </View>
                <View style={{ flex:1 }}>
                  <Text style={styles.inputLabel}>PAGA ORARIA (€)</Text>
                  <TextInput style={styles.input} keyboardType="numeric" placeholder="15" value={jobForm.hourlyRate}
                    onFocus={() => setShowClientSugg(false)}
                    onChangeText={(t) => {
                      const r = parseFloat(t.replace(",",".")), h = parseFloat(jobForm.hours?.replace(",","."));
                      setJobForm({...jobForm, hourlyRate:t, income: (!isNaN(r)&&!isNaN(h)) ? String((r*h).toFixed(2)) : jobForm.income });
                    }} />
                </View>
              </View>
              <Text style={styles.inputLabel}>COMPENSO TOTALE (€)</Text>
              <TextInput style={styles.input} keyboardType="numeric" placeholder="150" value={jobForm.income}
                onFocus={() => setShowClientSugg(false)}
                onChangeText={(t) => setJobForm({...jobForm, income:t})} />
              <TouchableOpacity style={styles.submitBtn} onPress={handleSaveJob}>
                <Text style={styles.submitBtnText}>Salva Lavoro</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── EXPENSE MODAL ── */}
      <Modal visible={isExpenseModalOpen} animationType="slide" transparent>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS==="ios" ? "padding" : "height"}>
          <TouchableOpacity style={{ flex:1 }} activeOpacity={1} />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nuova Spesa / Transazione</Text>
              <TouchableOpacity onPress={() => setIsExpenseModalOpen(false)} style={styles.closeBtn}><X color="#64748b" size={20} /></TouchableOpacity>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {/* Date picker */}
              <Text style={styles.inputLabel}>DATA</Text>
              <View style={styles.datePicker}>
                <TouchableOpacity onPress={() => { const d = new Date(expenseForm.date); d.setDate(d.getDate()-1); setExpenseForm({...expenseForm, date:d}); }}>
                  <ChevronLeft color="#475569" size={22} />
                </TouchableOpacity>
                <Text style={styles.datePickerText}>
                  {expenseForm.date.toLocaleDateString("it-IT", { day:"2-digit", month:"long", year:"numeric" })}
                </Text>
                <TouchableOpacity onPress={() => { const d = new Date(expenseForm.date); d.setDate(d.getDate()+1); setExpenseForm({...expenseForm, date:d}); }}>
                  <ChevronRight color="#475569" size={22} />
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>DESCRIZIONE</Text>
              <TextInput style={styles.input} placeholder="Es. Gasolio furgone..." value={expenseForm.description}
                onChangeText={(t) => setExpenseForm({...expenseForm, description:t})} />

              <View style={{ flexDirection:"row", gap:12 }}>
                <View style={{ flex:1 }}>
                  <Text style={styles.inputLabel}>COSTO (€)</Text>
                  <TextInput style={styles.input} keyboardType="numeric" placeholder="50" value={expenseForm.amount}
                    onChangeText={(t) => setExpenseForm({...expenseForm, amount:t})} />
                </View>
                <View style={{ flex:1 }}>
                  <Text style={styles.inputLabel}>RICAVO (€) opt.</Text>
                  <TextInput style={[styles.input, { borderColor:"#bbf7d0" }]} keyboardType="numeric" placeholder="0"
                    value={expenseForm.revenue}
                    onChangeText={(t) => setExpenseForm({...expenseForm, revenue:t})} />
                </View>
              </View>
              {expenseForm.amount && expenseForm.revenue ? (
                <Text style={{ fontSize:12, color: Number(expenseForm.revenue)-Number(expenseForm.amount)>=0 ? "#16a34a":"#ef4444", marginTop:4, marginBottom:4 }}>
                  Netto: {fmt(Number(expenseForm.revenue||0) - Number(expenseForm.amount||0))}
                </Text>
              ) : null}

              <Text style={styles.inputLabel}>CATEGORIA</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom:4 }}>
                <View style={{ flexDirection:"row", gap:8, paddingVertical:4 }}>
                  {allCategories.map((cat) => (
                    <TouchableOpacity key={cat.id || cat.name}
                      style={[styles.catChip, expenseForm.category===cat.name && { backgroundColor:cat.color, borderColor:cat.color }]}
                      onPress={() => setExpenseForm({...expenseForm, category:cat.name})}>
                      <Text style={{ fontSize:16 }}>{cat.emoji}</Text>
                      <Text style={[styles.catChipText, expenseForm.category===cat.name && { color:"white" }]}>{cat.name}</Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity style={[styles.catChip, { borderColor:"#b45309", borderStyle:"dashed" }]} onPress={() => setIsAddCatOpen(true)}>
                    <Plus color="#b45309" size={16} />
                    <Text style={[styles.catChipText, { color:"#b45309" }]}>Nuova</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>

              <TouchableOpacity style={[styles.submitBtn, { backgroundColor:"#1e293b" }]} onPress={handleSaveExpense}>
                <Text style={styles.submitBtnText}>Registra</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── ADD CATEGORY MODAL ── */}
      <Modal visible={isAddCatOpen} animationType="slide" transparent>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS==="ios" ? "padding" : "height"}>
          <TouchableOpacity style={{ flex:1 }} activeOpacity={1} onPress={() => setIsAddCatOpen(false)} />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nuova Categoria</Text>
              <TouchableOpacity onPress={() => setIsAddCatOpen(false)} style={styles.closeBtn}><X color="#64748b" size={20} /></TouchableOpacity>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>NOME</Text>
              <TextInput style={styles.input} placeholder="Es. Affitto ufficio" value={newCatName} onChangeText={setNewCatName} />

              <Text style={styles.inputLabel}>EMOJI</Text>
              <View style={{ flexDirection:"row", flexWrap:"wrap", gap:8, marginBottom:8 }}>
                {EMOJI_OPTIONS.map((e) => (
                  <TouchableOpacity key={e} onPress={() => setNewCatEmoji(e)}
                    style={[styles.emojiOption, newCatEmoji===e && { borderColor:"#b45309", backgroundColor:"#fef3c7" }]}>
                    <Text style={{ fontSize:22 }}>{e}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>COLORE</Text>
              <View style={{ flexDirection:"row", gap:10, marginBottom:8 }}>
                {COLOR_OPTIONS.map((c) => (
                  <TouchableOpacity key={c} onPress={() => setNewCatColor(c)}
                    style={[styles.colorOption, { backgroundColor:c }, newCatColor===c && styles.colorOptionSelected]}>
                    {newCatColor===c && <Text style={{ color:"white", fontSize:14, fontWeight:"bold" }}>✓</Text>}
                  </TouchableOpacity>
                ))}
              </View>

              <View style={[styles.datePicker, { justifyContent:"center", gap:12, backgroundColor:"#f8fafc", borderRadius:12, padding:12, marginBottom:8 }]}>
                <Text style={{ fontSize:24 }}>{newCatEmoji}</Text>
                <View style={{ width:16, height:16, borderRadius:8, backgroundColor:newCatColor }} />
                <Text style={{ fontSize:15, fontWeight:"600", color:"#334155" }}>{newCatName || "Anteprima"}</Text>
              </View>

              <TouchableOpacity style={[styles.submitBtn, { backgroundColor: newCatName.trim() ? "#b45309" : "#94a3b8" }]} onPress={handleAddCategory} disabled={!newCatName.trim()}>
                <Text style={styles.submitBtnText}>Salva Categoria</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex:1, backgroundColor:"#f8fafc" },
  tabContent: { flex:1, paddingBottom:70 },

  // Auth
  authContainer: { flex:1, backgroundColor:"#b45309" },
  authContent: { flex:1, justifyContent:"center", padding:24 },
  authHeader: { alignItems:"center", marginBottom:40 },
  authTitle: { fontSize:32, fontWeight:"bold", color:"white", marginBottom:8 },
  authSubtitle: { fontSize:16, color:"rgba(255,255,255,0.8)" },
  logoImage: { width:96, height:96, borderRadius:22, marginBottom:16 },
  authForm: { backgroundColor:"white", padding:24, borderRadius:24, shadowColor:"#000", shadowOpacity:0.1, shadowRadius:20, elevation:5 },
  authModeTitle: { fontSize:24, fontWeight:"bold", color:"#1e293b", marginBottom:24, textAlign:"center" },
  authErrorText: { color:"#ef4444", marginBottom:16, textAlign:"center", fontSize:14 },
  authSuccessText: { color:"#16a34a", marginBottom:16, textAlign:"center", fontSize:14 },
  authForgotBtn: { marginTop:12, alignItems:"center" },
  authForgotBtnText: { color:"#b45309", fontSize:14, fontWeight:"600" },
  inputContainer: { flexDirection:"row", alignItems:"center", backgroundColor:"#f8fafc", borderWidth:1, borderColor:"#e2e8f0", borderRadius:12, paddingHorizontal:16, marginBottom:16, height:56 },
  inputIcon: { marginRight:12 },
  authInput: { flex:1, fontSize:16, color:"#334155" },
  authPrimaryBtn: { backgroundColor:"#b45309", height:56, borderRadius:12, justifyContent:"center", alignItems:"center", marginTop:8 },
  authPrimaryBtnText: { color:"white", fontSize:16, fontWeight:"bold" },
  authToggleBtn: { marginTop:16, alignItems:"center" },
  authToggleBtnText: { color:"#64748b", fontSize:14, fontWeight:"bold" },
  authDivider: { flexDirection:"row", alignItems:"center", marginVertical:24 },
  authDividerLine: { flex:1, height:1, backgroundColor:"#e2e8f0" },
  authDividerText: { marginHorizontal:16, color:"#94a3b8", fontSize:12, fontWeight:"bold" },
  authSecondaryBtn: { backgroundColor:"#f1f5f9", height:56, borderRadius:12, justifyContent:"center", alignItems:"center" },
  authSecondaryBtnText: { color:"#475569", fontSize:16, fontWeight:"bold" },

  // App header
  header: { backgroundColor:"#b45309", padding:20, borderBottomLeftRadius:24, borderBottomRightRadius:24, paddingTop: Platform.OS==="android" ? 40 : 20 },
  headerTop: { flexDirection:"row", justifyContent:"space-between", alignItems:"center", marginBottom:20 },
  headerTitle: { color:"white", fontSize:22, fontWeight:"bold" },
  userBadge: { backgroundColor:"rgba(0,0,0,0.2)", paddingHorizontal:12, paddingVertical:4, borderRadius:16 },
  userBadgeText: { color:"white", fontSize:12, fontWeight:"bold" },
  addBtnHeader: { backgroundColor:"rgba(255,255,255,0.2)", width:36, height:36, borderRadius:18, justifyContent:"center", alignItems:"center" },
  monthSelector: { flexDirection:"row", justifyContent:"space-between", alignItems:"center", backgroundColor:"rgba(0,0,0,0.2)", borderRadius:14, padding:6 },
  monthBtn: { padding:6 },
  monthText: { color:"white", fontSize:17, fontWeight:"bold", textTransform:"capitalize" },
  statsCard: { flexDirection:"row", justifyContent:"space-between", backgroundColor:"rgba(255,255,255,0.1)", padding:14, borderRadius:14, marginTop:16 },
  statsLabel: { color:"rgba(255,255,255,0.7)", fontSize:10, fontWeight:"bold" },
  statsValue: { color:"white", fontSize:18, fontWeight:"bold" },

  // Calendar
  calendarContainer: { padding:12 },
  weekDaysRow: { flexDirection:"row", marginBottom:6 },
  weekDayText: { flex:1, textAlign:"center", fontSize:11, fontWeight:"bold", color:"#94a3b8" },
  daysGrid: { flexDirection:"row", flexWrap:"wrap" },
  dayCellEmpty: { width:"14.28%", height:64, padding:3 },
  dayCell: { width:"14.28%", height:64, padding:3, borderWidth:1, borderColor:"#f1f5f9", backgroundColor:"white", borderRadius:8 },
  dayCellToday: { backgroundColor:"#fef3c7", borderColor:"#fcd34d" },
  dayCellSelected: { backgroundColor:"#1e293b", borderColor:"#1e293b" },
  dayText: { fontSize:11, fontWeight:"bold", color:"#64748b" },
  dayTextToday: { color:"#b45309" },
  jobsListPreview: { flex:1, marginTop:2, overflow:"hidden" },
  jobBadge: { backgroundColor:"#d97706", borderRadius:3, paddingHorizontal:3, paddingVertical:1, marginBottom:1 },
  jobBadgeText: { color:"white", fontSize:7 },

  // Expense dots
  expDotRed: { width:6, height:6, borderRadius:3, backgroundColor:"#ef4444" },
  expDotGreen: { width:6, height:6, borderRadius:3, backgroundColor:"#22c55e" },

  // Expense list
  expensesTitleRow: { flexDirection:"row", justifyContent:"space-between", alignItems:"center", marginBottom:12 },
  expensesTitle: { fontSize:16, fontWeight:"bold", color:"#334155" },
  emptyState: { alignItems:"center", marginTop:32 },
  emptyStateText: { color:"#94a3b8", marginTop:10, textAlign:"center" },
  expenseItem: { flexDirection:"row", alignItems:"center", backgroundColor:"white", padding:14, borderRadius:14, marginBottom:10, shadowColor:"#000", shadowOpacity:0.04, shadowRadius:8, elevation:2 },
  catEmojiWrapper: { width:44, height:44, borderRadius:22, justifyContent:"center", alignItems:"center" },
  expenseDesc: { fontWeight:"bold", color:"#1e293b", fontSize:14 },
  expenseDate: { fontSize:12, color:"#94a3b8", marginTop:2 },
  expenseAmount: { fontWeight:"bold", color:"#ef4444" },
  deleteText: { fontSize:11, color:"#94a3b8", marginTop:3 },

  // Profile
  profileContainer: { padding:24, alignItems:"center", marginTop:32 },
  avatarWrapper: { width:96, height:96, borderRadius:48, backgroundColor:"#fef3c7", justifyContent:"center", alignItems:"center", marginBottom:14 },
  profileName: { fontSize:22, fontWeight:"bold", color:"#1e293b" },
  profileRole: { fontSize:15, color:"#64748b", marginBottom:28 },
  infoBox: { backgroundColor:"#f1f5f9", width:"100%", padding:18, borderRadius:14 },
  infoBoxLabel: { fontSize:10, fontWeight:"bold", color:"#94a3b8", marginBottom:4 },
  infoBoxValue: { fontSize:14, fontWeight:"bold", color:"#334155" },
  infoBoxSub: { fontSize:12, color:"#64748b", marginTop:6 },
  logoutBtn: { flexDirection:"row", alignItems:"center", backgroundColor:"#fee2e2", paddingHorizontal:24, paddingVertical:12, borderRadius:12, marginTop:28 },
  logoutBtnText: { color:"#ef4444", fontWeight:"bold", fontSize:15 },

  // Bottom nav
  bottomNav: { position:"absolute", bottom:0, left:0, right:0, flexDirection:"row", backgroundColor:"white", paddingTop:10, borderTopWidth:1, borderTopColor:"#f1f5f9" },
  navItem: { flex:1, alignItems:"center" },
  navText: { fontSize:9, marginTop:3, fontWeight:"bold", color:"#94a3b8" },

  // Modals
  modalOverlay: { flex:1, backgroundColor:"rgba(0,0,0,0.5)", justifyContent:"flex-end" },
  modalContent: { backgroundColor:"white", borderTopLeftRadius:24, borderTopRightRadius:24, padding:22, paddingBottom: Platform.OS==="ios" ? 40 : 22, maxHeight:"92%" },
  modalHeader: { flexDirection:"row", justifyContent:"space-between", alignItems:"center", marginBottom:20 },
  modalTitle: { fontSize:18, fontWeight:"bold", color:"#1e293b" },
  closeBtn: { backgroundColor:"#f1f5f9", width:32, height:32, borderRadius:16, justifyContent:"center", alignItems:"center" },
  inputLabel: { fontSize:10, fontWeight:"bold", color:"#94a3b8", marginBottom:6, marginTop:14 },
  input: { backgroundColor:"#f8fafc", borderWidth:1, borderColor:"#e2e8f0", borderRadius:12, padding:14, fontSize:15 },

  // Date picker
  datePicker: { flexDirection:"row", alignItems:"center", justifyContent:"space-between", backgroundColor:"#f8fafc", borderWidth:1, borderColor:"#e2e8f0", borderRadius:12, paddingHorizontal:12, paddingVertical:10 },
  datePickerText: { fontSize:14, fontWeight:"600", color:"#334155" },

  // Category chips (horizontal scroll)
  catChip: { flexDirection:"row", alignItems:"center", gap:5, paddingHorizontal:12, paddingVertical:8, borderRadius:20, backgroundColor:"#f8fafc", borderWidth:1.5, borderColor:"#e2e8f0" },
  catChipText: { fontSize:12, fontWeight:"600", color:"#475569" },

  // Client suggestions
  suggestionList: { backgroundColor:"white", borderWidth:1, borderColor:"#e2e8f0", borderRadius:12, marginTop:4, overflow:"hidden", elevation:4 },
  suggestionItem: { paddingHorizontal:16, paddingVertical:11, borderBottomWidth:1, borderBottomColor:"#f1f5f9" },
  suggestionText: { fontSize:14, color:"#334155" },

  // Submit
  submitBtn: { backgroundColor:"#d97706", padding:15, borderRadius:12, alignItems:"center", marginTop:20, marginBottom:6, flexDirection:"row", justifyContent:"center" },
  submitBtnText: { color:"white", fontWeight:"bold", fontSize:15 },

  // Add category modal
  emojiOption: { width:44, height:44, borderRadius:10, justifyContent:"center", alignItems:"center", borderWidth:2, borderColor:"#e2e8f0", backgroundColor:"#f8fafc" },
  colorOption: { width:36, height:36, borderRadius:18, justifyContent:"center", alignItems:"center" },
  colorOptionSelected: { borderWidth:3, borderColor:"white", shadowColor:"#000", shadowOpacity:0.3, shadowRadius:4, elevation:4 },

  // Reports dashboard
  reportDashCard: { flexDirection:"row", alignItems:"center", backgroundColor:"white", borderRadius:16, padding:16, marginBottom:12, shadowColor:"#000", shadowOpacity:0.04, shadowRadius:8, elevation:2 },
  reportDashIcon: { width:48, height:48, borderRadius:14, justifyContent:"center", alignItems:"center" },
  reportDashTitle: { fontSize:15, fontWeight:"bold", color:"#1e293b", marginBottom:3 },
  reportDashDesc: { fontSize:12, color:"#94a3b8" },

  // Report pages
  periodFilterRow: { flexDirection:"row", gap:8 },
  periodChipLight: { flex:1, paddingVertical:8, borderRadius:20, backgroundColor:"#f1f5f9", alignItems:"center" },
  periodChipLightActive: { backgroundColor:"#1e293b" },
  periodChipLightText: { color:"#64748b", fontSize:12, fontWeight:"bold" },
  reportCardsRow: { flexDirection:"row", gap:12, marginBottom:12 },
  reportCard: { flex:1, padding:14, borderRadius:14, borderWidth:1 },
  reportCardFull: { padding:14, borderRadius:14, borderWidth:1 },
  reportCardLabel: { fontSize:10, fontWeight:"bold", color:"#64748b", marginBottom:4 },
  reportCardValue: { fontSize:18, fontWeight:"bold" },
  reportCardValueLarge: { fontSize:26, fontWeight:"bold" },
  reportSection: { backgroundColor:"white", borderRadius:14, padding:14, shadowColor:"#000", shadowOpacity:0.04, shadowRadius:6, elevation:2 },
  reportSectionTitle: { fontSize:14, fontWeight:"bold", color:"#1e293b" },

  // Client bars
  clientCardItem: { flexDirection:"row", alignItems:"center", backgroundColor:"white", borderRadius:14, padding:14, marginBottom:10, shadowColor:"#000", shadowOpacity:0.04, shadowRadius:6, elevation:2 },
  clientRankBadge: { width:22, height:22, borderRadius:11, justifyContent:"center", alignItems:"center" },
  clientRankText: { color:"white", fontSize:11, fontWeight:"bold" },
  clientName: { fontSize:14, fontWeight:"600", color:"#334155", flex:1 },
  clientBarBg: { height:5, backgroundColor:"#f1f5f9", borderRadius:3, marginTop:5 },
  clientBar: { height:5, backgroundColor:"#b45309", borderRadius:3 },

  // Period chips for header (dark bg)
  periodChip: { flex:1, paddingVertical:7, borderRadius:18, backgroundColor:"rgba(255,255,255,0.15)", alignItems:"center" },
  periodChipActive: { backgroundColor:"white" },
  periodChipText: { color:"rgba(255,255,255,0.8)", fontSize:11, fontWeight:"bold" },
  periodChipTextActive: { color:"#0f172a" },
});
