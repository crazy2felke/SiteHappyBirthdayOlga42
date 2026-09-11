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

  if (reduceMotion || !portrait || !mosaic || !stage) return;

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
    coverDraw(buffer.getContext("2d"), img, w, h);
  }

  function sample(data, w, h, x, y) {
    const sx = Math.min(w - 1, Math.max(0, Math.round(x)));
    const sy = Math.min(h - 1, Math.max(0, Math.round(y)));
    const i = (sy * w + sx) * 4;
    return [data[i], data[i + 1], data[i + 2]];
  }

  function diamondsFor(w, h) {
    const cols = w < 420 ? 10 : 14;
    const size = w / cols;
    const rowStep = size * 0.54;
    const rows = Math.ceil(h / rowStep) + 1;
    const cx0 = w / 2;
    const cy0 = h * 0.38;
    const src = buffer.getContext("2d").getImageData(0, 0, w, h).data;
    const list = [];
    for (let row = 0; row < rows; row += 1) {
      const offset = (row % 2) * (size / 2);
      for (let col = -1; col <= cols; col += 1) {
        const cx = col * size + offset + size / 2;
        const cy = row * rowStep;
        const color = sample(src, w, h, cx, cy);
        list.push({
          cx,
          cy,
          r: size * 0.46,
          dist: Math.hypot(cx - cx0, cy - cy0),
          color,
        });
      }
    }
    list.sort((a, b) => a.dist - b.dist);
    return list;
  }

  function drawMosaic(ctx, w, h, gems, count) {
    ctx.clearRect(0, 0, w, h);
    const n = Math.max(1, Math.floor(gems.length * count));
    for (let i = 0; i < n; i += 1) {
      const { cx, cy, r, color } = gems[i];
      const [rr, gg, bb] = color;
      ctx.beginPath();
      ctx.moveTo(cx, cy - r);
      ctx.lineTo(cx + r, cy);
      ctx.lineTo(cx, cy + r);
      ctx.lineTo(cx - r, cy);
      ctx.closePath();
      const glare = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
      glare.addColorStop(0, `rgba(${Math.min(255, rr + 48)}, ${Math.min(255, gg + 40)}, ${Math.min(255, bb + 32)}, 0.38)`);
      glare.addColorStop(0.5, `rgba(${rr}, ${gg}, ${bb}, 0.22)`);
      glare.addColorStop(1, `rgba(${Math.max(0, rr - 12)}, ${Math.max(0, gg - 12)}, ${Math.max(0, bb - 12)}, 0.16)`);
      ctx.fillStyle = glare;
      ctx.fill();
      ctx.strokeStyle = "rgba(232, 201, 138, 0.18)";
      ctx.lineWidth = 0.55;
      ctx.stroke();
    }
  }

  function play() {
    const img = new Image();
    img.onload = () => {
      window.setTimeout(() => {
        const rect = portrait.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const w = Math.max(1, Math.round(rect.width));
        const h = Math.max(1, Math.round(rect.height));
        mosaic.width = Math.round(w * dpr);
        mosaic.height = Math.round(h * dpr);
        mosaic.style.width = `${w}px`;
        mosaic.style.height = `${h}px`;
        const ctx = mosaic.getContext("2d");
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        makeBuffer(img, w, h);
        const gems = diamondsFor(w, h);
        stage.classList.add("is-crystal");
        const start = performance.now();
        const duration = 2200;
        const tick = (now) => {
          const t = Math.min(1, (now - start) / duration);
          const eased = 1 - (1 - t) * (1 - t);
          drawMosaic(ctx, w, h, gems, eased);
          if (t < 1) window.requestAnimationFrame(tick);
        };
        window.requestAnimationFrame(tick);
      }, 2600);
    };
    img.src = portrait.currentSrc || portrait.src;
  }

  if (portrait.complete && portrait.naturalWidth) play();
  else portrait.addEventListener("load", play, { once: true });
})();
