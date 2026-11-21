# Velo Companion (Android)

Phone app that connects the BLE home trainer (FTMS 0x1826 or Cycling Power 0x1818), streams telemetry
as JSON over WebSocket (WiFi) to the velo-virtuel PC server, and offers +/− gear buttons.

## Protocol (ws://PC_IP:8787, same server as velo-virtuel)
- phone → PC: `{type:'hello', role:'companion'}`, `{type:'companion', watts, cadence, sensor}`, `{type:'shift', delta:±1}`
- PC → phone: `{type:'welcome'|'sim', gradePct}` → written to the trainer (FTMS Indoor Bike Simulation)

## PC side (~/projets/velo-virtuel)
    npm run dev            # server :8787 (listens on 0.0.0.0) + Vite client
    VELO_BLE=0 npm run dev # recommended when the phone owns the trainer (no PC BLE)
Open the game in the PC browser. Find PC IP with `ip -4 addr` / `hostname -I`. Allow TCP 8787 in the firewall
(`sudo ufw allow 8787/tcp` if ufw is active). Phone and PC on the same WiFi.

## Companion
    npm install
    npm run dev            # browser test (Web Bluetooth in Chrome, http://localhost:5173)
    npm run android:add    # first time only: creates android/
    npm run android:apk    # → android/app/build/outputs/apk/debug/app-debug.apk
    npm run android:run    # install & run on a USB-connected phone
In the app: enter PC IP + port 8787 → Connect PC → Connect HomeTrainer → use − / +.
