// The search's logic, apart from the page: reading the box, matching and scoring posts, the menus' filters and the
// address. search.js wires it to the page, and tests/js/search-core.test.mjs tests it, so nothing here reads the DOM.

/**
 * A post in /search.json, which lists them newest first.
 * @typedef {object} IndexPost
 * @property {string} s its slug: the post is at /slug/
 * @property {string} t its title
 * @property {string} d its date, as 2024-04-08
 * @property {string[]} g its tags, as tag-slug.html gives them
 * @property {Section[]} l its sections
 */

/**
 * A section of a post's Markdown: its heading's id ("" above the first), its lines' kinds as a digit each, then their
 * texts.
 * @typedef {[anchor: string, kinds: string, ...texts: string[]]} Section
 */

/**
 * A line of a post: its text, its section's anchor, and its kind: 0 prose, 1 heading, 2 code.
 * @typedef {[text: string, anchor: string, kind: 0 | 1 | 2]} Line
 */

/** @typedef {Omit<IndexPost, "l"> & { l: Line[] }} Post a post with its sections' lines, one after another */

/** @typedef {{ tags: string[], year: string }} Filters the menus' values: tags, which combine, and a year or "" */

/** @typedef {{ kind: "tag" | "year", value: string }} Choice a menu's choice: its tag or year, or "" for all */

/**
 * What the box holds.
 * @typedef {object} Query
 * @property {RegExp[]} words a pattern for each word and "phrase", which matches where a word starts
 * @property {RegExp | null} marker any of them, captured, to mark them with; null without words
 * @property {string[]} tagPrefixes from #nix
 * @property {string[]} years from 2023
 */

// A word scores by where it's found, and 1 more for each line it's on, up to MOST_LINES, so a post about it beats a
// passing mention. LINE_SCORES is by a line's kind: prose, heading, code
const TITLE_SCORE = 40;
const TAG_SCORE = 30;
const LINE_SCORES = [10, 20, 5];
const MOST_LINES = 5;

/** @type {Filters} nothing changes a Filters in place: a change makes a new one */
export const NO_FILTERS = { tags: [], year: "" };

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** A pattern that matches only where a word starts, in any script, so sy doesn't find easy */
const atWordStart = (pattern) => new RegExp(`(?<![\\p{L}\\p{N}])${pattern}`, "iu");

/**
 * The box's words and "phrases", #tag prefixes and years. A single character is ignored until there's a second.
 * @param {string} text
 * @returns {Query}
 */
export const parseQuery = (text) => {
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
export const hasQuery = ({ words, tagPrefixes, years }) =>
  words.length > 0 || tagPrefixes.length > 0 || years.length > 0;

/** @param {Filters} filters */
export const hasFilters = ({ tags, year }) => tags.length > 0 || year !== "";

/**
 * Whether a post has the query's #tag prefixes and one of its years.
 * @param {Post} post
 * @param {Query} query
 */
export const passesQuery = (post, { tagPrefixes, years }) =>
  (years.length === 0 || years.includes(post.d.slice(0, 4))) &&
  tagPrefixes.every((prefix) => post.g.some((tag) => tag.startsWith(prefix)));

/**
 * @param {Post} post
 * @param {Filters} filters
 */
export const passesFilters = (post, { tags, year }) =>
  (!year || year === post.d.slice(0, 4)) && tags.every((tag) => post.g.includes(tag));

/**
 * A post's score for the words, or null when it lacks one of them.
 * @param {Post} post
 * @param {RegExp[]} words
 */
export const scoreOf = (post, words) => {
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
 * The line holding the most of the words, then of the heaviest kind, the first of a tie; undefined when none does.
 * @param {Line[]} lines
 * @param {RegExp[]} words
 */
export const bestLine = (lines, words) => {
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
 * The posts that hold every part of the query, best first, ties in the order given (the index's, newest first). The
 * menus' filters don't change a score, so they're left to the caller, and one search serves the list and the counts.
 * @template {Post} P
 * @param {P[]} posts
 * @param {Query} query
 * @returns {{ post: P, score: number }[]}
 */
export const search = (posts, query) => {
  const found = [];
  for (const post of posts) {
    if (!passesQuery(post, query)) continue;
    const score = scoreOf(post, query.words);
    if (score !== null) found.push({ post, score });
  }
  return found.sort((a, b) => b.score - a.score);
};

/**
 * The line to show under a post's title: none when the title holds every word, or else the best line.
 * @param {Post} post
 * @param {RegExp[]} words
 */
export const excerptFor = (post, words) =>
  words.every((word) => word.test(post.t)) ? undefined : bestLine(post.l, words);

/**
 * An excerpt's text: the line, cut behind an ellipsis when its first match is far enough in to be cut off.
 * @param {string} text
 * @param {RegExp} marker
 */
export const excerptText = (text, marker) => {
  const line = text.trimStart();
  const first = line.search(marker);
  return first > 30 ? `…${line.slice(first - 20)}` : line;
};

/**
 * Whether a choice is applied: its tag or year is set, or for all, nothing in its menu is.
 * @param {Choice} choice
 * @param {Filters} filters
 */
export const isApplied = ({ kind, value }, { tags, year }) => {
  if (kind === "year") return value ? year === value : !year;
  return value ? tags.includes(value) : tags.length === 0;
};

/**
 * The filters that following a choice's link sets, as its fragment does without the script: its tag or year alone,
 * or neither for all.
 * @param {Choice} choice
 * @returns {Filters}
 */
export const filtersFor = ({ kind, value }) => {
  if (!value) return NO_FILTERS;
  if (kind === "year") return { ...NO_FILTERS, year: value };
  return { ...NO_FILTERS, tags: [value] };
};

// a word followed by a space, with any # before it, and the space before it, which leaves the box with it
const TYPED_IN_FULL = /(^|\s)(#?)(\S+)(?=\s)/g;

/**
 * Moves each tag (#nixos) or year (2023) that's one of the choices, typed in full and followed by a space, out of the
 * text and into the filters, where tags combine and a year replaces the year. The text also loses any leading space.
 * @param {string} text
 * @param {Filters} filters
 * @param {Choice[]} choices
 * @returns {{ text: string, filters: Filters }}
 */
export const liftFilters = (text, filters, choices) => {
  let { tags, year } = filters;
  const rest = text.replace(TYPED_IN_FULL, (token, _space, hash, word) => {
    const kind = hash ? "tag" : "year";
    const value = word.toLowerCase();
    if (!choices.some((c) => c.kind === kind && c.value === value)) return token;
    if (kind === "year") year = value;
    else if (!tags.includes(value)) tags = [...tags, value];
    return "";
  });
  return { text: rest.trimStart(), filters: { tags, year } };
};

/**
 * The address's query or fragment: #nixos for a tag alone, ?q=… for anything else, and "" for neither. In ?q= each
 * filter comes first followed by a space, as if typed in full, and then the words, so liftFilters reopens each where it
 * was: a #nix still being typed, which finds every tag starting with nix, stays in the box. With no words the query
 * ends in that space, as ?q=%23nixos+2023+.
 * @param {string} words
 * @param {Filters} filters
 */
export const addressFor = (words, { tags, year }) => {
  const text = words.trim();
  if (tags.length === 1 && !year && !text) return `#${tags[0]}`;
  const q = [...tags.map((tag) => `#${tag}`), year]
    .filter(Boolean)
    .map((filter) => `${filter} `)
    .join("");
  return q || text ? `?${new URLSearchParams({ q: q + text })}` : "";
};

/**
 * What the status line says: how many posts match, or nothing while the list isn't searched or filtered.
 * @param {number} shown
 * @param {boolean} searching
 */
export const statusFor = (shown, searching) => {
  if (!searching) return "";
  return shown === 1 ? "1 post matches" : `${shown} posts match`;
};

/**
 * The index's posts that have a row, each with it, and with its sections' lines one after another.
 * @template R
 * @param {IndexPost[]} posts
 * @param {Map<string, R>} rows each row by its post's slug
 * @returns {(Post & { row: R })[]}
 */
export const decodeIndex = (posts, rows) =>
  posts.flatMap(({ l, ...post }) => {
    const row = rows.get(post.s);
    if (!row) return [];
    /** @type {Line[]} */
    const lines = l.flatMap(([anchor, kinds, ...texts]) => texts.map((text, i) => [text, anchor, Number(kinds[i])]));
    return [{ ...post, l: lines, row }];
  });
