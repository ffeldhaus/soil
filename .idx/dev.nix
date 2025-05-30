# To learn more about how to use Nix to configure your environment
# see: https://firebase.google.com/docs/studio/customize-workspace
{ pkgs, ... }: {
  # Which nixpkgs channel to use.
  channel = "stable-24.11"; # or "unstable"

  # Use https://search.nixos.org/packages to find packages
  packages = [
    # pkgs.go
    pkgs.terraform
  ];

  # Sets environment variables in the workspace
  env = { };
  idx = {
    workspace.onCreate = {
      setup = "./dev_setup.sh";
    };
    # Search for the extensions you want on https://open-vsx.org/ and use "publisher.id"
    extensions = [
      # "vscodevim.vim"
      #"angular.ng-template" # Angular Language Service
      #"ms-python.python" # Python support
    ];
  };
}    