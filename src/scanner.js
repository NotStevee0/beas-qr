import jsQR from "jsqr";

/** Decode a canvas using the native BarcodeDetector first, then jsQR. */
export async function decodeCanvas(canvas) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  if ("BarcodeDetector" in window) {
    try {
      const res = await new window.BarcodeDetector().detect(canvas);
      if (res.length) return res[0].rawValue;
    } catch (_) {
      /* fall through to jsQR */
    }
  }

  const d = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const code = jsQR(d.data, d.width, d.height, { inversionAttempts: "attemptBoth" });
  return code && code.data ? code.data : null;
}

/** Decode a QR from an image File. Resolves to string or null. */
export function decodeFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = async () => {
      try {
        const max = 1200;
        const s = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * s);
        c.height = Math.round(img.height * s);
        const x = c.getContext("2d", { willReadFrequently: true });
        x.fillStyle = "#fff";
        x.fillRect(0, 0, c.width, c.height);
        x.drawImage(img, 0, 0, c.width, c.height);
        resolve(await decodeCanvas(c));
      } catch (e) {
        reject(e);
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not open that image."));
    };
    img.src = url;
  });
}

/** Start a camera scan loop. Returns a stop() function. */
export async function startCamera(video, onResult, onError) {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error("Camera needs HTTPS or localhost. Use Upload image instead.");
  }

  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" } },
    });
  } catch (_) {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: true });
    } catch (e) {
      throw new Error("Camera blocked or not found. Allow camera permission.");
    }
  }

  video.srcObject = stream;
  try {
    await video.play();
  } catch (_) {
    /* autoplay handled by attributes */
  }

  let running = true;
  let busy = false;
  const c = document.createElement("canvas");
  const x = c.getContext("2d", { willReadFrequently: true });

  const stop = () => {
    running = false;
    stream.getTracks().forEach((t) => t.stop());
    video.srcObject = null;
  };

  const loop = () => {
    if (!running) return;
    if (!busy && video.videoWidth) {
      busy = true;
      c.width = video.videoWidth;
      c.height = video.videoHeight;
      x.drawImage(video, 0, 0, c.width, c.height);
      decodeCanvas(c)
        .then((val) => {
          busy = false;
          if (val && running) {
            stop();
            onResult(val);
          }
        })
        .catch((e) => {
          busy = false;
          if (onError) onError(e);
        });
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);

  return stop;
}
