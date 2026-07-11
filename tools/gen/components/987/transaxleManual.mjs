// 987 manual transaxle — delegates to the shared 981 builder. The 987 is the
// same mid-engine RWD transaxle layout with the same clutch/case/final-drive
// packaging: bell + dual-mass flywheel + single dry clutch at +Z, one-piece
// gear case, cable-operated shift unit on top, final drive low between the
// output flanges. The 987 gearbox is the G87 family (5-speed on 987.1 base
// cars; 6-speed on 987.1 S models and all 987.2) versus the 981's G81.20
// 6-speed — the visual geometry is unchanged at this illustration scale, so
// only public/models/components/987/trans-manual-parts.json wording differs.
import { meta as base, build as build981 } from '../transaxleManual.mjs';

export const meta = { ...base, generation: '987' };

export function build() {
  return build981();
}
