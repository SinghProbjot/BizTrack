import {
  Briefcase,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Hammer,
  Lock,
  LogOut,
  Mail,
  Plus,
  Truck,
  User as UserIcon,
  Wallet,
  Wrench,
  X,
} from "lucide-react-native";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// --- FIREBASE IMPORTS ---
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";
import { initializeApp } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  getReactNativePersistence,
  initializeAuth,
  onAuthStateChanged,
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
import firebaseConfig from "../credentials.json";

const app = initializeApp(firebaseConfig);
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage),
});
const db = getFirestore(app);
const APP_ID = "biztrack-app";

export default function App() {
  const [activeTab, setActiveTab] = useState("calendar");

  // --- FIREBASE AUTH STATE ---
  const [user, setUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Auth Form State
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [isProcessingAuth, setIsProcessingAuth] = useState(false);

  // --- DATA STATE ---
  const [jobs, setJobs] = useState([]);
  const [expenses, setExpenses] = useState([]);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);

  const [jobForm, setJobForm] = useState({
    client: "",
    hours: "",
    hourlyRate: "",
    income: "",
  });
  const [expenseForm, setExpenseForm] = useState({
    description: "",
    amount: "",
    category: "Furgone",
  });

  // --- HELPERS ---
  const formatCurrency = (amount) => `€ ${Number(amount || 0).toFixed(2)}`;
  const getDaysInMonth = (year, month) =>
    new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => {
    let day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1;
  };

  // --- FIREBASE SETUP (AUTH LISTENER & FETCH) ---
  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  React.useEffect(() => {
    if (!user) {
      setJobs([]);
      setExpenses([]);
      return;
    }

    const jobsRef = collection(
      db,
      "artifacts",
      APP_ID,
      "users",
      user.uid,
      "jobs",
    );
    const expensesRef = collection(
      db,
      "artifacts",
      APP_ID,
      "users",
      user.uid,
      "expenses",
    );

    const unsubJobs = onSnapshot(
      query(jobsRef),
      (snapshot) => {
        const jobsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setJobs(jobsData);
      },
      (error) => console.error("Errore fetch jobs:", error),
    );

    const unsubExpenses = onSnapshot(
      query(expensesRef),
      (snapshot) => {
        const expData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setExpenses(expData);
      },
      (error) => console.error("Errore fetch expenses:", error),
    );

    return () => {
      unsubJobs();
      unsubExpenses();
    };
  }, [user]);

  // --- AUTH ACTIONS ---
  const handleEmailAuth = async () => {
    if (!email || !password) {
      setAuthError("Inserisci email e password.");
      return;
    }
    setIsProcessingAuth(true);
    setAuthError("");
    try {
      if (isRegistering) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (error) {
      // Traduzione base degli errori più comuni di Firebase
      if (error.code === "auth/invalid-email")
        setAuthError("Formato email non valido.");
      else if (
        error.code === "auth/user-not-found" ||
        error.code === "auth/wrong-password" ||
        error.code === "auth/invalid-credential"
      )
        setAuthError("Email o password errati.");
      else if (error.code === "auth/email-already-in-use")
        setAuthError("Questa email è già registrata.");
      else if (error.code === "auth/weak-password")
        setAuthError("La password deve essere di almeno 6 caratteri.");
      else setAuthError("Errore durante l'autenticazione. Riprova.");
    } finally {
      setIsProcessingAuth(false);
    }
  };

  const handleGuestLogin = async () => {
    setIsProcessingAuth(true);
    setAuthError("");
    try {
      await signInAnonymously(auth);
    } catch (error) {
      setAuthError("Errore nell'accesso ospite.");
    } finally {
      setIsProcessingAuth(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Errore logout:", error);
    }
  };

  // --- DERIVED DATA ---
  const currentMonthJobs = useMemo(() => {
    const month = currentDate.getMonth();
    const year = currentDate.getFullYear();
    return jobs.filter((job) => {
      const jobDate = new Date(job.date);
      return jobDate.getMonth() === month && jobDate.getFullYear() === year;
    });
  }, [jobs, currentDate]);

  const currentMonthExpenses = useMemo(() => {
    const month = currentDate.getMonth();
    const year = currentDate.getFullYear();
    return expenses.filter((exp) => {
      const expDate = new Date(exp.date);
      return expDate.getMonth() === month && expDate.getFullYear() === year;
    });
  }, [expenses, currentDate]);

  const totalIncome = currentMonthJobs.reduce(
    (acc, curr) => acc + Number(curr.income || 0),
    0,
  );
  const totalExpenses = currentMonthExpenses.reduce(
    (acc, curr) => acc + Number(curr.amount || 0),
    0,
  );

  // --- ACTIONS ---
  const changeMonth = (offset) => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1),
    );
  };

  const openJobModal = (day) => {
    setSelectedDay(
      new Date(currentDate.getFullYear(), currentDate.getMonth(), day),
    );
    setJobForm({ client: "", hours: "", hourlyRate: "", income: "" });
    setIsJobModalOpen(true);
  };

  const handleSaveJob = async () => {
    if (!user || !selectedDay) return;
    const dateStr = `${selectedDay.getFullYear()}-${String(selectedDay.getMonth() + 1).padStart(2, "0")}-${String(selectedDay.getDate()).padStart(2, "0")}`;
    const jobId = Math.random().toString(36).substring(2, 15);

    try {
      await setDoc(
        doc(db, "artifacts", APP_ID, "users", user.uid, "jobs", jobId),
        {
          date: dateStr,
          client: jobForm.client,
          hours: Number(jobForm.hours?.replace(",", ".") || 0),
          hourlyRate: jobForm.hourlyRate
            ? Number(jobForm.hourlyRate.replace(",", "."))
            : null,
          income: Number(jobForm.income?.replace(",", ".") || 0),
          createdAt: new Date().toISOString(),
        },
      );
      setIsJobModalOpen(false);
    } catch (error) {
      console.error("Errore salvataggio lavoro:", error);
    }
  };

  const handleSaveExpense = async () => {
    if (!user) return;
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const expenseId = Math.random().toString(36).substring(2, 15);

    try {
      await setDoc(
        doc(db, "artifacts", APP_ID, "users", user.uid, "expenses", expenseId),
        {
          date: dateStr,
          description: expenseForm.description,
          amount: Number(expenseForm.amount),
          category: expenseForm.category,
          createdAt: new Date().toISOString(),
        },
      );
      setIsExpenseModalOpen(false);
      setExpenseForm({ description: "", amount: "", category: "Furgone" });
    } catch (error) {
      console.error("Errore salvataggio spesa:", error);
    }
  };

  const handleDeleteJob = async (id) => {
    if (!user) return;
    try {
      await deleteDoc(
        doc(db, "artifacts", APP_ID, "users", user.uid, "jobs", id),
      );
    } catch (error) {
      console.error("Errore eliminazione:", error);
    }
  };

  const handleDeleteExpense = async (id) => {
    if (!user) return;
    try {
      await deleteDoc(
        doc(db, "artifacts", APP_ID, "users", user.uid, "expenses", id),
      );
    } catch (error) {
      console.error("Errore eliminazione:", error);
    }
  };

  // --- RENDERERS ---
  const renderAuthScreen = () => (
    <SafeAreaView style={styles.authContainer}>
      <View style={styles.authContent}>
        <View style={styles.authHeader}>
          <View style={styles.authIconWrapper}>
            <Briefcase color="white" size={40} />
          </View>
          <Text style={styles.authTitle}>BizTrack</Text>
          <Text style={styles.authSubtitle}>
            Gestisci il tuo lavoro, ovunque.
          </Text>
        </View>

        <View style={styles.authForm}>
          <Text style={styles.authModeTitle}>
            {isRegistering ? "Crea un Account" : "Bentornato"}
          </Text>

          {authError ? (
            <Text style={styles.authErrorText}>{authError}</Text>
          ) : null}

          <View style={styles.inputContainer}>
            <Mail color="#94a3b8" size={20} style={styles.inputIcon} />
            <TextInput
              style={styles.authInput}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputContainer}>
            <Lock color="#94a3b8" size={20} style={styles.inputIcon} />
            <TextInput
              style={styles.authInput}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={styles.authPrimaryBtn}
            onPress={handleEmailAuth}
            disabled={isProcessingAuth}
          >
            {isProcessingAuth ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.authPrimaryBtnText}>
                {isRegistering ? "Registrati" : "Accedi"}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.authToggleBtn}
            onPress={() => {
              setIsRegistering(!isRegistering);
              setAuthError("");
            }}
          >
            <Text style={styles.authToggleBtnText}>
              {isRegistering
                ? "Hai già un account? Accedi"
                : "Non hai un account? Registrati"}
            </Text>
          </TouchableOpacity>

          <View style={styles.authDivider}>
            <View style={styles.authDividerLine} />
            <Text style={styles.authDividerText}>OPPURE</Text>
            <View style={styles.authDividerLine} />
          </View>

          <TouchableOpacity
            style={styles.authSecondaryBtn}
            onPress={handleGuestLogin}
            disabled={isProcessingAuth}
          >
            <Text style={styles.authSecondaryBtnText}>
              Continua come Ospite
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );

  const renderCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);

    const days = [];
    const monthNames = [
      "Gennaio",
      "Febbraio",
      "Marzo",
      "Aprile",
      "Maggio",
      "Giugno",
      "Luglio",
      "Agosto",
      "Settembre",
      "Ottobre",
      "Novembre",
      "Dicembre",
    ];
    const dayNames = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];

    for (let i = 0; i < firstDay; i++) {
      days.push(<View key={`empty-${i}`} style={styles.dayCellEmpty} />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const dayJobs = currentMonthJobs.filter((j) => j.date === dateStr);
      const isToday =
        new Date().toDateString() === new Date(year, month, day).toDateString();

      days.push(
        <TouchableOpacity
          key={day}
          onPress={() => openJobModal(day)}
          style={[styles.dayCell, isToday && styles.dayCellToday]}
        >
          <Text style={[styles.dayText, isToday && styles.dayTextToday]}>
            {day}
          </Text>
          <View style={styles.jobsListPreview}>
            {dayJobs.map((job) => (
              <View key={job.id} style={styles.jobBadge}>
                <Text style={styles.jobBadgeText} numberOfLines={1}>
                  {job.client}
                </Text>
              </View>
            ))}
          </View>
        </TouchableOpacity>,
      );
    }

    return (
      <View style={styles.tabContent}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Briefcase color="white" size={24} style={{ marginRight: 8 }} />
              <Text style={styles.headerTitle}>BizTrack</Text>
            </View>
            <View style={styles.userBadge}>
              <Text style={styles.userBadgeText}>
                {user?.isAnonymous ? "Ospite" : "PRO"}
              </Text>
            </View>
          </View>

          <View style={styles.monthSelector}>
            <TouchableOpacity
              onPress={() => changeMonth(-1)}
              style={styles.monthBtn}
            >
              <ChevronLeft color="white" size={24} />
            </TouchableOpacity>
            <Text style={styles.monthText}>
              {monthNames[month]} {year}
            </Text>
            <TouchableOpacity
              onPress={() => changeMonth(1)}
              style={styles.monthBtn}
            >
              <ChevronRight color="white" size={24} />
            </TouchableOpacity>
          </View>

          <View style={styles.statsCard}>
            <View>
              <Text style={styles.statsLabel}>ENTRATE MESE</Text>
              <Text style={styles.statsValue}>
                {formatCurrency(totalIncome)}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.statsLabel}>ORE MESE</Text>
              <Text style={styles.statsValue}>
                {currentMonthJobs.reduce((acc, curr) => acc + curr.hours, 0)} h
              </Text>
            </View>
          </View>
        </View>

        <ScrollView style={styles.calendarContainer}>
          <View style={styles.weekDaysRow}>
            {dayNames.map((d) => (
              <Text key={d} style={styles.weekDayText}>
                {d}
              </Text>
            ))}
          </View>
          <View style={styles.daysGrid}>{days}</View>
        </ScrollView>
      </View>
    );
  };

  const renderExpenses = () => (
    <View style={styles.tabContent}>
      <View style={[styles.header, { backgroundColor: "#1e293b" }]}>
        <View style={styles.headerTop}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Wallet color="white" size={24} style={{ marginRight: 8 }} />
            <Text style={styles.headerTitle}>Spese & Finanze</Text>
          </View>
        </View>

        <View style={styles.financesGrid}>
          <View
            style={[
              styles.financeBox,
              {
                backgroundColor: "rgba(34, 197, 94, 0.2)",
                borderColor: "rgba(34, 197, 94, 0.3)",
              },
            ]}
          >
            <Text style={[styles.statsLabel, { color: "#86efac" }]}>
              ENTRATE TOTALI
            </Text>
            <Text style={[styles.statsValue, { color: "#4ade80" }]}>
              {formatCurrency(totalIncome)}
            </Text>
          </View>
          <View
            style={[
              styles.financeBox,
              {
                backgroundColor: "rgba(239, 68, 68, 0.2)",
                borderColor: "rgba(239, 68, 68, 0.3)",
              },
            ]}
          >
            <Text style={[styles.statsLabel, { color: "#fca5a5" }]}>
              SPESE TOTALI
            </Text>
            <Text style={[styles.statsValue, { color: "#f87171" }]}>
              {formatCurrency(totalExpenses)}
            </Text>
          </View>
        </View>

        <View style={styles.netIncomeBox}>
          <Text style={{ color: "#cbd5e1", fontWeight: "bold" }}>
            Utile Netto
          </Text>
          <Text
            style={[
              styles.statsValue,
              {
                color: totalIncome - totalExpenses >= 0 ? "#4ade80" : "#f87171",
              },
            ]}
          >
            {formatCurrency(totalIncome - totalExpenses)}
          </Text>
        </View>
      </View>

      <View style={styles.expensesContainer}>
        <View style={styles.expensesTitleRow}>
          <Text style={styles.expensesTitle}>Spese del Mese</Text>
          <TouchableOpacity
            onPress={() => setIsExpenseModalOpen(true)}
            style={styles.addBtn}
          >
            <Plus color="white" size={20} />
          </TouchableOpacity>
        </View>

        <ScrollView>
          {currentMonthExpenses.length === 0 ? (
            <View style={styles.emptyState}>
              <Wallet color="#cbd5e1" size={48} />
              <Text style={styles.emptyStateText}>
                Nessuna spesa registrata.
              </Text>
            </View>
          ) : (
            currentMonthExpenses.map((exp) => (
              <View key={exp.id} style={styles.expenseItem}>
                <View style={styles.expenseItemLeft}>
                  <View style={styles.expenseIconWrapper}>
                    {exp.category === "Furgone" ? (
                      <Truck color="#475569" size={20} />
                    ) : exp.category === "Materiale" ? (
                      <Hammer color="#475569" size={20} />
                    ) : (
                      <Wrench color="#475569" size={20} />
                    )}
                  </View>
                  <View>
                    <Text style={styles.expenseDesc}>{exp.description}</Text>
                    <Text style={styles.expenseDate}>
                      {new Date(exp.date).toLocaleDateString("it-IT")}
                    </Text>
                  </View>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.expenseAmount}>
                    -{formatCurrency(exp.amount)}
                  </Text>
                  <TouchableOpacity onPress={() => handleDeleteExpense(exp.id)}>
                    <Text style={styles.deleteText}>Elimina</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </View>
    </View>
  );

  const renderProfile = () => (
    <View style={styles.tabContent}>
      <View style={styles.profileContainer}>
        <View style={styles.avatarWrapper}>
          <UserIcon color="#b45309" size={48} />
        </View>
        <Text style={styles.profileName}>
          {user?.isAnonymous ? "Utente Ospite" : "Il tuo Profilo"}
        </Text>
        <Text style={styles.profileRole}>
          {user?.email || "Account Temporaneo"}
        </Text>

        <View style={styles.infoBox}>
          <Text style={styles.infoBoxLabel}>STATO ACCOUNT</Text>
          <Text style={styles.infoBoxValue}>Connesso a Firebase</Text>
          <Text
            style={[
              styles.infoBoxSub,
              { marginTop: 4, fontFamily: "monospace", fontSize: 10 },
            ]}
          >
            ID: {user?.uid}
          </Text>
          {user?.isAnonymous && (
            <Text
              style={[styles.infoBoxSub, { color: "#ef4444", marginTop: 12 }]}
            >
              Attenzione: sei un utente ospite. Se disinstalli l'app perderai i
              tuoi dati.
            </Text>
          )}
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <LogOut color="#ef4444" size={20} style={{ marginRight: 8 }} />
          <Text style={styles.logoutBtnText}>Esci dall'account</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // --- MAIN RENDER LOGIC ---
  if (isAuthLoading) {
    return (
      <View
        style={[
          styles.container,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <Briefcase color="#b45309" size={48} style={{ marginBottom: 16 }} />
        <ActivityIndicator size="large" color="#b45309" />
      </View>
    );
  }

  // Se l'utente non è loggato, mostra la schermata di Login
  if (!user) {
    return renderAuthScreen();
  }

  // Altrimenti mostra l'app
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Tab Content */}
      <View style={{ flex: 1 }}>
        {activeTab === "calendar" && renderCalendar()}
        {activeTab === "expenses" && renderExpenses()}
        {activeTab === "profile" && renderProfile()}
      </View>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setActiveTab("calendar")}
        >
          <Calendar
            color={activeTab === "calendar" ? "#b45309" : "#94a3b8"}
            size={24}
          />
          <Text
            style={[
              styles.navText,
              activeTab === "calendar" && { color: "#b45309" },
            ]}
          >
            Lavori
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setActiveTab("expenses")}
        >
          <Wallet
            color={activeTab === "expenses" ? "#1e293b" : "#94a3b8"}
            size={24}
          />
          <Text
            style={[
              styles.navText,
              activeTab === "expenses" && { color: "#1e293b" },
            ]}
          >
            Spese
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setActiveTab("profile")}
        >
          <UserIcon
            color={activeTab === "profile" ? "#b45309" : "#94a3b8"}
            size={24}
          />
          <Text
            style={[
              styles.navText,
              activeTab === "profile" && { color: "#b45309" },
            ]}
          >
            Profilo
          </Text>
        </TouchableOpacity>
      </View>

      {/* JOB MODAL */}
      <Modal visible={isJobModalOpen} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Lavoro del {selectedDay?.getDate()}
              </Text>
              <TouchableOpacity
                onPress={() => setIsJobModalOpen(false)}
                style={styles.closeBtn}
              >
                <X color="#64748b" size={20} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>CLIENTE / CANTIERE</Text>
            <TextInput
              style={styles.input}
              placeholder="Es. Mario Rossi"
              value={jobForm.client}
              onChangeText={(t) => setJobForm({ ...jobForm, client: t })}
            />

            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>ORE</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  placeholder="8"
                  value={jobForm.hours}
                  onChangeText={(t) => {
                    const newHours = t.replace(",", ".");
                    const rateNum = parseFloat(
                      jobForm.hourlyRate?.replace(",", "."),
                    );
                    const hoursNum = parseFloat(newHours);
                    let newIncome = jobForm.income;
                    if (!isNaN(rateNum) && !isNaN(hoursNum)) {
                      newIncome = (rateNum * hoursNum).toFixed(2);
                    }
                    setJobForm({
                      ...jobForm,
                      hours: t,
                      income: newIncome ? String(newIncome) : "",
                    });
                  }}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>PAGA ORARIA (€)</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  placeholder="15"
                  value={jobForm.hourlyRate}
                  onChangeText={(t) => {
                    const newRate = t.replace(",", ".");
                    const hoursNum = parseFloat(
                      jobForm.hours?.replace(",", "."),
                    );
                    const rateNum = parseFloat(newRate);
                    let newIncome = jobForm.income;
                    if (!isNaN(rateNum) && !isNaN(hoursNum)) {
                      newIncome = (rateNum * hoursNum).toFixed(2);
                    }
                    setJobForm({
                      ...jobForm,
                      hourlyRate: t,
                      income: newIncome ? String(newIncome) : "",
                    });
                  }}
                />
              </View>
            </View>

            <Text style={styles.inputLabel}>COMPENSO TOTALE (€)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              placeholder="150"
              value={jobForm.income}
              onChangeText={(t) => setJobForm({ ...jobForm, income: t })}
            />

            <TouchableOpacity style={styles.submitBtn} onPress={handleSaveJob}>
              <Text style={styles.submitBtnText}>Salva Lavoro</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* EXPENSE MODAL */}
      <Modal
        visible={isExpenseModalOpen}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nuova Spesa</Text>
              <TouchableOpacity
                onPress={() => setIsExpenseModalOpen(false)}
                style={styles.closeBtn}
              >
                <X color="#64748b" size={20} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>DESCRIZIONE</Text>
            <TextInput
              style={styles.input}
              placeholder="Es. Gasolio..."
              value={expenseForm.description}
              onChangeText={(t) =>
                setExpenseForm({ ...expenseForm, description: t })
              }
            />

            <Text style={styles.inputLabel}>IMPORTO (€)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              placeholder="50"
              value={expenseForm.amount}
              onChangeText={(t) =>
                setExpenseForm({ ...expenseForm, amount: t })
              }
            />

            <Text style={styles.inputLabel}>CATEGORIA</Text>
            <View style={styles.categoryChips}>
              {["Furgone", "Materiale", "Altro"].map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.chip,
                    expenseForm.category === cat && styles.chipActive,
                  ]}
                  onPress={() =>
                    setExpenseForm({ ...expenseForm, category: cat })
                  }
                >
                  <Text
                    style={[
                      styles.chipText,
                      expenseForm.category === cat && styles.chipTextActive,
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: "#1e293b" }]}
              onPress={handleSaveExpense}
            >
              <Text style={styles.submitBtnText}>Registra Spesa</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// --- STYLES ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  tabContent: { flex: 1, paddingBottom: 70 },

  // --- AUTH STYLES ---
  authContainer: { flex: 1, backgroundColor: "#b45309" },
  authContent: { flex: 1, justifyContent: "center", padding: 24 },
  authHeader: { alignItems: "center", marginBottom: 40 },
  authIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  authTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: "white",
    marginBottom: 8,
  },
  authSubtitle: { fontSize: 16, color: "rgba(255,255,255,0.8)" },
  authForm: {
    backgroundColor: "white",
    padding: 24,
    borderRadius: 24,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  authModeTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 24,
    textAlign: "center",
  },
  authErrorText: {
    color: "#ef4444",
    marginBottom: 16,
    textAlign: "center",
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    height: 56,
  },
  inputIcon: { marginRight: 12 },
  authInput: { flex: 1, fontSize: 16, color: "#334155" },
  authPrimaryBtn: {
    backgroundColor: "#b45309",
    height: 56,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  authPrimaryBtnText: { color: "white", fontSize: 16, fontWeight: "bold" },
  authToggleBtn: { marginTop: 16, alignItems: "center" },
  authToggleBtnText: { color: "#64748b", fontSize: 14, fontWeight: "bold" },
  authDivider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
  },
  authDividerLine: { flex: 1, height: 1, backgroundColor: "#e2e8f0" },
  authDividerText: {
    marginHorizontal: 16,
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: "bold",
  },
  authSecondaryBtn: {
    backgroundColor: "#f1f5f9",
    height: 56,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  authSecondaryBtnText: { color: "#475569", fontSize: 16, fontWeight: "bold" },

  // --- APP STYLES ---
  header: {
    backgroundColor: "#b45309",
    padding: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    paddingTop: Platform.OS === "android" ? 40 : 20,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  headerTitle: { color: "white", fontSize: 24, fontWeight: "bold" },
  userBadge: {
    backgroundColor: "rgba(0,0,0,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  userBadgeText: { color: "white", fontSize: 12, fontWeight: "bold" },

  monthSelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.2)",
    borderRadius: 16,
    padding: 8,
  },
  monthBtn: { padding: 8 },
  monthText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    textTransform: "capitalize",
  },

  statsCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "rgba(255,255,255,0.1)",
    padding: 16,
    borderRadius: 16,
    marginTop: 24,
  },
  statsLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 10,
    fontWeight: "bold",
  },
  statsValue: { color: "white", fontSize: 20, fontWeight: "bold" },

  calendarContainer: { padding: 16 },
  weekDaysRow: { flexDirection: "row", marginBottom: 8 },
  weekDayText: {
    flex: 1,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "bold",
    color: "#94a3b8",
  },
  daysGrid: { flexDirection: "row", flexWrap: "wrap" },

  dayCellEmpty: { width: "14.28%", height: 70, padding: 4 },
  dayCell: {
    width: "14.28%",
    height: 70,
    padding: 4,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    backgroundColor: "white",
    borderRadius: 8,
  },
  dayCellToday: { backgroundColor: "#fef3c7", borderColor: "#fcd34d" },
  dayText: { fontSize: 12, fontWeight: "bold", color: "#64748b" },
  dayTextToday: { color: "#b45309" },

  jobsListPreview: { flex: 1, marginTop: 2, overflow: "hidden" },
  jobBadge: {
    backgroundColor: "#d97706",
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
    marginBottom: 2,
  },
  jobBadgeText: { color: "white", fontSize: 8 },

  financesGrid: { flexDirection: "row", gap: 12 },
  financeBox: { flex: 1, padding: 16, borderRadius: 16, borderWidth: 1 },
  netIncomeBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    padding: 16,
    borderRadius: 16,
    marginTop: 16,
  },

  expensesContainer: { padding: 20, flex: 1 },
  expensesTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  expensesTitle: { fontSize: 18, fontWeight: "bold", color: "#334155" },
  addBtn: {
    backgroundColor: "#1e293b",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },

  emptyState: { alignItems: "center", marginTop: 40 },
  emptyStateText: { color: "#94a3b8", marginTop: 12 },

  expenseItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "white",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  expenseItemLeft: { flexDirection: "row", alignItems: "center" },
  expenseIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  expenseDesc: { fontWeight: "bold", color: "#1e293b" },
  expenseDate: { fontSize: 12, color: "#94a3b8" },
  expenseAmount: { fontWeight: "bold", color: "#ef4444" },
  deleteText: { fontSize: 12, color: "#94a3b8", marginTop: 4 },

  profileContainer: { padding: 24, alignItems: "center", marginTop: 40 },
  avatarWrapper: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#fef3c7",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  profileName: { fontSize: 24, fontWeight: "bold", color: "#1e293b" },
  profileRole: { fontSize: 16, color: "#64748b", marginBottom: 32 },
  infoBox: {
    backgroundColor: "#f1f5f9",
    width: "100%",
    padding: 20,
    borderRadius: 16,
  },
  infoBoxLabel: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#94a3b8",
    marginBottom: 4,
  },
  infoBoxValue: { fontSize: 14, fontWeight: "bold", color: "#334155" },
  infoBoxSub: { fontSize: 12, color: "#64748b", marginTop: 8 },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fee2e2",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 32,
  },
  logoutBtnText: { color: "#ef4444", fontWeight: "bold", fontSize: 16 },

  bottomNav: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    backgroundColor: "white",
    paddingBottom: Platform.OS === "ios" ? 24 : 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  navItem: { flex: 1, alignItems: "center" },
  navText: { fontSize: 10, marginTop: 4, fontWeight: "bold", color: "#94a3b8" },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "white",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  modalTitle: { fontSize: 20, fontWeight: "bold", color: "#1e293b" },
  closeBtn: {
    backgroundColor: "#f1f5f9",
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },

  inputLabel: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#94a3b8",
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
  },

  categoryChips: { flexDirection: "row", gap: 8 },
  chip: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    alignItems: "center",
  },
  chipActive: { backgroundColor: "#1e293b", borderColor: "#1e293b" },
  chipText: { fontSize: 12, fontWeight: "bold", color: "#64748b" },
  chipTextActive: { color: "white" },

  submitBtn: {
    backgroundColor: "#d97706",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 24,
  },
  submitBtnText: { color: "white", fontWeight: "bold", fontSize: 16 },
});
