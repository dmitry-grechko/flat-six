// 987 driveline — delegates to the shared 981 builder. The 987 is the same
// mid-engine RWD transaxle layout: rear half-shafts with inner/outer CV
// joints + bellows from the final-drive flanges to the rear hubs, engine and
// transmission mounts. 987.2 pairs the 9A1 with PDK or 6-speed manual (987.1:
// Tiptronic S / 5- and 6-speed manual) — the shaft/CV geometry is unchanged,
// so only public/models/components/987/driveline-parts.json wording differs.
import { meta as base, build as build981 } from '../driveline.mjs';

export const meta = { ...base, generation: '987' };

export function build() {
  return build981();
}
