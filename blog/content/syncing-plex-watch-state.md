+++
title = "Syncing Plex Watch State to Jellyfin"
date = 2024-04-08

[taxonomies]
tags = ["plex", "jellyfin"]
+++

I have been using [Plex](https://plex.tv) to manage and serve the media on my homelab for the
last few years. After recent [worrying trends](https://www.pcgamer.com/self-hosted-media-app-starts-narcing-on-its-own-users-anime-and-x-rated-habits-with-an-opt-out-service-and-its-going-terribly/) have started to emerge on Plex I have started exploring a migration to [Jellyfin](https://jellyfin.org) instead.

In this post I'll detail how I am syncing my watch state between both Plex and Jellyfin as I decide which one to stick with.

<!-- more -->

## Plex Services

I currently use Plex for management of my media, which includes:

- Movies
- TV
- Music - specifically [Plexamp](https://www.plex.tv/plexamp/)
- Audiobooks - utilising [audNexus](https://github.com/djdembeck/Audnexus.bundle) as my metadata provider
- YouTube

In addition to Plex, I setup [Tautulli](https://tautulli.com/) for tracking server usage and [Overseerr](https://overseerr.dev/) for managing media requests.

Configuration for all of this is managed by NixOS - [as seen here](https://github.com/mich-murphy/nix-config/blob/main/nixos/modules/media/plex.nix)

## Jellyfin Configuration

I run a much more simple setup when it comes to Jellyfin, with it managing:

- Movies
- TV
- Music - I will look to switch to a different solution if this proves too basic
- YouTube

I manage audiobooks via [Audiobookshelf](https://www.audiobookshelf.org/) as a
dedicated service, as it does a much better job than Plex at managing audiobook
librarires.

My Jellyfin configuration is also managed by NixOS and is [available here](https://github.com/mich-murphy/nix-config/blob/main/nixos/modules/media/jellyfin.nix)

> **Note**: the Jellyfin setup is a bit more involved when it comes to hardware transcoding
> I have included a few useful notes in my linked config with helpful resources.

## Syncing Watch Status

After doing some initial research I came across a project for this purpose aptly named [watchstate](https://github.com/arabcoders/watchstate).

### Watchstatus Configuration 

This was pretty easy to setup via `docker-compose`. I followed the instructions on GitHub and first created a
`docker-compose.yml`:

```yaml
services:
  watchstate:
    image: ghcr.io/arabcoders/watchstate:latest
    network_mode: "host" # enable connection to host vpn
    user: "1000:1000"
    container_name: watchstate
    restart: unless-stopped
    environment:
      - WS_TZ=Australia/Melbourne
    ports:
      - "8001:8080" # avoid clashing with other service on 8080
    volumes:
      - ./data:/config:rw # mount current directory to container /config directory.
```

Following this I created a `data` folder (passed as a volume to container) in the same
directory with: `mkdir -p data`

Finally I started the container by running:

```bash
# install docker-compose for the current shell in NixOS
nix shell nixpkgs#docker-compose

# start the container in the background
sudo docker-compose up -d
```

### Adding Backend

With the container running I was then able to add a new backend. This refers to setting
up the connection to a media service such as Plex or Jellyfin.

This was done by running the following commands and completing the prompts:

```bash
docker exec -ti watchstate console config:add
```

You will need to extract a [Plex token](https://support.plex.tv/articles/204059436-finding-an-authentication-token-x-plex-token/) and retrieve
you Jellyfin API as part of this setup: Go to Dashboard > Advanced > API keys > then create new api keys

The only issue I ran into was due to me being unfamiliar with the terminology.
I wanted to sync my watch status from Plex to Jellyfin. According to Watchstate
terminology this means I want to `import` my Plex watch state to the database
and `export` the database state into Jellyfin.

Once I understood this I was able to setup backends for both Plex and Jellyfin.

### Syncing Backends

With both backends configured I first exported my Plex state:

```bash
# I named my plex backend plex_media
sudo docker exec -ti watchstate console state:import -v -s plex_media
```

Then finally I export the database state to Jellyfin, following initial instructions
to forcibly sync the initial export:

```bash
# I named my jellyfin backend jellyfin_media
sudo docker exec -ti watchstate console state:import -vvifs jellyfin_media
```

Following this I checked Jellyfin and sure enough, everything was in sync!

### Scheduling Regular Sync

The project mentioned the option of setting up cron jobs for regular syncing
ongoing. I chose not to implement this, as I am happy to manage this manually
myself. I'll evaluate Jellyfin as a replacement to Plex and stick with one or
the other.

Should I decide to run this services long-term then I'd create a NixOS module for it.

If you decide to schedule syncing its just a matter of setting the following
environment variable in `docker-compose.yml`: `WS_CRON_IMPORT=1` and `WS_CRON_EXPORT=1`









