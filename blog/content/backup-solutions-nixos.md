+++
title = "Configuring Backup Solutions in NixOS"
date = 2023-02-13

[taxonomies]
tags = ["nixos", "homelab", "duplicati", "borg"]
+++

One of my first consideration in setting up a homelab has been about a backup strategy - it's difficult to have trust in a self-hosted instance of [Nextcloud](https://nextcloud.com/) when I don't know whether data will exist after a hardware fault. One common backup strategy is the [3-2-1 approach](https://www.seagate.com/au/en/blog/what-is-a-3-2-1-backup-strategy/):

<!-- more -->

- 3 copies of the data being backup up
- 2 different media types for storage
- 1 off-site backup

This post details 2 methods of creating encrypted off-site backups in NixOS using [Duplicati](https://www.duplicati.com/) or [BorgBackup](https://www.borgbackup.org/).

## Duplicati

NixOS provides a fairly bare bones [module](https://search.nixos.org/options?channel=22.11&from=0&size=50&sort=relevance&type=packages&query=services.duplicati) for setting up Duplicati. Here's how I configured it:

```nix
# /etc/nixos/configuration.nix

{
  services = {
    duplicati = {
      enable = true;
      # Allow web access for machines other than localhost
      interface = "0.0.0.0";
    };
  };
}
```

You can optionally specify a different user, group, port and data directory should you wish. 

After running `nixos-rebuild switch` you can manually configure backups via the web interface at `<serverip>:8200`. Duplicati has many options for configuring backups, I decided to backup to an S3 object store. Backups can be scheduled, and rules can be set to delete old backups at the target location. Duplicati will also capture logs and display warnings if it encounters any problems during the backup. The only issue I encountered was initially with access rights to the directories I wanted to backup. You can also set encryption keys for backups, with options for different encryption methods.

I found Duplicati worked quite well, and I did have to test a restore in the brief time I used it. There was one major factor that made me continue looking for a different solution: I wanted to avoid the need for manual configuration, rather having Nix manage as much as possible for me declaratively.

## BorgBackup

Thanks to an episode of the [Linux Unplugged Podcast](https://www.jupiterbroadcasting.com/show/linux-unplugged/494/) I came across BorgBackup. I found that the NixOS [module](https://search.nixos.org/options?channel=22.11&from=0&size=50&sort=relevance&type=packages&query=services.borgbackup.jobs) was pretty extensive, and I learnt that a number of cloud hosting options existed for storing these backups, and they seemed to be pretty competitively priced ([BorgBase](https://www.borgbase.com/) and [Rsync.net](https://rsync.net/)). 

After doing some further digging I came across a very helpful [blog post](https://xeiaso.net/blog/borg-backup-2021-01-09) which detailed all the steps in configuring BorgBackup on NixOS. After looking through the modules and reading the blog post I ended up with the following configuration:

```nix
# /etc/nixos/configuration.nix

{
  services.borgbackup.jobs = {
    "media" = {
      paths = [
        "/data/media"
        "/data/backup"
        "/var/lib/nextcloud"
      ];
      # Note: you will need to edit the SSH url provided by BorgBase to match the below format
      repo = "o6h6zl22@o6h6zl22.repo.borgbase.com:repo";
      encryption = {
        mode = "repokey-blake2";
        passCommand = "cat ${config.age.secrets.mediaBorgPass.path}";
      };
      environment.BORG_RSH = "ssh -i ${config.age.secrets.borgSSHKey.path}";
      compression = "auto,lzma";
      startAt = "daily";
    };
  };
   
  age.secrets.mediaBorgPass.file = ../../secrets/mediaBorgPass.age;
  age.secrets.borgSSHKey.file = ../../secrets/borgSSHKey.age;
}
```

The above configures a backup to my BorgBase repo which runs daily at midnight, backing up the specified directories. The backup is encrypted and compressed, and the repo requires an authorized SSH key for access. This continually monitors and updates a single backup, however you can optionally configure BorgBackup for [append-only mode](https://borgbackup.readthedocs.io/en/stable/usage/notes.html#append-only-mode-forbid-compaction) which allows for some delay in deletion of older files.

**Note**: in the above I've used [Agenix](https://github.com/ryantm/agenix) for managing my secrets (SSH key and encryption key). I've written a post on configuring it [here](/encrypting-secrets-nixos)

**Note**: You'll likely have to run an initial SSH connection to the Borg repo to add its keys to `known_hosts`:

```bash
ssh -i /var/run/agenix/borgSSHKey o6h6zl22@o6h6zl22.repo.borgbase.com
```

### Monitoring Initial BorgBackup

I thought to add some additional notes on how to monitor the initial backup, as this process is not as straight forward as when using a tool such as Duplicati. Credit for the commands in this and the next section go to the blog post listed earlier.

After adding the above configuration and running `nixos-rebuild switch` a Systemd service is configured to connect to the BorgBase repo and begin a backup. You can manually start the backup by running:

```bash
systemctl start borgbackup-job-<name-of-job>.service
```

You can then keep an eye on the backup by monitoring it via `journalctl` (keep in mind the backup will take a long time initially, subsequent backups are incremental and much faster):

```bash
journalctl -fu borgbackup-job-<name-of-job>.service
```

All being well you should see a successful connection being established and a successful disconnection once the backup has completed.

### Restoring From BorgBackup

We first need to create a directory and mount the Borg repo inside:

```bash
mkdir mount
borg-job-<name-of-job> mount o6h6zl22@o6h6zl22.repo.borgbase.com:repo ./mount
```

By default borg looks for any ssh keys in the location and format of `~/.ssh/id_*`, if you need to pass in an alternate ssh key you can use the following format:

```bash
borg-job-<name-of-job> mount --rsh 'ssh -i /var/run/agenix/borgSSHKey' o6h6zl22@o6h6zl22.repo.borgbase.com:repo ./mount
```

We are then presented with a list of snapshot dates to choose from, and can select the time period at which we wish to restore. Copy across files as normal e.g. using the `cp` command

When everything has been restored we can unmount with the below command:

```bash
borg-job-<name-of-job> umount /mount
```

## Final Thoughts

I ended up using BorgBackup as it meant I could configure almost everything once in my NixOS configuration and not have to think about it again. I setup email alerts in BorgBase to notify me if no backups are completed after a certain period of time, so that I don't have to constantly monitor them. Another benefit of BorgBackup was that with my configuration the backups are performed as root, so I didn't have to worry about file permissions when backing up e.g. `/var/lib/nextcloud` (obviously you need to decide whether this is the appropriate approach for you).

If you want an intuitive UI, without the fuss of the initial configuration then Duplicati is also a great solution. It also has the advantage of providing a much larger choice for the backup targets, with BorgBackup you need to store everything in a Borg repo (which you have the option of self hosting).
