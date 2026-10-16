import { useEffect, useRef, useState } from 'react';
import { cadCommands, filterCommands } from '../commands';
import { useT } from '../i18n';
export function CommandPalette({onClose}:{onClose:()=>void}) {
 const t=useT(),[query,setQuery]=useState(''),[index,setIndex]=useState(0),input=useRef<HTMLInputElement>(null),close=useRef<HTMLButtonElement>(null);
 const commands=filterCommands(cadCommands(),query),selected=Math.min(index,Math.max(0,commands.length-1));
 useEffect(()=>{const previous=document.activeElement as HTMLElement|null;input.current?.focus();return ()=>previous?.focus();},[]);
 useEffect(()=>{document.getElementById(`cad-command-${selected}`)?.scrollIntoView({block:'nearest'});},[selected,query]);
 const run=(i:number)=>{const command=commands[i];if(command && !command.disabled){onClose();command.run();}};
 return <div className="cad-palette-backdrop" onMouseDown={(e)=>{if(e.target===e.currentTarget)onClose();}}>
  <section className="cad-palette" role="dialog" aria-modal="true" aria-label={t('cad.search')} onKeyDown={(e)=>{
   if(e.key==='Escape'){e.preventDefault();e.stopPropagation();onClose();}
   if(e.key==='ArrowDown' || e.key==='ArrowUp'){e.preventDefault();setIndex(commands.length?(selected+(e.key==='ArrowDown'?1:-1)+commands.length)%commands.length:0);}
   if(e.key==='Enter' && e.target===input.current){e.preventDefault();run(selected);}
   if(e.key==='Tab'){e.preventDefault();if(document.activeElement===input.current)close.current?.focus();else input.current?.focus();}
  }}>
   <div className="cad-palette-input"><input ref={input} value={query} placeholder={t('cad.searchHint')} aria-label={t('cad.search')} role="combobox" aria-expanded="true" aria-controls="cad-command-list" aria-activedescendant={commands.length?`cad-command-${selected}`:undefined} onChange={(e)=>{setQuery(e.target.value);setIndex(0);}}/><button ref={close} onClick={onClose} aria-label={t('cad.close')}>Esc</button></div>
   <div id="cad-command-list" className="cad-command-list" role="listbox" aria-label={t('cad.search')}>
    {!commands.length && <p className="pad muted">{t('cad.noResults')}</p>}
    {commands.map((c,i)=><div key={c.id} id={`cad-command-${i}`} role="option" aria-selected={i===selected} aria-disabled={!!c.disabled} className={`cad-command ${i===selected?'active':''} ${c.disabled?'disabled':''}`} onMouseEnter={()=>setIndex(i)} onMouseDown={(e)=>e.preventDefault()} onClick={()=>run(i)}><span><small>{c.group}</small>{c.label}</span>{c.shortcut && <kbd>{c.shortcut}</kbd>}</div>)}
   </div>
  </section>
 </div>;
}
