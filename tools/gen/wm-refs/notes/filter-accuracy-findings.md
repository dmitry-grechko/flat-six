# Intake + cabin filter — 981 WM findings (filter accuracy pass)

## Sources

| WM | Pages / figs | Topic |
| --- | --- | --- |
| **851819** | p4810–4812 | Particle (cabin) filter — HVAC, **passenger footwell** |
| **242419** | p4425–4428 | Air-cleaner **element** — long **cylindrical** cartridge |
| **242519** | p4431–4434 | Air cleaner **housing** — elongated scoop→neck duct at rear side scoops |

## Tier A silhouette (before → after)

### Cabin particle filter (`elec` / `cabinParticleFilter`)

| Before | After (WM 851819) |
| --- | --- |
| Small square-ish panel + flat lid; could read as driver-side after normalize | Long thin rectangular cartridge (across-car X), slatted service cover with **3 clip tabs**, HVAC slot lip |
| Position ambiguous under normalize | Car-space **+X passenger** footwell `(0.48, 0.22, 0.85)` — “right footwell” per WM text |

### Engine air-cleaner element (`airfilter`)

| Before | After (WM 242419) |
| --- | --- |
| **Flat panel** `makePanel` inside boxy mid-housing | **`makeCylindricalAirCleaner`** — long cylinder + mount end-cap + O-rings + positioning pins (Fig overview) |
| Housing mid-bay / normalized | Car-space rear side scoops: mouth `x±1.05`, filter `x±0.78`, `z≈−0.55` (above rear axle / luggage wall) |
| Lid as raised box | Circular access port on housing (luggage-compartment pull-out face) |

## Tier B coverage

`airfilter` + `elec` PRIMARY nodes unchanged; verify-coverage **100%**.

## Tier D flows / hotspots

- `airfilter` → `carSpace: true` (same reason as elec: keep L/R packaging).
- Intake flow waypoints remapped to car-space scoop→housing→throttle→plenum.

## Left unchanged / risks

- Housing outer envelope still box-segmented (not full tube extrude of aircleaner-4432 footprint) — next Tier A pass can replace mid-sections with `tube` along the existing centerline trace.
- Cabin filter is a serviceable pin prop in the elec assembly, not a full HVAC heater box.
