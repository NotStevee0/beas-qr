import './style.css';
import QRCode from 'qrcode';
import { startCamera, decodeFile } from "./scanner.js";
import { beep, unlockAudio } from "./beep.js";
import { dbReady, addScan, removeScan, watchScans, countVisit, watchVisitors } from "./firebase.js";

console.log("RSSB BARCODE Initialized - FAST SCANNER");

const form = document.getElementById('form');
const stage = document.getElementById('stage');
const canvas = document.getElementById('qrCanvas');
const btnSave = document.getElementById('btnSave');
const txt = document.getElementById('txt');
const grnoInput = document.getElementById('grno');
const msgBox = document.getElementById('msg');

const btnScan = document.getElementById('btnScan');
const fileIn = document.getElementById('fileIn');
const videoBox = document.getElementById('videoBox');
const btnStop = document.getElementById('btnStop');

const scanBox = document.getElementById('scanBox');
const histList = document.getElementById('list');
const histEmpty = document.getElementById('empty');
const histCount = document.getElementById('histCount');
const btnClear = document.getElementById('btnClear');
const scanResultCard = document.getElementById('scanResult');
const scannedGrnDisplay = document.getElementById('scannedGrnDisplay');
const btnUseScanned = document.getElementById('btnUseScanned');

let stopCamera = null;

// Pull only the GRN out of scanned/pasted data.
// Works with JSON like {"grno":"M00690","name":"...","centre":"Raipur"} or plain text.
function extractGrn(raw) {
    const text = String(raw ?? '').trim();
    try {
        const obj = JSON.parse(text);
        if (obj && typeof obj === 'object') {
            const key = Object.keys(obj).find(k => ['grno', 'grn', 'gr_no', 'grnumber'].includes(k.toLowerCase().replace(/[\s-]/g, '')));
            if (key && obj[key] != null) return String(obj[key]).trim();
        }
    } catch (_) { /* not JSON */ }
    const m = text.match(/"?gr[\s_-]?n(?:o|umber)?"?\s*[:=]\s*"?([^",}\s]+)/i);
    return m ? m[1].trim() : text;
}

// --- 1. CAMERA SCANNING (native BarcodeDetector + ZXing fallback) ---
btnScan.addEventListener('click', async () => {
    if (stopCamera) return; // already running
    unlockAudio();
    scanBox.classList.remove('ok');
    scanResultCard.hidden = true;
    stage.hidden = true;

    videoBox.hidden = false;
    videoBox.classList.remove('animate__fadeOut');
    videoBox.classList.add('animate__animated', 'animate__fadeIn');

    const video = document.getElementById('scanVideo');
    try {
        stopCamera = await startCamera(video, (res) => handleSuccessfulScan(res));
    } catch (err) {
        stopCamera = null;
        hideVideoBox();
        showMsg(err.message || 'Camera access denied or not available.', 'error');
    }
});

btnStop.addEventListener('click', stopScan);

function stopScan() {
    if (stopCamera) { stopCamera(); stopCamera = null; }
    hideVideoBox();
}

function hideVideoBox() {
    videoBox.classList.remove('animate__fadeIn');
    videoBox.classList.add('animate__fadeOut');
    setTimeout(() => { videoBox.hidden = true; }, 500);
}

// --- 2. IMAGE UPLOAD SCANNING ---
fileIn.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    e.target.value = ''; // allow picking the same file again
    if (!file) return;
    unlockAudio();
    scanResultCard.hidden = true;
    try {
        const res = await decodeFile(file);
        if (res) handleSuccessfulScan(res);
        else showMsg('No code found in image. Try a clearer, closer photo.', 'error');
    } catch (err) {
        showMsg('Could not read that image.', 'error');
    }
});

// --- 3. HANDLE SCAN SUCCESS ---
function handleSuccessfulScan({ text: rawText, format }) {
    const text = extractGrn(rawText);
    beep();
    scanBox.classList.add('ok');
    setTimeout(stopScan, 350); // let the green flash show
    addHistory({ text, raw: String(rawText), format });

    scannedGrnDisplay.textContent = text;
    grnoInput.value = text;

    scanResultCard.hidden = false;
    scanResultCard.classList.remove('animate__zoomOut');
    scanResultCard.classList.add('animate__animated', 'animate__zoomIn');
}

// --- HISTORY: shared with everyone via Firestore; falls back to this device only ---
const HIST_KEY = 'rssb-scan-history';
const shared = dbReady();
let history = [];
if (!shared) { try { history = JSON.parse(localStorage.getItem(HIST_KEY) || '[]'); } catch (_) { history = []; } }

function saveHistory() {
    if (shared) return;
    try { localStorage.setItem(HIST_KEY, JSON.stringify(history.slice(0, 300))); } catch (_) { /* storage full/blocked */ }
}

function formatLabel(f) {
    if (!f) return 'Code';
    if (f === 'qr_code') return 'QR';
    return f.replace(/_/g, ' ').toUpperCase();
}

function addHistory(item) {
    if (shared) {
        addScan(item).catch(() => showMsg('Could not save to shared history.', 'error'));
        return; // the live listener updates the list for everyone
    }
    history.unshift({ id: Date.now() + Math.random().toString(36).slice(2, 6), time: Date.now(), ...item });
    history = history.slice(0, 300);
    saveHistory();
    renderHistory();
}

if (shared) {
    watchScans((rows) => { history = rows; renderHistory(); }, () => showMsg('Cannot load shared history.', 'error'));
}

function renderHistory() {
    histList.textContent = '';
    histCount.textContent = String(history.length);
    histEmpty.hidden = history.length > 0;
    btnClear.hidden = shared || history.length === 0;

    history.forEach((h) => {
        const li = document.createElement('li');
        li.className = 'hist-item';

        const main = document.createElement('div');
        main.className = 'hist-main';
        const code = document.createElement('div');
        code.className = 'hist-code';
        code.textContent = h.text;
        const meta = document.createElement('div');
        meta.className = 'hist-meta';
        const tag = document.createElement('span');
        tag.className = 'tag' + (h.format === 'qr_code' ? ' qr' : '');
        tag.textContent = formatLabel(h.format);
        const when = document.createElement('span');
        when.textContent = new Date(h.time).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true });
        meta.append(tag, when);
        main.append(code, meta);

        const acts = document.createElement('div');
        acts.className = 'hist-acts';
        const use = document.createElement('button');
        use.type = 'button'; use.className = 'mini'; use.textContent = 'Use';
        use.addEventListener('click', () => { grnoInput.value = h.text; grnoInput.focus(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
        const cp = document.createElement('button');
        cp.type = 'button'; cp.className = 'mini'; cp.textContent = 'Copy';
        cp.addEventListener('click', async () => {
            try { await navigator.clipboard.writeText(h.text); cp.textContent = 'Copied'; setTimeout(() => (cp.textContent = 'Copy'), 1200); } catch (_) { showMsg('Copy not allowed here.', 'error'); }
        });
        const del = document.createElement('button');
        del.type = 'button'; del.className = 'mini del'; del.setAttribute('aria-label', 'Delete'); del.textContent = '✕';
        del.addEventListener('click', () => { if (shared) removeScan(h.id).catch(() => {}); else { history = history.filter((x) => x.id !== h.id); saveHistory(); renderHistory(); } });
        acts.append(use, cp, del);

        li.append(main, acts);
        histList.append(li);
    });
}

btnClear.addEventListener('click', () => {
    if (confirm('Delete all scan history?')) { history = []; saveHistory(); renderHistory(); }
});
renderHistory();

btnUseScanned.addEventListener('click', () => {
    scanResultCard.classList.remove('animate__zoomIn');
    scanResultCard.classList.add('animate__zoomOut');
    setTimeout(() => { scanResultCard.hidden = true; }, 500);
    
    // Optional: auto-focus input or jump directly to generation
    grnoInput.focus();
});

// --- 4. GENERATION ---
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const grno = extractGrn(grnoInput.value);
    if (!grno) return;
    grnoInput.value = grno;

    scanResultCard.hidden = true; // hide if it's open
    stage.hidden = false;
    stage.classList.remove('animate__zoomIn');
    void stage.offsetWidth; 
    stage.classList.add('animate__animated', 'animate__zoomIn');
    
    try {
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        const qrData = await QRCode.toDataURL(grno, {
            width: 640, margin: 2, color: { dark: '#09090b', light: '#ffffff' }
        });
        
        const img = new Image();
        img.onload = () => {
            ctx.drawImage(img, 40, 40);
            ctx.font = 'bold 48px Inter, sans-serif';
            ctx.fillStyle = '#09090b';
            ctx.textAlign = 'center';
            ctx.fillText(grno, canvas.width / 2, 750);
            
            btnSave.disabled = false;
            txt.textContent = `Generated: ${grno}`;
        };
        img.src = qrData;
    } catch (err) {
        showMsg('Error generating code', 'error');
    }
});

btnSave.addEventListener('click', () => {
    const grno = extractGrn(grnoInput.value);
    const link = document.createElement('a');
    link.download = `rssb-barcode-${grno || 'generated'}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
});

function showMsg(text, type) {
    msgBox.textContent = text;
    msgBox.className = `msg ${type} animate__animated animate__headShake`;
    msgBox.style.display = 'block';
    setTimeout(() => { msgBox.style.display = 'none'; msgBox.className = 'msg'; }, 4000);
}

// --- LIVE INDIA CLOCK + VISITOR COUNT (bottom-left) ---
const clockEl = document.getElementById('istClock');
const visitEl = document.getElementById('visitCount');
const istFmt = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
function tickClock() { clockEl.textContent = istFmt.format(new Date()) + ' IST'; }
tickClock(); setInterval(tickClock, 1000);

if (shared) {
    let counted = false;
    try { counted = localStorage.getItem('rssb-visited') === '1'; } catch (_) { /* ignore */ }
    if (!counted) countVisit().then(() => { try { localStorage.setItem('rssb-visited', '1'); } catch (_) { /* ignore */ } }).catch(() => {});
    watchVisitors((n) => { visitEl.textContent = n.toLocaleString('en-IN'); });
} else {
    visitEl.textContent = '–';
}
