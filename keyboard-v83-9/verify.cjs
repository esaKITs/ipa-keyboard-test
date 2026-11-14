const {chromium,webkit}=require('playwright');
const assert=require('node:assert/strict');const fs=require('node:fs');
const base=process.env.TEST_BASE||'http://127.0.0.1:8765/';
fs.mkdirSync('qa839',{recursive:true});
(async()=>{
for(const [name,type] of Object.entries({chromium,webkit})){
 const browser=await type.launch({headless:true});
 for(const width of [390,1280]){
 if(process.env.TEST_CASE&&process.env.TEST_CASE!==name+'/'+width)continue;
 const page=await browser.newPage({viewport:{width,height:844},hasTouch:true});
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto(base+'keyboard-v83-9/',{waitUntil:'load'});
 const f=page.frames().find(f=>f.url().includes('/keyboard-v83-9/chart.html'));
 await f.locator('.v83-ipa-key').first().waitFor();
 await f.evaluate(()=>document.fonts.ready);
 await f.waitForFunction(()=>document.querySelector('#vowelQuadrilateral .vowel-dynamic-glyph').style.fontSize==='32px');
 assert.equal(await f.locator('.v83-ipa-key').count(),224);
 assert.equal(await f.locator('#vowelQuadrilateral .v83-ipa-key').count(),28);
 // Compare all hitboxes and complete SVG geometry against the untouched source.
 const source=await browser.newPage({viewport:{width,height:844}});
 await source.goto(base+'keyboard-v83-4/');
 const sf=source.frames().find(f=>f.url().includes('/keyboard-v83-4/chart.html'));
 await sf.locator('.v83-ipa-key').first().waitFor();await sf.evaluate(()=>document.fonts.ready);await sf.waitForFunction(()=>document.querySelector('#vowelQuadrilateral .vowel-dynamic-glyph').style.fontSize==='32px');
 const geometry=()=>({svg:document.querySelector('#vowelQuadrilateral').outerHTML,keys:[...document.querySelectorAll('.v83-ipa-key')].map(e=>{let r=e.getBoundingClientRect();return [e.dataset.v83Sym,r.width,r.height,r.x,r.y]})});
 assert.deepEqual(await f.evaluate(geometry),await sf.evaluate(geometry));await source.close();
 const prior=await browser.newPage({viewport:{width,height:844}});
 await prior.goto(base+'keyboard-v83-7/');
 const pf=prior.frames().find(f=>f.url().includes('/keyboard-v83-7/chart.html'));
 const pk=pf.locator('#vowelQuadrilateral .v83-ipa-key').first();
 await pk.scrollIntoViewIfNeeded();await pk.dispatchEvent('pointerdown',{pointerType:'touch'});
 const oldGap=await pk.evaluate(e=>e.getBoundingClientRect().top-document.querySelector('#v831SymbolPopup').getBoundingClientRect().bottom);
 console.log('BASELINE_POPUP_GAP '+name+'/'+width+' '+oldGap);assert(Math.abs(oldGap-82)<.2,'reproduce old detached popup');await prior.close();
 const vowels=f.locator('#vowelQuadrilateral .v83-ipa-key');
 async function screenPoint(key){
  await key.scrollIntoViewIfNeeded();
  if(await page.locator('#v83ChartFrame').evaluate(e=>e.classList.contains('zoom-fullscreen'))){
   await key.evaluate(e=>e.scrollIntoView({block:'center',inline:'center',behavior:'instant'}));
   await f.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  }
  if(!await page.locator('#v83ChartFrame').evaluate(e=>e.classList.contains('zoom-fullscreen'))){
   const r=await key.boundingBox(),bottom=await page.locator('.toolbar').evaluate(e=>e.getBoundingClientRect().bottom);
   if(r.y<bottom+100)await page.evaluate(delta=>window.scrollBy(0,delta),r.y-bottom-120);
  }
  const point=await key.evaluate(el=>{const r=el.getBoundingClientRect(),fr=window.frameElement?.getBoundingClientRect()||{left:0,top:0};for(const [fx,fy] of [[.5,.5],...Array.from({length:19},(_,y)=>Array.from({length:19},(_,x)=>[(x+1)/20,(y+1)/20])).flat()]){const x=Math.round(r.left+r.width*fx+fr.left)-fr.left,y=Math.round(r.top+r.height*fy+fr.top)-fr.top;if(document.elementFromPoint(x,y)?.closest('.v83-ipa-key')===el)return {x,y};}return null;});
  if(!point){console.log('HIT_DIAGNOSTIC '+JSON.stringify(await key.evaluate(el=>{const r=el.getBoundingClientRect(),v=document.querySelector('#zoomViewport'),s=document.querySelector('.vowel-chart-svg');return {key:el.dataset.v83Sym,rect:r.toJSON(),view:v.getBoundingClientRect().toJSON(),svg:s.getBoundingClientRect().toJSON(),scroll:[v.scrollLeft,v.scrollTop],atCenter:document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.outerHTML.slice(0,500)};})));await page.screenshot({path:`qa839/${name}-${width}-hit-failure.png`});}
  assert(point,'No painted hit point '+await key.getAttribute('data-v83-sym'));
  const offset=await page.locator('#v83ChartFrame').boundingBox();
  const hit={x:offset.x+point.x,y:offset.y+point.y};
  assert(await page.evaluate(p=>document.elementFromPoint(p.x,p.y)?.id==='v83ChartFrame',hit),'Target obscured by host toolbar');
  return hit;

 }
 async function press(key,label){
  console.log('PRESS '+name+'/'+width+'/'+await key.getAttribute('data-v83-sym'));
  await key.scrollIntoViewIfNeeded();const r=await key.boundingBox();
  const hit=await screenPoint(key);
  await page.mouse.move(hit.x,hit.y);await page.mouse.down();
  const state=await key.evaluate(el=>{
   const g=document.querySelector('.v83-purple-flash'),d=document.querySelector('#v839SelectedSymbolDot'),p=__v831PopupState();
   const r=g.getBoundingClientRect(),s=getComputedStyle(g),a=document.querySelectorAll('#vowelQuadrilateral .v83-ipa-key');
   const target=el;if(!target)throw Error('Popup not shown: '+JSON.stringify(p));const t=target.getBoundingClientRect();const pr=document.querySelector('#v831SymbolPopup').getBoundingClientRect();
   return {popup:{viewportWidth:innerWidth,gap:t.top-pr.bottom,center:pr.left+pr.width/2-(t.left+t.width/2),rect:pr.toJSON()},w:r.width,h:r.height,dx:r.x+r.width/2-t.x-t.width/2,dy:r.y+r.height/2-t.y-t.height/2,display:s.display,bg:s.backgroundImage,border:s.borderStyle,shadow:s.boxShadow,dot:getComputedStyle(d).display,p};
  });
  assert.equal(state.p.text,await key.getAttribute('data-v83-sym'),'popup must identify the physically pressed symbol');
  assert(state.w>=12.5&&state.w<=26.1,'growing glow width '+state.w);assert(state.h>=12.5&&state.h<=26.1,'growing glow height '+state.h);assert(Math.abs(state.dx)<.02&&Math.abs(state.dy)<.02,'GLOW_CENTER '+JSON.stringify(state));assert.equal(state.display,'block');assert.equal(state.dot,'none');assert.equal(state.border,'none');assert.equal(state.shadow,'none');assert(state.bg.includes('radial-gradient')&&state.bg.includes('166, 128, 222'),JSON.stringify(state));assert(state.p.show);assert(Math.abs(state.popup.gap-7)<.1,'popup must be 7px above pressed glyph: '+JSON.stringify(state.popup));assert(Math.abs(state.popup.center)<.1 || (state.popup.center<0&&Math.abs(state.popup.rect.right-(state.popup.viewportWidth-4))<.2) || (state.popup.center>0&&Math.abs(state.popup.rect.left-4)<.2),'popup must center or stay within frame edge: '+JSON.stringify(state.popup));
  // Grow animation must expand from a 13px visual core to full 26px, without a step change.
  if(label){await page.waitForTimeout(260);const expanded=await f.locator('.v83-purple-flash').evaluate(el=>({transform:getComputedStyle(el).transform,opacity:Number(getComputedStyle(el).opacity)}));assert(expanded.opacity>.95,'glow reaches full opacity');const fullWidth=await f.locator('.v83-purple-flash').evaluate(el=>el.getBoundingClientRect().width);assert(Math.abs(fullWidth-26)<.2,'glow grows to 26px: '+fullWidth);}
  if(label)await page.screenshot({path:`qa839/${name}-${width}-${label}-held.png`});
  // The glow must last throughout a held press rather than expire at 420ms.
  if(label){await page.waitForTimeout(500);assert.equal(await f.locator('.v83-purple-flash').evaluate(e=>getComputedStyle(e).display),'block');}
  await page.mouse.up();
  // During the short fade-out, the 26px glow remains and the 13px dot stays hidden.
  const transition=await f.evaluate(()=>({glow:getComputedStyle(document.querySelector('.v83-purple-flash')).display,dot:__v839DotState().visible}));
  assert.equal(transition.glow,'block');assert.equal(transition.dot,true);
  if(label)await page.waitForTimeout(345);
  const end=await key.evaluate(el=>{const d=document.querySelector('#v839SelectedSymbolDot'),r=d.getBoundingClientRect(),s=getComputedStyle(d),t=el.getBoundingClientRect();return{dot:__v839DotState(),dx:r.x+r.width/2-t.x-t.width/2,dy:r.y+r.height/2-t.y-t.height/2,border:s.borderStyle,shadow:s.boxShadow,glow:getComputedStyle(document.querySelector('.v83-purple-flash')).display,popup:__v831PopupState().show,selection:getSelection().toString()};});
  assert.equal(end.dot.diameter,13);assert(end.dot.visible);assert.equal(end.dot.background,'rgba(166, 128, 222, 0.25)');assert.equal(end.border,'none');assert.equal(end.shadow,'none');if(label)assert.equal(end.glow,'none');assert(!end.popup);assert.equal(end.selection,'');assert(Math.abs(end.dx)<.02&&Math.abs(end.dy)<.02);
  assert.equal(end.dot.tag,await key.getAttribute('data-v83-sym'));
  const native=await key.evaluate(e=>({select:getComputedStyle(e).getPropertyValue("user-select")||getComputedStyle(e).getPropertyValue("-webkit-user-select"),tap:getComputedStyle(e).webkitTapHighlightColor,focus:document.activeElement===e}));assert.equal(native.select,'none');assert(!native.focus);
  if(label)await page.screenshot({path:`qa839/${name}-${width}-${label}-released.png`});
 }
 const sections=['pulmonicConsonants','nonPulmonicConsonants','vowels','otherSymbols','diacritics','suprasegmentals','tonesAndWordAccents'];
 const checkedSections=new Set();
 const out=page.locator('#out');
 // Verify each of the 224 physical targets inserts its own complete symbol at the caret.
 await out.fill('');
 for(let i=0;i<224;i++){
  if(process.env.TEST_CASE)continue;
  const k=f.locator('.v83-ipa-key').nth(i),sym=await k.getAttribute('data-v83-sym'),before=await out.inputValue();
  const section=await k.evaluate(e=>e.closest('#pulmonicConsonants,#nonPulmonicConsonants,#vowels,#otherSymbols,#diacritics,#suprasegmentals,#tonesAndWordAccents')?.id);const label=checkedSections.has(section)?null:'normal-'+section;await press(k,label);checkedSections.add(section);assert.equal(await out.inputValue(),before+sym,`input ${name}/${width}/${i}/${sym}`);
 }
 if(!process.env.TEST_CASE)assert.deepEqual([...checkedSections].sort(),sections.slice().sort());
 if(process.env.TEST_CASE)await press(vowels.first());
 const beforeUndo=await out.inputValue();await page.locator('#undo').click();assert.notEqual(await out.inputValue(),beforeUndo);await page.locator('#redo').click();assert.equal(await out.inputValue(),beforeUndo);
 for(const [locale,needle] of [['en','voiced bilabial approximant'],['pt-BR','aproximante bilabial vozeada'],['fa','تقریبی دولبی واکدار'],['ja-osaka','有声両唇接近音'],['ja','有声両唇接近音']]){await page.locator('#languageSelect').selectOption(locale);await f.waitForFunction(v=>document.querySelector('#diacritics').textContent.includes(v),needle);}
 await f.locator('#chartZoomOpen').click();await page.waitForFunction(()=>document.querySelector('#v83ChartFrame').classList.contains('zoom-fullscreen'));
 await f.locator('#zoomMapToggle').click();assert(await f.locator('#zoomMinimap').isHidden());
 await f.locator('#zoomPlus').click();
 for(const id of sections){
  const keys=f.locator('#'+id+' .v83-ipa-key');
  await press(keys.first(),'zoom-'+id);await press(keys.last());
 }
 for(let i=0;i<28;i++)await press(vowels.nth(i));
 await f.locator('#zoomMinus').click();await press(vowels.last());
 await f.locator('#zoomRange').fill('100');await press(vowels.first());
 await f.locator('#zoomMapToggle').click();assert(await f.locator('#zoomMinimap').isVisible());
 await f.locator('#zoomClose').click();await page.waitForFunction(()=>!document.querySelector('#v83ChartFrame').classList.contains('zoom-fullscreen'));await press(vowels.last());
 // A touch tap also produces input and the residual dot without a native selection.
 const touchTargets=[];
 for(const id of sections)touchTargets.push(f.locator('#'+id+' .v83-ipa-key').first(),f.locator('#'+id+' .v83-ipa-key').last());
 touchTargets.push(vowels.first(),vowels.first());
 for(const touchKey of touchTargets){
  const sym=await touchKey.getAttribute('data-v83-sym'),before=await out.inputValue(),touchPoint=await screenPoint(touchKey);
  const caret=await out.evaluate(e=>({start:e.selectionStart,end:e.selectionEnd}));
  await page.touchscreen.tap(touchPoint.x,touchPoint.y);
  await f.waitForFunction(v=>__v839DotState().tag===v,sym,{timeout:3000});
  await page.waitForTimeout(350);
  assert.equal(await out.inputValue(),before.slice(0,caret.start)+sym+before.slice(caret.end),'one input per touch at saved caret');
 }
 // Native keyboard focus remains visibly outlined; Enter and Space still insert.
 await vowels.first().focus();await page.keyboard.press('Tab');
 const focus=await f.evaluate(()=>({key:document.activeElement?.classList.contains('v83-ipa-key'),outline:getComputedStyle(document.activeElement).outlineStyle}));assert(focus.key);assert.equal(focus.outline,'solid');
 const kbefore=await out.inputValue();await page.keyboard.press('Enter');assert.notEqual(await out.inputValue(),kbefore);
 await vowels.first().focus();await page.keyboard.press('Space');await page.waitForTimeout(345);assert.equal((await f.evaluate(()=>__v839DotState())).diameter,13);
 assert.deepEqual(errors,[]);console.log(`PASS ${name} ${width}: 224 shared glow/dot/popup checks and exact inputs; all 7 sections normal+zoom+touch; keyboard, locales, undo/redo, geometry`);
 await page.close();
 }await browser.close();
}
})().catch(e=>{console.error(e);process.exit(1)});
