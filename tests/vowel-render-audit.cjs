const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
(async () => {
 fs.mkdirSync('audit-output',{recursive:true});
 const browser = await chromium.launch({headless:true});
 let failure = false;
 const results = [];
 for (const width of [390, 1280]) {
  const page = await browser.newPage({viewport:{width,height:900},deviceScaleFactor:2});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('file://'+path.resolve('weston-chart-v0.2.50.html'),{waitUntil:'load'});
  await page.evaluate(async()=>{if(document.fonts)await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))});
  const info = await page.evaluate(() => {
   const svg=document.querySelector('#vowelQuadrilateral svg');
   const glyphs=[...svg.querySelectorAll('.vowel-dynamic-glyph')];
   const cuts=[...svg.querySelectorAll('#vowelCutouts rect')];
   const rules=[...svg.querySelectorAll('.official-vowel-rule')];
   // Geometry audit: SVG path commands may contain multiple disjoint fragments;
   // prove no visible line midpoint is within a padded glyph bbox.
   const glyphBoxes=glyphs.map(g=>g.getBBox());
   const segments=rules.flatMap(rule=>{
    const d=rule.getAttribute('d');
    const matches=[...d.matchAll(/M([-\\d.]+) ([-\\d.]+) L([-\\d.]+) ([-\\d.]+)/g)];
    return matches.map(m=>m.slice(1).map(Number));
   });
   const overlaps=segments.filter(([x0,y0,x1,y1])=>{
     return glyphBoxes.some(b=>{
       const mx=b.width*.20,my=2.5,l=b.x-mx,r=b.x+b.width+mx,t=b.y-my,bt=b.y+b.height+my;
       for(let k=0;k<=40;k++){const f=k/40,x=x0+(x1-x0)*f,y=y0+(y1-y0)*f;if(x>l+.01&&x<r-.01&&y>t+.01&&y<bt-.01)return true;}
       return false;
     });
   });
   const dots=[...svg.querySelectorAll('.vowel-dots circle')];
   return {glyphs:glyphs.length,cuts:cuts.length,rules:rules.length,dots:dots.length,emptyBoxes:glyphs.filter(g=>{const b=g.getBBox();return !b.width||!b.height}).map(x=>x.textContent),overlapCount:overlaps.length,segmentCount:segments.length,maskedGlyphs:glyphs.every(g=>cuts.some(c=>{const b=g.getBBox();return Number(c.getAttribute('x'))<=b.x&&Number(c.getAttribute('y'))<=b.y&&Number(c.getAttribute('width'))>=b.width&&Number(c.getAttribute('height'))>=b.height})),svgBounds:svg.getBoundingClientRect().toJSON(),version:document.title};
  });
  const chart=page.locator('#vowelQuadrilateral');
  await chart.screenshot({path:'audit-output/vowels-'+width+'.png'});
  const ok=info.glyphs===28&&info.cuts===28&&info.rules===7&&info.dots===11&&info.emptyBoxes.length===0&&info.maskedGlyphs&&info.overlapCount===0&&info.segmentCount>=7&&errors.length===0;
  results.push({width,ok,info,errors});if(!ok)failure=true;
  await page.close();
 }
 await browser.close();
 fs.writeFileSync('audit-output/results.json',JSON.stringify(results,null,2));
 console.log(JSON.stringify(results,null,2));
 if(failure)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
