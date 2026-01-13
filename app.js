import { initializeApp } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js";
import { 
    getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, 
    signOut, GoogleAuthProvider, signInWithPopup, updateProfile 
} from "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js";
import { 
    getFirestore, collection, addDoc, query, where, onSnapshot, deleteDoc, 
    doc, orderBy, setDoc, getDoc, updateDoc, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";

// ============================================================================
// CONFIGURATION & INITIALIZATION
// ============================================================================

const firebaseConfig = {
    apiKey: "AIzaSyCBkgMxamYaXenY3drabt3dE-Dn00g7-dE",
    authDomain: "financy-ed289.firebaseapp.com",
    projectId: "financy-ed289",
    storageBucket: "financy-ed289.firebasestorage.app",
    messagingSenderId: "1056980551616",
    appId: "1:1056980551616:web:2182efdbb32681099a2a25"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// ============================================================================
// CONSTANTS & STATE
// ============================================================================

const RECENT_ENTRIES_LIMIT = 5;
const FINTECH_PALETTE = ['#0B50DA', '#D4AF37', '#10B981', '#EF4444', '#8B5CF6', '#F59E0B', '#06B6D4'];
let categoryColorMap = {};

let state = {
    charts: { main: null, line: null },
    entries: [],
    unsubscribeFirestore: null,
    isProcessing: false,
    isSidebarCollapsed: false
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function sanitizeInput(input) {
    if (!input) return '';
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
}

function formatCurrency(amount) {
    const isNegative = amount < 0;
    const formatted = Math.abs(amount).toLocaleString('en-IN', { 
        minimumFractionDigits: 0,
        maximumFractionDigits: 0 
    });
    return `${isNegative ? '-' : ''}₹${formatted}`;
}

function getDisplayCategory(category) {
    if (!category) return 'Uncategorized';
    return category.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

// ============================================================================
// UI LOGIC (SIDEBAR & NAVIGATION)
// ============================================================================

window.toggleSidebar = (forceExpand = false) => {
    const sidebar = document.getElementById('main-sidebar');
    const mobileBtn = document.getElementById('mobile-menu-btn');
    const isMobile = window.innerWidth < 1024;
    
    if (isMobile) {
        const isCurrentlyHidden = sidebar.classList.contains('-translate-x-full');
        sidebar.classList.toggle('-translate-x-full');
        if (mobileBtn) mobileBtn.classList.toggle('hidden', isCurrentlyHidden);
    } else {
        if (forceExpand) state.isSidebarCollapsed = false;
        else state.isSidebarCollapsed = !state.isSidebarCollapsed;

        if (state.isSidebarCollapsed) {
            sidebar.classList.remove('sidebar-expanded');
            sidebar.classList.add('sidebar-collapsed');
        } else {
            sidebar.classList.remove('sidebar-collapsed');
            sidebar.classList.add('sidebar-expanded');
        }
    }
};

window.handleOutsideClick = () => {
    const isMobile = window.innerWidth < 1024;
    const sidebar = document.getElementById('main-sidebar');
    const mobileBtn = document.getElementById('mobile-menu-btn');
    if (isMobile && !sidebar.classList.contains('-translate-x-full')) {
        sidebar.classList.add('-translate-x-full');
        if (mobileBtn) mobileBtn.classList.remove('hidden');
    }
};

window.handleNavClick = (pageId, element) => {
    if (!window.innerWidth < 1024 && state.isSidebarCollapsed) window.toggleSidebar(true);
    window.showPage(pageId, element);
};

window.showPage = (p, el) => {
    document.querySelectorAll('.page-view').forEach(v => v.classList.add('hidden'));
    const targetPage = document.getElementById(`page-${p}`);
    if (targetPage) targetPage.classList.remove('hidden');

    document.querySelectorAll('.nav-link').forEach(l => {
        l.classList.remove('text-primary', 'bg-primary/10');
        l.classList.add('text-slate-400');
        l.setAttribute('aria-selected', 'false');
    });

    if (el) {
        el.classList.add('text-primary', 'bg-primary/10');
        el.classList.remove('text-slate-400');
        el.setAttribute('aria-selected', 'true');
    }

    if (window.innerWidth < 1024) {
        document.getElementById('main-sidebar').classList.add('-translate-x-full');
        const mobileBtn = document.getElementById('mobile-menu-btn');
        if (mobileBtn) mobileBtn.classList.remove('hidden');
    }
    
    if (p === 'history') setTimeout(() => updateLineChart(), 100);
};

window.showNotify = (message, type = 'info') => {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    const colors = { success: 'border-green-500 bg-green-50', error: 'border-red-500 bg-red-50', info: 'border-blue-600 bg-blue-50' };
    toast.className = `transform transition-all duration-300 p-4 rounded-2xl border-l-4 shadow-lg ${colors[type] || colors.info}`;
    toast.innerHTML = `<div class="flex-1 font-medium text-sm text-midnight">${sanitizeInput(message)}</div>`;
    container.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 4000);
};

// ============================================================================
// AUTH & PROFILE HANDLERS
// ============================================================================

window.toggleAuthMode = () => {
    const uField = document.getElementById('loginUsername');
    const bText = document.getElementById('btnText');
    const tBtn = document.getElementById('toggleBtn');
    const tText = document.getElementById('toggleText');
    const isShowing = uField.classList.contains('hidden');
    
    uField.classList.toggle('hidden', !isShowing);
    bText.textContent = isShowing ? "Create Account" : "Login";
    tBtn.textContent = isShowing ? "Login instead" : "Create an account";
    
    // Fixed: Logic to show correct toggle text
    if (tText) tText.textContent = isShowing ? "Already have an account?" : "New here?";
};

window.handleAuthEnter = (e) => { if (e.key === 'Enter') window.handleAuth(); };

window.handleAuth = async () => {
    if (state.isProcessing) return;
    const e = document.getElementById('loginEmail').value.trim();
    const p = document.getElementById('loginPassword').value;
    const u = document.getElementById('loginUsername').value.trim();
    const isSignUp = !document.getElementById('loginUsername').classList.contains('hidden');
    
    if (!e || !p) return window.showNotify("Fill credentials", "error");
    
    state.isProcessing = true;
    document.getElementById('loginSpinner').classList.remove('hidden');
    try {
        if (isSignUp) {
            const res = await createUserWithEmailAndPassword(auth, e, p);
            await updateProfile(res.user, { displayName: sanitizeInput(u) });
            await setDoc(doc(db, "users", res.user.uid), { displayName: u });
            updateProfileView({ ...res.user, displayName: u });
        } else {
            await signInWithEmailAndPassword(auth, e, p);
        }
    } catch (err) { window.showNotify(err.message, "error"); }
    finally { state.isProcessing = false; document.getElementById('loginSpinner').classList.add('hidden'); }
};

window.handleGoogleLogin = async () => {
    try {
        const res = await signInWithPopup(auth, googleProvider);
        const uDoc = await getDoc(doc(db, "users", res.user.uid));
        if (!uDoc.exists()) await setDoc(doc(db, "users", res.user.uid), { displayName: res.user.displayName });
    } catch (err) { window.showNotify("Google login failed", "error"); }
};

window.logoutUser = () => signOut(auth);

function updateProfileView(user) {
    const pName = document.getElementById('profileName');
    const pEmail = document.getElementById('profileEmail');
    const pImg = document.getElementById('profileImage');
    const pFallback = document.getElementById('profileImageFallback');
    const welcome = document.getElementById('welcomeText');

    if (user && pName) {
        const name = user.displayName || 'Unnamed User';
        pName.textContent = name;
        pEmail.textContent = user.email;
        if (welcome) welcome.textContent = `Hi ${name}, Welcome to Financy!`;
        
        if (user.photoURL) {
            pImg.src = user.photoURL;
            pImg.classList.remove('hidden');
            pFallback.classList.add('hidden');
        } else {
            pImg.classList.add('hidden');
            pFallback.classList.remove('hidden');
            pFallback.textContent = (name).charAt(0).toUpperCase();
        }
    }
}

// ============================================================================
// DATA & CHART HANDLERS
// ============================================================================

window.exportToCSV = () => {
    if (state.entries.length === 0) return window.showNotify("No data to export", "info");
    const headers = ["Date", "Type", "Category", "Amount"];
    const csv = [headers.join(","), ...state.entries.map(e => [e.date, e.type, e.category, e.amount].join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `financy-export-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
};

window.handleEnter = (e) => { if (e.key === 'Enter') window.addEntry(); };

window.addEntry = async () => {
    if (state.isProcessing) return;
    const amt = document.getElementById('amount').value;
    const cat = document.getElementById('category').value;
    if (!amt || !cat) return window.showNotify("Fill all fields", "error");

    state.isProcessing = true;
    document.getElementById('addEntrySpinner').classList.remove('hidden');
    try {
        await addDoc(collection(db, "entries"), {
            uid: auth.currentUser.uid,
            type: document.getElementById('type').value,
            amount: parseFloat(amt),
            category: sanitizeInput(cat),
            date: new Date().toISOString().split('T')[0],
            createdAt: serverTimestamp()
        });
        document.getElementById('amount').value = '';
        document.getElementById('category').value = '';
    } catch (err) { window.showNotify("Error saving", "error"); }
    finally { state.isProcessing = false; document.getElementById('addEntrySpinner').classList.add('hidden'); }
};

window.deleteEntry = async (id) => { if (confirm("Delete this?")) await deleteDoc(doc(db, "entries", id)); };

onAuthStateChanged(auth, (user) => {
    if (user) {
        document.getElementById('auth-overlay').classList.add('hidden');
        updateProfileView(user);
        const q = query(collection(db, "entries"), where("uid", "==", user.uid));
        state.unsubscribeFirestore = onSnapshot(q, (snap) => {
            state.entries = [];
            snap.forEach(d => {
                const data = d.data();
                let time;
                if (data.createdAt && typeof data.createdAt.toMillis === 'function') {
                    time = data.createdAt.toMillis();
                } else if (data.createdAt) {
                    time = new Date(data.createdAt).getTime();
                } else {
                    time = new Date(data.date || Date.now()).getTime();
                }
                state.entries.push({ id: d.id, ...data, sortTime: time });
            });
            state.entries.sort((a, b) => b.sortTime - a.sortTime);
            updateUI();
        });
    } else {
        document.getElementById('auth-overlay').classList.remove('hidden');
        if (state.unsubscribeFirestore) state.unsubscribeFirestore();
    }
});

function updateUI() {
    let inc = 0, exp = 0, cats = {};
    state.entries.forEach(e => {
        if (e.type === 'income') inc += e.amount;
        else { exp += e.amount; cats[e.category] = (cats[e.category] || 0) + e.amount; }
    });

    const bal = inc - exp;
    const balEl = document.getElementById('totalBalance');
    if (balEl) {
        balEl.textContent = formatCurrency(bal);
        balEl.parentElement.classList.toggle('bg-red-600', bal < 0);
        balEl.parentElement.classList.toggle('bg-primary', bal >= 0);
    }
    
    document.getElementById('totalIncome').textContent = formatCurrency(inc);
    document.getElementById('totalExpenses').textContent = formatCurrency(exp);

    const flow = inc + exp;
    document.getElementById('incomePercentage').textContent = flow ? Math.round((inc/flow)*100)+'%' : '0%';
    document.getElementById('expensePercentage').textContent = flow ? Math.round((exp/flow)*100)+'%' : '0%';

    document.getElementById('expenseList').innerHTML = state.entries.slice(0, RECENT_ENTRIES_LIMIT).map(e => createRow(e)).join('');
    document.getElementById('fullHistoryList').innerHTML = state.entries.map(e => createRow(e)).join('');
    
    updateCharts(cats);
    updateLineChart();
}

function createRow(e) {
    return `<div class="transaction-row">
        <div><p class="font-bold text-white text-sm">${getDisplayCategory(e.category)}</p><p class="text-[10px] text-slate-500">${e.date}</p></div>
        <div class="flex items-center gap-4">
            <p class="font-bold text-sm ${e.type==='income'?'text-green-500':'text-red-500'}">${e.type==='income'?'+':'-'}${formatCurrency(e.amount)}</p>
            <button onclick="deleteEntry('${e.id}')" class="text-slate-600 hover:text-red-500 px-2">✕</button>
        </div>
    </div>`;
}

function getCategoryColor(category) {
    if (!categoryColorMap[category]) {
        const index = Object.keys(categoryColorMap).length % FINTECH_PALETTE.length;
        categoryColorMap[category] = FINTECH_PALETTE[index];
    }
    return categoryColorMap[category];
}

function updateCharts(data) {
    const ctx = document.getElementById('analyticsChart')?.getContext('2d');
    if (!ctx) return;
    if (state.charts.main) state.charts.main.destroy();
    const labels = Object.keys(data);
    state.charts.main = new Chart(ctx, {
        type: 'doughnut',
        data: { labels, datasets: [{ data: Object.values(data), backgroundColor: labels.map(c => getCategoryColor(c)), borderWidth: 0 }] },
        options: { responsive: true, maintainAspectRatio: false, cutout: '70%', plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8', font: { size: 10 } } } } }
    });
}

function updateLineChart() {
    const canvas = document.getElementById('analyticsLineChart');
    if (!canvas) return;
    const expenses = state.entries.filter(e => e.type === 'expense');
    const daily = {};
    expenses.forEach(e => { daily[e.date] = (daily[e.date] || 0) + e.amount; });
    const dates = Object.keys(daily).sort((a,b) => new Date(a) - new Date(b));
    if (state.charts.line) state.charts.line.destroy();
    state.charts.line = new Chart(canvas.getContext('2d'), {
        type: 'line',
        data: { labels: dates, datasets: [{ label: 'Spending', data: dates.map(d => daily[d]), borderColor: '#0B50DA', tension: 0.4, fill: true, backgroundColor: 'rgba(11, 80, 218, 0.1)' }] },
        options: { responsive: true, maintainAspectRatio: false }
    });
}