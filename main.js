// Новая главная сервиса — 1-в-1 по макету H5Z (новая навигация).
// Данные контента — реальные подборки Иви; герой и стикеры — ассеты макета.
import {
  tvChannels, channelThumb, collection, contentThumb, poster, accessLabel,
} from "./ivi-api.js";

const feed = document.getElementById("homeFeed");
const PA = "https://app.paper.design/file-assets/01M45XC9MW0NZTHRFA799G9DJ7/";
const watch = (it) => `https://www.ivi.ru/watch/${it.hru || it.id}`;

// ---------- Галерея 2 этажа — тот же компонент, что на ТВ онлайн ----------
// 2 ряда постеров 16:9, горизонтальный скролл со стрелками и градиентами.
const ARROW_SVG = '<svg viewBox="0 0 12 32" width="11" height="29"><path fill="currentColor" d="M11.607 14.626C12.131 15.461 12.131 16.539 11.607 17.374L2.425 32L0 30.352L9.01 16L0 1.648L2.425 0L11.607 14.626Z"/></svg>';
const galCell = (it) => `<div class="gal-cell"><a class="gal-thumb" href="${watch(it)}" target="_blank" rel="noopener" title="${it.title}"><img class="gal-img" loading="lazy" src="${contentThumb(it, 480, 270)}" alt="${it.title}"></a></div>`;
function gallery(title, items) {
  if (!items.length) return "";
  return `<section class="gal">
    <h2 class="gal-head">${title} <span class="chev">›</span></h2>
    <div class="gal-grid">${items.map(galCell).join("")}</div>
    <div class="gal-less" aria-hidden="true"><span class="gal-more-arrow gal-arrow-left">${ARROW_SVG}</span></div>
    <div class="gal-more" aria-hidden="true"><span class="gal-more-arrow">${ARROW_SVG}</span></div>
  </section>`;
}
// Стрелки + градиенты прокрутки (как в каталоге ТВ онлайн).
function addScrollHint(sec) {
  const grid = sec.querySelector(".gal-grid");
  const more = sec.querySelector(".gal-more");
  const less = sec.querySelector(".gal-less");
  if (!grid || !more) return;
  more.querySelector(".gal-more-arrow").addEventListener("click", () => grid.scrollBy({ left: grid.clientWidth * 0.8, behavior: "smooth" }));
  less?.querySelector(".gal-more-arrow").addEventListener("click", () => grid.scrollBy({ left: -grid.clientWidth * 0.8, behavior: "smooth" }));
  const sync = () => {
    const cell = grid.querySelector(".gal-cell");
    if (cell) {
      const sRect = sec.getBoundingClientRect(), cRect = cell.getBoundingClientRect();
      const top = (cRect.top - sRect.top) + "px", h = (cRect.height * 2 + 8) + "px";
      more.style.top = top; more.style.height = h;
      if (less) { less.style.top = top; less.style.height = h; }
    }
    const scrollable = grid.scrollWidth > grid.clientWidth + 4;
    const atEnd = grid.scrollLeft + grid.clientWidth >= grid.scrollWidth - 4;
    more.classList.toggle("is-hidden", !scrollable || atEnd);
    if (less) less.classList.toggle("is-hidden", grid.scrollLeft <= 4);
  };
  sync();
  grid.addEventListener("scroll", sync, { passive: true });
  window.addEventListener("resize", sync);
  setTimeout(sync, 300);
}

// ---------- Герой (ассеты макета) ----------
function heroHTML() {
  return `<section class="mh-hero">
    <div class="mh-hero-peek mh-peek-l" style="background-image:url('${PA}08C6ZEF52DHASN1T86XWYBBWHV.jpg')"></div>
    <div class="mh-hero-stage" style="background-image:url('${PA}4CZQV1YE0SG9XP9DDEYYRD3EKK.jpg')">
      <div class="mh-hero-col">
        <img class="mh-hero-logo" src="${PA}06CX82JTQBEJPQWZX8M5167B35.png" alt="Иви">
        <img class="mh-hero-title" src="${PA}5VMBCS1NTEGN687AK1F1ZHCK9M.png" alt="Холод">
        <div class="mh-hero-sub">Самый долгожданный эксклюзив в этом году</div>
        <a class="mh-hero-btn" href="https://www.ivi.ru/watch/holod" target="_blank" rel="noopener">Смотреть</a>
      </div>
    </div>
    <div class="mh-hero-peeks-r">
      <div class="mh-hero-peek" style="background-image:url('${PA}7V2RCQ9KTAFN4F7KQHDG3Y4DF0.jpg')"></div>
      <div class="mh-hero-peek" style="background-image:url('${PA}39SH5VCSB8MX183S03HVER0FYT.png')"></div>
    </div>
  </section>`;
}

// ---------- «Продолжить просмотр»: чипы + карточки с прогрессом ----------
const PILLS = ["Продолжить просмотр", "На основе Буду смотреть", "Спорт прямо в эфире", "Топ 10 для тебя", "Лучшие шоу"];
function continueBlock(items) {
  const pills = PILLS.map((t, i) => {
    const it = items[i] || {};
    return `<div class="mh-pill"><span class="mh-pill-t">${t}</span><span class="mh-pill-img" style="background-image:url('${contentThumb(it, 240, 135)}')"></span></div>`;
  }).join("");
  const SUB = ["1 сезон, 2 серия", "ещё 40 минут", "1 сезон, 2 серия", "1 сезон, 2 серия", '<span class="mh-cw-new">новая серия</span>'];
  const cards = items.slice(0, 5).map((it, i) => `
    <a class="mh-cw" href="${watch(it)}" target="_blank" rel="noopener">
      <span class="mh-cw-img" style="background-image:url('${contentThumb(it, 480, 270)}')"><span class="mh-cw-bar"><span style="width:${[70, 55, 40, 85, 20][i]}%"></span></span></span>
      <span class="mh-cw-ttl">${it.title || ""}</span>
      <span class="mh-cw-sub">${SUB[i]}</span>
    </a>`).join("");
  return `<section class="mh-continue">
    <div class="mh-pills">${pills}</div>
    <div class="mh-cwrow">${cards}</div>
  </section>`;
}

// ---------- Лента каналов ----------
function channelsStrip(channels) {
  if (!channels.length) return "";
  return `<section class="mh-chsec"><div class="mh-chrow">${channels.slice(0, 16).map((ch) =>
    `<a class="mh-ch" href="player.html?id=${ch.id}" title="${ch.title}" style="background-image:url('${channelThumb(ch)}')"></a>`).join("")}</div></section>`;
}

// ---------- Онбординг: стикеры ----------
const STICKERS = [
  { t: "мелодрама", c: "#F30745" }, { t: "комедия", c: "#FFB020" }, { t: "страшное", c: "#E23744" },
  { t: "детектив", c: "#8E7CFF" }, { t: "смешное", c: "#FFCC00" }, { t: "русское", c: "#C9A24B" },
  { t: "драма", c: "#5AA9FF" }, { t: "фантастика", c: "#21D468" },
];
function stickersBlock() {
  const st = STICKERS.map((s, i) => `<button class="mh-st${i < 3 ? " is-on" : ""}" type="button" style="--sc:${s.c}">${s.t}</button>`).join("");
  return `<section class="mh-onb">
    <h2 class="mh-onb-ttl">Выбери 3 и больше стикеров</h2>
    <div class="mh-onb-sub">А мы подберём похожий контент</div>
    <div class="mh-onb-row">${st}</div>
    <button class="mh-onb-cta" type="button">Настроить рекомендации <span class="mh-onb-n">3</span></button>
  </section>`;
}

// ---------- Промо: «Смотрят больше всего» (3 вертикальных постера) ----------
function promoBlock(items) {
  const three = items.slice(0, 3);
  if (three.length < 3) return "";
  return `<section class="mh-promo">
    <div class="mh-head"><span class="mh-promo-ic">👀</span><h2 class="mh-h2">Смотрят больше всего на этой неделе</h2></div>
    <div class="mh-promo-row">${three.map((it) => `
      <a class="mh-pcard" href="${watch(it)}" target="_blank" rel="noopener" style="background-image:url('${poster(it) || contentThumb(it, 782, 1200)}')">
        <span class="mh-pcard-grad"></span>
        <span class="mh-pcard-ttl">${it.title}</span>
      </a>`).join("")}</div>
  </section>`;
}

function dedupe(list) {
  const seen = new Set(), out = [];
  list.forEach((it) => { const k = it.id || it.hru; if (k && !seen.has(k)) { seen.add(k); out.push(it); } });
  return out;
}

(async function init() {
  feed.innerHTML = `<div class="grid-empty">Загружаем Иви…</div>`;
  const [channels, tvshows, realiti] = await Promise.all([
    tvChannels().catch(() => []),
    collection("popular-now-tvshows", { to: 60 }).catch(() => []),
    collection("realiti-shou", { to: 40 }).catch(() => []),
  ]);
  const pool = dedupe([...tvshows, ...realiti]);
  if (!pool.length && !channels.length) {
    feed.innerHTML = `<div class="grid-empty">Не удалось загрузить данные Иви</div>`;
    return;
  }
  const w = (n, c = 10) => pool.slice(n % pool.length, (n % pool.length) + c);

  feed.innerHTML = [
    heroHTML(),
    continueBlock(pool.slice(0, 5)),
    gallery("Лучшие сериалы", w(5, 16)),
    gallery("Фантастические сериалы", w(18, 16)),
    // Ниже «Фантастических сериалов» на главной ничего не показываем.
  ].join("");
  // Стрелки + градиенты прокрутки на всех галереях (как на ТВ онлайн).
  feed.querySelectorAll(".gal").forEach(addScrollHint);
})();
