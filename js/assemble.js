const COLORS = {
  6: "color-6",
  16: "color-16",
  25: "color-25",
};

const GRID = [
  [{ c: 6, n: 1 }, { c: 6, n: 2 }, { c: 6, n: 3 }, { c: 16, n: 1 }, { c: 25, n: 1 }, null, null, null, null, null],
  [{ c: 6, n: 1 }, { c: 16, n: 1 }, { c: 6, n: 1 }, { c: 6, n: 2 }, { c: 16, n: 1 }, null, null, null, null, null],
  [{ c: 6, n: 1 }, { c: 6, n: 2 }, { c: 6, n: 3 }, { c: 6, n: 4 }, { c: 16, n: 1 }, null, null, null, null, null],
  [{ c: 6, n: 1 }, { c: 6, n: 2 }, { c: 6, n: 3 }, { c: 6, n: 4 }, { c: 16, n: 1 }, null, null, null, null, null],
  [{ c: 6, n: 1 }, { c: 6, n: 2 }, { c: 6, n: 3 }, { c: 6, n: 4 }, { c: 6, n: 5 }, null, null, null, null, null],
  [null, null, null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null, null, null],
];

const STORAGE_KEY = "diamond-last-segment";
const TOTAL = GRID.flat().filter(Boolean).length;
const VALID_IDS = new Set(
  GRID.flatMap((row, r) => row.flatMap((cell, c) => (cell ? [`${r}-${c}`] : [])))
);

const chart = document.getElementById("chart");
const progressEl = document.getElementById("progress");
const finishBtn = document.getElementById("finishBtn");
const hintEl = document.getElementById("hint");
const veil = document.getElementById("veil");

function loadPlaced() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    const ids = Array.isArray(raw) ? raw.filter((id) => VALID_IDS.has(id)) : [];
    return new Set(ids);
  } catch {
    return new Set();
  }
}

function savePlaced(placed) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...placed]));
}

const placed = loadPlaced();

function key(r, c) {
  return `${r}-${c}`;
}

function updateStatus() {
  const count = placed.size;
  progressEl.innerHTML = `Собрано: <span>${count} / ${TOTAL}</span>`;
  const ready = count === TOTAL;
  finishBtn.classList.toggle("is-disabled", !ready);
  finishBtn.classList.toggle("is-ready", ready);
  finishBtn.setAttribute("aria-disabled", String(!ready));
  document.body.classList.toggle("is-complete", ready);
  if (ready) {
    hintEl.textContent = "Сегмент собран. Можно завершать.";
  } else if (count === 0) {
    hintEl.textContent = "Коснитесь ячейки, чтобы положить стразу.";
  } else {
    hintEl.textContent = `Осталось ${TOTAL - count}. Поля с крестиком не заполняются.`;
  }
}

function toggleCell(r, c, button) {
  const id = key(r, c);
  if (placed.has(id)) {
    placed.delete(id);
    button.classList.remove("placed");
    button.setAttribute("aria-pressed", "false");
  } else {
    placed.add(id);
    button.classList.add("placed");
    button.setAttribute("aria-pressed", "true");
  }
  savePlaced(placed);
  updateStatus();
}

function render() {
  chart.replaceChildren();

  const top = document.createDocumentFragment();
  const corner = document.createElement("div");
  top.appendChild(corner);
  for (let c = 1; c <= 10; c += 1) {
    const axis = document.createElement("div");
    axis.className = "axis";
    axis.textContent = String(c);
    top.appendChild(axis);
  }
  top.appendChild(document.createElement("div"));
  chart.appendChild(top);

  GRID.forEach((row, r) => {
    const left = document.createElement("div");
    left.className = "axis";
    left.textContent = String(r + 1);
    chart.appendChild(left);

    row.forEach((cell, c) => {
      if (!cell) {
        const blocked = document.createElement("div");
        blocked.className = "cell blocked";
        blocked.innerHTML = '<span class="x">×</span>';
        blocked.setAttribute("aria-disabled", "true");
        blocked.title = "Не часть этого сегмента";
        chart.appendChild(blocked);
        return;
      }

      const btn = document.createElement("button");
      const id = key(r, c);
      const isPlaced = placed.has(id);
      btn.type = "button";
      btn.className = `cell placeable ${COLORS[cell.c]}${isPlaced ? " placed" : ""}`;
      btn.dataset.row = String(r + 1);
      btn.dataset.col = String(c + 1);
      btn.setAttribute("aria-pressed", String(isPlaced));
      btn.setAttribute(
        "aria-label",
        `Строка ${r + 1}, столбец ${c + 1}, цвет ${cell.c}, количество ${cell.n}`
      );
      btn.innerHTML = `<span class="code">${cell.c}</span><sup>${cell.n}</sup><span class="gem" aria-hidden="true"></span>`;
      btn.addEventListener("click", () => toggleCell(r, c, btn));
      chart.appendChild(btn);
    });

    const right = document.createElement("div");
    right.className = "axis";
    right.textContent = String(r + 1);
    chart.appendChild(right);
  });

  const bottom = document.createDocumentFragment();
  bottom.appendChild(document.createElement("div"));
  for (let c = 1; c <= 10; c += 1) {
    const axis = document.createElement("div");
    axis.className = "axis";
    axis.textContent = String(c);
    bottom.appendChild(axis);
  }
  bottom.appendChild(document.createElement("div"));
  chart.appendChild(bottom);

  updateStatus();
}

finishBtn.addEventListener("click", (event) => {
  event.preventDefault();
  if (placed.size !== TOTAL) {
    hintEl.textContent = "Сначала соберите все 25 ячеек сегмента.";
    finishBtn.animate(
      [{ transform: "translateX(0)" }, { transform: "translateX(-6px)" }, { transform: "translateX(6px)" }, { transform: "translateX(0)" }],
      { duration: 280, easing: "ease-in-out" }
    );
    return;
  }
  localStorage.setItem("diamond-segment-complete", "1");
  if (window.DiamondParty) window.DiamondParty.burst();
  if (veil) {
    veil.hidden = false;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => veil.classList.add("is-on"));
    });
    window.setTimeout(() => {
      window.location.href = "gallery.html";
    }, 1100);
    return;
  }
  window.location.href = "gallery.html";
});

render();
