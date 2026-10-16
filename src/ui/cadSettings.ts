export interface CadSettings {
  navigation: 'cad' | 'classic';
  projection: 'perspective' | 'orthographic';
  leftOpen: boolean;
  rightOpen: boolean;
  leftWidth: number;
  rightWidth: number;
}
export const DEFAULT_CAD: CadSettings = {navigation:'cad',projection:'perspective',leftOpen:true,rightOpen:true,leftWidth:250,rightWidth:300};
/** Preferences are untrusted JSON, never document data. */
export function readCadSettings(value: unknown): CadSettings {
  const v=value && typeof value==='object'?value as Record<string,unknown>:{};
  const width=(key:string,fallback:number) => typeof v[key]==='number' && Number.isFinite(v[key])?Math.max(200,Math.min(460,v[key] as number)):fallback;
  return {navigation:v.navigation==='classic'?'classic':'cad',projection:v.projection==='orthographic'?'orthographic':'perspective',
    leftOpen:typeof v.leftOpen==='boolean'?v.leftOpen:true,rightOpen:typeof v.rightOpen==='boolean'?v.rightOpen:true,
    leftWidth:width('leftWidth',DEFAULT_CAD.leftWidth),rightWidth:width('rightWidth',DEFAULT_CAD.rightWidth)};
}
