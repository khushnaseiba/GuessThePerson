from pathlib import Path

root = Path(__file__).resolve().parent.parent / "assets" / "portraits"
root.mkdir(parents=True, exist_ok=True)
people = [
    ("Ava", 657), ("Benji", 22), ("Cleo", 425), ("Diego", 74), ("Eden", 676),
    ("Felix", 275), ("Gia", 920), ("Hugo", 30), ("Iris", 801), ("Juno", 452),
    ("Kai", 539), ("Lena", 704), ("Milo", 918), ("Nia", 141), ("Omar", 802),
    ("Poppy", 969), ("Quinn", 284), ("Ravi", 194), ("Skye", 785), ("Theo", 262),
]
skins = ["#e4b18e", "#986349", "#c98562", "#edc9a2", "#704b3c", "#d99b71", "#b77858", "#f0c9a5", "#ab7555", "#dca884"]
shirts = ["#7d94b8", "#d67f66", "#7f9b7b", "#c29bce", "#d3a84d", "#5c9ca0", "#d38caa", "#b97954", "#7b81bc", "#90a4b4"]
backs = ["#d9d3f3", "#f3d4c2", "#d0e5d3", "#f1e0a9", "#d5deef", "#e8cde3", "#cbe2e5", "#f2d6b9", "#dcd6c9", "#cfd8ed"]

def has(mask, bit):
    return bool(mask & (1 << bit))

def make_svg(index, name, mask):
    skin = skins[(index * 3 + 1) % len(skins)]
    hair = "#e1bd62" if has(mask, 5) else "#ad523c" if has(mask, 6) else "#4d342b" if has(mask, 4) else "#292734"
    shirt = shirts[index % len(shirts)]
    back = backs[(index * 3) % len(backs)]
    eye = "#29252a"
    long_hair = has(mask, 7)
    curly = has(mask, 3)
    facial = has(mask, 1)
    glasses = has(mask, 0)
    hat = has(mask, 2)
    freckles = has(mask, 8)
    earrings = has(mask, 9)
    rear = f'<path d="M30 63 Q25 25 44 16 Q63 3 81 21 Q95 36 89 67 L{88 if long_hair else 83} {112 if long_hair else 80} L31 {109 if long_hair else 80} Z" fill="{hair}"/>'
    if curly:
        curls = "".join(f'<circle cx="{x}" cy="{y}" r="8" fill="{hair}"/>' for x, y in [(35, 33), (45, 23), (58, 18), (72, 22), (83, 31), (30, 44), (88, 44)])
        rear += curls
    face = f'<path d="M36 46 Q36 23 60 22 Q84 24 84 48 L80 74 Q74 91 60 93 Q46 91 40 74 Z" fill="{skin}"/>'
    bangs = f'<path d="M33 50 Q30 20 53 16 Q75 12 87 34 L84 47 Q75 34 67 31 Q50 42 36 38 Z" fill="{hair}"/>'
    if hat:
        bangs = f'<path d="M33 38 Q36 20 60 18 Q83 20 87 38 Z" fill="{hair}"/><path d="M26 38 Q60 30 94 38 L90 46 Q60 41 30 46 Z" fill="#786e91" stroke="#393344" stroke-width="2"/><path d="M42 19 Q60 3 78 19 Z" fill="#786e91"/>'
    if long_hair:
        rear = f'<path d="M28 55 Q23 18 46 12 Q69 2 86 22 Q98 44 90 90 L87 118 L32 118 L28 87 Z" fill="{hair}"/>' + (f'<g>{"".join(f"<circle cx=\"{x}\" cy=\"{y}\" r=\"8\" fill=\"{hair}\"/>" for x,y in [(35,30),(46,18),(61,14),(76,20),(87,31)])}</g>' if curly else "")
    eyes = f'<ellipse cx="49" cy="57" rx="3" ry="4" fill="{eye}"/><ellipse cx="71" cy="57" rx="3" ry="4" fill="{eye}"/><path d="M60 60 L57 69 L62 70" fill="none" stroke="#a86c55" stroke-width="2" stroke-linecap="round"/><path d="M52 78 Q60 84 69 77" fill="none" stroke="#873f48" stroke-width="2.5" stroke-linecap="round"/>'
    glasses_layer = '<g fill="none" stroke="#282b35" stroke-width="3"><rect x="39" y="49" width="20" height="15" rx="5"/><rect x="62" y="49" width="20" height="15" rx="5"/><path d="M59 55 L62 55 M39 54 L34 52 M82 54 L87 52"/></g>' if glasses else ""
    beard_layer = f'<path d="M40 72 Q45 85 60 89 Q75 85 80 72 L76 84 Q68 96 60 96 Q49 94 44 84 Z" fill="{hair}"/>' if facial else ""
    freckle_layer = ''.join(f'<circle cx="{x}" cy="{y}" r="1.5" fill="#a35d4b"/>' for x, y in [(46, 70), (51, 73), (44, 76), (72, 70), (77, 73), (74, 77)]) if freckles else ""
    earring_layer = '<circle cx="36" cy="78" r="3" fill="#f5cb72" stroke="#8e693b" stroke-width="1"/><circle cx="84" cy="78" r="3" fill="#f5cb72" stroke="#8e693b" stroke-width="1"/>' if earrings else ""
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 144" role="img" aria-label="Illustrated portrait of {name}"><rect width="120" height="144" rx="15" fill="{back}"/><circle cx="92" cy="22" r="11" fill="#ffffff" opacity=".24"/><path d="M12 144 Q14 109 37 106 L83 106 Q106 109 108 144 Z" fill="{shirt}"/><path d="M47 103 L44 116 Q60 129 76 116 L73 103" fill="{skin}"/><path d="M33 54 Q23 58 33 76 L39 79" fill="{skin}"/><path d="M87 54 Q97 58 87 76 L81 79" fill="{skin}"/>{rear}{face}{bangs}{eyes}{glasses_layer}{freckle_layer}{beard_layer}{earring_layer}<path d="M50 44 Q55 41 59 44 M65 44 Q70 41 74 44" fill="none" stroke="{hair}" stroke-width="2.5" stroke-linecap="round"/><path d="M15 144 Q20 120 36 116 L45 144 M105 144 Q100 120 84 116 L75 144" fill="{shirt}" opacity=".65"/></svg>'''

for index, (name, mask) in enumerate(people):
    (root / f"person-{index:02}.svg").write_text(make_svg(index, name, mask), encoding="utf-8")
