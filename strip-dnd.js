// Drag-and-drop каналов в ленте второго этажа фильтров (.v4d-strip): зажать постер
// (долгое нажатие пальцем или мышью) и двигать влево-вправо — только внутри ленты.
// Делегирование на document: ленты перерисовываются при смене категории.
const HOLD_MS = 350;   // сколько держать до начала перетаскивания
const SLOP = 8;        // сдвиг до срабатывания = это скролл, а не зажатие
const EDGE = 48;       // зона автопрокрутки у краёв ленты

let st = null; // { chip, strip, x0, y0, timer, dragging, grabDX, tx }

// ---- Сохранённый порядок каналов (общий для всех лент и категорий) ----
const KEY = "ivi-proto-chip-order";
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } };
const idsOf = (strip) => [...strip.querySelectorAll(".v4d-chip")].map((c) => c.dataset.id);

// После перетаскивания: каналы этой ленты встают в общий список в новом порядке
// (на место первого из них), остальные сохранённые позиции не трогаем.
function save(strip) {
  const ids = idsOf(strip);
  const saved = load();
  const at = saved.findIndex((id) => ids.includes(id));
  const rest = saved.filter((id) => !ids.includes(id));
  rest.splice(at < 0 ? rest.length : at, 0, ...ids);
  try { localStorage.setItem(KEY, JSON.stringify(rest)); } catch {}
}

// Применяем порядок к отрисованной ленте: каналы с сохранённой позицией
// переставляются между собой, остальные остаются на своих местах.
function applyOrder(strip) {
  const rank = new Map(load().map((id, i) => [id, i]));
  const chips = [...strip.querySelectorAll(":scope > .v4d-chip")];
  const known = chips.filter((c) => rank.has(c.dataset.id));
  const sorted = [...known].sort((a, b) => rank.get(a.dataset.id) - rank.get(b.dataset.id));
  if (sorted.every((c, i) => c === known[i])) return; // уже по порядку
  const slots = chips.map((c) => (rank.has(c.dataset.id) ? sorted.shift() : c));
  strip.append(...slots);
}

// Ленты перерисовываются при смене категории/варианта — ловим это и сортируем.
new MutationObserver((muts) => {
  const strips = new Set(muts.map((m) => m.target.closest?.(".v4d-strip")).filter(Boolean));
  document.querySelectorAll(".v4d-strip").forEach((s) => { if (!s.dataset.ordered) strips.add(s); });
  strips.forEach((s) => { if (!s.classList.contains("is-sorting")) { s.dataset.ordered = "1"; applyOrder(s); } });
}).observe(document.body, { childList: true, subtree: true });

function cancel() {
  if (!st) return;
  clearTimeout(st.timer);
  if (st.dragging) {
    const { chip, strip } = st;
    chip.classList.remove("is-dragging");
    strip.classList.remove("is-sorting");
    chip.style.transform = "";
    save(strip);
    // Глушим клик, который придёт следом за отпусканием (иначе переключится канал).
    const kill = (e) => { e.stopPropagation(); e.preventDefault(); };
    document.addEventListener("click", kill, { capture: true, once: true });
    setTimeout(() => document.removeEventListener("click", kill, true), 0);
  }
  st = null;
}

// FLIP: соседи плавно доезжают на новые места после перестановки в DOM.
function flip(strip, mutate) {
  const chips = [...strip.querySelectorAll(".v4d-chip:not(.is-dragging)")];
  const before = new Map(chips.map((c) => [c, c.getBoundingClientRect().left]));
  mutate();
  chips.forEach((c) => {
    const dx = before.get(c) - c.getBoundingClientRect().left;
    if (!dx) return;
    c.style.transition = "none";
    c.style.transform = `translateX(${dx}px)`;
    requestAnimationFrame(() => { c.style.transition = "transform .18s ease"; c.style.transform = ""; });
  });
}

function startDrag() {
  const { chip, strip } = st;
  st.dragging = true;
  st.grabDX = st.x0 - chip.getBoundingClientRect().left;
  chip.classList.add("is-dragging");
  strip.classList.add("is-sorting");
  navigator.vibrate?.(15);
}

function move(x) {
  const { chip, strip } = st;
  // Держим постер под пальцем, но не даём выйти за края ленты.
  const sr = strip.getBoundingClientRect();
  const w = chip.offsetWidth;
  const left = Math.min(Math.max(x - st.grabDX, sr.left), sr.right - w);
  // Сосед, чью середину перешли, — меняемся местами.
  const center = left + w / 2;
  const target = [...strip.querySelectorAll(".v4d-chip:not(.is-dragging)")].find((c) => {
    const r = c.getBoundingClientRect(); return center > r.left && center < r.right;
  });
  if (target) {
    const r = target.getBoundingClientRect();
    const ref = center > r.left + r.width / 2 ? target.nextSibling : target;
    if (ref !== chip && ref !== chip.nextSibling) flip(strip, () => strip.insertBefore(chip, ref));
  }
  // Сдвиг относительно места постера в раскладке (без текущего transform).
  const layoutLeft = chip.getBoundingClientRect().left - (st.tx || 0);
  st.tx = left - layoutLeft;
  chip.style.transform = `translateX(${st.tx}px)`;
  // Автопрокрутка ленты, когда тянем к краю.
  if (x < sr.left + EDGE) strip.scrollLeft -= 8;
  else if (x > sr.right - EDGE) strip.scrollLeft += 8;
}

document.addEventListener("pointerdown", (e) => {
  if (e.button > 0) return;
  const chip = e.target.closest(".v4d-strip .v4d-chip");
  if (!chip || e.target.closest(".v4d-chip-fav")) return;
  cancel();
  st = { chip, strip: chip.parentElement, x0: e.clientX, y0: e.clientY, dragging: false };
  st.timer = setTimeout(() => st && startDrag(), HOLD_MS);
});

document.addEventListener("pointermove", (e) => {
  if (!st) return;
  if (!st.dragging) {
    if (Math.hypot(e.clientX - st.x0, e.clientY - st.y0) > SLOP) cancel(); // это скролл
    return;
  }
  e.preventDefault();
  move(e.clientX);
});

document.addEventListener("pointerup", cancel);
document.addEventListener("pointercancel", cancel);
// На тач-экране во время перетаскивания не даём браузеру скроллить ленту/страницу.
document.addEventListener("touchmove", (e) => { if (st?.dragging) e.preventDefault(); }, { passive: false });
// Долгое нажатие не должно открывать контекстное меню / «сохранить картинку».
document.addEventListener("contextmenu", (e) => { if (e.target.closest(".v4d-strip .v4d-chip")) e.preventDefault(); });
