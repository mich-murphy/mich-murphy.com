# Theme redesign: handover

Status as of 2026-09-30. **The redesign is live.** M1–M19 are done: PR #1 (`m18-print` → `main`) was merged as `5c995f0` with a merge commit, and GitHub Actions deployed it to https://mich-murphy.com/. See "Launch". On 2026-09-30 the open questions were answered and the cleanup done (see "Decisions" and "After launch"). Nothing is outstanding. On 2026-10-03 the status line gave way to the content trace: see "Content trace".

## Start here (next session)

1. **Read "Launch" and "After launch"** below for what's live and how it was checked.
2. **Make changes as ordinary PRs against `main`.** Run `hugo serve` in the main checkout to preview, then `scripts/build.sh` and `scripts/postbuild.sh` for a real build, the footer's figures and the gates.
3. **Pushing `main` deploys**, and `main` requires a PR with 1 approving review. The owner merges as admin (`gh pr merge <n> --merge --admin`). Always use a merge commit: `params.bulkCommits` names commits by hash.

To resume, paste this into a new session:

```
continue from @docs/design/HANDOVER.md.
```

### Decisions (2026-09-30)

The open questions from the build, as the user answered them:
- **Kept as built:**
  - the channel edit (`2a2721c`) is in `bulkCommits`, so 3 posts keep their old `updated` dates
  - the code block after `backup-solutions-nixos`' second note sits inside the callout
  - the path-comment typo fixes in `configure-nextcloud-nixos` count as bulk
  - the status line's `nav` sits right after the header, and Contents' `nav` keeps that place
- **About's bio** stays the same two sentences as the home intro.
- **The code scrollbar thumb** is `--thumb`, the least mix of `--mute` into `--edge` that clears 3:1 on `--code`: 35% in dark (about 3.3:1) and 60% in light (about 3.1:1). `--edge` alone was 2.0:1 and 1.8:1.
- **Box labels:** the labels of a page's own boxes are `h2`s, so a screen reader's heading list finds them: Filter/Search and Posts on home, 404 and Posts on 404, Projects and This site on About, and Subscribe and Feeds I read on Feeds. They render pixel for pixel as before. Code windows, callouts, the colophon and Contents keep a `span`.
- **Scope** (social cards and print before launch) was settled by the launch.

## Content trace (2026-10-03)

The status line is gone. Posts get Contents in two forms instead, from one `nav` (`layouts/_partials/contents.html`, styled at the end of `assets/css/post.css`). The design was picked on a canvas, https://claude.ai/artifact/HvjDWGS6AjJP2wPspR4p8A: desktop A · Ticks, and phone 2 · Pop-up with its button moved to the bottom right.

- **The trace (1360px and wider, with a mouse).**
  - A tick per h2 and h3, fixed to the window's right edge and centred top to bottom: 2px bars every 14px, 20px for an h2 and 12px for an h3.
  - Ticks are `--dim`, and the current one is `--fg`.
  - Hovering the trace, or tabbing to its links, opens the Contents box to its left, in the margin.
  - The box is `min(280px, 50vw - 386px - 60px - 32px)` wide. That leaves at least 24px to the text, plus a classic scrollbar's width. It comes to about 240px at 1440 and 200px at 1360, which is why the trace starts at 1360.
  - On a post with many headings the ticks close up evenly (`--n`), down to 4px apart.
- **The button (narrower windows and touch).**
  - A 48px-tall pill fixed to the bottom-right corner, 16px in plus the safe-area inset. It holds the menu icon and the section count, `4/7`, in Krypton.
  - It opens the same box above it, and ✕ takes its place.
  - A tap outside closes the box. Picking a heading closes it and jumps there.
  - The page ends 56px lower, so the pill never covers the footer.
  - The pill sits in an 8px ring of the ground. It's 16px in, as a code window's frame is, so without the ring a window scrolling past ran into its right edge and the two read as one box (box lab, button D).
  - The page dims behind the open box, to the ground at 72%, so frames under the box fall back; the box is as wide as the text column and lined up with them too (box lab, box D). A tap on the dim closes the box. The dim fades with the box.
- **Why bottom right** (researched on 2026-10-03):
  - Material 3 puts the FAB lower right on phones, and NN/g finds people expect floating buttons there.
  - In Hoober's 2013 grip study, about 61% of taps come from the right hand.
  - Readers look most at the start of lines, so a button on the right covers line ends instead.
  - Against it: corners are the least accurate place to tap, on either side. Neither corner is safer from browser chrome.
- **How it works without JavaScript.**
  - The current section is `:target-current` on two `scroll-target-group` lists, the ticks and the box, as before.
  - The ticks also feed the button's count: each heading at or before the current one increments a counter, and the button prints it.
  - The button opens the box by linking to `#toc`, an empty element fixed to the top of the window, so nothing scrolls. `#toc:target ~ …` shows the box.
  - ✕ and the tap-outside layer link to `#_`, which matches nothing, so they close the box without scrolling.
  - A closed narrow box is `visibility:hidden`, so its links take no taps or focus. Screen readers and keyboards reach the list through the button.
  - A heading with the id `top`, `toc` or `_` fails the build (`render-heading.html`).
- **Trade-offs.**
  - Each open and close of the phone box adds a history entry. Back closes an open box. After a pick, Back returns to the open box at the old place. Only a script could avoid this.
  - Firefox and Safari don't support `:target-current` yet. They light no tick and mark nothing in the box, and the button shows only its icon.
  - `env(safe-area-inset-*)` reads 0 on iOS without `viewport-fit=cover`, which the site doesn't set. Check the button against Safari's bottom bar and the home indicator on a phone.
- **Checked** in headless Chrome 154, driven over the DevTools protocol, at 1440, 1360, 1300 and 390 wide, in dark, light and forced colours:
  - hover, the click-through to a heading, and keyboard opening on the trace
  - open, ✕, tap outside, pick and Back on the button, with no scroll from opening or closing
  - keyboard on the button: Enter, Tab, Enter, after which focus continues from the heading
  - print hides it all
  - Post pages grew by about 0.2 KB gzipped. The largest, `nixos-anywhere-and-disko`, is 9.5 KB.

## Build progress (2026-09-28)

M1–M18 are built, reviewed and fixed, and launched on 2026-09-30 (see "Launch").

### M19 checks (2026-09-28, `m18-print` @ `604c314`)
All pass. Output is in `.evidence/m19/`.
- **Build and gates.** A strict build (`--panicOnWarning`) has no WARN or ERROR, and postbuild passes. All 21 pages have one `<style>`, one h1, no stylesheet link, and a script only on the index. Every footer weight matches `gzip -9`.
- **Budget** (gzip -9, limit 14,336 B): the index is 9,685 B, with a 2.5 KB script. The largest post is `nixos-anywhere-and-disko` at 9,280 B and the smallest is `zfs-useful-references` at 6,515 B. Feeds is 4,491 B, About 4,339 B and 404 4,293 B.
- **URLs.** All 49 live sitemap URLs exist: 19 pages (home, About and the 17 posts), 3 alias redirects to `/` (`/archive/`, `/page/1/`, `/page/2/`), `/tags/` redirecting to `/`, and 26 tag pages redirecting to `/#<tag>`.
- **Feeds.** The ids and `published` values of `/atom.xml` (the feed id and 17 entries) and all 26 tag feeds match the live site's. The W3C feedvalidator source passes all 27, with the 3 known "same atom:updated" warnings. There's no `index.xml`.
- **Phone, light and forced colours.** No page scrolls sideways at 390px, and no page logs an error. Home, a post, About, Feeds and 404 were checked by eye at 390px in light mode, and home and a post in forced colours, dark and light.
- **Keyboard.** Tab reaches every link, box, menu and code window in order on home and a post, each with a 2px ring and scrolled into view. `/` focuses search, `tailscale` ranks the Nextcloud post first, and ↓ reaches its row. From the box, Esc clears the words, then the filter, and the address follows after its 300 ms pause. Esc from a row does nothing, by design.
- **The M18 follow-up** is `604c314`: print drops `.tcard ol`'s clip-path. Firefox now prints 404's last row on page 2, and home and 404 print all 17 rows in Chrome and Firefox.
- **CI.** actionlint passes, and every action tag the workflow names exists. The `github-pages` environment allows deploys from `main` and `gh-pages`. Pages is `build_type: legacy` from `gh-pages`, with `cname` `mich-murphy.com`, a verified domain and HTTPS enforced.

### How the run worked
- **Loop.** One milestone at a time, in stages:
  1. An implementer subagent builds it.
  2. An independent reviewer checks it, in a fresh context and read-only.
  3. A fixer handles the accepted findings.
  4. The coordinator runs its own checks and takes screenshots.
  
  M11 took three reviews. From M12 on, milestones ran in parallel in git worktrees (`../mich-murphy.com-mNN`), each branched from the latest finished branch, and were merged up the stack with merge commits once reviewed and fixed.
- **Evidence.** Per milestone in `.evidence/mN/`: `checks.txt`, `README.md` and screenshots. The implementers', reviewers' and fixers' own output is in `.evidence/impl-mN/`, `.evidence/review-mN/` and `.evidence/fix-mN/`. `.evidence/` is git-excluded (`.git/info/exclude`) and local only.
- **Tooling** (in `.evidence/`):
  - `shoot.sh <label> <paths…>` builds, runs postbuild, serves, and screenshots dark and light at 1280 and 390.
  - `serve.sh` builds and serves in the background (`PORT=…`).
  - `cdp.mjs` drives headless Chrome over DevTools. It supports keys, typing, clicks, hover, scroll, eval, forced colours, print, PDF and no-JS, and prints the requests, console output and eval results.
  - `common-checks.sh <label>` runs a strict build and postbuild, then checks every page for one `<style>`, one h1, no stylesheet link and no stray script, and prints the largest pages.
- **Coordinator files** (in `.evidence/coordinator/`):
  - `ledger.md` has every milestone's commits, review verdict and each finding's disposition.
  - `implementer-preamble.md` and `reviewer-template.md` are the shared brief text, and `mN-scope.md` is each milestone's scope and done-when list.
  - `claims-mN.md`/`extra-mN.md` feed the review briefs, and `fix-mN.md` are the fixer briefs.
  - `compose.py` and `compose-review.py` assemble the briefs.
  - `harness/` holds the M11 reviewers' real-browser harnesses. Live copies with current paths are in the session scratchpad (`rv11b/`, `fx11b/`, `fix-m11c/`):
    - Firefox 156 over WebDriver BiDi
    - WebKit (Safari 26.6) via an offscreen WKWebView
    - a no-store server that can delay, stall, drop or 404 `/index.json`
  - The shell's Nix env breaks `swiftc`. Recompile with `env -u SDKROOT -u DEVELOPER_DIR /usr/bin/xcrun swiftc`. WebKit's persistent cache can serve stale builds, so use the no-store servers or a non-persistent data store.

### Branches (stacked; each contains the one before)

| Milestone | Branch | Head | Review |
|---|---|---|---|
| M1 clear the ground, pin Hugo 0.166.0 | `m1-clear-ground` (on `theme`) | `d14c759` | pass with nits, fixed |
| M2 shell, fonts, base CSS | `m2-shell` | `b3c97c1` | pass with nits, fixed |
| M3 CI gates (`scripts/postbuild.sh`) | `m3-ci-gates` | `bbbe8d6` | pass with nits, fixed |
| M4 home and the Posts card | `m4-home` | `f5eab31` | pass with nits, fixed |
| M5 post page, heading and blockquote hooks | `m5-post` | `c3c70f5` | pass with nits, fixed |
| M6 code blocks | `m6-code` | `56ae775` | pass with nits, fixed |
| M7 content edits and the link hook | `m7-content-rebuilt` | `7e8cb62` | pass with nits, fixed |
| M8 git origin and the colophon | `m8-colophon` | `3ad242a` | pass with nits, fixed |
| M9 status line and Contents box | `m9-status` | `7c77c28` | pass with nits, fixed |
| M10 Older/Newer | `m10-pn` | `8bb34f4` | pass with nits, fixed |
| M11 search on the index | `m11-search` | `ab551a8` | failed twice; third review pass with nits, fixed |
| M12 404 | `m12-404` | `1036f30` | pass with nits, fixed |
| M13 About | `m13-about` | `5fe3aef` | pass with nits, fixed |
| M14 Feeds | `m14-feeds` | `931ab60` | pass with nits, fixed |
| M15 Atom feeds, sitemap, robots | `m15-feeds-xml` | `a0de55b` | pass with nits, fixed |
| M16 favicon set | `m16-favicon` | `a8345a2` | pass with nits, fixed |
| M17 social cards | `m17-cards` | `60b120a` | pass with nits, fixed |
| M18 print | `m18-print` | `c4fa14b` | pass with nits, fixed |

- **Two M7 branches.** `m7-content` (`9927c1b`) is the first M7 attempt and is superseded. M8 stacks on `m7-content-rebuilt`. Delete `m7-content` when convenient.
- **Parallel branches.** M14–M17 were each branched from `m13-about` and merged up in order, and M18 from `m16-favicon`. Each merge is a merge commit (`merge: …`):
  - `c522b1f`: M14 into M15
  - `a8345a2`: M15 into M16
  - `a5e9c8d`: M16 into M17
  - `1e41e25`: M17 into M18
  
  M11's round-3 fixes reached M12 and M13 the same way (`1036f30`, `bbf97c9`). So each branch contains the previous one, and a PR of each against the previous one shows only its milestone.
- **Merging to `theme`.** Merge the stack in order with merge commits, not squashes. M8 lists bulk commits by hash, and a squash would also spread the M7 content commit's `Bulk: true` trailer over real edits. `26d75ce` is the M7 content commit.
- **Worktrees and branches** were removed on 2026-09-30 (see "After launch"). Every milestone's commits are on `main`, through PR #1's merge commit.

### Sizes at `m18-print`
The largest page is the index, at about 9.6 KB gzipped against the 14 KB (14,336 B) budget. The largest post is `nixos-anywhere-and-disko`, at about 9.2 KB. The search script is 2.6 KB gzipped, and 404 is 3.8 KB.

### Changes from the spec made during the build
- **M1:**
  - `--baseURL` and the configure-pages step are dropped from CI already (finding 7, planned for M3).
  - x86_64-darwin is dropped from the flake: nixpkgs-unstable no longer supports it.
  - The Pages artifact uploads on every run; only the deploy job is gated to main.
- **M2:** there's no global reduced-motion rule. Components scope their own.
- **M3:** PR builds link `github.event.pull_request.head.sha`, not the temporary merge commit. The checks run after the cache save and before the upload.
- **M4:**
  - The intro uses the lab's copy-edited text.
  - The 5 projects moved to `data/projects.toml`.
  - `data-t` holds term slugs.
  - `/posts/` isn't rendered (`render = "never"`).
- **M5:**
  - Prose `ul` and the card's `ol` get `role="list"` (WebKit drops list semantics under `list-style:none`).
  - A plain blockquote has a 2px `edge` left rule, which isn't in the spec.
- **M6:**
  - The path lift skips shebangs and version comments.
  - An unmapped language warns, which fails CI.
  - The focus ring on `<pre>` is inset (`outline-offset:-4px`) so it shows on the fg frame in light mode.
- **M7:**
  - The link hook fails the build on an internal link that doesn't resolve. Link content files (`/posts/<name>.md`).
  - Two blocks gained `{file=…}`: `docker-compose.yml` and `10-fbdev.conf`.
- **M8:**
  - The colophon grid is a `dl`.
  - Commit links use the full hash for git-derived commits.
  - Builds outside a git checkout need `HUGO_ENABLEGITINFO=false`.
  - The repo URL is `params.repo` (from M13).
- **M9:**
  - The `nav` sits right after the header.
  - Contents opens on tap via `tabindex="-1"` on `.stat-where`.
  - Breadcrumbs ignore the pointer.
  - A heading with the id `top` fails the build.
  - Only h2 and h3 count.
  - In forced colours the progress rule uses `Highlight`.
  - 6 heading titles contain `&`, not 5.
- **M10:** names come from `.File.Path` minus `posts/`, not `.File.LogicalName`, so page bundles read `slug/index.md`.
- **M11:**
  - Menu filters match tags exactly; only a typed `#word` matches by prefix.
  - Re-picking the applied value keeps it.
  - "No post matches." has no query echo or clear link.
  - Tags named `all`, `main` or like `y2023` fail the build.
  - The index keeps `outputs.home` json, and `home.html` fails the build without it.
  - Loading the index:
    - The address follows the box 300 ms after typing pauses, and any pending update is made on `pagehide`. WebKit throws after 100 `replaceState` calls in 10 s.
    - A bad answer (a bad status, or JSON that doesn't parse) falls back to the no-script state and follows a pick made meanwhile.
    - A request that fails outright (as when the page is left mid-load) keeps the address and hides the box, and the request is made again on `pageshow` or on a menu pick.
    - Enter and ↓ wait for the index, one draw follows the load, and a redraw keeps focus on a row link.
- **M12:**
  - The `.callout` rules live in `main.css`.
  - The Posts card's rules are in `card.css` (home and 404), and `index.css` (intro, Search, menus) is home-only.
  - 404 has `noindex` and no canonical link.
  - Its sentence reads "…and the index filters them by tag or year", because "search" isn't true without the script.
- **M13:**
  - `prose.css` holds the page head, prose, lists, blockquote and the keyed grid shared by `.kv` and the colophon, and loads on every regular page.
  - `pages.css` holds `.kv`, `.pcard` and the Feeds card, for pages that aren't posts.
  - A `prose.html` partial renders every page's prose. The head stays in each layout, because Feeds puts Subscribe between the two.
  - The keyed box is a `dl`, not the lab's spans.
  - The last box sits 56px above the footer rule, like every other page; the lab's `.kv` margin gave 96px.
- **M14:**
  - The blogroll is `data/blogroll.toml` with a `topics` order.
  - A feed with an unknown topic, no name, or a URL without a host fails the build.
  - The names use curly apostrophes, and the intro paragraphs are unwrapped.
  - The Subscribe address comes from home's atom output, with a `<wbr>` before `atom.xml`. It isn't linked, as in the lab; the footer links the feed.
- **M15:**
  - `[minify] disableXML = true`: Hugo's XML minifier stripped code indentation in 13 of 17 feed entries.
  - Day-only dates are written as midnight UTC, as Zola wrote them, so all 17 `published` values match the live feed byte for byte.
  - `updated` is clamped to at least `published`.
  - Tag redirect pages link their feed, and a tag feed's HTML alternate is `/tags/<slug>/`.
  - The sitemap lists only home, the posts, About and Feeds, with `lastmod` on posts only.
  - The feedvalidator warns "two entries with the same atom:updated" on 3 feeds, because two posts' last real edit is the same commit (`ac91bc2`). No action is needed.
- **M16:**
  - `favicon.svg` is dark by default through `fill` attributes, with a `prefers-color-scheme: light` block. The spec said "an internal dark `@media` block"; a renderer that ignores CSS gets the dark icon, matching the PNGs.
  - The apple-touch icon uses 9px cells with an 18px margin, which clears iOS's rounded corners.
  - `scripts/favicons.py` reads the pixel map from `mark.html` and stops if the mark's rects don't match it.
  - `sizes="32x32"` on the PNG link keeps Chrome on the SVG.
  - There's no `/favicon.ico`; the live site already 404s it.
- **M17:**
  - Three card bases (`assets/images/card-base-{1,2,3}.png`) come from `scripts/card-base.sh`, so the box fits a 1-, 2- or 3-line title as the lab's does.
  - The card fonts are fingerprinted, so a font change redraws the cards.
  - The card path is decoded, which handles non-ASCII slugs.
  - A title with a character the fonts can't draw, or too long for 3 lines at 48px, fails the build.
  - The og tags include `og:site_name`, and posts also get `og:image:alt`. Pages other than posts get og tags without an image, and 404 gets none.
  - The full 0xProto 2.502 TTFs are committed (421 KB of repo weight, none on the site).
- **M18:**
  - The light palette comes from `@media print,(prefers-color-scheme:light)`, and the print block adds `--bg:#fff;--code:#fff;--body:var(--fg)`. `post.css`'s old print rule is folded into `main.css`.
  - `render-link.html` marks a link whose text is its own address `class="addr"`, so it doesn't print the address twice. This reaches one post's feed content.
  - Beyond the spec:
    - `print-color-adjust:exact` on labels and bullets
    - a 10px clearance so a box that starts a page keeps its label
    - `body` printed as a block
    - code windows over 45 printed lines (A4) get `long` and may split; the rest stay whole, with `orphans`/`widows:4`
    - internal prose links and About's Projects links print their address too
    - Firefox ignores `break-before:avoid`, `orphans` and `widows`
    - print drops `.tcard ol`'s `clip-path`, which in Firefox hid a Posts-card row past a page break (`604c314`)

### Launch (2026-09-30)
- **Steps.**
  1. Pushed `theme` and `m18-print`. The other milestone branches stay local.
  2. Opened PR #1, `m18-print` → `main`, as one PR rather than 18 stacked ones.
  3. The PR's build passed on its first run and the deploy was skipped. The CI artifact matched the local build byte for byte, all 105 files, apart from the footer's build label.
  4. Switched Pages to GitHub Actions (`gh api -X PUT …/pages -f build_type=workflow`); the domain and HTTPS carried over. `main`'s protection requires 1 review, so the PR was merged with `--merge --admin`, as `5c995f0`. Run `36699873815` deployed it.
- **Live checks, all passing.**
  - The footer reads `build 5c995f0`.
  - `/nope/` returns 404 with the new page, and `/archive/`, `/page/1/`, `/page/2/`, `/tags/` and the tag pages redirect.
  - The pages, feeds, sitemap, robots.txt, `index.json`, the favicons and the cards all return 200.
  - All 49 URLs in the old sitemap (`origin/gh-pages:sitemap.xml`) return 200.
  - The ids and `published` values of `/atom.xml` and the 26 tag feeds match the old Zola feeds on `gh-pages`.
  - The colophon's source, commit and history links resolve.
  - GitHub's history view detects the rename for all 17 posts (`renameHistory.hasRenameCommits`, `oldName` `blog/content/<file>`). The history ends at `6f2b864` with a link to the old path, which lists the earlier commits, so the `commits/1d1b39a/blog/content/<file>` fallback isn't needed.
- **CI note.** `ubuntu-latest` moves to Ubuntu 26 from 2026-10-19. The workflow downloads its own Hugo, so it shouldn't matter; check the first run after that date.
- **Firefox and `hugo serve`.** Firefox shows the status line's fallback, the title with no percentage and no current section: by design, since it has no CSS scroll tracking. Under `hugo serve` the footer reads `build serve` (`c4fa14b`).

### After launch (2026-09-30)
- **Cleanup.**
  - The worktrees and all 21 local milestone branches are removed, and the main checkout is on `main`. Every branch but `m7-content`, the superseded first M7 attempt, was merged.
  - `theme`, `m18-print`, `m19-launch` and `gh-pages` are deleted from GitHub, which has only `main`.
  - `.git/modules` is removed. None of its old submodule clones had unpushed work.
  - The stray Chrome, PID 8236, had already exited.
- **Rollback.** The old Zola deploy survives only as a local tag, `zola-site` (`f8bacec`), in the main checkout. To go back: `git push origin zola-site:refs/heads/gh-pages`, then set Pages' source to that branch.
- **Changes after launch.**
  - Answers to the open questions (see "Decisions").
  - **Width.** Posts, About and Feeds capped their head, prose and boxes at 74ch, about 688px. Every page's content now fills the 772px column, lining up with the header and footer. Prose lines run to about 83 characters.
  - **Footer figures.** Every page shows the same two figures, `home 37.5 KB · 2.5 KB js`, instead of its own size.
    - The first is what a browser fetches to load the homepage: `index.html` gzipped, plus the files its head fetches (the preloaded Regular font and the SVG icon). That's how the 10 KB and 250KB Clubs count a site: one page, compressed, with everything it loads.
    - The 512KB and 14KB Clubs count uncompressed, about 72 KB here.
    - The font is 73% of the homepage's 37.5 KB, so it's the lever for going smaller.
    - The second is the site's one script, the index's. `scripts/postbuild.sh` writes both into `__HOME__` and `__JS__`, repeating until the homepage's own figure is stable, and still fails any page over 14 KB.
  - **Type (2026-10-01).** 0xProto gave way to four faces from Monaspace 1.400 (GitHub Next, drawn by Lettermatic). They share one grid: 0xProto's 0.62em advance, a 0.50em x-height and a 0.73em cap height. Picked in the Monaspace lab (https://claude.ai/artifact/WbP9RoqPAm4G6JdyFDu35L), which showed the built pages with every role switchable.
    - **Roles**, one per face, as the designers meant them:
      - Argon (humanist): prose, UI and code.
      - Xenon (slab serif): h1, h2 and h3.
      - Radon (handwriting): comments in code windows. Hashbangs and preprocessor lines keep the comment colour but not the face.
      - Krypton (mechanical): what the build writes, namely the meta line, dates, the colophon, This site and Subscribe, code-window paths, Older/Newer, the status line, counts and the footer.
      - Neon, the fifth, sits out: it's too close to Argon to earn a file of its own. Italics are Argon's; post titles and box labels are the reading face; home's `.vh` h1 stays in Argon, so home loads no Xenon.
    - **Ligatures.** Only texture healing (`calt`) is kept. The coding ligatures (ss01–ss10) aren't in the files, after Butterick: they draw characters other than the ones people copy.
    - **Sizes.** 13.5, 15, 17, 21.5 and 27px, up from 12, 13.5, 15, 19 and 24. At 15px Monaspace looked 9% smaller than 0xProto, and its 7.5px x-height is about 0.16° at CSS's reference pixel, under the 0.2° critical print size below which reading slows (Legge and Bigelow 2011). 17px gives 0.18° and 73 characters a line. Phones keep 17px; the 14.5px rule is gone. The status line reserves 42px, list squares sit at 13px, and print's `long` code windows are over 41 lines of 68 columns.
    - **Files.** `scripts/fonts.py` (in `nix develop`, which now has fontTools) downloads the release, checks its hash, and cuts each face at a fixed weight and slant: 7 woff2 subsets in `static/fonts` (the site's 318 characters) and Xenon Bold and Krypton for the cards in `assets/fonts`. Monaspace reserves its names, and a subset is a Modified Version (OFL FAQ 2.6), so they're renamed after their symbols: "MM Ar", "MM Xe", "MM Rn", "MM Kr".
    - **Weight.** Every page preloads Argon and Krypton Regular, and home loads nothing else: its figure went from 37.5 KB to 35.0 KB. A post with h3s and comments loads 5 files, about 79 KB, against 55 KB of 0xProto.
    - **Social cards.** The title is Xenon Bold and the meta line Krypton. Monaspace's ascent is 0.945em to 0xProto's 1.13em, so the partial adds the difference as line spacing and moves the text down by as much, which keeps every baseline where it was. The bases are redrawn in Argon, and the title check allows exactly the cards' characters.
  - **Hugo practices (2026-10-02).** The site was compared with Hugo's docs and release notes up to 0.167.0, and with Google's and GitHub's docs. It was mostly in line already. The changes:
    - **Build.** `scripts/build.sh` holds the build flags for CI and local builds, so a warning fails a local build too.
    - **Hugo version.** `module.hugoVersion` `min` is the pinned 0.166.0. The workflow checks Hugo's download against a pinned SHA-256. To update Hugo, change `min` first, then the flake, `HUGO_VERSION` and `HUGO_SHA256` (README). Hugo 0.167.0 (2026-09-28) waits for nixpkgs.
    - **Workflow.**
      - The Go and Node steps are gone, along with the history fetch that `fetch-depth: 0` made redundant.
      - The cache steps and `[caches.images]` are gone too. They only kept the 17 social cards, which build in about 0.3 s cold.
      - Checkout doesn't keep the token, and both jobs have timeouts.
      - Dependabot updates the actions monthly.
    - **JSON-LD.** Posts carry a JSON-LD `BlogPosting` (`jsonld.html`). `postbuild.sh` doesn't count it as a script.
    - **New posts.** A post without a summary fails the build, and `archetypes/posts.md` starts new posts.
    - **Images.** `render-image.html` resolves images in a post's bundle or `assets/` and adds their size. A remote image, missing alt text or a missing file fails the build, and so does a `card.png` in a bundle (`social-card.html`), which would take the card's address. No post has images yet.
    - **Templates.** `layouts/list.html` is gone, so a new section with no template fails the build instead of rendering a bare list.
    - **Config.** `locale` is `en-AU`. Hugo may run only git, and fetches nothing remote.
    - **Links.** 9 dead links in 7 posts now point where the pages moved, at the Wayback Machine, or, for the owner's `nix-config`, at the commit the post describes, since that repo no longer has its NixOS config. The `nixos.wiki` links point at the official `wiki.nixos.org`. The edit changes only links, so its commit carries `Bulk: true` and the posts keep their updated dates. Stack Exchange and Linode answer bots with 403 but are live.
- **Known.**
  - Safari's favicon in dark mode: WKWebView drew `favicon.svg`, as an `<img>`, in its light variant while the page reported dark. Safari's own tab icon couldn't be checked from the harness. It stays legible either way.
  - Feed readers may show the 12 entries whose `updated` changed at launch as updated once. The ids, `published` values and feed URLs didn't change.

## Where things are

| What | Where |
|---|---|
| Design lab (rev 15, picked: opens on the final picks, and every option explored stays under "Every switch") | https://claude.ai/artifact/Tb4pePZ6AC5JNVCabTGQ7A |
| Contents box lab (2026-10-03, picked: button D, the ground ring, and box D, the dimmed page): six treatments of each over the real post on a phone | https://claude.ai/artifact/HQX7x511iDU6q6odo4SuLA, local copy `docs/design/box-lab.html` |
| Content trace canvas (2026-10-03, picked: desktop A · Ticks, phone 2 · Pop-up with the button bottom right) | https://claude.ai/artifact/HvjDWGS6AjJP2wPspR4p8A |
| Rail lab (rev 9, picks made): six contents rails, the keyed colophon, commit message placement | https://claude.ai/artifact/NwYMmP5akxuJyZ5MQyAWq2, local copy `docs/design/rail-lab.html` |
| Mark lab and design review (rev 7, picks made) | https://claude.ai/artifact/71VrwQCm6i1q16eKn1b55n, local copy `docs/design/mark-lab.html` |
| First proposal (A/B/C directions, for history) | https://claude.ai/artifact/VFM7eMyvC5erWnZjwaEDpk |
| Local copy of the lab, self-contained | `docs/design/theme-lab.html` (open in a browser) |
| Lab source, with placeholders for fonts and dither masks | `docs/design/theme-lab.src.html` |
| Lab build (inlines fonts, masks and the grep index into the local copy, and measures the grep script) | `docs/design/build-lab.py` |
| Search index for the lab: every line of the 17 posts, `[{s,t,d,g:[tags],l:[[line,text,anchor,kind]]}]`, kind 0 prose, 1 heading, 2 code | `docs/design/grep-index.json` |
| Grep index generator (rerun after content edits, then `build-lab.py`) | `docs/design/build-grep-index.py` |
| 0xProto subsets and OFL licence | `docs/design/fonts/` |

The lab's CSS is the reference implementation. It contains every option that was explored, so only the selectors that match the final picks below apply. Everything under `.site` in the lab is the site. Everything outside it is lab chrome. The rev 7 picks are baked into those selectors rather than added as switches.

`docs/design/` is committed (`f4e7b18`, on `main` and `theme`). After editing `theme-lab.src.html`, rerun `build-lab.py` and commit both files. The lab's saved-state key is `mm-theme-lab-rev15-picked`, so a browser that saved rev 15's recommendations opens on the picks. The lab sources for the mark and rail labs lived in a session scratchpad and are gone; the self-contained HTML copies in `docs/design/` hold all their CSS and data.

## Final picks

The complete set, as the user pasted it back on 2026-09-27 with the rev 15 picks. The lab opens on it, and its "Your picks" line prints it:

```
filt=menus pn=file ilay=boxes sline=rev13 sbox=row idx=all search=grep where=home projects=about social=footer sync=quiet tagsidx=rows term=label nf=box about=site feeds=card navfeed=feeds feed=full anchors=off bullet=solid nav=status det=path ptags=inline layout=single hstyle=contrast home=projects tstyle=card dither=shade logo=shadow palette=tuned mode=dark header=ruled tags=off prose=mono rule=off lines=off frames=heavy
```

Each key maps directly to a `data-*` attribute on `.site` in the lab CSS. `where=home` confirms search on the index: the user picked `where=page` in rev 12, then asked for the box on the index, and pasted back `where=home` with the rev 15 picks. `home=projects` predates rev 12 and no longer does anything: `projects=about` decides where the Projects card goes, and the index has none. `tagsidx` and `term` describe pages that search replaced (rev 12). How each pick was made follows. These were settled by rev 10:

```
bullet=solid nav=status det=path ptags=inline layout=single hstyle=contrast home=projects
tstyle=card dither=shade logo=shadow palette=tuned mode=dark header=ruled tags=off
prose=mono rule=off lines=off frames=heavy
```

`logo=shadow` is the rev 7 mark. These are the rev 7 picks from the mark lab:

```
mark=shadow lockup=plain msize=24px
take=R1 R2 R3 R4 R5 R6 R7 R8 R9 C1B C2b C3 C4 C5 C6 E1 E3 E4 E5 E6
```

Later changes to those picks:
- **E2** (a NixOS release on the meta line) was declined. The NixOS channel was removed from the posts instead (see "Current repo state").
- **E6** (rail ticks spaced by section length) went away with the ticks.
- **E4** (the last commit's message in the colophon) was dropped. The user couldn't tell what "edits to latest post" was, and a labelled row didn't earn its place.

These are the final rev 9 picks from the rail lab. The theme lab carries them as `nav=status`, and rev 11 applies `subj=off`:

```
rail=status narrow=none colo=keyed subj=off
```

**Rev 11, picked by the user on 2026-09-27:**

```
tagsidx=rows term=label nf=box about=site feeds=card navfeed=feeds feed=full pn=split anchors=off posts=home
```

In the same message the user asked for the rev 12 work:
- `/posts/` can go.
- Search should replace the tags index and `/posts/`, so `tagsidx` and `term` describe pages rev 12 replaces.
- Projects should move to About, with a GitHub link.
- Feeds should stay in step with Miniflux, with manual edits still possible.
- Older/Newer should be minimal and tasteful, with a slight software-engineering reference, so `pn=split` stays only as one option.
- The index needs a plan for growth.

**Rev 12, picked by the user on 2026-09-27:**

```
idx=more search=grep where=page projects=about social=footer sync=quiet pn=graph
```

With it the user asked for three changes, and rev 13 applies them:
- **Search on the index.** The lab now carries `where=home`, despite the `where=page` pick, because the user asked for the box on the index. The user wasn't happy with how rev 12 drew it, and asked for search that is "fast and efficient and accurate", "easy to use and filter", with subtle engineering cues.
- **The blogroll stays manual.** "Keep code simple": no Miniflux sync, so `sync=quiet` and the old M20 is dropped.
- **Older/Newer shows less.** No titles or dates on show; explore further in that direction.

**Rev 13, picked by the user on 2026-09-27:**

```
sbox=row pn=pg
```

With it the user asked for three changes, and rev 14 applies them:
- **Older/Newer spreads across the text column.** `‹ older` sits flush left under the colophon, `5 / 17` in the middle, `newer ›` flush right. Done in rev 14; no choice needed.
- **Clearer separation** between the search box, the tags, the years and the posts on the index. "Experiment with some creative and tasteful alternative layouts that fit with the overall theme." See Rev 14 (`ilay`).
- **A status line more like the user's Neovim statusline** (lualine: flat blocks, `NORMAL`, branch, file name; `utf-8`, filetype, `61%`, `26:13`). "Don't go too far, only minor tasteful additions", a few options, and drop the minutes left. See Rev 14 (`sline`).

**Rev 14, picked by the user on 2026-09-27:**

```
ilay=boxes sline=rev13
```

The status line stays as rev 13 designed it, with the minutes left; the M9 fixes from Rev 14's "Found while building" still apply. With it the user asked for three changes, and rev 15 applies them:
- **Tags and years.** "I like the separate search bar, but I'm still not happy with how tags and year are handled." "Think creatively and add some experiments with different ways this could look, simple interactions and easy to understand for users should be the focus." "It's not immediately clear that tags and years are a filter." See Rev 15 (`filt`).
- **Older/Newer.** "Too much spacing between where they are and the footer." "Not quite hitting the mark. I'm after something very subtle with a subtle nod to software engineering." See Rev 15 (`pn`).
- **No limit on the list.** "If we have a search bar in the index page we likely don't need to limit the results in the posts list either." Done in rev 15: `idx=all`. The index lists every post, with no `showing 10 of 17` and no `show all`.

**Rev 15, picked by the user on 2026-09-27:**

```
filt=menus pn=file
```

No notes came with them. Baking the picks into the lab found one bug in `menus` without a script (Rev 15, "Found while baking").

## The design

**Principles.** Brutalist, zero JavaScript except the index's search (rev 13, its footer states the weight), HTML plus inlined CSS under 14 KB compressed per page, one font file on most pages. Structural devices carry real data: the commit, the source file and the history. Nothing is decoration for its own sake, and no cue may be false on launch day.

**Type.** Replaced by Monaspace on 2026-10-01, with new sizes; see "After launch". As launched: 0xProto everywhere, both body and code. It's OFL, by 0xType, release 2.502. Metrics: advance 0.62em, x-height 0.55em, cap height 0.71em.
- **Scale.** The only sizes are 12, 13.5, 15, 19 and 24px:
  - labels, nav and footer: 12
  - code, meta and colophon: 13.5
  - body: 15, with line-height 1.7
  - h2: 19
  - h1: 24

  Phones drop the body to 14.5. Code line-height is 1.6.
- **Weights.** 400 and 700. h3 is bold, so Bold loads on the 7 posts with h3s and on any page that uses bold. Summaries are upright, so the Italic file only downloads on pages that use italics. Set `font-synthesis: style` so the browser never fakes a bold. Don't set `-webkit-font-smoothing`.

**Colour.** Dark first, and light follows `prefers-color-scheme`. There's no toggle, because a toggle needs JS. These are the "tuned" palette tokens:

| Token | Dark | Light | Used for |
|---|---|---|---|
| bg | `#0f1214` | `#f5f4f0` | page |
| fg | `#e6e2d6` | `#0f1214` | headings, frames, list markers, inline code |
| body | `color-mix(fg 85%, bg)` | `color-mix(fg 74%, bg)` | paragraph and list text |
| mute | `#a39f93` | `#67655d` | meta text, colophon keys, the Contents button's count |
| line | `#272c30` | `#dddbd3` | hairlines |
| edge | `#3e454a` | `#b3b0a6` | dotted row separators, code scrollbar |
| dim | `color-mix(mute 55%, edge)` | `color-mix(mute 55%, edge)` | the trace's ticks (4.1:1 and 3.3:1 on bg) |
| code | `#0a0d0f` | `#ebe9e3` | code background |
| acc | `#e7a15a` | `#e7a15a` | accent fill (selection) |
| acct | `#e7a15a` | `#9f5510` | accent as text: commit hash in the colophon, build hash in the footer |
| focus | `#e7a15a` | `#0f1214` | focus ring (acc on the light ground is only 1.98:1) |
| com | `#75818b` | `#5f6a72` | code comments (the old light value failed at 3.62:1) |
| str | `#e7a15a` | `#9f5510` | code strings |

Frames are heavy: a 2px border in `fg`. Title bars are an `fg` background with `bg` text.

**Dither.** It's an offset shadow 8px down and right, behind a framed box, at 50% opacity in `fg`. It's drawn as a CSS mask with our own tile: 4×6, two 1×2 dots, staggered (`M0 0h1v2H0zM2 3h1v2H2z`). Use **one per page** (C2b):
- the Posts card on the index, and on 404
- the colophon on posts
- "This site" on About
- "Subscribe" on Feeds
- the social card

Everything else is plain: the Projects card (on About), the 404 box, "Feeds I read", callouts, code windows, figures and the Contents box. The frame lines up with its column, and the dither hangs outside it.

**Box labels.** Labels are cut into the top-left of the border, fieldset-legend style, in Title Case at 12px: "Posts · 17", "Projects · 5", "Note", "Contents", "Post" on the social card, and the language on a code block that has no file path (C1B). The colophon's label is the source file path. The rule: an inverted title bar means a file or a figure, and a cut-in label names one of the site's own boxes.

**Header** (C3, C4).
- A ruled header with a 2px bottom rule.
- The mark at 24px, next to "MICHAEL MURPHY". The name is the only uppercase text, at 12px with 0.08em tracking.
- Nav on the right, lowercase as written with no transform and no tracking: `posts about feeds`. Rev 11 picked `navfeed=feeds`. Search lives on the index (rev 13), so there's no `search` or `tags` item, and `posts` is current on the index and on every post.
- The current section is marked with the 7px `fg` square used in the Contents box, placed so it doesn't shift the layout. Inversion is only for hover and title bars.
- Nav and footer links get an `::after` hit area at `inset:-12px -6px`.

**Footer** (C3, C6, E3).
- It mirrors the header with a 2px top rule, as written at 12px, with no transform.
- On the left: `© 2022-2026 Michael Murphy · github` (rev 12 `social=footer`).
- On the right: `build <hash> · <weight> · 0 B js · atom.xml`. The hash is in `acct`. On the index, `0 B js` becomes the search script's real gzipped weight. `atom.xml` links to the feed file.
- `<weight>` is the page's real gzipped size, e.g. `11.8 KB`, written by CI (Build scope, M3).

**Mark (Shadow stamp).** It's a 16×16 pixel map:
- a 14×14 `fg` square
- a 5×5 pixel M knocked out in `bg`, with 2px cells from (2,2)
- a 1px `fg` checker along the right and bottom, 2 cells down and right: the site's dither shadow at favicon scale

There's no accent. On a 2× screen, 16, 24 and 32px land on whole device pixels, and 20px doesn't. Uses: the header (24px), the favicon set and the social card. Draw it as an SVG on `viewBox="0 0 16 16"` with `shape-rendering="crispEdges"`, merging horizontal runs into rects:
- `f` → `fill: fg`
- `b` → `fill: bg`
- `d` → a 1×1 rect in `fg`
- `.` → nothing

```
ffffffffffffff..
ffffffffffffff..
ffbbffffffbbffd.
ffbbffffffbbff.d
ffbbbbffbbbbffd.
ffbbbbffbbbbff.d
ffbbffbbffbbffd.
ffbbffbbffbbff.d
ffbbffffffbbffd.
ffbbffffffbbff.d
ffbbffffffbbffd.
ffbbffffffbbff.d
ffffffffffffffd.
ffffffffffffff.d
..d.d.d.d.d.d.d.
...d.d.d.d.d.d.d
```

**Home.** A short intro, taken from the current About text. Then the Posts card with the dither: title on the left, full date on the right, dotted row separators, no word counts, no tags. It lists every post (rev 14 `idx=all`; the search box does the narrowing). Search sits in a plain framed box of its own, labelled "Search", above the card (rev 14 `ilay=boxes`). It holds fzf's `>` prompt, the input, and the `/` hint or the `3/17` count (rev 13 `sbox=row`). Under a dotted rule come a `filter` key and two menus, `tag: all ▾` and `year: all ▾` (rev 15 `filt=menus`; see Rev 15). The card filters as you type and as the menus are set. The Projects card moved to About (rev 12).

**Post page.**
- **Head.** The title (24px) sits above a single line: `2023-01-18 · 3 min read · #tag #tag`. The tags are muted links. Then a 1px `fg` rule, capped at the column width (`.ph{max-width:74ch}`). There's no summary shown on the page. Keep `summary` in front matter for meta descriptions and the feed.
- **Layout.** A single column: 820px wrap, 24px side padding (16px on phones), prose max 74ch.
- **Headings.** The "contrast" style: body text in the `body` token, h2 at 19px in full `fg`, h3 at 15px bold in `fg`. There are no markers and no rules.
- **Lists.** `ul` uses 7px solid squares and `ol` uses decimal numbers, both in `fg`.
- **Inline code** is `fg` on the `code` background.
- **Code, two tiers** (C1B):
  - A block with a file path gets the framed window and a title bar showing `Nix · /etc/nixos/configuration.nix`.
  - A block without one gets the same frame, with the language cut into the border as a label (`Bash`) and no bar.
  - Neither has line numbers, a line count or the dither.
  - Syntax colour is two-tone: comments in `com`, strings in `str`, everything else plain.
  - Long lines scroll inside the frame, with a CSS scroll hint on both edges (`local` gradients in `code` over `scroll` gradients of `fg` at about 22%) and `scrollbar-color:var(--edge) var(--code)`.
  - `<pre>` gets `tabindex="0"` so keyboards can scroll it.
- **Figures.** The same frame and title bar as code, e.g. `Fig. 1 · What Survives a Reboot`, with no dither. Box-drawing diagrams go in a `<pre>` with line-height 1.2. Mermaid figures have a `<details>` "source" toggle underneath, and they scroll at natural size like code instead of shrinking.
- **Callouts** come from `> [!NOTE]`: a framed box with the "Note" label and no dither.
- **Colophon** ("path" layout, with the dither).
  - It sits at the end of the post, as wide as the text column. The frame's label is the source path, linked.
  - Inside is one keyed list, with the keys in `mute` in a single column of equal width and the values in `fg`:
    ```
    created 2024-04-08
    updated 2024-04-08
    commit  2f348a3                                  history
    ·····························································
    words 687 · code blocks 5 · Bash 4 · YAML 1
    ```
  - The hash is in `acct` and links to the commit. `history` sits at the right end of the commit row and drops below it on phones. There's no commit message (`subj=off`).
  - The code line (E5) is keyed, using the title-bar language names, e.g. `words 449 · code blocks 3 · Nix 3`. The terse `3 blocks · nix 3` was unclear.
  - The keys were `filed` and `changed` until rev 9.
  - Under the 600px container width, the frame gets `padding-top:38px` so a wrapped path label clears the first line.
  - The dates and hash come from the origin partial (Build scope, M8).
- **Older/Newer** (rev 15 `pn=file`). Under the colophon, the neighbouring posts are named by their source files: `‹ systemd-services-and-timers-nixos.md` flush left and `nixos-tmpfs-installation.md ›` flush right.
  - Older is the next post back by date. The newest post shows only older, and the oldest only newer, still at the right.
  - 13.5px in `mute`, no underline, inverted on hover like every other link. No captions.
  - Each link's `aria-label` is `Older post: <title>, <slug>.md` (or `Newer post: …`), so the accessible name has the title and ends with the visible text.
  - The names give way with an ellipsis only when both don't fit on one line. At 600px and below they stack, older at the left and newer at the right.
  - 32px under the colophon frame (about 24px to the eye, because of the dither) and 28px above the footer's rule: the post page's bottom padding drops from 56px to 28px. Measured in the lab on three posts.
- **Status line** (the contents navigation, rev 9). **Superseded on 2026-10-03 by the content trace; see "Content trace".** The header's ruled strip, `position:fixed` at the bottom of the window on posts, at every width including phones. There's no margin rail and no narrow-screen companion.
  - **When it appears.** Only on posts with 2 or more headings (h2 and h3 counted together). A post with fewer gets no strip at all. Every current post has at least 2, and the fewest are `nix-useful-references`, `restore-nextcloud-from-backup-nixos` and `zfs-useful-references`, so today the rule only affects future posts.
  - **The strip.** It has a `bg` background and a 2px top rule in `edge`. The text is 12px `mute`, aligned to the 820px wrap with `padding-inline:max(16px,calc((100% - 772px) / 2))`.
  - **Left.** The post title by default. When a section is current, it shows `■ Syncing Watch Status › Adding Backend` (h2 › h3, in `fg`). This comes from a stack of anchors, one per heading, each carrying its breadcrumb text written at build time. Only the `:target-current` one is visible.
  - **Right.** `41% · 2 min left` in tabular figures.
  - **Progress.** The top rule fills with a 2px `fg` bar (`scaleX`) as you read.
  - **The Contents box.** Hover or `:focus-within` opens it upward from the strip: the "Contents" label, heavy frame and no dither. It lists every heading, with h3s indented and a 7px square marking the current entry. It's hidden with `opacity:0; pointer-events:none`, never `visibility:hidden` (R1), so its links stay focusable.
  - **Reference CSS.** The rail lab has the reference, including the `@property` rules for `--pct` and `--left`, and the keyframes inside `@supports (animation-timeline:scroll())`.
  - **Safari.** Show the counters with `counter-reset: pct calc(var(--pct))`. Without `calc()`, Safari animates the value but doesn't round it, and the counter reads 0.
  - The old ticks rail stays in the theme lab as `nav=rail` for reference.
- **Nav marker** (C4). The current nav item's square sits absolutely, .8ch to the left and centred vertically. The nav gap is 3ch so the square fits between items.

**Social card.** 1200×630, generated at build time. The ruled header strip with the Shadow stamp and the name, then a framed box with the dither, the "Post" label, the title in 0xProto Bold and `date · N min read`.

**Accessibility floor.** Every text pair passes WCAG AA in both modes, and every non-text indicator (focus ring, the trace's ticks) passes 3:1. There's also an `@media (forced-colors:active)` block: bullets and the Contents marker get `CanvasText` with `forced-color-adjust:none`, the trace's ticks `GrayText` and its current tick `Highlight`, and `[aria-current]` is underlined.

## How it works without JavaScript

- **Contents.** The trace opens its box on `:hover`, and on `:focus-visible` inside it. The button opens it through `#toc:target` (see "Content trace"). The ticks are `aria-hidden` with `tabindex=-1`, and the Contents box links are the accessible ones.
- **Current section.** Uses `scroll-target-group: auto` on each list, with `a:target-current` styles. It works in Chrome and Edge 140+, and was confirmed in local Chrome 153 and headless Chrome 154. Firefox and Safari don't support it yet, so no tick is lit, the box has no marker and the button shows no count. Keep the `:target-current` rules separate from any other selector, because a browser that doesn't know the pseudo-class drops the whole rule.
- **Progress, % and minutes left.** These went with the status line on 2026-10-03. They used scroll-driven animations (`animation-timeline: scroll()`); the rail lab still has them.
- **Search.** The one exception. The index carries a small script (Rev 13), and its footer says how much. Without it, the box stays hidden, the frame is labelled "Filter", and the list shows every post. The two menus are `<details>`, so they still open. Their entries are links to `#nixos` or `#y2023` that filter the list through `:has(:target)`, one filter at a time, and `all` and `×` link to `#all`. In that state an open menu's list sits in the flow, because nothing closes it after a pick (Rev 15, "Found while baking").
- **Mermaid.** Decided: render at build time. The standard mermaid bundle is 3.6 MB raw and 976 KB gzipped, so it never ships to readers.

## Current repo state

This section describes the repo before the build started (2026-09-27). For the state after M1–M18, see "Build progress".

- **Live site.** Still the Zola build from `origin/main` (`1d1b39a`), deployed from the `gh-pages` branch. `/atom.xml` is Atom 1.0 with full text, and there are 26 tag feeds and `/page/1/`, `/page/2/`. See "Build scope".
- **Git** (after M0, 2026-09-27). `main` is 3 commits ahead of `origin/main` and unpushed:
  - `6f2b864` "feat: migrating website from zola to hugo" (author date 2026-09-26). It was `27256ac`, with the staged migration folded in: `blog/` removed, `content/posts/` added (all 17 posts recorded as renames, similarity 86–98%), and edits to `hugo.toml`, `nav.html`, `.gitmodules`, the README and the workflow.
  - `2a2721c` "content: stop pinning search.nixos.org links to a channel". The `channel=` parameter came off the 4 search.nixos.org links: 3 were `22.11` and 1 was `unstable`, in `backup-solutions-nixos` (2), `configure-nextcloud-nixos` and `nixos-minecraft-server`.
  - The commit after it adds `docs/design/`.

  The `theme` branch starts from that last commit, and the build happens there.
- **Theme.** `themes/hugo-bearcub` (submodule), plus title-gated overrides in `layouts/`:
  - `index.html`, `_default/list.html`, `_default/single.html`, `404.html`
  - partials `header.html`, `footer.html`, `nav.html`

  CSS lives in `assets/original.css` and `assets/syntax.css`.
- **Fonts.** `static/fonts` is a private submodule (`git@github.com:mich-murphy/TX-02.git`, holding TX-02 and MonoLisa). CI fetches it with the `TX02_DEPLOY_KEY` secret. `hugo.toml` module mounts publish only the two MonoLisa files.
- **Favicon.** `static/images/favicon.png` (32×32, a laptop icon), set by `params.favicon` in `hugo.toml`.
- **`hugo.toml`.**
  - Permalinks are `posts = "/:contentbasename/"`. These are the old Zola URLs, so keep them.
  - The RSS output is renamed `atom.xml`, though it's RSS 2.0.
  - `[caches.images]` is set for social cards.
  - `markup.highlight` has `noClasses=false` and `lineNos=true`, and lineNos must become false.
  - `copyright` holds a Ye quote.
- **CI.** `.github/workflows/hugo.yaml` runs Hugo 0.166.0 and deploys to GitHub Pages on every push to `main`. `flake.nix` provides Hugo 0.152.2; pin it to 0.166.0 (Build scope, M1). Both support `layouts/_markup/` and alerts. There's no `CNAME` file, so the custom domain is set in the Pages settings.
- **Content.**
  - 17 posts, about 9,800 words. No images, tables or footnotes. Headings are h2 and h3 only; 7 posts use 22 h3s.
  - 69 fenced code blocks: bash 40, nix 25, txt 2, yaml 1, json 1. 25 open with a path comment. 26 of the 40 bash blocks are one line long.
  - At 13.5px the desktop code window fits 77 characters and a 390px phone fits 38.
  - 26 tags, 20 of them used by only one post. nixos has 11 posts and homelab 10.
  - No post has `lastmod`.
- **Home.** `content/_index.md` is titled "About", with an `/about/` alias, a bio and a "Highlighted Projects" list.
- **Feeds.** `content/feeds/index.md` (at `/feeds/`, menu weight 4) is a Miniflux blogroll: an intro and 10 feeds under 4 `###` topics. `content/tags/_index.md` and `content/posts/_index.md` (with an `/archive/` alias) are title-only. The bearcub `nav.html` override lists the menu minus About, plus an RSS link.
- **Build size today.** The largest post body (`nixos-anywhere-and-disko`, without line numbers) is 4.0 KB gzipped; the old CSS is 1.4 KB gzipped.

## Origin data for E1

This is the last pre-migration commit for each post, from `git log -1 -- blog/content/<file>`. Every post's GitInfo points at the migration commit, so the colophon falls back to this data (Build scope, M8). `created` is the front-matter `date`.

| Post | created | updated | commit |
|---|---|---|---|
| backup-solutions-nixos | 2023-02-13 | 2023-04-22 | ad9a0cc |
| configure-nextcloud-nixos | 2023-02-21 | 2023-02-24 | ac91bc2 |
| dev-containers-vscode | 2023-04-11 | 2023-04-11 | f15b14e |
| encrypting-secrets-nixos | 2023-02-22 | 2023-02-23 | 9dff3d8 |
| nix-useful-references | 2023-05-08 | 2023-09-16 | ac2b1e0 |
| nixos-anywhere-and-disko | 2024-03-27 | 2024-03-27 | dd4bcd2 |
| nixos-impermanence | 2023-01-18 | 2023-02-24 | ac91bc2 |
| nixos-minecraft-server | 2024-04-02 | 2024-04-03 | f1e46e8 |
| nixos-tmpfs-installation | 2023-02-06 | 2024-04-02 | 4723d0a |
| proxmox-package-repositories | 2022-12-22 | 2023-02-06 | 438126e |
| resolving-proxmox-installation-issues | 2023-07-18 | 2025-10-30 | 1d1b39a |
| restore-nextcloud-from-backup-nixos | 2024-03-25 | 2024-03-25 | 468d201 |
| s3-object-storage-nixos | 2022-12-14 | 2023-01-20 | 71e966f |
| s3-object-storage | 2022-11-29 | 2023-01-13 | 236e3f0 |
| syncing-plex-watch-state | 2024-04-08 | 2024-04-08 | 2f348a3 |
| systemd-services-and-timers-nixos | 2023-01-12 | 2023-02-13 | 6b027b1 |
| zfs-useful-references | 2023-03-06 | 2023-03-06 | 0b01f92 |

## Build scope

This replaces the 16-step build plan from rev 10. It was last updated on 2026-09-27 for the rev 15 picks, which settle every choice. A scoping pass on 2026-09-26 checked the plan against the repo, the live site and the Hugo sources. Sizes are relative: S is under ~150 changed lines, M is an ordinary PR, L would be split. Dependencies are listed after the size.

### What changed from the rev 10 plan

1. **The live site is still Zola, and its feed is already Atom.** Checked 2026-09-26. `origin/main` is `1d1b39a`, and the migration commit (then `27256ac`, now `6f2b864`) was one commit ahead, unpushed. `https://mich-murphy.com/atom.xml` is Zola's Atom 1.0:
   - feed `<id>` is `https://mich-murphy.com/atom.xml`
   - each entry `<id>` is the post URL with its trailing slash
   - `<content type="html">` carries the full post
   - 17 entries

   The live site also serves 26 tag feeds at `/tags/<tag>/atom.xml`, plus `/page/1/` and `/page/2/`. The sitemap lists 49 URLs. Keep all of them.
2. **Pushing `main` deploys.** `hugo.yaml` runs on every push to `main`. Pushing the staged migration now would replace the live Zola site with the interim bearcub build, which serves RSS at `/atom.xml`. The Pages source is still the `gh-pages` branch. Work on a branch until launch.
3. **Each post's history was split across two commits** (fixed in M0). `27256ac` added `content/posts/*` while `blog/content/*` still existed, and the staged change deletes the old files. `git log --follow` bridges the two only through copy detection. GitHub follows renames, not copies. Because `27256ac` is unpushed, folding the staged deletion into it records each post as a rename (similarity 86–96%).
4. **Hugo's link lookup can't fix two of the three broken links.** `/configure-nextcloud-nixos.md` and `/s3-object-storage.md` start with `/`, so Hugo looks them up from the content root, and they aren't there. `./nixos-impermanence.md` resolves only with page context (`.PageInner.GetPage`). Fix the two links in content, and write our own `render-link.html` that fails the build on an unresolved internal link.
5. **The two Hugo versions can't share templates.** `hugo.Data` exists from 0.156 only, and `site.Data` is deprecated from 0.156. Hugo warns 3 minor versions after a deprecation and errors after 15. The staged `includeFiles`/`excludeFiles` mounts already warn on 0.166. Pin the flake to CI's 0.166.0.
6. **The origin rule as written can hide a real edit.** "Use GitInfo unless its hash is a bulk commit" loses a real edit if a later bulk commit touches the file. Walk `.GitInfo.Ancestors` (0.148+) and skip bulk commits instead. Bulk hashes change under squash or rebase merges, so either merge bulk PRs with a merge commit, or mark them with a `Bulk: true` trailer and read it from `.GitInfo.Body`.
7. **CI's `--baseURL` override can change every feed id.** CI passes `--baseURL "${{ steps.pages.outputs.base_url }}/"`. If the custom domain isn't set when Pages switches to Actions, that becomes `mich-murphy.github.io/mich-murphy.com/`, every entry id changes, and subscribers get every post again. Drop the flag, or fail CI unless it equals `https://mich-murphy.com/`.

### Milestones

**M0 · Settle the git state (done 2026-09-27).** The user chose the recommended plan:
- The staged migration was amended into `27256ac`, which became `6f2b864`. Each post is now a rename, and `git log --follow --name-status -- content/posts/nixos-impermanence.md` shows `R087` at `6f2b864` and reaches back to the post's first commit.
- The channel edit is `2a2721c`, on its own, so its hash can go in `bulkCommits` or count as an update (see "Decisions": bulk).
- `docs/design/` is committed separately, after it.
- The build happens on the `theme` branch, with PRs against it. `main` stays unpushed until launch.
- `bulkCommits` starts with `6f2b864`, not `27256ac`.

**M1 · Clear the ground and pin Hugo (M; after M0).**
- **Remove.**
  - The `themes/hugo-bearcub` and `static/fonts` submodules (and `.git/modules/static/fonts`), then `.gitmodules`.
  - `LICENSE-monolisa.md` and `static/images/logo.png`.
  - The old `layouts/` overrides and `assets/{original,syntax}.css`.
- **`hugo.toml`.**
  - Drop `theme`, the module mounts, the bearcub params and the `copyright` quote.
  - Add `[taxonomies] tag = "tags"`, which also removes `/categories/`.
  - Set `timeZone`.
  - Set `lineNos = false` and drop `lineNumbersInTable`.
  - HTML-only `[outputs]` for now.
- **Elsewhere.**
  - Hugo 0.166.0 in `flake.nix`/`flake.lock`.
  - `hugo.yaml`: drop the TX02 submodule step and Dart Sass; add a `pull_request` trigger, with the deploy only on push to `main`.
  - README.
  - Remove the `menu` keys from the `_index.md` files.
  - Bare `baseof.html`, `home.html`, `page.html` and `list.html`, so every current URL still builds.
- **Done when.**
  - `hugo --gc --minify --cleanDestinationDir` builds with no WARN or ERROR, locally and on the PR.
  - `hugo version` matches in both places.
  - `public/` has the 17 posts, `/tags/` and its 26 terms, and no `/categories/` or font files.
  - Nothing references `TX02_DEPLOY_KEY`.

**M2 · The shell: head, header, footer, fonts, base CSS (M; after M1).**
- **Fonts.** Copy the 0xProto subsets (Regular, Bold, Italic) and `LICENSE-0xProto.txt` from `docs/design/fonts/` to `static/fonts/`. Keep Italic, because `encrypting-secrets-nixos` uses `_private_` and `_host_`.
- **`assets/css/main.css`.**
  - dark-first tokens, with light from `prefers-color-scheme`
  - the five sizes
  - links, focus and selection
  - frame, `.legend`, `.dz` with the mask as a data URI
  - `.vh`, header, nav marker and hit areas, footer
  - forced-colors and reduced-motion blocks
- **Head partial.**
  - charset, viewport, title
  - description from `summary`, canonical
  - two `theme-color` metas with `media`, `color-scheme`
  - a preload for Regular only
  - `<style>{{ (resources.Get … | minify).Content | safeCSS }}</style>`
- **Header.** Skip link, the inline Shadow stamp SVG, the name, and the nav with `aria-current`.
- **Footer.**
  - `© <first post year>-<now> Michael Murphy · github`, linking to github.com/mich-murphy (rev 12 `social=footer`)
  - build hash from `os.Getenv "HUGO_BUILD_SHA"`
  - a `__WEIGHT__` placeholder
  - `0 B js` and `atom.xml`
- Every page needs an h1. Home, the tags index, tag pages and 404 use a hidden one (`.vh`).
- **Done when.**
  - Every page has one `<style>`, no stylesheet link and no `<script>`.
  - Bold loads on a post with h3s and not on `zfs-useful-references`.
  - Both modes match the token table.
  - Forced colours keep the squares.
- **Check the minifier** leaves `@property`, `animation-timeline`, `scroll-target-group`, `:target-current`, `counter-reset: pct calc(var(--pct))`, `color-mix()` and zero-unit custom properties intact. Diff its output.

**M3 · CI gates (S; after M2).** Land these early so every later PR is measured.
- **`scripts/postbuild.sh`,** run by CI and locally. It:
  1. fails on any `<script` in `public/**/*.html` except `public/index.html`
  2. writes each page's `gzip -9` size into the fixed-width placeholder, then gzips again and rewrites once if the rounded value changed, since the number is part of what it measures. It writes the gzipped size of the page's script in place of `0 B js` on the one page that has one.
  3. fails any page over 14,336 bytes.
- **`hugo.yaml`.** Set `HUGO_BUILD_SHA: ${{ github.sha }}` and run the script after the build. Fix `--baseURL` (finding 7).
- **Done when.**
  - A throwaway `<script>` fails the PR.
  - The footer weight matches `gzip -9 -c f | wc -c` within 0.1 KB on 3 pages.
  - A 1 KB limit fails the build.
  - PRs build but don't deploy.

**M4 · Home and the Posts card (S; after M2).**
- **Create.**
  - `home.html`: hidden h1, the intro, the Posts card.
  - A `posts-card.html` partial, reused by 404 and search. It renders every post as a row with `data-t` (tags) and `data-y` (year). There's no count row and no `show all` (rev 14 `idx=all`).
- **`content/_index.md`.** A real title, the intro, and `aliases = ["/archive/", "/page/1/", "/page/2/"]`. Add `/about/` too if About is dropped. There is no `/posts/`: the live site never had it.
- **`content/posts/_index.md`.** `[build] render = "never"`: the section page isn't written, but its posts still render.
- Always select posts with `where site.RegularPages "Section" "posts"`. `RegularPages` also includes Feeds, About and Search.
- **Done when** `/` shows "Posts · 17" with 17 rows, the page has one dither, and the three aliases redirect to `/`.
- **Growth.** Every post is one row of about 150 B raw. Check the index against the 14 KB budget in M3 as posts are added; past a few hundred posts, revisit paging (rev 12's `pages`).

**M5 · Post page, heading and blockquote hooks (M; after M2).**
- **`page.html`.** The h1, `date · N min read · #tags`, the rule, the prose.
- **`render-heading.html`** writes the heading with its `{{ .Anchor }}` id and nothing else, since rev 11 picked `anchors=off`. The ids feed the Contents box and the search results. If anchors come back, it writes `<div class="hw lN"><hN id="…">…</hN><a class="ha" href="#…" aria-label="Link to section {{ .PlainText }}">#</a></div>`.
- **`render-blockquote.html`.** An alert becomes the callout, labelled with `.AlertTitle` or the title-cased `.AlertType`. A plain blockquote stays a blockquote.
- **Done when.**
  - The 70 heading ids (48 h2, 22 h3) match `.Fragments`.
  - The accessibility tree shows heading names without the `#`.

**M6 · Code blocks (M; after M5).**
- **`render-codeblock.html`.**
  - **Language names:** `nix→Nix`, `yaml→YAML`, `bash→Bash`, `json→JSON`, `txt→Text`.
  - **Path:** `.Attributes.file`, or a lifted first line matching `^(#|//) ?(\S*[/.]\S*)$`, which is exactly 25 of the 69 blocks. The lifted line is removed.
  - **Highlighting:** `transform.Highlight $code .Type (dict "noClasses" false "hl_inline" true)`, inside our own `<pre tabindex="0">`. `hl_inline` drops Chroma's per-line spans. `transform.HighlightCodeBlock` can't take modified code before 0.162.
  - **Counting:** use `.Page.Store.SetInMap "code" (string .Ordinal) $name`, so a re-render can't double-count.
- **`render-codeblock-mermaid.html`** is an `errorf` stub until the pipeline exists.
- **Chroma classes.**
  - comments `.c .c1 .ch .cm .cp .cpf .cs`
  - strings `.s .s1 .s2 .sa .sb .sc .sd .se .sh .si .sr .ss .sx .dl`

  The rev 10 list was missing `cpf`, `sa`, `sr` and `ss`.
- **Done when.**
  - There are 69 windows: 25 with a title bar, 44 with a label.
  - No path comment shows, and there are no line numbers.
  - Tab stops on each `<pre>`.
  - `nixos-anywhere-and-disko` passes M3.
  - A scratch mermaid fence fails the build.

**M7 · Content edits and the link hook (S; after M5, M6).** One commit, added to `bulkCommits`.
- **`render-link.html`.** Hugo's embedded hook (`.PageInner.GetPage`, then page resources, then global resources), plus `errorf` for an internal destination that doesn't resolve.
- **Notes.** The 7 `**Note**:` paragraphs become `> [!NOTE]`.
  - `nixos-tmpfs-installation`'s note sits mid-paragraph, so split that paragraph.
  - Decide whether the code block after `backup-solutions-nixos`' second note goes inside the callout.
- **Links.**
  - `restore-nextcloud-from-backup-nixos.md:35` → `/posts/configure-nextcloud-nixos.md`
  - `s3-object-storage-nixos.md:8` → `s3-object-storage.md`
  - keep `./nixos-impermanence.md`.
  - Optionally point the other 5 internal links at `.md` so the hook checks them. Three of them lack the trailing slash and cost a redirect.
- **Optional.**
  - `{file="docker-compose.yml"}` on the Plex post's YAML block.
  - The `/etc/nixos/secrets` tree in `encrypting-secrets-nixos` is fenced as `bash`; make it `txt`.
- **Done when.**
  - `grep -rn '\*\*Note' content` is empty.
  - There are 7 callouts.
  - No `href` ends in `.md`.
  - A temporary `[x](missing.md)` fails the build and names the file.

**M8 · Git origin and the colophon (M; after M6, M7).**
- **`hugo.toml`.** `enableGitInfo = true` and `params.bulkCommits`. CI already checks out with `fetch-depth: 0`.
- **`data/origin.toml`** holds the table in "Origin data for E1".
- **The origin partial** returns `{date, hash}`. It walks `.GitInfo`, then `.Ancestors`, skipping bulk commits by hash or by trailer. With nothing left, it falls back to `data/origin` by `.File.ContentBaseName`. The colophon, the feed's `<updated>` and the sitemap use it. Nothing reads `.Lastmod`, which GitInfo sets to the migration date for every post.
- **The colophon partial.** The source path as the linked label; `created`, `updated`, `commit` with `history`; then the words and code-block line from the Store map.
- **Words.** Count them from `.RawContent` with the fences removed. `.WordCount` includes code, and after M5 and M6 it also counts the `#` anchors and the title-bar text.
- **Done when.**
  - All 17 colophons match `data/origin.toml`.
  - A non-bulk test edit changes only that post.
  - A bulk commit on top of a real edit doesn't hide it.
  - On phones `history` wraps and the label clears the first line.

**M9 · Status line and Contents box (M; after M5).**
- **A partial** flattens `.Fragments.Headings` into document order. The tree's top level is one empty placeholder, because posts start at h2, with the h2s under it and the h3s under those. `Identifiers` is alphabetical, not document order. 5 heading titles contain `&`.
- **Render** only with 2+ headings. Breadcrumbs `h2 › h3`, the Contents list, and `--min` from `.ReadingTime`, because rev 14 kept the minutes left (`sline=rev13`). The post head gets an id (e.g. `id="top"`). An anchor to it goes first in the breadcrumb stack, with the title as its text, and an empty, visually hidden one goes first in the Contents list, so Chrome marks nothing before the first heading (Rev 14, "Found while building" 2).
- **CSS changes from the rail lab.**
  - Use `animation-timeline: scroll(root)`, not the lab's `scroll(nearest)`.
  - Give posts bottom padding so the fixed strip never covers the colophon, Older/Newer or the footer.
  - Cap the Contents box with `max-height` and `overflow: auto`.
  - Keep the `:target-current` rules separate.
  - Put the percentage (and the minutes, if kept) inside `@supports (animation-timeline:scroll())`, hidden otherwise. Outside it, Firefox shows a frozen `0% · 4 min left` for good (seen in Firefox 156; see Rev 14, "Found while building").
  - Give the post head an id and put its anchor first in the breadcrumb stack, or Chrome marks the first heading at the top of every post and the title never shows.
- **Where the `nav` goes in the DOM:** straight after the header (recommended), so keyboard users reach Contents before the post, or after `main`.
- **Done when.**
  - Chrome 140+ highlights the current section.
  - At the top of a post, Chrome shows the post title, not the first heading.
  - Safari 26 counts the percentage, not 0.
  - Firefox shows the title with no errors, and no percentage.
  - Tab reaches every Contents link.

**M10 · Older/Newer (S; after M8).** Take the neighbours by index from `(where site.RegularPages "Section" "posts").ByDate` (i−1 older, i+1 newer) rather than trusting `.Next`/`.Prev`, whose direction is easy to get backwards; check with one post. Draw rev 15's `file` (see "The design", Post page):
- `<nav class="pn pn-file" aria-label="Newer and older posts">` after the colophon, with up to two links, `‹ <name>` and `<name> ›`, where `<name>` is the neighbour's `.File.LogicalName`.
- Each link's `aria-label` names its post: `Older post: <title>, <name>`.
- No placeholder for a missing neighbour: newer has `margin-left:auto`, so it stays at the right.
- The post template adds a class (or the CSS uses `.pg:has(.pn-file)`) that drops the page's bottom padding to 28px.
- The lab's rules are under `/*pn:css*/`: `.pn`, `.site .pn .pw`, the `.pn-file` block and its `@container` block, which becomes `@media (max-width:600px)`.

Done when `syncing-plex-watch-state` shows only older, `s3-object-storage` only newer (at the right), `nixos-impermanence` shows `‹ systemd-services-and-timers-nixos.md` and `nixos-tmpfs-installation.md ›`, the links sit 32px under the colophon frame and 28px above the footer's rule, and at 390px they stack with no overflow.

**M11 · Search on the index (M; after M4, M5).** Replaces the tags index and tag pages (Rev 13).
- **`home.html`.**
  - The box, presented per `sbox` (picked `row`), inside `<search hidden>`. Add `search[hidden]{display:none}` (or a global `[hidden]{display:none!important}`): `.sb{display:flex}` beats the `hidden` attribute, so without it the box shows with no script behind it.
  - Search in its own plain frame above the Posts card (rev 14 `ilay=boxes`). Under the box, the two menus (rev 15 `filt=menus`), server-rendered as `:target` links so they work without the script. Rev 15 has the markup, the generated CSS and the no-script fix. Gate every no-script filter rule on `body:has(search[hidden])`, so a page loaded at `/#nixos` doesn't keep hiding posts after the script takes over (untested, but the script's `history.replaceState` shouldn't change what `:target` matches).
  - The hidden status paragraph.
  - One inline script. It unhides the box, fetches `/index.json` on first focus, runs the Rev 13 engine on the words and the menus' filters, re-renders the card's list, sets the menus' values, counts and `disabled`, closes a menu on a pick, a click outside or `Esc`, and handles `/`, `Esc`, `↓`, `Enter`, `?q=` and `#tag`.
- **The index.** `layouts/home.json.json` with `outputs.home = ["html", "atom", "json"]`. It's built from the sources the way `build-grep-index.py` does it: `os.ReadFile (printf "content/%s" .File.Path)`, find the closing `+++`, track fences, clean prose lines (`replaceRE` for links, emphasis, list and quote markers), kinds 0, 1 and 2, anchors from the flattened `.Fragments.Headings`, tags, and `jsonify (dict "noHTMLEscape" true)`. Check it against `docs/design/grep-index.json`.
- **Filter CSS** for the no-script path: one rule per tag and year, with year ids prefixed `y`.
- **`layouts/tags/term.html`.** A standalone meta-refresh page to `/#{{ .Data.Term }}`. Terms keep `outputs = ["html", "atom"]` so the feeds stay. `/tags/` redirects to `/`.
- **Post tag links** point at `/#<tag>`.
- **Done when.**
  - `tailscale` ranks the Nextcloud post first, with an excerpt line.
  - `#nixos backup` gives 4 posts, `imperm` 3, and `x` changes nothing.
  - `/` focuses the box, and `Esc` clears it.
  - `/#nixos` shows 11 posts with and without the script, the tag menu reads `tag: nixos`, and the label reads `Posts · 11 of 17`.
  - Picking `homelab` in the tag menu while `nixos` is set replaces it, `×` clears it, and `Esc` closes an open menu before it clears anything.
  - Without the script, an open menu pushes the list down rather than covering it, on desktop and at 390px.
  - `/tags/nixos/` lands there.
  - The 26 tag feeds still validate.
  - The index footer shows its script weight, and every other page has no script.
  - The index page stays under 14 KB, since the index JSON is a separate file.

**M12 · 404 (S; after M4).** `layouts/404.html`: the "404" box with one sentence (rev 11 `nf=box`), linking to search, then the Posts card. Every link must be root-relative, because the page is served at any missing path. Done when `public/404.html` exists and, after launch, `curl -sI https://mich-murphy.com/nope/` returns 404 with it.

**M13 · About (S; after M4).**
- `content/about.md` with `layout = "about"`, and `about.html`:
  - the bio
  - the Projects card from `data/projects.toml` (5 entries: name, url, desc)
  - the dithered "This site" box: source, `hugo.Version`, GitHub Pages, 0xProto, and "17 posts since 2022-11-29"
- Move `/about/` off the home aliases.
- If About is dropped, skip this: keep the alias on home, and the Projects card goes back to the index.

**M14 · Feeds page (S; after M2).**
- **`data/blogroll.toml`,** edited by hand (rev 12 `sync=quiet`): `[[feed]]` entries with `topic`, `name`, `url` and an optional `host`, plus a top-level `topics` array for the order. マリウス gets `host = "マリウス.com"`.
- **`feeds.html`.**
  - the Subscribe box
  - the intro
  - "Feeds I read · 10", with each host from `urls.Parse .url`, minus `www.`, unless `host` is set
- **`content/feeds/index.md`** keeps its intro, drops the list, and gets `layout = "feeds"`.
- **Done when** the page shows 4 topics and 10 links, and one click selects only the feed URL.

**M15 · Atom feed, sitemap, robots (M; after M8).**
- **`hugo.toml`.**
  - `[mediaTypes."application/atom+xml"] suffixes = ["xml"]`
  - `[outputFormats.atom]` with that media type, `baseName = "atom"`, `rel = "alternate"`, `noUgly = true`
  - delete `[outputFormats.rss]`
  - `outputs.home = ["html", "atom"]` and `outputs.term = ["html", "atom"]`
- **Templates.**
  - `home.atom.xml` and `term.atom.xml`, sharing one partial
  - `sitemap.xml` with `lastmod` from the origin partial
  - `robots.txt` with the Sitemap line
  - the head's `alternate` link
- **Feed content.**
  - The feed id stays `https://mich-murphy.com/atom.xml`, and each entry id is `.Permalink`. Both match the live Zola feed.
  - `published` is `.Date`; `updated` comes from origin.
  - Full content (if `feed=full`) via `{{ .Content | transform.XMLEscape | safeHTML }}`, with the `<a class="ha">` anchors removed and root-relative URLs made absolute.
  - Print the XML declaration with `safeHTML`.
  - Setting `updated` from origin changes it on about 12 entries (Zola used the publish date). A few readers may mark those as updated.
- **Done when.**
  - The W3C validator passes `/atom.xml` and one tag feed.
  - The sorted `<id>` list matches a copy of the live feed saved before launch.
  - The feed has 17 entries, posts only.
  - All 26 tag feeds exist, and there's no `index.xml`.
  - `nixos-impermanence`'s sitemap `lastmod` is 2023-02-24.

**M16 · Favicon set (S; after M1).** `favicon.svg` (the pixel map on a `bg` plate, with an internal dark `@media` block), a 32×32 `favicon.png` and a 180×180 `apple-touch-icon.png`. Keep the file at `/favicon.png`, where the live site serves it, and remove `static/images/`.

**M17 · Social cards (M; after M2; can follow launch).**
- **Font.** `assets/fonts/0xProto-Bold.ttf` from the 0xProto 2.502 release. `images.Text` needs TTF or OTF, not woff2.
- **Base image.** A pre-made 1200×630 `card-base.png`.
- **The og: and twitter: meta.**
- **Title wrapping.** `images.Text` has no width option: it wraps at the image width minus 20 minus `x`, and honours `\n`. Wrap in the template instead. 0xProto is monospace, so columns = ⌊box width ÷ (0.62 × size)⌋. Step the size 62 → 54 → 48 until the title fits 3 lines. At 62px in a ~984px box that's 25 columns, and both long titles fit in 3 lines.

**M18 · Print (S; after the visual milestones).**
- One `@media print` block, as in "Rev 11 pages".
- Use `a[href^="http"]::after{content:" <" attr(href) ">"}` for external links. The lab's `data-u` attribute exists only because its links point at `#`.
- A print-only `.purl` span in the header.
- The first thing to cut if the date matters.

**M19 · Verify and launch (M; after everything).**
- **Checks.**
  - Phone at 390px, light mode, forced colours, and a full keyboard pass.
  - The M3 budget table.
  - All 49 live sitemap URLs, `/atom.xml` and the 26 tag feeds exist in `public/`, as pages, aliases or (for tag pages) redirect pages.
  - Feed ids match.
- **Launch.**
  - Settings → Pages → Source → GitHub Actions. The domain lives in settings; `CNAME` is ignored.
  - Merge `theme` into `main`.
  - Recheck the 404, aliases, commit and history links, and the live feed.
  - Open `github.com/mich-murphy/mich-murphy.com/commits/main/content/posts/nixos-impermanence.md` and check it reaches back into `blog/content/`. If not, also link `commits/1d1b39a/blog/content/<file>`.
  - Later, delete the `gh-pages` branch. The `TX02_DEPLOY_KEY` secret is already gone from the repo's secrets (checked 2026-09-28); its public half may still be a deploy key on the private `TX-02` repo.

### Deferred

### Budget

The largest post body is 4.0 KB gzipped today (measured). The picked CSS is roughly 14.5 KB raw and 3.9 KB gzipped (an estimate, before simplifying selectors). With about 1 KB for the head, status line and colophon, the largest post lands near 9 KB of the 14 KB. Measure in M2 and M6.

### Rev 12 sources

- **Filters, counters and accessibility.**
  - `:has()` support: https://caniuse.com/css-has.
  - The Safari `:has(:target)` invalidation fix: https://bugs.webkit.org/show_bug.cgi?id=240329.
  - The WPT test: https://wpt.fyi/results/css/selectors/invalidation/target-pseudo-in-has.html.
  - Counters and `display:none`: https://drafts.csswg.org/css-lists-3/#counters-without-boxes.
  - Scrolling to a fragment: https://html.spec.whatwg.org/multipage/browsing-the-web.html#scroll-to-the-fragment-identifier.
  - Alt text in `content`: https://caniuse.com/mdn-css_properties_content_alt_text.
  - Live regions: https://tetralogical.com/blog/2024/05/01/why-are-my-live-regions-not-working/.
- **Meta refresh keeps the fragment:** https://html.spec.whatwg.org/multipage/semantics.html#shared-declarative-refresh-steps.
- **Grep index and search page.**
  - Hugo `os.ReadFile`: https://gohugo.io/functions/os/readfile/. `.Fragments`: https://gohugo.io/methods/page/fragments/.
  - GitHub `?plain=1` links: https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/creating-a-permanent-link-to-a-code-snippet.
  - Pagefind, compared: about 146 to 174 KB compressed on the first query, no line numbers. https://pagefind.app/docs/sub-results/.
  - `<search>`: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/search.
- **Miniflux.**
  - The API: https://miniflux.app/docs/api.html.
  - The feed model, whose fields include credentials: https://github.com/miniflux/v2/blob/main/internal/model/feed.go.
  - API keys have no scopes: https://github.com/miniflux/v2/blob/main/internal/model/api_key.go.
- **GitHub.**
  - Pushes made with `GITHUB_TOKEN` don't trigger workflows: https://docs.github.com/en/actions/concepts/security/github_token.
  - The Contents API: https://docs.github.com/en/rest/repos/contents#create-or-update-file-contents.
  - Scheduled workflows are disabled after 60 days: https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule.
- **Hugo.**
  - `GetRemote` caching: https://gohugo.io/configuration/caches/.
  - The URL policy that rejects tailnet addresses: https://gohugo.io/configuration/security/.
  - `hugo.Data`: https://gohugo.io/functions/hugo/data/.

### Sources for the Hugo and GitHub details

- `images.Text`: https://gohugo.io/functions/images/text/, `resources/images/text.go`.
- Link hooks: https://gohugo.io/render-hooks/links/, the embedded `_markup/render-link.html`, `hugolib/pagecollections.go`.
- Alerts: 0.132.0 (`.AlertType`) and 0.134.0 (`.AlertTitle`); https://gohugo.io/render-hooks/blockquotes/.
- `.Fragments`: `markup/tableofcontents/tableofcontents.go`. `.Store` timing: https://gohugo.io/methods/page/store/.
- Output formats: https://gohugo.io/configuration/output-formats/. GitInfo: https://gohugo.io/methods/page/gitinfo/, `Ancestors` in 0.148.0.
- GitHub history across renames: https://github.blog/changelog/2022-06-06-view-commit-history-across-file-renames-and-moves/.
- The 0.152/0.166 differences come from the release notes: `LanguageCode` deprecated in 0.158, `return` outside a partial is an error in 0.166.0, `.NextPage`/`.PrevPage` removed in 0.156.

## Rev 11 pages

Designed in the lab (rev 11). The user's picks are at the top of each item; the other options stay in the lab under "Every switch". Rev 12 replaces the tags index and tag pages with search, and moves Projects to About. Every page keeps exactly one dithered box. Pages that are a list (home, the tags index, a tag's page and `/posts/`) are titled by their card's label and carry a visually hidden `h1` (`.vh`). Pages with prose (About, Feeds) use the post head (`.ph.bare`: the 24px h1 and the 1px `fg` rule, with no meta line).

- **Keyed box** (`.kv`, new). The colophon's grid, reused: a heavy frame with a cut-in label, keys in `mute` in a max-content column, values in `fg`, 13.5px. It's used by the 404 status, About's "This site" and Feeds' "Subscribe". 74ch wide on prose pages. On the 404 page it takes the Posts card's full width.
- **Tags index** (`tagsidx`, picked `rows`). Rev 12's search replaces this page; the tag counts live on as filters.
  - `split`: one "Tags · 26" card with the dither. The 6 tags with 2+ posts get the Posts card's rows (tag link on the left, `11 posts` on the right in `mute`, no underline until hover), sorted by count then name. Under a dotted rule, one line keyed `1 post each` holds the other 20 alphabetically. The singletons sit inside the card so the label's 26 is true; the review's version had them outside.
  - `rows`: all 26 as rows. `inline`: all 26 in one flowing list, each followed by its count in `mute`.
- **A tag's page** (`term`, picked `label`). Rev 12 turns these pages into redirects to the filtered search. `label`: the Posts card labelled `#nixos · 11` and nothing else, like home, with the dither. `title`: the post head with `#nixos` and a meta line (`11 posts · first 2022-12-14 · latest 2024-04-02`; `1 post · 2023-03-06` for a single post), then a "Posts · 11" card. 20 of the 26 tag pages have one post.
- **404** (`nf`, picked `box`; rev 12 swaps "tags has them by topic" for a link to search). The Posts card, with the page's dither, sits under a plain box labelled `404`. In `keyed` the box holds `status 404 not found`, `posts all 17 are listed below` and `tags by topic at /tags/`. `box` has one sentence instead: "Nothing lives at this address. If you followed a link here, it may have a typo. Every post is listed below, and tags has them by topic." `bare` uses the post head, "Not found", with the meta line `404 · nothing lives at this address · every post is listed below`. GitHub Pages serves the same `404.html` for every missing path, so without JS the page can't say which address was asked for. No option pretends to.
- **About** (`about`, picked `site`; rev 12 adds the Projects card). The bio moves to `content/about.md` at `/about/`, and the `/about/` alias comes off `content/_index.md`. The bio is the same two sentences as the home intro.
  - `site`: bio, then a "This site" keyed box with the dither: `source mich-murphy/mich-murphy.com` (linked), `built Hugo <hugo.Version> on GitHub Actions`, `hosted GitHub Pages`, `type 0xProto 2.502 by 0xType, SIL Open Font License`, `posts 17 since 2022-11-29`. All of it comes from the build, so none of it goes stale.
  - `bio`: the bio alone. `none`: no page; `/about/` redirects home and the nav becomes `posts tags feeds`.
  - There are no contact or elsewhere links; the user hasn't been asked whether they want any.
- **Feeds** (`feeds`, picked `card`; rev 12 adds the Miniflux sync). The repo already has `content/feeds/index.md`: a Miniflux blogroll, 10 feeds in 4 topics (Data, Development, Self Hosting, Technology). The previous handover missed it, so the page now does two jobs.
  - `card`: the post head "Feeds"; a "Subscribe" keyed box with the dither: `feed https://mich-murphy.com/atom.xml` (a `code.url` with `user-select:all`, so one click selects it), `format Atom 1.0, full post text` and `posts 17, newest 2024-04-08`. Then the page's intro paragraphs, then a plain "Feeds I read · 10" card: a `dl` keyed by topic in lowercase, each feed's name linked on the left and its host in `mute` on the right. On phones the key goes above its group and the host under each name. The blogroll moves to `data/blogroll.toml` (topic, name, url, optional display host, because マリウス's host is the punycode `xn--gckvb8fzb.com`; display it as `マリウス.com`). 0xProto has no kana, so that name falls back to a system font.
  - `plain`: the address in a sentence (`code.url` on the code background), then the page as written, with its h3 topics and square bullets. No dither.
- **Feed in the nav** (`navfeed`, picked `feeds`). `feeds`: the nav reads `posts tags about feeds` and goes to the page, and the footer's `atom.xml` links to the feed file. `atom`: the nav keeps the label `atom.xml` but opens the page.
- **Feed file** (`feed`, picked `full`). The live Zola feed is already Atom with full text. `full` keeps that. `summary` is Atom with the front-matter summary. `rss` is Hugo's default RSS 2.0, which only the unreleased Hugo build has made; it would change the format under subscribers. In both Atom options the feed id and entry ids match the live feed exactly (see M15), and `<updated>` comes from the origin partial. The Subscribe box also lists the per-tag feeds, `/tags/<tag>/atom.xml`.
- **Older/Newer** (`pn`, picked `split`; rev 12 offers other designs). Under the colophon, in the Posts card's order (newer first). The newest post shows only `older`, the oldest only `newer`. None has the dither.
  - `keyed`: an unframed grid (`max-content 1fr auto`, rows on `subgrid`): key in `mute` 13.5px, title link at 15px, date in `mute` 13.5px tabular, right-aligned. A dotted rule separates the rows. `padding-inline:20px` (the colophon's 2px border plus 18px padding) lines the keys up with the colophon's keys. On phones the date drops under the title.
  - `boxed`: the same rows in a plain frame labelled "More posts". `split`: two columns, newer on the left and older on the right (right-aligned), each with the key above the title and the date under it; stacks on phones.
- **Heading anchors** (`anchors`, picked `off`). Headings keep their ids for the Contents box and search results. The spec below is kept in case the pick changes. `render-heading.html` writes `<div class="hw l2"><h2 id="…">Text</h2><a class="ha" href="#…" aria-label="Link to section Text">#</a></div>`. The link is the heading's sibling, not its child, so the heading's accessible name stays "Text". `.ha` is absolute, `right:100%`, at the heading's own size and line-height (19px/1.35 for h2, 1em/1.4 for h3) so the baselines match, in `mute` and turning `fg` on hover without inversion. `hover`: opacity 0 until `.hw:hover` or `.ha:focus-visible`. `always`: always shown. `off`: no wrapper. Headings get `scroll-margin-top:24px`. On phones the padding drops to 3px so the `#` fits the 16px gutter.
- **What `/posts/` is** (`posts`, picked `home`; the user then said `/posts/` can go). Home is the index and `/posts/` doesn't exist. The live site never had it, so it needs no redirect. `/archive/` redirects to `/`, and "posts" in the nav links to `/` and is current on home and every post. `latest`: home shows a "Latest · 6" card whose last row links to "all 17 posts", and `/posts/` shows "Posts · 17" with a 12px `mute` year label and a 1px `line` rule at each year, inside the card.
- **Nav current marker.** `posts` on home (when home is the index), `/posts/` and every post; `tags` on the tags index and tag pages; `about`; `feeds`; nothing on 404.
- **Print** (`@media print`, no choice needed): the light palette with `--bg:#fff` and `--code:#fff`, and body text at full `fg`. It hides the nav, status line, Older/Newer, anchors, mermaid source toggles and the footer's right half, and drops the dither. Code uses `white-space:pre-wrap` with no scroll-hint gradients. Title bars get `bg` with `fg` text, because printers drop backgrounds and the inverted bar would print white on white. External prose links print ` <url>` after them in 12px `mute`. The header shows the page's canonical URL (a print-only `span.purl` written by the template) where the nav was. `break-after:avoid` on headings and `break-inside:avoid` on code, callouts and the colophon.

## Rev 12

Designed in the lab (rev 12) and picked: `idx=more search=grep projects=about social=footer sync=quiet`, with search on the index (see Rev 13). The unpicked options stay in the lab under "Every switch". The findings from two research passes on 2026-09-27 are folded in, with sources in "Rev 12 sources".

- **The index as it grows** (`idx`, picked `more`; rev 14 changed it to `all`, because the search box does the narrowing).
  - `more`: the Posts card shows the 10 newest. Rows 11+ carry `class="older"` and `display:none`. The card's last row, above a dotted rule, reads `showing 10 of 17` on the left and `show all` on the right.
    - The count is a CSS counter: `counter-reset:shown` on the frame, `counter-increment:shown` on each row, and `counter(shown)` in the count, which sits after the list. CSS Lists 3 says a `display:none` element doesn't increment a counter, so the count follows any filter.
    - `show all` is `<a href="#all">`. `:has(#all:target)`, or any filter target, shows the older rows and hides the link.
  - `pages`: 10 a page, with the pager as the card's last row: `‹ newer`, then `1–10 of 17` in `mute` (like less's `lines 1-10/17`), then `older ›`. Page 2 is `/page/2/`, which the Zola site already serves. It doesn't mix with filters on the index, because a filter only sees its own page.
  - `years`: all posts, under a 12px `mute` year label and a `line` rule per year.
  - `all`: the rev 10 card.
- **Search** (`search`, picked `grep`; Rev 13 moves it onto the index and rebuilds the engine). It replaces the tags index, the tag pages and `/posts/`.
  - **`grep`: full-text search.** The box is a framed form labelled "Search" that reads as a command: `grep -i "` in `mute`, the input, then `"` and ` posts/` in `mute`. The ` posts/` part is dropped on phones. Where `field-sizing: content` is supported, the input sizes to its text, so the line reads exactly `grep -i "tailscale" posts/`. The placeholder is `nextcloud`.
    - **Results** replace the Posts card once the query is 2 or more characters. They're a dithered card labelled `Matches · N`, grouped by post in date order, with a dotted rule between posts.
    - **Each group** has the post title (a link) and its date, then at most 3 lines at 13.5px: the line number in `mute`, then the line.
    - **The line number** links to the source at GitHub: `blob/<GitInfo hash>/content/posts/<slug>.md?plain=1#L<n>`. `?plain=1` is needed, or GitHub opens the rendered Markdown.
    - **The line** links to the post at the nearest heading above it.
    - **Each line** is trimmed and cut so the first match stays in view: if the match starts past column 36, the line starts 24 characters before it with a `…`. Matches are marked with `mark` in the selection colours (`acc` on `on`). `+ N more in this post` follows a group of more than 3 lines.
    - **The last row** reads `5 lines in 3 of 17 posts`. With no matches: `No line in any post contains "x".`
    - **The index** covers every line of the Markdown sources: 1,127 lines, 31 KB gzipped (20 KB without code blocks). The page fetches it on the first keystroke. The lab measures the script at about 1 KB gzipped.
    - **Hugo builds the index** as a JSON output of the search page (`outputs = ["html", "json"]`, template `search.json.json`).
      - It reads each source with `os.ReadFile (printf "content/%s" .File.Path)` and finds the closing `+++` itself. `.RawContent` starts one line after the front matter, so it gives no reliable offset. Guard the read with `os.FileExists`.
      - Anchors come from flattening `.Fragments.Headings` in document order. `.Fragments.Identifiers` is alphabetical, and using it gave wrong anchors in 15 of 17 posts. Watch for ids like `nixos-anywhere--disko`.
      - Write it with `jsonify (dict "noHTMLEscape" true)`, and start the slice with `slice $row`.
      - A prototype produced an index identical to `grep-index.json`.
    - **Matching.** Results search the Markdown as written, so a link's URL can match. That's what grep does, and the line number points at that source.
    - **Without JavaScript** the box is hidden, and the page still lists and filters every post. The footer of the page carrying the script says `1.0 KB js` in place of `0 B js`, and CI allows a `<script>` on `/search/` only.
  - **`facets`: tags and years with no script.** A keyed block at the top of the Posts card: `year` (`all`, `2024 4`, `2023 10`, `2022 3`) and `tag` (all 26, by count, then name), at 13.5px with counts in `mute`.
    - **Markup.** Each chip is `<a href="#nixos">`. Its target is a hidden `<i id="nixos" hidden></i>` just before the list, so fragment navigation doesn't scroll the page. Pointing at the chip itself jumped from 300px to 678px in testing, and the chips scrolled away. Tested in Chrome only.
    - **Year ids** need a prefix (`y2023`): `#2023` isn't a valid selector, and Chrome dropped the rule.
    - **CSS.** One rule per tag and per year (60 rules, 646 B gzipped): `.idx:has(#nixos:target) .tr:not([data-t~="nixos"]){display:none}`. Rows carry `data-t` and `data-y`.
    - **The current filter** gets the 7px square, like the nav, as `content:""; content:"" / "current filter, "`. The alt text names it for screen readers, because CSS can't set `aria-current`. The first declaration is the fallback for browsers without alt text.
    - **"all"** is current when nothing is targeted.
    - **Accessibility.** Filtering isn't announced, and the count isn't a live region: screen readers don't announce CSS content changes. Hidden rows leave the accessibility tree, and the counter text is exposed and updates.
    - **Behaviour.** Back, forward and reload reapply the filter. Browsers without `:has()` show every post.
  - **Tag URLs.** Post tag links go to `/search/#<tag>`, or `/#<tag>` if search lives on the index.
    - `layouts/tags/term.html` becomes a standalone redirect page: a 0-second meta refresh to `/search/#{{ .Data.Term }}` (not `.Title`, which is title-cased), a canonical link, `noindex`, and a visible link. Aliases can't carry a per-tag fragment. The fragment survives the meta refresh, and in Chrome the redirect page wasn't left in history.
    - Terms keep their `atom` output, so the 26 tag feeds stay. `/tags/` redirects to `/search/`.
- **Where search lives** (`where`, picked `page`, then the user asked for the index; the lab carries `home`).
  - `page`: `/search/`, with the nav `posts search about feeds`.
  - `home`: the box and the filters sit on the index above the Posts card. The index then carries the script, and `/search/` doesn't exist.
  - `prompt`: a `grep` box in every header, a plain `<form action="/search/" method="get">` with `name="q"`, so those pages stay script-free. It was drawn first as vim's `/`, but a `/` hotkey needs a script on every page, so the `/` would have been a false cue.
  - The search page reads `?q=` (a GET form sends spaces as `+`, which `URLSearchParams` decodes). Wrap the form in `<search>`, which has been supported since Chrome, Edge and Firefox 118 and Safari 17.
- **Projects** (`projects`, picked `about`). `about`: the Projects card moves to About, between the bio and "This site", which keeps the dither. `home`: it stays on the index.
- **GitHub link** (`social`, picked `footer`).
  - `legend`: `github.com/mich-murphy` is a second cut-in label on the Projects card, at the top right (`.legend.r{left:auto;right:12px}`), linked.
  - `line`: a keyed 13.5px line under the bio.
  - `footer`: ` · github` after the copyright on every page.
  - `box`: an "Elsewhere" keyed box with one row.
- **Feeds sync** (`sync`, picked `quiet`; the user chose a hand-edited list, so none of this is built. Kept for reference). `stamp` adds a last row to the "Feeds I read" card: `updated 2026-09-27 from Miniflux · blogroll.opml`. `quiet` leaves it out. The mechanism (Build scope M14 and M20):
  - **Data.** `data/blogroll/synced.json` holds `{"updated": "…", "feeds": [{"title", "site_url", "feed_url", "topic"}]}`. `data/blogroll/overrides.toml` is edited by hand. It has `topics = [...]` for the topic order, then `[[feed]]` entries keyed by `feed_url`, each with any of `title`, `host`, `topic` and `hide`; an entry with no match is added as a new feed.
    - Read both through `hugo.Data.blogroll`. A merge partial returns the feeds and topics to both the page and the OPML file.
    - The host is `(urls.Parse .site_url).Host` without `www.`, unless `host` overrides it. The one punycode host, `xn--gckvb8fzb.com`, displays as `マリウス.com`.
  - **Sync.** A script on the Miniflux host, run by a NixOS `oneshot` service and a daily timer, or as a command the user runs:
    - It calls `GET /v1/feeds` with `X-Auth-Token`.
    - It keeps only an allowlist of exact category titles (Data, Development, Self Hosting, Technology), so private feeds never leave the host. It also drops disabled feeds and feeds with a username, password or cookie.
    - It keeps only `title`, `site_url`, `feed_url` and the topic. The raw response includes credentials, so it never commits it.
    - If the list changed, it commits `synced.json` through the GitHub Contents API with a fine-grained token for this repo (Contents: write). A token commit triggers the `on: push` deploy.
  - **What the stamp's date means.** `updated` changes only when the list does, so the stamp says "updated", not "synced".
  - **The OPML file.** `/feeds/blogroll.opml` needs a `text/x-opml` media type, an `opml` output format with `baseName = "blogroll"` and `notAlternative = true`, and `outputs = ["html", "opml"]` on the Feeds page.
  - **Costs.**
    - Miniflux API keys have no scopes, so the key has full access to the account. Keep it in sops or agenix.
    - The repo is public, so hiding a feed in the overrides file still leaves its URL in git.
    - It's 10 feeds that change a few times a year.
    - Don't turn the timer on before launch: a push to `main` deploys.
  - **Alternatives rejected.**
    - A GitHub Actions cron: `GITHUB_TOKEN` pushes don't trigger `on: push`, it needs Tailscale to reach a tailnet host, and scheduled runs are disabled after 60 days of inactivity.
    - Hugo `resources.GetRemote`: its cache never expires by default and would hold the raw response with credentials, and Hugo refuses tailnet addresses unless the URL policy is loosened.
- **Older/Newer** (`pn`, picked `graph`, then asked for less on show; see Rev 13). Under the colophon, `padding-inline:20px` so it lines up with the colophon's keys. No dither.
  - `graph`: a small `git log --graph`. It's a grid of four columns: the key (`newer`, `this post`, `older`) right-aligned in `mute`, a 7px node column, the title, and the date in `mute`.
    - **Nodes.** The neighbours' nodes are hollow (1px `fg` border on `bg`). This post's node is filled `fg`, and its title is in `fg`, unlinked, with `aria-current="page"`.
    - **The line.** A 1px `mute` line joins the nodes. It carries on, dotted for 12px, above the newer node when there are posts newer still, and below the older node when there are older ones. Otherwise it stops at the node, so the drawing shows where the post sits in the history. The newest post starts at its own node.
    - **Phones.** The date drops under the title, and the node cell spans both rows so the line doesn't break.
  - `diff`: `--- older` then `+++ newer` (markers in `mute`, keys, title, date).
  - `pager`: `‹ older` at the left and `newer ›` at the right, each with its title and date under it, and `post 5 of 17` (counted from the oldest) in the middle. On phones the position goes on top.
  - `split`: the rev 11 pick.

## Rev 13

Search on the index, and a quieter Older/Newer. Picked: `sbox=row pn=pg`. The search engine itself isn't a choice: it's what the lab runs.

- **The idea.** The Posts card is the result list. As you type, it narrows to the posts that match, marks the words in their titles, and shows under a row the line that matched when a word isn't in the title. That line is 13.5px, one line, ellipsised, prefixed with a muted `└`, and links to the post at that section. No separate results page or card.
- **Engine** (in the lab between `/*js:start*/` markers; about 2.2 KB gzipped measured crudely, so a real minifier gives less). It runs over the line index, loaded when the box first gets focus.
  - **The query.** Words, `"phrases"`, `#tag` (a tag starting with it) and years (`19xx`/`20xx`). Every part must match.
  - **How words match.** From the start of a word, case-insensitive, Unicode-aware (`(?<![\p{L}\p{N}])word`, flags `iu`). So `imperm` finds impermanence and `rsa` finds `ssh_host_rsa_key`, but `sy` doesn't find "easy". A single character is ignored until a second is typed. There's no fuzzy matching.
  - **Ranking.** Each word scores by where it's found: title 8, tag 6, heading 4, prose 2, code 1. Each word also adds 0.2 per matching line, up to 5 lines. Ties go to the newer post. Without words (only tags or years), the list keeps date order.
  - **The excerpt** is the line holding the most words, then the heaviest kind. It's shown only when the title lacks a word. It starts 20 characters before the first match when that match is past column 30.
  - **Speed.** Measured in Node over the real index, 200 runs each: 0.02 to 0.07 ms per query (`tailscale` 3 posts, `nextcloud backup` 3, `#nixos backup` 4, `2023 zfs` 1, `imperm` 3, `rsa` 2).
- **The index.** `build-grep-index.py` now writes `[line, text, anchor, kind]` rows and each post's tags (`g`).
  - Prose lines are cleaned to what a reader sees: link text without the URL, no `**`, list and quote markers dropped, `> [!NOTE]` skipped.
  - Headings are stored without their `#`s. Code lines stay raw.
  - 28.8 KB gzipped with code, 17.7 KB without. Hugo builds the same file (Build scope, M11).
- **Suggestions.** A 13.5px line under the box, `try` in `mute` then links with counts. With the box empty, it offers the six busiest tags and the three years. While the last word starts with `#`, it offers up to 8 tags with that prefix under the key `tags`. Clicking one completes the `#word` or adds itself to the query.
  - Each link is `<a href="#nixos">` (years `#y2023`), so without a script they still filter the list through `:target` (Rev 12 facets).
- **Keys.**
  - `/` focuses the box: the index has the script, so the `/` key hint is true there. It's shown as a `kbd` (12px, 1px `edge` border) until the box has focus or text.
  - `Esc` clears, `↓` moves to the first result, `Enter` opens it.
  - A visually hidden `role="status"` paragraph announces "N posts match".
- **Addresses.** Typing updates `/?q=…` through `history.replaceState`. A query that is only a tag reads as `/#nixos`. Tag links on posts, and the `/tags/<tag>/` redirect pages, go to `/#<tag>`, and the script puts `#<tag>` in the box. On phones (`pointer:coarse`) the input is 16px so iOS doesn't zoom.
- **Without a script.** The box ships hidden and the script reveals it. The list shows the 10 newest and "show all", and `#tag` targets filter it with CSS.
- **Cost.** The index page's footer shows its script weight instead of `0 B js`. The index loads on first focus. Every other page has no script.
- **Libraries compared** (gzipped, measured from jsDelivr). FlexSearch (light) 2.8 KB, MiniSearch 6.0 KB, Lunr 8.2 KB, Fuse.js 8.9 KB, Pagefind about 150 KB on the first query. They add typo tolerance and stemming, but none returns the matching line. Revisit MiniSearch past a few hundred posts.
- **The search box** (`sbox`, picked `row`). All four filter the card in place and share the suggestions line.
  - `row` (picked): the card's first row, above a dotted rule. fzf's `>` prompt in `mute`, the input, then the `/` key hint, or the `3/17` counter while there's a query.
  - `border`: the box is cut into the card's top border at the right, like a second legend (12px), with the `/` key hint. The label reads `Posts · 11 of 17` while searching. It's the quietest, but easy to miss, and on phones it grows to 16px.
  - `less`: the box goes on the card's last line after less's `/` prompt, below "showing 10 of 17".
  - `plain`: a field above the card with a 1px underline and the key hint, and no other cue.
- **Older/Newer** (`pn`, picked `pg`). Only the words `older` and `newer` show, in `mute`, 13.5px, underlined on hover. Each is a link with `aria-label="Older post: <title>"`.
  - **Captions.** The title and date appear as a 12px `mute` caption under the line only on `:hover` or `:focus-visible`: older's on the left, newer's on the right. The nav keeps `padding-bottom: 2em` for it, so nothing moves.
  - `line`: `older` then a small timeline then `newer`. Oldest is on the left. The timeline runs: a dotted 2.5ch start when there are older posts beyond, a hollow node, a 4ch 1px `mute` segment, the filled node for this post, a segment, a hollow node, and a dotted end when there are newer posts beyond. Nodes are 7px squares: hollow is a 1px `fg` border on `bg`, filled is `fg`. The newest post has no newer half and no `newer` word.
  - `strip`: every post as a node, oldest first, grouped under 12px `mute` year labels, like a contribution graph. Hollow nodes have `mute` borders. The strip wraps between the two words. Nodes are links for a pointer (`tabindex=-1`, with captions); the keyboard steps with older and newer.
  - `pg` (picked): `‹ older  5 / 17  newer ›`, with the position counted from the oldest. Rev 14 spreads it across the text column: a grid of `minmax(0,1fr) auto minmax(0,1fr)`, older `justify-self:start` in column 1, the position in column 2, newer `justify-self:end` in column 3, so the position stays centred when a post has only one neighbour. The nav keeps the body size (`font-size:inherit`) so its `max-width:74ch` matches the colophon's; only the words and the position drop to 13.5px. No side padding: older's left edge and newer's right edge meet the colophon frame's edges (measured equal in the lab). Captions sit under their own word, older's from the left edge and newer's from the right, each capped at `calc(50% - 5ch)`.
  - `graph`: rev 12's, with titles and dates.

## Rev 14

The user's notes with the rev 13 picks, and what the lab does with them. Picked: `ilay=boxes sline=rev13`. Two subagents worked on copies of the lab in parallel, and the copies were merged 3-way (one conflict, where the two decision entries touch).

- **Older/Newer spread** (done, no choice): see Rev 13, `pg`.
- **The index** (`ilay`, picked `boxes`). Every option keeps rev 13's row (`>`, the box, the `/` hint or `3/17`). The `try` line becomes two keyed rows, `tags` (the 6 busiest, or completions while a `#word` is typed) and `years`, with the keys in `mute` like the colophon's. Unlike rev 13, the rows stay while you type, so the list doesn't jump at the first key. A tag or year that's in the query gets the nav's 7px square, and clicking it again takes it out. Without a script, `:target` marks it (one selector per tag and year, e.g. `body:has(#nixos:target) .fz a[href="#nixos"]::before`, 29 more next to the filter rules).
  - `band` (recommended): the two rows on the `--code` ground from border to border, with a solid `edge` rule above and below; the dotted post rows start after it. It's the smallest change that separates all four, and without a script the band tops the card.
  - `fzf`: fzf's own layout (checked against fzf 0.74.4's man page). Under the box, fzf's info line: the `3/17` count at the left end of a solid rule. The filters sit where fzf puts its header, lined up with the query, closed off by a second rule as `--header-border=line` draws it. Rev 13's row is fzf's `--info=inline-right`.
  - `boxes`: search gets its own plain frame labelled "Search" (the row and the filters), above the dithered Posts card, which holds only the posts, as fzf's `--input-border`/`--input-label`. About 40px more before the first post.
  - `panes`: ranger/mc columns. The box spans the card; below it a 17ch pane lists years then tags with counts at the right, and the posts fill the other pane. Collapses to the two rows at 600px and below. Long titles wrap to two lines on desktop.
  - `tabs`: the years are cut into the card's top border opposite "Posts · 17", like vim's tabline; the tags keep one row under the box.
  - `rev13`: today's card, for comparison. It renders byte-identical to rev 13.
  - **Script.** `hints()` returns `fz()`, which ends with "no tag starts with …" when a `#` prefix matches nothing, and `addTok()` toggles. The lab prints 2.4 KB (both branches); a `band`-only script measures 2,265 B gzipped.
  - **CSS.** All five add 67 lines (1.8 KB gzipped in the lab). `band` alone is about 0.6 KB gzipped and replaces rev 13's `.sh` rules. When a no-script filter hides the first rows, `.tr+.tr` would draw a dotted rule under the band's solid one: `.il .slist>ol{clip-path:inset(1px -12px -12px)}` fixes it.
  - **Gap, also in rev 13:** after a no-script filter there's no link back to the full list except Back. Rev 12's facets had an `all` chip.
- **The status line** (`sline`, picked `rev13`: no change; the three options below stay in the lab under "Every switch"). All three new options drop the minutes left and show vim's ruler words: the percentage reads `Top` at the very start and `Bot` at the end (discrete `content` in the scroll-driven keyframes; `Top` below 0.1%, `Bot` from 99.9%). The post head is an anchor in the breadcrumb stack, so Chrome shows the title until the first heading; the Contents list gets the same anchor, empty and hidden, so nothing is marked at the top. A position stack shows the current heading's place, `2/3` (n counts h2 and h3 together, like "Contents · N"), with `-/3` where the section can't be detected. New segments are `aria-hidden`. Text on the bands is `fg` (on `line` 10.9:1 dark, 13.6:1 light; on `edge` 7.5:1 / 8.7:1; inverted 14.5:1 / 17.1:1). `mute` on `line` fails in light (4.21:1), so `mute` text only sits on `bg`. In forced colours the blocks get a 1px `CanvasText` outline. No overflow at 390px.
  - `ends` (recommended): two flat bands on `--line`, the source file (`nixos-impermanence.md`) at the left and the percentage at the right, with `2/3` in `mute` before the right band. It reads as lualine, and both bands hold data the page already has. No new colour.
  - `ruler`: today's plain strip; the minutes become `2/3` and the percentage. No fills.
  - `lualine`: the fuller homage. The file in an inverted `fg` block (on this site, inverted means a file), a small SVG branch glyph and `main` on a `line` band, the breadcrumb, `utf-8` in `mute`, the percentage on a `line` band, and `33:1` on an `edge` block: the line and column where the current heading starts in the Markdown source. Headings always start at column 1, so the `:1` is true but constant. Segments drop by width: `utf-8` under 900px, the branch under 720px, the file at 600px and below. A `markdown` filetype segment was tried and dropped: it repeated the `.md` and pushed crumbs into truncation. With the three slugs of 33+ characters, the crumb gets about 31ch at 772px.
  - `rev13`: today's strip, with the minutes. Pixel-identical to rev 13.
  - **Browsers** (each tested): Chrome 153, everything. Safari (WebKit, macOS 26.6, via WKWebView): scroll timelines, the `calc()` counter and the `content` keyframes work, so Top and Bot show; no `:target-current`, so the title and `-/3`, and `lualine` hides the line block. Firefox 156: neither feature; the file, the title and `-/3`, with the percentage hidden and the progress rule empty.
  - **Hugo needs:** an id on the post head (e.g. `id="top"`); the head anchor first in the breadcrumb stack with the title as text, and an empty hidden one in the Contents list; `.File.LogicalName` for the file; a second `<ol>` with `scroll-target-group` of n+1 anchors (head, then each heading) with text `i/n`, over a `-/n` span. For `lualine`, each heading's source line from the same source scan M11 does for the grep index (a shared partial returning `[line, text, anchor]`), and `main` as a constant or site param. `.ReadingTime` is no longer used by the strip. The site uses `scroll(root)` and `@media` where the lab uses `scroll(nearest)` and `@container`.
  - **Size:** `ends` alone, written for the site, is about 1.4 KB raw, 0.7 KB gzipped on its own; the markup adds about 0.8 KB raw, 0.2 KB gzipped for a 7-heading post.
- **Found while building** (bugs in the rev 13 design, whatever gets picked):
  1. **`<search hidden>` shows without a script.** `.sb{display:flex}` beats the `hidden` attribute. The lab never hides the box, so it never showed there. Fix in M11.
  2. **Chrome always has a current section.** `scroll-target-group` always has an active marker, so at the top of a post the strip shows `■ Initial Setup` and Contents marks it; the title never shows. Fix: the head anchor (M9).
  3. **Firefox would freeze the counters.** The `%` and minutes counters sit outside `@supports`, so the real site would show `0% · 4 min left` for good in Firefox. Fix: hide `.stat-num` unless `@supports (animation-timeline:scroll())` (M9). The lab keeps its script stand-in visible with a lab-only `:has(.stat-pct[style])` rule.
- **The lab file** now starts with `<meta charset="utf-8">`: without it, WebKit opened the local copy as Latin-1 and garbled `·` and `›`.

## Rev 15

The user's notes with the rev 14 picks, and what the lab does with them. Picked: `filt=menus pn=file`. As in rev 14, two subagents worked on copies of the lab in parallel; the 3-way merge was clean.

- **Every post on the index** (done, no choice): `idx=all`. See M4.
- **Tags and years** (`filt`, picked `menus`). Inside the `boxes` Search frame. The bar for every option: a first-time visitor sees that tags and years filter the list, what's applied, and how to undo it, with one click to apply and one to remove. All five new options share these behaviours, except where "`menus`, as picked" below says otherwise:
  - The box holds only words. A tag or year typed in full, then a space, leaves the box and becomes a filter.
  - Each count is how many posts the list would show with that choice on; a choice that would leave nothing is disabled (dotted outline, `0`).
  - The Posts label reads `Posts · 7 of 17` while anything narrows the list.
  - The six busiest tags show, and the other 20 wait behind `+20 more`, a `<details>` that works without the script (its inline layout and no-script auto-open use `::details-content`: Chrome 131, Safari 18.4, Firefox 143).
  - Tags combine (a post must have all of them); a year replaces the year.
  - `Esc` clears the words first, then the filters. Focus stays on the pressed button.
  - Options:
    - `toggles` (recommended in rev 15): every tag and year is a bordered button that inverts while on, like the lab's own switches. Years are one joined strip, because only one can be on. Each row starts with `all`, which is on until you pick something, so a first-time visitor sees what the rows do before clicking. `clear filters` appears once anything is applied.
    - `check`: a text-mode form: tags as `[ ]`/`[x]` checkboxes, years as `( )`/`(•)` radios, the same `clear filters`.
    - `menus` (picked): one line, `filter  tag: all ▾  year: all ▾`. A set menu inverts and gets a `×` to clear it. The tag menu lists all 26, one tag at a time.
    - `tokens`: what's applied sits in the box before the words as inverted `#nixos ×` tokens; Backspace in an empty box removes the last. The rows under the box offer the rest as `+homelab 5`.
    - `sentence`: rev 14's rows plus a line saying what the list shows: `showing 7 of 17 posts · tagged nixos × · from 2023 × · clear`.
    - `rev14`: unchanged; pixel-identical to rev 14 in 7 states.
  - **Contrast.** Button outlines use `--edge`, about 2:1 on `bg`; the on state is a full `fg` fill, which is the real cue. `--mute` outlines would reach 3:1.
  - **Script.** The lab prints 3.9 KB (all options, plus rev 13's and 14's code). `toggles` alone measures 3,080 B gzipped, about 0.8 KB more than rev 14's rows (2,300 B). Clicking a filter before the index has loaded needs the rows' `data-t`/`data-y`, or has to trigger the load.
  - **CSS.** 93 lines for all five (1.7 KB gzipped); `toggles` alone about 0.8 KB gzipped. The generated per-tag and per-year no-script rules are about 0.6 KB gzipped, roughly half already planned in rev 14.
  - **`menus`, as picked.** What it does, and where it differs from the shared behaviours above:
    - The Search frame's second row, under a dotted rule: `filter` in `mute`, then `tag: all ▾` and `year: all ▾`. Each menu is a `<details class="fmn" name="ff">`, so only one is open at a time. Its summary shows the key in `mute` and the value in `fg`, with a 7×4px triangle drawn by `clip-path` that flips while open. The border is 1px `edge`, and `fg` on hover and while open.
    - A set menu inverts (`fg` ground). A `×` joins it at the right, with a `bg` left border as the separator and `aria-label="Clear the tag filter"`.
    - The open list (`.fpop`) is absolute under the row, the frame's full width, over the posts: a 2px `fg` frame on `bg`, `role="group"`, `aria-label="Filter by tag"`. It's a grid, `repeat(auto-fill,minmax(19ch,1fr))` for tags and 12ch for years, two columns on phones. `all` comes first, then every tag by count then name, each with its count at the right. The applied one is inverted. There's no `+20 more` and no `clear filters`: the menu holds all 26, and each `×` clears its own menu.
    - Picking from a menu replaces its value, so the menus apply one tag and one year. Typing `#nixos #homelab ` still combines both, and the summary then reads `nixos, homelab`.
    - Counts: each tag's count is what the list would show with that tag instead of the applied one, and the same for years.
    - A pick closes the menu and leaves focus on its summary. A click outside or `Esc` closes an open menu, and `Esc` then clears the words, then the filters.
    - Phones (600px and below): `filter` in one column, and the two menus stacked in the other.
  - **Hugo needs, for `menus`:**
    - In the Search frame, a `.ff.ff-menus` block: `<span class="k">filter</span>`, then one row per kind:
      ```html
      <div class="fr fr-t"><details class="fmn" name="ff"><summary><span class="k">tag:</span><b></b></summary>
        <div class="fpop" role="group" aria-label="Filter by tag"><span class="fo">
          <a href="#all" class="fb all">all</a><a href="#nixos" class="fb">nixos<span class="n">11</span></a>…
        </span></div></details><a href="#all" class="dx" aria-label="Clear the tag filter">×</a></div>
      ```
      The year row is the same, with `fr-y`, `year:` and `#y2023` links. `<b>` stays empty in the HTML: CSS writes `all`, or the value without a script, and the script writes the value. The frame's label reads "Filter" in the HTML, and the script renames it "Search" when it shows the box.
    - In the Posts card, hidden targets `<i id="all" hidden>`, `<i id="nixos" class="tg" hidden>`, `<i id="y2023" class="yt" hidden>`, and the count as `Posts · <span class="lc">17</span>`.
    - Generated CSS per tag and year, all gated on `body:has(search[hidden])`: the count `body:has(#nixos:target) .lc::before{content:"11 of "}`, the menu's value `body:has(#nixos:target) .fr-t .fmn b::before{content:"nixos"}`, and the inverted entry `body:has(#nixos:target) .fpop a[href="#nixos"]`. Shared, because the targets carry `.tg` or `.yt`: `.fmn b:empty::before{content:"all"}`, the inverted summary and the visible `×` (`body:has(.tg:target) .fr-t`, `.yt` and `.fr-y` for years), each row's `all` inverted while its kind isn't the target, and the no-script rules in "Found while baking".
    - The script keeps words and filters apart and runs the engine on both. It loads `/#nixos` and `?q=` into the menus and the box, and updates the values, counts and `disabled`. It closes a menu on a pick, a click outside and `Esc`. The lab re-renders the rows; updating Hugo's links in place is probably smaller.
    - Without the script only one filter works at a time (one fragment), so either `×` clears both.
  - **Size of `menus`.** A crude cut of the lab's `menus` rules, with the no-script fix, is 47 lines and 1.2 KB gzipped. That still includes the lab-only `.is-t` selectors and some lines shared with other options, so the site's will be smaller. The script wasn't measured on its own: the lab's, with every option, is 3.9 KB gzipped, and `toggles` alone measured 3.1 KB. `menus` uses the same row builder. Measure it in M11.
  - **Found while baking the picks.** Without a script, nothing closes a `menus` list after a pick. The `<details>` stays open, and its list covers the posts it just filtered (seen in Chrome in the lab's no-script preview). The lab now fixes this under `body:has(search[hidden])` (`.site:has(search[hidden])` in the lab):
    - `.ff-menus` stays `display:flex`, on phones too, so the menus wrap instead of stacking on a grid.
    - `.ff-menus .fr` and `.fmn` get `display:contents`, and `.fmn::details-content` gets `flex:1 1 100%; order:1`. The open list then takes a line of its own under both menus.
    - `.fpop` is `position:static`, so the posts move down instead of being covered.
    - `.dx` gets `margin-left:-2.5ch`, so the `×` still meets its summary.

    `display:contents` on `<details>` and `::details-content` need Chrome 131, Safari 18.4 or Firefox 143, the same floor as `+20 more`. It was checked in Chrome only, at desktop width and 390px. Older browsers weren't tested. With the script, the list stays an overlay, because a pick closes it.
  - **The lab** has a new "index without a script" switch (`id="nojs"`, in a "Preview (lab only)" group) that hides the box and swaps in the site's plain links. New lab state `S.ft` holds the applied filters.
- **Older/Newer** (`pn`, picked `file`). Very quiet, with a small engineering nod, and closer to the footer.
  - **The gap, measured in rev 14's `pg`:** colophon frame, 32px `.pn` margin, the 23px line, a 30px empty band (`.pn-line`'s `padding-bottom:2em`, kept free for the hover captions), then the page's normal 56px bottom padding: the line sat 86px above the footer rule. The status line wasn't the cause. Every rev 15 option drops the band; captions float in whitespace the page already has, and hovering one link hides the other's caption.
  - `frame` (recommended in rev 15): `‹ older  5 of 17  newer ›` cut into the colophon's bottom border at its right end, opposite the file path, the way lazygit puts a list panel's count in its border. It adds no height, so the colophon sits 56px above the footer rule, like the last box on every other page. The count is this post's place among the 17, oldest first (rev 13's `5 / 17`, in lazygit's wording). A missing neighbour keeps an `aria-hidden` placeholder, with the border running through the empty slot. Placement: straight after the colophon wrapper, overlapping with negative margins, so the colophon partial doesn't change. The group shifts by one character between "5 of 17" and "17 of 17". Forced colours checked.
  - `rule`: `‹ older` and `newer ›` cut into the footer's top rule, over the ends of the footer text. No count. Colophon 56px above the rule. Needs `.pg:has(.pn-rule){padding-bottom:0}`.
  - `keys`: two more keyed rows in the colophon under a dotted rule, `older` and `newer`, each naming the neighbour's source file (`systemd-services-and-timers-nixos.md`); a missing one reads `none`. Changes the colophon partial (the rows go inside its grid).
  - `end`: less's end-of-file prompt, `(END)  ‹ older  newer ›`, on its own line. `(END)` is true: the post ends there.
  - `file` (picked): the neighbours' file names at the two ends of the text column, truncating only when both don't fit, stacking on phones. No captions: the accessible name carries the title. "The design" (Post page) and M10 have the spec. Measured in the baked lab on `nixos-impermanence`, `systemd-services-and-timers-nixos` and `syncing-plex-watch-state`: 32px from the colophon frame to the links, 28px from the links to the footer's rule.
  - `pg`: rev 14's line with only the spacing fix.
  - `pg`, `end` and `file` sit 32px under the colophon (about 24px visually, because of the dither) and 28px above the rule, with `.pg:has(.pn-…){padding-bottom:28px}` or a class from the post template.
  - **Left out:** `HEAD~1` (it names a commit, not a post) and `posts[4]` (a zero-based index next to "5 of 17" reads as off by one).
  - **CSS:** about 34 rules for all five plus the `pg` fix (about 2.1 KB minified); `frame` alone about 12 rules, 0.85 KB.
  - **Checked** in Chrome only (desktop and phone, dark and light, newest post, a simulated oldest post, the longest slug, hover, real Tab focus); no Safari, Firefox or screen reader.

## How the user works

- The user iterates visually and likes comparing options side by side. The lab worked well for this: switches over real content, a picks line to paste back, and one look before publishing. The mark lab's `take=` line worked the same way for review items.
- Recurring preferences: subtle engineering concepts shown as real data (commit, source, history); boxes with labels cut into the border; restraint with colour, since the orange accent survives almost nowhere and the chosen mark has none; no rounded corners; no dither on anything that has to be read inside the box.
- The user reverses choices after seeing them, e.g. the orange language tab, then the dither on code (added in rev 6, removed again in rev 7 by C2b). Show options instead of asserting them.
- Every data cue has to explain itself. The user asked about "3 blocks · nix 3" and "edits to latest post" because neither did; the first became a keyed line and the second was dropped. Label data with a key, use the site's own names (Nix, Bash, YAML), and cut a cue that needs explaining.
