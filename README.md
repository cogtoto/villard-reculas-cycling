# Vélo Virtuel / Virtual Cycling

**FR** : Application de cyclisme virtuel en Three.js pour Villard-Reculas. Connecte des capteurs de puissance/vitesse Bluetooth (FTMS, Cycling Power, CSC) et affiche un parcours 3D en temps réel.

**EN**: Three.js virtual cycling app for Villard-Reculas. Connects Bluetooth power/speed sensors (FTMS, Cycling Power, CSC) and displays a real-time 3D route.

---

## Démarrage rapide / Quick Start

### Web (développement local / local dev)

```bash
npm install
npm run dev
```

- Interface : http://localhost:5173
- Serveur capteurs : ws://localhost:8787

Le serveur scanne automatiquement les capteurs Bluetooth. Sans capteur, il utilise des données simulées.

*The server automatically scans for Bluetooth sensors. Without sensors, it uses simulated data.*

### Android

Téléchargez l'APK depuis les [**Releases**](../../releases).

*Download the APK from [**Releases**](../../releases).*

**Installation** :
1. Télécharger `velo-virtuel-debug.apk` depuis GitHub (pas Gmail)
2. Activer "Sources inconnues" dans les paramètres Android
3. Installer l'APK

*1. Download `velo-virtuel-debug.apk` from GitHub (not Gmail)*  
*2. Enable "Unknown sources" in Android settings*  
*3. Install the APK*

⚠️ **Build de debug** : non signé, uniquement pour tests.  
*Debug build: unsigned, for testing only.*

---

## Structure

```
velo-virtuel/
├── main.js              # Point d'entrée Three.js / Three.js entry
├── src/
│   ├── physics/         # Moteur physique / Physics engine
│   ├── sensors/         # Capteurs BLE / BLE sensors
│   └── ui/              # Interface utilisateur / UI
├── server/
│   ├── index.js         # Serveur WebSocket
│   └── ble.js           # Gestion Bluetooth / Bluetooth handling
└── android/             # Build Capacitor Android
```

---

## Développement / Development

### Commandes / Commands

- `npm run dev` — Démarre client + serveur / Start client + server
- `npm run build` — Build production
- `npm run android:sync` — Synchronise avec Android / Sync with Android
- `npm run android:apk` — Compile l'APK de debug / Build debug APK

### BLE Mock

Pour forcer les données simulées :  
*To force simulated data:*

```bash
VELO_BLE=0 npm run server
```

---

## Technologies

- **Three.js** — Rendu 3D / 3D rendering
- **Capacitor** — Build Android natif / Native Android build
- **@abandonware/noble** — Bluetooth LE (serveur / server)
- **@capacitor-community/bluetooth-le** — Bluetooth LE (Android)
- **WebSocket** — Communication temps réel / Real-time communication

---

## Licence / License

Projet personnel de Vincent.  
*Vincent's personal project.*
