const paths:Record<string,string>={
 '✥':'M12 3v18M3 12h18M9 6l3-3 3 3M9 18l3 3 3-3M6 9l-3 3 3 3M18 9l3 3-3 3',
 '⟳':'M20 7v5h-5M20 12a8 8 0 1 0-2 6',
 '＋':'M12 4v16M4 12h16','▬':'M3 10l13-6 5 4-13 6-5-4v6l5 4 13-6V8M8 14v6',
 '▭':'M3 5h18v14H3z','◯':'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18',
 '⬠':'M5 20L2 9l10-7 10 7-3 11z','⬚':'M3 4h18v16H3zM8 8h8v8H8z','⊙':'M3 4h18v16H3zM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8',
 '📏':'M3 17L17 3l4 4L7 21zM7 13l3 3M11 9l3 3M15 5l3 3',
 '⋈':'M3 5l18 14V5L3 19z','⧉':'M8 8h13v13H8zM16 8V3H3v13h5','🗑':'M4 6h16M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7',
 '◰':'M3 9V3h6M15 3h6v6M21 15v6h-6M9 21H3v-6M8 8h8v8H8z',
 '▣':'M4 4h16v16H4zM4 4l4 4h12M8 8v12','◧':'M4 4h16v16H4zM15 4v16M15 4l5 4',
 '⊡':'M4 4h16v16H4zM4 9h16M4 9l4-5','👁':'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6',
 '⇲':'M4 4h16v16H4zM9 9h11M9 9v11M13 13h7M16 16l4 4',
 'cursor':'M5 3l15 10-7 1-3 7z',
};
export function ToolIcon({glyph}:{glyph:string}) {
 return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[glyph]??paths['▭']}/></svg>;
}
