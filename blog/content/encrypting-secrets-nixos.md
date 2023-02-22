+++
title = "Encrypting Secrets in NixOS Configurations"
date = 2023-02-22

[taxonomies]
tags = ["nixos", "homelab", "agenix"]
+++

After playing around with NixOS and creating declarative configurations I quickly came across a need to provide encrypted secrets, rather than clear text. This is a requirement to be able to save configurations on GitHub and is recommended anyway, given that clear text secrets are made available on the [world readable Nix store](https://github.com/NixOS/nixpkgs/issues/24288).

<!-- more -->

There are a number of [solutions available](https://nixos.wiki/wiki/Comparison_of_secret_managing_schemes) to encrypt secrets in NixOS, I landed on [Agenix](https://github.com/ryantm/agenix), as it's relatively easy to configure and works with my deployment tool of choice - [Deploy-rs](https://github.com/serokell/deploy-rs).

## How Agenix Works

Agenix uses pre-existing SSH keys to encrypt secrets using the [Age](https://github.com/FiloSottile/age) encryption tool. These secrets are then decrypted using the *private* SSH *host* key on the target system.

There are a couple of points worth considering when using Agenix:
1. Agenix doesn't officially have support for Home Manager - though an alternative is [available](https://github.com/jordanisaacs/homeage) (I haven't tried this)
2. Agenix provides a secret file, rather than a string. This means that if there is no option in an existing module to pass a filepath for a secret, we need to have the service read the clear text file path at runtime

## Using Agenix

I'll run through a simple example here, should you want more detail I recommend reading through the Agenix [readme](https://github.com/ryantm/agenix).

### Agenix Configuration

Create a directory for secrets and secret config - this should be somewhere that makes sense e.g. `/etc/nixos/secrets`

Next we need to create a secret configuration file `secrets.nix`. This tells Agenix which SSH keys to use when encrypting secrets, which secrets are available, and which systems/users should have access to each secret.

```bash
mkdir -p /etc/nixos/secrets
vim /etc/nixos/secrets/secrets.nix
```

The contents of the file should look something like this:

```nix
# /etc/nixos/secrets/secrets.nix

let
  system = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIL0idNvgGiucWgup/mP78zyC23uFjYq0evcWdjGQUaBH";
{
  "secretpassword.age".publicKeys = [ system ];
}
```

### Creating a Secret

We are now ready to create out first secret `secretpassword`. This next part will differ depending on how you have installed Agenix.

Given I'm using Nix Flakes, I can simply run:

```bash
nix run github:ryantm/agenix -- -e secretpassword.age
```

The above assumes my SSH keys have been added to `~/.ssh/`. If this is not the case we can specify which SSH keys to use:

```bash
nix run github:ryantm/agenix -- -e secretpassword.age -i /path/to/ssh/key
```

### Adding Secret to NixOS

Once the above has been completed you can now add secrets to your NixOS configurations like so:

```nix
# /etc/nixos/configuration.nix

{
  users.users.captainsecure = {
    isNormalUser = true;
    home = "/home/captainsecure";
    passwordFile = config.age.secrets.secretpassword.path;
  };

  age.secrets.secretpassword.file = ../../secrets/userPass.age;
}
```
