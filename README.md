# My Personal Website - [mich-murphy.com](https://mich-murphy.com/)

Created to document my personal projects, for my own reference and hopefully to help anyone else working on similar things.

## Quick start
You need [Nix](https://nixos.org/download/) with flakes enabled. The flake provides everything else at pinned versions.

| To | Run |
|---|---|
| enter the dev shell (or let direnv do it with `.envrc`) | `nix develop` |
| preview with live reload | `hugo server` |
| build into `public` and finish it, as CI does | `scripts/build.sh && scripts/postbuild.py` |
| run every check before pushing | `scripts/check.sh` |
| start a post | `hugo new content posts/<name>.md` |

## Project layout
| Path | What's there |
|---|---|
| `content/` | the posts (`content/posts/`), the home intro, About and Feeds |
| `layouts/` | Hugo templates: `baseof.html` is every page's shell, `home.html`, `page.html`, `about.html` and `feeds.html` fill it, and `home.json.json` and `*.atom.xml` write the search index and the feeds |
| `layouts/_partials/` | shared pieces, like the head (`head/`), header, footer, Contents, the colophon and the social card, and small helpers that return a value (`posts.html`, `tag-slug.html`, `origin.html`) |
| `layouts/_markup/` | render hooks for Markdown's links, images, headings, code blocks and callouts |
| `assets/css/` | the styles, one file per page type (see Design) |
| `assets/js/search.js` | the site's one script: search on the home page |
| `assets/fonts/`, `assets/images/` | what the build draws the social cards with |
| `static/` | files served as they are: the web fonts and the icons |
| `data/` | the Projects and Feeds I read lists, and each post's last commit before the move from Zola |
| `scripts/` | `build.sh`, `postbuild.py` and `check.sh` (see Checks), and `fonts.py`, `favicons.py` and `card-base.sh`, which make the fonts, icons and social card bases |
| `hugo.toml` | site settings, including the pinned Hugo version and the commits that don't count as updates |

## Design
- **Light pages.** Every page is its HTML plus one inlined `<style>`, under 14 KB gzipped, with no other request before it can render. `scripts/postbuild.py` fails the build if a page is over.
- **No JavaScript, except search.** The home page's search is the only script, and its footer says how big it is. Everything else is HTML and CSS:
  - Contents on a post opens on hover or focus beside a wide window, and through `#toc:target` from a button on a phone. Its current section comes from `:target-current`, which Chrome and Edge support; other browsers show no current section.
  - Without the script, the home page's tag and year menus are links to hidden targets that filter the posts through `:has(:target)`, one filter at a time.
- **Real data, not decoration.** The structural devices carry facts from the build: each post's source file, last real commit and history, the page weight in the footer. No cue is there for show, and each says what it is.
- **One dither per page.** The offset dotted shadow marks the page's main box: the Posts card on home and 404, the colophon on a post, This site on About and Subscribe on Feeds.
- **Accessible.** Built to WCAG 2.2 AA: keyboard and screen-reader paths for everything, visible focus, contrast checked in both colour schemes, text that follows the browser's font size, and rules for reduced motion, forced colours and print.

The CSS is split by page type, and `layouts/_partials/head/styles.html` inlines only what a page needs: `main.css` on every page, then `posts-card.css`, `home.css` and `home-filters.css` (a template) on home, or `prose.css` and then `post.css` or `pages.css`. Cascade layers order them (base, layout, components, utilities, print), so no rule needs extra specificity to win. The palette is one set of `light-dark()` tokens in `main.css`, and print always takes light.

The redesign's working notes, with the design labs, the options considered and the build log, are in git history: `git log --all -- docs/design/HANDOVER.md` finds them.

## Hugo version
The Hugo version is set in one place: `min` under `[module.hugoVersion]` in `hugo.toml`. `scripts/hugo-version.sh` reads it, `scripts/build.sh` stops unless `hugo` is exactly that version, and CI installs that version. The flake and the workflow's checksum have to change with it. To update Hugo:

1. Change `min` in `hugo.toml` to the new version.
2. In `flake.nix`, point `nixpkgs` at a nixos-unstable commit whose `hugo` is that version, then run `nix flake lock` and check that `nix develop -c hugo version` prints it.
3. In `.github/workflows/hugo.yaml`, set `HUGO_SHA256` to the line for `hugo_<version>_linux-amd64.tar.gz` (not an `extended` or `withdeploy` one) in the release's checksums: `curl -sSfL https://github.com/gohugoio/hugo/releases/download/v<version>/hugo_<version>_checksums.txt | grep ' hugo_<version>_linux-amd64.tar.gz$'`.
4. Run `nix develop -c scripts/check.sh`, which builds the site with the new Hugo.

A flake left on the old version fails `scripts/build.sh`, and a checksum left on the old one fails CI's Install Hugo step.

The flake pins nixpkgs to a commit, so none of its tools changes until that line does. `nix develop` gives the default shell: Hugo, Python with fontTools for `scripts/fonts.py`, and the linters. `nix develop .#ci` gives CI a smaller one, with Hugo and the linters only.

## Checks
CI and local builds both run `scripts/build.sh`, so they use the same Hugo flags. One of them, `--panicOnWarning`, turns any warning into a failed build.

`scripts/postbuild.py` then finishes the build. It writes two figures into every page's footer: what a browser fetches to load the homepage (the page gzipped, its preloaded fonts and its SVG icon), and the site's script. It fails if a page other than the index has a script, or if any page is over 14 KB gzipped (`MAX_GZIP_BYTES` sets another limit). A post's JSON-LD doesn't count as a script, since it's data that a browser doesn't run. It needs only Python's standard library, and gives the same sizes on macOS and Linux. It runs on `public` unless you pass another directory. `hugo server` doesn't run it, so there the footer reads `build serve` with neither figure.

`scripts/check.sh` runs the rest of the checks. It runs shellcheck and shfmt on the shell scripts, Ruff on the Python (`ruff.toml`), Biome on the CSS and JavaScript (`biome.jsonc`), and actionlint and zizmor on the workflow and Dependabot's settings. Then it builds the site into a temporary folder, runs `scripts/postbuild.py` on it, and has lychee check every link between its pages, `#` fragments included, without going online. Every check runs even if an earlier one fails, and it ends by naming the ones that failed. `.editorconfig` sets the whitespace the formatters expect; `shfmt -w scripts/*.sh`, `ruff format scripts` and `biome check --write` fix formatting rather than report it.

The workflow has three jobs. Build installs Hugo, runs `scripts/build.sh` and `scripts/postbuild.py`, and uploads the site. Lint runs `scripts/check.sh` in the `ci` shell, alongside Build. Deploy publishes the site on `main` once both have passed. The workflow pins each action to a commit, and Dependabot opens one pull request a month for those with a new version, once it's a week old.

Internal links in content must point at content files, like `/posts/<name>.md`. The link hook resolves each one, and a link that doesn't resolve to a page or resource fails the build. Links with a scheme, like `https://`, aren't checked.

The search on the index reads `/index.json`, which the build writes from each post's Markdown. It gives each `##` and `###` line the next heading id Hugo found, so write headings with `#`s: a post whose Markdown and Hugo count a different number of them fails the build. A tag can't be called `all` or `main`, or look like `y2023`, since the index already uses those ids.

## Writing a post
`hugo new content posts/<name>.md` writes a new post from `archetypes/posts.md`. The post is titled from its name and dated today. Fill in its `summary`, which search results and link previews show. The build fails without one. Each post also gets structured data for search engines (`layouts/_partials/head/jsonld.html`) with its title, summary, dates, author and social card.

A post with images is a folder, `content/posts/<name>/index.md`, with the images beside it. Its URL is still `/<name>/`. Link an image by its file name, like `![What it shows](diagram.png)`, and the image hook adds its width and height. An image with no alt text, a remote image, or one that isn't in the folder or `assets/` fails the build. So does a file called `card.png` in the folder, since the post's social card uses that address. Make a post a folder when you start it. Hugo's git info doesn't follow renames, so moving an existing post into a folder would cut its colophon's history at the move.

Write link text that says where the link goes, not "here": a list of a page's links should make sense on its own.

## Updated dates
Each post ends with a colophon that shows when the post was last updated and by which commit, taken from its git history. The same date is the post's `updated` in the Atom feeds and its `lastmod` in the sitemap. A commit that only reformats or moves posts shouldn't count as an update: end its message with a `Bulk: true` trailer, or add its hash (7 characters or more) to `bulkCommits` in `hugo.toml`. If every commit to a post since the move from Zola is a bulk one, the colophon shows the post's last Zola-era commit, from `data/origin.toml`.

Use the trailer only on a commit that changes nothing but formatting and links. The trailer survives a rebase, which changes the hash. A squash is different: it joins the messages of every commit in the pull request into one, so one commit's `Bulk: true` marks the whole squashed commit as bulk and hides the real edits made alongside it. Don't squash a pull request that mixes real edits with bulk commits; merge or rebase it instead.

Because the build reads git history, it only runs in a git checkout. In a copy without `.git`, like a tarball or a `git archive` export, it fails with "fatal: not a git repository". Build one with `HUGO_ENABLEGITINFO=false`, and each colophon falls back to `data/origin.toml`; a post that isn't in it shows only its created date.

## Social cards
Each post has a 1200×630 card for link previews at `/<slug>/card.png`. The build draws the post's title and date onto one of `assets/images/card-base-1.png`, `-2.png` and `-3.png`, which hold the header and an empty framed box sized for a title of 1, 2 or 3 lines. A title too long for 3 lines at the smallest size, or with a character the card's font can't draw, fails the build. To change the bases, edit `scripts/card-base.html`, run `scripts/card-base.sh`, and commit the new PNGs. It needs Google Chrome or Chromium; set `CHROME` to its path if the script doesn't find it.

## Fonts
The site uses four faces from GitHub Next's [Monaspace](https://monaspace.githubnext.com/), which is licensed under the SIL Open Font License 1.1. Each has one role: Argon for prose, UI and code, Xenon for headings, Radon for comments in code, and Krypton for what the build writes, like dates, commits, file paths, the Contents button's count and the footer. `assets/css/main.css` declares them, along with fallback faces that scale the system's monospace to Monaspace's metrics, so nothing moves when the web fonts arrive.

`scripts/fonts.py` makes the font files from Monaspace's release: the subsets the pages load in `static/fonts`, each cut to the characters its face sets, and the TTFs the social cards are drawn with in `assets/fonts`. Run it with `nix develop -c scripts/fonts.py`, then commit what it writes. Monaspace reserves its names, and the license doesn't let a subset use them, so the files are named after each element's symbol: MM Ar, MM Xe, MM Rn and MM Kr. A copy of the license, `LICENSE-Monaspace.txt`, sits in both folders.

`scripts/favicons.py` draws the favicons from the mark in `layouts/_partials/mark.html`.
