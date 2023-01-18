+++
title = "How To Mount S3 Object Storage in NixOS"
date = 2022-12-14

[taxonomies]
tags = ["nixos", "homelab", "s3"]
+++

I previously wrote about how I mounted s3 object storage to my [homelab running Ubuntu](/s3-object-storage.md). I've since been configuring my [homelab](https://github.com/mich-murphy/nix-config/blob/master/hosts/homelab/configuration.nix) to run using [NixOS](https://nixos.org/). NixOS has a major advantage over Ubuntu for me, in that the entire system is configured declaratively, meaning once you have a working configuration you can use it to rebuild everything exactly how it was setup before.

<!-- more -->

## Updating NixOS Configuration

Whilst you could in theory install the required tools and manually mount an s3 object store in NixOS, a better approach is to specify mount instruction in the NixOS configuration file.

After a default install of NixOS the configuration file is available to edit at `/etc/nixos/configuration.nix`, to mount an s3 bucket we will expand on the `configuration.nix` by adding a new `module`, called `s3fs`. We will do this by importing a separate `s3fs.nix` file, which we will create shortly, for now edit `/etc/nixos/configuration.nix` and add the following:

```nix
# /etc/nixos/configuration.nix
{ config, pkgs, ... }:

{
  imports = [
    ./hardware-configuration.nix # should be present by default
    ./modules/s3fs.nix
  ];

  services.s3fs.enable = true;
}
```

## Add Modules Directory

Next we need to create the modules folder and create the `s3fs.nix` file:

```bash
sudo mkdir /etc/nixos/modules && sudo touch s3fs.nix
```
## Add s3fs Module

Finally we can edit `/etc/nixos/modules/s3fs.nix` and add the following:

```nix
# s3fs configuration

# /etc/nixos/modules/s3fs.nix
{ config, lib, pkgs, ... }:

with lib;

let
  cfg = config.services.s3fs;
in {
  options.services.s3fs = {
    enable = mkEnableOption "Mounts s3 object storage using s3fs";
    keyPath = mkOption {
      type = types.str;
      default = "/etc/passwd-s3fs";
    };
    mountPath = mkOption {
      type = types.str;
      default = "/mnt/data";
    };
    bucket = mkOption {
      type = types.str;
      default = "data";
    };
    url = mkOption {
      type = types.str;
      default = "https://ap-south-1.linodeobjects.com/";
    };
  };

  config = mkIf cfg.enable {
    systemd.services.s3fs = {
      description = "Linode object storage s3fs";
      wantedBy = [ "multi-user.target" ];
      serviceConfig = {
        ExecStartPre = [
          "${pkgs.coreutils}/bin/mkdir -m 777 -pv ${cfg.mountPath}"
          "${pkgs.e2fsprogs}/bin/chattr +i ${cfg.mountPath}" # stop files being written to unmounted dir
        ];
        ExecStart = let
          options = [
            "passwd_file=${cfg.keyPath}"
            "use_path_request_style"
            "allow_other"
            "url=${cfg.url}"
            "umask=0000"
          ];
        in
          "${pkgs.s3fs}/bin/s3fs ${cfg.bucket} ${cfg.mountPath} -f "
            + lib.concatMapStringsSep " " (opt: "-o ${opt}") options;
        ExecStopPost = "-${pkgs.fuse}/bin/fusermount -u ${cfg.mountPath}";
        KillMode = "process";
        Restart = "on-failure";
      };
    };
  };
}
```
The above sets up a module for `services.s3fs`, allowing us to enable/disable the service as well as edit the default settings. When enabled a `systemd` service is created which mounts the s3 bucket, making it available at the specified path (`/mnt/data` by default).

The service will look for a file containing an access and API key by default in `/etc/passwd-s3fs`, before running the service you will need to run the following to configure authentication details:

```bash
echo "ACCESS_KEY:SECRET_KEY" | sudo tee /etc/passwd-s3fs
sudo chmod 600 /etc/passwd-s3fs
```

**Note**: I recently ran into an issue when setting this up and had to comment out `"${pkgs.e2fsprogs}/bin/chattr +i ${cfg.mountPath}"` to resolve the issue. I'll update if I figure out a solution. For now everything is working without it.

Much of the credit for this post goes to a forum post on the [NixOS Discourse](https://discourse.nixos.org/t/how-to-setup-s3fs-mount/6283).
