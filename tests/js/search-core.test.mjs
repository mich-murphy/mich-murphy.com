// Tests for assets/js/search-core.js: node --test tests/js/
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  addressFor,
  bestLine,
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
  passesQuery,
  scoreOf,
  search,
  statusFor,
} from "../../assets/js/search-core.js";

/** A post with defaults, and lines as [text, anchor, kind] */
const post = ({ s = "p", t = "", d = "2024-01-01", g = [], l = [] } = {}) => ({ s, t, d, g, l });

/** Whether every word of a query is found in the text */
const finds = (query, text) => parseQuery(query).words.every((word) => word.test(text));

/** The menus' choices, as search.js reads them from the page */
const choices = [
  { kind: "tag", value: "" },
  { kind: "tag", value: "nixos" },
  { kind: "tag", value: "nix" },
  { kind: "tag", value: "zfs" },
  { kind: "year", value: "" },
  { kind: "year", value: "2023" },
  { kind: "year", value: "2024" },
];

describe("parseQuery", () => {
  test("splits words, phrases, #tags and years", () => {
    const query = parseQuery('ZFS "home lab" #nix 2023 backup');
    assert.equal(query.words.length, 3);
    assert.deepEqual(query.tagPrefixes, ["nix"]);
    assert.deepEqual(query.years, ["2023"]);
    assert.ok(finds('"home lab"', "my Home Lab setup"));
    assert.ok(!finds('"home lab"', "home and lab"));
  });

  test("ignores single characters, a lone #, empty phrases and blank text", () => {
    const query = parseQuery('a # "" b');
    assert.deepEqual(query.words, []);
    assert.deepEqual(query.tagPrefixes, []);
    assert.equal(query.marker, null);
    assert.ok(!hasQuery(parseQuery("   ")));
  });

  test("takes an unclosed phrase to the end", () => {
    assert.ok(finds('"home la', "home lab"));
  });

  test("reads only 19xx and 20xx as years", () => {
    assert.deepEqual(parseQuery("2023 1999 1800 20234").years, ["2023", "1999"]);
    assert.equal(parseQuery("1800 20234").words.length, 2);
  });

  test("escapes the pattern's special characters", () => {
    assert.ok(finds("c++", "learning c++ today"));
    assert.ok(!finds("a.b", "axb"));
  });

  test("marks every word, captured", () => {
    const { marker } = parseQuery("nix zfs");
    assert.deepEqual("Nix on ZFS".split(marker), ["", "Nix", " on ", "ZFS", ""]);
  });
});

describe("matching from the start of a word", () => {
  test("finds a prefix in any case", () => {
    assert.ok(finds("imperm", "Impermanence on NixOS"));
  });

  test("starts a word after punctuation, like _ in ssh_host_rsa_key", () => {
    assert.ok(finds("rsa", "/etc/ssh/ssh_host_rsa_key"));
  });

  test("doesn't find a word inside another", () => {
    assert.ok(!finds("sy", "easy"));
    assert.ok(!finds("ix", "nixos"));
  });

  test("treats letters of any script as part of a word", () => {
    assert.ok(finds("café", "Café culture"));
    assert.ok(!finds("fé", "café"));
    assert.ok(finds("при", "Привет мир"));
    assert.ok(!finds("вет", "Привет"));
    assert.ok(!finds("23", "y2023"));
  });
});

describe("hasQuery and hasFilters", () => {
  test("hasQuery is true for any word, #tag or year", () => {
    assert.ok(hasQuery(parseQuery("zfs")));
    assert.ok(hasQuery(parseQuery("#nix")));
    assert.ok(hasQuery(parseQuery("2023")));
    assert.ok(!hasQuery(parseQuery("")));
  });

  test("hasFilters is true for a tag or a year", () => {
    assert.ok(!hasFilters(NO_FILTERS));
    assert.ok(hasFilters({ tags: ["nixos"], year: "" }));
    assert.ok(hasFilters({ tags: [], year: "2023" }));
  });
});

describe("passesQuery and passesFilters", () => {
  const nixos2023 = post({ d: "2023-05-01", g: ["nixos", "zfs"] });

  test("a #tag is a prefix of a tag, and every one must match", () => {
    assert.ok(passesQuery(nixos2023, parseQuery("#nix")));
    assert.ok(passesQuery(nixos2023, parseQuery("#nix #zf")));
    assert.ok(!passesQuery(nixos2023, parseQuery("#nix #plex")));
  });

  test("years match any one of them", () => {
    assert.ok(passesQuery(nixos2023, parseQuery("2022 2023")));
    assert.ok(!passesQuery(nixos2023, parseQuery("2024")));
  });

  test("filters need every tag, in full, and the year", () => {
    assert.ok(passesFilters(nixos2023, NO_FILTERS));
    assert.ok(passesFilters(nixos2023, { tags: ["nixos", "zfs"], year: "2023" }));
    assert.ok(!passesFilters(nixos2023, { tags: ["nix"], year: "" }));
    assert.ok(!passesFilters(nixos2023, { tags: [], year: "2024" }));
  });

  test("a row's post, whose date is only its year, passes the same way", () => {
    assert.ok(passesFilters(post({ d: "2023" }), { tags: [], year: "2023" }));
    assert.ok(passesQuery(post({ d: "2023" }), parseQuery("2023")));
  });
});

describe("scoreOf and search", () => {
  const words = (text) => parseQuery(text).words;

  test("scores title 40, tag 30, heading 20, prose 10, code 5, plus 1 a line", () => {
    assert.equal(scoreOf(post({ t: "Nix" }), words("nix")), 40);
    assert.equal(scoreOf(post({ g: ["nixos"] }), words("nix")), 30);
    assert.equal(scoreOf(post({ l: [["Nix", "a", 1]] }), words("nix")), 21);
    assert.equal(scoreOf(post({ l: [["nix", "", 0]] }), words("nix")), 11);
    assert.equal(scoreOf(post({ l: [["nix", "", 2]] }), words("nix")), 6);
  });

  test("takes the heaviest place a word is found, and adds its lines", () => {
    const found = post({ t: "Nix", l: [["nix", "", 0], ["nix", "", 1]] });
    assert.equal(scoreOf(found, words("nix")), 42);
  });

  test("caps the line bonus at 5", () => {
    const lines = Array.from({ length: 9 }, () => ["nix", "", 0]);
    assert.equal(scoreOf(post({ l: lines }), words("nix")), 15);
  });

  test("adds each word's score, and is null when one is missing", () => {
    const found = post({ t: "Nix", l: [["zfs", "", 0]] });
    assert.equal(scoreOf(found, words("nix zfs")), 40 + 11);
    assert.equal(scoreOf(found, words("nix plex")), null);
    assert.equal(scoreOf(found, []), 0);
  });

  test("orders title > tag > heading > prose > code", () => {
    const posts = [
      post({ s: "code", l: [["nix", "", 2]] }),
      post({ s: "prose", l: [["nix", "", 0]] }),
      post({ s: "heading", l: [["nix", "", 1]] }),
      post({ s: "tag", g: ["nix"] }),
      post({ s: "title", t: "Nix" }),
    ];
    const order = search(posts, parseQuery("nix")).map(({ post }) => post.s);
    assert.deepEqual(order, ["title", "tag", "heading", "prose", "code"]);
  });

  test("ties keep the order given, the index's date order", () => {
    const posts = ["newest", "middle", "oldest"].map((s) => post({ s, t: "Nix" }));
    const order = search(posts, parseQuery("nix")).map(({ post }) => post.s);
    assert.deepEqual(order, ["newest", "middle", "oldest"]);
  });

  test("without words, keeps every post that passes the query, in order", () => {
    const posts = [post({ s: "a", g: ["nixos"] }), post({ s: "b", g: ["zfs"] }), post({ s: "c", g: ["nix"] })];
    const order = search(posts, parseQuery("#nix")).map(({ post }) => post.s);
    assert.deepEqual(order, ["a", "c"]);
  });
});

describe("bestLine and excerpts", () => {
  const words = (text) => parseQuery(text).words;

  test("picks the line with the most words, then the heaviest kind, then the first", () => {
    const lines = [
      ["nix code", "a", 2],
      ["nix prose", "b", 0],
      ["nix heading", "c", 1],
      ["nix and zfs in code", "d", 2],
      ["nix and zfs in prose", "e", 0],
    ];
    assert.equal(bestLine(lines, words("nix"))[1], "c");
    assert.equal(bestLine(lines, words("nix zfs"))[1], "e");
    assert.equal(bestLine([["nix one", "a", 0], ["nix two", "b", 0]], words("nix"))[1], "a");
    assert.equal(bestLine(lines, words("plex")), undefined);
  });

  test("shows no excerpt when the title holds every word", () => {
    const found = post({ t: "Nix on ZFS", l: [["nix", "a", 0]] });
    assert.equal(excerptFor(found, words("nix zfs")), undefined);
    assert.deepEqual(excerptFor(found, words("nix plex")), ["nix", "a", 0]);
  });

  test("cuts a line behind an ellipsis only when its first match is past 30", () => {
    const { marker } = parseQuery("nix");
    const near = `${"x".repeat(29)} nix`;
    assert.equal(excerptText(near, marker), near);
    assert.equal(excerptText(`${"x".repeat(30)} nix`, marker), `…${"x".repeat(19)} nix`);
    const far = `${"x".repeat(40)} nix here`;
    assert.equal(excerptText(far, marker), `…${"x".repeat(19)} nix here`);
    assert.equal(excerptText("    indented nix", marker), "indented nix");
  });
});

describe("menus: isApplied and filtersFor", () => {
  test("a tag or year is applied when set, and all when its menu has nothing", () => {
    const filters = { tags: ["nixos", "zfs"], year: "" };
    assert.ok(isApplied({ kind: "tag", value: "zfs" }, filters));
    assert.ok(!isApplied({ kind: "tag", value: "nix" }, filters));
    assert.ok(!isApplied({ kind: "tag", value: "" }, filters));
    assert.ok(isApplied({ kind: "year", value: "" }, filters));
    assert.ok(isApplied({ kind: "year", value: "2023" }, { tags: [], year: "2023" }));
  });

  test("a choice's link sets its filter alone, and all sets none", () => {
    assert.deepEqual(filtersFor({ kind: "tag", value: "nixos" }), { tags: ["nixos"], year: "" });
    assert.deepEqual(filtersFor({ kind: "year", value: "2023" }), { tags: [], year: "2023" });
    assert.deepEqual(filtersFor({ kind: "tag", value: "" }), NO_FILTERS);
    assert.deepEqual(filtersFor({ kind: "year", value: "" }), NO_FILTERS);
  });
});

describe("liftFilters", () => {
  test("moves a tag typed in full and a space into the filters", () => {
    assert.deepEqual(liftFilters("#nixos ", NO_FILTERS, choices), { text: "", filters: { tags: ["nixos"], year: "" } });
  });

  test("moves a year typed in full and a space", () => {
    assert.deepEqual(liftFilters("zfs 2023 ", NO_FILTERS, choices), {
      text: "zfs ",
      filters: { tags: [], year: "2023" },
    });
  });

  test("leaves a word still being typed, with no space after it", () => {
    assert.deepEqual(liftFilters("#nixos", NO_FILTERS, choices), { text: "#nixos", filters: NO_FILTERS });
    assert.deepEqual(liftFilters("2023", NO_FILTERS, choices), { text: "2023", filters: NO_FILTERS });
  });

  test("leaves tags and years that aren't choices, and words, in the box", () => {
    assert.deepEqual(liftFilters("#plex 2019 nixos zfs", NO_FILTERS, choices), {
      text: "#plex 2019 nixos zfs",
      filters: NO_FILTERS,
    });
  });

  test("tags combine, without repeats", () => {
    const filters = { tags: ["zfs"], year: "" };
    assert.deepEqual(liftFilters("#NixOS #zfs #nix ", filters, choices).filters, {
      tags: ["zfs", "nixos", "nix"],
      year: "",
    });
  });

  test("a year replaces the year", () => {
    assert.deepEqual(liftFilters("2024 ", { tags: ["nixos"], year: "2023" }, choices).filters, {
      tags: ["nixos"],
      year: "2024",
    });
  });

  test("drops leading space, and keeps the filters unchanged when nothing lifts", () => {
    const filters = { tags: ["nixos"], year: "" };
    const lifted = liftFilters("  zfs", filters, choices);
    assert.equal(lifted.text, "zfs");
    assert.deepEqual(lifted.filters, filters);
  });
});

describe("addressFor", () => {
  /** The box's text and filters that opening the address gives, as search.js does */
  const reopen = (address) => {
    if (address.startsWith("#")) return { text: "", filters: filtersFor({ kind: "tag", value: address.slice(1) }) };
    const q = new URLSearchParams(address.slice(1)).get("q") ?? "";
    const lifted = liftFilters(q, NO_FILTERS, choices);
    return { text: lifted.text.trimEnd(), filters: lifted.filters };
  };

  test("a tag alone is #tag", () => {
    assert.equal(addressFor("", { tags: ["nixos"], year: "" }), "#nixos");
    assert.equal(addressFor("  ", { tags: ["nixos"], year: "" }), "#nixos");
  });

  test("nothing is an empty address", () => {
    assert.equal(addressFor("", NO_FILTERS), "");
    assert.equal(addressFor("   ", NO_FILTERS), "");
  });

  test("words alone are ?q=", () => {
    assert.equal(addressFor(" zfs pool ", NO_FILTERS), "?q=zfs+pool");
  });

  test("filters come first, each followed by a space, then the words", () => {
    assert.equal(addressFor("zfs", { tags: ["nixos", "nix"], year: "2023" }), "?q=%23nixos+%23nix+2023+zfs");
  });

  test("filters without words end in a space", () => {
    assert.equal(addressFor("", { tags: ["nixos"], year: "2023" }), "?q=%23nixos+2023+");
    assert.equal(addressFor("", { tags: [], year: "2023" }), "?q=2023+");
  });

  test("reopens each where it was, a #tag still being typed staying a word", () => {
    const cases = [
      { text: "", filters: { tags: ["nixos"], year: "" } },
      { text: "zfs", filters: { tags: ["nixos"], year: "2023" } },
      { text: "#nix", filters: { tags: ["zfs"], year: "" } },
      { text: "#nix", filters: NO_FILTERS },
      { text: "", filters: { tags: ["nixos", "zfs"], year: "2024" } },
      { text: "", filters: { tags: [], year: "2023" } },
      { text: '"home lab" 2023', filters: NO_FILTERS },
    ];
    for (const state of cases) assert.deepEqual(reopen(addressFor(state.text, state.filters)), state);
  });
});

describe("statusFor", () => {
  test("counts the matches while searching, and says nothing otherwise", () => {
    assert.equal(statusFor(17, false), "");
    assert.equal(statusFor(0, true), "0 posts match");
    assert.equal(statusFor(1, true), "1 post matches");
    assert.equal(statusFor(3, true), "3 posts match");
  });
});

describe("decodeIndex", () => {
  const index = [
    {
      s: "plex",
      t: "Syncing Plex",
      d: "2024-04-08",
      g: ["plex"],
      l: [
        ["", "00", "First line", "Second line"],
        ["plex-services", "102", "Plex Services", "More prose", "plex --run"],
      ],
    },
    { s: "draft", t: "No row", d: "2024-01-01", g: [], l: [["", "0", "text"]] },
    { s: "café", t: "Café", d: "2023-01-01", g: [], l: [] },
  ];
  const rows = new Map([
    ["plex", "row-plex"],
    ["café", "row-café"],
  ]);

  test("gives each line its text, its section's anchor and its kind as a number", () => {
    const [plex] = decodeIndex(index, rows);
    assert.deepEqual(plex.l, [
      ["First line", "", 0],
      ["Second line", "", 0],
      ["Plex Services", "plex-services", 1],
      ["More prose", "plex-services", 0],
      ["plex --run", "plex-services", 2],
    ]);
    assert.equal(plex.row, "row-plex");
    assert.deepEqual([plex.s, plex.t, plex.d, plex.g], ["plex", "Syncing Plex", "2024-04-08", ["plex"]]);
  });

  test("drops posts without a row, keeping the order", () => {
    assert.deepEqual(
      decodeIndex(index, rows).map((p) => p.s),
      ["plex", "café"],
    );
  });

  test("feeds search, with headings scored over prose", () => {
    const posts = decodeIndex(index, rows);
    const [found] = search(posts, parseQuery("services"));
    assert.equal(found.post.s, "plex");
    assert.equal(found.score, 21);
    assert.deepEqual(excerptFor(found.post, parseQuery("services").words), ["Plex Services", "plex-services", 1]);
  });
});
