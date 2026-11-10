'use strict';
const {chromium}=require('playwright');
const path=require('path'),assert=require('node:assert/strict');
(async()=>{
const browser=await chromium.launch({headless:true});
const all=[];
for(const width of [390,1280])for(const size of [32,48]){
 const page=await browser.newPage({viewport:{width,height:900}});
 await page.goto('file://'+path.resolve('vowel-release-v0.2.55/index.html'),{waitUntil:'load'});
 const result=await page.evaluate(async fontSize=>{
  const field=document.getElementById('vowelFontSize');field.value=fontSize;field.dispatchEvent(new Event('input',{bubbles:true}));
  if(document.fonts)await document.fonts.ready;
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const svg=document.querySelector('#vowelQuadrilateral svg');
  const glyphs=[...svg.querySelectorAll('.vowel-dynamic-glyph')];
  const masks=[...svg.querySelectorAll('#vowelCutouts rect')].map((r,i)=>({
   char:glyphs[i].textContent,
   l:+r.getAttribute('x'),r:+r.getAttribute('x') + +r.getAttribute('width'),
   t:+r.getAttribute('y'),b:+r.getAttribute('y') + +r.getAttribute('height')
  }));
  const M=x=>[x.a,x.b,x.c,x.d,x.e,x.f].map(v=>+v.toFixed(8));
  const maskGroup=svg.querySelector('.vowel-lines'),background=svg.querySelector('#vowelTextCutout');
  const ruleMatrix=M(maskGroup.getCTM()),maskMatrix=M(svg.querySelector('#vowelCutouts').getCTM());
  const lineNodes=[...svg.querySelectorAll('path.official-vowel-rule')];
  const dots=svg.querySelectorAll('.vowel-dots circle').length;
  const parse=d=>[...d.matchAll(/M\s*([-\d.]+)\s+([-\d.]+)\s+L\s*([-\d.]+)\s+([-\d.]+)/g)].map(m=>m.slice(1).map(Number));
  const P=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
  // independent axis-aligned clipping: midpoint test between all x/y boundary parameter breakpoints
  function cutByRect(a,b,rect){
   const dx=b[0]-a[0],dy=b[1]-a[1];
   const ts=[0,1];
   if(dx!==0)for(const x of [rect.l,rect.r])ts.push((x-a[0])/dx);
   if(dy!==0)for(const y of [rect.t,rect.b])ts.push((y-a[1])/dy);
   const t=ts.filter(v=>v>=0&&v<=1).sort((x,y)=>x-y);
   const pieces=[];
   for(let i=0;i<t.length-1;i++){
    const lo=t[i],hi=t[i+1],mid=P(a,b,(lo+hi)/2);
    if(hi>lo+1e-9&&mid[0]>=rect.l&&mid[0]<=rect.r&&mid[1]>=rect.t&&mid[1]<=rect.b)pieces.push([lo,hi]);
   }
   return pieces;
  }
  const rnd=n=>+n.toFixed(3);
  const endpoints=(a,b,iv)=>[P(a,b,iv[0]).map(rnd),P(a,b,iv[1]).map(rnd)];
  const results=[];
  for(const node of lineNodes){
   const id=node.dataset.officialDrawing||'front',masked=!!node.closest('.vowel-lines');
   const parts=parse(node.getAttribute('d'));
   const sections=[];
   for(const [x0,y0,x1,y1] of parts){
    const a=[x0,y0],b=[x1,y1],length=Math.hypot(x1-x0,y1-y0);
    const cuts=masked?masks.flatMap(m=>cutByRect(a,b,m).map(iv=>({iv,char:m.char}))):[];
    cuts.sort((p,q)=>p.iv[0]-q.iv[0]);
    const union=[];
    for(const c of cuts){
     const prev=union.at(-1);
     if(prev&&c.iv[0]<=prev.iv[1]+1e-9){prev.iv[1]=Math.max(prev.iv[1],c.iv[1]);prev.chars.add(c.char)}
     else union.push({iv:[...c.iv],chars:new Set([c.char])});
    }
    let cursor=0;const visible=[];
    for(const u of union){if(u.iv[0]>cursor+1e-9)visible.push([cursor,u.iv[0]]);cursor=Math.max(cursor,u.iv[1]);}
    if(cursor<1-1e-9)visible.push([cursor,1]);
    const maskedLength=union.reduce((z,u)=>z+(u.iv[1]-u.iv[0])*length,0);
    const visibleLength=visible.reduce((z,u)=>z+(u[1]-u[0])*length,0);
    if(Math.abs(visibleLength+maskedLength-length)>1e-6)throw Error('conservation failure '+id);
    sections.push({
      source:[a,b],visible:visible.map(iv=>endpoints(a,b,iv)),
      masked:union.map(u=>({endpoints:endpoints(a,b,u.iv),chars:[...u.chars]})),
      sourceLength:rnd(length),visibleLength:rnd(visibleLength),maskedLength:rnd(maskedLength)
    });
   }
   results.push({line:id,sections});
  }
  return {fontSize,lines:results,glyphs:glyphs.length,dots,masks:masks.length,
    matrixEquals:JSON.stringify(ruleMatrix)===JSON.stringify(maskMatrix),ruleMatrix,maskMatrix,
    maskType:getComputedStyle(background).maskType,
    maskUnits:background.getAttribute('maskUnits'),
    contentUnits:background.getAttribute('maskContentUnits')||'userSpaceOnUse (default)'};
 },size);
 assert.equal(result.glyphs,28);assert.equal(result.dots,11);assert.equal(result.masks,28);
 assert.equal(result.matrixEquals,true,'mask layer and rules must have same SVG CTM');
 all.push({width,...result});
 await page.close();
}
await browser.close();
for(const r of all)console.log('RECONSTRUCTED_VISIBLE_PATHS '+JSON.stringify(r));
const base=all.filter(x=>x.width===390);
for(const small of base){
 const large=all.find(x=>x.width===1280&&x.fontSize===small.fontSize);
 assert.deepEqual(small.lines,large.lines,'viewport-dependent local SVG geometry');
}
console.log('PASS independent midpoint-interval clipping, mask/line CTM, 28 glyphs, 11 dots, 4 viewport/size conditions');
})().catch(e=>{console.error(e);process.exitCode=1});
