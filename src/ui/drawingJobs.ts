/** A job is valid only for the exact document and option snapshot. */
export class DrawingJobs {
  private generation=0;
  private active: { token:number; doc:unknown; key:string } | null=null;
  begin(doc:unknown,key:string):number {const token=++this.generation;this.active={token,doc,key};return token;}
  cancel():void {this.generation++;this.active=null;}
  current(token:number,doc:unknown,key:string):boolean {return this.active?.token===token&&this.active.doc===doc&&this.active.key===key;}
}
export function drawingPrintHtml(title:string,format:string,svgs:string[]):string {
  const escape=(value:string)=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
  const page=['A4','A3','A2'].includes(format)?format:'A3';
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escape(title)}</title><style>@page{size:${page} landscape;margin:0}body{margin:0}svg{width:100vw;height:auto;page-break-after:always;display:block}</style></head><body>${svgs.join('')}</body></html>`;
}
