# -*- coding: utf-8 -*-
"""Рендерить схематичні карти України у SVG.

Геометрія — Natural Earth (суспільне надбання), сама карта й усе оформлення
наші. Крим показано як частину України: у типових даних Natural Earth його
віднесено до Росії, тож полігони об'єднуються вручну.

Проєкція проста: рівнопроміжна з поправкою на косинус середньої широти, щоб
країна не виглядала розтягнутою. Для схематичної карти цього досить.
"""
import json, math, pathlib
from xml.sax.saxutils import escape
from shapely.geometry import shape
from shapely.ops import unary_union

GEO = pathlib.Path(__file__).resolve().parent

WIDTH = 1000
MARGIN = 18
MID_LAT = 48.5
KX = math.cos(math.radians(MID_LAT))

# Кольори тримаємо в межах палітри застосунку: темна поверхня, бузковий акцент.
INK = '#0f0f13'
LAND = '#1c1c22'
UA_LAND = '#2b2b35'
LINE = '#4b4b57'
UA_LINE = '#8f8fa3'
ACCENT = '#8b5cf6'
TEXT = '#e6e6ee'
MUTED = '#9a9aab'
SHADES = ['#8b5cf6', '#3f9d76', '#c4894a', '#5b8ac4']


def _load():
    countries = json.load(open(GEO / 'ne50.geojson'))
    disputed = json.load(open(GEO / 'disputed.geojson'))
    admin1 = json.load(open(GEO / 'admin1.geojson'))
    by_name = {f['properties']['NAME']: f for f in countries['features']}
    crimea = next(f for f in disputed['features']
                  if f['properties'].get('NAME') == 'Crimea')
    ukraine = unary_union([shape(by_name['Ukraine']['geometry']),
                           shape(crimea['geometry'])]).buffer(0.002).buffer(-0.002)
    neighbours = []
    for name in ['Poland', 'Belarus', 'Russia', 'Moldova', 'Romania',
                 'Hungary', 'Slovakia', 'Bulgaria', 'Turkey']:
        geom = shape(by_name[name]['geometry'])
        if name == 'Russia':
            geom = geom.difference(shape(crimea['geometry']))
        neighbours.append(geom)
    oblasts = {}
    for f in admin1['features']:
        p = f['properties']
        if p.get('admin') == 'Ukraine' or p.get('name') in ('Crimea', 'Sevastopol'):
            oblasts[p['name']] = shape(f['geometry'])
    return ukraine, neighbours, oblasts


UKRAINE, NEIGHBOURS, OBLASTS = _load()
BOUNDS = UKRAINE.bounds
SCALE = (WIDTH - 2 * MARGIN) / ((BOUNDS[2] - BOUNDS[0]) * KX)
HEIGHT = round((BOUNDS[3] - BOUNDS[1]) * SCALE + 2 * MARGIN)


def project(lon, lat):
    x = MARGIN + (lon - BOUNDS[0]) * KX * SCALE
    y = MARGIN + (BOUNDS[3] - lat) * SCALE
    return round(x, 1), round(y, 1)


# Схематична карта не потребує берегової лінії з точністю до кілометра, а без
# спрощення один файл важить понад сто кілобайт. Допуск підібрано так, щоб
# обриси лишалися впізнаваними на екрані заввишки кількасот пікселів.
SIMPLIFY = 0.02


def path_of(geom):
    geom = geom.simplify(SIMPLIFY, preserve_topology=True)
    parts = []
    polys = getattr(geom, 'geoms', [geom])
    for poly in polys:
        if poly.is_empty or not hasattr(poly, 'exterior'):
            continue
        for ring in [poly.exterior] + list(poly.interiors):
            points = [project(x, y) for x, y in ring.coords]
            if len(points) < 3:
                continue
            parts.append('M' + ' L'.join(f'{x},{y}' for x, y in points) + 'Z')
    return ' '.join(parts)


def oblast_union(names):
    """Об'єднує області; елемент виду (назва, bbox) бере лише частину області.

    Історичні межі рідко збігаються з сучасними обласними. Здебільшого
    наближення прийнятне, але подекуди — як із Бессарабією, що становить
    південь Одеської області, — потрібен відтин по прямокутнику.
    """
    pieces = []
    for entry in names:
        if isinstance(entry, tuple):
            name, box = entry
            piece = OBLASTS[name].intersection(
                shape({'type': 'Polygon', 'coordinates': [[
                    (box[0], box[1]), (box[2], box[1]),
                    (box[2], box[3]), (box[0], box[3]), (box[0], box[1])]]}))
        else:
            name, piece = entry, OBLASTS[entry]
        if name not in OBLASTS:
            raise KeyError(f'немає області: {name}')
        pieces.append(piece)
    return unary_union(pieces).intersection(UKRAINE)


def render(title, markers=(), regions=(), labels=(), caption=None):
    """markers: (підпис, довгота, широта); regions: (назва, [області]); labels: (текст, lon, lat)."""
    out = [
        # width/height, а не лише viewBox: без них браузер не знає власних
        # розмірів картинки, і <img> з класом на всю ширину згортається у
        # нульову висоту.
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{WIDTH}" height="{HEIGHT}" '
        f'viewBox="0 0 {WIDTH} {HEIGHT}" role="img" aria-label="{title}" '
        f'font-family="ui-sans-serif, system-ui, sans-serif">',
        f'<rect width="{WIDTH}" height="{HEIGHT}" fill="{INK}"/>',
    ]
    for geom in NEIGHBOURS:
        clipped = geom.intersection(
            shape({'type': 'Polygon', 'coordinates': [[
                (BOUNDS[0] - 3, BOUNDS[1] - 3), (BOUNDS[2] + 3, BOUNDS[1] - 3),
                (BOUNDS[2] + 3, BOUNDS[3] + 3), (BOUNDS[0] - 3, BOUNDS[3] + 3),
                (BOUNDS[0] - 3, BOUNDS[1] - 3)]]}))
        if not clipped.is_empty:
            out.append(f'<path d="{path_of(clipped)}" fill="{LAND}" stroke="{LINE}" stroke-width="1"/>')

    out.append(f'<path d="{path_of(UKRAINE)}" fill="{UA_LAND}" stroke="{UA_LINE}" stroke-width="2"/>')

    for i, (name, names) in enumerate(regions):
        colour = SHADES[i % len(SHADES)]
        out.append(f'<path d="{path_of(oblast_union(names))}" fill="{colour}" '
                   f'fill-opacity="0.42" stroke="{colour}" stroke-width="1.5"/>')

    for i, (name, lon, lat) in enumerate(markers, start=1):
        x, y = project(lon, lat)
        out.append(f'<circle cx="{x}" cy="{y}" r="17" fill="{ACCENT}" stroke="{INK}" stroke-width="2"/>')
        out.append(f'<text x="{x}" y="{y + 7}" text-anchor="middle" font-size="21" '
                   f'font-weight="600" fill="#ffffff">{i}</text>')

    for text, lon, lat in labels:
        x, y = project(lon, lat)
        out.append(f'<text x="{x}" y="{y}" text-anchor="middle" font-size="19" fill="{MUTED}">{escape(text)}</text>')

    if regions:
        legend_y = HEIGHT - 18 - 26 * len(regions)
        for i, (name, _) in enumerate(regions):
            colour = SHADES[i % len(SHADES)]
            y = legend_y + 26 * i
            out.append(f'<rect x="{MARGIN}" y="{y}" width="20" height="14" fill="{colour}" fill-opacity="0.6" stroke="{colour}"/>')
            out.append(f'<text x="{MARGIN + 28}" y="{y + 12}" font-size="19" fill="{TEXT}">{escape(name)}</text>')

    if caption:
        out.append(f'<text x="{WIDTH - MARGIN}" y="{HEIGHT - 12}" text-anchor="end" '
                   f'font-size="15" fill="{MUTED}">{escape(caption)}</text>')

    out.append('</svg>')
    return '\n'.join(out)
