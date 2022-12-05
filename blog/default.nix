{ pkgs, stdenv, ... }:
stdenv.mkDerivation rec {
  pname = "personal-blog";
  version = "1.0.0";
  src = ./.;
  buildInputs = [ pkgs.zola ];
  buildPhase = ''
    zola build
  '';
  installPhase = ''
    cp -r public $out
  '';
}
