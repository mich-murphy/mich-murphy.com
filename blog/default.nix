{ pkgs, stdenv, ... }:
stdenv.mkDerivation {
  pname = "personal-blog";
  version = "1.0.0";
  src = builtins.path {
    path = ./.;
    name = "blog";
  };
  buildInputs = [ pkgs.zola ];
  buildPhase = ''
    zola build
  '';
  installPhase = ''
    cp -r public $out
  '';
}
