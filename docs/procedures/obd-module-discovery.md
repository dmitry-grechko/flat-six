# Procedure: OBD module discovery (finding modules & manufacturer faults)

How we reach a Porsche's non-DME control units and read the fault memory a factory
tester (PIWIS) shows — the codes generic OBD-II can't see. This is how the DME's
`P000C` and the front BCM's `89020E` were found on a real 981; follow it to map
the **987, 991, or any other generation**. See the [golden rule](./README.md#the-golden-rule):
a finding isn't done until Data / Backend / UI / Docs are consistent.

> **Read-only.** Everything here only *reads*. Clearing codes (Mode 04 / service
> `14`) is a separate write, gated behind a confirmation in the app. Never clear a
> fault you're still diagnosing.

## Why this is needed

- Generic OBD (Mode 01/03/06/09) only reaches the **DME's emissions data**. Your
  car's Mode 03/07/0A can read completely empty while PIWIS shows real faults.
- Manufacturer faults live in **each module's own fault memory**, reachable only
  via **UDS** (service `19`) or **KWP2000** (service `18`) — addressed per module,
  routed by the gateway.
- **Every generation can differ:** the protocol (KWP vs UDS), the exact
  sub-function, and the module CAN addresses + the request→response offset. Don't
  assume; discover and record.

## Prerequisites

- An **ELM327** (USB strongly preferred over Bluetooth), plugged into the OBD port,
  **ignition ON** (engine may be off).
- The **serial port free** — a port has one owner, so disconnect Live OBD in the
  app (or close the tab) first. Check with `lsof /dev/cu.usbserial-XXXX` (macOS) —
  Chrome holds it while `/obd` is connected.
- The car's **generation** (981/987/991…), and ideally one **known fault from
  PIWIS** to anchor identification.

## Step 1 — Sweep for modules

Run the open-filter sweep. It sets headers on, clears the receive mask
(`AT CM 000`) so a module's reply is seen on **any** response id, and probes each
request id `0x700–0x7FF` with UDS `19 02`:

```
cd tools/obd-bridge
node bcm-finder.mjs            # or: node bcm-finder.mjs /dev/cu.usbserial-1110 38400
```

Each `req XXX answered from [YYY]` line is a control unit at **request id `XXX`**
replying on **`YYY`**. Note the **offset** (`YYY − XXX`):

- **DME** uses the OBD convention **+8** (`7E0 → 7E8`).
- **981 comfort/body modules** reply at **+0x6A** (`70E → 778`), in request range
  ~`0x70B–0x76F`. This offset is exactly why a naive `+8` filter finds nothing —
  the open-filter sweep is what surfaces them.

If the sweep only returns the DME, the gateway may not be routing sub-bus modules
over this interface — that's a finding too (record it and stop).

## Step 2 — Determine each module's protocol

The sweep's deep-read section probes every responder with **both** UDS `19 02 FF`
and KWP `18 00 FF 00`. Whichever returns a positive (`59 …` for UDS, `58 …` for
KWP) is that module's protocol:

- **981 DME → KWP2000.** Only `18 00 FF 00` works; `18 02`/`18 01` and all of UDS
  `19` are rejected (`7F …`).
- **981 comfort/body modules → UDS.** `19 02` answers; `18` is rejected.

For a stubborn module, run the exhaustive battery — it walks sessions
(`10 03`/`10 01`), UDS sub-functions (`19 02/0A/04/06/01/03`) and KWP variants:

```
node dme-fault-probe.mjs      # point ATSH/ATCRA at the module id inside the file
```

## Step 3 — Read & decode the fault memory

- **UDS `19 02`** returns **3-byte** DTCs. Porsche modules use manufacturer numbers
  shown as **raw hex** (`89020E`) — that's what PIWIS displays, so surface the raw
  hex, not a lossy SAE reinterpretation (`B0902`).
- **KWP `18 00 FF 00`** returns **2-byte** DTCs decoded to SAE (`P000C`).

The parsers live in [`lib/obd/decode.ts`](../../lib/obd/decode.ts)
(`parseUdsDtcs`, `classifyObdResponse`, `negativeResponseInfo`); the sweep tools
inline copies so they run under plain `node`.

## Step 4 — Identify each module

Two complementary ways, both used to map the 981:

1. **By name (`22 F1 97`).** Every module answers the UDS "system name" identifier
   `22 F1 97` (fallback `22 F1 9E`) with an ASCII code — `BCM`, `PSM`, `PDK`, `EPB`
   (parking brake), `RDK` (TPMS), `Kom` (cluster), `PCM`, `BKE` (climate), … Read it
   from every responder and match to the PIWIS unit list. `22 F1 87` returns the
   Porsche part number as a secondary hint. This is what `map-names.mjs` does, and
   it named ~20 modules in one pass.
2. **By fault (anchor).** The module reporting a fault you see in PIWIS _is_ that
   unit — e.g. `0x70E` returned `89 02 0E` (the "front compartment light" under
   "BCM vorne"), so `0x70E → 0x778` is the front BCM. Two modules with the same
   name (`BCM` at `0x70D` and `0x70E`) are disambiguated this way (front vs rear).

## Step 5 — Encode the findings (keep the layers consistent)

| Finding | Where it goes |
|---|---|
| Module CAN address (`reqId`, `respId`, protocol, name) | [`lib/obd/uds-modules.ts`](../../lib/obd/uds-modules.ts) — set `addressConfirmed: true` once verified on a car |
| Per-generation protocol / commands / cylinder count | [`lib/obd/profiles.ts`](../../lib/obd/profiles.ts) (`obdProfile(gen)`) |
| Fault description (title, system, causes, fix) | [`lib/knowledge/fault-codes.json`](../../lib/knowledge/fault-codes.json) — the generation's bundle; `code` = the code **as PIWIS shows it** (raw hex for body modules, SAE for the DME) |

Then **verify**:

```
npx tsc --noEmit
npx tsx lib/obd/decode.test.ts && npx tsx lib/obd/profiles.test.ts
# live confirm: open an Elm327, run scanModules(<generation>), check the module + code surface
```

Add a `decode.test.ts` case with the **real captured frame** (e.g.
`59021B89020E2E`) so the parse is pinned to ground truth.

## What we know so far (extend this)

| Gen | DME | Comfort/body modules | Status |
|---|---|---|---|
| **981** | KWP2000, `18 00 FF 00` (verified) | reply = request **+0x6A**; most UDS `19 02`, a few KWP `18 00 FF 00` | **22 modules mapped** (`lib/obd/uds-modules.ts`): DME `7E0`, BCM front `70E`/rear `70D`, PSM `713`, airbag `715`, cluster `714`, PDK `71E`, EPB `752`, climate `746`, TPMS `70B`, PCM `773`, park-assist `755`, steering `712`, + a few still by raw name |
| 987 | KWP candidate (likely like 981) | unconfirmed | run `map-all.mjs` + `map-names.mjs` |
| 991 | UDS candidate (newer platform) | unconfirmed | run `map-all.mjs` + `map-names.mjs` |

## The tools

- [`tools/obd-bridge/map-all.mjs`](../../tools/obd-bridge/map-all.mjs) — sweep the
  whole car + clean full fault read of every responder (Steps 1–3). Start here.
- [`tools/obd-bridge/map-names.mjs`](../../tools/obd-bridge/map-names.mjs) — read
  each responder's name (`22 F1 97`) + part number to identify them (Step 4).
- [`tools/obd-bridge/bcm-finder.mjs`](../../tools/obd-bridge/bcm-finder.mjs) —
  focused open-filter sweep + single-fault hunt (the original of `map-all`).
- [`tools/obd-bridge/dme-fault-probe.mjs`](../../tools/obd-bridge/dme-fault-probe.mjs) —
  exhaustive single-module fault-read battery: sessions × UDS sub-functions × KWP.
- [`tools/obd-bridge/uds-probe.mjs`](../../tools/obd-bridge/uds-probe.mjs) —
  original candidate-address UDS/KWP probe.
