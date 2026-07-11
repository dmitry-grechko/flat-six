# FLAT·SIX OBD Bridge

Local ELM327 bridge for validating dongles before wiring into the main app.

**Test UI:** http://127.0.0.1:8765  
**In-app:** FLAT·SIX → **Live OBD** (`/obd`) talks to this bridge over HTTP

The bridge is the **serial helper** for Classic BT and lab use. The main app
**Live OBD** page (`/obd`) prefers **Web Serial** in desktop Chrome (USB, no
helper) via `lib/obd/webSerial.ts`. FLAT·SIX Desktop embeds OBD over IPC instead.

```bash
npm run dev                 # app on :3000 → /obd → Web Serial (Chrome)
npm run obd-bridge          # optional helper on :8765 for Classic BT / bridge mode
```

## Architecture

Core logic lives in **`lib/obd/`** — `ObdHost` orchestrates reads; `elm327.ts` handles the AT/OBD protocol. This folder is a thin HTTP wrapper:

```
lib/obd/                         # shared read-model + ObdHost (ELM327)
  host.ts / elm327.ts / adapter.ts
tools/obd-bridge/
  server.mjs                     # HTTP API around ObdHost
  public/index.html              # ELM327 test UI
```

---

## Supported transports

| Transport | Works? | Examples |
|-----------|--------|----------|
| **USB ELM327** | ✅ | Cheap USB sticks, OBDLink SX, CH340/FTDI adapters |
| **Bluetooth Classic (SPP)** | ✅ | Older “Android/Windows” BT ELM327 that pairs as a COM/`cu` port |
| **Bluetooth BLE only** | ❌ | Ancel BD200 / many iPhone-only dongles — no serial port |

Same connect API for USB and Classic BT — both appear as serial ports.

---

## What it can read

Generic OBD talks to the **DME / engine emissions ECU** only. PDK, PSM, airbag, gateway, etc. need manufacturer **UDS**.

| Tab | Modes | Contents |
|-----|-------|----------|
| **Live data** | Mode 01 | Supported PIDs only (discovered via `0100`/`0120`/…). Priority set ~1s; secondary ~3s while polling |
| **Fault codes** | Mode 03 / 07 / 0A + 01 readiness + Mode 02 freeze frame | DME confirmed / pending / permanent; other modules shown as “UDS required” |
| **Vehicle info** | Mode 09 | VIN, CALID, CVN, ECU name (one-shot on connect) |
| **Debug** | — | Raw ELM TX/RX log |

Read-only — **no** Mode 04 clear, no adaptations, no coding.

---

## Clone & run (Windows or Mac)

```bash
git clone https://github.com/dmitry-grechko/flat-six.git
cd flat-six
npm run obd-bridge
```

Or from this folder:

```bash
npm install
npm start
```

Requires **Node 22+** (repo prefers **24.x**). The bridge runs via **`tsx`** so `lib/obd` TypeScript loads without `.ts` import extensions. First run installs **`serialport`** and **`tsx`**. On Windows, **VS 2022 Build Tools** with the C++ workload may be needed for the `serialport` native module.

Open: **http://127.0.0.1:8765**

---

## Windows + USB / Bluetooth ELM327

1. Dongle in car OBD port, ignition **ON** (engine running helps RPM).
2. Plug USB into the PC. Install CH340/FTDI if Windows prompts.
3. Device Manager → **Ports (COM & LPT)** — note `COMx`.
4. If the stick has an **MS-CAN / HS-CAN** switch → **HS-CAN**.
5. Start the bridge → browser → **Connection** → Refresh ports → select `COMx` @ **38400**.
6. **Connect** → open **Live data** / **Fault codes** / **Vehicle info** → toggle **Live poll**.

Bluetooth Classic: pair until a serial/COM port appears (not BLE-only). **Ancel BD200 will not work here.**

---

## Mac + USB / Bluetooth Classic

1. USB: `ls /dev/cu.*` for `cu.usbserial…` / `cu.wchusbserial…` / `cu.usbmodem…`
2. BT Classic: pair, then pick the new `/dev/cu.…` (not `Bluetooth-Incoming-Port`).
3. Connect @ 38400.

---

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Bridge up + platform + connection state |
| GET | `/ports` | Ranked serial ports |
| POST | `/connect` | `{ "port", "baudRate" }` |
| POST | `/disconnect` | Close session |
| GET | `/status` | Connection + last live / faults / vehicle + capabilities |
| GET | `/capabilities` | Supported PIDs and adapter info |
| GET / POST | `/live` | Cached live data; POST to refresh |
| GET / POST | `/faults` | Cached faults; POST to re-scan |
| GET / POST | `/vehicle` | Cached identity; POST to refresh |
| POST | `/snapshot` | Full composite read |
| POST | `/poll/start` | `{ "intervalMs": 2000 }` |
| POST | `/poll/stop` | Stop polling |
| GET | `/debug` | TX/RX log + last payloads |

CORS is open for local FLAT·SIX → bridge calls.

---

## Troubleshooting

| Symptom | Try |
|---------|-----|
| No new COM / cu port | Unplug/replug USB; Device Manager / `ls /dev/cu.*`; ignition on |
| Connect timeout | Wrong port; try baud 9600 then 115200 |
| `UNABLE TO CONNECT` | Ignition ON; reseat OBD; HS-CAN |
| PIDs empty | Engine running; check `/capabilities` for supported list |
| VIN missing | Some DMEs/ELM clones struggle with multi-frame Mode 09 — see Debug log |
| Permanent DTCs empty | Mode 0A often unsupported — not an error |
| `npm run obd-bridge` fails on Windows postinstall | Run `npm install` + `npm start` inside `tools/obd-bridge/` |
| serialport native build error | [VS Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) (Desktop C++) or Node 20/24 LTS |

---

## Next steps (main app)

- Garage **Live OBD** (`/obd`) uses this bridge via `lib/obd/httpClient.ts` when not on Web Serial / Desktop
- Desktop embeds OBD in-process — see [`docs/procedures/full-app-offline.md`](../../docs/procedures/full-app-offline.md)
- Keep this bridge for Bluetooth Classic + Windows COM lab use
