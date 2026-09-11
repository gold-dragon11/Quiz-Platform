# -*- coding: utf-8 -*-
"""Маленька бібліотека для математичних рисунків у SVG.

Без залежностей: рисунки прості — осі, графіки, многокутники, підписи — і
кожен лишається читабельним текстовим файлом, який легко переглянути в диффі.
Палітра та сама, що в картах історії: темне тло, світлі лінії, бузковий акцент.
"""
from xml.sax.saxutils import escape

INK = '#0f0f13'
LINE = '#e6e6ee'
MUTED = '#9a9aab'
GRID = '#2b2b35'
ACCENT = '#8b5cf6'
FILL = '#8b5cf6'
SERIF = "'Times New Roman', 'Noto Serif', serif"
SANS = 'ui-sans-serif, system-ui, sans-serif'


class Figure:
    """Полотно з власною системою координат: (x, y) у математичних одиницях."""

    def __init__(self, width, height, xmin, xmax, ymin, ymax, pad=28, title=''):
        self.w, self.h, self.pad = width, height, pad
        self.xmin, self.xmax, self.ymin, self.ymax = xmin, xmax, ymin, ymax
        self.title = title
        self.items = []

    # --- координати ---
    def X(self, x):
        return round(self.pad + (x - self.xmin) / (self.xmax - self.xmin) * (self.w - 2 * self.pad), 2)

    def Y(self, y):
        return round(self.h - self.pad - (y - self.ymin) / (self.ymax - self.ymin) * (self.h - 2 * self.pad), 2)

    # --- примітиви ---
    def line(self, x1, y1, x2, y2, color=LINE, width=2, dash=None):
        d = f' stroke-dasharray="{dash}"' if dash else ''
        self.items.append(f'<line x1="{self.X(x1)}" y1="{self.Y(y1)}" x2="{self.X(x2)}" y2="{self.Y(y2)}" stroke="{color}" stroke-width="{width}"{d}/>')

    def polygon(self, points, color=LINE, width=2, fill='none', opacity=1):
        pts = ' '.join(f'{self.X(x)},{self.Y(y)}' for x, y in points)
        self.items.append(f'<polygon points="{pts}" fill="{fill}" fill-opacity="{opacity}" stroke="{color}" stroke-width="{width}" stroke-linejoin="round"/>')

    def polyline(self, points, color=ACCENT, width=3):
        pts = ' '.join(f'{self.X(x)},{self.Y(y)}' for x, y in points)
        self.items.append(f'<polyline points="{pts}" fill="none" stroke="{color}" stroke-width="{width}" stroke-linejoin="round" stroke-linecap="round"/>')

    def plot(self, f, x0, x1, steps=240, color=ACCENT, width=3):
        """Графік функції; розриви (None або вихід за межі) розбивають лінію."""
        segment = []
        for i in range(steps + 1):
            x = x0 + (x1 - x0) * i / steps
            try:
                y = f(x)
            except (ValueError, ZeroDivisionError, OverflowError):
                y = None
            if y is None or y < self.ymin - 1 or y > self.ymax + 1:
                if len(segment) > 1:
                    self.polyline(segment, color, width)
                segment = []
                continue
            segment.append((x, max(self.ymin - 0.5, min(self.ymax + 0.5, y))))
        if len(segment) > 1:
            self.polyline(segment, color, width)

    def dot(self, x, y, r=5, color=LINE):
        self.items.append(f'<circle cx="{self.X(x)}" cy="{self.Y(y)}" r="{r}" fill="{color}"/>')

    def circle(self, cx, cy, radius_units, color=LINE, width=2):
        r = round(radius_units / (self.xmax - self.xmin) * (self.w - 2 * self.pad), 2)
        self.items.append(f'<circle cx="{self.X(cx)}" cy="{self.Y(cy)}" r="{r}" fill="none" stroke="{color}" stroke-width="{width}"/>')

    def text(self, x, y, s, size=20, color=LINE, anchor='middle', italic=False, dx=0, dy=0, sans=False):
        style = ' font-style="italic"' if italic else ''
        family = SANS if sans else SERIF
        self.items.append(f'<text x="{self.X(x) + dx}" y="{self.Y(y) + dy}" font-size="{size}" fill="{color}" text-anchor="{anchor}" font-family="{family}"{style}>{escape(str(s))}</text>')

    def arc_mark(self, vx, vy, ax, ay, bx, by, radius=22, color=ACCENT):
        """Дужка кута з вершиною (vx, vy) між променями на (ax, ay) і (bx, by)."""
        import math
        px, py = self.X(vx), self.Y(vy)
        def unit(x, y):
            dx, dy = self.X(x) - px, self.Y(y) - py
            n = math.hypot(dx, dy)
            return dx / n, dy / n
        ux, uy = unit(ax, ay)
        wx, wy = unit(bx, by)
        sx, sy = px + ux * radius, py + uy * radius
        ex, ey = px + wx * radius, py + wy * radius
        cross = ux * wy - uy * wx
        sweep = 1 if cross > 0 else 0
        self.items.append(f'<path d="M{sx:.1f},{sy:.1f} A{radius},{radius} 0 0 {sweep} {ex:.1f},{ey:.1f}" fill="none" stroke="{color}" stroke-width="2"/>')

    def right_angle(self, vx, vy, ax, ay, bx, by, size=14, color=LINE):
        import math
        px, py = self.X(vx), self.Y(vy)
        def unit(x, y):
            dx, dy = self.X(x) - px, self.Y(y) - py
            n = math.hypot(dx, dy)
            return dx / n, dy / n
        ux, uy = unit(ax, ay)
        wx, wy = unit(bx, by)
        p1 = (px + ux * size, py + uy * size)
        p2 = (p1[0] + wx * size, p1[1] + wy * size)
        p3 = (px + wx * size, py + wy * size)
        self.items.append(f'<polyline points="{p1[0]:.1f},{p1[1]:.1f} {p2[0]:.1f},{p2[1]:.1f} {p3[0]:.1f},{p3[1]:.1f}" fill="none" stroke="{color}" stroke-width="1.5"/>')

    def axes(self, xticks=(), yticks=(), labels=True, grid=False):
        if grid:
            for t in xticks:
                self.line(t, self.ymin, t, self.ymax, GRID, 1)
            for t in yticks:
                self.line(self.xmin, t, self.xmax, t, GRID, 1)
        self.line(self.xmin, 0, self.xmax, 0, MUTED, 1.5)
        self.line(0, self.ymin, 0, self.ymax, MUTED, 1.5)
        # стрілки
        self.items.append(f'<polygon points="{self.X(self.xmax)},{self.Y(0)} {self.X(self.xmax) - 10},{self.Y(0) - 5} {self.X(self.xmax) - 10},{self.Y(0) + 5}" fill="{MUTED}"/>')
        self.items.append(f'<polygon points="{self.X(0)},{self.Y(self.ymax)} {self.X(0) - 5},{self.Y(self.ymax) + 10} {self.X(0) + 5},{self.Y(self.ymax) + 10}" fill="{MUTED}"/>')
        if labels:
            self.text(self.xmax, 0, 'x', 20, MUTED, 'end', True, dx=-4, dy=24)
            self.text(0, self.ymax, 'y', 20, MUTED, 'start', True, dx=10, dy=14)
            self.text(0, 0, '0', 16, MUTED, 'end', dx=-6, dy=18)
        for t in xticks:
            if t:
                self.line(t, -0.08 * (self.ymax - self.ymin) / 10, t, 0.08 * (self.ymax - self.ymin) / 10, MUTED, 1.5)
                self.text(t, 0, t, 16, MUTED, 'middle', dy=22, sans=True)
        for t in yticks:
            if t:
                self.line(-0.08 * (self.xmax - self.xmin) / 10, t, 0.08 * (self.xmax - self.xmin) / 10, t, MUTED, 1.5)
                self.text(0, t, t, 16, MUTED, 'end', dx=-8, dy=6, sans=True)

    def svg(self):
        head = (f'<svg xmlns="http://www.w3.org/2000/svg" width="{self.w}" height="{self.h}" '
                f'viewBox="0 0 {self.w} {self.h}" role="img" aria-label="{escape(self.title)}">')
        return '\n'.join([head, f'<rect width="{self.w}" height="{self.h}" fill="{INK}"/>', *self.items, '</svg>']) + '\n'
