(function () {
  const done = localStorage.getItem("diamond-segment-complete") === "1";
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

  function diamondsFor(w, h) {
    const cols = w < 420 ? 11 : 16;
    const size = w / cols;
    const rowStep = size * 0.52;
    const rows = Math.ceil(h / rowStep) + 2;
    const cx0 = w / 2;
    const cy0 = h * 0.38;
    const list = [];
    for (let row = 0; row < rows; row += 1) {
      const offset = (row % 2) * (size / 2);
      for (let col = -1; col <= cols; col += 1) {
        const cx = col * size + offset + size / 2;
        const cy = row * rowStep;
        list.push({ cx, cy, r: size * 0.5, dist: Math.hypot(cx - cx0, cy - cy0) });
      }
    }
    list.sort((a, b) => a.dist - b.dist);
    return list;
  }

  function drawMosaic(ctx, w, h, gems, count) {
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(buffer, 0, 0, w, h);
    const n = Math.max(1, Math.floor(gems.length * count));
    for (let i = 0; i < n; i += 1) {
      const { cx, cy, r } = gems[i];
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(cx, cy - r);
      ctx.lineTo(cx + r, cy);
      ctx.lineTo(cx, cy + r);
      ctx.lineTo(cx - r, cy);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(buffer, 0, 0, w, h);
      const glare = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
      glare.addColorStop(0, "rgba(255, 255, 255, 0.32)");
      glare.addColorStop(0.45, "rgba(232, 201, 138, 0.06)");
      glare.addColorStop(1, "rgba(0, 0, 0, 0.26)");
      ctx.fillStyle = glare;
      ctx.fill();
      ctx.restore();
      ctx.beginPath();
      ctx.moveTo(cx, cy - r);
      ctx.lineTo(cx + r, cy);
      ctx.lineTo(cx, cy + r);
      ctx.lineTo(cx - r, cy);
      ctx.closePath();
      ctx.strokeStyle = "rgba(232, 201, 138, 0.3)";
      ctx.lineWidth = 0.7;
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
        const duration = 2800;
        const tick = (now) => {
          const t = Math.min(1, (now - start) / duration);
          const eased = 1 - (1 - t) * (1 - t);
          drawMosaic(ctx, w, h, gems, eased);
          if (t < 1) window.requestAnimationFrame(tick);
        };
        window.requestAnimationFrame(tick);
      }, 2400);
    };
    img.src = portrait.currentSrc || portrait.src;
  }

  if (portrait.complete && portrait.naturalWidth) play();
  else portrait.addEventListener("load", play, { once: true });
})();
