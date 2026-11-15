const {chromium,webkit}=require('playwright');const fs=require('node:fs');
fs.mkdirSync('pinch-probe',{recursive:true});
const base='http://127.0.0.1:8765/';
const deadline=setTimeout(()=>process.exit(2),90000);
(async()=>{
 for(const [name,type]of Object.entries({chromium,webkit})){
  const b=await type.launch({headless:true});const p=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  p.setDefaultTimeout(4000);const errors=[];p.on('pageerror',e=>errors.push(String(e)));p.on('console',m=>{if(m.type()==='error')errors.push(m.text().slice(0,180));});
  await p.addInitScript(()=>{window.__beats=0;window.__ro=0;setInterval(()=>window.__beats++,100);const R=ResizeObserver;window.ResizeObserver=class extends R{constructor(cb){super((a,b)=>{window.__ro++;cb(a,b);});}};});
  await p.goto(base+'keyboard-v83-11/');const f=await(await p.locator('#v83ChartFrame').elementHandle()).contentFrame();await f.locator('.v83-ipa-key').first().waitFor();
  const state=()=>{const r=document.getElementById('floatingEditor').getBoundingClientRect(),v=visualViewport;return{beat:__beats,ro:__ro,scale:v.scale,viewport:[v.width,v.height,v.offsetLeft,v.offsetTop],panel:r.toJSON(),font:getComputedStyle(document.getElementById('out')).fontSize,body:getComputedStyle(document.body).overflow};};
  const before=await p.evaluate(state);
  if(name==='chromium'){const cd=await p.context().newCDPSession(p);await cd.send('Emulation.setPageScaleFactor',{pageScaleFactor:2});await p.waitForTimeout(300);console.log('NATIVE_SCALE_BASELINE '+name+' '+JSON.stringify({before,after:await p.evaluate(state)}));await cd.send('Emulation.setPageScaleFactor',{pageScaleFactor:1});await cd.detach();}
  const box=await f.locator('#chartZoomOpen').boundingBox();await p.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);
  await p.waitForTimeout(400);console.log('OPEN_BASELINE '+name+' '+JSON.stringify({host:await p.evaluate(state),chart:await f.evaluate(()=>({beat:__beats,ro:__ro,open:!document.getElementById('chartZoomDialog').hidden,view:document.getElementById('zoomViewport').getBoundingClientRect().toJSON(),scroll:[document.getElementById('zoomViewport').scrollWidth,document.getElementById('zoomViewport').scrollHeight],zoom:document.getElementById('zoomRange').value,touch:getComputedStyle(document.getElementById('zoomViewport')).touchAction}))}));
  await p.screenshot({path:'pinch-probe/'+name+'-open.png'});
  await f.locator('#zoomPlus').click();await p.waitForTimeout(150);console.log('PLUS_BASELINE '+name+' '+await f.locator('#zoomRange').inputValue());
  await f.locator('#zoomClose').click();console.log('CLOSE_BASELINE '+name+' '+await p.evaluate(state));
  console.log('ERRORS '+name+' '+JSON.stringify(errors));await b.close();
 }clearTimeout(deadline);
})().catch(e=>{console.error(e);process.exit(1)});
