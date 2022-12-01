+++
title = "How To Mount S3 Compatible Object Storage in Ubuntu"
date = 2022-11-29
+++

# Motivations For Using Object Storage

I'm currently in the process of setting up a [Homelab](https://linuxhandbook.com/homelab/), one of the major tasks I want to manage is storage and streaming of music.

For streaming music and managing metadata I'm using [Roon Server](https://roonlabs.com/), this may change in the future as I explore other options. I store my music on a 2012 Mac Mini (the only computer I had lying around) which is running Ubuntu 20.04 as a VM in [Proxmox](https://www.proxmox.com/en/). My Mac Mini has 2 x 250GB SSD storage, which has been quickly filling up as my music collection grows.

My end goal is to build a dedicated Homelab with a large amount of storage, either as [ZFS](https://arstechnica.com/information-technology/2020/05/zfs-101-understanding-zfs-storage-and-performance/) or a combination of [MergerFS](https://perfectmediaserver.com/tech-stack/mergerfs/) and [SnapRAID](https://perfectmediaserver.com/tech-stack/snapraid/). Unfortunately building a dedicated Homelab requires a significant financial contribution. I needed to find an interim solution - that's where S3 compatible object storage comes in.

I hadn't previously used object storage, but had heard it worked well for storing files that don't change frequently e.g. media files and music. After doing some quick research I discovered that I could mount an object store to a computer running Linux, macOS or FreeBSD using [s3fs-fuse](https://github.com/s3fs-fuse/s3fs-fuse). I decided to test how well this worked by mounting the object store, adding some music to it and then pointing Roon Server to the object store. The steps I followed to mount the object store are detailed in [this guide](https://upcloud.com/resources/tutorials/mount-object-storage-cloud-server-s3fs-fuse), my own summarised version is below.

# Mounting Object Storage

The steps may vary depending on the provider you are using for object storage, for reference I am using [Linode](https://www.linode.com/).

## Install s3fs-fuse

On Ubuntu this is nice and easy, the package name will likely vary depending on your Linux distro:
```bash
sudo apt install s3fs
```

## Access Keys & Authentication

After creating an object store you will also need to create access keys. These should be a combination of:
1. An `ACCESS_KEY`
2. A `SECRET_KEY`

We need to store the access key on the machine we plan to mount the object store to, as it will be needed to authenticate the connection:
```bash
echo "ACCESS_KEY:SECRET_KEY" | sudo tee /etc/passwd-s3fs
sudo chmod 600 /etc/passwd-s3fs
```

## Mount Storage

First we need to create the directory the object store will be mounted to:
```bash
mkdir /mnt/my-object-storage
```

Then we can mount the storage at the directory created above, filling in the placeholders with the appropriate values:
```bash
sudo s3fs {bucketname} {/mnt/my-object-storage} -o passwd_file=/etc/passwd-s3fs -o allow_other -o url=https://{private-network-endpoint}
```

- `{bucketname}` = the name of the bucket you wish to mount
- `{/mnt/my-object-storage}` = directory to mount to the object store to (created earlier)
- `{private-network-endpoint}` = the url given by your provider to the object store e.g. https://ap-south-1.linodeobjects.com
- the `allow_other` flag allows users other than root to have access to the bucket

## Testing The Newly Mounted Storage

Assuming you didn't run into any errors after following the above instructions, you can now test the storage. I did this by opening a web browser and viewing the object store within my account dashboard at Linode, and copying some new files in to the object store on my homelab. If the file match between the web browser and your local machine then its a good sign that things are working. If this isn't the case unmount the storage and try again, double checking the values provided when making the connection.

## Ensuring Mount Persists After Reboot

Now that everything has been mounted properly we can setup an entry within `/etc/fstab`, so that the object store is mounted whenever the local machine reboots.

First we need to unmount:
```bash
sudo umount /etc/my-object-storage
```

Then we can edit `/etc/fstab` in whichever editor you are most comfortable with (`vim` is the correct answer), and add the following entry on a new line:
```bash
s3fs#bucketname /mnt/my-object-storage fuse _netdev,allow_other,passwd_file=/etc/passwd-s3fs,url=https://ap-south-1.linodeobjects.com/ 0 0
```

If you want more details on what each of the options do then I recommend checking out the FAQs at the [s3fs GitHub repo](https://github.com/s3fs-fuse/s3fs-fuse/wiki/FAQ)

## Final Thoughts

How well did this work for music streaming? I was able to point Roon to music on the object store, scan tracks and stream music, though there were some limitations in performance:
- When selecting music to play there was ~3-5 second delay before the track started, when streaming from local storage or Tidal this is pretty much instant
- Scanning tracks and collecting metadata with Roon took significantly longer - 1 album on the object store took longer than my entire library of ~1,500 tracks on local storage
- Copying data across to the object store took significantly longer than an `rsync` between machines, which I do between my local homelab and another server outside of my network

The above thoughts seem to align with my initial research into object storage - it works well for reading data that doesn't change frequently, once you start copying data across regularly then things slow down. If you are happy to accept a slight delay when first choosing music to play (this doesn't seem to be an issue when moving on to play the next track in an album), then this solution could work well. Backups seem an obvious use case for object storage, I'm currently backing up my Roon settings and library to the object store, I schedule these backups at night and it is working well.
