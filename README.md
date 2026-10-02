# My Personal Website - [mich-murphy.com](https://mich-murphy.com/)

## Purpose
Created to document my personal projects, for my own reference and hopefully to help anyone else working on similar things.

## Components
This is a static site built using [Hugo](https://gohugo.io/) with my own templates rather than a theme. A Nix flake provides the local development environment (`nix develop`). GitHub Actions builds every pull request and deploys `main` to [GitHub Pages](https://pages.github.com/). Dependabot opens a pull request each month for any action in the workflow that has a new version.

The flake and the workflow pin the same Hugo version, and `module.hugoVersion` in `hugo.toml` sets it as the minimum. To update Hugo, change `min` in `hugo.toml` first, then `nixpkgs` in `flake.nix`, and `HUGO_VERSION` and `HUGO_SHA256` in `.github/workflows/hugo.yaml`. A Hugo older than `min` fails the build, so if the flake or the workflow is left on the old version, its build fails. `HUGO_SHA256` comes from the release's `hugo_<version>_checksums.txt`. Take the line for `hugo_<version>_linux-amd64.tar.gz`, not an `extended` or `withdeploy` one.

## Checks
CI and local builds both run `scripts/build.sh`, so they use the same Hugo flags. One of them, `--panicOnWarning`, turns any warning into a failed build.

CI then runs `scripts/postbuild.sh`. It writes two figures into every page's footer: what a browser fetches to load the homepage (the page gzipped, its preloaded fonts and its SVG icon), and the site's script. It fails if a page other than the index has a script, or if any page is over 14 KB gzipped. A post's JSON-LD doesn't count as a script, since it's data that a browser doesn't run. Build and check locally with `nix develop -c scripts/build.sh && scripts/postbuild.sh`. The checks run on `public` unless you pass another directory. `hugo server` doesn't run them, so there the footer reads `build serve` with neither figure.

Internal links in content must point at content files, like `/posts/<name>.md`. The link hook resolves each one, and a link that doesn't resolve to a page or resource fails the build. Links with a scheme, like `https://`, aren't checked.

The search on the index reads `/index.json`, which the build writes from each post's Markdown source. It gives each `##` and `###` line the next heading id Hugo found, so write headings with `#`s: a post whose source and Hugo count a different number of them fails the build. A tag can't be called `all` or `main`, or look like `y2023`, since the index already uses those ids.

## Writing a post
`nix develop -c hugo new content posts/<name>.md` writes a new post from `archetypes/posts.md`. The post is titled from its name and dated today. Fill in its `summary`, which search results and link previews show. The build fails without one. Each post also gets structured data for search engines (`layouts/_partials/jsonld.html`) with its title, dates, author and social card.

A post with images is a folder, `content/posts/<name>/index.md`, with the images beside it. Its URL is still `/<name>/`. Link an image by its file name, like `![What it shows](diagram.png)`, and the image hook adds its width and height. An image with no alt text, a remote image, or one that isn't in the folder or `assets/` fails the build. So does a file called `card.png` in the folder, since the post's social card uses that address. Make a post a folder when you start it. Hugo's git info doesn't follow renames, so moving an existing post into a folder would cut its colophon's history at the move.

## Updated dates
Each post ends with a colophon that shows when the post was last updated and by which commit, taken from its git history. The same date is the post's `updated` in the Atom feeds and its `lastmod` in the sitemap. A commit that only reformats or moves posts shouldn't count as an update: end its message with a `Bulk: true` trailer, or add its hash (7 characters or more) to `bulkCommits` in `hugo.toml`. If every commit to a post since the move from Zola is a bulk one, the colophon shows the post's last Zola-era commit, from `data/origin.toml`.

Use the trailer only on a commit that changes nothing but formatting and links. The trailer survives a rebase, which changes the hash. A squash is different: it joins the messages of every commit in the pull request into one, so one commit's `Bulk: true` marks the whole squashed commit as bulk and hides the real edits made alongside it. Don't squash a pull request that mixes real edits with bulk commits; merge or rebase it instead.

Because the build reads git history, it only runs in a git checkout. In a copy without `.git`, like a tarball or a `git archive` export, it fails with "fatal: not a git repository". Build one with `HUGO_ENABLEGITINFO=false`, and each colophon falls back to `data/origin.toml`; a post that isn't in it shows only its created date.

## Social cards
Each post has a 1200×630 card for link previews at `/<slug>/card.png`. The build draws the post's title and date onto one of `assets/images/card-base-1.png`, `-2.png` and `-3.png`, which hold the header and an empty framed box sized for a title of 1, 2 or 3 lines. A title too long for 3 lines at the smallest size, or with a character the card's font can't draw, fails the build. To change the bases, edit `scripts/card-base.html`, run `scripts/card-base.sh` (it needs Google Chrome), and commit the new PNGs.

## Fonts
The site uses four faces from GitHub Next's [Monaspace](https://monaspace.githubnext.com/), which is licensed under the SIL Open Font License 1.1. Each has one role: Argon for prose, UI and code, Xenon for headings, Radon for comments in code, and Krypton for what the build writes, like dates, commits, file paths, the status line and the footer. `assets/css/main.css` declares them.

`scripts/fonts.py` makes the font files from Monaspace's release: the subsets the pages load in `static/fonts`, and the TTFs the social cards are drawn with in `assets/fonts`. Run it with `nix develop -c scripts/fonts.py`, then commit what it writes. Monaspace reserves its names, and the license doesn't let a subset use them, so the files are named after each element's symbol: MM Ar, MM Xe, MM Rn and MM Kr. A copy of the license, `LICENSE-Monaspace.txt`, sits in both folders.
