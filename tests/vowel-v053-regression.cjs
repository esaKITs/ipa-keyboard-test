const { chromium } = require('playwright');
const fs=require('node:fs'), path=require('node:path');
(async()=>{
 fs.mkdirSync('audit-output/v053',{recursive:true});
 const browser=await chromium.launch({headless:true});
 const cases=[]; let failed=false;
 for(const width of [390,1280]){
  const page=await browser.newPage({viewport:{width,height:900},deviceScaleFactor:2});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('file://'+path.resolve('vowel-release-v0.2.53/index.html'),{waitUntil:'load'});
  for(const fontSize of [32,48]){
   await page.evaluate(async size=>{
    const range=document.getElementById('vowelFontSize');
    range.value=String(size);range.dispatchEvent(new Event('input',{bubbles:true}));
    if(document.fonts)await document.fonts.ready;
    await new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(done))));
   },fontSize);
   const data=await page.evaluate(()=>{
    const svg=document.querySelector('#vowelQuadrilateral svg');
    const expected=[
     {drawing:'37',y:26.839,lo:283.600,hi:310.000,dot:296.836},
     {drawing:'36',y:103.833,lo:309.443,hi:335.843,dot:322.643},
     {drawing:'39',y:180.754,lo:335.249,hi:361.649,dot:348.449}
    ];
    const rows=expected.map(v=>{
     const p=svg.querySelector('[data-official-drawing="'+v.drawing+'"]');
     const d=p?.getAttribute('d')||'';
     const seg=[...d.matchAll(/M\s*([-\d.]+)\s+([-\d.]+)\s+L\s*([-\d.]+)\s+([-\d.]+)/g)].map(m=>m.slice(1).map(Number));
     const crossesGap=seg.some(([x0,y0,x1,y1])=>Math.abs(y0-v.y)<.01&&Math.abs(y1-v.y)<.01&&Math.min(x0,x1)<v.dot&&Math.max(x0,x1)>v.dot);
     const entersGap=seg.some(([x0,y0,x1,y1])=>Math.abs(y0-v.y)<.01&&Math.abs(y1-v.y)<.01&&Math.min(x0,x1)<v.hi-.01&&Math.max(x0,x1)>v.lo+.01);
     return {drawing:v.drawing,d,segments:seg.length,crossesGap,entersGap};
    });
    return {rows,version:document.title,dots:svg.querySelectorAll('.vowel-dots circle').length,glyphs:svg.querySelectorAll('.vowel-dynamic-glyph').length};
   });
   const ok=!errors.length&&data.rows.every(r=>!r.crossesGap&&!r.entersGap&&r.segments>=1)&&data.dots===11&&data.glyphs===28&&data.version.includes('0.2.53');
   await page.locator('#vowelQuadrilateral').screenshot({path:`audit-output/v053/vowels-${width}-${fontSize}.png`});
   cases.push({width,fontSize,ok,errors,data});if(!ok)failed=true;
  }
  await page.close();
 }
 await browser.close();
 fs.writeFileSync('audit-output/v053/results.json',JSON.stringify(cases,null,2));
 console.log(JSON.stringify(cases,null,2));
 if(failed)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1});
