import './style.css';
import QRCode from 'qrcode';
import { Html5Qrcode } from "html5-qrcode";

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

const scanResultCard = document.getElementById('scanResult');
const scannedGrnDisplay = document.getElementById('scannedGrnDisplay');
const btnUseScanned = document.getElementById('btnUseScanned');

let html5QrCode = null;

// --- 1. CAMERA SCANNING (FAST ENGINE + BARCODES) ---
btnScan.addEventListener('click', () => {
    scanResultCard.hidden = true; // hide previous results
    stage.hidden = true;
    
    if (!html5QrCode) {
        html5QrCode = new Html5Qrcode("reader");
    }
    
    videoBox.hidden = false;
    videoBox.classList.remove('animate__fadeOut');
    videoBox.classList.add('animate__animated', 'animate__fadeIn');
    
    // FPS: 20 makes it scan VERY fast, supports both QR and 1D Barcodes
    html5QrCode.start(
        { facingMode: "environment" },
        { fps: 20, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
            handleSuccessfulScan(decodedText);
        },
        (errorMessage) => {
            // Ignored, triggers constantly when no code is in view
        }
    ).catch((err) => {
        showMsg('Camera access denied or not available.', 'error');
    });
});

btnStop.addEventListener('click', stopScan);

function stopScan() {
    if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().then(() => {
            hideVideoBox();
        }).catch(err => {
            console.error(err);
            hideVideoBox();
        });
    } else {
        hideVideoBox();
    }
}

function hideVideoBox() {
    videoBox.classList.remove('animate__fadeIn');
    videoBox.classList.add('animate__fadeOut');
    setTimeout(() => { videoBox.hidden = true; }, 500);
}

// --- 2. FILE UPLOAD SCANNING (BARCODES + QR) ---
fileIn.addEventListener('change', (e) => {
    if (e.target.files.length === 0) return;
    const file = e.target.files[0];
    scanResultCard.hidden = true;
    
    if (!html5QrCode) {
        html5QrCode = new Html5Qrcode("reader");
    }
    
    html5QrCode.scanFile(file, true)
    .then(decodedText => {
        handleSuccessfulScan(decodedText);
    })
    .catch(err => {
        showMsg('No code found in image.', 'error');
    });
});

// --- 3. HANDLE SCAN SUCCESS ---
function handleSuccessfulScan(text) {
    stopScan();
    
    // Display the big info card
    scannedGrnDisplay.textContent = text;
    grnoInput.value = text;
    
    scanResultCard.hidden = false;
    scanResultCard.classList.remove('animate__zoomOut');
    scanResultCard.classList.add('animate__animated', 'animate__zoomIn');
}

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
    const grno = grnoInput.value.trim();
    if (!grno) return;

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
    const grno = grnoInput.value.trim();
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
