(function () {
  const MUTE_KEY = "diamond-music-muted";
  const WANT_KEY = "diamond-music-wanted";
  const scene = document.body.dataset.scene || "invite";
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isMobile = window.matchMedia("(max-width: 640px)").matches;

  const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

  let ctx;
  let master;
  let musicTimer;
  let playing = false;
  let particles = [];
  let canvas;
  let c2d;
  let raf;

  function wanted() {
    return localStorage.getItem(MUTE_KEY) !== "1";
  }

  function setWanted(on) {
    localStorage.setItem(MUTE_KEY, on ? "0" : "1");
    localStorage.setItem(WANT_KEY, on ? "1" : "0");
  }

  function ensureAudio() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!ctx) {
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.11;
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 2200;
      const delay = ctx.createDelay();
      delay.delayTime.value = 0.28;
      const fb = ctx.createGain();
      fb.gain.value = 0.22;
      master.connect(filter);
      filter.connect(delay);
      delay.connect(fb);
      fb.connect(delay);
      filter.connect(ctx.destination);
      delay.connect(ctx.destination);
    }
    return ctx;
  }

  function tone(time, freq, dur, type, gainVal) {
    if (!ctx || !master) return;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, time);
    amp.gain.setValueAtTime(0.0001, time);
    amp.gain.exponentialRampToValueAtTime(gainVal, time + 0.03);
    amp.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    osc.connect(amp);
    amp.connect(master);
    osc.start(time);
    osc.stop(time + dur + 0.05);
  }

  const MELODY = [
    [0, 67], [1, 71], [2, 74],
    [3, 76], [4, 74], [5, 71],
    [6, 67], [7, 62], [8, 64],
    [9, 67], [10, 71], [11, 69],
    [12, 67], [13, 64], [14, 62],
    [15, 67], [16, 74], [17, 76],
    [18, 79], [19, 76], [20, 74],
    [21, 71], [22, 67], [23, 69],
    [24, 71], [25, 67], [26, 64],
    [27, 62], [28, 67], [29, 71],
    [30, 74], [31, 67],
  ];

  const BASS = [
    [0, 43], [3, 47], [6, 38], [9, 43],
    [12, 45], [15, 43], [18, 38], [21, 42],
    [24, 43], [27, 35], [30, 43],
  ];

  const STEP = 0.42;
  const LOOP = 32 * STEP;

  function schedule(from) {
    MELODY.forEach(([beat, note]) => {
      tone(from + beat * STEP, midi(note), 0.5, "triangle", 0.085);
    });
    BASS.forEach(([beat, note]) => {
      tone(from + beat * STEP, midi(note), 0.9, "sine", 0.05);
    });
  }

  function startMusic() {
    if (!wanted()) return;
    const audio = ensureAudio();
    if (!audio) return;
    setWanted(true);
    audio.resume().then(() => {
      if (master) master.gain.setTargetAtTime(0.11, audio.currentTime, 0.04);
      if (!playing) {
        playing = true;
        const startAt = audio.currentTime + 0.08;
        schedule(startAt);
        schedule(startAt + LOOP);
        musicTimer = window.setInterval(() => {
          if (!ctx) return;
          if (ctx.state === "suspended") return;
          schedule(ctx.currentTime + LOOP);
        }, LOOP * 1000);
      }
      syncButton();
    }).catch(() => syncButton());
    syncButton();
  }

  function stopMusic() {
    setWanted(false);
    if (ctx) ctx.suspend();
    syncButton();
  }

  function toggleMusic() {
    if (wanted() && playing && ctx && ctx.state !== "suspended") {
      stopMusic();
      return;
    }
    setWanted(true);
    startMusic();
  }

  function syncButton() {
    const btn = document.getElementById("musicToggle");
    if (!btn) return;
    const on = Boolean(wanted() && ctx && ctx.state !== "suspended" && playing);
    btn.setAttribute("aria-pressed", String(on));
    btn.classList.toggle("is-on", on);
    btn.classList.toggle("is-waiting", !on && wanted());
    btn.innerHTML = on
      ? '<span aria-hidden="true">♪</span><span>Музыка</span>'
      : '<span aria-hidden="true">♪</span><span>Включить музыку</span>';
  }

  function makeButton() {
    const btn = document.createElement("button");
    btn.id = "musicToggle";
    btn.type = "button";
    btn.className = "music-toggle";
    btn.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleMusic();
    });
    document.body.appendChild(btn);
    syncButton();
  }

  const COLORS = ["#e8c98a", "#c6a36a", "#c51e32", "#f7f1e6", "#8d3a44", "#d7b36a"];

  function spawnParticle(extra) {
    const w = window.innerWidth;
    const burst = extra && extra.burst;
    const x = burst ? extra.x + (Math.random() - 0.5) * 80 : Math.random() * w;
    const y = burst ? extra.y : -12;
    particles.push({
      x,
      y,
      vx: burst ? (Math.random() - 0.5) * 7 : (Math.random() - 0.5) * 0.6,
      vy: burst ? Math.random() * -4 - 1 : 0.35 + Math.random() * 0.9,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.08,
      size: burst ? 6 + Math.random() * 8 : 4 + Math.random() * 6,
      color: COLORS[(Math.random() * COLORS.length) | 0],
      shape: Math.random() < 0.35 ? "diamond" : Math.random() < 0.5 ? "rect" : "circle",
      life: burst ? 1 : 1,
    });
  }

  function drawParticle(p) {
    c2d.save();
    c2d.translate(p.x, p.y);
    c2d.rotate(p.rot);
    c2d.fillStyle = p.color;
    c2d.globalAlpha = Math.max(p.life, 0.15);
    if (p.shape === "diamond") {
      c2d.beginPath();
      c2d.moveTo(0, -p.size);
      c2d.lineTo(p.size * 0.7, 0);
      c2d.lineTo(0, p.size);
      c2d.lineTo(-p.size * 0.7, 0);
      c2d.closePath();
      c2d.fill();
    } else if (p.shape === "circle") {
      c2d.beginPath();
      c2d.arc(0, 0, p.size * 0.45, 0, Math.PI * 2);
      c2d.fill();
    } else {
      c2d.fillRect(-p.size * 0.35, -p.size * 0.55, p.size * 0.7, p.size * 1.1);
    }
    c2d.restore();
  }

  function tick() {
    if (!c2d || !canvas) return;
    const w = canvas.width;
    const h = canvas.height;
    c2d.clearRect(0, 0, w, h);
    const cap = scene === "assemble" ? (isMobile ? 14 : 22) : scene === "gallery" ? (isMobile ? 40 : 70) : (isMobile ? 28 : 48);
    if (!reduceMotion && particles.length < cap && Math.random() < 0.35) spawnParticle();
    particles = particles.filter((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.012;
      p.rot += p.vr;
      if (p.y > h + 20) return false;
      drawParticle(p);
      return true;
    });
    raf = window.requestAnimationFrame(tick);
  }

  function burst(x, y) {
    if (reduceMotion) return;
    const cx = x ?? window.innerWidth / 2;
    const cy = y ?? window.innerHeight * 0.38;
    for (let i = 0; i < (isMobile ? 36 : 64); i += 1) spawnParticle({ burst: true, x: cx, y: cy });
  }

  function setupCanvas() {
    canvas = document.createElement("canvas");
    canvas.className = "party-canvas";
    canvas.setAttribute("aria-hidden", "true");
    document.body.appendChild(canvas);
    c2d = canvas.getContext("2d");
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);
    if (!reduceMotion) raf = window.requestAnimationFrame(tick);
  }

  function balloons() {
    if (reduceMotion) return;
    const layer = document.createElement("div");
    layer.className = "balloon-layer";
    layer.setAttribute("aria-hidden", "true");
    const count = scene === "assemble" ? (isMobile ? 3 : 5) : scene === "gallery" ? (isMobile ? 6 : 10) : (isMobile ? 5 : 8);
    for (let i = 0; i < count; i += 1) {
      const b = document.createElement("div");
      const side = i % 2 === 0 ? "left" : "right";
      const color = COLORS[i % COLORS.length];
      b.className = `balloon balloon-${side}`;
      b.style.setProperty("--balloon", color);
      b.style.setProperty("--drift", `${6 + (i % 5) * 2}s`);
      b.style.setProperty("--delay", `${-i * 1.4}s`);
      b.style.setProperty("--x", side === "left" ? `${2 + (i % 4) * 4}vw` : `${2 + (i % 4) * 4}vw`);
      b.style.setProperty("--s", `${0.72 + (i % 3) * 0.12}`);
      layer.appendChild(b);
    }
    document.body.appendChild(layer);
  }

  document.addEventListener("visibilitychange", () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend();
    else if (wanted() && playing) ctx.resume();
  });

  document.addEventListener(
    "pointerdown",
    () => {
      if (wanted()) startMusic();
    },
    { once: true }
  );

  if (wanted()) startMusic();

  makeButton();
  setupCanvas();
  balloons();

  if (scene === "gallery" && !document.body.classList.contains("is-locked")) {
    window.setTimeout(() => burst(), 500);
  }

  window.DiamondParty = { burst, startMusic, toggleMusic };
})();
