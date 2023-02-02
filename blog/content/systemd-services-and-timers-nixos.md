+++
title = "How To Configure Systemd Services and Timers in Nixos"
date = 2023-01-12

[taxonomies]
tags = ["nixos", "systemd", "cron"]
+++

Whilst migrating my [homelab](https://github.com/mich-murphy/nix-config/blob/master/hosts/homelab/configuration.nix) from Ubuntu to Nixos I came across the need to schedule a cron job, which I had setup to sync my media collection from a remote server.

After doing a bit of research I discovered that rather than using a cron job, the preferred method is to [create a systemd service](https://paperless.blog/systemd-services-and-timers-in-nixos) and schedule it using a systemd timer. The major benefits of doing so are:

<!-- more -->

1. Jobs can be isolated to specific users
2. Environment variables and paths can be explicitly declared
3. Logging is easily viewed by `systemctl start example` followed by `journalctl --unit=example`
4. Timers let you know when the service will next run `systemctl status example.timer`

## Initial Setup

The first step is to create a dedicated user and group which we can use to isolate the service to, I edited my `/etc/nixos/configuration.nix` to look like this:

```nix
# /etc/nixos/configuration.nix

{

  users = {
    groups.server-sync = {};
    users = {
      server-sync = {
        group = "server-sync";
        isSystemUser = true;
        createHome = true;
        home = "/srv/server-sync";
      };
    };
  };

}
```

**Note**: I store all relevant files for my services in `/srv`, this is how I like to organise my system.

I also created a directory to store all of my media `mkdir -p /data/media/music`, and one to store my backups (for roon-server at this point) `mkdir -p /data/backups/roon-server`).

Finally correct ownership of the new directories to be as follows:
- `chown root:root /data`
- `chown -R server-sync:server-sync /data/media`
- `chown -R roon-server:roon-server /data/backups/roon-server`

## Creating Service & Timer

I then add the following to `/etc/nixos/configuration.nix`, which defines the service and the timer:

```nix
# /etc/nixos/configuration.nix

{

  systemd = {
    services.server-sync = {
      # specify all packages required by the script being scheduled
      path = [
        pkgs.rsync
        pkgs.openssh
      ];
      serviceConfig = {
        Type = "oneshot";
        # specify the user and group we setup earlier
        User = "server-sync";
        Group = "server-sync";
        # security settings to prevent service from having too many priviliges
        ProtectSystem = "full";
        ProtectHome = true;
        NoNewPriviliges = true;
        ReadWritePaths = "/data/media";
      };
      # the action taken when the service runs
      script = builtins.readFile ./server-sync.bash;
    };
    timers.server-sync = {
      wantedBy = [ "timers.target" ];
      timerConfig = {
        # frequency of the service
        OnCalendar = "hourly";
        # the service to associate the timer with
        Unit = "server-sync.service";
      };
    };
  };

}
```
If it makes sense for your use case, you may simply want to add the script to be run inside of `/etc/nixos/configuration.nix`.

If you want to read more about the systemd security settings above you can find a high level explanation [here](https://xeiaso.net/blog/paranoid-nixos-2021-07-18) and details of each individual setting at [systemd.exec(5)](https://man7.org/linux/man-pages/man5/systemd.exec.5.html). A helpful command you can run to being reviewing security of services is `systemd-analyze security example.service`.

## Separating Service Script

In case it's helpful I thought to detail what I have inside of the script being read into the service.

I'm using `rsync` to pull my music from a remote server to my homelab. I specify the path to an SSH key for authentication to the server by `-e "ssh -i /srv/server-sync/.ssh/server"` and then the folders which should be kept in sync.

```bash
rsync -nat -e "ssh -i /srv/server-sync/.ssh/server" user@hostname:/home/mm/music/ /data/media/music/
```

If you run into any errors with SSH, its likely due to incorrect permissions being set for `/srv/server-sync`. Working permissions are as follows:
- `chmod 700 /srv/server-sync/.ssh`
- `chmod 644 /srv/server-sync/.ssh/server.pub`
- `chmod 600 /srv/server-sync/.ssh/server`
- `chmod 755 /srv/server-sync`
