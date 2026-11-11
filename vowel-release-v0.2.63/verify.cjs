'use strict';
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const out=process.env.ARTIFACT_DIR||'audit-output/v063';fs.mkdirSync(out,{recursive:true});
const base=fs.readFileSync('vowel-release-v0.2.62/index.html','utf8'),candidate=fs.readFileSync('vowel-release-v0.2.63/index.html','utf8');
const beforeRule='#chart #pulmonicConsonants thead th{padding-top:4px;padding-bottom:4px}',afterRule='#chart #pulmonicConsonants thead th{padding-top:6px;padding-bottom:6px}';
assert.equal(base.split(beforeRule).length-1,1);assert.equal(base.match(/0\.2\.62/g).length,3);
assert.equal(candidate,base.replaceAll('0.2.62','0.2.63').replace(beforeRule,afterRule),'Unexpected change outside the header rule and version labels');
assert.equal(candidate.split('#chart #pulmonicConsonants tbody td > span{padding-bottom:3px}').length-1,1);
(async()=>{const records=[];
for(const width of [1280,390]){
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-zygote','--single-process','--disable-gpu','--disable-software-rasterizer']}:{})});
 const page=await browser.newPage({viewport:{width,height:1100},deviceScaleFactor:3}),pair=[];
 for(const version of ['62','63']){
  const errors=[],onError=e=>errors.push(e.message);page.on('pageerror',onError);
  const url=process.env.PUBLIC_BASE?process.env.PUBLIC_BASE+'/vowel-release-v0.2.'+version+'/':'file://'+path.resolve('vowel-release-v0.2.'+version+'/index.html');
  const response=await page.goto(url);if(process.env.PUBLIC_BASE)assert.equal(response.status(),200);
  await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(80);
  const data=await page.evaluate(()=>{
   const root=document.querySelector('#pulmonicConsonants'),rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom,right:r.right}},css=e=>getComputedStyle(e),scale=document.querySelector('#chart').getBoundingClientRect().width/1040;
   const cells=[...root.querySelectorAll('tbody td')],spans=[...root.querySelectorAll('tbody td > span')];
   return {version:document.getElementById('appVersion').textContent,scale,root:rect(root),header:rect(root.querySelector('thead')),body:rect(root.querySelector('tbody')),
    headers:[...root.querySelectorAll('thead th')].map(e=>{const r=document.createRange();r.selectNodeContents(e);return {text:e.textContent.trim(),box:rect(e),font:css(e).fontSize,lineCount:r.getClientRects().length,paddingTop:css(e).paddingTop,paddingBottom:css(e).paddingBottom}}),
    cells:cells.map(e=>({width:rect(e).width/scale,height:rect(e).height/scale,font:css(e).fontSize,padding:css(e).paddingBottom})),
    glyphs:spans.map(e=>({glyph:e.textContent,box:rect(e),parent:rect(e.parentElement),padding:css(e).paddingBottom,relativeX:(rect(e).x-rect(e.parentElement).x)/scale,bottomGap:(rect(e.parentElement).bottom-rect(e).bottom)/scale})),
    grays:[...root.querySelectorAll('.impossible')].map((e,i)=>({i,tag:e.tagName,box:rect(e),parent:rect(e.parentElement),background:css(e).backgroundColor})),fontLoaded:document.fonts.check('13px "Noto Sans JP Local"')&&document.fonts.check('32px "Doulos SIL Local"')};
  });
  assert.equal(data.version,'0.2.'+version);assert(data.fontLoaded);assert.equal(data.headers.length,12);assert.equal(data.grays.length,17);
  assert.deepEqual([...new Set(data.glyphs.map(x=>x.padding))],['3px']);assert.deepEqual([...new Set(data.cells.map(x=>x.padding))],['0px']);assert(data.glyphs.every(x=>x.bottomGap>=-.02));
  assert(data.headers.every(x=>x.font==='13px'&&x.lineCount<=1),'Header font or wrapping changed');assert.equal(errors.length,0);
  await page.locator('#pulmonicConsonants').screenshot({path:`${out}/v0.2.${version}-${width}.png`});
  await page.locator('#pulmonicConsonants tbody').screenshot({path:`${out}/v0.2.${version}-${width}-body.png`});
  fs.writeFileSync(`${out}/v0.2.${version}-${width}.json`,JSON.stringify({width,url,errors,...data},null,2));pair.push(data);page.off('pageerror',onError);
 }
 const [a,b]=pair;assert.equal(a.glyphs.length,b.glyphs.length);assert.equal(a.cells.length,b.cells.length);assert(Math.abs((b.header.height-a.header.height)/a.scale-4)<.03);
 for(let i=0;i<a.headers.length;i++){assert.equal(a.headers[i].text,b.headers[i].text);assert(Math.abs((a.headers[i].box.width-b.headers[i].box.width)/a.scale)<.01);assert.equal(b.headers[i].paddingTop,'6px');assert.equal(b.headers[i].paddingBottom,'6px');}
 for(let i=0;i<a.cells.length;i++){for(const k of ['width','height'])assert(Math.abs(a.cells[i][k]-b.cells[i][k])<.01,'Body geometry changed');assert.equal(a.cells[i].font,b.cells[i].font);}
 for(let i=0;i<a.glyphs.length;i++){assert.equal(a.glyphs[i].glyph,b.glyphs[i].glyph);for(const k of ['relativeX','bottomGap'])assert(Math.abs(a.glyphs[i][k]-b.glyphs[i][k])<.01,'Glyph-bottom or horizontal placement changed');}
 records.push({width,version:'0.2.63',headers:12,grayRegions:17,glyphs:b.glyphs.length,headerHeightBefore:a.header.height/a.scale,headerHeightAfter:b.header.height/b.scale,columnsAndBodyUnchanged:true,glyphBottom3pxPreserved:true,sourceChangeRestricted:true,numericChecksPassed:true});
 console.log('PULMONIC V063 CHECK PASS',JSON.stringify(records.at(-1)));await browser.close();
}
fs.writeFileSync(out+'/numeric-results.json',JSON.stringify(records,null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
