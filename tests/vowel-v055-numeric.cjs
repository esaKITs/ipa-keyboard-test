'use strict';
const fs=require('fs'), path=require('path'), assert=require('assert').strict;
const {chromium}=require('playwright');
const paths=['weston-chart-v0.2.44.html','vowel-release-v0.2.55/index.html'];
const ids=['front','40','36','37','38','39','98'];
const parsed=s=>{const m=new Map();for(const hit of s.matchAll(/<path class="official-vowel-rule(?: front-vowel-diagonal)?"(?: data-official-drawing="(\d+)")? d="([^"]+)"\/>/g))m.set(hit[1]||'front',hit[2]);return m};
const a=parsed(fs.readFileSync(paths[0],'utf8')),b=parsed(fs.readFileSync(paths[1],'utf8'));
assert.equal(a.size,7);assert.equal(b.size,7);
for(const id of ids)assert.equal(b.get(id),a.get(id),'SVG centerline mismatch '+id);
const segment=d=>[...d.matchAll(/M\s*([-\d.]+)\s+([-\d.]+)\s+L\s*([-\d.]+)\s+([-\d.]+)/g)].map(m=>m.slice(1).map(Number));
const defects=[
 ['close gap filled','37','M437.837 26.839 L155.960 26.839'],
 ['close-mid gap filled','36','M437.837 103.833 L207.866 103.833'],
 ['open-mid gap filled','39','M437.837 180.754 L259.720 180.754'],
 ['slanted line interrupted','40','M296.833 26.833 L320 90 M350 170 L375.183 260.539'],
 ['front diagonal interrupted','front','M143.153 26.843 L200 110 M260 190 L300.698 260.539'],
 ['right vertical removed','98',''],
 ['bottom line removed','38',''],
];
for(const [name,id,mutant] of defects)assert.notEqual(mutant,a.get(id),'mutation check '+name);
(async()=>{const browser=await chromium.launch({headless:true});let checks=0;const result=[];
try{
for(const width of [390,1280]){
 const pages=await Promise.all(paths.map(async p=>{const x=await browser.newPage({viewport:{width,height:900},deviceScaleFactor:1});await x.goto('file://'+path.resolve(p),{waitUntil:'load'});return x}));
 for(const fontSize of [32,48]){
  const observations=[];
  for(const page of pages){
   await page.evaluate(async v=>{const field=document.getElementById('vowelFontSize');field.value=String(v);field.dispatchEvent(new Event('input',{bubbles:true}));if(document.fonts)await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(r))));},fontSize);
   observations.push(await page.evaluate(()=>{const svg=document.querySelector('#vowelQuadrilateral svg');
     const paths=[...svg.querySelectorAll('path.official-vowel-rule')].map(p=>({id:p.getAttribute('data-official-drawing')||'front',d:p.getAttribute('d')}));
     const masks=[...svg.querySelectorAll('.vowel-diagonals,.vowel-lines')].map(g=>({group:g.getAttribute('class'),mask:g.getAttribute('mask')}));
     const cutouts=[...svg.querySelectorAll('#vowelCutouts rect')].map(r=>['x','y','width','height'].map(k=>+r.getAttribute(k)));
     const dots=[...svg.querySelectorAll('.vowel-dots circle')].map(c=>['cx','cy','r'].map(k=>+c.getAttribute(k)));
     return {paths,masks,cutouts,dots};
   }));
  }
  assert.deepEqual(observations[1],observations[0],'rendered line/mask/black-dot numeric state');
  assert.equal(observations[1].cutouts.length,28);assert.equal(observations[1].dots.length,11);
  assert.equal(observations[1].masks[0].mask,null);
  assert.equal(observations[1].masks[1].mask,'url(#vowelTextCutout)');
  for(const [id,dot] of [['37',296.836],['36',322.643],['39',348.449]]){
   const d=observations[1].paths.find(x=>x.id===id).d;
   assert.equal(segment(d).length,2);
   assert.ok(segment(d).every(([x0,y0,x1,y1])=>!(Math.min(x0,x1)<dot&&dot<Math.max(x0,x1))));
  }
  checks++;
  result.push({width,fontSize,numerical_match:true,paths:7,glyph_cutouts:28,dots:11});
 }
 await Promise.all(pages.map(x=>x.close()));
}
}finally{await browser.close()}
console.log(JSON.stringify({success:true,negative_mutations_rejected:defects.map(x=>x[0]),conditions:result},null,2));
})().catch(e=>{console.error(e);process.exitCode=1});