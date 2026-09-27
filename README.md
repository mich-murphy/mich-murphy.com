# My Personal Website - [mich-murphy.com](https://mich-murphy.com/)

## Purpose
Created to document my personal projects, for my own reference and hopefully to help anyone else working on similar things.

## Components
This is a static site built using [Hugo](https://gohugo.io/) with my own templates rather than a theme. A Nix flake provides the local development environment (`nix develop`). The flake and the GitHub Actions workflow pin the same Hugo version. GitHub Actions builds every pull request and deploys `main` to [GitHub Pages](https://pages.github.com/).
