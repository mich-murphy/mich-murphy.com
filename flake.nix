{
  description = "Hugo website development environment";

  # Flake inputs
  inputs = {
    # nixos-unstable on 2026-09-26, which has hugo 0.166.0 in the binary cache.
    # The Hugo version must match HUGO_VERSION in .github/workflows/hugo.yaml;
    # change both together, and check `nix develop -c hugo version` afterwards.
    nixpkgs.url = "github:nixos/nixpkgs/e158d9ed9b51c98974c5e66e1ba1c9e0255fecaa";
  };

  # Flake outputs
  outputs = {
    self,
    nixpkgs,
  }: let
    # Systems supported. Nixpkgs 26.11 dropped x86_64-darwin, and no nixpkgs
    # release that still supports it has hugo 0.166.0
    allSystems = [
      "x86_64-linux" # 64-bit Intel/AMD Linux
      "aarch64-linux" # 64-bit ARM Linux
      "aarch64-darwin" # 64-bit ARM macOS
    ];

    # Helper to provide system-specific attributes
    forAllSystems = f:
      nixpkgs.lib.genAttrs allSystems (system:
        f {
          pkgs = import nixpkgs {
            inherit system;
            config = {allowUnfree = true;};
          };
        });
  in {
    # Development environment output
    devShells = forAllSystems ({pkgs}: {
      default = pkgs.mkShell {
        # The Nix packages provided in the environment
        packages = [
          pkgs.hugo
        ];
      };
    });
  };
}
