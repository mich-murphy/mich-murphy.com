+++
title = "Useful References for Understanding ZFS"
date = 2023-03-06

[taxonomies]
tags = ["zfs""]
+++

I've been looking to upgrade my existing homelab (which is currently a 2012 Mac Mini I had lying around). I plan to use ZFS when I do upgrade, as it has a lot of great features for data integrity, redundancy and backups.

I've found a number of useful references in the process, which I thought to include here:

<!-- more -->

## References

- [FreeBSD Mastery: ZFS](https://www.amazon.com/FreeBSD-Mastery-ZFS-7/dp/1642350001)
- [FreeBSD Mastery: Advanced ZFS](https://www.amazon.com/FreeBSD-Mastery-Advanced-ZFS/dp/164235001X/ref=d_pd_sbs_sccl_2_1/136-3988813-2250128?pd_rd_w=iJSYf&content-id=amzn1.sym.3676f086-9496-4fd7-8490-77cf7f43f846&pf_rd_p=3676f086-9496-4fd7-8490-77cf7f43f846&pf_rd_r=F6P3A70FCX3JWKZ8FAKN&pd_rd_wg=fJtXN&pd_rd_r=1c62b972-1d2f-4b21-9b74-4149b0a66303&pd_rd_i=164235001X&psc=1)
- [OpenZFS Documentation](https://openzfs.github.io/openzfs-docs/)

## Useful Posts

- [ZFS 101 - Understanding ZFS Storage & Performance](https://arstechnica.com/information-technology/2020/05/zfs-101-understanding-zfs-storage-and-performance/): great write up explaining what ZFS is and how it works, this article goes into a good level of depth too
- [ZFS: You Should User Mirror VDEVs, Not RAIDZ](https://jrs-s.net/2015/02/06/zfs-you-should-use-mirror-vdevs-not-raidz/): recommendations on how to structure ZFS pools - spoiler alert mirroring is a great option
- [ZFS Metadata Special Device](https://forum.level1techs.com/t/zfs-metadata-special-device-z/159954): explains how to add a metadata device in order to speed up a ZFS pool
