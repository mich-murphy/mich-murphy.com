// Search on the index, the site's one script: home.html inlines it, minified by js.Build. Without it, the box stays
// hidden, the frame is labelled Filter, and the menus filter the list through :target (home-filters.css). With it, the
// box shows, the frame is labelled Search, and the Posts card becomes the list of results, updated in place. The line
// index, /index.json (home.json.json), loads on the box's first focus, on a pick from a menu, on Esc in the frame, on
// a filter's fragment typed into the address, or when the page opens at ?q= or #tag. If it doesn't load, the page
// goes back to working as it does without the script, and if the request itself failed, it asks again later.
// - The box holds words: each matches from the start of a word, in any case and script, so imperm finds impermanence
//   and rsa finds ssh_host_rsa_key, but sy doesn't find easy. A single character is ignored until there's a second.
//   "A phrase" matches as written, #nix any tag starting with nix, and 2023 that year. Every part must match.
// - The menus hold filters, kept apart from the words: a tag and a year. Picking replaces a menu's value. A tag
//   (#nixos) or year typed in full, then a space, moves out of the box into its menu, and tags typed that way combine.
// - Each word scores by where it's found: title 40, tag 30, heading 20, prose 10, code 5, and 1 for each line it's on,
//   up to 5, so a post about it beats a passing mention. Ties, and a query without words, keep date order.
// - A title has its words marked. When it lacks one, the line with the most of them, then of the heaviest kind, shows
//   under it and links to its section.
// - Each menu choice counts the posts the list would show with it instead, and one that would show none is off.
// - Ctrl+K, or ⌘K on Apple's platforms, focuses the box from anywhere on the page, down moves to the first result,
//   and Enter opens it. Esc closes an open menu, or clears the words, then the filters. A menu also closes when focus
//   leaves it, so it isn't left open over the list.
// - The list and its counts show a change at once. The address follows as /?q=…, or /#nixos for a tag alone, once
//   typing pauses or as the page is left, and a fragment typed into it sets the menus as following a menu's link to
//   it would. The status line that screen readers announce waits for typing to pause too, but follows a pick, Esc or
//   × at once.

/**
 * A post in the index, which lists them newest first.
 * @typedef {object} Post
 * @property {string} s its slug: the post is at /slug/
 * @property {string} t its title
 * @property {string} d its date, as 2024-04-08
 * @property {string[]} g its tags, as tag-slug.html gives them
 * @property {Line[]} l its lines
 */

/**
 * A line of a post's Markdown: its text, the id of the h2 or h3 it sits under ("" above the first), and its kind:
 * 0 for prose, 1 for a heading and 2 for code.
 * @typedef {[text: string, anchor: string, kind: 0 | 1 | 2]} Line
 */

/** @typedef {Post & { row: HTMLLIElement }} ListedPost a post with its row in the Posts card */

/**
 * A choice in the tag or year menu. Its link goes to a hidden target in the Posts card.
 * @typedef {object} MenuEntry
 * @property {HTMLAnchorElement} link
 * @property {"tag" | "year"} kind
 * @property {string} value the tag or year it sets, or "" for all
 * @property {string} id its target's id, decoded: the tag, y and the year, or all
 * @property {HTMLElement | null} count where it shows how many posts it would list; all has none
 */

/** @typedef {{ tags: string[], year: string }} Filters the menus' values: tags, which combine, and a year or "" */

/**
 * What the box holds.
 * @typedef {object} Query
 * @property {RegExp[]} words a pattern for each word and "phrase", which matches where a word starts
 * @property {RegExp | null} marker any of them, captured, to mark them with; null without words
 * @property {string[]} tagPrefixes from #nix
 * @property {string[]} years from 2023
 */

/**
 * A post the list shows, with the line to show under its title when the title lacks a word.
 * @typedef {{ post: ListedPost, score: number, excerpt: Line | undefined }} Match
 */

// ---- the page -------------------------------------------------------------------------------------------------------

/** The first element a selector matches, in the document or under an element */
const $ = (selector, root = document) => root.querySelector(selector);
/** Every element a selector matches, as an array */
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
/** A new element, with its properties set */
const create = (tag, properties) => Object.assign(document.createElement(tag), properties);

const box = $(".search-box");
const input = $(".search-input", box);
const keyHint = $(".search-key", box);
const searchCount = $(".search-count", box);
const frameLegend = $(".search-frame .legend");
const menus = $$(".filter-menu");
const tagLabel = $(".filter-tag b");
const yearLabel = $(".filter-year b");
const postsCount = $(".posts-count");
const statusLine = $(".posts-card [role=status]");
const list = $(".posts-card ol");
const rows = $$(".post-row", list);
const noMatch = create("p", { className: "no-match", hidden: true, textContent: "No post matches." });

/** @type {MenuEntry[]} */
const entries = $$(".filter-popover a").map((link) => {
  const id = decodeURIComponent(link.hash.slice(1));
  const kind = link.closest(".filter-year") ? "year" : "tag";
  let value = id;
  if (link.matches(".all")) value = "";
  else if (kind === "year") value = id.slice(1);
  return { link, kind, value, id, count: $(".count", link) };
});

// The shortcut that focuses the box takes a modifier, so a stray key or a word said to speech input can't set it off,
// as it could / (WCAG 2.1.4): Ctrl+K, or ⌘K on Apple's platforms, where Ctrl+K deletes to the end of the line in a
// text field. Chromium browsers name the platform in userAgentData, and the others in platform, deprecated but still
// everywhere
const onApple = /mac|iphone|ipad/i.test(navigator.userAgentData?.platform || navigator.platform || navigator.userAgent);

// What a word scores where it's found: in the title, in a tag, or in a line of each kind (prose, heading, code), and
// 1 more for each line it's on, up to MOST_LINES
const TITLE_SCORE = 40;
const TAG_SCORE = 30;
const LINE_SCORES = [10, 20, 5];
const MOST_LINES = 5;
// how long typing pauses before the address and the status follow it
const PAUSE_MS = 300;

/** The query the page opened with, ?q=…, which the box takes when it shows */
const openingQuery = new URLSearchParams(location.search).get("q");

// ---- state ----------------------------------------------------------------------------------------------------------

/** @type {Filters} no tag and no year. Nothing changes a Filters in place: a change makes a new one */
const NO_FILTERS = { tags: [], year: "" };

/** @type {Filters} */
let filters = NO_FILTERS;
/** @type {ListedPost[] | null} the index's posts that have a row, once it has loaded */
let index = null;
/**
 * The request for the index: unsent, pending, answered (the server answered, well or badly, so it isn't made again),
 * or failed (the request itself failed, so it's made again on a pick from a menu, or when the page is shown again)
 * @type {"unsent" | "pending" | "answered" | "failed"}
 */
let indexRequest = "unsent";
/** @type {"ArrowDown" | "Enter" | null} a key pressed in the box for the first result, waiting for the index */
let pendingKey = null;
/** the timer for the pause after a change, or 0 when there's none */
let pauseTimer = 0;
/** what the status line says, and whether a typed change is waiting for the pause to write it */
let statusText = "";
let statusWaits = false;

// ---- searching: pure functions, reading only their arguments and the menus' entries ---------------------------------

/** Text as a pattern that matches it literally */
const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** A pattern that matches only where a word starts: what's before it isn't a letter or a digit, in any script */
const atWordStart = (pattern) => new RegExp(`(?<![\\p{L}\\p{N}])${pattern}`, "iu");

/**
 * The box's words and "phrases", #tag prefixes and years.
 * @param {string} text
 * @returns {Query}
 */
const parseQuery = (text) => {
  const words = [];
  const tagPrefixes = [];
  const years = [];
  for (const token of text.toLowerCase().match(/"[^"]*"?|\S+/g) ?? []) {
    if (token.startsWith('"')) {
      const phrase = token.replaceAll('"', "");
      if (phrase) words.push(phrase);
    } else if (token.startsWith("#")) {
      if (token.length > 1) tagPrefixes.push(token.slice(1));
    } else if (/^(19|20)\d\d$/.test(token)) {
      years.push(token);
    } else if (token.length > 1) {
      words.push(token);
    }
  }
  return {
    words: words.map((word) => atWordStart(escapeRegExp(word))),
    marker: words.length > 0 ? atWordStart(`(${words.map(escapeRegExp).join("|")})`) : null,
    tagPrefixes,
    years,
  };
};

/** @param {Query} query */
const hasQuery = ({ words, tagPrefixes, years }) => words.length > 0 || tagPrefixes.length > 0 || years.length > 0;

/** @param {Filters} filters */
const hasFilters = ({ tags, year }) => tags.length > 0 || year !== "";

/**
 * Whether a post passes the menus' filters, and the query's #tag prefixes and years.
 * @param {Post} post
 * @param {Query} query
 * @param {Filters} filters
 */
const passes = (post, query, { tags, year }) => {
  const postYear = post.d.slice(0, 4);
  return (
    (!year || year === postYear) &&
    (query.years.length === 0 || query.years.includes(postYear)) &&
    tags.every((tag) => post.g.includes(tag)) &&
    query.tagPrefixes.every((prefix) => post.g.some((tag) => tag.startsWith(prefix)))
  );
};

/**
 * A post's score for the words, or null when it lacks one of them.
 * @param {Post} post
 * @param {RegExp[]} words
 */
const scoreOf = (post, words) => {
  let score = 0;
  for (const word of words) {
    let weight = 0;
    if (word.test(post.t)) weight = TITLE_SCORE;
    else if (post.g.some((tag) => word.test(tag))) weight = TAG_SCORE;
    let lines = 0;
    for (const [text, _anchor, kind] of post.l) {
      if (!word.test(text)) continue;
      lines++;
      weight = Math.max(weight, LINE_SCORES[kind]);
    }
    if (weight === 0) return null;
    score += weight + Math.min(lines, MOST_LINES);
  }
  return score;
};

/**
 * The line holding the most of the words, then of the heaviest kind, the first of a tie; undefined when none holds
 * one.
 * @param {Line[]} lines
 * @param {RegExp[]} words
 */
const bestLine = (lines, words) => {
  let best;
  let bestRank = 0;
  for (const line of lines) {
    const found = words.filter((word) => word.test(line[0])).length;
    if (found === 0) continue;
    // a kind scores under 50, so another word found always outranks it
    const rank = found * 50 + LINE_SCORES[line[2]];
    if (rank > bestRank) {
      best = line;
      bestRank = rank;
    }
  }
  return best;
};

/**
 * The posts that pass the filters and hold every part of the query, best first.
 * @param {ListedPost[]} posts
 * @param {Query} query
 * @param {Filters} filters
 * @returns {Match[]}
 */
const search = (posts, query, filters) => {
  const matches = [];
  for (const post of posts) {
    if (!passes(post, query, filters)) continue;
    const score = scoreOf(post, query.words);
    if (score === null) continue;
    const titleHasEveryWord = query.words.every((word) => word.test(post.t));
    matches.push({ post, score, excerpt: titleHasEveryWord ? undefined : bestLine(post.l, query.words) });
  }
  // the sort is stable, and the index is newest first, so ties keep date order
  return matches.sort((a, b) => b.score - a.score);
};

/** An excerpt's text: the line, cut behind an ellipsis when that keeps its first match in view */
const excerptText = (text, marker) => {
  const line = text.trimStart();
  const first = line.search(marker);
  return first > 30 ? `…${line.slice(first - 20)}` : line;
};

/**
 * Whether a menu's entry is applied: its tag or year is set, or for all, nothing in its menu is.
 * @param {MenuEntry} entry
 * @param {Filters} filters
 */
const isApplied = ({ kind, value }, { tags, year }) => {
  if (kind === "year") return value ? year === value : !year;
  return value ? tags.includes(value) : tags.length === 0;
};

/**
 * The filters that following a menu's link sets, as its fragment does without the script: its tag alone, its year
 * alone, or neither for all.
 * @param {MenuEntry} entry
 * @returns {Filters}
 */
const filtersFor = ({ kind, value }) => {
  if (!value) return NO_FILTERS;
  if (kind === "year") return { ...NO_FILTERS, year: value };
  return { ...NO_FILTERS, tags: [value] };
};

// a word followed by a space, with any # before it, and the space before it, which leaves the box with it
const TYPED_IN_FULL = /(^|\s)(#?)(\S+)(?=\s)/g;

/**
 * Moves each tag (#nixos) or year (2023) that's typed in full and followed by a space out of the text and into the
 * filters, where tags combine and a year replaces the year. The text also loses any leading space.
 * @param {string} text
 * @param {Filters} filters
 * @returns {{ text: string, filters: Filters }}
 */
const liftFilters = (text, filters) => {
  /** @type {MenuEntry[]} */
  const lifted = [];
  const rest = text.replace(TYPED_IN_FULL, (token, _space, hash, word) => {
    const kind = hash ? "tag" : "year";
    const value = word.toLowerCase();
    const entry = entries.find((e) => e.kind === kind && e.value === value);
    if (!entry) return token;
    lifted.push(entry);
    return "";
  });
  let { tags, year } = filters;
  for (const { kind, value } of lifted) {
    if (kind === "year") year = value;
    else if (!tags.includes(value)) tags = [...tags, value];
  }
  return { text: rest.trimStart(), filters: { tags, year } };
};

/**
 * The address's query or fragment for the box's words and the filters: #nixos for a tag alone, ?q=… for anything
 * else, and nothing for neither.
 * @param {string} words
 * @param {Filters} filters
 */
const addressFor = (words, { tags, year }) => {
  const text = words.trim();
  if (tags.length === 1 && !year && !text) return `#${tags[0]}`;
  const q = [...tags.map((tag) => `#${tag}`), year, text].filter(Boolean).join(" ");
  return q ? `?${new URLSearchParams({ q })}` : "";
};

/** What the status line says: how many posts match, or nothing while the list isn't searched or filtered */
const statusFor = (shown, searching) => {
  if (!searching) return "";
  return shown === 1 ? "1 post matches" : `${shown} posts match`;
};

// ---- drawing --------------------------------------------------------------------------------------------------------

/** Sets an ARIA state to true, or removes it */
const setAriaState = (element, name, on) => {
  if (on) element.setAttribute(name, "true");
  else element.removeAttribute(name);
};

/** The menus: the applied entries are current, and each summary shows its value (CSS writes all when it's empty) */
const renderMenus = () => {
  for (const entry of entries) setAriaState(entry.link, "aria-current", isApplied(entry, filters));
  tagLabel.textContent = filters.tags.join(", ");
  yearLabel.textContent = filters.year;
};

/**
 * Text, with what the marker matches in mark elements, to append to an element.
 * @param {string} text
 * @param {RegExp | null} marker
 * @returns {(string | HTMLElement)[]}
 */
const markWords = (text, marker) => {
  if (!marker) return [text];
  // split puts what the marker captures at the odd indexes
  return text.split(marker).map((part, i) => (i % 2 ? create("mark", { textContent: part }) : part));
};

/**
 * The link under a title to the line that matched, in its section.
 * @param {string} path the post's
 * @param {Line} line
 * @param {RegExp} marker
 */
const excerptLink = (path, [text, anchor], marker) => {
  const link = create("a", { className: "excerpt", href: anchor ? `${path}#${anchor}` : path });
  const branch = create("span", { className: "excerpt-branch", textContent: "└" });
  branch.setAttribute("aria-hidden", "true");
  link.append(branch, ...markWords(excerptText(text, marker), marker));
  return link;
};

/**
 * The rows: those that match show, best first, each with its title's words marked and any excerpt under it. While
 * nothing is searched or filtered, every row shows, in date order.
 * @param {Match[]} matches
 * @param {RegExp | null} marker
 * @param {boolean} searching
 */
const renderRows = (matches, marker, searching) => {
  const matchByRow = new Map(matches.map((match) => [match.post.row, match]));
  for (const row of rows) {
    const match = matchByRow.get(row);
    const title = $("a", row);
    row.hidden = searching && !match;
    title.replaceChildren(...markWords(title.textContent, marker));
    $(".excerpt", row)?.remove();
    if (match?.excerpt) row.append(excerptLink(title.getAttribute("href"), match.excerpt, marker));
  }
  // moving a row takes focus from its link, which gets it back if it's still shown
  const focused = document.activeElement;
  list.append(...(searching ? matches.map((match) => match.post.row) : rows));
  if (list.contains(focused)) focused.focus();
};

/** Writes the status line, which screen readers announce */
const announce = () => {
  statusWaits = false;
  statusLine.textContent = statusText;
};

/** The counts: the box's 3/17, the card's 3 of 17 or 17, and the status line, unless it's waiting for a pause */
const renderCounts = (shown, searching) => {
  const total = rows.length;
  noMatch.hidden = shown > 0;
  searchCount.textContent = searching ? `${shown}/${total}` : "";
  postsCount.textContent = searching ? `${shown} of ${total}` : `${total}`;
  statusText = statusFor(shown, searching);
  if (!statusWaits) announce();
};

/**
 * Each choice's count: the posts the list would show with it instead, so a tag's ignores the tags applied, and a
 * year's the year. One that would show none is off, unless it's applied.
 * @param {Query} query
 */
const renderChoiceCounts = (query) => {
  const withAnyTag = search(index, query, { ...filters, tags: [] });
  const withAnyYear = search(index, query, { ...filters, year: "" });
  for (const { link, kind, value, count } of entries) {
    if (!value) continue;
    const shown =
      kind === "year"
        ? withAnyYear.filter((match) => match.post.d.startsWith(value)).length
        : withAnyTag.filter((match) => match.post.g.includes(value)).length;
    count.textContent = `${shown}`;
    setAriaState(link, "aria-disabled", shown === 0 && !link.hasAttribute("aria-current"));
  }
};

/** The menus, and once the index has loaded, the list and its counts */
const render = () => {
  renderMenus();
  if (!index) return;
  const query = parseQuery(input.value);
  const searching = hasQuery(query) || hasFilters(filters);
  const matches = search(index, query, filters);
  renderRows(matches, query.marker, searching);
  renderCounts(searching ? matches.length : rows.length, searching);
  renderChoiceCounts(query);
};

// ---- the address ----------------------------------------------------------------------------------------------------

/** Writes the address for the words and filters */
const writeAddress = () => {
  try {
    history.replaceState(null, "", location.pathname + addressFor(input.value, filters));
  } catch {
    // WebKit throws after 100 changes in 10 seconds, and the next pause writes the address again
  }
};

const cancelPause = () => {
  clearTimeout(pauseTimer);
  pauseTimer = 0;
};

/**
 * Ends the pause after a change: the address follows, and so does the status line if a typed change is waiting for
 * it. Waiting keeps the address under WebKit's limit (Chrome drops changes instead), and keeps a screen reader from
 * reading every keystroke's count, and the list doesn't wait on either.
 */
const endPause = () => {
  cancelPause();
  writeAddress();
  if (statusWaits) announce();
};

const restartPause = () => {
  clearTimeout(pauseTimer);
  pauseTimer = setTimeout(endPause, PAUSE_MS);
};

// ---- the index ------------------------------------------------------------------------------------------------------

/** The server answered the request for the index badly, with a bad status or JSON that doesn't parse */
class IndexUnavailable extends Error {}

/**
 * The index's posts that have a row, each with it.
 * @returns {Promise<ListedPost[]>}
 */
const fetchIndex = async () => {
  const response = await fetch("/index.json");
  if (!response.ok) throw new IndexUnavailable();
  /** @type {Post[]} */
  let posts;
  try {
    posts = await response.json();
  } catch (error) {
    // JSON that doesn't parse is a SyntaxError, which WebKit throws as a DOMException of that name. Anything else
    // is the request failing partway through the body
    throw error.name === "SyntaxError" ? new IndexUnavailable() : error;
  }
  return posts.flatMap((post) => {
    const row = rows.find((r) => $("a", r).getAttribute("href") === `/${post.s}/`);
    return row ? [{ ...post, row }] : [];
  });
};

/**
 * Without the index, the page goes back to working as it does without the script: the box hides, the frame is
 * labelled Filter, and the menus' links go to their fragments, where home-filters.css filters the list. When the
 * server answered badly, the address is cleared of words, and a filter that was set is followed there, so a pick made
 * meanwhile still applies: only one, since home-filters.css applies one at a time, and the tag wins over the year.
 * When the request failed instead, the page may be being left, where following would cancel leaving and clearing
 * would lose what Back returns to, so the address stays as it is, with any update pending for it.
 * @param {boolean} serverAnsweredBadly
 */
const disableSearch = (serverAnsweredBadly) => {
  if (box.hidden) return;
  box.hidden = true;
  frameLegend.textContent = "Filter";
  for (const { link } of entries) link.removeAttribute("aria-current");
  tagLabel.textContent = "";
  yearLabel.textContent = "";
  if (!serverAnsweredBadly) return;
  cancelPause();
  const fragment = filters.tags[0] || (filters.year && `y${filters.year}`);
  try {
    history.replaceState(null, "", location.pathname);
  } catch {
    // WebKit's limit on address changes: the words stay in the address, and the fragment below still applies
  }
  if (fragment) location.hash = fragment;
};

// ---- changes --------------------------------------------------------------------------------------------------------

/** The address's fragment, decoded like the menus' ids */
const currentFragment = () => {
  const fragment = location.hash.slice(1);
  try {
    return decodeURIComponent(fragment);
  } catch {
    // a malformed escape, like a lone %E9, names no menu entry, so it's compared as it is
    return fragment;
  }
};

/**
 * Sets the filters the address's fragment names, as following a menu's link to it would: a tag, a year, or neither
 * for #all. Another fragment, like #main, leaves them as they are. Both are compared decoded, since a meta refresh
 * lands on %C3%A9 for é where the menus' links have %c3%a9. Returns whether the fragment named a filter.
 */
const applyFragment = () => {
  const fragment = currentFragment();
  const entry = entries.find((e) => e.id === fragment);
  if (entry) filters = filtersFor(entry);
  return entry !== undefined;
};

/**
 * Shows the box, with the filters the address names and the opening query's words. Until then, home-filters.css
 * filters the list by the fragment, and the menus' links change it, so it's read again here.
 */
const showSearch = () => {
  applyFragment();
  if (openingQuery) {
    const lifted = liftFilters(`${openingQuery} `, filters);
    input.value = lifted.text.trimEnd();
    filters = lifted.filters;
  }
  // a menu opened meanwhile would now open over the list rather than push it down, so it closes, keeping focus
  for (const menu of menus) {
    if (menu.contains(document.activeElement)) $("summary", menu).focus();
    menu.open = false;
  }
  box.hidden = false;
  frameLegend.textContent = "Search";
  render();
};

/** The first result's link, the first shown row's, or null */
const firstResult = () => $(".post-row:not([hidden]) a", list);

/** Acts on the key waiting for the list: down moves to the first result, and Enter opens it */
const actOnPendingKey = () => {
  const first = firstResult();
  if (first && pendingKey === "Enter") first.click();
  else if (first && pendingKey === "ArrowDown") first.focus();
  pendingKey = null;
};

/**
 * Loads the index, once. When it has loaded, the box shows if it's still hidden, or else the list is drawn, once,
 * however many changes waited for it, and a key that waited acts. If the server answers badly, there's no second try.
 * The request itself fails, even partway through the body, when the page is left while it loads: WebKit fails it as
 * the navigation starts, and Chrome and Firefox as the page unloads. That can't be told from a failure with the page
 * staying, so either way the page works as it does without the script, a key that waited is dropped, and the request
 * is made again when the page is shown again, as on Back from the back-forward cache, or on a pick from a menu.
 */
const loadIndex = async () => {
  if (indexRequest !== "unsent" && indexRequest !== "failed") return;
  indexRequest = "pending";
  try {
    index = await fetchIndex();
    indexRequest = "answered";
  } catch (error) {
    const serverAnsweredBadly = error instanceof IndexUnavailable;
    indexRequest = serverAnsweredBadly ? "answered" : "failed";
    pendingKey = null;
    disableSearch(serverAnsweredBadly);
    return;
  }
  if (box.hidden) showSearch();
  else render();
  actOnPendingKey();
};

/**
 * Shows a change to the words or the filters: the menus at once, and the list once the index has loaded, which this
 * asks for. The address follows after a pause, and so does the status line when the change was typed. A key still
 * waiting for the list is dropped.
 */
const update = ({ typed = false } = {}) => {
  pendingKey = null;
  statusWaits = typed;
  render();
  loadIndex();
  restartPause();
};

// ---- keys -----------------------------------------------------------------------------------------------------------

/**
 * Whether a key press is the shortcut: K with the platform's modifier, without Shift or Alt. K is the letter wherever a
 * layout puts it, but on a layout with no Latin letters, like Russian, it's the key in K's place, as browsers take
 * their own shortcuts. Dvorak types T in that place, which stays the browser's.
 */
const isSearchShortcut = (event) =>
  (onApple ? event.metaKey : event.ctrlKey) &&
  !event.shiftKey &&
  !event.altKey &&
  (/^k$/i.test(event.key) || (event.code === "KeyK" && !/^[a-z]$/i.test(event.key)));

/**
 * Esc closes an open menu, returning focus to its summary if it was inside, or else, in the frame, clears the words,
 * then the filters.
 */
const onEscape = (event) => {
  const openMenu = menus.find((menu) => menu.open);
  if (openMenu) {
    openMenu.open = false;
    if (openMenu.contains(event.target)) $("summary", openMenu).focus();
  } else if (event.target.closest(".search-frame") && !box.hidden) {
    if (input.value) input.value = "";
    else filters = NO_FILTERS;
    update();
  } else {
    return;
  }
  event.preventDefault();
};

/**
 * Down in the box moves to the first result, and Enter opens it. Pressed before the index has loaded, the key waits
 * for the list the index draws, and only the last one pressed acts, once. Enter while an IME is composing takes a
 * word instead, which Safari says with keyCode 229.
 */
const onBoxKey = (event) => {
  const enter = event.key === "Enter" && !event.isComposing && event.keyCode !== 229;
  if (event.key !== "ArrowDown" && !enter) return;
  // down would move the caret to the end, as it still does once the list has loaded with no result to move to
  if (event.key === "ArrowDown" && (firstResult() || !index)) event.preventDefault();
  pendingKey = event.key;
  if (index) actOnPendingKey();
};

// ---- wiring ---------------------------------------------------------------------------------------------------------

list.after(noMatch);
// the markup's key hint and aria-keyshortcuts name Ctrl+K
if (onApple) {
  keyHint.textContent = "⌘K";
  input.setAttribute("aria-keyshortcuts", "Meta+K");
}

input.addEventListener("focus", loadIndex);
input.addEventListener("input", () => {
  const lifted = liftFilters(input.value, filters);
  if (lifted.text !== input.value) input.value = lifted.text;
  filters = lifted.filters;
  update({ typed: true });
});

addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    onEscape(event);
  } else if (isSearchShortcut(event)) {
    // from anywhere on the page, in place of the browser's own use of it, while the box shows
    if (box.hidden) return;
    event.preventDefault();
    input.focus();
  } else if (event.target === input) {
    onBoxKey(event);
  }
});

// A pick replaces its menu's value, and × clears it. A menu closes on a pick, leaving focus on its summary, and on a
// click outside it. While the box is hidden, the links work as they do without the script, and after a request for
// the index that failed, a pick makes it again
addEventListener("click", (event) => {
  const link = event.target.closest(".filters a");
  for (const menu of menus) {
    if (!menu.contains(event.target)) menu.open = false;
  }
  if (link && indexRequest === "failed") loadIndex();
  if (!link || box.hidden) return;
  event.preventDefault();
  if (link.hasAttribute("aria-disabled")) return;
  const filter = link.closest(".filter");
  const value = entries.find((entry) => entry.link === link)?.value ?? "";
  if (filter.matches(".filter-year")) filters = { ...filters, year: value };
  else filters = { ...filters, tags: value ? [value] : [] };
  $("details", filter).open = false;
  $("summary", filter).focus();
  update();
});

// A menu closes when focus leaves it, so one left open by tabbing out doesn't cover the list. Focus that moves to an
// element around it hasn't left: pressing on what the mouse can't focus inside it, like its padding, or a choice in
// WebKit, focuses main, and the click that follows still picks. While the box is hidden, home-filters.css puts the
// menus in the flow, where they cover nothing, and closing one as a press moves focus would move the posts under the
// pointer before the click
addEventListener("focusin", ({ target }) => {
  if (box.hidden) return;
  for (const menu of menus) {
    if (menu.open && !menu.contains(target) && !target.contains(menu)) menu.open = false;
  }
});

// a fragment typed into the address, while the box shows
addEventListener("hashchange", () => {
  if (!box.hidden && applyFragment()) update();
});

// As the page is left, an update still pending is made, so Back returns to it. WebKit restores the page from its
// back-forward cache with the list as it was, but resets the box, as it does any field with autocomplete off, in a
// task after pageshow: the reset goes to the box's default value, so that's set to its words
addEventListener("pagehide", () => {
  if (pauseTimer) endPause();
  input.defaultValue = input.value;
});

// shown again, as on Back from the back-forward cache, after the request for the index failed: it's made again
addEventListener("pageshow", () => {
  if (indexRequest === "failed") loadIndex();
});

// An address with #nixos, #y2023 or ?q= opens with them set, once the index has loaded; any other shows the box now
applyFragment();
if (openingQuery || hasFilters(filters)) loadIndex();
else showSearch();
