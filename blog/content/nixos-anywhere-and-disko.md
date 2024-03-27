+++
title = "Remote Deployment of NixOS Using Nixos-anywhere and Disko"
date = 2024-03-27

[taxonomies]
tags = ["nixos", "nixos-anywhere", "disko"]
+++

Now that the use cases for my homelab are growing, I'm finding a need to separate different services into their own virtual machines. This has been a bit tedious in the past, as each time I've had to format disk and create a new NixOS configuration.

Nixos-anywhere and Disko combine together to make this simple. This post explains how to use these tools.


<!-- more -->

## NixOS Anywhere & Disko

[Nixos-anywhere](https://github.com/nix-community/nixos-anywhere) allows for remote deployment of NixOS via `kexec` on any Linux based operating system. This provides a quick method to convert any virtual machine to NixOS and build the new system according to a specified NixOS configuration.

Nixos-anywhere utilises [Disko](https://github.com/nix-community/disko), which allows for declarative disk preparation and formatting. This means we can deploy without the usual `fdisk/gparted` preparation.

### Disko Configuration

First start by specifying how you want Disko to configure your disks. You can find an example Disko config [here](https://github.com/nix-community/disko/blob/master/example/multi-device-no-deps.nix)

The following configuration is what I used to format an SSD drive, mounted at `/dev/sda`, creating partitions for EFI boot and operating system storage:

```nix
# hosts/services/disk-config.nix

{...}: {
  disko.devices = {
    disk = {
	    # To specify an additional drive, create another entry e.g. disk.data
      main = {
        device = "/dev/sda";
        type = "disk";
        content = {
          type = "gpt";
          partitions = {
			      # Boot partition formatted for EFI
            boot = {
              size = "1M";
              type = "EF02"; # for grub MBR
            };
            ESP = {
              name = "ESP";
              size = "512M";
              type = "EF00";
              content = {
                type = "filesystem";
                format = "vfat";
                mountpoint = "/boot";
              };
            };
			      # Optional swap partition
            swap = {
              size = "8G";
              content = {
                type = "swap";
                randomEncryption = true;
                resumeDevice = true; # resume from hiberation from this device
              };
            };
			      # Root partition for operating system storage
            root = {
              size = "100%";
              content = {
                type = "filesystem";
                format = "ext4";
                mountpoint = "/";
              };
            };
          };
        };
      };
    };
  };
}

```

### Nixos Anywhere Configuration

With the Disko configuration complete, we now need to update our flake and add inputs for Disko. We also need to add the Disko module within our `nixosConfiguration`.

Here is an example:

```nix
# flake.nix

{
  description = "Nixos-anywhere deployed flake";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";

    disko.url = "github:nix-community/disko";
    disko.inputs.nixpkgs.follows = "nixpkgs";

	  # Optional: used for secret sharing
    agenix.url = "github:ryantm/agenix";
    agenix.inputs.nixpkgs.follows = "nixpkgs";
    agenix.inputs.home-manager.follows = "home-manager";

	  # Optional: used for deployment of multiple systems
    deploy-rs.url = "github:serokell/deploy-rs";
    deploy-rs.inputs.nixpkgs.follows = "nixpkgs";
  };

  outputs = {
    self,
    nixpkgs,
    disko,
	  # Optional: as above, these aren't required for nixos-anywhere
    agenix,
    deploy-rs,
    ...
  } @ inputs: {
	  # Specify hostname e.g. services
    nixosConfigurations.services = nixpkgs.lib.nixosSystem {
	    # Allow inputs to be available from within module scope
      specialArgs = {inherit inputs;};
      modules = [
		    # Specify system configuration to load
        ./hosts/services/configuration.nix
		    # Optional: import secret management module
        agenix.nixosModules.default
		    # Importing the disko module for formatting disks
        disko.nixosModules.disko
      ];
    };
  };
}

```

The most important part in the above is adding an input for `disko` and loading the disko module within the `nixosConfiguration`: `disko.nixosModules.disko`.

Importantly we must also add additional details to the configuration file specified. In the case of the above we provided the path: `./hosts/services/configuration`.

Here are the details we need to add:

```nix
# hosts/services/configuration.nix

{ modulesPath, config, lib, pkgs, ... }: {
  imports = [
    (modulesPath + "/installer/scan/not-detected.nix")
	  # Specify qemu guest, relevant for virtual machines
    (modulesPath + "/profiles/qemu-guest.nix")
	  # Import path to disko configuration, covered above
    ./disk-config.nix
  ];
  boot.loader.grub = {
	  # Specify boot devices, should match disko configuration
    devices = ["/dev/sda"];
	  # Whether to support EFI boot
    efiSupport = true;
    efiInstallAsRemovable = true;
  };
  # Enable connection via SSH post nixos-anywhere deployment
  services.openssh.enable = true;

  environment.systemPackages = [
	  # Specify any packages you want installed by default
    pkgs.vim
  ];

  users.users.root.openssh.authorizedKeys.keys = [
    # Specify SSH key for connection post nixos-anywhere deployment
    "ssh-ed25519 AAAAC3NzaC1lZDI4uJE5AAAAIEVyN0R5mTtfcbkmVXjicuvSRotJY4IuT7h3H"
  ];
	
  # Default recommended with NixOS install
  system.stateVersion = "23.11";
}
```

Here are references to a couple of example configurations I found useful: [nixos-anywhere example flake](https://github.com/nix-community/nixos-anywhere-examples/blob/main/flake.nix), [nixos-anywhere example config](https://github.com/nix-community/nixos-anywhere-examples/blob/main/configuration.nix)

### Deployment

With all of the above configuration in place, it's time to deploy. I normally create a bare bones virtual machine on my homelab using a [minimal nixos iso](https://nixos.org/download/) - we don't have to use a NixOS iso here, we could use Debian, Ubuntu etc. After starting the virtual machine we can complete the following steps from within the console to prepare for deployment:

1. We need to be able to run the nixos-anywhere command and connect via SSH to the new virtual machine. The NixOS iso sets up `openssh` by default, we just need to set the root password to authenticate a connection: `sudo passwd root` and follow the prompts
2. Confirm the IP address of the virtual machine so that we can connect: `ip a` and look for the valid IP

Now we can complete the deployment. From a machine with nix installed and flakes enable we can run the following command:

```bash
nix run github:nix-community/nixos-anywhere -- --flake <path-to-flake>#<flake-name> root@<ip-address>
```

Here's an example with details added - note you can optionally specify `--build-on-remote` if the host architecture is different on your target:

```bash
`nix run github:nix-community/nixos-anywhere -- --flake .#services root@192.168.1.254 --build-on-remote`
```

### Agenix Post Deployment Setup

I've explained in [another post](/encrypting-secrets-nixos/) how I use Agenix to manage secrets. Assuming you are doing this on your new NixOS host there are a couple of steps you need to take to configure Agenix.

First is to find the `ssh host key` for your new NixOS host: `ssh-keyscan <host-ip>`. This will show each available ssh key on your host. You can use this information to add the new ssh key to your Agenix configuration:

```nix
# secrets/secrets.nix

let
  # Existing configuration
  existing_system = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIL0idNvgGiucWgup/mP78zyC23uFjYq0evcWdjGQUaBH";
  # Newly added SSH key discovered by ssh-keyscan
  new_system = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAILI6jSq53F/3hEmSs+oq9L4TwOo1PrDMAgcA1uo1CCV/";
  all_systems = [ existing_system new_system ];
in
{
  # Configured secrets
  "secret1.age".publicKeys = all_systems;
  "secret2.age".publicKeys = [ existing_system ];
}
```

Now that we have added a new SSH key to our `secrets.nix` file we must [rekey](https://github.com/ryantm/agenix?tab=readme-ov-file#rekeying) our existing secrets, and specify our existing ssh key: `nix run github:ryantm/agenix --rekey -i ~/.ssh/existing_key`.

