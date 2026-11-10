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
  await page.goto('file://'+path.resolve('weston-chart-v0.2.49.html'),{waitUntil:'load'});
  await page.evaluate(async()=>{if(document.fonts)await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))});
  const info = await page.evaluate(() => {
   const svg=document.querySelector('#vowelQuadrilateral svg');
   const glyphs=[...svg.querySelectorAll('.vowel-dynamic-glyph')];
   const cuts=[...svg.querySelectorAll('#vowelCutouts rect')];
   const rules=[...svg.querySelectorAll('.official-vowel-rule')];
   const dots=[...svg.querySelectorAll('.vowel-dots circle')];
   return {glyphs:glyphs.length,cuts:cuts.length,rules:rules.length,dots:dots.length,emptyBoxes:glyphs.filter(g=>{const b=g.getBBox();return !b.width||!b.height}).map(x=>x.textContent),maskedGlyphs:glyphs.every(g=>cuts.some(c=>{const b=g.getBBox();return Number(c.getAttribute('x'))<=b.x&&Number(c.getAttribute('y'))<=b.y&&Number(c.getAttribute('width'))>=b.width&&Number(c.getAttribute('height'))>=b.height})),svgBounds:svg.getBoundingClientRect().toJSON(),version:document.title};
  });
  const chart=page.locator('#vowelQuadrilateral');
  await chart.screenshot({path:'audit-output/vowels-'+width+'.png'});
  const ok=info.glyphs===28&&info.cuts===28&&info.rules===7&&info.dots===11&&info.emptyBoxes.length===0&&info.maskedGlyphs&&errors.length===0;
  results.push({width,ok,info,errors});if(!ok)failure=true;
  await page.close();
 }
 await browser.close();
 fs.writeFileSync('audit-output/results.json',JSON.stringify(results,null,2));
 console.log(JSON.stringify(results,null,2));
 if(failure)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
