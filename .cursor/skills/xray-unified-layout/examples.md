# Unified layout — examples

## After engine detail pass

Engine native radius grew (more cams/chains) → same `displayRadius: 0.70` made the block oversized in the joint view.

1. `npm run gen:layout` → WARN/ERROR on engine extent  
2. Lower `displayRadius` slightly **or** accept and nudge neighbors  
3. Re-check exhaust/intake hotspots relative to new engine center  

## Brakes off the hubs

Right brake AABB center far from `(±1.15, -0.35, ±1.5)`.

- Tune `lateralOffset` (track) and hotspot Y (rotor vs hydraulics bbox bias).  
- Remember `hideInUnified` does **not** shrink the client bbox today.

## New generation

987 wheelbase differs → update `AXLE` constants and zone table in the validator; don’t reuse 981 hotspots blindly.
