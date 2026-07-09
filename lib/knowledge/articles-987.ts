// Bundler-safe article store for the Porsche 987 (Cayman & Boxster) knowledge
// base. Mirrors the 981 pattern in ./articles.ts: article bodies live inline as
// markdown strings so getArticles('987') works in any Next.js bundle without
// filesystem reads. Facts are grounded in the researched 987 JSON data
// (known-issues-987.json, specs-987.json, maintenance-987.json,
// fault-codes-987.json) — keep them in sync.
import type { KnowledgeArticle } from './types';

export const ARTICLES_987: KnowledgeArticle[] = [
  {
    id: 'model-variant-overview-987',
    title: 'Porsche 987: Model & Variant Overview',
    tags: ['overview', 'variants', 'boxster', 'cayman', '987.1', '987.2', 'history'],
    body: `# Porsche 987: Model & Variant Overview

The 987 is the second-generation Boxster and the first-generation Cayman, built roughly 2005-2012. The Boxster (987) replaced the outgoing 986 for model year 2005; the fixed-roof Cayman debuted for 2006 (Cayman S first, base Cayman for 2007). The generation was replaced by the 981. Unlike the 981, the 987 uses hydraulic (not electric) power steering, so it takes a fluid.

## The two eras

The single most important distinction when buying or servicing a 987 is which era it belongs to.

- **987.1 (MY2005-2008):** engines are the M96 (2.7 base) and M97 (3.4 S). The Boxster S launched with a 3.2 M96 and moved to the 3.4 M97 for 2007 (the Cayman S was 3.4 from its 2006 debut). These engines carry the classic flat-six worries: IMS bearing, cylinder bore scoring, RMS, and air-oil separator. Transmissions are a 6-speed manual or the 5-speed Tiptronic S automatic.
- **987.2 (MY2009-2012):** all-new DFI 9A1 engines (2.9 base, 3.4 S) with direct injection. There is no intermediate shaft, so no IMS bearing, and bore scoring is far rarer. Transmissions are a 6-speed manual or the 7-speed PDK dual-clutch. The 987.2 introduced a high-pressure fuel pump (HPFP) as a new wear point.

## Special variants

Late in the run Porsche added focused models on the 987.2 platform: the lightweight, hardtop **Cayman R** and the stripped-back **Boxster Spyder** (both 2011-2012), each with more power, less weight, and a lower ride height.

Sources:
- https://en.wikipedia.org/wiki/Porsche_Cayman
- https://en.wikipedia.org/wiki/Porsche_Boxster
- https://www.excellence-mag.com/resources/specs/216`,
  },
  {
    id: 'engines-m96-m97-9a1-987',
    title: 'The M96/M97 and 9A1 Flat-Six Engines',
    tags: ['engine', 'm96', 'm97', '9a1', 'dfi', 'ims', 'bore-scoring', 'specs'],
    body: `# The M96/M97 and 9A1 Flat-Six Engines

The 987 spans two entirely different engine families, and the reliability picture depends on which one you have.

## M96 / M97 (987.1, 2005-2008)

The 987.1 uses the water-cooled M96 (2.7 base) and M97 (3.4 S) flat-six, closely related to the 996/997.1 units. They are port-injected, use VarioCam (VarioCam Plus with two-stage valve lift on the M97), and drive the camshafts through an **intermediate shaft (IMS)**. Two known risks live here:

- **IMS bearing failure.** A sealed bearing supports the intermediate shaft; if its grease seal degrades the bearing can starve and disintegrate, potentially destroying the engine. Risk is highest on the earliest MY2005 Boxster with the small single-row bearing; the larger 2006-2008 bearing (and all Caymans) has a much lower failure rate.
- **Cylinder bore scoring.** The Lokasil open-deck liners can score vertically, worst on the M97 3.4 S. Symptoms are a cold ticking knock, oil consumption, and sooty exhaust.

## DFI 9A1 (987.2, 2009-2012)

The 987.2 switched to the all-aluminium DFI 9A1 (2.9 and 3.4). The camshafts are chain-driven directly off the crankshaft, so **there is no intermediate shaft and no IMS bearing** — the failure that worries M96/M97 buyers simply does not exist here, and bore scoring is far rarer. In its place, direct injection brings a **high-pressure fuel pump (HPFP)** as the notable new wear item.

Both families take Porsche A40-approved oil (factory fill 0W-40) and hold roughly 7.5-7.75 L with a filter.

Sources:
- https://lnengineering.com/products/the-definitive-guide-and-faq-for-porsche-ims-bearings/porsche-ims-bearing-problem-years/
- https://flat6innovations.com/cylinder-bore-scoring/
- https://www.718forum.com/threads/9a1-engine-tech.16228/`,
  },
  {
    id: 'tiptronic-pdk-manual-987',
    title: 'Transmissions: Manual, Tiptronic S & PDK',
    tags: ['transmission', 'manual', 'tiptronic', 'pdk', '987.1', '987.2', 'fluids'],
    body: `# Transmissions: Manual, Tiptronic S & PDK

Like the engines, the 987 gearbox story splits cleanly by era.

## Manual (both eras)

Both the 987.1 and 987.2 offered a 6-speed manual transaxle. Because the transaxle integrates the differential, a single 75W-90 (GL-5) gear-oil fill (about 2.8 L on refill) covers both — there is no separate diff service. The hydraulic clutch shares the brake reservoir and DOT 4 fluid, so it is bled during the regular 2-year brake flush. Earlier 987.1 cars used a plastic clutch slave cylinder that can crack; Porsche updated it to a metal unit.

## Tiptronic S (987.1 only)

The 987.1 automatic is the 5-speed Tiptronic S, a ZF 5HP19 torque-converter unit. It uses Pentosin ATF-1 / ZF Lifeguard 5. Porsche calls the fluid "fill-for-life," but specialists strongly recommend servicing it every 4-6 years; a drain-and-fill only exchanges about 3.5 L of the ~9 L total because the converter retains the rest. The final drive is separate (about 0.8 L of 75W-90). Worn valve-body bores cause harsh, delayed shifts as these age.

## PDK (987.2 only)

The 987.2 replaced Tiptronic with the 7-speed PDK dual-clutch. It has **two separate fluid circuits**: a 75W-90 gear oil (about 2.95 L per service) and a Pentosin FFL-3 clutch/control fluid (often mislabeled "PDK transmission fluid"), which requires a PIWIS temperature-controlled fill. The gearset is robust; the Mechatronic control unit and its sensors are the concern, so regular fluid service (many specialists do it around 40k miles) is the best protection.

Sources:
- https://rennlist.com/forums/987-forum/1078012-pdk-gear-oil-change-not-clutch-fluid.html
- https://www.pelicanparts.com/techarticles/Boxster_Tech/35-TRANS-Auto_Fluid_Change/35-TRANS-Auto_Fluid_Change.htm
- https://www.pcarwise.com/local-help/porsche-common-problems/porsche-pdk-transmission-problems/`,
  },
  {
    id: 'fluids-capacities-cheatsheet-987',
    title: 'Fluids & Capacities Cheat-Sheet',
    tags: ['fluids', 'capacities', 'oil', 'coolant', 'brake-fluid', 'power-steering', 'reference'],
    body: `# Fluids & Capacities Cheat-Sheet

A quick reference for the 987. Always confirm against the owner's manual, the car's labels, and the on-board oil-level gauge; several figures below are aggregator-sourced.

## Engine oil

- **Spec:** Porsche A40 approval (HTHS >= 3.5), for both M96/M97 and 9A1. Factory fill 0W-40; 5W-40 and 5W-50 are also A40-approved.
- **Capacity (with filter):** 987.1 2.7 ~7.75 L; 987.1 3.4 ~7.75 L; 987.2 2.9 and 3.4 ~7.5 L.

## Coolant

- **Type:** Porsche G40 (pink/violet Si-OAT); Zerex G40 is an OEM-equivalent. Mix 50/50 with distilled water.
- **Total system:** ~22.3 L (manual); ~24.3 L (Tiptronic, extra ATF-cooler circuit).

## Brake fluid

- **Spec:** DOT 4 (later cars DOT 4 Low Viscosity). Flush every 2 years.

## Transmission

- **Manual:** 75W-90 (GL-5), ~2.8 L refill (also lubricates the diff).
- **Tiptronic S (987.1):** Pentosin ATF-1 / ZF Lifeguard 5; drain-and-fill ~3.5 L of ~9 L total. Final drive ~0.8 L of 75W-90.
- **PDK (987.2):** gear oil 75W-90 ~2.95 L; clutch/control fluid Pentosin FFL-3 (PIWIS fill).

## Power steering

- **Yes, it takes fluid.** The 987 uses hydraulic power steering — Pentosin CHF 11S (or interchangeable CHF 202), roughly 1.0 L. This is a key difference from the electric-steering 981.

## A/C

- **Refrigerant:** R134a.

## Fuel

- **Tank:** ~64 L quoted consistently across 987.1/987.2.

Sources:
- https://www.planet-9.com/threads/porsche-approved-engine-oils-can-we-cut-to-the-chase.83525/
- https://oil-change.info/porsche-cayman-987-2005-2012-engine-oil-capacity/
- https://crpautomotive.com/wp-content/uploads/2020/06/Pentosin-Product-Data-Sheet-Hydraulic-Fluid-CHF-11S.pdf`,
  },
  {
    id: 'common-problems-guide-987',
    title: 'Common Problems Guide',
    tags: ['issues', 'reliability', 'ims', 'bore-scoring', 'aos', 'hpfp', 'cooling'],
    body: `# Common Problems Guide

The 987 is a rewarding car, but its weak points depend heavily on era. The M96/M97 (987.1) carries the famous flat-six risks; the DFI 9A1 (987.2) trades most of them for a fuel-system concern.

## 987.1 engine (M96/M97)

- **IMS bearing:** can fail catastrophically. Worst on the earliest MY2005 Boxster (small single-row bearing); the 2006-2008 bearing and all Caymans are much lower risk. Watch for metal in the oil filter.
- **Bore scoring:** vertical liner scoring, markedly worse on the M97 3.4 S. Cold ticking knock, oil consumption, sooty exhaust.
- **RMS:** rear main seal weeps at the bellhousing; on manuals it can foul the clutch.
- **AOS:** air-oil separator diaphragm fails, causing white startup smoke, rough idle, and high oil consumption (~$400-$900).

## 987.2 engine (9A1)

- **HPFP:** a batch of Bosch high-pressure fuel pumps caused hard starts, stalling, and limp mode; many were covered under a service action. No IMS, and bore scoring is rare.

## Cooling (all 987)

- **Water pump** (plastic impeller), **coolant expansion tank** cracking, and on 987.1 the **front plastic coolant pipe** seals are all age/heat wear items.

## Suspension, electrical, body (all 987)

- **Front control-arm "coffin arm" bushings** clunk over bumps.
- **Ignition coils** crack and misfire; replace all six with plugs.
- **A/C condensers** corrode and puncture behind the front bumper.
- **Boxster convertible-top** microswitches and drive cables stall the top mid-cycle.

## Recalls

Verify by VIN at recall.porsche.com. A narrow MY2012 seat-belt-anchor recall (NHTSA 11V409) applies to a specific build window.

Sources:
- https://www.pcarwise.com/local-help/porsche-common-problems/porsche-cayman-common-problems/
- https://www.6speedonline.com/forums/boxster-cayman/241033-high-pressure-fuel-pump-hpfp-failures-987-2-boxster-s-cayman-s.html
- https://static.nhtsa.gov/odi/rcl/2011/RCRIT-11V409-5689.pdf`,
  },
  {
    id: 'brakes-987',
    title: 'Brakes (and PCCB)',
    tags: ['brakes', 'pccb', 'ceramic', 'rotors', 'calipers', 'specs'],
    body: `# Brakes (and PCCB)

The 987 uses cross-drilled, internally vented steel discs as standard, with the carbon-ceramic PCCB system available as an option on S models.

## Steel brakes by variant

- **Base:** smaller front discs, new thickness 24 mm with a 22 mm wear minimum; rear new 20 mm / min 18 mm.
- **S models:** larger front discs, new 28 mm / min 26 mm; rear new 24 mm / min 22 mm, with four-piston aluminium monobloc fixed calipers up front.

The minimum thickness is stamped on the disc hat; measure against it rather than guessing. Replace pads at roughly 2-3 mm of remaining friction material. The focused Cayman R and Boxster Spyder use the S-derived brakes with lighter components.

## PCCB (Porsche Ceramic Composite Brakes)

PCCB is the optional carbon-ceramic system, identified by its **yellow calipers**. The silicon-carbide discs are far lighter than steel, cutting unsprung and rotating mass, and they resist fade well with long life under normal road use.

The catch is cost: PCCB is very expensive to replace, can chip, and track use shortens its life dramatically — so a used 987 with worn ceramics can hide a large replacement bill. For mostly-road cars the steel brakes are excellent and far cheaper to maintain. Exact PCCB dimensions vary by variant; confirm before quoting.

## Service basics

Caliper mounting bolts torque to about 85 Nm front and rear (inspect and replace on removal if the workshop manual calls them single-use). Flush the DOT 4 brake fluid every two years regardless of mileage, since it absorbs moisture over time.

Sources:
- https://www.planet-9.com/threads/987-2-brake-rotor-measurements.85102/
- https://www.planet-9.com/threads/minimum-rotor-thickness-non-s.69088/
- https://www.lindseyracing.com/LR/Parts/TORQUESPEC.html`,
  },
  {
    id: 'suspension-pasm-987',
    title: 'Suspension & PASM',
    tags: ['suspension', 'pasm', 'coffin-arm', 'bushings', 'alignment', 'handling'],
    body: `# Suspension & PASM

The 987 uses MacPherson-strut suspension front and rear with lightweight components, and its mid-engine layout gives the balanced, communicative handling the model is loved for.

## Standard vs PASM

Most 987s ride on conventional passive dampers. **PASM (Porsche Active Suspension Management)** was an option that adds electronically controlled adaptive dampers with Normal and Sport modes and lowers the ride height slightly. On PASM cars, a knock over bumps can come not just from worn mounts but from ride-height sensors, a leaking adaptive strut, or the control system, so faults there need electronic diagnosis rather than a simple parts swap. The Cayman R and Boxster Spyder sit lower on sport-tuned setups.

## Coffin-arm bushings

The most common suspension complaint across the whole 986/987/981/718 family is wear in the front lower control arm — the large A-shaped "coffin arm" — and its rubber thrust-arm bushing. Worn bushings give a mushy, disconnected front end, clunks over bumps, vague steering, and uneven front tyre wear. You can replace the whole arm or just the bushings; polyurethane and monoball upgrades (Powerflex, Tarett, Elephant Racing) are popular. Torque the bushing bolts at ride height to avoid pre-loading and premature failure.

## Alignment and wheels

After any control-arm, tie-rod, or ride-height work, get a four-wheel alignment; these cars are sensitive to toe and camber. All 987s run a **staggered** wheel-and-tyre fitment (wider at the rear), so front-to-rear rotation is not possible — rotate side-to-side only if the tyre pattern allows. Upper strut and shock mounts also dry out and knock with age.

Sources:
- https://flat6motorsports.com/products/powerflex-lower-control-arm-thrust-bushing-987
- https://www.pcarwise.com/local-help/porsche-common-problems/porsche-cayman-common-problems/
- https://www.wheel-size.com/size/porsche/cayman/987-2005-2009/`,
  },
  {
    id: 'buyers-inspection-checklist-987',
    title: "Buyer's Inspection Checklist",
    tags: ['buying', 'ppi', 'inspection', 'ims', 'bore-scoring', 'hpfp', 'checklist'],
    body: `# Buyer's Inspection Checklist

A focused pre-purchase checklist for a used 987 Boxster or Cayman. A professional pre-purchase inspection (PPI) at a Porsche specialist is strongly recommended; this is what to prioritise. The single biggest question is which era you are buying.

## 987.1 (2005-2008, M96/M97) — engine first

- **IMS bearing:** assess risk by build. The earliest MY2005 Boxster with the small single-row bearing is the worst (some estimates ~8-15% failure); the larger 2006-2008 bearing and all Caymans are far lower risk (well under 1%). Check the oil filter for metal, ask about any retrofit, and factor it into your offer.
- **Bore scoring:** this is why a **borescope inspection** is worth paying for on the 987.1, especially the M97 3.4 S. Cold-start the car yourself and listen for a rhythmic tick/knock; check for oil consumption and sooty exhaust.
- **RMS / AOS:** look for oil weeping at the bellhousing and white startup smoke.

## 987.2 (2009-2012, 9A1) — fuel system

- **No IMS** and bore scoring is rare, so those fears do not apply. Instead, confirm the **HPFP** history: hard hot-starts, stalling, or stored fuel-pressure codes (P0087) point to the high-pressure pump; many were replaced under a service action.

## All 987

- **Cooling:** check the coolant tank, water pump, and (987.1) front coolant pipe for weeping or crust.
- **Transmission:** manual clutch bite; Tiptronic (987.1) for harsh shifts; PDK (987.2) for clean shifts and fluid-service history.
- **Brakes / suspension:** measure pad and disc wear (budget heavily if PCCB yellow calipers are worn); listen for coffin-arm clunks.
- **Boxster top:** cycle it fully several times. **Paperwork:** verify service history and check recalls by VIN.

Sources:
- https://lnengineering.com/products/the-definitive-guide-and-faq-for-porsche-ims-bearings/porsche-ims-bearing-problem-years/
- https://flat6innovations.com/cylinder-bore-scoring/
- https://www.6speedonline.com/forums/boxster-cayman/241033-high-pressure-fuel-pump-hpfp-failures-987-2-boxster-s-cayman-s.html`,
  },
  {
    id: 'diy-oil-change-987',
    title: 'DIY: Oil & Filter Change',
    tags: ['diy', 'oil', 'maintenance', 'service', 'torque'],
    body: `# DIY: Oil & Filter Change

The 987 oil change is a beginner-friendly job and identical in principle across both eras. Capacity with a filter is about **7.75 L** on the 987.1 (2.7 and 3.4) and about **7.5 L** on the 987.2 (2.9 and 3.4). Use Porsche A40-approved oil — factory fill is 0W-40. Always confirm the level on the electronic oil-level gauge.

## What you need

- ~8 L of A40-approved oil (e.g. Mobil 1 0W-40)
- Cartridge oil-filter element kit (includes the cap O-ring)
- A new aluminium drain-plug crush ring
- Oil-filter cap socket, drain-plug tool, torque wrench
- ~10 L drain pan, jack and stands or ramps

## Procedure

1. Warm the engine briefly so the oil flows, then shut off. Raise and secure the rear of the car safely.
2. Remove the rear underbody panel to reach the drain plug and filter housing.
3. Position the pan and remove the drain plug; let it drain fully.
4. Unscrew the oil-filter cap, swap in the new element, and fit the new cap O-ring lightly oiled.
5. Torque the filter cap to **25 Nm** and the drain plug — with a **new crush ring** — to **50 Nm**.
6. Refit the underbody panel, lower the car, and add oil. Start about 1 L short, then top up to the correct level. Do not overfill.
7. Run the engine, check for leaks, recheck the level, and reset the maintenance reminder.

## Notes

- Factory interval is long (2 years / ~12,000 mi), but given these engines' age most owners shorten to 5,000-7,500 mi.
- Dispose of used oil and the filter responsibly. Torque values are from owner references; verify against the workshop manual.

Sources:
- https://oil-change.info/porsche-cayman-987-2005-2012-engine-oil-capacity/
- https://rennlist.com/forums/boxster-and-boxster-s-986-forum/343643-torque-spec-oil-drain-plug.html
- https://www.planet-9.com/threads/porsche-cayman-987-2-major-maintenance-torque-specs.93778/`,
  },
  {
    id: 'diy-brake-pads-987',
    title: 'DIY: Brake Pads',
    tags: ['diy', 'brakes', 'pads', 'sensors', 'maintenance', 'torque'],
    body: `# DIY: Brake Pads

Replacing pads on the 987's fixed monobloc calipers is a moderate DIY job. **Do not attempt this on PCCB (yellow caliper) cars without the correct ceramic-specific pads and procedure.**

## What you need

- Correct front/rear pad set for your variant
- New brake-pad wear sensor(s) if the old ones are cut or brittle
- Brake cleaner, a piston-retraction tool, anti-squeal or lubricant for the pad backs and pins
- Torque wrench, jack and stands, the wheel-bolt socket

## Procedure

1. Loosen the wheel bolts, raise and secure the car, and remove the wheel.
2. Note the routing of the **pad wear sensor** and unplug it. The 987 uses a wear sensor that grounds when the pad wears down and triggers a dash warning; fit a new sensor with new pads.
3. Remove the pad retaining pins and clips and slide the old pads out (a pad-only job usually does **not** require removing the caliper).
4. Inspect the disc against the minimum stamped on it (base front min 22 mm / S front min 26 mm). Replace discs if at or below minimum.
5. Push the pistons back gently, watching the fluid reservoir so it does not overflow.
6. Fit the new pads with anti-squeal on the backing plates and reinstall the pins and clips. If you removed the caliper, torque the mounting bolts to about **85 Nm**.
7. Refit the wheel. Wheel-bolt torque is **130 Nm** (up to MY2011) or **160 Nm** from MY2012 — apply a thin film of aluminium paste to the threads, and tighten diagonally.
8. Before driving, **pump the pedal** until firm, then bed the pads in per the maker's instructions.

## Notes

- Replace pads around 2-3 mm friction material; consider a 2-year fluid flush at the same time.

Sources:
- https://www.lindseyracing.com/LR/Parts/TORQUESPEC.html
- https://www.planet-9.com/threads/wheel-bolt-torque-987-1-vs-987-2.63498/
- https://www.planet-9.com/threads/987-2-brake-rotor-measurements.85102/`,
  },
  {
    id: 'cooling-system-987',
    title: 'Cooling System',
    tags: ['cooling', 'coolant', 'water-pump', 'expansion-tank', 'coolant-pipe', 'g40'],
    body: `# Cooling System

The 987's mid-engine layout places the radiators at the **front** of the car, fed by ducting from the front bumper, with coolant pumped the length of the car to and from the rear-mounted flat-six. That long plumbing run, combined with age and heat cycling, makes several plastic-and-rubber components known wear points.

## Coolant

Use **Porsche G40** — a pink/violet Si-OAT coolant (Zerex G40 is an OEM-equivalent). Mix concentrate 50/50 with distilled water. Do not mix it with green/blue silicate or generic OAT coolants. Total system capacity is roughly 22.3 L on manual cars and 24.3 L on Tiptronic cars (extra ATF-cooler circuit). Porsche treats G40 as a lifetime fill, but many owners refresh it every 4-6 years.

## Common failure points

- **Water pump:** the shaft bearing wears, producing a knock, pulley wobble, and eventually a coolant leak from the weep hole. Most pumps use a plastic impeller; a quality plastic impeller is generally preferred over metal, which can damage the block if the bearing fails.
- **Coolant expansion tank:** the plastic reservoir embrittles and cracks (often at the seams and cap), progressing from a slow seep to a sudden split that dumps coolant.
- **Front coolant pipe (987.1):** the plastic pipe's rubber O-rings harden and weep at the front of the engine; Porsche revised the part several times, and some owners fit aluminium replacements.
- **Radiators and condensers:** front-mounted and low, they collect leaves and debris that trap moisture and cause corrosion.

## Bleeding

The system must be properly **vacuum-filled or bled** after any coolant work — trapped air pockets cause hot spots and false overheating. Keep an eye on the level and watch for crusty residue or a sweet smell that signals a slow leak.

Sources:
- https://www.pelicanparts.com/techarticles/Porsche-987-Cayman/08-WATER-Coolant_Flush_and_Replacement/08-WATER-Coolant_Flush_and_Replacement.htm
- https://rennlist.com/forums/987-forum/1361309-987-1-base-water-pump-plastic-impeller-failure.html
- https://www.pelicanparts.com/techarticles/Boxster_Tech/33-WATER-Coolant_Tank/33-WATER-Coolant_Tank.htm`,
  },
  {
    id: 'convertible-top-987',
    title: 'Boxster Convertible Top',
    tags: ['convertible', 'top', 'roof', 'boxster', 'microswitch', 'hydraulics'],
    body: `# Boxster Convertible Top

The 987 Boxster uses a power-operated fabric convertible top that raises or lowers in a few seconds. A single electric motor drives two flexible cables to a gearbox ("transmission") on each side, moving the top through its folding cycle, while a set of microswitches reports the top's position so the control unit can sequence the latches, lid, and links correctly.

## How it operates

The top folds and stows under a lid. Position microswitches tell the control unit where the top is at each stage; if any one position signal is implausible, the control unit halts the cycle to protect the mechanism, and a warning stays on to show the top is not confirmed latched.

## Common faults

- **Microswitches:** a failed switch leaves a persistent top warning and can stop the top mid-cycle. On the 987 the switches are sold only as part of a bracket assembly, and reaching some of them is labour-intensive.
- **Drive cables / transmission gears:** worn or binding cables, or cracked brittle plastic transmission gears, will let the motor whir while the top does not move (or only one side moves).
- **Motor and relay:** the top motor and its relay can fail; the motor can also go into thermal cut-out if it has been cycled repeatedly while faulting.

## Diagnostic order

Diagnose systematically — motor vs cables vs microswitches vs transmissions — because labour access varies enormously. Confirm cheap, accessible parts (relay, motor, an easily reached switch) before committing to a buried microswitch or a full cable and transmission job.

## Maintenance

Keep the **roof drains clear**: blocked drains let water pool and reach control modules mounted low in the cabin, causing seemingly random electrical faults. Lubricate the mechanism and operate the top fully and regularly so the seals and cables stay healthy.

Sources:
- https://www.go-parts.com/garage/convertible-top-motor-porsche-boxster-porsche-911-1990-2012
- https://www.pcarwise.com/local-help/porsche-common-problems/porsche-cayman-common-problems/
- https://www.planet-9.com/threads/981-boxster-convertible-top-not-moving.247728/`,
  },
];
