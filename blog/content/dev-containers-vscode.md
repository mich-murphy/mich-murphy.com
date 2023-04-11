+++
title = "Using Dev Containers to Standardise Development Environments"
date = 2023-04-11

[taxonomies]
tags = ["vscode", "docker", "neovim"]
+++

After running my own homelab for a while, I've become pretty familiar with using containers - mostly via Docker, though I may have to make the switch to podman after a [recent announcement](https://www.servethehome.com/docker-abruptly-starts-charging-many-users-for-docker-desktop/). One thing I wasn't aware of was the ability to run containers for the specific purpose of creating a development environment.

<!-- more -->

## Configuring a Dev Container

I first came across this feature in Visual Studio Code (I try to avoid it, but sometimes its a necessary evil :P), there is a lot of great [documentation](https://code.visualstudio.com/docs/devcontainers/containers) which covers the topic in far more detail than I plan to.

The pre-requisites for setting up a Dev Container are Visual Studio Code (VSCode) and the [Dev Containers](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers) plugin.

The basic idea is that you create a `Dockerfile` or `docker-compose` file, which sets up a container, you can then specify a `devcontainer.json` file which lets you configure additional settings unique to VSCode e.g. plugins that you want installed inside of the container, and/or VSCode settings you want active whilst in the container. 

VSCode will even walk you through the process of creating the container itself if you don't have a `Dockerfile` already on hand: `Ctrl + Shift + P` -> `Dev Containers: New Dev Container...` will get you started.

[Follow this link](https://containers.dev/implementors/spec/#devcontainerjson) for a list of all the options available when configuring `devcontainer.json`.

Here is an example of a quick setup I configured:
```json
{
  "name": "Python 3",
  // Base image provided by Microsoft or use a Dockerfile or Docker Compose file. More info: https://containers.dev/guide/dockerfile
  "image": "mcr.microsoft.com/devcontainers/python:0-3.9",
  // Install pre-configured features into the container - in this case the fish shell
  "features": {
    "ghcr.io/meaningful-ooo/devcontainer-features/fish:1": {
      "fisher": true
    }
  },
  // Specify extensions which should be made available inside of the container
  "customizations": {
    "vscode": {
      "extensions": [
        "vscodevim.vim",
        "ms-python.python",
        "ms-python.pylance",
        "ms-python.black",
        "ms-python.flake8",
        "ms-python.isort"
      ],
      "settings": {
        "python.linting.flake8Enabled": true,
        "python.linting.flake8Path": "/usr/local/bin/flake8"},
        "python.formatting.blackPath": "/usr/local/bin/black"
    }
  }
}
```
## Adding Dotfiles

One feature which I thought was really handy is the ability to specify a repository containing `dotfiles` (linux personalised configuration settings, [here is an example](https://github.com/mich-murphy/dwm-dotfiles)), which can be [cloned and configured](https://code.visualstudio.com/docs/devcontainers/containers#_personalizing-with-dotfile-repositories) once the Dev Container is up and running.

This means you can create a Dev Contianer and share it across a team, so that everyone has a standardised development environment. Then you can add your own configuration after the container has been started by using the dotfiles functionality - no one is subjected to your strange configuration (e.g. running the vim extension).

## Use of Dev Containers in Neovim

Naturally the first thing I did after discovering this feature in VSCode was to explore whether it is also available in Neovim (my editor of choice) - sure enough [I found a plugin](https://github.com/esensar/nvim-dev-container). I need to play around with this more to get it configured, but I'm glad to know the option is there.


