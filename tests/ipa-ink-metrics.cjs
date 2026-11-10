const {chromium}=require('playwright'),fs=require('fs'),path=require('path');
(async()=>{
 const browser=await chromium.launch({headless:true});
 fs.mkdirSync('audit-output/ink-intersections',{recursive:true});
 for(const size of [32,48]){
  const page=await browser.newPage({viewport:{width:390,height:900}});
  await page.goto('file://'+path.resolve('vowel-release-v0.2.55/index.html'),{waitUntil:'load'});
  const out=await page.evaluate(async size=>{
   const f=document.getElementById('vowelFontSize');
   f.value=String(size);f.dispatchEvent(new Event('input',{bubbles:true}));
   if(document.fonts)await document.fonts.ready;
   await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(r))));
   const svg=document.querySelector('#vowelQuadrilateral svg');
   const glyphs=[...svg.querySelectorAll('.vowel-dynamic-glyph')].map(x=>{
    const b=x.getBBox(),st=getComputedStyle(x);
    return {char:x.textContent,index:+x.dataset.idx,x:+x.getAttribute('x'),y:+x.getAttribute('y'),dy:+(x.getAttribute('dy')||0),dx:+(x.getAttribute('dx')||0),fontSize:parseFloat(st.fontSize),bbox:{x:b.x,y:b.y,w:b.width,h:b.height}};
   });
   const lines=[...svg.querySelectorAll('path.official-vowel-rule')].map(x=>({id:x.dataset.officialDrawing||'front',d:x.getAttribute('d')}));
   const fonts=[...document.fonts].map(x=>({family:x.family,status:x.status}));return {size,glyphs,lines,fonts};
  },size);
  fs.writeFileSync('audit-output/ink-intersections/browser-'+size+'.json',JSON.stringify(out,null,2));
  console.log('BROWSER_INFO '+JSON.stringify({size:out.size,glyphCount:out.glyphs.length,lineCount:out.lines.length,fonts:out.fonts.filter(x=>x.family.includes('Doulos'))}));
  await page.close();
 }
 await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1});