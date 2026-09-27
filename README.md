# My Personal Website - [mich-murphy.com](https://mich-murphy.com/)

## Purpose
Created to document my personal projects, for my own reference and hopefully to help anyone else working on similar things.

## Components
This is a static site built using [Hugo](https://gohugo.io/) with my own templates rather than a theme. A Nix flake provides the local development environment (`nix develop`). The flake and the GitHub Actions workflow pin the same Hugo version. GitHub Actions builds every pull request and deploys `main` to [GitHub Pages](https://pages.github.com/).

## Checks
CI runs `scripts/postbuild.sh` after every build. It writes each page's gzipped weight into its footer, and fails if a page other than the index has a script or any page is over 14 KB gzipped. Run it after a local build too: `nix develop -c hugo build --gc --minify && scripts/postbuild.sh`. It checks `public` unless you pass another directory.

Internal links in content must point at content files, like `/posts/<name>.md`. The link hook resolves each one, and a link that doesn't resolve to a page or resource fails the build. Links with a scheme, like `https://`, aren't checked.

## Updated dates
Each post ends with a colophon that shows when the post was last updated and by which commit, taken from its git history. A commit that only reformats or moves posts shouldn't count as an update: end its message with a `Bulk: true` trailer, or add its hash (7 characters or more) to `bulkCommits` in `hugo.toml`. If every commit to a post since the move from Zola is a bulk one, the colophon shows the post's last Zola-era commit, from `data/origin.toml`.

Use the trailer only on a commit that changes nothing but formatting and links. The trailer survives a rebase, which changes the hash. A squash is different: it joins the messages of every commit in the pull request into one, so one commit's `Bulk: true` marks the whole squashed commit as bulk and hides the real edits made alongside it. Don't squash a pull request that mixes real edits with bulk commits; merge or rebase it instead.

Because the build reads git history, it only runs in a git checkout. In a copy without `.git`, like a tarball or a `git archive` export, it fails with "fatal: not a git repository". Build one with `HUGO_ENABLEGITINFO=false`, and each colophon falls back to `data/origin.toml`; a post that isn't in it shows only its created date.

## Font
The site uses the [0xProto](https://github.com/0xType/0xProto) font, which is licensed under the SIL Open Font License 1.1. The license is included with the font files in `static/fonts/LICENSE-0xProto.txt`.
