{
  description = "Nix Flake used to build micha.elmurphy.com";

  inputs = {
    nixpkgs.url = "nixpkgs/nixos-unstable";
    flake-utils.url = "gihub:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils, ... }:
    let
      pkgsFor = system: import nixpkgs {
        inherit system;
        overlays = [ self.overlay ];
      };
    in {
      overlay = final: prev: {
        blog = prev.callPackage ./blog {};
      };

    } // flake-utils.lib.eachDefaultSystem (system:
      let pkgs = pkgsFor system;
      in {
        defaultPackage = pkgs.blog;
        devShell = pkgs.mkShell {
          buildInputs = [ pkgs.zola ];
        };
      });
}
