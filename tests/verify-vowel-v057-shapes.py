#!/usr/bin/env python3
import json,re,math
from pathlib import Path
from shapely.geometry import Polygon,LineString
from shapely.ops import unary_union
data=json.loads(Path('audit-output/v057/geometry.json').read_text())
assert len(data)==4
for state in data:
  assert len(state['placed'])==28 and len(state['lines'])==7
  hulls=[Polygon(g['polygon']) for g in state['placed']]
  assert all(p.is_valid and p.area>0 for p in hulls)
  for rule in state['lines']:
    matches=list(re.finditer(r'M\s*([-\d.]+)\s+([-\d.]+)\s+L\s*([-\d.]+)\s+([-\d.]+)',rule['d']))
    assert matches,'missing all line segments: '+rule['id']
    for match in matches:
      coords=list(map(float,match.groups()))
      seg=LineString([(coords[0],coords[1]),(coords[2],coords[3])])
      assert seg.length>.001
      for i,poly in enumerate(hulls):
        # Consistent anti-aliasing safe margin; source clipping used 1.4 SVG units.
        overlap=seg.intersection(poly.buffer(1.20,join_style=1,resolution=12))
        assert overlap.length<0.003,(state['fontSize'],rule['id'],state['placed'][i]['char'],overlap.length,coords)
  # Vertical right boundary must no longer be artificially erased.
  right=next(x for x in state['lines'] if x['id']=='98')['d']
  coords=[list(map(float,m.groups())) for m in re.finditer(r'M\s*([-\d.]+)\s+([-\d.]+)\s+L\s*([-\d.]+)\s+([-\d.]+)',right)]
  length=sum(math.hypot(x1-x0,y1-y0) for x0,y0,x1,y1 in coords)
  assert length>195,('vertical boundary still lost',state['fontSize'],length,right)
  print('V057_SHAPE_PASS',json.dumps({'width':state['width'],'fontSize':state['fontSize'],'rule_count':7,'glyph_count':28,'right_vertical_length':round(length,3),'overlapping_outline_pairs':0}))
# Checks above apply to glyph hull shapes and all rule fragments; no screenshot/visual impression used as a substitute.
