# Карти для завдань з історії

`make.py` збирає SVG-карти в `frontend/public/content/history/maps/`.
Геометрія — Natural Earth (суспільне надбання), усе оформлення наше.

```bash
pip install shapely
# покласти поруч ne50.geojson, disputed.geojson, admin1.geojson з
# github.com/nvkelso/natural-earth-vector/tree/master/geojson
python3 make.py
```

Файли даних у репозиторії не зберігаються — разом вони важать понад 40 МБ,
а карти перемальовують раз на кілька місяців. Потрібні три:

| Файл | Навіщо |
|---|---|
| `ne_50m_admin_0_countries.geojson` | контури держав |
| `ne_50m_admin_0_breakaway_disputed_areas.geojson` | Крим, який у першому файлі віднесено до Росії |
| `ne_10m_admin_1_states_provinces.geojson` | межі областей для заштрихованих зон |

Крим об'єднується з материковою Україною під час збирання: у даних Natural
Earth він лежить окремим полігоном у шарі спірних територій.
