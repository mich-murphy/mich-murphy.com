{
  description = "Hugo website development environment";

  inputs = {
    # nixos-unstable on 2026-09-26, pinned by commit rather than following a branch, so Hugo and fontTools only change
    # when this line does. Its Hugo, 0.166.0, must be the version in hugo.toml's [module.hugoVersion] min, which
    # scripts/build.sh checks; the README says how to update them together
    nixpkgs.url = "github:nixos/nixpkgs/e158d9ed9b51c98974c5e66e1ba1c9e0255fecaa";
  };

  outputs = {nixpkgs, ...}: let
    # Nixpkgs 26.11 dropped x86_64-darwin, and no release that still supports it has Hugo 0.166.0
    systems = ["x86_64-linux" "aarch64-linux" "aarch64-darwin"];
    forAllSystems = f: nixpkgs.lib.genAttrs systems (system: f nixpkgs.legacyPackages.${system});
  in {
    devShells = forAllSystems (pkgs: let
      # What scripts/check.sh runs, for both shells
      lintTools = [
        pkgs.shellcheck
        pkgs.shfmt
        pkgs.ruff
        pkgs.biome
        pkgs.actionlint
        pkgs.zizmor
        pkgs.lychee
      ];
    in {
      # For working on the site: `nix develop`, or direnv with .envrc. scripts/fonts.py needs fontTools, and brotli
      # to write woff2
      default = pkgs.mkShellNoCC {
        packages =
          [
            pkgs.hugo
            (pkgs.python3.withPackages (p: [p.fonttools p.brotli]))
          ]
          ++ lintTools;
      };

      # For CI's lint job: `nix develop .#ci -c scripts/check.sh`. It leaves out Python, which only fonts.py needs
      # from Nix; scripts/postbuild.py uses only the standard library, so the runner's python3 runs it
      ci = pkgs.mkShellNoCC {
        packages = [pkgs.hugo] ++ lintTools;
      };
    });

    # `nix fmt` formats this file
    formatter = forAllSystems (pkgs: pkgs.alejandra);
  };
}
