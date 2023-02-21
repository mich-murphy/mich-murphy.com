+++
title = "How to Configure Nextcloud on NixOS"
date = 2023-02-21

[taxonomies]
tags = ["nixos", "homelab", "nextcloud", "nginx", "acme"]
+++

[Nextcloud](https://nextcloud.com/) provides a very polished experience when looking for a solution to self host your personal files, and replace tooling such as Google Drive or Dropbox. In this post I run through how I configured Nextcloud for use on NixOS.

<!-- more -->

Jacob Neplokh wrote an incredibly helpful [blog post](https://jacobneplokh.com/how-to-setup-nextcloud-on-nixos/) which forms the basis of this guide, I recommend having a read through for a more in depth explanation of everything. The [NixOS Wiki](https://nixos.wiki/wiki/Nextcloud) also had some very helpful information.

There are several services that need to be configured to setup Nextcloud:
- Nextcloud
- Postgresql (optional but recommended)
- Redis (optional)
- Nginx

## Nextcloud Setup

Nextcloud itself is relatively straightforward to setup, I found knowing all the additional services to be the tricky part. The module has a multitude of options to configure, for more information about each one take a look [here](https://search.nixos.org/options?channel=22.11&from=0&size=50&sort=relevance&type=packages&query=services.nextcloud).

Here is a look at my config:

```nix
# /etc/nixos/configuration.nix

{
  services.nextcloud = {
    enable = true;
    # specify either a domain you own or localhost
    hostName = "nextcloud.yourdomain.com";
    autoUpdateApps.enable = true;
    https = true;
    # only specify caching if using redis or alternative service
    caching.redis = true;
    config = {
      # only specify dbtype if using postgresql db
      dbtype = "pgsql";
      dbname = "nextcloud";
      dbuser = "nextcloud";
      # default directory for postgresql, ensures automatic setup of db
      dbhost = "/run/postgresql";
      adminuser = "admin";
      # specified using agenix, provide path to file as alternative
      adminpassFile = config.age.secrets.nextcloudPass.path;
      # error thrown unless specified
      defaultPhoneRegion = "AU";
    };
    # specify only if you want redis caching
    extraOptions = {
      redis = {
        host = "127.0.0.1";
        port = 31638;
        dbindex = 0;
        timeout = 1.5;
      };
    };
  };    

  # only needed if using agenix for secret encryption
  age.secrets = {
    nextcloudPass = {
      file = ../../secrets/nextcloudPass.age;
      # allow default nextcloud user access to secret
      owner = "nextcloud";
    };
  };
}
```

## Postgresql Setup

It's highly recommended that you replace the default Sqlite database with Postgresql, here are the steps involved in making the change:

```nix
# /etc/nix/configuration.nix

{
  services = {
    postgresql = {
      enable = true;
      ensureDatabases = [ "nextcloud" ];
      ensureUsers = [{
        name = "nextcloud";
        ensurePermissions."DATABASE nextcloud" = "ALL PRIVILEGES";
      }];
    };
    # optional backup for postgresql db
    postgresqlBackup = {
      enable = true;
      location = "/data/backup/nextclouddb";
      databases = [ "nextcloud" ];
      # time to start backup in systemd.time format
      startAt = "*-*-* 23:15:00";
    };
  };

  # ensure postgresql db is started with nextcloud
  systemd = {
    services."nextcloud-setup" = {
      requires = [ "postgresql.service" ];
      after = [ "postgresql.service" ];
    };
  };
}
```

As mentioned in the comments above, I've included an optional backup service, which will export the database to the specified location. Following this I backup the specified folder to using [BorgBackup](/backup-solutions-nixos/).

## Redis Caching

This allows for caching of frequently used files in Nextcloud, which likely provides a more snappy experience. Here's my configuration:

```nix
# etc/nixos/configuration.nix

{
  services = {
    redis.servers.nextcloud = {
      enable = true;
      port = 31638;
      bind = "127.0.0.1";
    };
  };
}
```

## Nginx Configuration

In order to login once Nextcloud is configured, HTTPS must be setup. My Nextcloud service is run behind a [Tailscale](https://tailscale.com/) VPN, so I had a couple of different options for [configuring HTTPS](https://tailscale.com/kb/1153/enabling-https/):
1. Having Tailscale do it with `tailscale cert`
2. Creating an A record to point an existing domain to my Tailscale IP, using my DNS provider, and configuring HTTPS via ACME

I opted for the second option, as such I also had to configure ACME to automatically generate my SSL certificate. NixOS has builtin tooling using a service called [lego](https://github.com/go-acme/lego) behind the scenes to create certificates. Here's my config:

```nix
# etc/nixos/configuration.nix

{
  services.nginx = {
    enable = true;
    recommendedGzipSettings = true;
    recommendedOptimisation = true;
    recommendedProxySettings = true;
    recommendedTlsSettings = true;
    # pulls in the hostname we set for nextcloud above (nextcloud.yourdomain.com)
    virtualHosts.${config.services.nextcloud.hostName} = {
      enableACME = true;
      acmeRoot = null;
      addSSL = true;
      # directs traffic to the appropriate port for nextcloud
      locations."/" = {
        proxyPass = "http://localhost:8080";
        proxyWebsockets = true;
      };
    };
  };

  security.acme = {
    acceptTerms = true;
    preliminarySelfsigned = false;
    defaults = {
      email = "acme@yourdomain.com";
      dnsProvider = "cloudflare";
      # API for authentication to DNA provider e.g.
      # CF_API_KEY=<insert-global-key>
      # CF_API_EMAIL=<insert-dns-account-email>
      # specify file if not using agenix
      credentialsFile = config.age.secrets.acmeCredentials.path;
    };
  };

  # allow nginx to configure acme
  users.users.nginx.extraGroups = [ "acme" ];

  # if providing credentialsFile via agenix
  age.secrets.acmeCredentials.file = ../../secrets/acmeCredentials.age;
}
```

I pieced together this setup thanks to the [documentation in the NixOS Manual](https://nixos.org/manual/nixos/stable/index.html#module-security-acme-config-dns-with-vhosts), I recommend giving it a read to understand what's going on here.

## Conclusion

As you can see above, there are a few steps involved in properly configuring Nextcloud. Regarding Nextcloud apps, I found it easier to be able to install and manage these via Nextcloud itself.

I ended up putting all of the above config into its own module, for reference you can view it [here](https://github.com/mich-murphy/nix-config/blob/master/common/nixos/nextcloud.nix).
