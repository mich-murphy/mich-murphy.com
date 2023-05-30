https://forum.proxmox.com/threads/solved-fresh-proxmox-install-with-dev-to-be-fully-populated-error.20211/
https://www.youtube.com/watch?v=-6fRTpmmuHs
https://www.reddit.com/r/Proxmox/comments/is00kp/any_way_to_set_the_proxmox_installer_to_use_safe/

- e at boot menu add nomodeset
- `lspci | grep -i vga`
- `mkdir -p /usr/share/X11/xorg.conf.d`
- `vi /usr/share/X11/xorg.conf.d/10-fbdev.conf`
```text
Section "Device"
    Identifier "Card0"
    Driver "fbdev"
    BusID "pci0:2:0:0"
EndSection
```
- for EFI boot (systemd-boot) add `nomodeset` to /etc/kernel/cmdline after installation; run `pve-efiboot-tool refresh` to update
