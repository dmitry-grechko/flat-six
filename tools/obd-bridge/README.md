# FLAT·SIX OBD Bridge (MVP)

Local ELM327 bridge for validating **USB** and **Bluetooth Classic** OBD dongles on Mac or Windows before wiring into the main app.

**Branch:** `feature/obd-bridge-mvp`  
**UI:** http://127.0.0.1:8765  

Standalone under `tools/obd-bridge/` — does not change the production garage UI.

---

## Supported transports

| Transport | Works? | Examples |
|-----------|--------|----------|
| **USB ELM327** | ✅ | Cheap USB sticks, OBDLink SX, CH340/FTDI adapters |
| **Bluetooth Classic (SPP)** | ✅ | Older “Android/Windows” BT ELM327 that pairs as a COM/`cu` port |
| **Bluetooth BLE only** | ❌ | Ancel BD200 / many iPhone-only dongles — no serial port |
| **VAS 6154 / J2534** | ❌ | Different protocol stack |

Same connect API for USB and Classic BT — both appear as serial ports.

---

## Clone & run (Windows or Mac)

```bash
git clone https://github.com/dmitry-grechko/porsche-manager.git
cd porsche-manager
git checkout feature/obd-bridge-mvp
npm run obd-bridge
```

Requires **Node 20+** (repo uses 24.x). First run installs `serialport` under `tools/obd-bridge/`.

Open: **http://127.0.0.1:8765**

---

## Windows + USB ELM327 (your case)

1. Dongle in car OBD port, ignition **ON** (engine running helps RPM).
2. Plug USB into the PC. If Windows asks for a driver, install CH340/FTDI as prompted (many sticks just work).
3. Device Manager → **Ports (COM & LPT)** — note the new `COMx` (e.g. `COM3`).
4. If the stick has an **MS-CAN / HS-CAN** switch → leave on **HS-CAN** (Porsche).
5. In a terminal at the repo root: `npm run obd-bridge`
6. Browser → http://127.0.0.1:8765 → **Refresh ports** → select `COMx`
7. Baud **38400** first (try 9600 / 115200 if connect fails)
8. **Connect** → toggle **Live poll**

---

## Windows + Bluetooth Classic ELM327

1. Pair the dongle in Windows Bluetooth settings (must create a **serial / SPP** COM port — not BLE-only).
2. Device Manager → Ports → look for `Standard Serial over Bluetooth link (COMx)`.
3. Same UI steps as USB — pick that `COMx`.

**Ancel BD200 will not work here** (BLE + app only).

---

## Mac + USB

1. Plug USB ELM327 in.
2. `ls /dev/cu.*` — look for `cu.usbserial…` / `cu.wchusbserial…` / `cu.usbmodem…`
3. Run bridge → Refresh ports → Connect @ 38400.

---

## Mac + Bluetooth Classic

1. Pair in System Settings → Bluetooth.
2. Refresh ports — pick new `/dev/cu.…` (not `Bluetooth-Incoming-Port`).
3. BLE-only dongles never appear — use USB instead.

---

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Bridge up + platform + supported transports |
| GET | `/ports` | Ranked serial ports (`usb` / `bluetooth-classic` / …) |
| POST | `/connect` | `{ "port": "COM3", "baudRate": 38400 }` |
| POST | `/disconnect` | Close port |
| POST | `/snapshot` | One-shot PIDs + DTCs |
| POST | `/poll/start` | `{ "intervalMs": 1000 }` |
| POST | `/poll/stop` | Stop polling |
| GET | `/debug` | ELM327 TX/RX log + last snapshot |
| GET | `/status` | Connection + transport + last snapshot |

---

## What it reads (Mode 01 / 03)

- RPM, coolant °C, speed, control-module voltage, engine load
- Stored DTCs (Mode 03)

Read-only — no code clearing, no adaptations.

---

## Troubleshooting

| Symptom | Try |
|---------|-----|
| No new COM / cu port | Unplug/replug USB; check Device Manager / `ls /dev/cu.*`; ignition on |
| Connect timeout | Wrong port; try baud 9600 then 115200 |
| `UNABLE TO CONNECT` | Ignition ON; reseat OBD plug; HS-CAN switch |
| PIDs empty, DTCs work | Engine running; some PIDs unsupported |
| `npm run obd-bridge` fails | `npm --prefix tools/obd-bridge install` then `npm --prefix tools/obd-bridge start` |
| serialport native build error on Windows | Install [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) (Desktop C++) or use Node 20/24 LTS |

---

## Next steps (main app)

- Web Serial for USB ELM327 in-browser (no helper)
- Keep this bridge for Bluetooth Classic + Windows COM
- CORS already open for local FLAT·SIX → bridge calls
