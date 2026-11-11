const {chromium,webkit}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('assert').strict;
const outDir=process.env.ARTIFACT_DIR||'audit-output/v060';fs.mkdirSync(outDir,{recursive:true});
const old=fs.readFileSync('vowel-release-v0.2.57/index.html','utf8'),latest=fs.readFileSync('vowel-release-v0.2.60/index.html','utf8');
// Everything before the renderer is byte-identical apart from version labels
// and removal of the obsolete external hull script. This covers every other
// table, the seven immutable rule paths, glyph/dot/label anchors, and viewer.
const split=s=>s.slice(0,s.indexOf('/* v0.2.',s.indexOf('window.addEventListener("resize",()=>'))).replaceAll('0.2.57','VERSION').replaceAll('0.2.60','VERSION').replace('<script src="./glyph-hulls.js"></script>','');
assert.equal(split(old),split(latest));
(async()=>{
const results=[];
for(const engine of ['chromium','webkit'])for(const width of [390,1280]){
 const b=await (engine==='webkit'?webkit:chromium).launch(engine==='webkit'?{headless:true,...(process.env.WEBKIT_EXECUTABLE_PATH?{executablePath:process.env.WEBKIT_EXECUTABLE_PATH}:{})}:{headless:true,...(process.env.CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-zygote','--single-process','--disable-gpu','--disable-software-rasterizer']}:{})});
 const p=await b.newPage({viewport:{width,height:1000}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('file://'+path.resolve('vowel-release-v0.2.60/index.html'));await p.waitForFunction(()=>window.__ipaLineAudit?.fontSize===32);
 const get=()=>p.evaluate(()=>JSON.stringify(window.__ipaLineAudit.rules));
 const a=await get();
 await p.evaluate(async()=>{const f=document.getElementById('vowelFontSize');for(let i=0;i<12;i++){f.value=48;f.dispatchEvent(new Event('input',{bubbles:true}));await new Promise(r=>requestAnimationFrame(r));f.value=32;f.dispatchEvent(new Event('input',{bubbles:true}));await new Promise(r=>requestAnimationFrame(r));}});
 await p.waitForFunction(()=>window.__ipaLineAudit.fontSize===32);assert.equal(await get(),a,'geometry drift');
 // Real viewer button, zoom slider, minimap, horizontal scroll, close, reopen.
 await p.locator('#chartZoomOpen').click();await p.waitForFunction(()=>!document.querySelector('#chartZoomDialog').hidden);
 await p.locator('#zoomPlus').click({clickCount:3});
 await p.evaluate(()=>{const v=document.getElementById('zoomViewport');v.scrollLeft=180;v.scrollTop=80;v.dispatchEvent(new Event('scroll'))});
 await p.locator('#zoomMapToggle').click();await p.locator('#zoomMapToggle').click();
 assert.equal(await p.locator('#chart').count(),1);assert.equal(await p.locator('.vowel-dynamic-glyph').count(),28);
 await p.screenshot({path:`${outDir}/${engine}-viewer-w${width}.png`});
 await p.locator('#zoomClose').click();await p.waitForFunction(()=>document.querySelector('#chartZoomDialog').hidden);
 await p.locator('#chartZoomOpen').click();await p.keyboard.press('Escape');
 await p.waitForFunction(()=>document.querySelector('#chartZoomDialog').hidden);assert.equal(await get(),a);
 await p.setViewportSize({width:width===390?1280:390,height:1000});await p.waitForTimeout(80);assert.equal(await get(),a);
 await p.setViewportSize({width,height:1000});await p.waitForTimeout(80);
 await p.reload();await p.waitForFunction(()=>window.__ipaLineAudit?.fontSize===32);assert.equal(await get(),a);
 assert.deepEqual(errors,[]);results.push({engine,width,fontSizeRoundTrips:12,zoomAndScroll:true,minimap:true,escapeAndReopen:true,rerender:true,errors});console.log('REGRESSION PASS',engine,width);await b.close();
}
fs.writeFileSync(outDir+'/regression-results.json',JSON.stringify(results,null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
