# Vélo virtuel (MVP)

Three.js + WebSocket. Capteurs simulés pour l’instant.

## Lancer

```bash
cd ~/projets/velo-virtuel
npm install
npm run dev
```

- UI : http://localhost:5173
- Capteurs : ws://localhost:8787

Prochaine étape : brancher le BLE à la place du mock dans `server/index.js`.

## BLE

Par défaut le serveur scanne le Bluetooth (FTMS / Cycling Power / CSC).
S’il ne trouve rien, le mock continue.

```bash
# forcer le mock
VELO_BLE=0 npm run server

# besoin souvent du groupe bluetooth + relogin
sudo usermod -aG bluetooth $USER
```

Sur ce Pavilion (Broadcom), le BLE peut rester vide : utilise alors Companion bridge plus tard, ou un dongle BT 5.
