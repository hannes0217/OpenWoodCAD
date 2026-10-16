/** Dimensioned planning patterns; procurement must match the exact chosen
 * fitting and mounting plate. Numeric facts are independently represented.
 * Source for the 35/45/9.5 cup pattern and 13 mm depth: Blum TD-032/1EN, p.3.
 * https://d2.blum.com/services/BEC003/clp0001-td-032_td_dok_bau_$sen_$aof_$v4.pdf
 * Plate/pilot values below are configurable workshop planning defaults. */
export const HINGE_PATTERNS = {
  cup35_45: { hardwareId: 'hinge_110', cupDiameter: 35, cupDepth: 13, cupSetback: 4.5, fixingSpacing: 45, fixingOffset: 9.5, pilotDiameter: 3, pilotDepth: 10, plateFront: 37, plateSpacing: 32, plateDiameter: 5, plateDepth: 12, angle: 110,
    source: 'https://d2.blum.com/services/BEC003/clp0001-td-032_td_dok_bau_$sen_$aof_$v4.pdf' },
} as const;
export const HANDLE_PATTERNS = {
  knob: { hardwareId: 'knob', spacing: 0, diameter: 5 },
  handle_96: { hardwareId: 'handle_96', spacing: 96, diameter: 5 },
  handle_128: { hardwareId: 'handle_128', spacing: 128, diameter: 5 },
  handle_160: { hardwareId: 'handle_160', spacing: 160, diameter: 5 },
} as const;

export function hingeLevels(bottom: number, height: number, count: number): number[] {
  if (!Number.isFinite(bottom) || !Number.isFinite(height) || height < 160 || !Number.isInteger(count) || count < 2 || count > 6) throw new Error('Invalid hinge layout');
  const margin = Math.min(100, height / 4), pitch = (height - 2 * margin) / (count - 1);
  if (pitch < 60) throw new Error('Hinges are too close');
  return Array.from({length:count},(_,i)=>bottom+margin+i*pitch);
}
