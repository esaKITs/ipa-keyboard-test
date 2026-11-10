import json,math,re
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.pens.basePen import BasePen
from shapely.geometry import Polygon,LineString,GeometryCollection,MultiLineString
from shapely.ops import unary_union
from shapely.affinity import affine_transform
from shapely.validation import make_valid
class FlattenPen(BasePen):
 def __init__(self,gs):
  super().__init__(gs);self.contours=[];self.points=[]
 def _moveTo(self,p):
  if self.points:self._closePath()
  self.points=[tuple(p)]
 def _lineTo(self,p):
  self.points.append(tuple(p))
 def _qCurveToOne(self,p1,p2):
  p0=self.points[-1]
  for i in range(1,65):
   t=i/64.;mt=1-t
   self.points.append((mt*mt*p0[0]+2*mt*t*p1[0]+t*t*p2[0],mt*mt*p0[1]+2*mt*t*p1[1]+t*t*p2[1]))
 def _curveToOne(self,p1,p2,p3):
  p0=self.points[-1]
  for i in range(1,65):
   t=i/64.;mt=1-t
   self.points.append((mt**3*p0[0]+3*mt*mt*t*p1[0]+3*mt*t*t*p2[0]+t**3*p3[0],mt**3*p0[1]+3*mt*mt*t*p1[1]+3*mt*t*t*p2[1]+t**3*p3[1]))
 def _closePath(self):
  if len(self.points)>2:self.contours.append(self.points)
  self.points=[]
 def _endPath(self):self._closePath()
font=TTFont('fonts/DoulosSIL-Regular.woff2')
cmap=font.getBestCmap();gs=font.getGlyphSet();upm=font['head'].unitsPerEm
def ink(c):
 name=cmap[ord(c)]; pen=FlattenPen(gs);gs[name].draw(pen);pieces=[]
 # even-odd contour filling; yields holes as appropriate
 for contour in pen.contours:
  poly=Polygon(contour)
  if not poly.is_valid:poly=make_valid(poly)
  if not poly.is_empty:pieces.append(poly)
 if not pieces:return None
 result=pieces[0]
 for p in pieces[1:]:result=result.symmetric_difference(p)
 return result
def segments(d):
 pts=[tuple(map(float,m)) for m in re.findall(r'[ML]\s*([-\d.]+)\s+([-\d.]+)',d)]
 assert len(pts)%2==0
 return list(zip(pts[::2],pts[1::2]))
def lines_of(geometry):
 if geometry.is_empty:return []
 if geometry.geom_type=='LineString':return [geometry] if geometry.length>1e-5 else []
 if hasattr(geometry,'geoms'):
  return [s for g in geometry.geoms for s in lines_of(g)]
 return []
for size in (32,48):
 data=json.loads(Path(f'audit-output/ink-intersections/browser-{size}.json').read_text())
 assert len(data['glyphs'])==28 and len(data['lines'])==7
 rules={o['id']:segments(o['d']) for o in data['lines']}
 assert len(rules)==7
 report=[]
 for glyph in data['glyphs']:
  c=glyph['char'];advance=font['hmtx'].metrics[cmap[ord(c)]][0]
  scale=size/upm
  # SVG text-anchor middle moves glyph advance's center to (x,y).
  offset_x=glyph['x']+glyph['dx']-advance*scale/2
  baseline=glyph['y']+glyph['dy']
  shape=affine_transform(ink(c),[scale,0,0,-scale,offset_x,baseline])
  bounds=[round(z,4) for z in shape.bounds]
  overlaps=[]
  for id,parts in rules.items():
   cut=[]
   for p0,p1 in parts:
    centerline=LineString([p0,p1])
    pieces=lines_of(centerline.intersection(shape))
    for chunk in pieces:
     coords=list(chunk.coords)
     # endpoints ordered along p0->p1
     direction=((p1[0]-p0[0]),(p1[1]-p0[1]))
     def t(p):return ((p[0]-p0[0])*direction[0]+(p[1]-p0[1])*direction[1])/(direction[0]**2+direction[1]**2)
     first,last=coords[0],coords[-1]
     if t(first)>t(last):first,last=last,first
     cut.append({'from':[round(first[0],4),round(first[1],4)],'to':[round(last[0],4),round(last[1],4)],'length':round(chunk.length,4),'t':[round(t(first),7),round(t(last),7)]})
   if cut:overlaps.append({'line':id,'ink_intervals':cut})
  report.append({'char':c,'index':glyph['index'],'glyphBBox':[round(n,4) for n in [glyph['bbox']['x'],glyph['bbox']['y'],glyph['bbox']['w'],glyph['bbox']['h']]],'outlineBBox':bounds,'hits':overlaps})
 result={'font':'Doulos SIL regular actual WOFF2 contours','size':size,'unitsPerEm':upm,'lineCount':len(rules),'glyphCount':len(report),'intersectionGlyphs':sum(bool(x['hits']) for x in report),'records':report}
 Path(f'audit-output/ink-intersections/contours-{size}.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
 print('ALL_CONTOUR_INTERSECTIONS '+json.dumps(result,ensure_ascii=False,separators=(',',':')))
