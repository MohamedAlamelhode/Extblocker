# Extblocker

A Chrome Manifest V3 popup for checking and controlling an existing Pi-hole v6 server. It reads Pi-hole's summary and DNS-blocking APIs; DNS filtering still runs on Pi-hole, not in the browser extension.

The API integration is based on the Pi-hole v6.5 source and API usage described in the [v6.5 archive](https://github.com/pi-hole/pi-hole/archive/refs/tags/v6.5.zip). No Pi-hole server code or blocklist data is bundled here.

## Install for development

1. Open `chrome://extensions` in Chrome.
2. Enable **Developer mode**.
3. Choose **Load unpacked** and select this project folder.
4. Open Extblocker, enter your Pi-hole address (for example `http://pi.hole`) and web interface password, then grant access to that host.

The extension requests access only to the Pi-hole host you enter. The address is saved locally; the password is not saved, and the API session is kept only for the current browser session.

## Features

- Live Pi-hole query count, blocked query count, blocked percentage, and gravity domain count
- Current DNS blocking state with a pause/resume control
- Link to the Pi-hole web dashboard
- Host-specific optional network permission