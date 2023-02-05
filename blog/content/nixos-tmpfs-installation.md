+++
title = "Installing NixOS on a Temporary File System"
date = 2023-02-06

[taxonomies]
tags = ["nixos", "impermanence", "homelab"]
+++

In this post I explain how to install NixOS using a temporary file system (tmpfs). This is a precursor to the [post I wrote](https://micha.elmurphy.com/nixos-impermanence/) about configuring NixOS for impermanence, and walks through the installation.

<!-- more -->

## Useful References & Notes

The following is summarised from a combination of 2 different blog posts: one detailing how to [configure a tmpfs on NixOS](https://elis.nu/blog/2020/05/nixos-tmpfs-as-root/) and another showing how to [harden the NixOS install](https://xeiaso.net/blog/paranoid-nixos-2021-07-18).

The instructions setup a very simple file system, without a swap partition, just a 512MB boot partition and a root partition on the remaining space. **Note**: this method is used to create a legacy boot partition, as I use it to create a virtual machine inside of Proxmox. Refer to the linked post above on configuring a tmpfs for EUFI instructions.

Before proceeding you will need a copy of the [NixOS Minimal ISO](https://nixos.org/download.html#nix-more).

## Partitioning & Labelling Drives

If unsure first check which drives are available, and confirm which to install on with `lsblk`. I will be installing on `/dev/sda`, replace this with the relevant drive if it's different.

```bash
# Create legacy boot partition of 512MB
parted /dev/sda -- mklabel msdos
parted /dev/sda -- mkpart primary ext4 1M 512M
parted /dev/sda -- set 1 boot on

# Create root partition on remaining storage
parted /dev/sda -- mkpart primary ext4 512MiB 100%

# Label both partitions
mkfs.ext4 -L boot /dev/sda1
mkfs.ext4 -L nix /dev/sda2
```
## Mount Drive & Create Folders

We need to setup the following folder structure on the drive we prepared before starting a NixOS install.

```bash
# Create root mount with tmpfs
mount -t tmpfs none /mnt

# Create folder structure to persist in /nix/persist - srv is optional, used as home directory for services
mkdir -p /mnt/{boot,nix,etc/{nixos,ssh},var/{lib,log},srv}

# Mount relevant partitions to each folder
mount /dev/sda1 /mnt/boot
mount /dev/sda2 /mnt/nix

# Create matching folders in /mnt/nix/persist
mkdir -p /mnt/nix/persist/{etc/{nixos,ssh},var/{lib,log},srv}

# Create temporary bind mounts (later replaced with impermanence - refer to post linked above)
mount -o bind /mnt/nix/persist/etc/nixos /mnt/etc/nixos
mount -o bind /mnt/nix/persist/var/log /mnt/var/log

# Generate a base config
nixos-generate-config --root /mnt
```

## Editing Configuration Files

Before completing the final install we need to make some changes to the generated configuration:

```nix
# /etc/nixos/hardware-configuration.nix

{
  fileSystems."/" = {
    device = "none";
    fsType = "tmpfs";
    # add the line below - limits root storage to 2G maximum
    options = [ "defaults" "size=2G" "mode=755" ];
  };

  # Update both /boot and /nix to use labels rather than UUID
  fileSystems."/boot" =
    { device = "/dev/disk/by-label/boot";
      fsType = "ext4";
    };

  fileSystems."/nix" =
    { device = "/dev/disk/by-label/nix";
      fsType = "ext4";
    };
}
```

You will also need to edit `/etc/nixos/configuration.nix`, how you go about this depends on your needs. Personally I only need to prepare the configuration for deployment via [deploy-rs](https://github.com/serokell/deploy-rs):

```nix
# /etc/nixos/configuration.nix

{
  # Configure user with sudo access and SSH key authentication
  users.mutableUsers = false; # prevents any changes to users outside of config file
  users.users.mm = {
    isNormalUser = true;
    extraGroups = [ "wheel" ];
    openssh.authorizedKeys.keys = [
      "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIMne13aa88i97xAUqU33dk2FNz+w8OIMGi8LH4BCRFaN"
    ];
  };
  
  # Persist host ssh keys to enable decrycption of agenix secrets
  environment.etc."ssh/ssh_host_rsa_key".source
    = "/nix/persist/etc/ssh/ssh_host_rsa_key";
  environment.etc."ssh/ssh_host_rsa_key.pub".source
    = "/nix/persist/etc/ssh/ssh_host_rsa_key.pub";
  environment.etc."ssh/ssh_host_ed25519_key".source
    = "/nix/persist/etc/ssh/ssh_host_ed25519_key";
  environment.etc."ssh/ssh_host_ed25519_key.pub".source
    = "/nix/persist/etc/ssh/ssh_host_ed25519_key.pub";

  # enable nix flakes
  nix.extraOptions = ''
    experimental-features = nix-command flakes
  '';

  # allow for deployment without entering password
  security.sudo.wheelNeedsPassword = false;
}
```

If you plan on using `/etc/nixos/ocnfiguration.nix` for configuration, then you will want to ensure your created user also has a password. You may also want to edit the timezone, network settings, hostname and bootloader.

## Complete NixOS Install

Finally we run the following to install NixOS:

```bash
nixos-install --no-root-passwd
```

### Deploy-rs & Agenix Preparation

This final section is likely irrelevant to most users. I plan on writing about these tools in a future post. Deploy-rs (linked above) allows for deployment of nix flakes to remote machines, and [Agenix](https://github.com/ryantm/agenix) encrypts any secrets used in the flakes using SSH keys. 

To ensure the host has the correct SSH keys to allow for decryption of secrets I edit `/etc/ssh/ssh_host_ed25519_key` and `/etc/ssh/ssh_host_ed25516_key.pub`, replacing the existing keys with those I have to configured in agenix.
