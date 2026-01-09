import { initializeApp } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js";
import { getFirestore, collection, addDoc, query, where, onSnapshot, deleteDoc, doc, orderBy } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";

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

let charts = { main: null, line: null };
let globalEntries = [];

// GLOBAL FUNCTIONS
window.handleAuthEnter = (e) => { if (e.key === 'Enter') window.handleAuth(); };
window.handleEnter = (e) => { if (e.key === 'Enter') window.addEntry(); };

window.showPage = (pageId, element) => {
    document.querySelectorAll('.page-view').forEach(p => p.classList.add('hidden'));
    document.getElementById('page-' + pageId).classList.remove('hidden');
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('text-blue-600'));
    element.classList.add('text-blue-600');
};

window.handleAuth = async () => {
    const e = document.getElementById('loginEmail').value, p = document.getElementById('loginPassword').value;
    const btn = document.getElementById('loginBtn'), spinner = document.getElementById('loginSpinner');
    if(!e || !p) return alert("Fill credentials");
    btn.disabled = true; spinner.classList.remove('hidden');
    try {
        await signInWithEmailAndPassword(auth, e, p);
    } catch (err) {
        try { await createUserWithEmailAndPassword(auth, e, p); } 
        catch (sErr) { alert(sErr.message); }
    } finally { btn.disabled = false; spinner.classList.add('hidden'); }
};

window.handleGoogleLogin = async () => { try { await signInWithPopup(auth, googleProvider); } catch (err) { alert(err.message); } };
window.logoutUser = () => signOut(auth);

onAuthStateChanged(auth, (user) => {
    if (user) {
        document.getElementById('auth-overlay').classList.add('hidden');
        const q = query(collection(db, "entries"), where("uid", "==", user.uid), orderBy("date", "desc"));
        onSnapshot(q, (snap) => {
            globalEntries = [];
            snap.forEach(d => globalEntries.push({ id: d.id, ...d.data() }));
            updateUI();
        });
    } else { document.getElementById('auth-overlay').classList.remove('hidden'); }
});

window.addEntry = async () => {
    const type = document.getElementById('type').value, amt = document.getElementById('amount').value, cat = document.getElementById('category').value;
    if(amt && cat) {
        await addDoc(collection(db, "entries"), {
            uid: auth.currentUser.uid, type, amount: parseFloat(amt), category: cat, date: new Date().toISOString().split('T')[0]
        });
        document.getElementById('amount').value = ''; document.getElementById('category').value = '';
    }
};

window.deleteEntry = async (id) => { await deleteDoc(doc(db, "entries", id)); };

function updateUI() {
    let inc = 0, exp = 0, cats = {};
    const mini = document.getElementById('expenseList'), full = document.getElementById('fullHistoryList');
    mini.innerHTML = ""; full.innerHTML = "";

    globalEntries.forEach((item, i) => {
        if(item.type === 'income') inc += item.amount;
        else { exp += item.amount; cats[item.category] = (cats[item.category] || 0) + item.amount; }

        const html = `
            <div class="transaction-row">
                <div><p class="font-bold">${item.category}</p><p class="text-[10px] text-slate-400">${item.date}</p></div>
                <div class="flex items-center gap-4">
                    <p class="font-bold ${item.type==='income'?'text-green-600':'text-red-600'}">${item.type==='income'?'+':'-'}₹${item.amount}</p>
                    <button onclick="deleteEntry('${item.id}')" class="text-slate-300 hover:text-red-500">✕</button>
                </div>
            </div>`;
        if(i < 5) mini.innerHTML += html;
        full.innerHTML += html;
    });

    document.getElementById('totalBalance').innerText = `₹${(inc - exp).toLocaleString()}`;
    document.getElementById('totalIncome').innerText = `₹${inc.toLocaleString()}`;
    document.getElementById('totalExpenses').innerText = `₹${exp.toLocaleString()}`;

    renderDashboardChart(cats);
    renderLineChart();
    window.runBudgetLogic();
}

function renderDashboardChart(data) {
    const ctx = document.getElementById('analyticsChart').getContext('2d');
    if(charts.main) charts.main.destroy();
    charts.main = new Chart(ctx, {
        type: 'bar', data: { labels: Object.keys(data), datasets: [{ data: Object.values(data), backgroundColor: '#2563eb', borderRadius: 10, barThickness: 20 }] },
        options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { display: false }, y: { grid: { display: false }, border: { display: false } } } }
    });
}

function renderLineChart() {
    const ctx = document.getElementById('analyticsLineChart')?.getContext('2d');
    if(!ctx) return;
    if(charts.line) charts.line.destroy();
    const sorted = [...globalEntries].reverse();
    charts.line = new Chart(ctx, {
        type: 'line', data: { labels: sorted.map(e => e.date), datasets: [{ label: 'Cashflow', data: sorted.map(e => e.type === 'income' ? e.amount : -e.amount), borderColor: '#2563eb', tension: 0.4, fill: true, backgroundColor: 'rgba(37, 99, 235, 0.05)' }] },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

window.runBudgetLogic = () => {
    const limit = parseFloat(document.getElementById('budgetInput').value) || 0;
    let spent = 0; globalEntries.forEach(e => { if(e.type === 'expense') spent += e.amount; });
    const perc = limit > 0 ? Math.min(Math.round((spent/limit)*100), 100) : 0;
    const bar = document.getElementById('budgetBar');
    if (bar) { bar.style.width = perc + '%'; document.getElementById('budgetText').innerText = `₹${spent.toLocaleString()} / ₹${limit.toLocaleString()} Used (${perc}%)`; }
};