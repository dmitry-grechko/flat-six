# FLAT·SIX OBD Bridge (MVP)

Local OBD bridge for validating adapters before wiring into the main app.

**Branch:** `feature/obd-bridge-mvp`  
**Test UI:** http://127.0.0.1:8765  
**In-app:** FLAT·SIX → **Live OBD** (`/obd`) talks to this bridge over HTTP

The bridge is the **serial helper** for Classic BT and lab use. The main app
**Live OBD** page (`/obd`) prefers **Web Serial** in desktop Chrome (USB, no
helper). Track PWA uses the same `lib/obd/webSerial.ts`.

```bash
npm run dev                 # app on :3000 → /obd → Web Serial (Chrome)
npm run obd-bridge          # optional helper on :8765 for Classic BT / bridge mode
```

## Adapters

| Adapter | Status | Transports |
|---------|--------|------------|
| **elm327** | Production (default) | USB serial, Bluetooth Classic SPP |
| **vas6154** | Experimental | J2534 PassThru (Windows) and/or DoIP TCP |

Pick the adapter on the **Connection** tab. ELM connect/poll is unchanged. VAS is gated behind an **Experimental** toggle and `{ "experimental": true }` on `/connect`.

Shared read model (both adapters): **live** · **faults** · **vehicle** · **status** · **debug** · **capabilities**.

Code seam (easy later extract to `packages/obd-core`):

```
lib/obd/                         # shared read-model + ObdHost (ELM production)
  adapter.ts / host.ts / elm327.ts
  vas6154.ts                     # browser stub
  vas6154-node.ts                # Node wrap → tools lab session
tools/obd-bridge/
  adapters/vas6154/              # experimental PassThru (koffi) + DoIP
  server.mjs                     # HTTP UI wrapper around ObdHost
  public/index.html              # adapter picker
```

---

## Supported transports (ELM327)

| Transport | Works? | Examples |
|-----------|--------|----------|
| **USB ELM327** | ✅ | Cheap USB sticks, OBDLink SX, CH340/FTDI adapters |
| **Bluetooth Classic (SPP)** | ✅ | Older “Android/Windows” BT ELM327 that pairs as a COM/`cu` port |
| **Bluetooth BLE only** | ❌ | Ancel BD200 / many iPhone-only dongles — no serial port |

Same connect API for USB and Classic BT — both appear as serial ports.

---

## What it can read

### ELM327 (Phase 1 — generic OBD-II)

Generic OBD talks to the **DME / engine emissions ECU** only. PDK, PSM, airbag, gateway, etc. need manufacturer **UDS**.

| Tab | Modes | Contents |
|-----|-------|----------|
| **Live data** | Mode 01 | Supported PIDs only (discovered via `0100`/`0120`/…). Priority set ~1s; secondary ~3s while polling |
| **Fault codes** | Mode 03 / 07 / 0A + 01 readiness + Mode 02 freeze frame | DME confirmed / pending / permanent; other modules shown as “UDS required” |
| **Vehicle info** | Mode 09 | VIN, CALID, CVN, ECU name (one-shot on connect) |
| **Debug** | — | Raw ELM TX/RX log |

Read-only — **no** Mode 04 clear, no adaptations, no coding.

### VAS 6154 (Experimental — lab only)

| Step | What happens |
|------|----------------|
| Connect | Opens **PassThru** (J2534 DLL) and/or **DoIP** (TCP :13400) |
| Identify | Best-effort safe DID probes (`0xF190` VIN, `0xF187` / `0xF189` / `0xF191`) when the stack accepts them |
| Debug | Continuous raw TX/RX hex transcript |
| Live / Faults | Placeholders — not Mode 01 / 03 product reads |

No multi-module UDS product features yet. Live poll is ELM-only.

---

## Clone & run (Windows or Mac)

```bash
git clone https://github.com/dmitry-grechko/flat-six.git
cd flat-six
git checkout feature/obd-bridge-mvp
npm run obd-bridge
```

Or from this folder:

```bash
npm install
npm start
```

Requires **Node 22+** (repo prefers **24.x**; bridge runs via `tsx` so `lib/obd` loads without `.ts` import extensions). First run installs `serialport`, `koffi`, and `tsx`. On Windows, **VS 2022 Build Tools** with the C++ workload is needed for native modules.

Open: **http://127.0.0.1:8765**

---

## Windows + USB / Bluetooth ELM327

1. Dongle in car OBD port, ignition **ON** (engine running helps RPM).
2. Plug USB into the PC. Install CH340/FTDI if Windows prompts.
3. Device Manager → **Ports (COM & LPT)** — note `COMx`.
4. If the stick has an **MS-CAN / HS-CAN** switch → **HS-CAN**.
5. Start the bridge → browser → **Connection** → adapter **ELM327** → Refresh ports → select `COMx` @ **38400**.
6. **Connect** → open **Live data** / **Fault codes** / **Vehicle info** → toggle **Live poll**.

Bluetooth Classic: pair until a serial/COM port appears (not BLE-only). **Ancel BD200 will not work here.**

---

## Windows + VAS 6154 (experimental lab)

### Drivers / DLL / DoIP assumptions

| Piece | What you need |
|-------|----------------|
| **Hardware** | Genuine (or Actia-compatible) **VAS 6154** / 6154A on the vehicle OBD port |
| **OS** | **Windows** for J2534 PassThru (registry + DLL load). DoIP TCP can be tried from any OS if you have a host IP |
| **Drivers** | Install the **I+ME Actia VAS6154 PassThru** package so a `FunctionLibrary` DLL is registered under `HKLM\SOFTWARE\PassThruSupport.04.04` (and/or `WOW6432Node` / `.04.05`) |
| **Config utility** | Actia **ConfigVAS6154** (or equivalent) — confirm USB link, Wi‑Fi/RNDIS IP if using DoIP |
| **ODIS vs PassThru** | Dealership **ODIS** uses the native VAS driver path. This bridge uses the **J2534 PassThru** DLL entry — do not expect ODIS and this bridge to share a live session |
| **PassThru protocol** | Default **ISO15765** @ **500000** (HS-CAN ISO-TP). Vendor DoIP-via-PassThru (`ISO13400`) is optional and DLL-specific |
| **DoIP** | ISO 13400 TCP to the VCI or vehicle gateway (often link-local / Wi‑Fi AP IP), port **13400**. UDP vehicle-ID broadcast is best-effort discovery only |
| **FFI** | Bridge loads the DLL with **koffi**. If PassThru fails with “needs koffi”, run `npm install` inside `tools/obd-bridge` |
| **Architecture** | Match Node bitness to the DLL (often **32-bit** PassThru DLLs need a 32-bit Node, or use the 64-bit FunctionLibrary if Actia provides one) |
| **Safety** | Read-only probes only. No coding, flashing, or clear-DTC in this stub |

### Experiment steps

1. Install Actia PassThru drivers; confirm Device Manager / ConfigVAS6154 sees the interface.
2. `cd tools/obd-bridge && npm install && npm start`
3. Open http://127.0.0.1:8765 → **Connection** → adapter **VAS 6154 (Experimental)**
4. **Refresh J2534** — pick the Actia/VAS DLL (or leave auto).
5. Mode: **PassThru**, **DoIP**, or **Auto** (PassThru first, then DoIP).
6. For DoIP: enter host IP (or **DoIP discover**), port `13400`.
7. Enable **I understand this is Experimental** → **Connect**.
8. Open **Debug** — you should see `PassThruOpen` / `DoIP TCP connected` and raw hex RX.
9. **Vehicle info** may show a decoded VIN if a safe DID responded; otherwise use the transcript.

API example:

```http
POST /connect
{
  "adapter": "vas6154",
  "experimental": true,
  "mode": "passthru",
  "dllPath": "C:\\Program Files\\...\\VAS6154.dll",
  "protocol": "ISO15765",
  "baudRate": 500000
}
```

```http
POST /connect
{
  "adapter": "vas6154",
  "experimental": true,
  "mode": "doip",
  "host": "169.254.1.1",
  "doipPort": 13400
}
```

Helpers: `GET /adapters`, `GET /j2534`, `POST /doip/discover`.

---

## Mac + USB / Bluetooth Classic (ELM)

1. USB: `ls /dev/cu.*` for `cu.usbserial…` / `cu.wchusbserial…` / `cu.usbmodem…`
2. BT Classic: pair, then pick the new `/dev/cu.…` (not `Bluetooth-Incoming-Port`).
3. Connect @ 38400.

VAS PassThru is Windows-only; Mac can still try **DoIP** if the VCI exposes an IP.

---

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Bridge up + platform + adapter list |
| GET | `/adapters` | Registered adapters + availability |
| GET | `/ports` | Ranked serial ports (ELM) |
| GET | `/j2534` | Windows PassThru registry devices |
| POST | `/doip/discover` | UDP DoIP vehicle-ID probe |
| POST | `/connect` | ELM: `{ "port", "baudRate" }` · VAS: `{ "adapter":"vas6154", "experimental":true, ... }` |
| POST | `/disconnect` | Close session |
| GET | `/status` | Connection + last live / faults / vehicle + capabilities |
| GET | `/capabilities` | Adapter capabilities |
| GET / POST | `/live` | Cached live data; POST to refresh |
| GET / POST | `/faults` | Cached faults; POST to re-scan |
| GET / POST | `/vehicle` | Cached identity; POST to refresh |
| POST | `/snapshot` | Full composite |
| POST | `/poll/start` | ELM only — `{ "intervalMs": 2000 }` |
| POST | `/poll/stop` | Stop polling |
| GET | `/debug` | TX/RX log + last payloads |

CORS is open for local FLAT·SIX → bridge calls later.

---

## Troubleshooting

| Symptom | Try |
|---------|-----|
| No new COM / cu port | Unplug/replug USB; Device Manager / `ls /dev/cu.*`; ignition on |
| Connect timeout | Wrong port; try baud 9600 then 115200 |
| `UNABLE TO CONNECT` | Ignition ON; reseat OBD; HS-CAN |
| PIDs empty | Engine running; check `/capabilities` for supported list |
| VIN missing (ELM) | Some DMEs/ELM clones struggle with multi-frame Mode 09 — see Debug log |
| Permanent DTCs empty | Mode 0A often unsupported — not an error |
| VAS: no J2534 devices | Install Actia PassThru package; re-open elevated PowerShell; check `PassThruSupport.04.04` |
| VAS: PassThruOpen/Connect fail | Wrong DLL bitness vs Node; ConfigVAS6154 link state; try ISO15765 @ 500k |
| VAS: DoIP timeout | Confirm IP with ConfigVAS6154 / `ipconfig`; firewall; ignition on |
| `npm run obd-bridge` fails on Windows postinstall | Run `npm install` + `npm start` inside `tools/obd-bridge/` |
| serialport / koffi native build error | [VS Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) (Desktop C++) or Node 20/24 LTS |

---

## Phase 2 (not yet)

Multi-module **UDS** product features (PDK, PSM, airbag, etc.) stay out of scope. The VAS adapter is intentionally a **raw transcript + light identify** lab path so we can harden PassThru/DoIP without rewriting ELM.

## Next steps (main app + Track)

- Garage **Live OBD** (`/obd`) already uses this bridge via `lib/obd/httpClient.ts`
- **Track companion** (PWA + Electron): see [`docs/procedures/track-offline.md`](../../docs/procedures/track-offline.md)
  — `npm run track:dev` / `track:electron` / `track:pwa`
- Web Serial for USB ELM327 in the Track PWA (desktop Chrome)
- Keep this bridge for Bluetooth Classic + Windows COM / lab VAS + experimental VAS
- Optional later: extract `adapters/` → `packages/obd-core`
