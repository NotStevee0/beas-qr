import QRCode from "qrcode";

const W = 720;
const H = 820;
const WATERMARK = "Made by Adarsh";

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * Draws the QR card (white card, faint tiled "Made by Adarsh" watermark in the
 * background, QR on top, name caption and footer) onto the given canvas.
 */
export async function drawQrCard(canvas, text, caption) {
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  // card
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, 0, 0, W, H, 36);
  ctx.fill();

  // faint tiled diagonal watermark (kept very light so scanning stays reliable)
  ctx.save();
  roundRect(ctx, 0, 0, W, H, 36);
  ctx.clip();
  ctx.translate(W / 2, H / 2);
  ctx.rotate(-Math.PI / 6);
  ctx.fillStyle = "rgba(15, 23, 42, 0.055)";
  ctx.font = "800 34px Inter, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let y = -H; y <= H; y += 90) {
    for (let x = -W; x <= W; x += 330) {
      ctx.fillText(WATERMARK, x + ((y / 90) % 2 === 0 ? 0 : 165), y);
    }
  }
  ctx.restore();

  // QR on a transparent canvas, then composited on the card
  const qrSize = 560;
  const qrCanvas = document.createElement("canvas");
  await QRCode.toCanvas(qrCanvas, text, {
    width: qrSize,
    margin: 2,
    errorCorrectionLevel: "M",
    color: { dark: "#0f172a", light: "#00000000" },
  });
  ctx.drawImage(qrCanvas, (W - qrSize) / 2, 50, qrSize, qrSize);

  // caption (name)
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#0f172a";
  ctx.font = "700 34px Inter, system-ui, sans-serif";
  let cap = caption || "";
  while (cap.length > 3 && ctx.measureText(cap).width > W - 80) cap = cap.slice(0, -2);
  if (cap !== caption) cap = cap.trimEnd() + "…";
  ctx.fillText(cap, W / 2, 680);

  // divider + footer
  ctx.fillStyle = "#e2e8f0";
  ctx.fillRect(60, 722, W - 120, 2);
  ctx.fillStyle = "#64748b";
  ctx.font = "600 26px Inter, system-ui, sans-serif";
  ctx.fillText(WATERMARK, W / 2, 775);
}
