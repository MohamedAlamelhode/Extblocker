# Extblocker

A Chrome Manifest V3 popup for checking and controlling an existing Pi-hole v6 server. It reads Pi-hole's summary and DNS-blocking APIs; DNS filtering still runs on Pi-hole, not in the browser extension.

The API integration is based on the Pi-hole v6.5 source and API usage described in the [v6.5 archive](https://github.com/pi-hole/pi-hole/archive/refs/tags/v6.5.zip). No Pi-hole server code or blocklist data is bundled here.

## Install for development

1. Open `chrome://extensions` in Chrome.
2. Enable **Developer mode**.
3. Choose **Load unpacked** and select this project folder.
4. Open Extblocker, enter your Pi-hole address (for example `http://pi.hole`) and web interface password, then grant access to that host.

The extension requests access only to the Pi-hole host you enter. The address is saved locally; the password is not saved, and the API session is kept only for the current browser session.

## Run Pi-hole with Docker

The included Compose file runs the official Pi-hole container with persistent configuration and DNS ports published only on localhost. Choose a web interface password and start it with Docker Compose:

```sh
PIHOLE_PASSWORD='choose-a-password' docker compose up -d
```

In Extblocker, connect to `http://localhost:8080` and use the password you chose. Open the Pi-hole dashboard at `http://localhost:8080/admin/`.

When using an Android emulator, use `http://10.0.2.2:8080` instead of `localhost`; `10.0.2.2` is the emulator's alias for the host machine. The dashboard is at `http://10.0.2.2:8080/admin/`.

Host port 53 must be available for Pi-hole DNS. If another DNS service is using it, stop that service or change the host-side `53` port mappings in `compose.yaml`.

The first startup downloads Pi-hole's gravity blocklist and requires outbound DNS and HTTPS access from the container.

## Features

- Live Pi-hole query count, blocked query count, blocked percentage, and gravity domain count
- Current DNS blocking state with a pause/resume control
- Link to the Pi-hole web dashboard
- Host-specific optional network permission