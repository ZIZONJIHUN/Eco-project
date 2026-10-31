"""data/recipes-claude.tsv(Claude 재료 추정)와 나이스 급식으로 메뉴별·일별 탄소와 열량을 계산해
data/results-2026.json 에 저장한다. 나이스 공식 열량(CAL_INFO)은 비교에만 쓰고 재료량 조정에는 쓰지 않는다."""
import json
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# (이름, 배출계수 kgCO2e/kg, kcal/100g, 계수 출처) — 기존 시안과 같은 값
FOODS = {
    'rice': ('쌀·잡곡·떡', 4.45, 365, '쌀'),
    'beef': ('쇠고기', 58.15, 200, '쇠고기(국내산)'),
    'pork': ('돼지고기', 13.36, 260, '돼지고기(국내산)'),
    'chicken': ('닭고기', 5.36, 170, '닭·오리고기(국내산)'),
    'duck': ('오리고기', 5.36, 250, '닭·오리고기(국내산)'),
    'shrimp': ('새우', 26.87, 85, '새우'),
    'fish': ('생선·수산물', 13.63, 110, '생선(양식) 대용'),
    'egg': ('달걀', 4.67, 143, '달걀'),
    'tofu': ('두부', 3.16, 85, '두부·콩'),
    'bean': ('콩·견과', 3.16, 450, '두부·콩 대용'),
    'milk': ('우유·요거트', 3.15, 65, '우유·유제품'),
    'butter': ('버터·크림', 3.15, 717, '우유·유제품 대용'),
    'cheese': ('치즈', 23.88, 300, '치즈'),
    'wheat': ('밀가루·면·빵', 1.57, 350, '밀'),
    'starch': ('당면·전분·묵', 1.57, 350, '밀 대용'),
    'veg': ('채소·버섯·해조', 0.53, 28, '채소(일반)'),
    'root': ('감자·고구마·무', 0.46, 80, '뿌리채소·감자'),
    'fruit': ('과일', 0.70, 55, '과일(일반)'),
    'kimchi': ('김치·절임', 0.53, 30, '김치·절임채소'),
    'sugar': ('설탕', 3.20, 400, '설탕·음료'),
    'sauce': ('양념·소스', 3.20, 120, '설탕·음료 대용'),
    'oil': ('식용유', 3.20, 884, '설탕·음료 대용'),
    'water': ('물', 0, 0, '0 가정'),
}
SWAP = ('beef', 'pork', 'shrimp', 'fish')


def clean(text):
    return re.sub(r'\s+', ' ', re.sub(r'\(\s*[\d.\s]+\)', '', text).replace('*', '').replace('#', '')).strip()


def load_recipes():
    recipes = {}
    for line in (ROOT / 'data/recipes-claude.tsv').read_text(encoding='utf-8').splitlines():
        if not line.strip() or line.startswith('#'):
            continue
        name, spec = line.split('\t')
        recipes[name] = [(k, int(v)) for k, v in (p.split('=') for p in spec.split(',')) if int(v) > 0]
    return recipes


def calculate(items):
    out = []
    for key, grams in items:
        name, factor, kcal, note = FOODS[key]
        out.append(dict(food=key, name=name, grams=grams, emission_factor=factor, factor_note=note,
                        kcal_per_100g=kcal, kgCO2e=grams / 1000 * factor, kcal=grams / 100 * kcal))
    return out


def grade(value, daily=False):
    low, high = (1.5, 3.0) if daily else (0.3, 1.0)
    return '저' if value < low else ('중' if value < high else '고')


def main():
    recipes = load_recipes()
    raw = json.loads((ROOT / 'data/neis-meals-2026.json').read_text(encoding='utf-8'))
    days, missing = [], set()
    for row in raw:
        menus = []
        for text in row['DDISH_NM'].split('<br/>'):
            name = clean(text)
            if not name:
                continue
            if name not in recipes:
                missing.add(name)
                continue
            ing = calculate(recipes[name])
            carbon, kcal = sum(i['kgCO2e'] for i in ing), sum(i['kcal'] for i in ing)
            menu = dict(name=name, ingredients=ing, kgCO2e=carbon, estimated_kcal=kcal, grade=grade(carbon), alternative=None)
            swapped = [k for k, _ in recipes[name] if k in SWAP]
            if carbon >= 1.0 and swapped:
                alt = calculate([('tofu' if k in SWAP else k, g) for k, g in recipes[name]])
                alt_carbon = sum(i['kgCO2e'] for i in alt)
                menu['alternative'] = dict(replaced_foods=[FOODS[k][0] for k in swapped], kgCO2e=alt_carbon,
                                           reduction_kgCO2e=carbon - alt_carbon,
                                           reduction_percent=(carbon - alt_carbon) / carbon * 100)
            menus.append(menu)
        carbon = sum(m['kgCO2e'] for m in menus)
        kcal = sum(m['estimated_kcal'] for m in menus)
        official = float(re.search(r'[\d.]+', row['CAL_INFO'])[0])
        date = f"{row['MLSV_YMD'][:4]}-{row['MLSV_YMD'][4:6]}-{row['MLSV_YMD'][6:]}"
        days.append(dict(date=date, menus=menus, total_kgCO2e=carbon, estimated_kcal=kcal, official_kcal=official,
                         error_percent=abs(kcal - official) / official * 100, grade=grade(carbon, True),
                         potential_reduction_kgCO2e=sum(m['alternative']['reduction_kgCO2e'] for m in menus if m['alternative'])))
    if missing:
        raise SystemExit('재료 추정이 없는 메뉴: ' + ', '.join(sorted(missing)))

    total = sum(d['total_kgCO2e'] for d in days)
    unique = {}
    for d in days:
        for m in d['menus']:
            u = unique.setdefault(m['name'], dict(name=m['name'], kgCO2e=m['kgCO2e'], grade=m['grade'], dates=[]))
            u['dates'].append(d['date'])
    summary = dict(
        day_count=len(days), unique_menu_count=len(unique),
        average_daily_kgCO2e=total / len(days), total_kgCO2e=total,
        average_error_percent=sum(d['error_percent'] for d in days) / len(days),
        grade_counts=dict(Counter(d['grade'] for d in days)),
        top10_high_carbon_menus=sorted(unique.values(), key=lambda m: m['kgCO2e'], reverse=True)[:10],
        total_potential_reduction_percent=sum(d['potential_reduction_kgCO2e'] for d in days) / total * 100,
        average_estimated_kcal=sum(d['estimated_kcal'] for d in days) / len(days),
        average_official_kcal=sum(d['official_kcal'] for d in days) / len(days),
    )
    sources = [
        '나이스 교육정보 개방 포털 급식식단정보 (https://open.neis.go.kr/) · 경기도교육청 J10, 효명고 7530601',
        '재료 추정: Claude(Anthropic, Opus 5.5)가 메뉴 이름만 보고 1인분 재료와 양을 추정 (data/recipes-claude.tsv)',
        '기후솔루션, 국내 주요 육류 탄소발자국 보고서 (https://forourclimate.org/ko/newsroom/1204) · 원문 재확인 필요',
        'Poore, J., & Nemecek, T. (2018). Reducing food\'s environmental impacts through producers and consumers. Science, 360(6392), 987-992.',
        'Aslan, M. K., Heijungs, R., & Ilievski, F. (2025). The Carbon Footprint Wizard. arXiv:2509.07733',
    ]
    out = dict(period=dict(start=days[0]['date'], end=days[-1]['date']), summary=summary, sources=sources, days=days)
    (ROOT / 'data/results-2026.json').write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding='utf-8')
    print(f"{len(days)}일 · 메뉴 {len(unique)}종 · 한 끼 평균 {summary['average_daily_kgCO2e']:.2f}kg · "
          f"열량 오차 {summary['average_error_percent']:.1f}% · AI {summary['average_estimated_kcal']:.0f} / 공식 {summary['average_official_kcal']:.0f} kcal")


if __name__ == '__main__':
    main()
