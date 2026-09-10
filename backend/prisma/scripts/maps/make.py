# -*- coding: utf-8 -*-
import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import render

OUT = (pathlib.Path(__file__).resolve().parents[4]
       / 'frontend' / 'public' / 'content' / 'history' / 'maps')
CAPTION = 'Схема: L&S. Геометрія: Natural Earth (public domain)'

maps = {}

# 1. Археологічні пам'ятки первісності
maps['ancient-sites'] = render.render(
    'Карта археологічних пам’яток первісної доби',
    markers=[('Королево', 23.15, 48.15),
             ('Мізин', 32.85, 51.80),
             ('Кирилівська стоянка', 30.48, 50.48),
             ('Кам’яна Могила', 35.20, 46.95)],
    caption=CAPTION)

# 2. Античні міста-держави
maps['antique-cities'] = render.render(
    'Карта античних міст-держав Північного Причорномор’я',
    markers=[('Тіра', 30.35, 46.20),
             ('Ольвія', 31.90, 46.69),
             ('Херсонес', 33.49, 44.61),
             ('Пантікапей', 36.47, 45.35)],
    caption=CAPTION)

# 3. Міста Київської Русі
maps['kyivan-rus-cities'] = render.render(
    'Карта міст Київської Русі',
    markers=[('Київ', 30.52, 50.45),
             ('Чернігів', 31.29, 51.49),
             ('Галич', 24.72, 49.12),
             ('Переяслав', 31.45, 50.07)],
    caption=CAPTION)

# 4. Козацькі центри
maps['cossack-centres'] = render.render(
    'Карта козацьких центрів',
    markers=[('Хортиця', 35.07, 47.85),
             ('Чигирин', 32.66, 49.07),
             ('Батурин', 32.84, 51.34),
             ('Кодак', 35.05, 48.36)],
    caption=CAPTION)

# 5. Поділ Гетьманщини по Дніпру
maps['dnipro-partition'] = render.render(
    'Карта поділу Гетьманщини по Дніпру',
    regions=[('Лівобережжя з Києвом', ['Chernihiv', 'Sumy', 'Poltava', 'Kharkiv', 'Kiev City']),
             ('Правобережжя', ['Volyn', 'Rivne', "Khmel'nyts'kyy", "Ternopil'", 'Vinnytsya', 'Zhytomyr', 'Kiev'])],
    caption=CAPTION)

# 6. Українські землі між двома війнами
maps['interwar-partition'] = render.render(
    'Карта українських земель у міжвоєнний період',
    regions=[('Польща', ['Volyn', 'Rivne', "L'viv", "Ivano-Frankivs'k", "Ternopil'"]),
             # Румунії належала й Бессарабія — південь сучасної Одещини.
             ('Румунія', ['Chernivtsi', ('Odessa', (28.0, 45.0, 30.3, 46.45))]),
             ('Чехословаччина', ['Transcarpathia']),
             ('Радянський Союз', ['Kiev', 'Kiev City', 'Zhytomyr', "Khmel'nyts'kyy", 'Vinnytsya',
                                  'Cherkasy', 'Kirovohrad', 'Odessa', 'Mykolayiv', 'Kherson',
                                  "Dnipropetrovs'k", 'Zaporizhzhya', "Donets'k", "Luhans'k",
                                  'Kharkiv', 'Poltava', 'Sumy', 'Chernihiv', 'Crimea', 'Sevastopol'])],
    caption=CAPTION)

for name, svg in maps.items():
    (OUT / f'{name}.svg').write_text(svg, encoding='utf-8')
    print(f'{name}.svg — {len(svg)} байтів')
