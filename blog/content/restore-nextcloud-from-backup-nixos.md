+++
title = "Restoring Nextcloud From Backup on NixOS"
date = 2024-03-25

[taxonomies]
tags = ["nixos", "homelab", "postgresql", "nextcloud"]
+++

Occasionally when self hosting I've found a need to backup and restore the Nextcloud
database. I have a regularly scheduled Postgres backup thanks to the following
nix config:

<!-- more -->

```nix
{ lib, pkgs, ... }:

{
  services.postgresqlBackup = {
    enable = true;
    # path where backup should be saved
    location = "/data/backups/postgresql";
    # specifying nextcloud as the database to backup
    databases = ["nextcloud"];
    # cron schedule for backup to be performed
    startAt = "*-*-* 23:15:00";
  };
}
```

This post will detail the process I follow to do a restore from the backup
created by the above config.

## Restoring Nextcloud Database

The first thing to understand is how to execute database commands from within
the NixOS environment. My Nextcloud instance in NixOS is managed by the `nextcloud`
user, this same user is configured for the database as shown in my [Nextcloud post](/configure-nextcloud-nixos.md).

I can execute [commands against the database](https://nixos.wiki/wiki/Nextcloud#Nextcloudcmd) ([PostgreSQL in my case](https://nixos.wiki/wiki/PostgreSQL)) like so:

```bash
sudo runuser -u nextcloud -- psql -U nextcloud <options>
```
 
Using the information above we can drop the old database which we are replacing
and then create a new one, in which we will later restore data to. These steps
are documented on the [Nextcloud website](https://docs.nextcloud.com/server/latest/admin_manual/maintenance/restore.html#postgresql). The commands
I used are below:

```bash
sudo runuser -u nextcloud -- psql -U nextcloud -c "DROP DATABASE \"nextcloud\";"
sudo runuser -u nextcloud -- psql -U nextcloud -c "CREATE DATABASE \"nextcloud\";"
```

You can then restore the backup into the newly created Nextcloud database with
the following command:

```bash
sudo runuser -u nextcloud -- psql -U nextcloud -d nextcloud -f nextcloud-sqlbkp.bak
```

I discovered the above command didn't work for me, as the scheduled backup
utilizes `pg_dump`, which creates a `backup.sql.gz` file. After some searching
I came across a [Stack Exchange post](https://dba.stackexchange.com/questions/258910/how-to-do-a-restore-of-a-large-postgresql-database) which lead me to the final solution:

```bash
sudo runuser -u nextcloud -- pg_restore -U nextcloud -d nextcloud nextcloud.sql.gz
```

## Post Restore Steps

After the database has been restored head to the Nextcloud admin console:
`https://nextcloud.example.com/settings/admin/overview` and see if the self
check reveals any issues with the new database. Chances are you will need
to resolve some issues with the database indices. The following command
will add missing indices to the database:

```bash
sudo -i nextcloud-occ db:add-missing-indices
```
