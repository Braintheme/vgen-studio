#!/bin/sh
# Prints URLs of the admin for other devices on the local network (phone, another laptop).
# Usage: scripts/lan-urls.sh <port>   (make url / make up)
port="${1:-5173}"

ip=""
if command -v ipconfig >/dev/null 2>&1; then
  # macOS: Wi-Fi is usually en0, wired/USB adapters en1+.
  for iface in en0 en1 en2 en3 en4 en5; do
    ip=$(ipconfig getifaddr "$iface" 2>/dev/null) && [ -n "$ip" ] && break
  done
elif command -v hostname >/dev/null 2>&1; then
  ip=$(hostname -I 2>/dev/null | awk '{print $1}')
fi

name=""
if command -v scutil >/dev/null 2>&1; then
  name=$(scutil --get LocalHostName 2>/dev/null)
fi

if [ -z "$ip" ] && [ -z "$name" ]; then
  echo "LAN:     no network address found (not connected?)"
  exit 0
fi
[ -n "$ip" ] && echo "LAN:     http://$ip:$port   (this address may change with the network)"
[ -n "$name" ] && echo "LAN:     http://$name.local:$port   (stable name, works on iPhone/Mac)"
if command -v qrencode >/dev/null 2>&1 && [ -n "$ip" ]; then
  qrencode -t ansiutf8 "http://$ip:$port"
fi
