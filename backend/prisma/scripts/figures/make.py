# -*- coding: utf-8 -*-
"""Збирає рисунки до завдань з математики в frontend/public/content/mathematics/figures.

Усе намальовано кодом: жодних запозичених зображень, тож і питань прав немає.
Числа на рисунках — ті самі, на які спираються ключі завдань; змінюючи рисунок,
треба звірити відповідне завдання.
"""
import math, pathlib, sys, xml.dom.minidom
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from svg import Figure, LINE, MUTED, GRID, ACCENT, FILL, SANS

OUT = (pathlib.Path(__file__).resolve().parents[4]
       / 'frontend' / 'public' / 'content' / 'mathematics' / 'figures')
OUT.mkdir(parents=True, exist_ok=True)


def fig(width, xmin, xmax, ymin, ymax, title, pad=28):
    """Полотно з однаковим масштабом по осях — інакше коло стане еліпсом."""
    height = round((ymax - ymin) / (xmax - xmin) * (width - 2 * pad) + 2 * pad)
    return Figure(width, height, xmin, xmax, ymin, ymax, pad, title)


def dashed(f, points, color=LINE, width=2):
    pts = ' '.join(f'{f.X(x)},{f.Y(y)}' for x, y in points)
    f.items.append(f'<polyline points="{pts}" fill="none" stroke="{color}" stroke-width="{width}" stroke-dasharray="7 6"/>')


def arrow(f, x1, y1, x2, y2, color=ACCENT, width=3):
    f.line(x1, y1, x2, y2, color, width)
    sx, sy, ex, ey = f.X(x1), f.Y(y1), f.X(x2), f.Y(y2)
    a = math.atan2(ey - sy, ex - sx)
    p1 = (ex - 14 * math.cos(a - 0.4), ey - 14 * math.sin(a - 0.4))
    p2 = (ex - 14 * math.cos(a + 0.4), ey - 14 * math.sin(a + 0.4))
    f.items.append(f'<polygon points="{ex},{ey} {p1[0]:.1f},{p1[1]:.1f} {p2[0]:.1f},{p2[1]:.1f}" fill="{color}"/>')


def grid(f, step=1):
    x = math.ceil(f.xmin)
    while x <= f.xmax:
        f.line(x, f.ymin, x, f.ymax, GRID, 1)
        x += step
    y = math.ceil(f.ymin)
    while y <= f.ymax:
        f.line(f.xmin, y, f.xmax, y, GRID, 1)
        y += step


figures = {}

# 1. Стовпчикова діаграма: продані квитки за днями (45, 30, 55, 40, 70)
f = Figure(560, 380, -0.8, 5.6, -9, 82, 40, 'Діаграма кількості проданих квитків за днями')
for v in range(0, 81, 5):
    f.line(-0.2, v, 5.4, v, GRID if v % 10 else '#3b3b47', 1)
    if v % 10 == 0:
        f.text(-0.3, v, v, 16, MUTED, 'end', dy=6, sans=True)
for i, (day, value) in enumerate([('Пн', 45), ('Вт', 30), ('Ср', 55), ('Чт', 40), ('Пт', 70)]):
    f.polygon([(i + 0.2, 0), (i + 0.8, 0), (i + 0.8, value), (i + 0.2, value)], ACCENT, 1.5, FILL, 0.55)
    f.text(i + 0.5, 0, day, 18, LINE, dy=26, sans=True)
f.line(-0.2, 0, 5.4, 0, MUTED, 1.5)
figures['stat-tickets-bar'] = f

# 2. Лінійна діаграма температури за тиждень (12, 15, 9, 14, 18, 16, 11)
temps = [12, 15, 9, 14, 18, 16, 11]
f = Figure(560, 360, -0.9, 7.2, -3, 22, 40, 'Графік температури повітря за тиждень')
for v in range(0, 21, 5):
    f.line(-0.2, v, 6.8, v, '#3b3b47', 1)
    f.text(-0.3, v, v, 16, MUTED, 'end', dy=6, sans=True)
pts = [(i + 0.3, t) for i, t in enumerate(temps)]
f.polyline(pts, ACCENT, 3)
for (x, y), day in zip(pts, ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд']):
    f.dot(x, y, 5, ACCENT)
    f.text(x, y, y, 16, LINE, dy=-12, sans=True)
    f.text(x, 0, day, 17, LINE, dy=24, sans=True)
figures['stat-temperature-line'] = f

# 3. Драбина біля стіни: кут між стіною і драбиною 24°
f = fig(420, -1.2, 3.6, -0.9, 5.8, 'Драбина BC, приставлена до стіни AB')
f.line(0, 0, 0, 5.2, MUTED, 7)
f.line(-0.8, 0, 3.3, 0, MUTED, 3)
f.line(0, 5, 2.2, 0, ACCENT, 4)
f.right_angle(0, 0, 0, 1, 1, 0, 16)
f.arc_mark(0, 5, 0, 0, 2.2, 0, 40)
f.text(0.1, 3.25, '24°', 20, ACCENT, 'start', sans=True)
f.text(0, 5, 'B', 22, LINE, 'end', True, dx=-12, dy=4)
f.text(0, 0, 'A', 22, LINE, 'end', True, dx=-12, dy=22)
f.text(2.2, 0, 'C', 22, LINE, 'start', True, dx=6, dy=24)
figures['trig-ladder'] = f

# 4. Трикутник ABC з медіаною CM
f = fig(460, -0.8, 6.8, -0.9, 4.8, 'Трикутник ABC з медіаною CM')
f.polygon([(0, 0), (6, 0), (2, 4)])
dashed(f, [(2, 4), (3, 0)], ACCENT, 2.5)
for cx in (1.5, 4.5):
    f.line(cx - 0.08, -0.18, cx + 0.08, 0.18, LINE, 2)
f.text(0, 0, 'A', 22, LINE, 'end', True, dx=-6, dy=22)
f.text(6, 0, 'B', 22, LINE, 'start', True, dx=6, dy=22)
f.text(2, 4, 'C', 22, LINE, 'middle', True, dy=-10)
f.text(3, 0, 'M', 22, ACCENT, 'middle', True, dy=26)
figures['plan-median'] = f

# 5. Вписаний кут ACB = 40° і менша дуга AB
f = fig(420, -3.9, 3.9, -3.9, 3.9, 'Коло з точками A, B, C і вписаним кутом ACB')
f.circle(0, 0, 3)
ang = lambda d: (3 * math.cos(math.radians(d)), 3 * math.sin(math.radians(d)))
A, B, C = ang(-130), ang(-50), ang(90)
f.polyline([ang(d) for d in range(-130, -49, 2)], ACCENT, 5)
f.line(*C, *A)
f.line(*C, *B)
f.arc_mark(*C, *A, *B, 42)
f.text(C[0], C[1], '40°', 18, ACCENT, 'middle', dy=64, sans=True)
f.text(*A, 'A', 22, LINE, 'end', True, dx=-8, dy=18)
f.text(*B, 'B', 22, LINE, 'start', True, dx=8, dy=18)
f.text(*C, 'C', 22, LINE, 'middle', True, dy=-12)
figures['plan-inscribed-angle'] = f

# 6. Прямокутна трапеція ABCD: BC = 4, AD = 12, AB = 6
f = fig(560, -1.6, 13.4, -1.6, 7.4, 'Прямокутна трапеція ABCD')
f.polygon([(0, 0), (12, 0), (4, 6), (0, 6)])
f.right_angle(0, 0, 0, 1, 1, 0, 16)
f.right_angle(0, 6, 0, 5, 1, 6, 16)
f.text(0, 0, 'A', 22, LINE, 'end', True, dx=-8, dy=20)
f.text(12, 0, 'D', 22, LINE, 'start', True, dx=8, dy=20)
f.text(4, 6, 'C', 22, LINE, 'start', True, dx=6, dy=-6)
f.text(0, 6, 'B', 22, LINE, 'end', True, dx=-8, dy=-6)
f.text(2, 6, '4', 20, ACCENT, dy=-12, sans=True)
f.text(6, 0, '12', 20, ACCENT, dy=26, sans=True)
f.text(0, 3, '6', 20, ACCENT, 'end', dx=-12, dy=6, sans=True)
figures['plan-right-trapezoid'] = f

# 7. Площа між y = x², y = 4 і x = 0
f = fig(420, -0.9, 3.2, -0.9, 5.2, 'Фігура, обмежена графіками y = x², y = 4 і прямою x = 0')
region = [(x / 20, (x / 20) ** 2) for x in range(0, 41)] + [(0, 4)]
f.polygon(region, 'none', 0, FILL, 0.35)
f.axes(xticks=[1, 2], yticks=[1, 2, 3, 4])
f.plot(lambda x: x * x, -0.2, 2.25)
f.line(-0.6, 4, 3.0, 4, LINE, 2)
f.text(2.0, 2.6, 'y = x²', 18, ACCENT, 'start', True, dx=6)
f.text(3.0, 4, 'y = 4', 18, LINE, 'end', True, dy=-10)
figures['integral-area'] = f

# 8–12. Ескізи парабол для варіантів відповіді
quad = {
    'quad-sketch-1': lambda x: -0.5 * x * x - 1,     # лише від'ємні значення
    'quad-sketch-2': lambda x: -0.5 * x * x + 1.5,   # гілки вниз, перетинає вісь
    'quad-sketch-3': lambda x: 0.5 * x * x + 1,      # лише додатні значення
    'quad-sketch-4': lambda x: 0.5 * x * x - 1.5,    # гілки вгору, перетинає вісь
    'quad-sketch-5': lambda x: -0.5 * x * x,         # дотикається до осі
}
for name, fn in quad.items():
    f = fig(240, -3, 3, -3, 3, 'Ескіз графіка квадратичної функції', 16)
    f.axes(labels=False)
    f.plot(fn, -3, 3)
    figures[name] = f

# 13–17. Ескізи прямих y = kx + b
lines = {
    'line-sketch-1': lambda x: -x + 1.5,   # k < 0, b > 0
    'line-sketch-2': lambda x: x + 1.5,    # k > 0, b > 0
    'line-sketch-3': lambda x: -x - 1.5,   # k < 0, b < 0
    'line-sketch-4': lambda x: x - 1.5,    # k > 0, b < 0
    'line-sketch-5': lambda x: 1.5,        # k = 0, b > 0
}
for name, fn in lines.items():
    f = fig(240, -3, 3, -3, 3, 'Ескіз графіка лінійної функції', 16)
    f.axes(labels=False)
    f.plot(fn, -3, 3)
    figures[name] = f

# 18. Графік y = log₂ x
f = fig(460, -1.2, 6.4, -3.2, 3.2, 'Графік функції')
grid(f)
f.axes(xticks=[1, 2, 4], yticks=[-2, -1, 1, 2])
f.plot(lambda x: math.log2(x) if x > 0 else None, 0.12, 6.2)
for x in (1, 2, 4):
    f.dot(x, math.log2(x), 5, ACCENT)
figures['fn-log2'] = f

# 19. Графік y = sin x
f = fig(560, -7.2, 7.2, -1.9, 1.9, 'Графік функції')
f.axes(labels=True)
for k, label in [(-2, '−2π'), (-1, '−π'), (1, 'π'), (2, '2π')]:
    x = k * math.pi
    f.line(x, -0.08, x, 0.08, MUTED, 1.5)
    f.text(x, 0, label, 16, MUTED, dy=24, sans=True)
for v, label in [(1, '1'), (-1, '−1')]:
    f.line(-0.12, v, 0.12, v, MUTED, 1.5)
    f.text(0, v, label, 16, MUTED, 'end', dx=-8, dy=6, sans=True)
f.plot(math.sin, -7, 7)
figures['fn-sin'] = f

# 20. Графік y = |x − 1|
f = fig(460, -3.2, 5.2, -1.2, 5.2, 'Графік функції')
grid(f)
f.axes(xticks=[-2, -1, 1, 2, 3, 4], yticks=[1, 2, 3, 4])
f.plot(lambda x: abs(x - 1), -3, 5)
f.dot(1, 0, 5, ACCENT)
figures['fn-abs'] = f

# 21. Конус з висотою 4 і радіусом 3
f = fig(400, -4, 4, -1.6, 5, 'Конус з висотою h і радіусом основи r')
ell = lambda t: (3 * math.cos(t), 0.8 * math.sin(t))
f.polyline([ell(math.pi + math.pi * i / 60) for i in range(61)], LINE, 2)
dashed(f, [ell(math.pi * i / 60) for i in range(61)], MUTED, 1.5)
f.line(-3, 0, 0, 4)
f.line(3, 0, 0, 4)
dashed(f, [(0, 4), (0, 0)], ACCENT, 2.5)
dashed(f, [(0, 0), (3, 0)], ACCENT, 2.5)
f.right_angle(0, 0, 0, 1, 1, 0, 12, MUTED)
f.text(0, 2, 'h = 4', 20, ACCENT, 'start', True, dx=10)
f.text(1.5, 0, 'r = 3', 20, ACCENT, 'middle', True, dy=-10)
figures['stereo-cone'] = f

# 22. Куб з ребром 2 і діагоналлю
f = fig(400, -0.8, 3.6, -0.8, 3.4, 'Куб з ребром a і його діагональ')
o = (0.9, 0.7)
front = [(0, 0), (2, 0), (2, 2), (0, 2)]
back = [(x + o[0], y + o[1]) for x, y in front]
f.polygon(front)
f.line(2, 0, back[1][0], back[1][1]); f.line(2, 2, back[2][0], back[2][1]); f.line(0, 2, back[3][0], back[3][1])
f.line(*back[1], *back[2]); f.line(*back[2], *back[3])
dashed(f, [back[3], back[0], back[1]], MUTED, 1.5)
dashed(f, [(0, 0), back[0]], MUTED, 1.5)
f.line(0, 0, *back[2], ACCENT, 3)
f.text(1, 0, 'a = 2', 20, LINE, 'middle', True, dy=26)
figures['stereo-cube-diagonal'] = f

# 23. Точки A(−2; 1) і B(4; 9)
f = fig(460, -4.4, 6.4, -1.6, 10.6, 'Точки A і B на координатній площині')
grid(f)
f.axes(xticks=[-4, -2, 2, 4], yticks=[2, 4, 6, 8, 10])
f.line(-2, 1, 4, 9, ACCENT, 2.5)
f.dot(-2, 1, 6, ACCENT); f.dot(4, 9, 6, ACCENT)
f.text(-2, 1, 'A', 22, LINE, 'end', True, dx=-10, dy=-6)
f.text(4, 9, 'B', 22, LINE, 'start', True, dx=10, dy=6)
figures['coord-points'] = f

# 24. Вектор з початком (1; 1) і кінцем (5; 4)
f = fig(460, -1.4, 7.4, -1.4, 6.4, 'Вектор a на координатній площині')
grid(f)
f.axes(xticks=[1, 2, 3, 4, 5, 6, 7], yticks=[1, 2, 3, 4, 5, 6])
arrow(f, 1, 1, 5, 4)
f.dot(1, 1, 5, ACCENT)
f.text(3, 2.5, 'a', 26, ACCENT, 'end', True, dx=-10, dy=-8)
figures['vectors-grid'] = f

# 25. Графік y = 0,5x² − 1 і дотична в точці x₀ = 2
f = fig(460, -3.4, 4.4, -4.4, 6.4, 'Графік функції y = f(x) і дотична до нього в точці з абсцисою x₀')
grid(f)
# Позначки «2» немає свідомо: на її місці підпис x₀, а клітинки сітки й так
# дають прочитати абсцису.
f.axes(xticks=[-2, 1, 3], yticks=[-3, -2, -1, 1, 2, 3, 4, 5])
f.plot(lambda x: 0.5 * x * x - 1, -3.3, 4.3)
f.plot(lambda x: 2 * x - 3, -0.6, 4.3, color=LINE, width=2)
f.dot(2, 1, 6, ACCENT)
f.dot(0, -3, 5, LINE)
dashed(f, [(2, 0), (2, 1)], MUTED, 1.5)
f.text(2, 0, 'x₀', 18, ACCENT, 'middle', True, dy=24)
figures['deriv-tangent'] = f

# 26. Парабола y = x² − 2x − 3 для нерівності
f = fig(460, -3.2, 5.2, -5.2, 6.2, 'Графік квадратичної функції y = f(x)')
grid(f)
f.axes(xticks=[-2, -1, 1, 2, 3, 4], yticks=[-4, -3, -2, -1, 1, 2, 3, 4, 5])
f.plot(lambda x: x * x - 2 * x - 3, -2.2, 4.2)
f.dot(-1, 0, 6, ACCENT); f.dot(3, 0, 6, ACCENT)
figures['ineq-parabola'] = f

for name, figure in figures.items():
    svg = figure.svg()
    xml.dom.minidom.parseString(svg)  # падає, якщо XML зламаний
    (OUT / f'{name}.svg').write_text(svg, encoding='utf-8')
total = sum((OUT / f'{n}.svg').stat().st_size for n in figures)
print(f'рисунків: {len(figures)}, разом {round(total / 1024)} КБ')
