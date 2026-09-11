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

  let buffer = null;

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

  function makeBuffer(img, w, h) {
    buffer = document.createElement("canvas");
    buffer.width = w;
    buffer.height = h;
    const bctx = buffer.getContext("2d", { willReadFrequently: true });
    coverDraw(bctx, img, w, h);
  }

  function sample(data, w, h, x, y) {
    const sx = Math.min(w - 1, Math.max(0, Math.round(x)));
    const sy = Math.min(h - 1, Math.max(0, Math.round(y)));
    const i = (sy * w + sx) * 4;
    return [data[i], data[i + 1], data[i + 2]];
  }

  function diamondsFor(w, h) {
    const cols = w < 420 ? 16 : 22;
    const size = w / cols;
    const rowStep = size * 0.52;
    const rows = Math.ceil(h / rowStep) + 2;
    const cx0 = w / 2;
    const cy0 = h * 0.38;
    const src = buffer.getContext("2d").getImageData(0, 0, w, h).data;
    const list = [];
    for (let row = 0; row < rows; row += 1) {
      const offset = (row % 2) * (size / 2);
      for (let col = -1; col <= cols; col += 1) {
        const cx = col * size + offset + size / 2;
        const cy = row * rowStep;
        list.push({
          cx,
          cy,
          r: size * 0.48,
          dist: Math.hypot(cx - cx0, cy - cy0),
          color: sample(src, w, h, cx, cy),
        });
      }
    }
    list.sort((a, b) => a.dist - b.dist);
    return list;
  }

  function drawStone(ctx, gem) {
    const { cx, cy, r, color } = gem;
    const [rr, gg, bb] = color;
    ctx.beginPath();
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx + r, cy);
    ctx.lineTo(cx, cy + r);
    ctx.lineTo(cx - r, cy);
    ctx.closePath();
    const fill = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
    fill.addColorStop(0, `rgb(${Math.min(255, rr + 58)}, ${Math.min(255, gg + 48)}, ${Math.min(255, bb + 36)})`);
    fill.addColorStop(0.42, `rgb(${rr}, ${gg}, ${bb})`);
    fill.addColorStop(1, `rgb(${Math.max(0, rr - 32)}, ${Math.max(0, gg - 32)}, ${Math.max(0, bb - 26)})`);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 244, 214, 0.4)";
    ctx.lineWidth = 0.7;
    ctx.stroke();
  }

  function drawMosaic(ctx, w, h, gems, count) {
    ctx.clearRect(0, 0, w, h);
    const n = Math.max(1, Math.floor(gems.length * count));
    for (let i = 0; i < n; i += 1) drawStone(ctx, gems[i]);
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
    makeBuffer(img, w, h);
    const gems = diamondsFor(w, h);
    stage.classList.add("is-crystal");
    if (reduceMotion) {
      drawMosaic(ctx, w, h, gems, 1);
      return;
    }
    const start = performance.now();
    const duration = 2600;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) * (1 - t);
      drawMosaic(ctx, w, h, gems, eased);
      if (t < 1) window.requestAnimationFrame(tick);
    };
    window.requestAnimationFrame(tick);
  }

  function play() {
    const run = () => {
      window.setTimeout(() => startCrystal(portrait), reduceMotion ? 0 : 1800);
    };
    if (portrait.complete && portrait.naturalWidth) run();
    else portrait.addEventListener("load", run, { once: true });
  }

  play();
})();
