+++
title = "Configure Proxmox Package Repositories"
date = 2022-12-22

[taxonomies]
tags = ["proxmox", "homelab"]
+++

I use [Proxmox](https://www.proxmox.com/en/) to create and manage VMs on my existing homelab (2012 Mac Mini). I use a combination of both VMs and containers for running applications and services, as I don't always like to force everything to run in a container. For a deeper discussion on this topic I recommend listening to [this podcast](https://thehomelab.show/2022/11/30/the-homelab-show-ep-79-virtualization-vs-containers/).

<!-- more -->

## Failed Update Error

I recently opened up Proxmox to begin configuring a [Nixos](https://nixos.org/) VM, and noticed I had a bunch of errors when updating the package database `Error: command apt-get update failed: exit code 100`. I SSH'd into the machine and tried to update manually, this provided a more detailed output, it appeared I was trying to pull updates from a repo requiring a Proxmox subscription (which I don't have, as I use it for personal use).

## Updating Source List

I managed to find a [Proxmox wiki page](https://pve.proxmox.com/wiki/Package_Repositories) which provided some clarity. In summary I fixed the issue by commenting out the following repository inside of `/etc/apt/sources.list.d/pve-enterprise.list`:

```bash
# deb https://enterprise.proxmox.com/debian/pve bullseye pve-enterprise
```

I then edited `/etc/apt/sources.list` to look like the following, adding the pve-no-subscription repo:

```bash
deb http://ftp.debian.org/debian bullseye main contrib
deb http://ftp.debian.org/debian bullseye-updates main contrib

# PVE pve-no-subscription repository provided by proxmox.com,
# NOT recommended for production use
deb http://download.proxmox.com/debian/pve bullseye pve-no-subscription

# security updates
deb http://security.debian.org/debian-security bullseye-security main contrib
```

After the above changes I ran `apt update` and `apt dist-upgrade`, everything updated without issue.

**Note**: Proxmox highlight in the linked wiki that the pve-no-subscription repo isn't tested as thoroughly as the repo for the paid subscription. For me this was an acceptable compromise, this may be different for you.
