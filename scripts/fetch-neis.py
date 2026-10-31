"""나이스 급식 API에서 효명고 중식을 주 단위로 받아 data/neis-meals-2026.json 에 저장한다.
키 없이 호출하면 한 번에 5건까지만 주므로 월~금 한 주씩 나눠 부른다."""
import json
import time
import urllib.parse
import urllib.request
from datetime import date, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
URL = 'https://open.neis.go.kr/hub/mealServiceDietInfo'
START, END = date(2026, 1, 1), date(2026, 12, 31)

rows = {}
monday = START - timedelta(days=START.weekday())
while monday <= END:
    params = dict(Type='json', pIndex=1, pSize=5, ATPT_OFCDC_SC_CODE='J10', SD_SCHUL_CODE='7530601',
                  MMEAL_SC_CODE=2, MLSV_FROM_YMD=monday.strftime('%Y%m%d'),
                  MLSV_TO_YMD=(monday + timedelta(days=4)).strftime('%Y%m%d'))
    with urllib.request.urlopen(URL + '?' + urllib.parse.urlencode(params), timeout=20) as res:
        body = json.loads(res.read().decode('utf-8'))
    for block in body.get('mealServiceDietInfo', []):
        for row in block.get('row', []):
            rows[row['MLSV_YMD']] = row
    monday += timedelta(days=7)
    time.sleep(0.2)

out = [rows[k] for k in sorted(rows) if k.startswith(str(START.year))]
(ROOT / 'data/neis-meals-2026.json').write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding='utf-8')
print(len(out), 'days', out[0]['MLSV_YMD'] if out else '', out[-1]['MLSV_YMD'] if out else '')
