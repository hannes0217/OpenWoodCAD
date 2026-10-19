import type { OutlinePt } from './model';

export interface SketchPoint {id:string;x:number;y:number}
export interface SketchSegment {id:string;a:string;b:string}
interface ConstraintBase {id:string}
export type SketchConstraint = ConstraintBase & (
  {type:'fixed';point:string;x:number;y:number} |
  {type:'coincident';a:string;b:string} |
  {type:'distance'|'distanceX'|'distanceY';a:string;b:string;value:number} |
  {type:'horizontal'|'vertical';line:string} |
  {type:'length';line:string;value:number} |
  {type:'equal'|'parallel'|'perpendicular';a:string;b:string} |
  {type:'angle';a:string;b:string;value:number}
);
export interface ParametricSketch {points:SketchPoint[];segments:SketchSegment[];constraints:SketchConstraint[]}
export const SKETCH_CONSTRAINTS=['fixed','coincident','distance','distanceX','distanceY','horizontal','vertical','length','equal','parallel','perpendicular','angle'] as const;
export type SketchStatus='underConstrained'|'fullyConstrained'|'overConstrained'|'inconsistent'|'invalid';
export interface SketchSolution {sketch:ParametricSketch;status:SketchStatus;degreesOfFreedom:number;redundant:number;conflicts:string[];residual:number;iterations:number}
const bounded=(n:unknown):n is number=>typeof n==='number'&&Number.isFinite(n)&&Math.abs(n)<=1e6;
const identifier=(id:unknown):id is string=>typeof id==='string'&&!!id&&id.length<=100;

export function validSketch(value:unknown):value is ParametricSketch {
  if(!value||typeof value!=='object')return false;
  const s=value as ParametricSketch;
  if(!Array.isArray(s.points)||!Array.isArray(s.segments)||!Array.isArray(s.constraints)||s.points.length>32||s.segments.length>64||s.constraints.length>128)return false;
  const points=new Set<string>(),lines=new Set<string>(),constraints=new Set<string>();
  for(const p of s.points){if(!p||!identifier(p.id)||points.has(p.id)||!bounded(p.x)||!bounded(p.y))return false;points.add(p.id);}
  for(const line of s.segments){if(!line||!identifier(line.id)||lines.has(line.id)||line.a===line.b||!points.has(line.a)||!points.has(line.b))return false;lines.add(line.id);}
  for(const c of s.constraints){
    if(!c||!identifier(c.id)||constraints.has(c.id)||!SKETCH_CONSTRAINTS.includes(c.type))return false;constraints.add(c.id);
    switch(c.type){
      case 'fixed':if(!points.has(c.point)||!bounded(c.x)||!bounded(c.y))return false;break;
      case 'coincident':case 'distance':case 'distanceX':case 'distanceY':
        if(!points.has(c.a)||!points.has(c.b)||c.a===c.b||c.type!=='coincident'&&(!bounded(c.value)||c.type==='distance'&&c.value<0))return false;break;
      case 'horizontal':case 'vertical':case 'length':
        if(!lines.has(c.line)||c.type==='length'&&(!bounded(c.value)||c.value<=0))return false;break;
      default:if(!lines.has(c.a)||!lines.has(c.b)||c.a===c.b||c.type==='angle'&&(!bounded(c.value)||Math.abs(c.value)>360))return false;
    }
  }
  return true;
}

/** Small dense Gaussian elimination with partial pivoting (normal equations). */
function linearSolve(matrix:number[][],rhs:number[]):number[]|null {
  const n=rhs.length,a=matrix.map((row,i)=>[...row,rhs[i]]);
  for(let k=0;k<n;k++){
    let pivot=k;for(let i=k+1;i<n;i++)if(Math.abs(a[i][k])>Math.abs(a[pivot][k]))pivot=i;
    if(Math.abs(a[pivot][k])<1e-18)return null;
    [a[k],a[pivot]]=[a[pivot],a[k]];
    for(let i=k+1;i<n;i++){const f=a[i][k]/a[k][k];for(let j=k;j<=n;j++)a[i][j]-=f*a[k][j];}
  }
  const out=Array(n).fill(0) as number[];
  for(let i=n-1;i>=0;i--){let v=a[i][n];for(let j=i+1;j<n;j++)v-=a[i][j]*out[j];out[i]=v/a[i][i];}
  return out.every(Number.isFinite)?out:null;
}
function rank(matrix:number[][]):number {
  if(!matrix.length)return 0;
  const a=matrix.map(row=>[...row]),cols=a[0].length;let r=0;
  const largest=Math.max(1,...a.flat().map(Math.abs)),tolerance=largest*1e-7;
  for(let c=0;c<cols&&r<a.length;c++){
    let pivot=r;for(let i=r+1;i<a.length;i++)if(Math.abs(a[i][c])>Math.abs(a[pivot][c]))pivot=i;
    if(Math.abs(a[pivot][c])<=tolerance)continue;
    [a[r],a[pivot]]=[a[pivot],a[r]];const divisor=a[r][c];for(let j=c;j<cols;j++)a[r][j]/=divisor;
    for(let i=r+1;i<a.length;i++){const factor=a[i][c];for(let j=c;j<cols;j++)a[i][j]-=factor*a[r][j];}r++;
  }
  return r;
}

export function solveSketch(source:ParametricSketch):SketchSolution {
  const sketch=structuredClone(source);
  if(!validSketch(sketch))return {sketch,status:'invalid',degreesOfFreedom:0,redundant:0,conflicts:[],residual:Infinity,iterations:0};
  if(!sketch.points.length)return {sketch,status:'invalid',degreesOfFreedom:0,redundant:0,conflicts:[],residual:0,iterations:0};
  const pointIndices=new Map(sketch.points.map((p,i)=>[p.id,i*2])),lines=new Map(sketch.segments.map(line=>[line.id,line]));
  let x=sketch.points.flatMap(p=>[p.x,p.y]);
  const residuals=(variables:number[])=>{
    const point=(id:string)=>{const i=pointIndices.get(id)!;return [variables[i],variables[i+1]];};
    const vector=(id:string)=>{const line=lines.get(id)!,a=point(line.a),b=point(line.b);return [b[0]-a[0],b[1]-a[1]];};
    const rows:{id:string;values:number[]}[]=[];
    for(const c of sketch.constraints){
      let values:number[];
      switch(c.type){
        case 'fixed':{const p=point(c.point);values=[p[0]-c.x,p[1]-c.y];break;}
        case 'coincident':{const a=point(c.a),b=point(c.b);values=[b[0]-a[0],b[1]-a[1]];break;}
        case 'distance':case 'distanceX':case 'distanceY':{const a=point(c.a),b=point(c.b);values=c.type==='distance'&&c.value===0?[b[0]-a[0],b[1]-a[1]]:[(c.type==='distance'?Math.hypot(b[0]-a[0],b[1]-a[1]):b[c.type==='distanceX'?0:1]-a[c.type==='distanceX'?0:1])-c.value];break;}
        case 'horizontal':case 'vertical':case 'length':{const v=vector(c.line);values=[c.type==='length'?Math.hypot(...v)-c.value:v[c.type==='horizontal'?1:0]];break;}
        default:{
          const a=vector(c.a),b=vector(c.b),product=Math.max(1e-12,Math.hypot(...a)*Math.hypot(...b));
          const cross=a[0]*b[1]-a[1]*b[0],dot=a[0]*b[0]+a[1]*b[1];
          if(c.type==='equal')values=[Math.hypot(...a)-Math.hypot(...b)];
          else if(c.type==='angle'){const delta=Math.atan2(cross,dot)-c.value*Math.PI/180;values=[100*Math.atan2(Math.sin(delta),Math.cos(delta))];}
          else values=[100*(c.type==='parallel'?cross:dot)/product];
        }
      }
      rows.push({id:c.id,values});
    }
    return rows;
  };
  const flat=(variables:number[])=>residuals(variables).flatMap(row=>row.values);
  const jacobian=(variables:number[])=>{
    const matrix=Array.from({length:flat(variables).length},()=>Array(variables.length).fill(0) as number[]);
    for(let c=0;c<variables.length;c++){
      const step=1e-7*Math.max(1,Math.abs(variables[c])),a=[...variables],b=[...variables];a[c]+=step;b[c]-=step;
      const ra=flat(a),rb=flat(b);for(let r=0;r<matrix.length;r++)matrix[r][c]=(ra[r]-rb[r])/(2*step);
    }
    return matrix;
  };
  const cost=(r:number[])=>r.reduce((sum,v)=>sum+v*v,0);
  let lambda=1e-3,iterations=0;
  for(;iterations<80;iterations++){
    const r=flat(x);if(!r.length||Math.max(...r.map(Math.abs))<1e-6)break;
    const j=jacobian(x),n=x.length,normal=Array.from({length:n},()=>Array(n).fill(0) as number[]),rhs=Array(n).fill(0) as number[];
    for(let row=0;row<j.length;row++)for(let a=0;a<n;a++){rhs[a]-=j[row][a]*r[row];for(let b=0;b<n;b++)normal[a][b]+=j[row][a]*j[row][b];}
    let accepted=false;
    for(let attempt=0;attempt<10;attempt++){
      const damped=normal.map((row,i)=>row.map((value,k)=>value+(i===k?lambda*Math.max(1,normal[i][i]):0))),delta=linearSolve(damped,rhs);
      if(!delta){lambda*=10;continue;}
      const candidate=x.map((value,i)=>value+delta[i]);
      if(candidate.every(bounded)&&cost(flat(candidate))<cost(r)-1e-15){x=candidate;lambda=Math.max(1e-12,lambda/3);accepted=true;break;}
      lambda*=10;
    }
    if(!accepted)break;
  }
  sketch.points=sketch.points.map((p,i)=>({...p,x:x[2*i],y:x[2*i+1]}));
  const rows=residuals(x),residual=Math.max(0,...rows.flatMap(row=>row.values).map(Math.abs)),r=rank(jacobian(x));
  const degreesOfFreedom=x.length-r,redundant=Math.max(0,flat(x).length-r),conflicts=rows.filter(row=>row.values.some(v=>Math.abs(v)>1e-5)).map(row=>row.id);
  return {sketch,residual,iterations,degreesOfFreedom,redundant,conflicts,status:conflicts.length?'inconsistent':redundant?'overConstrained':degreesOfFreedom?'underConstrained':'fullyConstrained'};
}

/** A single simple closed polyline profile; open, branched and crossing loops fail. */
export function sketchProfile(source:ParametricSketch,solution=solveSketch(source)):{length:number;width:number;outline:OutlinePt[];offset:[number,number]} {
  if(solution.status==='invalid'||solution.status==='inconsistent')throw new Error('sketch.invalid');
  const s=solution.sketch;if(s.points.length<3||s.segments.length<3)throw new Error('sketch.open');
  const adjacent=new Map(s.points.map(p=>[p.id,[] as string[]])),byId=new Map(s.points.map(p=>[p.id,p]));
  for(const line of s.segments){adjacent.get(line.a)!.push(line.b);adjacent.get(line.b)!.push(line.a);}
  const used=s.points.filter(p=>adjacent.get(p.id)!.length);if(used.some(p=>adjacent.get(p.id)!.length!==2))throw new Error('sketch.open');
  const order:string[]=[],start=used[0].id;let previous='',current=start;
  do{if(order.includes(current))throw new Error('sketch.open');order.push(current);const next=adjacent.get(current)!.find(id=>id!==previous)!;previous=current;current=next;}while(current!==start);
  if(order.length!==used.length)throw new Error('sketch.open');
  const points=order.map(id=>byId.get(id)!);
  const area=points.reduce((sum,p,i)=>sum+p.x*points[(i+1)%points.length].y-p.y*points[(i+1)%points.length].x,0)/2;
  if(Math.abs(area)<1e-3)throw new Error('sketch.degenerate');
  const orientation=(a:SketchPoint,b:SketchPoint,c:SketchPoint)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
  const on=(a:SketchPoint,b:SketchPoint,p:SketchPoint)=>Math.abs(orientation(a,b,p))<1e-7&&p.x>=Math.min(a.x,b.x)-1e-7&&p.x<=Math.max(a.x,b.x)+1e-7&&p.y>=Math.min(a.y,b.y)-1e-7&&p.y<=Math.max(a.y,b.y)+1e-7;
  for(let i=0;i<points.length;i++){
    const a=points[i],b=points[(i+1)%points.length];if(Math.hypot(a.x-b.x,a.y-b.y)<1e-4)throw new Error('sketch.degenerate');
    for(let k=i+2;k<points.length;k++){
      if(i===0&&k===points.length-1)continue;const c=points[k],d=points[(k+1)%points.length];
      if(orientation(a,b,c)*orientation(a,b,d)<0&&orientation(c,d,a)*orientation(c,d,b)<0||on(a,b,c)||on(a,b,d)||on(c,d,a)||on(c,d,b))throw new Error('sketch.crossing');
    }
  }
  const minX=Math.min(...points.map(p=>p.x)),minY=Math.min(...points.map(p=>p.y)),maxX=Math.max(...points.map(p=>p.x)),maxY=Math.max(...points.map(p=>p.y));
  if(area<0)points.reverse();
  return {length:maxX-minX,width:maxY-minY,offset:[minX,minY],outline:points.map(p=>[p.x-minX,p.y-minY])};
}

export function rectangleSketch(width=600,height=400):ParametricSketch {
  return {points:[{id:'p0',x:0,y:0},{id:'p1',x:width,y:0},{id:'p2',x:width,y:height},{id:'p3',x:0,y:height}],
    segments:[{id:'l0',a:'p0',b:'p1'},{id:'l1',a:'p1',b:'p2'},{id:'l2',a:'p2',b:'p3'},{id:'l3',a:'p3',b:'p0'}],
    constraints:[{id:'origin',type:'fixed',point:'p0',x:0,y:0},{id:'h0',type:'horizontal',line:'l0'},{id:'v1',type:'vertical',line:'l1'},{id:'h2',type:'horizontal',line:'l2'},{id:'v3',type:'vertical',line:'l3'},{id:'width',type:'length',line:'l0',value:width},{id:'height',type:'length',line:'l1',value:height}]};
}
