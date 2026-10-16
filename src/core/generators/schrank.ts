import { findMaterial } from '../catalog';
import { createBoxElement } from '../elements';
import { HANDLE_PATTERNS, HINGE_PATTERNS, hingeLevels } from '../fittings';
import { toWorld } from '../math';
import { regal } from './regal';
import { drillWorld } from './kommode';
import { emptyOutput, num, str, withDefaults, type GeneratorDef } from './types';

/** Overlay-door cabinet. Closed geometry is authoritative for manufacturing;
 * door motion is a simplified edge rotation, not a four-bar hinge simulation. */
export const schrank: GeneratorDef = {
  type: 'schrank', category: 'furniture',
  params: [
    ...regal.params.filter(p=>!['columns','topOverlay'].includes(p.id)).map(p=>p.type==='number'?{...p,default:p.id==='depth'?550:p.id==='shelves'?3:p.default}:p.type==='select'&&p.id==='shelfType'?{...p,default:'fixed'}:p),
    {id:'doors',group:'layout',type:'number',default:2,min:1,max:2,step:1},
    {id:'hingeCount',group:'construction',type:'number',default:3,min:2,max:6,step:1},
    {id:'doorGap',group:'construction',type:'number',default:2,min:1.5,max:6,step:0.5,unit:'mm'},
    {id:'frontGap',group:'construction',type:'number',default:2,min:1.5,max:8,step:0.5,unit:'mm'},
    {id:'handing',group:'construction',type:'select',default:'left',options:['left','right']},
    {id:'hingePattern',group:'construction',type:'select',default:'cup35_45',options:Object.keys(HINGE_PATTERNS)},
    {id:'cupSetback',group:'construction',type:'number',default:4.5,min:3,max:7,step:0.5,unit:'mm'},
    {id:'plateFront',group:'construction',type:'number',default:37,min:25,max:60,step:0.5,unit:'mm'},
    {id:'handle',group:'construction',type:'select',default:'handle_128',options:['none',...Object.keys(HANDLE_PATTERNS)]},
    {id:'frontMaterial',group:'materials',type:'material',default:'chip19_white',category:'sheet'},
  ],
  build(p,ctx) {
    const body=findMaterial(ctx.catalog,str(p,'bodyMaterial')),front=findMaterial(ctx.catalog,str(p,'frontMaterial'));
    const thickness=front.thickness??0, gap=num(p,'doorGap'), frontGap=num(p,'frontGap');
    const width=num(p,'width'),height=num(p,'height'),depth=num(p,'depth'),plinth=num(p,'plinth');
    const count=Math.round(num(p,'doors')),hinges=Math.round(num(p,'hingeCount'));
    const pattern=HINGE_PATTERNS[str(p,'hingePattern') as keyof typeof HINGE_PATTERNS];
    const cupSetback=num(p,'cupSetback'),plateFront=num(p,'plateFront');
    const doorWidth=(width-2*gap-(count-1)*gap)/count,doorHeight=height-plinth-2*gap,doorBottom=plinth+gap;
    const bad=()=>{const out=emptyOutput();out.warnings.push({key:'warn.schrank.layout'});return out;};
    if(!pattern||![1,2].includes(count)||!Number.isInteger(hinges)||thickness<16||thickness>24||thickness<pattern.cupDepth+2||!(body.thickness!>=16)||doorWidth<90||depth-thickness-frontGap<150||cupSetback<3||cupSetback>7||plateFront<25||plateFront>60)return bad();
    let levels:number[];try{levels=hingeLevels(doorBottom,doorHeight,hinges);}catch{return bad();}
    const out=regal.build(withDefaults(regal,{...p,depth:depth-thickness-frontGap,columns:1,topOverlay:false}),ctx);
    if(out.warnings.length)return out;
    const left=out.elements.find(e=>e.id===`${ctx.id}/side-l`)!,right=out.elements.find(e=>e.id===`${ctx.id}/side-r`)!;
    const sides=count===2?[left,right]:[str(p,'handing')==='right'?right:left];
    for(let i=0;i<count;i++){
      const side=sides[i],isLeft=side===left,x=gap+i*(doorWidth+gap);
      const door=createBoxElement([x,-thickness-frontGap,doorBottom],[doorWidth,thickness,doorHeight],{id:`${ctx.id}/door-${i+1}`,name:count===1?'Tür':isLeft?'Tür links':'Tür rechts',role:'front',generator:ctx.id,materialId:front.id,grain:'z',thick:'y',band:{x:'both',z:'both'}});
      door.tags={fittingPattern:str(p,'hingePattern'),fittingSource:pattern.source};
      door.motion={group:`${ctx.id}/door-${i+1}`,dir:[0,0,0],travel:0,rotation:{pivot:[isLeft?x:x+doorWidth,-frontGap,doorBottom],axis:[0,0,1],angle:isLeft?-pattern.angle:pattern.angle}};
      const cupX=isLeft?x+pattern.cupDiameter/2+cupSetback:x+doorWidth-pattern.cupDiameter/2-cupSetback;
      for(const [index,z] of levels.entries()){
        drillWorld(door,`${door.id}:cup${index}`,[cupX,-frontGap,z],[0,-1,0],pattern.cupDiameter,pattern.cupDepth,false);
        const fixingX=cupX+(isLeft?1:-1)*pattern.fixingOffset;
        for(const dz of [-pattern.fixingSpacing/2,pattern.fixingSpacing/2])drillWorld(door,`${door.id}:fix${index}-${dz}`,[fixingX,-frontGap,z+dz],[0,-1,0],pattern.pilotDiameter,pattern.pilotDepth,false);
        const innerX=isLeft?body.thickness!:width-body.thickness!;
        for(const dz of [-pattern.plateSpacing/2,pattern.plateSpacing/2]){
          // Interrupt optional System-32 rows where a plate hole would touch it.
          side.processings=side.processings.filter(pr=>{if(pr.geom!=='drill'||!pr.id.includes(':sp'))return true;const q=toWorld(side.frame,pr.p);return Math.abs(q[1]-plateFront)>6||Math.abs(q[2]-(z+dz))>6;});
          drillWorld(side,`${door.id}:plate${index}-${dz}`,[innerX,plateFront,z+dz],[isLeft?-1:1,0,0],pattern.plateDiameter,Math.min(pattern.plateDepth,body.thickness!-2),false);
        }
      }
      const handle=HANDLE_PATTERNS[str(p,'handle') as keyof typeof HANDLE_PATTERNS];
      if(handle){
        const handleX=isLeft?x+doorWidth-30:x+30,center=doorBottom+doorHeight/2;
        for(const [index,dz] of (handle.spacing?[-handle.spacing/2,handle.spacing/2]:[0]).entries())drillWorld(door,`${door.id}:handle${index}`,[handleX,-frontGap,center+dz],[0,-1,0],handle.diameter,thickness,true);
        out.hardware.push({itemId:handle.hardwareId,qty:1,source:ctx.id},{itemId:thickness<=20?'handle_m4x25':'handle_m4x30',qty:handle.spacing?2:1,source:ctx.id});
      }
      out.elements.push(door);
      out.hardware.push({itemId:pattern.hardwareId,qty:hinges,source:ctx.id},{itemId:'hinge_screw_3_5x15',qty:2*hinges,source:ctx.id},{itemId:'plate_euro_6_3x13',qty:2*hinges,source:ctx.id});
    }
    out.notes.push({key:'note.schrank.fittings'},{key:'note.schrank.motion'});
    out.mounting.push(...levels.map((z,i)=>({label:{key:'note.schrank.hinge',args:{n:i+1}},value:z,unit:'mm'})));
    return out;
  },
};
