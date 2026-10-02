#!/usr/bin/env python3
"""MGS Phase-0 inventory extractor — reads the v2.0 file, emits machine-readable inventory JSON.
Read-only: never modifies the source."""
import re, json, collections, sys

F = "/home/user/AI-Banner-Prompt-Generator-Pro/AI Banner Prompt Generator Pro.html"
s = open(F, encoding="utf-8").read()
body = re.sub(r"<script>.*?</script>", "", s, flags=re.S)
body = re.sub(r"<style>.*?</style>", "", body, flags=re.S)
js = re.search(r"<script>(.*?)</script>", s, re.S).group(1)
css = re.search(r"<style>(.*?)</style>", s, re.S).group(1)
inv = {"source": F.split("/")[-1], "size_bytes": len(s.encode()), "lines": s.count("\n") + 1}

# ---- tabs ----
inv["tabs"] = [{"index": int(m.group(1)), "icon": m.group(2), "label_mr": m.group(3).strip(), "panel": "t" + m.group(1)}
               for m in re.finditer(r'<button class="tab-btn(?: active)?" onclick="sT\((\d)\)"><span class="ti">(.*?)</span>(.*?)</button>', body)]

# ---- fields: selects ----
def label_before(pos):
    seg = body[max(0, pos - 500):pos]
    labs = re.findall(r"<label>(.*?)</label>", seg, re.S)
    return re.sub(r"<[^>]+>", "", labs[-1]).strip() if labs else None

sels = []
for m in re.finditer(r'<select id="([a-zA-Z]+)"([^>]*)>(.*?)</select>', body, re.S):
    sid, attrs, inner = m.groups()
    opts = [{"value": v, "label": re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", l)).strip(),
             "selected": "selected" in l or "selected" in attrs}
            for v, l in re.findall(r'<option value="([^"]*)"[^>]*>(.*?)</option>', inner, re.S)]
    sels.append({"id": sid, "ui_label": label_before(m.start()),
                 "handler": (re.search(r'onchange="([^"]+)"', attrs) or [None, None])[1],
                 "option_count": len(opts), "options": opts})
inv["selects"] = sels
inv["select_count"] = len(sels)
inv["option_total"] = sum(x["option_count"] for x in sels)

# ---- fields: inputs / textareas ----
inv["inputs"] = [{"id": m.group(2), "type": m.group(1),
                  "placeholder": (re.search(r'placeholder="([^"]*)"', m.group(0)) or [None, ""])[1],
                  "value": (re.search(r'value="([^"]*)"', m.group(0)) or [None, ""])[1],
                  "ui_label": label_before(m.start())}
                 for m in re.finditer(r'<input type="(text|number)" id="([a-zA-Z]+)"[^>]*>', body)]
inv["textareas"] = [{"id": m.group(1), "rows": (re.search(r'rows="(\d)"', m.group(0)) or [None, "?"])[1],
                     "placeholder": (re.search(r'placeholder="([^"]*)"', m.group(0)) or [None, ""])[1],
                     "ui_label": label_before(m.start())}
                    for m in re.finditer(r'<textarea id="([a-zA-Z]+)"[^>]*>', body)]

# ---- toggle switches ----
tg_ids = re.findall(r'<div class="tg( on)?" id="(t[A-Z])"', body)
labels = re.findall(r'<span class="tl">(.*?)</span>', body)
inv["toggles"] = [{"id": tid, "default_on": bool(on), "label": labels[i] if i < len(labels) else None}
                  for i, (on, tid) in enumerate(tg_ids)]

# ---- ids by panel ----
by, cur = collections.defaultdict(list), "header"
for m in re.finditer(r'<div class="tab-content[^"]*" id="(t\d)">|\bid="([a-zA-Z0-9_]+)"', body):
    if m.group(1):
        cur = m.group(1)
        continue
    if m.group(2) and m.group(2) != cur:
        by[cur].append(m.group(2))
inv["ids_by_panel"] = dict(by)
inv["static_id_count"] = len(re.findall(r'\bid="([^"]+)"', body))
inv["runtime_dynamic_ids"] = ["o_<platformId> (rOut + lFH)", "v_0..v_3 (gVar)"]

# ---- JS data tables ----
def arr(name):
    m = re.search(r"var " + name + r"=\[(.*?)\n\];", js, re.S)
    return m.group(1) if m else ""
pal_blk, lay_blk, els_blk, pfs_blk = arr("PAL"), arr("LAY"), arr("ELS"), arr("PFS")
csg_src = re.search(r"var CSG=\{(.*?)\n\};", js, re.S).group(1)
inv["data_structures"] = {
    "PAL": {"count": len(re.findall(r'\{n:"', pal_blk)), "shape": "{n: label, c:[hex x4]}",
            "names": re.findall(r'\{n:"([^"]+)"', pal_blk),
            "colors": re.findall(r'c:\[([^\]]+)\]', pal_blk)},
    "LAY": {"count": len(re.findall(r'\{id:"', lay_blk)), "shape": "{id, n: label, h: inline HTML preview}",
            "ids": re.findall(r'\{id:"([^"]+)",n:"([^"]+)"', lay_blk)},
    "ELS": {"count": len(re.findall(r'\{id:"', els_blk)), "shape": "{id, l: emoji+label}",
            "ids": [{"id": i, "l": json.loads('"%s"' % l.replace('\\"', '"'))} for i, l in
                    re.findall(r'\{id:"([^"]+)",l:"((?:[^"\\]|\\.)*)"', els_blk)]},
    "PFS": {"count": len(re.findall(r'\{id:"', pfs_blk)), "shape": "{id, n: label, i: emoji}",
            "ids": [{"id": i, "n": n} for i, n in re.findall(r'\{id:"([^"]+)",n:"([^"]+)"', pfs_blk)]},
    "CSG": {"count": len(re.findall(r'^(\w+):\{', csg_src, re.M)),
            "shape": "{s: styleId, m: moodId, p: paletteName, e: [elementIds]}",
            "mapping": {k: {"style": a, "mood": b, "palette": c, "elements": d.split(",")}
                        for k, a, b, c, d in re.findall(r'(\w+):\{s:"([^"]*)",m:"([^"]*)",p:"([^"]*)",e:\[([^\]]*)\]', csg_src)}},
}
inv["data_structures"]["CSG"]["unmapped_categories"] = sorted(
    {o["value"] for sel in sels if sel["id"] == "cat" for o in sel["options"] if o["value"]}
    - set(inv["data_structures"]["CSG"]["mapping"]))

# ---- prompt-building lookup maps ----
inv["prompt_maps"] = {}
for name in ["TM", "SM", "MM", "YM", "BM"]:
    blk = re.search(r"var " + name + r"=(\{.*?\});", js, re.S).group(1)
    inv["prompt_maps"][name] = {"count": len(re.findall(r'"?\w+"?\s*:\s*"', blk)),
                                "keys": re.findall(r'([A-Za-z0-9_"]+)\s*:\s*"', blk)}
inv["prompt_maps"]["V_variants"] = re.findall(r'\{n:"([^"]+)",m:"([^"]+)"', js)
inv["hardcoded_strings"] = {
    "negative_prompt_terms": len(re.search(r'var neg="([^"]+)"', js).group(1).split(",")),
    "midjourney_flags": re.findall(r'--\w+[^"]*', re.search(r'return m;.*', js, re.S).group(0))[:1] or re.search(r'--ar "\+ar\+"\s*--v\s*([^"]*)', js).groups(),
    "print_specs_clause": re.search(r'PRINT SPECS: ([^"\\]+)', js).group(1),
    "design_rules_lines": len(re.findall(r'p\+="- ', js)),
}

# ---- functions ----
inv["functions"] = [{"name": n, "args": a, "line": js[:js.index("function %s(" % n)].count("\n") + 500}
                    for n, a in re.findall(r"^function\s+([A-Za-z0-9_$]+)\s*\(([^)]*)\)", js, re.M)]
inv["global_state_vars"] = {"sPal": "string palette name", "sLay": "string layout id",
                            "sPlat": "array of platform ids", "gPr": "object {platformId: promptString}"}

# ---- storage ----
inv["storage"] = {"driver": "localStorage", "key": "bph", "entry_schema": ["id", "cat", "head", "bt", "date", "pr"],
                  "cap": 20, "sessionStorage_used": 0, "indexedDB": 0, "writes_unguarded": len(re.findall(r"localStorage\.setItem", js)),
                  "reads_guarded": len(re.findall(r"try\{hist=JSON\.parse", js))}

# ---- CSS / responsive ----
inv["css"] = {"lines": css.count("\n"), "selectors": len([1 for x in re.findall(r"\}", css)]),
              "custom_properties": re.findall(r"--([\w-]+):", css)[:40],
              "media_queries": re.findall(r"@media[^{]+", css),
              "keyframes": re.findall(r"@keyframes\s+(\w+)", css),
              "classes_defined": sorted(set(re.findall(r"\.([a-zA-Z][a-zA-Z0-9]*)", css))),
              "grid_minmax_count": len(re.findall(r"repeat\(auto-(?:fit|fill),minmax\((\d+)px,1fr\)\)", css)) or len(re.findall(r"minmax\(", css)),
              "inline_style_attrs_in_markup": len(re.findall(r'style="', body)),
              "data_uri_assets": len(re.findall(r"data:image", s))}
inv["external_dependencies"] = {"scripts": re.findall(r"<script[^>]*src=", s), "links": re.findall(r"<link[^>]*>", s),
                                "fonts": re.findall(r"@font-face", s), "cdn": re.findall(r"https?://[^\"' )]+", s),
                                "font_stack": re.search(r"body\{font-family:([^;]+);", s).group(1)}
inv["event_handlers"] = {"inline_static": collections.Counter(re.findall(r'\bon[a-z]+="([^"]+)"', body)),
                         "inline_generated": collections.Counter(re.findall(r'\bon[a-z]+=\\?"([a-zA-Z]+)\(', js)),
                         "addEventListener": len(re.findall(r"addEventListener", s))}
inv["security"] = {"innerHTML_sites": len(re.findall(r"\.innerHTML=", js)), "textContent_sites": len(re.findall(r"\.textContent", js)),
                   "esc_defined": bool(re.search(r"function esc", js)), "esc_replacements": re.findall(r"replace\((/[^/]+/g),'([^']*)'\)", js),
                   "eval": len(re.findall(r"\beval\(", js))}
json.dump(inv, open("/home/user/.mgs-harness/inventory.json", "w"), ensure_ascii=False, indent=1, default=str)
print("tabs", len(inv["tabs"]), "| selects", inv["select_count"], "| options", inv["option_total"],
      "| inputs", len(inv["inputs"]), "| textareas", len(inv["textareas"]), "| toggles", len(inv["toggles"]))
print("unmapped categories:", inv["data_structures"]["CSG"]["unmapped_categories"])
print("map sizes:", {k: v["count"] for k, v in inv["prompt_maps"].items() if isinstance(v, dict) and "count" in v})
print("neg terms:", inv["hardcoded_strings"]["negative_prompt_terms"])
print("media:", inv["css"]["media_queries"], "| fonts:", inv["external_dependencies"]["font_stack"])
print("handlers:", dict(inv["event_handlers"]["inline_static"]))
print("OK -> inventory.json", len(json.dumps(inv, default=str)), "bytes")
