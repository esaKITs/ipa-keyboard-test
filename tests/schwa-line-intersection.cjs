'use strict';
const {chromium}=require('playwright'),path=require('path');
(async()=>{
const browser=await chromium.launch({headless:true});
for(const size of [32,48]){
const page=await browser.newPage({viewport:{width:390,height:900}});
await page.goto('file://'+path.resolve('vowel-release-v0.2.55/index.html'),{waitUntil:'load'});
const out=await page.evaluate(async size=>{
 const f=document.getElementById('vowelFontSize');f.value=size;f.dispatchEvent(new Event('input',{bubbles:true}));
 if(document.fonts)await document.fonts.ready;
 await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 const el=document.querySelector('.vowel-dynamic-glyph[data-idx="15"]');
 const bbox=el.getBBox();const b={x:bbox.x,y:bbox.y,width:bbox.width,height:bbox.height};
 const a={x:296.833,y:26.833},d={x:375.183,y:260.539};
 const pad=b.width*.20,vpad=1.5;
 const xlo=b.x-pad,xhi=b.x+b.width+pad,ylo=b.y-vpad,yhi=b.y+b.height+vpad;
 const dx=d.x-a.x,dy=d.y-a.y;
 let low=0,high=1;for(const [p,q] of [[-dx,a.x-xlo],[dx,xhi-a.x],[-dy,a.y-ylo],[dy,yhi-a.y]]){
  if(Math.abs(p)<1e-12){if(q<0)throw Error("no intersection");continue}
  const t=q/p;if(p<0)low=Math.max(low,t);else high=Math.min(high,t)
 }
 return {size,bbox:b,center:{x:b.x+b.width/2,y:b.y+b.height/2},box:{xlo,xhi,ylo,yhi},interval:[low,high],points:[{x:a.x+low*dx,y:a.y+low*dy},{x:a.x+high*dx,y:a.y+high*dy}],length:Math.max(0,high-low)*Math.hypot(dx,dy),intersection:low<high};
},size);
console.log('SCHWA_NUMERIC '+JSON.stringify(out));
await page.close();
}
await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1});
