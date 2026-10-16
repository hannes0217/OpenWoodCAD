import type { Localized, OwcDocument } from './model';

// Example prices in EUR (typical German trade/DIY level, 2026). They are only a
// starting point: every price can be overridden per project.

export interface Material {
  id: string;
  name: Localized;
  category: 'sheet' | 'timber';
  color: string;
  /** Mean density kg/m³ (weights, self-weight in statics). */
  density: number;
  /** Visible / structural grain: sheet pieces keep their length along the sheet length. */
  grain: boolean;
  // ---- sheet materials
  thickness?: number;
  sheetLength?: number;
  sheetWidth?: number;
  pricePerSheet?: number;
  /** Hardware id of the edge banding used for visible edges, null = raw edges. */
  edgeBanding?: string | null;
  // ---- timber
  strengthClass?: string;
  pricePerM3?: number;
  /** Available stock lengths for linear nesting. */
  stockLengths?: number[];
  /** Common cross-sections [width, height] offered in the UI. */
  sections?: [number, number][];
}

export interface HardwareItem {
  id: string;
  name: Localized;
  category: 'connector' | 'screw' | 'fitting' | 'edge' | 'consumable' | 'steel';
  packSize: number;
  price: number;
  /** For edge banding rolls. */
  metresPerRoll?: number;
  /** Assembly time in minutes per piece (labour costing). */
  minutes?: number;
}

const KVH_SECTIONS: [number, number][] = [
  [60, 120], [60, 140], [60, 160], [60, 180], [60, 200], [60, 240],
  [80, 80], [80, 120], [80, 140], [80, 160], [80, 180], [80, 200], [80, 240],
  [100, 100], [100, 120], [100, 160], [100, 200], [100, 240],
  [120, 120], [120, 160], [120, 200], [120, 240], [140, 140], [160, 160],
];
const GL_SECTIONS: [number, number][] = [
  [100, 200], [100, 240], [120, 200], [120, 240], [120, 280], [140, 240], [140, 280], [140, 320],
  [160, 240], [160, 320], [160, 360], [200, 200], [200, 400],
];
const LATH_SECTIONS: [number, number][] = [[24, 48], [30, 50], [40, 60], [24, 98], [28, 145]];
const range = (from: number, to: number, step: number) => Array.from({ length: Math.floor((to - from) / step) + 1 }, (_, i) => from + i * step);

export const DEFAULT_MATERIALS: Material[] = [
  // ---------------- solid timber
  { id: 'kvh_c24', name: { de: 'KVH Fichte C24 (Konstruktionsvollholz)', en: 'Structural finger-jointed spruce C24 (KVH)' }, category: 'timber', color: '#e2c48c', density: 420, grain: true, strengthClass: 'C24', pricePerM3: 650, stockLengths: [5000, 6000, 7000, 8000, 10000, 13000], sections: KVH_SECTIONS },
  { id: 'bsh_gl24h', name: { de: 'BSH Fichte GL24h (Brettschichtholz)', en: 'Glulam spruce GL24h' }, category: 'timber', color: '#d9b77c', density: 420, grain: true, strengthClass: 'GL24h', pricePerM3: 850, stockLengths: range(6000, 18000, 1000), sections: GL_SECTIONS },
  { id: 'bauholz_c24', name: { de: 'Bauholz Fichte/Tanne C24 sägerau', en: 'Sawn spruce/fir C24' }, category: 'timber', color: '#d8bd8a', density: 420, grain: true, strengthClass: 'C24', pricePerM3: 480, stockLengths: [3000, 4000, 5000, 6000, 7000, 8000], sections: KVH_SECTIONS },
  { id: 'larch_c24', name: { de: 'Lärche C24', en: 'Larch C24' }, category: 'timber', color: '#c98f5a', density: 600, grain: true, strengthClass: 'C24', pricePerM3: 950, stockLengths: [3000, 4000, 5000, 6000], sections: KVH_SECTIONS },
  { id: 'douglas_c24', name: { de: 'Douglasie C24', en: 'Douglas fir C24' }, category: 'timber', color: '#cf9a6a', density: 530, grain: true, strengthClass: 'C24', pricePerM3: 800, stockLengths: [3000, 4000, 5000, 6000], sections: KVH_SECTIONS },
  { id: 'oak_d30', name: { de: 'Eiche D30 Kantholz', en: 'Oak D30 squared timber' }, category: 'timber', color: '#a87a48', density: 700, grain: true, strengthClass: 'D30', pricePerM3: 2200, stockLengths: [2000, 3000, 4000, 5000], sections: KVH_SECTIONS },
  { id: 'lath_s10', name: { de: 'Dachlatte S10 imprägniert', en: 'Roof batten S10 treated' }, category: 'timber', color: '#bfae7a', density: 450, grain: true, strengthClass: 'C24', pricePerM3: 560, stockLengths: [4000, 4500, 5000], sections: LATH_SECTIONS },
  // ---------------- sheet materials
  { id: 'chip19_white', name: { de: 'Spanplatte melaminbeschichtet weiß 19 mm', en: 'Melamine chipboard white 19 mm' }, category: 'sheet', color: '#f2f1ec', density: 650, thickness: 19, sheetLength: 2800, sheetWidth: 2070, pricePerSheet: 75, grain: false, edgeBanding: 'edge_white_23' },
  { id: 'chip19_oak', name: { de: 'Spanplatte Dekor Eiche 19 mm', en: 'Melamine chipboard oak decor 19 mm' }, category: 'sheet', color: '#c9a36b', density: 650, thickness: 19, sheetLength: 2800, sheetWidth: 2070, pricePerSheet: 85, grain: true, edgeBanding: 'edge_oak_23' },
  { id: 'mdf19', name: { de: 'MDF roh 19 mm (zum Lackieren)', en: 'MDF raw 19 mm (for painting)' }, category: 'sheet', color: '#b89c7d', density: 750, thickness: 19, sheetLength: 2800, sheetWidth: 2070, pricePerSheet: 60, grain: false, edgeBanding: null },
  { id: 'ply_birch18', name: { de: 'Multiplex Birke 18 mm', en: 'Birch plywood 18 mm' }, category: 'sheet', color: '#e3c99a', density: 680, thickness: 18, sheetLength: 2500, sheetWidth: 1250, pricePerSheet: 120, grain: true, edgeBanding: null },
  { id: 'glulam_spruce18', name: { de: 'Leimholzplatte Fichte 18 mm', en: 'Spruce glued panel 18 mm' }, category: 'sheet', color: '#ead2a3', density: 450, thickness: 18, sheetLength: 2000, sheetWidth: 600, pricePerSheet: 35, grain: true, edgeBanding: null },
  { id: 'glulam_beech20', name: { de: 'Leimholzplatte Buche 20 mm', en: 'Beech glued panel 20 mm' }, category: 'sheet', color: '#dcae7e', density: 700, thickness: 20, sheetLength: 2000, sheetWidth: 600, pricePerSheet: 85, grain: true, edgeBanding: null },
  { id: 'glulam_oak20', name: { de: 'Leimholzplatte Eiche 20 mm', en: 'Oak glued panel 20 mm' }, category: 'sheet', color: '#b98b52', density: 700, thickness: 20, sheetLength: 2000, sheetWidth: 600, pricePerSheet: 115, grain: true, edgeBanding: null },
  { id: 'ply_poplar15', name: { de: 'Pappel-Sperrholz 15 mm', en: 'Poplar plywood 15 mm' }, category: 'sheet', color: '#ecdcb8', density: 450, thickness: 15, sheetLength: 2500, sheetWidth: 1250, pricePerSheet: 55, grain: true, edgeBanding: null },
  { id: 'ply_poplar12', name: { de: 'Pappel-Sperrholz 12 mm', en: 'Poplar plywood 12 mm' }, category: 'sheet', color: '#efe1c0', density: 450, thickness: 12, sheetLength: 2500, sheetWidth: 1250, pricePerSheet: 45, grain: true, edgeBanding: null },
  { id: 'ply_poplar6', name: { de: 'Pappel-Sperrholz 6 mm', en: 'Poplar plywood 6 mm' }, category: 'sheet', color: '#f2e6ca', density: 450, thickness: 6, sheetLength: 2500, sheetWidth: 1250, pricePerSheet: 30, grain: false, edgeBanding: null },
  { id: 'hdf3_white', name: { de: 'HDF-Rückwand weiß 3 mm', en: 'HDF back panel white 3 mm' }, category: 'sheet', color: '#fafafa', density: 850, thickness: 3, sheetLength: 2800, sheetWidth: 2070, pricePerSheet: 20, grain: false, edgeBanding: null },
  { id: 'osb18', name: { de: 'OSB/3 18 mm', en: 'OSB/3 18 mm' }, category: 'sheet', color: '#d6b276', density: 600, thickness: 18, sheetLength: 2500, sheetWidth: 1250, pricePerSheet: 32, grain: true, edgeBanding: null },
  { id: 'osb22', name: { de: 'OSB/3 22 mm Nut und Feder', en: 'OSB/3 22 mm tongue & groove' }, category: 'sheet', color: '#d2ad70', density: 600, thickness: 22, sheetLength: 2500, sheetWidth: 675, pricePerSheet: 18, grain: true, edgeBanding: null },
  { id: 'dwd16', name: { de: 'Holzfaserplatte DWD 16 mm', en: 'Wood fibre sarking board 16 mm' }, category: 'sheet', color: '#9c7c55', density: 550, thickness: 16, sheetLength: 2500, sheetWidth: 625, pricePerSheet: 16, grain: false, edgeBanding: null },
  { id: 'gypsum12', name: { de: 'Gipskartonplatte 12,5 mm', en: 'Plasterboard 12.5 mm' }, category: 'sheet', color: '#e9e9e4', density: 800, thickness: 12.5, sheetLength: 2600, sheetWidth: 1250, pricePerSheet: 9, grain: false, edgeBanding: null },
  { id: 'rauspund24', name: { de: 'Rauspund 24 mm (Schalung)', en: 'Rough T&G boards 24 mm' }, category: 'sheet', color: '#cfb385', density: 450, thickness: 24, sheetLength: 4000, sheetWidth: 2000, pricePerSheet: 95, grain: true, edgeBanding: null },
];

export const DEFAULT_HARDWARE: HardwareItem[] = [
  { id: 'dowel_8x35', name: { de: 'Holzdübel 8 × 35 mm', en: 'Wood dowels 8 × 35 mm' }, category: 'connector', packSize: 100, price: 4, minutes: 0.5 },
  { id: 'confirmat_7x50', name: { de: 'Konfirmatschrauben 7 × 50 mm', en: 'Confirmat screws 7 × 50 mm' }, category: 'connector', packSize: 50, price: 8, minutes: 0.5 },
  { id: 'confirmat_cap', name: { de: 'Abdeckkappen für Konfirmat', en: 'Cover caps for confirmat screws' }, category: 'connector', packSize: 50, price: 3, minutes: 0.1 },
  { id: 'screw_4x50', name: { de: 'Spanplattenschrauben 4 × 50 mm', en: 'Chipboard screws 4 × 50 mm' }, category: 'screw', packSize: 100, price: 7, minutes: 0.3 },
  { id: 'screw_4x40', name: { de: 'Spanplattenschrauben 4 × 40 mm', en: 'Chipboard screws 4 × 40 mm' }, category: 'screw', packSize: 200, price: 8, minutes: 0.3 },
  { id: 'screw_4x30', name: { de: 'Spanplattenschrauben 4 × 30 mm', en: 'Chipboard screws 4 × 30 mm' }, category: 'screw', packSize: 200, price: 7, minutes: 0.3 },
  { id: 'screw_4x25', name: { de: 'Spanplattenschrauben 4 × 25 mm', en: 'Chipboard screws 4 × 25 mm' }, category: 'screw', packSize: 200, price: 7, minutes: 0.3 },
  { id: 'screw_4x16', name: { de: 'Spanplattenschrauben 4 × 16 mm', en: 'Chipboard screws 4 × 16 mm' }, category: 'screw', packSize: 200, price: 6, minutes: 0.2 },
  { id: 'screw_3x16', name: { de: 'Rückwandschrauben 3 × 16 mm', en: 'Back panel screws 3 × 16 mm' }, category: 'screw', packSize: 200, price: 4, minutes: 0.15 },
  { id: 'screw_6x120', name: { de: 'Holzbauschrauben Tellerkopf 6 × 120 mm', en: 'Timber screws washer head 6 × 120 mm' }, category: 'screw', packSize: 100, price: 22, minutes: 0.5 },
  { id: 'screw_8x200', name: { de: 'Holzbauschrauben Tellerkopf 8 × 200 mm', en: 'Timber screws washer head 8 × 200 mm' }, category: 'screw', packSize: 50, price: 30, minutes: 0.7 },
  { id: 'screw_8x300', name: { de: 'Holzbauschrauben Tellerkopf 8 × 300 mm', en: 'Timber screws washer head 8 × 300 mm' }, category: 'screw', packSize: 50, price: 42, minutes: 0.8 },
  { id: 'nail_28x65', name: { de: 'Nägel 2,8 × 65 mm (Lattung)', en: 'Nails 2.8 × 65 mm (battens)' }, category: 'screw', packSize: 1000, price: 14, minutes: 0.05 },
  { id: 'peg_24', name: { de: 'Holznagel Eiche Ø 24 mm', en: 'Oak peg Ø 24 mm' }, category: 'connector', packSize: 1, price: 1.2, minutes: 2 },
  { id: 'rafter_tie', name: { de: 'Sparrenpfettenanker 170 mm (Paar)', en: 'Rafter-to-purlin tie 170 mm (pair)' }, category: 'steel', packSize: 1, price: 1.8, minutes: 2 },
  { id: 'post_base', name: { de: 'Pfostenträger U-Form zum Einbetonieren', en: 'U post base for concrete' }, category: 'steel', packSize: 1, price: 18, minutes: 20 },
  { id: 'angle_90', name: { de: 'Winkelverbinder 90 × 90 mm', en: 'Angle bracket 90 × 90 mm' }, category: 'steel', packSize: 1, price: 1.5, minutes: 2 },
  { id: 'slide_250', name: { de: 'Vollauszug-Kugelführung 250 mm (Paar)', en: 'Full-extension ball slides 250 mm (pair)' }, category: 'fitting', packSize: 1, price: 8, minutes: 10 },
  { id: 'slide_300', name: { de: 'Vollauszug-Kugelführung 300 mm (Paar)', en: 'Full-extension ball slides 300 mm (pair)' }, category: 'fitting', packSize: 1, price: 9, minutes: 10 },
  { id: 'slide_350', name: { de: 'Vollauszug-Kugelführung 350 mm (Paar)', en: 'Full-extension ball slides 350 mm (pair)' }, category: 'fitting', packSize: 1, price: 10, minutes: 10 },
  { id: 'slide_400', name: { de: 'Vollauszug-Kugelführung 400 mm (Paar)', en: 'Full-extension ball slides 400 mm (pair)' }, category: 'fitting', packSize: 1, price: 11, minutes: 10 },
  { id: 'slide_450', name: { de: 'Vollauszug-Kugelführung 450 mm (Paar)', en: 'Full-extension ball slides 450 mm (pair)' }, category: 'fitting', packSize: 1, price: 12, minutes: 10 },
  { id: 'slide_500', name: { de: 'Vollauszug-Kugelführung 500 mm (Paar)', en: 'Full-extension ball slides 500 mm (pair)' }, category: 'fitting', packSize: 1, price: 13, minutes: 10 },
  { id: 'slide_550', name: { de: 'Vollauszug-Kugelführung 550 mm (Paar)', en: 'Full-extension ball slides 550 mm (pair)' }, category: 'fitting', packSize: 1, price: 14, minutes: 10 },
  { id: 'slide_600', name: { de: 'Vollauszug-Kugelführung 600 mm (Paar)', en: 'Full-extension ball slides 600 mm (pair)' }, category: 'fitting', packSize: 1, price: 15, minutes: 10 },
  { id: 'hinge_screw_3_5x15', name: {de:'Topfband-Befestigungsschrauben 3,5 × 15 mm (Muster)',en:'Hinge fixing screws 3.5 × 15 mm (planning)'},category:'screw',packSize:100,price:5,minutes:0.2 },
  { id: 'plate_euro_6_3x13', name: {de:'Montageplatten-Euroschrauben 6,3 × 13 mm (Muster)',en:'Mounting plate Euro screws 6.3 × 13 mm (planning)'},category:'screw',packSize:100,price:6,minutes:0.2 },
  { id: 'handle_m4x25', name: {de:'Griffschrauben M4 × 25 mm',en:'Handle screws M4 × 25 mm'},category:'screw',packSize:50,price:5,minutes:0.2 },
  { id: 'handle_m4x30', name: {de:'Griffschrauben M4 × 30 mm',en:'Handle screws M4 × 30 mm'},category:'screw',packSize:50,price:5,minutes:0.2 },
  { id: 'hinge_110', name: { de: 'Topfscharnier 110° mit Dämpfung, Montageplatte', en: 'Concealed hinge 110° soft-close with plate' }, category: 'fitting', packSize: 1, price: 4.5, minutes: 6 },
  { id: 'shelf_pin', name: { de: 'Bodenträger 5 mm', en: 'Shelf pins 5 mm' }, category: 'fitting', packSize: 50, price: 3, minutes: 0.2 },
  { id: 'knob', name: { de: 'Möbelknopf', en: 'Cabinet knob' }, category: 'fitting', packSize: 1, price: 3, minutes: 2 },
  { id: 'handle_96', name: { de: 'Möbelgriff Bohrabstand 96 mm', en: 'Cabinet handle 96 mm centres' }, category: 'fitting', packSize: 1, price: 4, minutes: 3 },
  { id: 'handle_128', name: { de: 'Möbelgriff Bohrabstand 128 mm', en: 'Cabinet handle 128 mm centres' }, category: 'fitting', packSize: 1, price: 4.5, minutes: 3 },
  { id: 'handle_160', name: { de: 'Möbelgriff Bohrabstand 160 mm', en: 'Cabinet handle 160 mm centres' }, category: 'fitting', packSize: 1, price: 5, minutes: 3 },
  { id: 'glides', name: { de: 'Möbelgleiter zum Nageln (4 Stück)', en: 'Nail-on furniture glides (4 pcs)' }, category: 'fitting', packSize: 4, price: 3, minutes: 0.5 },
  { id: 'glue', name: { de: 'Holzleim D3, 750 g', en: 'Wood glue D3, 750 g' }, category: 'consumable', packSize: 1, price: 9 },
  { id: 'oil', name: { de: 'Hartwachsöl 0,75 l (ca. 15 m²)', en: 'Hardwax oil 0.75 l (approx. 15 m²)' }, category: 'consumable', packSize: 1, price: 25 },
  { id: 'edge_white_23', name: { de: 'Umleimer Melamin weiß 23 mm, mit Schmelzkleber', en: 'Melamine edge banding white 23 mm, pre-glued' }, category: 'edge', packSize: 1, price: 6, metresPerRoll: 10, minutes: 2 },
  { id: 'edge_oak_23', name: { de: 'Umleimer Eiche-Dekor 23 mm, mit Schmelzkleber', en: 'Oak decor edge banding 23 mm, pre-glued' }, category: 'edge', packSize: 1, price: 7, metresPerRoll: 10, minutes: 2 },
];

export interface Catalog {
  materials: Material[];
  hardware: HardwareItem[];
}

/** Catalog for a document: defaults + custom materials, with price overrides applied. */
export function catalogFor(doc?: Pick<OwcDocument, 'prices' | 'customMaterials'>): Catalog {
  const materials = [...DEFAULT_MATERIALS, ...(doc?.customMaterials ?? [])].map((m) => {
    const p = doc?.prices?.[m.id];
    if (p === undefined) return m;
    return m.category === 'sheet' ? { ...m, pricePerSheet: p } : { ...m, pricePerM3: p };
  });
  const hardware = DEFAULT_HARDWARE.map((h) => {
    const p = doc?.prices?.[h.id];
    return p === undefined ? h : { ...h, price: p };
  });
  return { materials, hardware };
}

export function findMaterial(catalog: Catalog, id: string): Material {
  const m = catalog.materials.find((x) => x.id === id);
  if (!m) throw new Error(`Unknown material ${id}`);
  return m;
}

export function findHardware(catalog: Catalog, id: string): HardwareItem {
  const h = catalog.hardware.find((x) => x.id === id);
  if (!h) throw new Error(`Unknown hardware ${id}`);
  return h;
}

export function materialName(m: { name: Localized }, lang: string): string {
  return lang === 'de' ? m.name.de : m.name.en;
}
