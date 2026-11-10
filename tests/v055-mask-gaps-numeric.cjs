'use strict';
const {chromium}=require('playwright'),path=require('path');
(async()=>{
 const browser=await chromium.launch({headless:true});
 for(const size of [32,48]){
 const page=await browser.newPage({viewport:{width:390,height:900}});
 await page.goto('file://'+path.resolve('vowel-release-v0.2.55/index.html'),{waitUntil:'load'});
 const r=await page.evaluate(async size=>{
 const f=document.getElementById('vowelFontSize'); f.value=size;f.dispatchEvent(new Event('input',{bubbles:true}));
 if(document.fonts)await document.fonts.ready;
 await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 const svg=document.querySelector('#vowelQuadrilateral svg');
 const glyphs=[...svg.querySelectorAll('.vowel-dynamic-glyph')];
 const masks=[...svg.querySelectorAll('#vowelCutouts rect')].map((r,i)=>({char:glyphs[i].textContent,idx:i,left:+r.getAttribute('x'),top:+r.getAttribute('y'),right:+r.getAttribute('x')+(+r.getAttribute('width')),bottom:+r.getAttribute('y')+(+r.getAttribute('height'))}));
 const rules=[...svg.querySelectorAll('path.official-vowel-rule')].map(p=>({id:p.dataset.officialDrawing||'front',masked:p.parentElement.getAttribute('mask')!==null,d:p.getAttribute('d')}));
 const parts=d=>[...d.matchAll(/M\s*([-\d.]+)\s+([-\d.]+)\s+L\s*([-\d.]+)\s+([-\d.]+)/g)].map(m=>m.slice(1).map(Number));
 function intersect(seg,box){
  const [x0,y0,x1,y1]=seg,dx=x1-x0,dy=y1-y0;
  let lo=0,hi=1;
  for(const [p,q] of [[-dx,x0-box.left],[dx,box.right-x0],[-dy,y0-box.top],[dy,box.bottom-y0]]){
   if(Math.abs(p)<1e-12){if(q<0)return null;continue;}
   const t=q/p;if(p<0)lo=Math.max(lo,t);else hi=Math.min(hi,t);
   if(lo>=hi)return null;
  }
  return [lo,hi];
 }
 const out=[];
 for(const rule of rules){
  const rows=[];
  for(const seg of parts(rule.d)){
   const [x0,y0,x1,y1]=seg, dx=x1-x0,dy=y1-y0;
   const point=t=>[+(x0+dx*t).toFixed(4),+(y0+dy*t).toFixed(4)];
   const cuts=rule.masked?masks.flatMap(mask=>{
    const t=intersect(seg,mask);
    return t?[{char:mask.char,idx:mask.idx,from:point(t[0]),to:point(t[1]),t}]:[];
   }):[];
   cuts.sort((a,b)=>a.t[0]-b.t[0]);
   const merged=[];
   for(const cut of cuts){
    const prev=merged[merged.length-1];
    if(prev&&cut.t[0]<=prev.t[1]+1e-8){prev.t[1]=Math.max(prev.t[1],cut.t[1]);prev.chars.push(cut.char);prev.indices.push(cut.idx);}
    else merged.push({t:[...cut.t],chars:[cut.char],indices:[cut.idx]});
   }
   rows.push({original:[point(0),point(1)],gaps:merged.map(m=>({from:point(m.t[0]),to:point(m.t[1]),length:+(Math.hypot(dx,dy)*(m.t[1]-m.t[0])).toFixed(4),chars:[...new Set(m.chars)],indices:m.indices}))});
  }
  out.push({line:rule.id,masked:rule.masked,original_part_count:rows.length,parts:rows});
 }
 return {size,maskRectangles:masks.length,lines:out};
 },size);
 console.log('MASK_GAPS '+JSON.stringify(r));
 await page.close();
 }
 await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1});
