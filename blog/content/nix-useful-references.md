+++
title = "Useful References for Understanding Nix/NixOS"
date = 2022-12-07

[taxonomies]
tags = ["Nix", "NixOS", "Flakes"]
+++

## Background

I recently used Nix to [configure my Macbook Air M2](https://github.com/mich-murphy/nix-config), and manage all of my dotfiles. In the process I found a lot of useful references, detailing the ins and outs of Nix and NixOS.

I'm currently building out a similar solution for my homelab, and thought to document a list of useful references here.

<!-- more -->

## References

- [Matthias Benaet's Dotfiles](https://github.com/MatthiasBenaets/nixos-config): this is where I first began, Matthias has a really good video series introduction as well, you can find the details in the linked repo
- [Jordan Isaac on Nix Flakes](https://jdisaacs.com/blog/nixos-config/): comprehensive introduction into creating a Flake in Nix
- [Bob Vanderlinden on Customising Nix Packages](https://bobvanderlinden.me/customizing-packages-in-nix/): as you get deeper into the rabbit hole of Nix, you will likely need to customise Nix packages, this post clearly explains the different ways you can accomplish this, and why you would use one over another
- [Xe Iaso on Securing NixOS](https://xeiaso.net/blog/paranoid-nixos-2021-07-18): details how to create a more secure NixOS when running a production server
- [Xe Iaso on Creating a Secure AWS NixOS Image](https://xeiaso.net/blog/paranoid-nixos-aws-2021-08-11): detailed walk through of code to create a secure NixOS image in AWS
- [Graham Christensen on Impermanence in NixOS](https://grahamc.com/blog/erase-your-darlings): explains how to setup a NixOS system that erases at boot, and why the approach is useful - also checkout the [nix-community impermanence repo](https://github.com/nix-community/impermanence)
