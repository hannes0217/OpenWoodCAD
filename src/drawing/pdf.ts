import { jsPDF } from 'jspdf';
import 'svg2pdf.js';
import type { DrawnSheet } from './sheets';

/** Render drawing sheets to a multi-page PDF (vector). */
export async function sheetsToPdf(sheets: DrawnSheet[], title: string): Promise<Blob> {
  if (!sheets.length) throw new Error('no sheets');
  const first = sheets[0];
  const doc = new jsPDF({ orientation: first.w > first.h ? 'landscape' : 'portrait', unit: 'mm', format: [first.w, first.h], compress: true });
  doc.setProperties({ title, creator: 'OpenWoodCAD' });
  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;left:-10000px;top:0;width:0;height:0;overflow:hidden';
  document.body.appendChild(host);
  try {
    for (let i = 0; i < sheets.length; i++) {
      const s = sheets[i];
      if (i > 0) doc.addPage([s.w, s.h], s.w > s.h ? 'landscape' : 'portrait');
      host.innerHTML = s.svg;
      const el = host.querySelector('svg') as SVGSVGElement;
      await doc.svg(el, { x: 0, y: 0, width: s.w, height: s.h });
    }
  } finally {
    host.remove();
  }
  return doc.output('blob');
}
