// Per-system material palette for the technical-illustration / CAD look.
// Each entry is a plain spec consumed by glb-writer.mjs (baseColorFactor + PBR).
// Colors are linear-ish sRGB hex; metalness/roughness mimic the POC.

function hexToRgb(hex) {
  const n = typeof hex === 'string' ? parseInt(hex.replace('#', ''), 16) : hex;
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/**
 * Named material definitions. Builders reference these by key.
 * Grouped roughly by system but reusable across components.
 */
export const MATERIALS = {
  // --- Engine ---
  block:    { color: 0xb9bdc4, metalness: 0.95, roughness: 0.34 }, // anodized silver crankcase
  cover:    { color: 0x2a2d33, metalness: 0.6,  roughness: 0.45 }, // black cam/plastic covers
  intake:   { color: 0x23262b, metalness: 0.3,  roughness: 0.6  }, // black plastic intake manifold
  runner:   { color: 0x9aa1ab, metalness: 0.95, roughness: 0.3  },
  steel:    { color: 0xd7dade, metalness: 1.0,  roughness: 0.22 },
  red:      { color: 0xc81e1e, metalness: 0.4,  roughness: 0.4  }, // accents / oil filter / calipers
  yellow:   { color: 0xe7b81f, metalness: 0.2,  roughness: 0.5  }, // oil filler cap / service touch points
  hose2:    { color: 0x303338, metalness: 0.2,  roughness: 0.8  }, // small breather / vacuum hoses
  // overhaul additions
  cast:     { color: 0xa3a8b0, metalness: 0.85, roughness: 0.62 }, // matte cast-aluminium (bellhousing, pump, brackets)
  castDark: { color: 0x868b93, metalness: 0.85, roughness: 0.66 }, // shadowed cast ribs
  polished: { color: 0xe2e5ea, metalness: 1.0,  roughness: 0.12 }, // polished steel pulley faces / clamps
  bolt:     { color: 0xc2c6cc, metalness: 1.0,  roughness: 0.3  }, // fasteners / bolt bosses
  damper:   { color: 0x16181b, metalness: 0.2,  roughness: 0.85 }, // black rubber damper ring / belt body
  belt:     { color: 0x202327, metalness: 0.2,  roughness: 0.78 }, // ribbed serpentine belt
  plenum:   { color: 0x1c1e22, metalness: 0.28, roughness: 0.55 }, // black plastic intake bridge
  bore:     { color: 0x4a4d54, metalness: 0.7,  roughness: 0.55 }, // cylinder bore wall (cutaway)
  piston:   { color: 0xcacdd3, metalness: 0.95, roughness: 0.35 }, // piston crown (cutaway)
  oilcap:   { color: 0xcf9a3a, metalness: 0.35, roughness: 0.5  }, // tan/gold oil filler cap

  // --- Transmission (brushed aluminium) ---
  alu:      { color: 0xc4c8cd, metalness: 0.9,  roughness: 0.45 },
  aluDark:  { color: 0x9499a0, metalness: 0.9,  roughness: 0.5  },

  // --- Exhaust (titanium / steel) ---
  exhaust:  { color: 0xc9b79f, metalness: 1.0,  roughness: 0.5  }, // titanium-ish headers
  exhaustC: { color: 0xa8aab0, metalness: 1.0,  roughness: 0.35 }, // bright tips / cats
  exhaustD: { color: 0x6b6f76, metalness: 0.8,  roughness: 0.6  }, // muffler box

  // --- Brakes ---
  disc:     { color: 0x8b8e93, metalness: 0.95, roughness: 0.5  }, // cast steel disc
  caliper:  { color: 0xc81e1e, metalness: 0.45, roughness: 0.4  }, // red caliper
  pad:      { color: 0x3a3d42, metalness: 0.3,  roughness: 0.7  },
  hat:      { color: 0xbfc3c9, metalness: 0.9,  roughness: 0.4  }, // alloy hat

  // --- Cooling ---
  core:     { color: 0x2b2e33, metalness: 0.4,  roughness: 0.7  }, // dark radiator core
  tank:     { color: 0xb6bac0, metalness: 0.85, roughness: 0.45 }, // alloy tanks
  hose:     { color: 0x202225, metalness: 0.2,  roughness: 0.8  },
  plastic:  { color: 0x3b3f45, metalness: 0.2,  roughness: 0.75 }, // expansion tank / housings
  translucent: { color: 0xd7dbe0, metalness: 0.1, roughness: 0.5, opacity: 0.6 },
  // X-RAY shells — see through housings to filters / internals
  intakeShell: { color: 0x9aa1ab, metalness: 0.15, roughness: 0.55, opacity: 0.28 },
  plenumShell: { color: 0x7a8088, metalness: 0.2,  roughness: 0.5,  opacity: 0.32 },

  // --- Generic small parts ---
  paper:    { color: 0xd9c79a, metalness: 0.0,  roughness: 0.9  }, // filter media (pleats)
  rubber:   { color: 0x202225, metalness: 0.1,  roughness: 0.85 },
};

export function materialToGltf(spec) {
  const rgb = hexToRgb(spec.color);
  const hasAlpha = typeof spec.opacity === 'number' && spec.opacity < 1;
  const mat = {
    pbrMetallicRoughness: {
      baseColorFactor: [rgb[0], rgb[1], rgb[2], hasAlpha ? spec.opacity : 1],
      metallicFactor: spec.metalness ?? 0.5,
      roughnessFactor: spec.roughness ?? 0.5,
    },
  };
  if (hasAlpha) {
    mat.alphaMode = 'BLEND';
    mat.doubleSided = true;
  }
  return mat;
}
