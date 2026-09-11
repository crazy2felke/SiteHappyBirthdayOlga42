(function () {
  const COMPLETE_KEY = "diamond-segment-complete";
  try {
    localStorage.removeItem(COMPLETE_KEY);
  } catch {
    /* ignore */
  }

  const done = sessionStorage.getItem(COMPLETE_KEY) === "1";
  const lockScreen = document.getElementById("lockScreen");
  const galleryShell = document.getElementById("galleryShell");
  const portrait = document.getElementById("portrait");
  const mosaic = document.getElementById("mosaic");
  const stage = document.getElementById("portraitStage");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (!done) {
    document.body.classList.add("is-locked");
    if (lockScreen) lockScreen.hidden = false;
    if (galleryShell) galleryShell.hidden = true;
    return;
  }

  document.body.classList.add("is-open");
  if (lockScreen) lockScreen.hidden = true;
  if (galleryShell) galleryShell.hidden = false;

  if (!portrait || !mosaic || !stage) return;

  function coverDraw(ctx, img, w, h) {
    const ir = img.naturalWidth / img.naturalHeight;
    const cr = w / h;
    let dw;
    let dh;
    if (ir > cr) {
      dh = h;
      dw = h * ir;
    } else {
      dw = w;
      dh = w / ir;
    }
    ctx.drawImage(img, (w - dw) * 0.5, (h - dh) * 0.18, dw, dh);
  }

  function renderTinyMosaic(img, w, h) {
    const src = document.createElement("canvas");
    src.width = w;
    src.height = h;
    const sctx = src.getContext("2d", { willReadFrequently: true });
    coverDraw(sctx, img, w, h);
    const pixels = sctx.getImageData(0, 0, w, h).data;

    const off = document.createElement("canvas");
    off.width = w;
    off.height = h;
    const octx = off.getContext("2d");

    const cols = Math.max(120, Math.round(w / 2.2));
    const size = w / cols;
    const rowStep = size * 0.52;
    const rows = Math.ceil(h / rowStep) + 2;
    const r = size * 0.46;

    for (let row = 0; row < rows; row += 1) {
      const offset = (row % 2) * (size / 2);
      for (let col = -1; col <= cols; col += 1) {
        const cx = col * size + offset + size / 2;
        const cy = row * rowStep;
        const sx = Math.min(w - 1, Math.max(0, Math.round(cx)));
        const sy = Math.min(h - 1, Math.max(0, Math.round(cy)));
        const i = (sy * w + sx) * 4;
        const rr = pixels[i];
        const gg = pixels[i + 1];
        const bb = pixels[i + 2];
        octx.beginPath();
        octx.moveTo(cx, cy - r);
        octx.lineTo(cx + r, cy);
        octx.lineTo(cx, cy + r);
        octx.lineTo(cx - r, cy);
        octx.closePath();
        octx.fillStyle = `rgb(${rr},${gg},${bb})`;
        octx.fill();
      }
    }
    return off;
  }

  function startCrystal(img) {
    const rect = portrait.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));
    if (w < 8 || h < 8) {
      window.setTimeout(() => startCrystal(img), 120);
      return;
    }

    mosaic.width = Math.round(w * dpr);
    mosaic.height = Math.round(h * dpr);
    mosaic.style.width = `${w}px`;
    mosaic.style.height = `${h}px`;
    const ctx = mosaic.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const sheet = renderTinyMosaic(img, w, h);
    stage.classList.add("is-crystal");

    if (reduceMotion) {
      ctx.drawImage(sheet, 0, 0, w, h);
      return;
    }

    const cx = w / 2;
    const cy = h * 0.38;
    const maxR = Math.hypot(w, h) * 0.72;
    const start = performance.now();
    const duration = 2800;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) * (1 - t);
      ctx.clearRect(0, 0, w, h);
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(4, maxR * eased), 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(sheet, 0, 0, w, h);
      ctx.restore();
      if (t < 1) window.requestAnimationFrame(tick);
    };
    window.requestAnimationFrame(tick);
  }

  function play() {
    const run = () => {
      window.setTimeout(() => startCrystal(portrait), reduceMotion ? 0 : 1600);
    };
    if (portrait.complete && portrait.naturalWidth) run();
    else portrait.addEventListener("load", run, { once: true });
  }

  play();
})();
