#!/usr/bin/env python3
"""Produce isolated IPA v0.2.57 release from approved v0.2.55, with font-derived convex glyph outlines."""
import json,re
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.pens.basePen import BasePen
class Pen(BasePen):
 def __init__(self,gs): super().__init__(gs);self.points=[]
 def _moveTo(self,p):self.points.append(tuple(p))
 def _lineTo(self,p):self.points.append(tuple(p))
 def _qCurveToOne(self,p1,p2):
  p0=self._getCurrentPoint()
  for k in range(1,33):
   t=k/32;u=1-t;self.points.append((u*u*p0[0]+2*u*t*p1[0]+t*t*p2[0],u*u*p0[1]+2*u*t*p1[1]+t*t*p2[1]))
 def _curveToOne(self,p1,p2,p3):
  p0=self._getCurrentPoint()
  for k in range(1,33):
   t=k/32;u=1-t
   self.points.append((u*u*u*p0[0]+3*u*u*t*p1[0]+3*u*t*t*p2[0]+t*t*t*p3[0],u*u*u*p0[1]+3*u*u*t*p1[1]+3*u*t*t*p2[1]+t*t*t*p3[1]))
 def _closePath(self):pass
 def _endPath(self):pass
def hull(points):
 p=sorted(set(points))
 if len(p)<3:raise ValueError("Too few contour samples")
 def cross(o,a,b):return (a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0])
 lower=[]
 for x in p:
  while len(lower)>1 and cross(lower[-2],lower[-1],x)<=0:lower.pop()
  lower.append(x)
 upper=[]
 for x in reversed(p):
  while len(upper)>1 and cross(upper[-2],upper[-1],x)<=0:upper.pop()
  upper.append(x)
 return lower[:-1]+upper[:-1]
font=TTFont('fonts/DoulosSIL-Regular.woff2')
units=font['head'].unitsPerEm
cmap=font.getBestCmap();gs=font.getGlyphSet()
chars=['i','y','ɨ','ʉ','ɯ','u','ɪ','ʏ','ʊ','e','ø','ɘ','ɵ','ɤ','o','ə','ɛ','œ','ɜ','ɞ','ʌ','ɔ','æ','ɐ','a','ɶ','ɑ','ɒ']
hulls=[]
for ch in chars:
 name=cmap[ord(ch)]
 pen=Pen(gs)
 gs[name].draw(pen)
 pts=hull(pen.points)
 advance=font['hmtx'].metrics[name][0]
 # Per-em coordinates relative to centered text advance and baseline.
 hulls.append({'char':ch,'polygon':[[round((x-advance/2)/units,6),round(-y/units,6)] for x,y in reversed(pts)]})
assert len(hulls)==28
html=Path('vowel-release-v0.2.55/index.html').read_text()
html=html.replace('0.2.55','0.2.57')
# Remove destructive rectangle mask from original rule group. Preserve paths/dots/glyphs.
html=html.replace('<g class="vowel-lines" mask="url(#vowelTextCutout)"', '<g class="vowel-lines"')
start=html.index(' layer.replaceChildren();',html.index('/* v0.2.57: reference positions'))
end=html.index(' window.dispatchEvent(new Event("resize"));',start)
script=r"""
 // Per-glyph font outlines generated from the actual Doulos SIL WOFF2.
 // All rule path fragments are restored from immutable approved SVG geometry.
 // Do not use getBBox rectangles, masking, or a fixed-size glyph shortcut.
 const outlines=window.__ipaDoulosHulls;
 if(!outlines || outlines.length!==letters.length)throw Error("Missing glyph hull data");
 if(!window.__ipaBaseRulePaths){
   window.__ipaBaseRulePaths=[...svg.querySelectorAll('path.official-vowel-rule')].map(path=>({path,base:path.getAttribute('d')}));
 }
 const EPS=1e-9,CLEARANCE=1.4;
 function clip(a,b,polygon){
   // Cyrus-Beck clipping for a CCW convex polygon expanded by CLEARANCE.
   const dx=b[0]-a[0],dy=b[1]-a[1];let lo=0,hi=1;
   for(let k=0;k<polygon.length;k++){
     const p=polygon[k],q=polygon[(k+1)%polygon.length];
     const ex=q[0]-p[0],ey=q[1]-p[1];
     const c0=ex*(a[1]-p[1])-ey*(a[0]-p[0]);
     const cd=ex*dy-ey*dx;
     const radius=CLEARANCE*Math.hypot(ex,ey);
     // Polygon points are CCW, inside means cross(edge,point)>=-radius.
     if(Math.abs(cd)<EPS){if(c0 < -radius)return null;continue;}
     const t=(-radius-c0)/cd;
     if(cd>0)lo=Math.max(lo,t);else hi=Math.min(hi,t);
     if(lo>=hi)return null;
   }
   return lo<hi?[lo,hi]:null;
 }
 const outlinesPlaced=letters.map((el,i)=>{
   if(el.textContent!==outlines[i].char)throw Error("Glyph order mismatch at "+i);
   const fs=Number.parseFloat(getComputedStyle(el).fontSize);
   const baseline=Number(el.getAttribute('y'))+Number(el.getAttribute('dy')||0);
   const center=Number(el.getAttribute('x'))+Number(el.getAttribute('dx')||0);
   return outlines[i].polygon.map(([px,py])=>[center+px*fs,baseline+py*fs]);
 });
 for(const {path,base} of window.__ipaBaseRulePaths){
   const points=[...base.matchAll(/[ML]\s*([-\d.]+)\s+([-\d.]+)/g)].map(m=>[+m[1],+m[2]]);
   if(points.length<2||points.length%2!==0)throw Error("Invalid immutable baseline for "+base);
   const output=[];
   for(let j=0;j<points.length;j+=2){
     const a=points[j],b=points[j+1],dx=b[0]-a[0],dy=b[1]-a[1];
     const gaps=outlinesPlaced.map(poly=>clip(a,b,poly)).filter(Boolean).sort((u,v)=>u[0]-v[0]);
     let cursor=0;
     const emit=(lo,hi)=>{
       if(hi-lo<1e-7)return;
       const point=t=>(a[0]+dx*t).toFixed(3)+" "+(a[1]+dy*t).toFixed(3);
       output.push("M"+point(lo)+" L"+point(hi));
     };
     for(const [lo,hi] of gaps){if(lo>cursor)emit(cursor,lo);cursor=Math.max(cursor,hi);}
     if(cursor<1)emit(cursor,1);
   }
   path.setAttribute('d',output.join(' '));
 }
 window.__ipaGlyphClipAudit={font,polygonCount:outlinesPlaced.length,clearance:CLEARANCE};
"""
html=html[:start]+script+html[end:]
# Avoid a dead mask dependency: mask defs may remain but no paths reference them.
hull_js='window.__ipaDoulosHulls='+json.dumps(hulls,ensure_ascii=False,separators=(',',':'))+';\n'
outdir=Path('vowel-release-v0.2.57');outdir.mkdir(exist_ok=True)
(outdir/'glyph-hulls.js').write_text(hull_js)
html=html.replace('<script>\n/* v0.2.57: reference positions', '<script src="./glyph-hulls.js"></script>\n<script>\n/* v0.2.57: reference positions')
assert 'window.__ipaDoulosHulls' in html and '<script src="./glyph-hulls.js">' in html
assert '<g class="vowel-lines" mask=' not in html
assert 'const SIDE_RATIO=0.20' not in html
assert len(re.findall(r'<path class="official-vowel-rule',html))==7
assert len(re.findall(r'class="vowel-dynamic-glyph"',html))==28
assert len(re.findall(r'<circle cx=',html))==11
(outdir/'index.html').write_text(html)
print(json.dumps({'version':'0.2.57','hulls':len(hulls),'hull_vertices':[len(x['polygon']) for x in hulls],'bytes':len(html),'mode':'Doulos SIL convex hull + 1.4 SVG-unit clearance; all 7 paths'}))
