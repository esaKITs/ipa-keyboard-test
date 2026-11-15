const {chromium,webkit}=require('playwright');
const assert=require('node:assert/strict');const fs=require('node:fs');
const base=process.env.TEST_BASE||'http://127.0.0.1:8765/';
fs.mkdirSync('qa8315',{recursive:true});
async function chartFrame(p){await p.frameLocator('#v83ChartFrame').locator('.v83-ipa-key').first().waitFor();const h=await p.locator('#v83ChartFrame').elementHandle();return await h.contentFrame();}
(async()=>{
for(const [name,type] of Object.entries({chromium,webkit})){
 const browser=await type.launch({headless:true});
 for(const width of [390,1280]){
 if(process.env.TEST_CASE&&process.env.TEST_CASE!==name+'/'+width)continue;
 const page=await browser.newPage({viewport:{width,height:844},hasTouch:true});
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto(base+'keyboard-v83-15/',{waitUntil:'load'});
 let f=await chartFrame(page);
 await f.locator('.v83-ipa-key').first().waitFor();
 await f.evaluate(()=>document.fonts.ready);
 await f.waitForFunction(()=>document.querySelector('#vowelQuadrilateral .vowel-dynamic-glyph').style.fontSize==='32px');
 assert.equal(await f.locator('.v83-ipa-key').count(),235);
 assert.equal(await f.locator('#vowelQuadrilateral .v83-ipa-key').count(),28);
 // Compare all hitboxes and complete SVG geometry against the untouched source.
 const source=await browser.newPage({viewport:{width,height:844}});
 await source.goto(base+'keyboard-v83-4/');
 const sf=await chartFrame(source);
 await sf.locator('.v83-ipa-key').first().waitFor();await sf.evaluate(()=>document.fonts.ready);await sf.waitForFunction(()=>document.querySelector('#vowelQuadrilateral .vowel-dynamic-glyph').style.fontSize==='32px');
 const geometry=()=>({svg:document.querySelector('#vowelQuadrilateral').outerHTML,keys:[...document.querySelectorAll('.v83-ipa-key:not([data-v8310-added])')].map(e=>{let r=e.getBoundingClientRect();return [e.dataset.v83Sym,r.width,r.height,r.x,r.y]})});
 // Japanese labels load lazily after the chart's IPA font; compare after both fonts and recentering frames finish.
 for(const frame of [f,sf])await frame.evaluate(async()=>{
  await Promise.all([document.fonts.load('10px "Noto Sans JP Local"','前舌中舌後舌狭半狭半広広'),document.fonts.load('700 10px "Noto Sans JP Local"','前舌中舌後舌狭半狭半広広')]);
  await document.fonts.ready;window.dispatchEvent(new Event('resize'));
  await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 });
 assert.deepEqual(await f.evaluate(geometry),await sf.evaluate(geometry));await source.close();
 const prior=await browser.newPage({viewport:{width,height:844}});
 await prior.goto(base+'keyboard-v83-7/');
 const pf=await chartFrame(prior);
 const pk=pf.locator('#vowelQuadrilateral .v83-ipa-key').first();
 await pk.scrollIntoViewIfNeeded();await pk.dispatchEvent('pointerdown',{pointerType:'touch'});
 const oldGap=await pk.evaluate(e=>e.getBoundingClientRect().top-document.querySelector('#v831SymbolPopup').getBoundingClientRect().bottom);
 console.log('BASELINE_POPUP_GAP '+name+'/'+width+' '+oldGap);assert(Math.abs(oldGap-82)<.2,'reproduce old detached popup');await prior.close();
 let vowels=f.locator('#vowelQuadrilateral .v83-ipa-key');

 const panel=page.locator('#floatingEditor'),handle=page.locator('#inputPanelDrag');
 async function dragPanelTo(x,y){
  const p=await panel.boundingBox(),h=await handle.boundingBox(),sx=h.x+Math.min(30,h.width/2),sy=h.y+h.height/2;
  await page.mouse.move(sx,sy);await page.mouse.down();
  await page.mouse.move(sx+x-p.x,sy+y-p.y,{steps:8});await page.mouse.up();
  await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 }
 async function parkPanel(key){
  const r=await key.evaluate(e=>{const r=e.getBoundingClientRect(),f=frameElement.getBoundingClientRect();return{y:r.top+f.top,height:r.height};}),p=await panel.boundingBox();
  const y=r.y+r.height/2<422?844-p.height-8:8;
  if(Math.abs(p.y-y)>1)await dragPanelTo(p.x,y);
 }

 async function screenPoint(key){
  let point=null;
  for(let attempt=0;attempt<3&&!point;attempt++){
   await key.scrollIntoViewIfNeeded();
   if(await page.locator('#v83ChartFrame').evaluate(e=>e.classList.contains('zoom-fullscreen')))await key.evaluate(e=>e.scrollIntoView({block:'center',inline:'center',behavior:'instant'}));
   else{
    const r=await key.evaluate(e=>{const r=e.getBoundingClientRect(),f=frameElement.getBoundingClientRect();return{y:r.top+f.top,height:r.height};});
    if(r.y<8||r.y+r.height>836){
     const before=await page.evaluate(()=>({y:scrollY,height:document.scrollingElement.scrollHeight,overflow:getComputedStyle(document.body).overflow}));
     await page.evaluate(d=>window.scrollBy(0,d),r.y+r.height/2-422);
     const after=await page.evaluate(()=>({y:scrollY,height:document.scrollingElement.scrollHeight,overflow:getComputedStyle(document.body).overflow}));
     console.log('HOST_SCROLL '+name+'/'+width+' '+JSON.stringify({target:r,before,after}));
    }
   }
   await f.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
   await parkPanel(key);
   point=await key.evaluate(el=>{
    const r=el.getBoundingClientRect(),fr=window.frameElement.getBoundingClientRect();
    for(const [fx,fy]of [[.5,.5],...Array.from({length:19},(_,y)=>Array.from({length:19},(_,x)=>[(x+1)/20,(y+1)/20])).flat()]){
     const x=Math.round(r.left+r.width*fx+fr.left)-fr.left,y=Math.round(r.top+r.height*fy+fr.top)-fr.top;
     if(document.elementFromPoint(x,y)?.closest('.v83-ipa-key')===el&&parent.document.elementFromPoint(fr.left+x,fr.top+y)===window.frameElement)return{x:fr.left+x,y:fr.top+y};
    }return null;
   });
  }
  if(!point){
   const state=await key.evaluate(el=>{const r=el.getBoundingClientRect(),fr=frameElement.getBoundingClientRect();return{key:el.dataset.v83Sym,rect:r.toJSON(),frame:fr.toJSON(),inner:[innerWidth,innerHeight,scrollX,scrollY],innerTarget:document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)?.outerHTML.slice(0,400),outerTarget:parent.document.elementFromPoint(fr.left+r.left+r.width/2,fr.top+r.top+r.height/2)?.outerHTML.slice(0,400),editor:parent.document.getElementById('floatingEditor').getBoundingClientRect().toJSON(),parentWindow:{y:parent.scrollY,height:parent.document.scrollingElement.scrollHeight,overflow:getComputedStyle(parent.document.body).overflow}};});
   await page.screenshot({path:`qa8315/${name}-${width}-nohit.png`});
   throw Error('No unobscured physical point '+JSON.stringify(state));
  }
  return point;
 }

 // Responsive editor defaults and independent size controls.
 const phone=width<=700,defaultFont=phone?22:32,defaultWidth=phone?320:440;
 const uiState=()=>({
  width:document.getElementById('floatingEditor').getBoundingClientRect().width,
  height:document.getElementById('floatingEditor').getBoundingClientRect().height,
  font:parseFloat(getComputedStyle(document.getElementById('out')).fontSize),
  button:document.getElementById('copy').getBoundingClientRect().width
 });
 let ui=await page.evaluate(uiState);
 assert.equal(ui.font,defaultFont);assert(Math.abs(ui.width-defaultWidth)<1);
 assert(ui.height<=(phone?128:160),'empty editor is compact '+JSON.stringify(ui));
 assert(Math.abs(ui.button-(phone?28:32))<1,'compact controls '+JSON.stringify(ui));
 const chartState=()=>({svg:document.getElementById('vowelQuadrilateral').outerHTML,scale:document.getElementById('chartScaleContent').style.transform,font:document.getElementById('vowelFontSize').value,zoom:document.getElementById('zoomRange').value});
 const originalChart=await f.evaluate(chartState);
 await page.locator('#settingsToggle').click();
 await page.locator('#inputSizeSlider').fill('3');
 await page.locator('#panelWidthSlider').fill(phone?'280':'360');
 ui=await page.evaluate(uiState);assert.equal(ui.font,26);assert(Math.abs(ui.width-(phone?280:360))<1);
 assert.equal(ui.button,phone?28:32,'font/width do not scale controls');
 assert.deepEqual(await f.evaluate(chartState),originalChart,'panel resizing and font choice leave chart unchanged');
 await page.setViewportSize({width:phone?900:390,height:844});await page.waitForTimeout(100);
 ui=await page.evaluate(uiState);assert.equal(ui.font,phone?32:22);assert(Math.abs(ui.width-(phone?440:320))<1,'automatic phone/desktop width');
 await page.locator('#inputSizeSlider').fill(phone?'5':'1');
 await page.locator('#panelWidthSlider').fill(phone?'500':'300');
 await page.setViewportSize({width,height:844});await page.waitForTimeout(100);
 ui=await page.evaluate(uiState);assert.equal(ui.font,26);assert(Math.abs(ui.width-(phone?280:360))<1,'profile choice restored');
 await page.locator('#inputSizeSlider').fill(phone?'2':'4');
 await page.locator('#panelWidthSlider').fill(String(defaultWidth));
 await page.locator('#settingsToggle').click();
 const beforeChartZoom=await page.evaluate(uiState);
 await f.locator('#vowelFontSize').fill('40');
 await f.waitForFunction(()=>document.querySelector('#vowelQuadrilateral .vowel-dynamic-glyph').style.fontSize==='40px');
 assert.deepEqual(await page.evaluate(uiState),beforeChartZoom,'chart font changes do not resize editor');
 await f.locator('#vowelFontSize').fill('32');
 await f.waitForFunction(()=>document.querySelector('#vowelQuadrilateral .vowel-dynamic-glyph').style.fontSize==='32px');
 await parkPanel(f.locator('#chartZoomOpen'));await f.locator('#chartZoomOpen').click();
 await page.waitForFunction(()=>document.getElementById('v83ChartFrame').classList.contains('zoom-fullscreen'));
 const fullscreenEditor=await page.evaluate(uiState);
 await f.locator('#zoomRange').fill('300');await f.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 assert.deepEqual(await page.evaluate(uiState),fullscreenEditor,'100–300% chart zoom does not scale editor');
 await f.locator('#zoomRange').fill('100');await f.locator('#zoomClose').click();
 await page.waitForFunction(()=>!document.getElementById('v83ChartFrame').classList.contains('zoom-fullscreen'));
 await f.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 const normalEditor=await page.evaluate(uiState);
 assert.equal(normalEditor.width,fullscreenEditor.width);assert.equal(normalEditor.font,fullscreenEditor.font);assert.equal(normalEditor.button,fullscreenEditor.button);
 console.log('INDEPENDENT_SIZING '+name+'/'+width+' '+JSON.stringify(normalEditor));
 await page.screenshot({path:`qa8315/${name}-${width}-compact-editor.png`});

 // Editor is a real fixed overlay: mouse/touch/keyboard movement, caret and text preservation.
 assert.equal(await panel.evaluate(e=>getComputedStyle(e).position),'fixed');
 await page.locator('#out').fill('ai');await page.locator('#out').evaluate(e=>{e.focus();e.setSelectionRange(1,1);});
 const initial=await panel.boundingBox();
 await dragPanelTo(8,300);
 assert(Math.abs((await panel.boundingBox()).y-initial.y)>20,'panel moves');
 const horizontal=await panel.boundingBox();await dragPanelTo(width-horizontal.width-8,300);
 assert(Math.abs((await panel.boundingBox()).x-(width-horizontal.width-8))<1,'editor moves horizontally within the screen');
 await dragPanelTo(8,300);
 assert.equal(await page.locator('#out').inputValue(),'ai');assert.equal(await page.locator('#out').evaluate(e=>e.selectionStart),1,'drag preserves caret');
 const fixed=await panel.boundingBox();await page.evaluate(()=>scrollTo(0,200));
 assert(Math.abs((await panel.boundingBox()).y-fixed.y)<.5,'editor remains fixed during page scroll');
 await handle.focus();const kb=await panel.boundingBox();await page.keyboard.press('ArrowUp');
 assert(Math.abs((await panel.boundingBox()).y-(kb.y-10))<.5,'keyboard moves panel');
 if(name==='chromium'){
  const cd=await page.context().newCDPSession(page),h=await handle.boundingBox(),x=h.x+30,y=h.y+16;
  const before=await panel.boundingBox();
  await cd.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
  await cd.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y+60}]});
  await cd.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cd.detach();
  assert((await panel.boundingBox()).y-before.y>50,'real touch drag moves editor');
 }
 const saved=await panel.boundingBox();await page.reload({waitUntil:'load'});f=await chartFrame(page);vowels=f.locator('#vowelQuadrilateral .v83-ipa-key');await f.locator('.v83-ipa-key').first().waitFor();
 await page.waitForFunction(()=>document.getElementById('floatingEditor').style.left!=='');
 assert(Math.abs((await panel.boundingBox()).y-saved.y)<2,'saved position survives reload');
 await page.setViewportSize({width,height:620});await page.waitForTimeout(80);
 let bounded=await panel.boundingBox();assert(bounded.x>=7&&bounded.y>=7&&bounded.x+bounded.width<=width-7&&bounded.y+bounded.height<=613,'resized panel stays within screen');
 await page.setViewportSize({width,height:844});await page.waitForTimeout(80);
 await page.locator('#inputPanelReset').click();assert.equal(await page.evaluate(()=>localStorage.getItem('esakits.ipa.floating-editor.v1')),null);

 await page.locator('#contrastToggle').click();
 assert.equal(await page.locator('html').getAttribute('data-inverse'),'true');
 assert.equal(await page.locator('#contrastToggle').getAttribute('aria-pressed'),'true');
 assert.equal(await page.locator('#v83ChartFrame').evaluate(e=>getComputedStyle(e).filter),'none');assert.equal(await f.locator('html').getAttribute('data-inverse'),'true');assert((await f.locator('#chartScaleShell').evaluate(e=>getComputedStyle(e).filter)).includes('invert(1)'));
 await page.reload({waitUntil:'load'});f=await chartFrame(page);vowels=f.locator('#vowelQuadrilateral .v83-ipa-key');await f.locator('.v83-ipa-key').first().waitFor();
 assert.equal(await page.locator('html').getAttribute('data-inverse'),'true','inverse preference survives reload');
 await dragPanelTo(8,300);const inv=await panel.boundingBox();await page.evaluate(()=>scrollTo(0,200));
 assert(Math.abs((await panel.boundingBox()).y-inv.y)<.5,'inverse mode keeps panel fixed');
 await page.screenshot({path:`qa8315/${name}-${width}-inverse-editor.png`});
 const inverseKey=f.locator('#pulmonicConsonants .v83-ipa-key').first(),ip=await screenPoint(inverseKey);
 await page.touchscreen.tap(ip.x,ip.y);await page.waitForTimeout(350);
 assert.equal(await page.locator('#out').inputValue(),'p','chart touch input works in inverse mode');
 await page.locator('#contrastToggle').click();
 assert.equal(await page.locator('html').getAttribute('data-inverse'),'false');
 const controls=await panel.evaluate(e=>{const p=e.getBoundingClientRect();return[...e.querySelectorAll('.main-controls button')].every(b=>{const r=b.getBoundingClientRect();return r.left>=p.left&&r.right<=p.right&&r.top>=p.top&&r.bottom<=p.bottom;});});
 assert(controls,'all editor controls fit inside the panel');


 // Selecting and replacing a known middle range must survive moving the panel.
 await page.locator('#out').fill('abcd');
 await page.locator('#out').evaluate(e=>{e.focus();e.setSelectionRange(1,3);e.dispatchEvent(new Event('select'));});
 await dragPanelTo(8,300);
 const editKey=f.locator('#pulmonicConsonants .v83-ipa-key').first(),ep=await screenPoint(editKey);
 await page.touchscreen.tap(ep.x,ep.y);await page.waitForTimeout(350);
 assert.equal(await page.locator('#out').inputValue(),'apd','moving editor preserves the selected replacement range');
 await page.locator('#out').fill('');
 // A floating editor just above a key must not displace its popup far away.
 const obstacleKey=f.locator('#diacritics .v83-ipa-key').first();
 await obstacleKey.scrollIntoViewIfNeeded();let kr=await obstacleKey.boundingBox();
 if(kr.y>650){await page.evaluate(d=>scrollBy(0,d),kr.y-550);kr=await obstacleKey.boundingBox();}
 const pr=await panel.boundingBox();await dragPanelTo(Math.max(8,kr.x-pr.width/2),kr.y-pr.height-10);
 const hp=await obstacleKey.evaluate(e=>{const r=e.getBoundingClientRect(),f=frameElement.getBoundingClientRect();return{x:Math.round(f.left+r.left+r.width/2),y:Math.round(f.top+r.top+r.height/2)};});
 await page.mouse.move(hp.x,hp.y);await page.mouse.down();
 const avoidance=await obstacleKey.evaluate(e=>{const k=e.getBoundingClientRect(),p=document.getElementById('v831SymbolPopup').getBoundingClientRect();return{below:p.top-k.bottom,text:__v831PopupState().text};});
 assert.equal(avoidance.text,await obstacleKey.getAttribute('data-v83-sym'));assert(Math.abs(avoidance.below-7)<.2,'popup stays near key below floating editor '+JSON.stringify(avoidance));
 await page.mouse.up();
 async function press(key,label){
  console.log('PRESS '+name+'/'+width+'/'+await key.getAttribute('data-v83-sym'));
  await key.scrollIntoViewIfNeeded();const r=await key.boundingBox();
  const hit=await screenPoint(key);
  await page.mouse.move(hit.x,hit.y);await page.mouse.down();
  const state=await key.evaluate(el=>{
   const g=document.querySelector('.v83-purple-flash'),d=document.querySelector('#v839SelectedSymbolDot'),p=__v831PopupState();
   const r=g.getBoundingClientRect(),s=getComputedStyle(g),a=document.querySelectorAll('#vowelQuadrilateral .v83-ipa-key');
   const target=el;if(!target)throw Error('Popup not shown: '+JSON.stringify(p));const t=target.getBoundingClientRect();const pr=document.querySelector('#v831SymbolPopup').getBoundingClientRect();
   return {scale:Number(el.closest('#chart').dataset.feedbackScale)||1,popup:{viewportWidth:innerWidth,gap:t.top-pr.bottom,below:pr.top-t.bottom,center:pr.left+pr.width/2-(t.left+t.width/2),rect:pr.toJSON()},w:r.width,h:r.height,dx:r.x+r.width/2-t.x-t.width/2,dy:r.y+r.height/2-t.y-t.height/2,display:s.display,bg:s.backgroundImage,border:s.borderStyle,shadow:s.boxShadow,dot:getComputedStyle(d).display,p};
  });
  // WebKit may quantize fixed-position text to fractional CSS pixels; permit at most half a pixel.
  assert.equal(state.p.text,await key.getAttribute('data-v83-sym'),'popup must identify the physically pressed symbol');
  assert(state.w>=12.5*state.scale&&state.w<=26.1*state.scale,'growing glow width '+state.w);assert(state.h>=12.5*state.scale&&state.h<=26.1*state.scale,'growing glow height '+state.h);assert(Math.abs(state.dx)<.5&&Math.abs(state.dy)<.5,'GLOW_CENTER '+JSON.stringify(state));assert.equal(state.display,'block');assert.equal(state.dot,'none');assert.equal(state.border,'none');assert.equal(state.shadow,'none');assert(state.bg.includes('radial-gradient')&&state.bg.includes('166, 128, 222'),JSON.stringify(state));assert(state.p.show);assert(Math.abs(state.popup.gap-7)<.1||Math.abs(state.popup.below-7)<.1,'popup must be 7px above pressed glyph: '+JSON.stringify(state.popup));assert(Math.abs(state.popup.center)<.5 || (state.popup.center<0&&Math.abs(state.popup.rect.right-(state.popup.viewportWidth-4))<.2) || (state.popup.center>0&&Math.abs(state.popup.rect.left-4)<.2),'popup must center or stay within frame edge: '+JSON.stringify(state.popup));
  // Grow animation must expand from a 13px visual core to full 26px, without a step change.
  if(label){await f.locator('.v83-purple-flash').evaluate(el=>Promise.all(el.getAnimations().map(a=>a.finished)));const expanded=await f.locator('.v83-purple-flash').evaluate(el=>({transform:getComputedStyle(el).transform,opacity:Number(getComputedStyle(el).opacity)}));assert(expanded.opacity>.95,'glow reaches full opacity '+JSON.stringify(expanded));const fullWidth=await f.locator('.v83-purple-flash').evaluate(el=>el.getBoundingClientRect().width);assert(Math.abs(fullWidth-26*state.scale)<.2,'glow grows to 26px: '+fullWidth);}
  if(label)await page.screenshot({path:`qa8315/${name}-${width}-${label}-held.png`});
  // The glow must last throughout a held press rather than expire at 420ms.
  if(label){await page.waitForTimeout(500);assert.equal(await f.locator('.v83-purple-flash').evaluate(e=>getComputedStyle(e).display),'block');}
  await page.mouse.up();
  // During the short fade-out, the 26px glow remains and the 13px dot stays hidden.
  const transition=await f.evaluate(()=>({glow:getComputedStyle(document.querySelector('.v83-purple-flash')).display,dot:__v839DotState().visible}));
  assert.equal(transition.glow,'block');assert.equal(transition.dot,true);
  if(label)await page.waitForTimeout(345);
  const end=await key.evaluate(el=>{const d=document.querySelector('#v839SelectedSymbolDot'),r=d.getBoundingClientRect(),s=getComputedStyle(d),t=el.getBoundingClientRect();return{scale:Number(el.closest('#chart').dataset.feedbackScale)||1,dot:__v839DotState(),dx:r.x+r.width/2-t.x-t.width/2,dy:r.y+r.height/2-t.y-t.height/2,border:s.borderStyle,shadow:s.boxShadow,glow:getComputedStyle(document.querySelector('.v83-purple-flash')).display,popup:__v831PopupState().show,selection:getSelection().toString()};});
  assert(Math.abs(end.dot.diameter-13*end.scale)<.02);assert(end.dot.visible);assert.equal(end.dot.background,'rgba(166, 128, 222, 0.45)');assert.equal(end.border,'none');assert.equal(end.shadow,'none');if(label)assert.equal(end.glow,'none');assert(!end.popup);assert.equal(end.selection,'');assert(Math.abs(end.dx)<.5&&Math.abs(end.dy)<.5);
  assert.equal(end.dot.tag,await key.getAttribute('data-v83-sym'));
  const native=await key.evaluate(e=>({select:getComputedStyle(e).getPropertyValue("user-select")||getComputedStyle(e).getPropertyValue("-webkit-user-select"),tap:getComputedStyle(e).webkitTapHighlightColor,focus:document.activeElement===e}));assert.equal(native.select,'none');assert(!native.focus);
  if(label)await page.screenshot({path:`qa8315/${name}-${width}-${label}-released.png`});
 }
 const sections=['pulmonicConsonants','nonPulmonicConsonants','vowels','otherSymbols','diacritics','suprasegmentals','tonesAndWordAccents','diacriticsNote'];
 const checkedSections=new Set();
 const out=page.locator('#out');
 // Verify each of the 224 physical targets inserts its own complete symbol at the caret.
 await out.fill('');
 for(let i=0;i<235;i++){
  if(process.env.TEST_CASE)continue;
  const k=f.locator('.v83-ipa-key').nth(i),sym=await k.getAttribute('data-v83-sym'),before=await out.inputValue();
  const section=await k.evaluate(e=>e.closest('#pulmonicConsonants,#nonPulmonicConsonants,#vowels,#otherSymbols,#diacritics,#suprasegmentals,#tonesAndWordAccents,#diacriticsNote')?.id);const label=checkedSections.has(section)?null:'normal-'+section;await press(k,label);checkedSections.add(section);assert.equal(await out.inputValue(),before+sym,`input ${name}/${width}/${i}/${sym}`);
 }
 if(!process.env.TEST_CASE)assert.deepEqual([...checkedSections].sort(),sections.slice().sort());
 if(process.env.TEST_CASE)await press(vowels.first());
 const beforeUndo=await out.inputValue();await page.locator('#undo').click();assert.notEqual(await out.inputValue(),beforeUndo);await page.locator('#redo').click();assert.equal(await out.inputValue(),beforeUndo);
 for(const [locale,needle] of [['en','voiced bilabial approximant'],['pt-BR','aproximante bilabial vozeada'],['fa','تقریبی دولبی واکدار'],['ja-osaka','有声両唇接近音'],['ja','有声両唇接近音']]){await page.locator('#languageSelect').selectOption(locale);await f.waitForFunction(v=>document.querySelector('#diacritics').textContent.includes(v),needle);}
 await parkPanel(f.locator('#chartZoomOpen'));await f.locator('#chartZoomOpen').click();await page.waitForFunction(()=>document.querySelector('#v83ChartFrame').classList.contains('zoom-fullscreen'));
 assert(await panel.isVisible(),'editor stays available in zoom');
 const hz=await handle.boundingBox();assert(await page.evaluate(p=>!!document.elementFromPoint(p.x,p.y)?.closest('#inputPanelDrag'),{x:hz.x+20,y:hz.y+15}),'editor is above fullscreen iframe');
 await dragPanelTo(8,300);
 await f.locator('#zoomMapToggle').click();assert(await f.locator('#zoomMinimap').isHidden());
 await f.locator('#zoomPlus').click();
 for(const id of sections){
  const keys=f.locator('#'+id+' .v83-ipa-key');
  await press(keys.first(),'zoom-'+id);await press(keys.last());
 }
 for(let i=0;i<28;i++)await press(vowels.nth(i));
 await dragPanelTo(8,844-(await panel.boundingBox()).height-8);await f.locator('#zoomMinus').click();await press(vowels.last());
 await dragPanelTo(8,844-(await panel.boundingBox()).height-8);await f.locator('#zoomRange').fill('100');await press(vowels.first());
 await dragPanelTo(8,844-(await panel.boundingBox()).height-8);await f.locator('#zoomMapToggle').click();assert(await f.locator('#zoomMinimap').isVisible());
 await f.locator('#zoomClose').click();await page.waitForFunction(()=>!document.querySelector('#v83ChartFrame').classList.contains('zoom-fullscreen'));await f.waitForFunction(()=>document.getElementById('chartZoomDialog').hidden);await f.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));await press(vowels.last());
 // A touch tap also produces input and the residual dot without a native selection.
 const touchTargets=[];
 for(const id of sections)touchTargets.push(f.locator('#'+id+' .v83-ipa-key').first(),f.locator('#'+id+' .v83-ipa-key').last());
 touchTargets.push(vowels.first(),vowels.first());
 for(const touchKey of touchTargets){
  const sym=await touchKey.getAttribute('data-v83-sym'),before=await out.inputValue(),touchPoint=await screenPoint(touchKey);
  const caret=await page.evaluate(()=>esaChartSelection());
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
 assert.deepEqual(errors,[]);console.log(process.env.TEST_CASE?`PASS TARGETED ${name} ${width}: fullscreen restoration, floating editor, inverse mode, representative mouse/touch/keyboard inputs`:`PASS FULL ${name} ${width}: 235 shared glow/dot/popup checks and exact inputs; all 7 sections and note normal+zoom+touch; keyboard, locales, undo/redo, geometry, floating editor, inverse mode, independent responsive sizing`);
 await page.close();
 }await browser.close();
}
})().catch(e=>{console.error(e);process.exit(1)});

