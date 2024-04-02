+++
title = "Configuring a Minecraft Server Using NixOS"
date = 2024-04-02

[taxonomies]
tags = ["minecraft", "nixos"]
+++

Minecraft can be configured simply by using the provided [NixOS modules](https://search.nixos.org/options?channel=unstable&size=50&sort=relevance&type=packages&query=minecraft). Tailscale have published a [blog post](https://tailscale.com/kb/1096/nixos-minecraft) showing how to utilise this and get a working server.

This setup is a bit limited when it comes to installing mods and mod toolchains declaratively. [Nix-minecraft](https://github.com/Infinidoge/nix-minecraft) was developed for this purpose.

<!-- more -->

## NixOS Minecraft Configuration With Mods

To use Nix-minecraft, add the following to an existing `flake.nix`, or create a new one like so:

```nix
# flake.nix

{
  description = "NixOS Minecraft Server";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
		
		# Add nix-minecraft input
    nix-minecraft.url = "github:Infinidoge/nix-minecraft";
  };

  outputs = {
    self,
    nixpkgs,
		
		# Add nix-minecraft input
    nix-minecraft,
    ...
  } @ inputs: {
    nixosConfigurations.media = nixpkgs.lib.nixosSystem {
      specialArgs = {inherit inputs;};
      modules = [
        ./minecraft.nix
        agenix.nixosModules.default
        {
			
				  # Add overlay for nix-minecraft
          nixpkgs.overlays = [
            nix-minecraft.overlay
          ];
        }
      ];
    };
}

```

### Minecraft Configuration File

Then create a new nix file for server configuration, the following shows an example of how to do this using a nix module format.

Available mods for install can be found at [Modrinth](https://modrinth.com/).

Nix-minecraft provides a helper scrip to identify the `fetchurl` and `sha512` hash needed to install a mod. To use it, find a mod on Modrinth and click on the version you want. In the displayed information, there is a Version ID string. Click on it to copy the version ID. Then run the following on a system with nix flakes enabled, replacing with the copied version ID: `nix run github:Infinidoge/nix-minecraft#nix-modrinth-prefetch -- versionid`

Once you've got the details for mods to be install, you can finalise server configuration like so:

```nix
# minecraft.nix

{
  lib,
  config,
  pkgs,
	# Used to import nix-minecraft
  inputs,
  ...
}:
with lib; let
  cfg = config.common.minecraft;
	# Target minecraft version
  mcVersion = "1.20.1";
	# Version of toolchain (fabric in this case)
  fabricVersion = "0.15.7";
	# Format minecraft version, replacing . with _
  serverVersion = lib.replaceStrings ["."] ["_"] "fabric-${mcVersion}";
in {
	# Import nix-minecraft to provide path to mod toolchain packages
  imports = [
    inputs.nix-minecraft.nixosModules.minecraft-servers
  ];

  options.common.minecraft = {
    enable = mkEnableOption "Enable Minecraft Server";
  };

  config = mkIf cfg.enable {
    services = {
		  # Server configuration module options
      minecraft-servers = {
        enable = true;
        eula = true; # accepting EULA is required for server to run
			  # Rename and clear out /srv/minecraft to setup new server
        servers.server-name = {
          enable = true;
          package = pkgs.fabricServers.${serverVersion}.override {loaderVersion = fabricVersion;};
          serverProperties = {
            # Adjust server properties to fit needs
            server-port = 25565;
            gamemode = "peaceful";
            motd = "NixOS Pokemon"; # Server name
            max-players = 2;
            level-seed = "10292758"; # Seed for level generation
          };
          symlinks = {
				    # List all mods to be installed
            mods = pkgs.linkFarmFromDrvs "mods" (builtins.attrValues {
							# Example values returned by nix run command
              FabricApi = pkgs.fetchurl {
                url = "https://cdn.modrinth.com/data/P7dR8mSH/versions/YG53rBmj/fabric-api-0.92.0%2B1.20.1.jar";
                sha512 = "53ce4cb2bb5579cef37154c928837731f3ae0a3821dd2fb4c4401d22d411f8605855e8854a03e65ea4f949dfa0e500ac1661a2e69219883770c6099b0b28e4fa";
              };
              Pokemon = pkgs.fetchurl {
                url = "https://cdn.modrinth.com/data/MdwFAVRL/versions/uWAkNUxZ/Cobblemon-fabric-1.4.1%2B1.20.1.jar";
                sha512 = "6955c8ad187d727cbfc51761312258600c5480878983cfe710623070c90eb437e419c140ff3c77e5066164876ecfe1e31b87f58f5ef175f0758efcff246b85a8";
              };
            });
          };
        };
      };
    };
  };
}

```

### Additional Resources

Another helpful reference was [Misterio77's NixOS Minecraft config](https://github.com/Misterio77/nix-config/tree/0ed82f3d63a366eafbacb8eee27985afe30b249a/hosts/celaeno/services/minecraft)
