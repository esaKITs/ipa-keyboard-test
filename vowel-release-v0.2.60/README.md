# IPA vowel diagram v0.2.60

Independent test path; all existing repository files are preserved.

The v0.2.57 renderer computed font outlines in alphabetic-baseline coordinates while CSS displayed the text with a central dominant baseline. This displaced the cutouts and left line fragments inside letters and unnecessary holes away from them.

The renderer now retains the same visible text positions, sets an explicit alphabetic baseline, waits for the actual font, and measures rendered silhouettes at 8x resolution. One geometric procedure protects each glyph's convex exterior, including counters and open interiors. Only a line that crosses a glyph's exterior can cause a cut. Euclidean rounded offsets avoid excessive acute-corner cuts. The gap derives from the median of 24 measured visible mask endpoints in the official Japanese IPA PDF, rather than an arbitrary constant.

Official reference: https://www.internationalphoneticassociation.org/IPAcharts/common_files/pdfs/pdfs_IPA_charts_T/IPA_Kiel_jpn.pdf (International Phonetic Association; CC BY-SA 4.0). Official chart and code font differ, so the seven base-rule coordinates and font-dependent cutouts are audited separately. The 28 glyph anchors, 11 dots, labels and other UI remain unchanged; ink-only before/after screenshots are identical in the tested environments.

## Reproduce

From repository root, install Playwright, Chromium/WebKit, Python Shapely and Pillow. Then run:

```
node vowel-release-v0.2.60/verify.cjs chromium
node vowel-release-v0.2.60/verify.cjs webkit
python vowel-release-v0.2.60/verify_geometry.py
python vowel-release-v0.2.60/verify_24.py
node vowel-release-v0.2.60/regression.cjs
```

`ARTIFACT_DIR` overrides `audit-output/v060`. Optional `CHROMIUM_EXECUTABLE_PATH` and `WEBKIT_EXECUTABLE_PATH` select installed browser binaries. No test claims an iPhone Safari hardware check. At 48px, letters that grow across the front diagonal require additional collision cuts; unrelated proximity does not create cuts.
