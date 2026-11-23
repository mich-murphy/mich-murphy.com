// Search on the index, the site's one script: home.html inlines it, bundled with search-core.js and minified by
// js.Build. Without it, the box stays hidden and the menus filter the list through :target (home-filters.css). With
// it, the box shows and the Posts card becomes the list of results. Only words need the line index, /search.json:
// filters, and tags and years typed into the box, work from the rows' data-tag and data-year. It loads on the box's
// first focus, or at ?q= with words. If the server answers badly, the page goes back to working without the script;
// if the request fails, as it does when the page is left while it loads, it's made again when it's next wanted.
// search-core.js holds the matching, scoring and address, and says how each works.

import {
  addressFor,
  decodeIndex,
  excerptFor,
  excerptText,
  filtersFor,
  hasFilters,
  hasQuery,
  isApplied,
  liftFilters,
  NO_FILTERS,
  parseQuery,
  passesFilters,
  search,
  statusFor,
} from "./search-core.js";

/** @typedef {import("./search-core.js").Post & { row: HTMLLIElement }} ListedPost a post with its row */
/** @typedef {import("./search-core.js").Line} Line */
/** @typedef {import("./search-core.js").Filters} Filters */

/**
 * A choice in the tag or year menu, whose link goes to a hidden target in the Posts card.
 * @typedef {object} MenuEntry
 * @property {HTMLAnchorElement} link
 * @property {"tag" | "year"} kind
 * @property {string} value the tag or year it sets, or "" for all
 * @property {string} id its target's id, decoded
 * @property {HTMLElement | null} count where it shows how many posts it would list; all has none
 * @property {string} built the count the build wrote
 */

// ---- the page -------------------------------------------------------------------------------------------------------

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
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

/**
 * The rows as posts with no lines and only a year for a date, all a query without words reads
 * @type {ListedPost[]}
 */
const rowPosts = rows.map((row) => {
  const link = $("a", row);
  return {
    s: decodeURIComponent(link.getAttribute("href").slice(1, -1)),
    t: link.textContent,
    d: row.dataset.year,
    g: row.dataset.tag.split(" ").filter(Boolean),
    l: [],
    row,
  };
});

/** @type {MenuEntry[]} */
const entries = $$(".filter-popover a").map((link) => {
  const id = decodeURIComponent(link.hash.slice(1));
  const kind = link.closest(".filter-year") ? "year" : "tag";
  let value = id;
  if (link.matches(".all")) value = "";
  else if (kind === "year") value = id.slice(1);
  const count = $(".count", link);
  return { link, kind, value, id, count, built: count?.textContent ?? "" };
});

// ⌘K on Apple's platforms, where Ctrl+K deletes to the end of the line in a text field. Chromium names the platform
// in userAgentData, the others in the deprecated platform
const onApple = /mac|iphone|ipad/i.test(navigator.userAgentData?.platform || navigator.platform || navigator.userAgent);

// how long typing pauses before the address and the status line follow it
const PAUSE_MS = 300;

const openingQuery = new URLSearchParams(location.search).get("q");

// ---- state: every change to it is a function in this section ------------------------------------------------------

const state = {
  /** @type {Filters} */
  filters: NO_FILTERS,
  /** @type {ListedPost[] | null} the index's posts that have a row, once it has loaded */
  index: null,
  /**
   * The request for the index. A failed request (not a bad answer) goes back to unsent, to be made again when it's
   * next wanted; an answer, good or bad, is final
   * @type {"unsent" | "pending" | "answered"}
   */
  request: "unsent",
  /** @type {"ArrowDown" | "Enter" | null} a key pressed in the box for the first result, waiting for the index */
  pendingKey: null,
  /** the timer for the pause after a change, or 0 */
  pauseTimer: 0,
  /** what the status line says, and whether a typed change is waiting for the pause to write it */
  statusText: "",
  statusWaits: false,
  /** whether the box has shown before: the opening query applies once, and showing again rewrites the address */
  shownBefore: false,
};

/** Marks the box as shown, and returns whether it had shown before */
const markShown = () => {
  const before = state.shownBefore;
  state.shownBefore = true;
  return before;
};

const requestSent = () => {
  state.request = "pending";
};

/** @param {ListedPost[]} index */
const indexLoaded = (index) => {
  state.index = index;
  state.request = "answered";
};

/** A bad answer is final; a failed request is made again when it's next wanted */
const requestFailed = (serverAnsweredBadly) => {
  state.request = serverAnsweredBadly ? "answered" : "unsent";
};

/** @param {Filters} filters */
const setFilters = (filters) => {
  state.filters = filters;
};

const holdKey = (key) => {
  state.pendingKey = key;
};

const dropKey = () => {
  state.pendingKey = null;
};

const cancelPause = () => {
  clearTimeout(state.pauseTimer);
  state.pauseTimer = 0;
};

/** Writes the status line, which screen readers announce */
const announce = () => {
  state.statusWaits = false;
  statusLine.textContent = state.statusText;
};

/** Sets what the status line says, and writes it unless a typed change waits for the pause */
const setStatus = (text) => {
  state.statusText = text;
  if (!state.statusWaits) announce();
};

/** Makes the status line wait for the pause (typed) or follow at once */
const holdStatus = (typed) => {
  state.statusWaits = typed;
};

const writeAddress = () => {
  try {
    history.replaceState(null, "", location.pathname + addressFor(input.value, state.filters));
  } catch {
    // WebKit throws after 100 changes in 10 seconds, and the next pause writes it again
  }
};

/**
 * Ends the pause: the address follows, and the status line if it waits. Waiting keeps the address under WebKit's
 * limit and a screen reader from reading every keystroke's count; the list doesn't wait.
 */
const endPause = () => {
  cancelPause();
  writeAddress();
  if (state.statusWaits) announce();
};

const restartPause = () => {
  clearTimeout(state.pauseTimer);
  state.pauseTimer = setTimeout(endPause, PAUSE_MS);
};

// ---- drawing --------------------------------------------------------------------------------------------------------

const setAriaState = (element, name, on) => {
  if (on) element.setAttribute(name, "true");
  else element.removeAttribute(name);
};

/** The menus: the applied entries are current, and each summary shows its value (CSS writes all when it's empty) */
const renderMenus = () => {
  for (const entry of entries) setAriaState(entry.link, "aria-current", isApplied(entry, state.filters));
  tagLabel.textContent = state.filters.tags.join(", ");
  yearLabel.textContent = state.filters.year;
};

/** Text with what the marker matches in mark elements; split puts the captures at the odd indexes */
const markWords = (text, marker) =>
  marker ? text.split(marker).map((part, i) => (i % 2 ? create("mark", { textContent: part }) : part)) : [text];

/**
 * The link under a title to the line that matched, in its section.
 * @param {string} path
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
 * The rows that match show, best first, with their words marked and any excerpt; unsearched, every row, by date.
 * @param {{ post: ListedPost, excerpt: Line | undefined }[]} matches
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

/** The box's 3/17, the card's 3 of 17 or 17, and the status line */
const renderCounts = (shown, searching) => {
  const total = rows.length;
  noMatch.hidden = shown > 0;
  searchCount.textContent = searching ? `${shown}/${total}` : "";
  postsCount.textContent = searching ? `${shown} of ${total}` : `${total}`;
  setStatus(statusFor(shown, searching));
};

/**
 * Each choice counts the posts the list would show with it instead, so a tag's ignores the tags applied, and a year's
 * the year. One that would show none is off, unless it's applied.
 * @param {{ post: ListedPost }[]} found the posts that hold the query, before the menus' filters
 */
const renderChoiceCounts = (found) => {
  const withAnyTag = found.filter(({ post }) => passesFilters(post, { ...state.filters, tags: [] }));
  const withAnyYear = found.filter(({ post }) => passesFilters(post, { ...state.filters, year: "" }));
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

/** The posts to search: the index's once loaded, until then the rows' for a query without words, or else null */
const postsFor = (query) => state.index ?? (query.words.length > 0 ? null : rowPosts);

/** The menus, and the list and its counts, unless the words wait for the index */
const render = () => {
  renderMenus();
  const query = parseQuery(input.value);
  const posts = postsFor(query);
  if (!posts) return;
  const searching = hasQuery(query) || hasFilters(state.filters);
  const found = search(posts, query);
  const matches = found
    .filter(({ post }) => passesFilters(post, state.filters))
    .map(({ post }) => ({ post, excerpt: excerptFor(post, query.words) }));
  renderRows(matches, query.marker, searching);
  renderCounts(searching ? matches.length : rows.length, searching);
  renderChoiceCounts(found);
};

// ---- the index ------------------------------------------------------------------------------------------------------

/** The server answered badly: a bad status, or JSON that doesn't parse */
class IndexUnavailable extends Error {}

/** @returns {Promise<ListedPost[]>} */
const fetchIndex = async () => {
  const response = await fetch("/search.json");
  if (!response.ok) throw new IndexUnavailable();
  let posts;
  try {
    posts = await response.json();
  } catch (error) {
    // bad JSON is a SyntaxError, a DOMException of that name in WebKit; anything else is the body failing to arrive
    throw error.name === "SyntaxError" ? new IndexUnavailable() : error;
  }
  return decodeIndex(posts, new Map(rowPosts.map(({ s, row }) => [s, row])));
};

/**
 * Goes back to working as the page does without the script. When the server answered badly, the address loses its
 * words and follows one filter set meanwhile (home-filters.css applies one; the tag wins), or #all if a target from
 * before the box showed would still filter. When the request failed, the page may be being left, where following
 * would cancel leaving and clearing would lose what Back returns to, so the address stays, with any pending update.
 * @param {boolean} serverAnsweredBadly
 */
const disableSearch = (serverAnsweredBadly) => {
  if (box.hidden) return;
  box.hidden = true;
  frameLegend.textContent = "Filter";
  renderRows([], null, false);
  renderCounts(rows.length, false);
  for (const { link, count, built } of entries) {
    link.removeAttribute("aria-current");
    link.removeAttribute("aria-disabled");
    if (count) count.textContent = built;
  }
  tagLabel.textContent = "";
  yearLabel.textContent = "";
  if (!serverAnsweredBadly) return;
  cancelPause();
  const { tags, year } = state.filters;
  const fragment = tags[0] || (year && `y${year}`) || ($(".posts-card :target") ? "all" : "");
  try {
    history.replaceState(null, "", location.pathname);
  } catch {
    // WebKit's limit: the words stay in the address, and the fragment still applies
  }
  if (fragment) location.hash = fragment;
};

// ---- changes --------------------------------------------------------------------------------------------------------

const currentFragment = () => {
  const fragment = location.hash.slice(1);
  try {
    return decodeURIComponent(fragment);
  } catch {
    // a malformed escape, like a lone %E9, names no entry
    return fragment;
  }
};

/**
 * Sets the filters the fragment names, as following a menu's link to it would; another, like #main, changes nothing.
 * Compared decoded, since a meta refresh lands on %C3%A9 where the links have %c3%a9. Returns whether it named one.
 */
const applyFragment = () => {
  const fragment = currentFragment();
  const entry = entries.find((e) => e.id === fragment);
  if (entry) setFilters(filtersFor(entry));
  return entry !== undefined;
};

/**
 * Shows the box, with the filters the fragment names (the links may have changed it while the box was hidden), and
 * the first time, the opening query read as if typed. Shown again after falling back, the address follows the box.
 */
const showSearch = () => {
  const again = markShown();
  applyFragment();
  if (openingQuery && !again) {
    const lifted = liftFilters(openingQuery, state.filters, entries);
    input.value = lifted.text.trimEnd();
    setFilters(lifted.filters);
  }
  // a menu opened meanwhile would now open over the list rather than push it down
  for (const menu of menus) {
    if (menu.contains(document.activeElement)) $("summary", menu).focus();
    menu.open = false;
  }
  box.hidden = false;
  frameLegend.textContent = "Search";
  holdStatus(false);
  render();
  if (again) {
    cancelPause();
    writeAddress();
  }
};

const firstResult = () => $(".post-row:not([hidden]) a", list);

/** Down moves to the first result, and Enter opens it */
const actOnPendingKey = () => {
  const first = firstResult();
  if (first && state.pendingKey === "Enter") first.click();
  else if (first && state.pendingKey === "ArrowDown") first.focus();
  dropKey();
};

/**
 * Loads the index unless it's loading or answered. Then the box shows if it's hidden, or the list is drawn once,
 * however many changes waited, and a waiting key acts. A request fails when the page is left while it loads (WebKit
 * as the navigation starts, Chrome and Firefox as it unloads), which can't be told from any other failure: the key is
 * dropped, the request goes back to unsent, and the box hides only if words were waiting, since without them the
 * rows still answer and a box focused on the way to a post shouldn't hide as the page is left.
 */
const loadIndex = async () => {
  if (state.request !== "unsent") return;
  requestSent();
  try {
    indexLoaded(await fetchIndex());
  } catch (error) {
    const serverAnsweredBadly = error instanceof IndexUnavailable;
    requestFailed(serverAnsweredBadly);
    dropKey();
    if (serverAnsweredBadly || !postsFor(parseQuery(input.value))) disableSearch(serverAnsweredBadly);
    return;
  }
  if (box.hidden) showSearch();
  else render();
  actOnPendingKey();
};

/**
 * Shows a change to the words or filters: the menus at once, and the list unless its words wait for the index, which
 * this asks for. The address follows after a pause, and so does the status line when typed. A waiting key is dropped.
 */
const update = ({ typed = false } = {}) => {
  dropKey();
  holdStatus(typed);
  render();
  if (!postsFor(parseQuery(input.value))) loadIndex();
  restartPause();
};

// ---- keys -----------------------------------------------------------------------------------------------------------

/**
 * K with the platform's modifier, without Shift or Alt. On a layout with no Latin letters, like Russian, it's the key
 * in K's place, as browsers take their own shortcuts; Dvorak's T there stays the browser's.
 */
const isSearchShortcut = (event) =>
  (onApple ? event.metaKey : event.ctrlKey) &&
  !event.shiftKey &&
  !event.altKey &&
  (/^k$/i.test(event.key) || (event.code === "KeyK" && !/^[a-z]$/i.test(event.key)));

/** Esc closes an open menu, or else, in the frame, clears the words, then the filters */
const onEscape = (event) => {
  const openMenu = menus.find((menu) => menu.open);
  if (openMenu) {
    openMenu.open = false;
    if (openMenu.contains(event.target)) $("summary", openMenu).focus();
  } else if (event.target.closest(".search-frame") && !box.hidden) {
    if (input.value) input.value = "";
    else setFilters(NO_FILTERS);
    update();
  } else {
    return;
  }
  event.preventDefault();
};

/**
 * Down in the box moves to the first result, and Enter opens it. While the words wait for the index, the last key
 * pressed waits for the list. Enter while an IME composes takes a word instead (Safari says so with keyCode 229).
 */
const onBoxKey = (event) => {
  const enter = event.key === "Enter" && !event.isComposing && event.keyCode !== 229;
  if (event.key !== "ArrowDown" && !enter) return;
  const listed = postsFor(parseQuery(input.value)) !== null;
  // down with no result to move to moves the caret to the end
  if (event.key === "ArrowDown" && (firstResult() || !listed)) event.preventDefault();
  holdKey(event.key);
  if (listed) actOnPendingKey();
};

// ---- wiring ---------------------------------------------------------------------------------------------------------

list.after(noMatch);
if (onApple) {
  keyHint.textContent = "⌘K";
  input.setAttribute("aria-keyshortcuts", "Meta+K");
}

input.addEventListener("focus", loadIndex);
input.addEventListener("input", () => {
  const lifted = liftFilters(input.value, state.filters, entries);
  if (lifted.text !== input.value) input.value = lifted.text;
  setFilters(lifted.filters);
  update({ typed: true });
});

addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    onEscape(event);
  } else if (isSearchShortcut(event)) {
    if (box.hidden) return;
    event.preventDefault();
    input.focus();
  } else if (event.target === input) {
    onBoxKey(event);
  }
});

// A pick replaces its menu's value and × clears it; a menu closes on a pick, and on a click outside it. While the box
// is hidden the links work as without the script, and a pick asks for the index again if a request failed
addEventListener("click", (event) => {
  const link = event.target.closest(".filters a");
  for (const menu of menus) {
    if (!menu.contains(event.target)) menu.open = false;
  }
  if (link && box.hidden) {
    // the link sets the address itself, which a pending update from before the box hid would overwrite
    cancelPause();
    loadIndex();
    return;
  }
  if (!link) return;
  event.preventDefault();
  if (link.hasAttribute("aria-disabled")) return;
  const filter = link.closest(".filter");
  const value = entries.find((entry) => entry.link === link)?.value ?? "";
  if (filter.matches(".filter-year")) setFilters({ ...state.filters, year: value });
  else setFilters({ ...state.filters, tags: value ? [value] : [] });
  $("details", filter).open = false;
  $("summary", filter).focus();
  update();
});

// A menu closes when focus leaves it. Focus on an element around it hasn't left: pressing its padding, or a choice in
// WebKit, focuses main, and the click still picks. While the box is hidden the menus are in the flow, cover nothing,
// and closing one on a press would move the posts under the pointer
addEventListener("focusin", ({ target }) => {
  if (box.hidden) return;
  for (const menu of menus) {
    if (menu.open && !menu.contains(target) && !target.contains(menu)) menu.open = false;
  }
});

addEventListener("hashchange", () => {
  if (!box.hidden && applyFragment()) update();
});

// As the page is left, a pending update is made, so Back returns to it. WebKit's back-forward cache resets the box (as
// it does a field with autocomplete off) to its default value, in a task after pageshow, so that's set to its words
addEventListener("pagehide", () => {
  if (state.pauseTimer) endPause();
  input.defaultValue = input.value;
});

// shown again from the back-forward cache, after a request failed with words waiting, the search has fallen back:
// the request is made again. With the box showing, the next words that need the index ask for it
addEventListener("pageshow", () => {
  if (box.hidden) loadIndex();
});

applyFragment();
if (openingQuery && parseQuery(openingQuery).words.length > 0) loadIndex();
else showSearch();
