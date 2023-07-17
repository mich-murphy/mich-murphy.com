+++
title = "Troubleshooting Proxmox Installation"
date = 2023-07-18

[taxonomies]
tags = ["proxmox", "homelab"]
+++

I encountered some issues when installing Proxmox on a new homelab. One method of solving these would have been to [install Debian and then Proxmox](https://pve.proxmox.com/wiki/Install_Proxmox_VE_on_Debian_11_Bullseye) from there. I decided to try my hand at troubleshooting the issues instead.

<!-- more -->

## Why Proxmox

Before describing the issues I faced and how I resolved them, I though I should explain why I'm using Proxmox in the first place - why persevere through the pain?

The end state for my homelab is to have a number of different Virtual Machines (VMs) running segregated services. There are a few reasons I want to run multiple VMs:
1. To segment any data used for services to the specific VM I'm running it in
2. Most VMs will be running NixOS - I want to manage them remotely and become more familiar with tools like [deploy-rs](https://github.com/serokell/deploy-rs) and [nixos-anywhere](https://github.com/numtide/nixos-anywhere/)
3. I want to be able to use VMs from any machine to easily experiment with new Linux distributions

I mostly want to use VMs over containers as currently [NixOS doesn't work so well with LXC](https://nixos.wiki/wiki/Proxmox_Linux_Container), it's possible, but I haven't been thrilled with the result. I will use LXC for running some services like [Home Assistant].

## Initial Boot

The first issue I had was getting the Proxmox install step to boot from USB. I kept getting an error saying: `/dev fully populated`

I managed to find a [post on the Proxmox forum](https://forum.proxmox.com/threads/solved-fresh-proxmox-install-with-dev-to-be-fully-populated-error.20211/) which suggested changing the boot flags to resolve the error:

```bash
# e at boot menu add nomodeset
GRUB_CMDLINE_LINUX_DEFAULT="quiet nomodeset" 
```

This let me proceed to the install step for Proxmox.

## Booting After Install

After installing Proxmox I rebooted my machine and found I hit a similar error again - adding the aforementioned `nomodeset` didn't work as I found Proxmox was using systemd-boot rather than grub.

This was resolved by the following thanks to a [post on Reddit](https://www.reddit.com/r/Proxmox/comments/is00kp/any_way_to_set_the_proxmox_installer_to_use_safe/):

```text
for EFI boot (systemd-boot) add `nomodeset` to /etc/kernel/cmdline after installation; run `pve-efiboot-tool refresh` to update
```

## Setting Safe Mode to Boot from Intel Graphics

I thought I was finally done and ready to start setting up some VMs - but no, I hit a fatal server error, which required me to change my vga settings. I found a [YouTube video which explained the changes](https://www.youtube.com/watch?v=-6fRTpmmuHs):

```bash
lspci | grep -i vga
mkdir -p /usr/share/X11/xorg.conf.d
vi /usr/share/X11/xorg.conf.d/10-fbdev.conf
```

Enter the following text in `10-fbdev.conf`
```text
Section "Device"
    Identifier "Card0"
    Driver "fbdev"
    BusID "pci0:2:0:0"
EndSection
```

Finally the system booted and I was able to start setting up Proxmox.

## Bonus Tip - GPU Passthrough

Finally I wanted to leave some references I found helpful for configuring GPU passthrough for a VM in Proxmox. I needed to do this for my Jellyfin service, so I could take advantage of Intel QuickSync. For further reference on setting up and testing hardware transcoding checkout the [Jellyfin documentation](https://wiki.archlinux.org/title/Hardware_video_acceleration#Configuring_VA-API).

You can pass through an Intel GPU via PCI passthrough, as detailed in [Proxmox documentation](https://pve.proxmox.com/wiki/PCI_Passthrough)
