"""data/*.json 을 앱용 압축 데이터로 바꿔 src/template.html 에 넣고 app/index.html 을 만든다."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
results = json.loads((ROOT / 'data/results-2026.json').read_text(encoding='utf-8'))
neis = json.loads((ROOT / 'data/neis-meals-2026.json').read_text(encoding='utf-8'))
neis_by_date = {f"{r['MLSV_YMD'][:4]}-{r['MLSV_YMD'][4:6]}-{r['MLSV_YMD'][6:]}": r for r in neis}


def parse_dishes(raw):
    dishes = []
    for part in raw.split('<br/>'):
        m = re.search(r'\(([\d.]+)\)\s*$', part)
        allergies = [int(x) for x in m.group(1).split('.') if x] if m else []
        name = re.sub(r'\s+', ' ', re.sub(r'\(\s*[\d.\s]+\)', '', part).replace('*', '').replace('#', '')).strip()
        dishes.append((name, allergies))
    return dishes


def parse_nutrition(raw):
    out = {}
    for part in raw.split('<br/>'):
        key, _, value = part.partition(':')
        key = key.strip()
        for label, short in (('탄수화물', 'carb'), ('단백질', 'prot'), ('지방', 'fat')):
            if key.startswith(label):
                out[short] = float(value)
    return out


def r(x, n=3):
    return round(x, n)


days = []
for day in results['days']:
    row = neis_by_date[day['date']]
    dishes = parse_dishes(row['DDISH_NM'])
    assert len(dishes) == len(day['menus']), day['date']
    menus = []
    for (dish_name, allergies), m in zip(dishes, day['menus']):
        assert dish_name == m['name'], (dish_name, m['name'])
        alt = m['alternative']
        menus.append(dict(
            n=m['name'], al=allergies, kg=r(m['kgCO2e']), g=m['grade'], kcal=r(m['estimated_kcal'], 1),
            ing=[[i['name'], i['grams'], r(i['kgCO2e'])] for i in m['ingredients'] if i['grams'] and i['food'] != 'water'],
            alt=dict(kg=r(alt['kgCO2e']), red=r(alt['reduction_kgCO2e']), pct=r(alt['reduction_percent'], 1),
                     foods=alt['replaced_foods']) if alt else None,
        ))
    days.append(dict(
        d=day['date'], kg=r(day['total_kgCO2e']), g=day['grade'], kcalO=day['official_kcal'],
        kcalE=r(day['estimated_kcal'], 1), err=r(day['error_percent'], 1),
        ntr=parse_nutrition(row['NTR_INFO']), menus=menus,
    ))

s = results['summary']
data = dict(
    days=days,
    summary=dict(avg=r(s['average_daily_kgCO2e']), err=r(s['average_error_percent'], 1),
                 kcalE=r(s['average_estimated_kcal'], 1), kcalO=r(s['average_official_kcal'], 1),
                 redPct=r(s['total_potential_reduction_percent'], 1),
                 top=[dict(n=t['name'], kg=r(t['kgCO2e']), d=t['dates'][0]) for t in s['top10_high_carbon_menus']]),
    sources=results['sources'],
    period=results['period'],
)

template = (ROOT / 'src/template.html').read_text(encoding='utf-8')
html = template.replace('/*__DATA__*/null', json.dumps(data, ensure_ascii=False, separators=(',', ':')))
(ROOT / 'app/index.html').write_text(html, encoding='utf-8')
print('built app/index.html', len(days), 'days')
