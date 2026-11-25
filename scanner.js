import { BarcodeDetector, setZXingModuleOverrides } from "barcode-detector/ponyfill";
// Bundle the decoder (.wasm) with the app so scanning never depends on a CDN.
import wasmUrl from "zxing-wasm/reader/zxing_reader.wasm?url";

setZXingModuleOverrides({
  locateFile: (path, prefix) => (path.endsWith(".wasm") ? wasmUrl : prefix + path),
});

// QR + the common 1D barcode types.
const FORMATS = [
  "qr_code", "code_128", "code_39", "code_93", "codabar",
  "ean_13", "ean_8", "upc_a", "upc_e", "itf", "data_matrix",
];

let detector = null;
function getDetector() {
  if (!detector) detector = new BarcodeDetector({ formats: FORMATS });
  return detector;
}

/** Decode a still image File (Scan Image). Returns {text, format} or null. */
export async function decodeFile(file) {
  const bitmap = await createImageBitmap(file);
  try {
    // Try full size first, then a downscaled copy (huge phone photos often fail).
    for (const max of [Infinity, 1600, 900]) {
      const s = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
      const c = document.createElement("canvas");
      c.width = Math.round(bitmap.width * s);
      c.height = Math.round(bitmap.height * s);
      const x = c.getContext("2d", { willReadFrequently: true });
      x.fillStyle = "#fff";
      x.fillRect(0, 0, c.width, c.height);
      x.drawImage(bitmap, 0, 0, c.width, c.height);
      const res = await getDetector().detect(c);
      if (res.length) return { text: res[0].rawValue, format: res[0].format };
    }
    return null;
  } finally {
    bitmap.close && bitmap.close();
  }
}

/** Start the live camera scan. Resolves to a stop() function. */
export async function startCamera(video, onResult) {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Camera needs HTTPS. Use Scan Image instead.");
  }

  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1920 },
        height: { ideal: 1080 },
      },
    });
  } catch (_) {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    } catch (e) {
      throw new Error("Camera blocked or not found. Allow camera permission.");
    }
  }

  // Continuous autofocus where supported (big win for small barcodes).
  try {
    const track = stream.getVideoTracks()[0];
    const caps = track.getCapabilities ? track.getCapabilities() : {};
    if (caps.focusMode && caps.focusMode.includes("continuous")) {
      await track.applyConstraints({ advanced: [{ focusMode: "continuous" }] });
    }
  } catch (_) { /* optional */ }

  video.setAttribute("playsinline", "");
  video.muted = true;
  video.srcObject = stream;
  await video.play().catch(() => {});

  let running = true;
  let busy = false;
  let done = false;

  const stop = () => {
    running = false;
    stream.getTracks().forEach((t) => t.stop());
    video.srcObject = null;
  };

  const tick = async () => {
    if (!running) return;
    if (!busy && video.readyState >= 2 && video.videoWidth) {
      busy = true;
      try {
        const res = await getDetector().detect(video);
        if (res.length && running && !done) {
          done = true; // fire once only
          stop();
          onResult({ text: res[0].rawValue, format: res[0].format });
          return;
        }
      } catch (_) { /* keep scanning */ }
      busy = false;
    }
    setTimeout(tick, 80); // ~12 scans/sec, easy on battery
  };
  tick();

  return stop;
}
