// Search on the index, the site's one script: home.html inlines it, minified by js.Build. Without it, the box stays
// hidden, the frame is labelled Filter, and the menus filter the list through :target (filters.css). With it, the box
// shows, the frame is labelled Search, and the Posts card becomes the list of results, updated in place. The line
// index, /index.json (home.json.json), loads on the box's first focus, on a pick from a menu, or when the page opens
// at ?q= or #tag. If it doesn't load, the page goes back to working as it does without the script.
// - The box holds words: each matches from the start of a word, in any case and script, so imperm finds impermanence
//   and rsa finds ssh_host_rsa_key, but sy doesn't find easy. A single character is ignored until there's a second.
//   "A phrase" matches as written, #nix any tag starting with nix, and 2023 that year. Every part must match.
// - The menus hold filters, kept apart from the words: a tag and a year. Picking replaces a menu's value. A tag or
//   year typed in full, then a space, moves out of the box into its menu, and tags typed that way combine.
// - Each word scores by where it's found: title 40, tag 30, heading 20, prose 10, code 5, and 1 for each line it's on,
//   up to 5, so a post about it beats a passing mention. Ties, and a query without words, keep date order.
// - A title has its words marked. When it lacks one, the line with the most of them, then of the heaviest kind, shows
//   under it and links to its section.
// - Each menu choice counts the posts the list would show with it instead, and one that would show none is off.
// - / focuses the box, down moves to the first result and Enter opens it. Esc closes an open menu, or clears the
//   words, then the filters. The address follows as /?q=…, or /#nixos for a tag alone, once typing pauses, and a
//   fragment typed into it sets the menus as following a menu's link to it would.
const $ = (s, e = document) => e.querySelector(s);
const $$ = (s, e = document) => [...e.querySelectorAll(s)];
const box = $("search");
const inp = $(".sq", box);
const sc = $(".sc", box);
const lg = $(".sfr .legend");
const lc = $(".lc");
const st = $(".idx [role=status]");
const ol = $(".idx ol");
const rows = $$(".tr", ol);
const n = rows.length;
const dets = $$(".fmn");
const none = Object.assign(document.createElement("p"), { className: "none", hidden: true, textContent: "No post matches." });
// each menu entry as [link, whether it's a year, value, the id it goes to]: all has no value, and the id all
const E = $$(".fpop a").map((a) => {
  const f = decodeURIComponent(a.hash.slice(1));
  const y = !!a.closest(".fr-y");
  return [a, y, a.matches(".all") ? "" : y ? f.slice(1) : f, f];
});
// the scores of prose, heading and code lines
const KIND = [10, 20, 5];
// a match starts a word: what's before it isn't a letter or a digit
const word = (w) => RegExp("(?<![\\p{L}\\p{N}])" + w, "iu");
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const html = (s) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt()};`);
const attr = (e, k, v) => (v ? e.setAttribute(k, v) : e.removeAttribute(k));
let T = [];
let Y = "";
let D;
let P;

// the box's words, "phrases", #tag prefixes and years
const parse = (q) => {
  const Q = { t: [], g: [], y: [] };
  for (let w of q.toLowerCase().match(/"[^"]*"?|\S+/g) || []) {
    if (w[0] == '"') (w = w.replace(/"/g, "")) && Q.t.push(w);
    else if (w[0] == "#") w[1] && Q.g.push(w.slice(1));
    else if (/^(19|20)\d\d$/.test(w)) Q.y.push(w);
    else if (w[1]) Q.t.push(w);
  }
  return Q;
};

// the posts that pass the filters and hold every part of the query, best first, each with the line to show
const run = (T, Y, Q, res) => {
  const out = [];
  next: for (const p of D) {
    const y = p.d.slice(0, 4);
    if ((Y && Y != y) || (Q.y[0] && !Q.y.includes(y)) || !T.every((t) => p.g.includes(t))) continue;
    if (!Q.g.every((g) => p.g.some((x) => x.startsWith(g)))) continue;
    let s = 0;
    let inT = 0;
    let ex;
    let best = 0;
    for (const r of res) {
      let w = r.test(p.t) ? (inT++, 40) : p.g.some((x) => r.test(x)) ? 30 : 0;
      let c = 0;
      for (const l of p.l) if (r.test(l[1])) c++, (w = Math.max(w, KIND[l[3]]));
      if (!w) continue next;
      s += w + Math.min(c, 5);
    }
    if (inT < res.length)
      for (const l of p.l) {
        const k = res.filter((r) => r.test(l[1])).length * 50 + KIND[l[3]];
        if (k > 50 && k > best) (best = k), (ex = l);
      }
    out.push({ p, s, ex });
  }
  // the sort is stable, and the index is newest first
  return out.sort((a, b) => b.s - a.s);
};

const draw = () => {
  for (const [a, y, v] of E) attr(a, "aria-current", (v ? (y ? Y == v : T.includes(v)) : !(y ? Y : T[0])) && "true");
  $(".fr-t b").textContent = T.join(", ");
  $(".fr-y b").textContent = Y;
  if (!D) return;
  const Q = parse(inp.value);
  const res = Q.t.map((w) => word(esc(w)));
  const mk = Q.t[0] && word(`(${Q.t.map(esc).join("|")})`);
  const mark = (s) => (mk ? s.split(mk) : [s]).map((x, i) => (i % 2 ? `<mark>${html(x)}</mark>` : html(x))).join("");
  const on = T[0] || Y || Q.t[0] || Q.g[0] || Q.y[0];
  const R = run(T, Y, Q, res);
  const hit = new Map(R.map((h) => [h.p.r, h]));
  const m = on ? R.length : n;
  for (const r of rows) {
    const h = hit.get(r);
    const a = $("a", r);
    r.hidden = on && !h;
    a.innerHTML = mark(a.textContent);
    $(".ex", r)?.remove();
    if (h?.ex) {
      // the excerpt keeps its first match in view
      let x = h.ex[1].trimStart();
      const i = x.search(mk);
      if (i > 30) x = "…" + x.slice(i - 20);
      r.insertAdjacentHTML("beforeend", `<a class="ex" href="${html(a.getAttribute("href") + (h.ex[2] && "#" + h.ex[2]))}"><span class="br" aria-hidden="true">└</span>${mark(x)}</a>`);
    }
  }
  ol.append(...(on ? R.map((h) => h.p.r) : rows));
  none.hidden = m;
  sc.textContent = on ? `${m}/${n}` : "";
  lc.textContent = on ? `${m} of ${n}` : n;
  st.textContent = on ? (m == 1 ? "1 post matches" : m + " posts match") : "";
  // a tag's count is the list's with that tag instead of the one applied, and a year's the same
  const Rt = run([], Y, Q, res);
  const Ry = run(T, "", Q, res);
  for (const [a, y, v] of E) {
    if (!v) continue;
    const c = (y ? Ry : Rt).filter((h) => (y ? h.p.d.startsWith(v) : h.p.g.includes(v))).length;
    a.lastChild.textContent = c;
    attr(a, "aria-disabled", !c && !a.hasAttribute("aria-current") && "true");
  }
};

// the address, once typing pauses: WebKit throws after 100 changes in 10 seconds, and Chrome drops them, so the list
// doesn't wait on it
let tu;
const url = () => {
  clearTimeout(tu);
  tu = setTimeout(() => {
    const w = inp.value.trim();
    const q = [...T.map((t) => "#" + t), Y, w].filter((x) => x).join(" ");
    try {
      history.replaceState(null, "", location.pathname + (T[0] && !T[1] && !Y && !w ? "#" + T[0] : q && "?" + new URLSearchParams({ q })));
    } catch {}
  }, 300);
};

// without the index, the page goes back to working as it does without the script: the box hides, the frame is
// labelled Filter, and the menus' links go to their fragments, where filters.css filters the list. The address is
// cleared of words. When follow is set, a filter that was set is followed there, so a pick made meanwhile still
// applies: only one, since filters.css applies one at a time, and the tag wins over the year
const off = (follow) => {
  if (box.hidden) return;
  clearTimeout(tu);
  box.hidden = true;
  lg.textContent = "Filter";
  for (const [a] of E) attr(a, "aria-current");
  for (const b of $$(".fmn b")) b.textContent = "";
  const f = T[0] || (Y && "y" + Y);
  try {
    history.replaceState(null, "", location.pathname);
  } catch {}
  if (follow && f) location.hash = f;
};

// the index, once: each post keeps its row. If it doesn't load, there's no second try. A pick made meanwhile is
// followed only when the server answered badly, with a SyntaxError: JSON that doesn't parse, which WebKit throws as a
// DOMException of that name, or a bad status, thrown as one. When the request itself fails, even partway through the
// body, as WebKit's does when the page is left while it loads, nothing is, since setting the fragment cancels leaving
const load = () =>
  (P ||= fetch("/index.json")
    .then((r) => {
      if (!r.ok) throw SyntaxError(r.status);
      return r.json();
    })
    .then((d) => {
      D = d.filter((p) => (p.r = rows.find((r) => $("a", r).getAttribute("href") == `/${p.s}/`)));
    })
    .catch((e) => off(e.name == "SyntaxError")));

const go = () => {
  load().then(() => box.hidden || draw());
  url();
};

// the filter the address's fragment names, as following a menu's link to it would set it: a tag, a year, or neither
// for #all. Another fragment, like #main, leaves them as they are. Both are compared decoded, since a meta refresh
// lands on %C3%A9 for é where the menus' links have %c3%a9
const hash = () => {
  let h = location.hash.slice(1);
  try {
    h = decodeURIComponent(h);
  } catch {}
  const e = E.find((x) => x[3] == h);
  if (e) {
    T = e[1] || !e[2] ? [] : [e[2]];
    Y = e[1] ? e[2] : "";
  }
  return e;
};

// a tag or year typed in full, then a space, leaves the box for its menu
const lift = (s) =>
  s
    .replace(/(^|\s)(#?)(\S+)(?=\s)/g, (m, _, h, w) => {
      w = w.toLowerCase();
      if (!E.some((e) => e[2] && e[2] == w && e[1] == !h)) return m;
      h ? T.includes(w) || T.push(w) : (Y = w);
      return "";
    })
    .trimStart();

inp.onfocus = load;
inp.oninput = () => {
  const v = lift(inp.value);
  if (v != inp.value) inp.value = v;
  go();
};

// a pick replaces its menu's value, and × clears it. A menu closes on a pick, leaving focus on it, and on a click
// outside it. While the box is hidden, until the index loads or for good if it doesn't, the links work as they do
// without the script
addEventListener("click", (e) => {
  const a = e.target.closest(".ff a");
  for (const d of dets) if (!d.contains(e.target)) d.open = false;
  if (!a || box.hidden) return;
  e.preventDefault();
  if (a.hasAttribute("aria-disabled")) return;
  const fr = a.closest(".fr");
  const v = E.find((x) => x[0] == a)?.[2] || "";
  fr.matches(".fr-y") ? (Y = v) : (T = v ? [v] : []);
  $("details", fr).open = false;
  $("summary", fr).focus();
  go();
});

addEventListener("keydown", (e) => {
  const t = e.target;
  const d = $(".fmn[open]");
  const f = $(".tr:not([hidden]) a", ol);
  if (e.key == "Escape") {
    if (d) {
      d.open = false;
      if (d.contains(t)) $("summary", d).focus();
    } else if (t.closest(".sfr") && !box.hidden) {
      inp.value ? (inp.value = "") : ((T = []), (Y = ""));
      go();
    } else return;
    e.preventDefault();
  } else if (t == inp) {
    if (e.key == "ArrowDown" && f) e.preventDefault(), f.focus();
    // not while an IME is composing, where Enter takes a word, which Safari says with keyCode 229
    if (e.key == "Enter" && f && !e.isComposing && e.keyCode != 229) f.click();
  } else if (e.key == "/" && !box.hidden && !e.ctrlKey && !e.metaKey && !e.altKey) {
    e.preventDefault();
    inp.focus();
  }
});

// a fragment typed into the address, while the box shows
addEventListener("hashchange", () => box.hidden || (hash() && go()));

// an address with #nixos, #y2023 or ?q= opens with them set, once the index has loaded. Until then, filters.css keeps
// filtering by the fragment, and the menus' links change it, so it's read again when the box shows
ol.after(none);
const q = new URLSearchParams(location.search).get("q");
const show = () => {
  hash();
  if (q) inp.value = lift(q + " ").trimEnd();
  box.hidden = false;
  lg.textContent = "Search";
  draw();
};
hash();
q || T[0] || Y ? load().then(() => D && show()) : show();
