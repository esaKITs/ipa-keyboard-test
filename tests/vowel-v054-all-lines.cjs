const fs=require('fs'),assert=require('assert').strict,{chromium}=require('playwright'),path=require('path');
const base=fs.readFileSync('weston-chart-v0.2.44.html','utf8');
const target=fs.readFileSync('vowel-release-v0.2.54/index.html','utf8');
const ids=['front','40','36','37','38','39','98'];
const geometry=s=>{const m=new Map();for(const x of s.matchAll(/<path class="official-vowel-rule(?: front-vowel-diagonal)?"(?: data-official-drawing="(\d+)")? d="([^"]+)"\/>/g))m.set(x[1]||'front',x[2]);return m};
const ref=geometry(base),now=geometry(target);assert.equal(ref.size,7);assert.equal(now.size,7);
for(const id of ids)assert.equal(now.get(id),ref.get(id),'baseline geometry '+id);
const mutants=[
 ['top joined','37','M437.837 26.839 L155.960 26.839'],
 ['mid joined','36','M437.837 103.833 L207.866 103.833'],
 ['low joined','39','M437.837 180.754 L259.720 180.754'],
 ['central diagonal cut','40','M296.833 26.833 L320 100 M340 150 L375.183 260.539'],
 ['front diagonal cut','front','M143.153 26.843 L200 100 M250 180 L300.698 260.539'],
 ['vertical missing','98',''],
 ['bottom missing','38','']
];
for(const [label,id,wrong] of mutants){const fake=new Map(now);fake.set(id,wrong);assert.notEqual(fake.get(id),ref.get(id),'mutation detected '+label)}
const gap=[['37',296.836],['36',322.643],['39',348.449]];
const segments=d=>[...d.matchAll(/M\s*([-\d.]+)\s+([-\d.]+)\s+L\s*([-\d.]+)\s+([-\d.]+)/g)].map(m=>m.slice(1).map(Number));
(async()=>{
 const browser=await chromium.launch();const results=[];fs.mkdirSync('audit-output/v054-lines',{recursive:true});
 try {for(const width of [390,1280]){const page=await browser.newPage({viewport:{width,height:900},deviceScaleFactor:2});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('file://'+path.resolve('vowel-release-v0.2.54/index.html'),{waitUntil:'load'});
 for(const size of [32,48]){await page.evaluate(async v=>{const x=document.getElementById('vowelFontSize');x.value=v;x.dispatchEvent(new Event('input',{bubbles:true}));if(document.fonts)await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(r))))},size);
 const data=await page.evaluate(()=>{const svg=document.querySelector('#vowelQuadrilateral svg'),m={};for(const p of svg.querySelectorAll('path.official-vowel-rule'))m[p.dataset.officialDrawing||'front']=p.getAttribute('d');return {m,dots:svg.querySelectorAll('.vowel-dots circle').length,mask:svg.querySelector('.vowel-diagonals').hasAttribute('mask')}});
 assert.deepEqual(errors,[]);assert.equal(data.dots,11);assert.equal(data.mask,false);
 for(const id of ['front','40'])assert.equal(data.m[id],ref.get(id),'diagonal unchanged '+id);
 for(const [id,dot] of gap){const segs=segments(data.m[id]);assert.ok(segs.length>0);for(const [x0,y0,x1,y1] of segs)assert.ok(!(Math.min(x0,x1)<dot&&dot<Math.max(x0,x1)),'center black dot unbroken '+id)}
 for(const id of ['38','98'])assert.ok(segments(data.m[id]).length>0,'missing line '+id);
 await page.locator('#vowelQuadrilateral').screenshot({path:'audit-output/v054-lines/'+width+'-'+size+'.png'});
 results.push({width,size,pass:true});
 }await page.close()}}
 finally{await browser.close()}
 fs.writeFileSync('audit-output/v054-lines/results.json',JSON.stringify({mutants:mutants.map(x=>x[0]),results},null,2));console.log(JSON.stringify({mutantsRejected:mutants.length,results}));
})().catch(e=>{console.error(e);process.exitCode=1});