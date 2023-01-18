+++
title = "Configuring NixOS for Impermanence"
date = 2023-01-18

[taxonomies]
tags = ["nixos", "homelab", "impermanence"]
+++

After reading posts from both [Graham Christensen](https://grahamc.com/blog/erase-your-darlings) and [Elis Hirwing](https://elis.nu/blog/2020/05/nixos-tmpfs-as-root/) about the idea of impermanence in NixOS I decided to try setting it up on my homelab. The basic idea is that we configure the system to use a temporary file system, where everything is wiped after a reboot, unless specified otherwise.

<!-- more -->

One of the major benefits of this kind of setup is that it forces you to properly declare the configuration, as everything will break after a reboot otherwise.

## Initial Setup

For the initial installation of NixOS I followed Elis' walk through (linked above) and configured root using a temporary file system. Once this was complete I added the nix community tool [impermanence](https://github.com/nix-community/impermanence) to `/etc/nixos/configuration.nix` to allow for a declarative configuration going forward. 

```nix
# /etc/nixos/configuration.nix
{ config, pkgs, ... }:

let
  impermanence = builtins.fetchTarball {
    url = "https://github.com/nix-community/impermanence/archive/master.tar.gz";
  };
in
{
  imports = [
    ./hardware-configuration.nix # should be present by default
    "${impermanence}/nixos.nix"
  ];
}
```
## Configuring Persistence

With the above complete I was able to configure directories I needed to persist from within `/etc/nixos/configuration.nix`.

```nix
# /etc/nixos/configuration.nix
{ ... }:

{
  environment = {
    persistence."/nix/persist" = {
      directories = [
        "/etc/nixos" # configuration files
        "/srv" # service data
        "/var/log" # where journald dumps logs
        "/var/lib" # system service persistant data
        "/data" # where I store local media
      ];
      files = [
        "/etc/machine-id" # ensures logs are retained after reboot
        "/users/admin" # directory where I store passwordFile for user
      ];
    };
    etc = {
      # ensures SSH keys can be correctly generated
      "ssh/ssh_host_rsa_key".source = "/nix/persist/etc/ssh/ssh_host_rsa_key";
      "ssh/ssh_host_rsa_key.pub".source = "/nix/persist/etc/ssh/ssh_host_rsa_key.pub";
      "ssh/ssh_host_ed25519_key".source = "/nix/persist/etc/ssh/ssh_host_ed25519_key";
      "ssh/ssh_host_ed25519_key.pub".source = "/nix/persist/etc/ssh/ssh_host_ed25519_key.pub";
    };
  };
}
```

Initially I ran into issues configuring [Tailscale](https://tailscale.com/) as I would be logged out after each reboot, I found persisting `/var/lib` fixed the issue as it ensures the Tailscale state, located at `/var/lib/tailscale/tailscale.state`, is always available.

I setup `/srv` as the directory I keep data relating to other services I run on the machine, for services which allow me to specify it.

## Managing Users

You may have noticed in the configuration above I also persist `/users/admin`, this allows me to store a hashed password for the user inside of the directory, which is read from within `/etc/nixos/configuration.nix`. The alternative is to either include a password directly, which would then be available for everyone to see in the nix store, or to add a temporary password and change it on each reboot:

```nix
# /etc/nixos/configuration.nix
{ ... }:

{
  users = {
    mutableUsers = false;
    users = {
      admin = {
        isNormalUser = true;
        home = "/home/admin";
        # generate with: nix-shell --run 'mkpasswd -m SHA-512 -s' -p mkpasswd
        passwordFile = "/nix/persist/users/admin";
        extraGroups = [ "wheel" ];
      };
    };
  };
}
```


