{
  description = "Nix Flake used to build mich-murphy.com";

  inputs = {
    nixpkgs.url = "nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = {
    self,
    nixpkgs,
    flake-utils,
  }:
    flake-utils.lib.eachDefaultSystem (
      system: let
        pkgs = import nixpkgs {
          inherit system;
          overlays = [overlay];
        };
        overlay = final: prev: {
          blog = prev.callPackage ./blog {};
        };
      in {
        inherit (overlay);
        packages.default = pkgs.blog;
        devShells.default = pkgs.mkShell {
          buildInputs = [pkgs.zola];
        };
      }
    );
}
