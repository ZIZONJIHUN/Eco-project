// 메뉴 이름 → 어울리는 음식 그림 (public/img/fluent/<slug>.webp, Microsoft Fluent Emoji 3D · MIT)
// 위에서부터 먼저 맞는 규칙을 쓴다: 구체적인 음식 → 요리 종류 → 주재료 → 기본 접시
const RULES: [string, RegExp][] = [
  // 후식·음료·과일·빵 (이름 끝이나 핵심 단어로 바로 알 수 있는 것)
  ['birthday-cake', /생일|케이크|케잌|케익/],
  ['shaved-ice', /빙수/],
  ['soft-ice-cream', /아이스크림|소프트콘|젤라또/],
  ['custard', /푸딩|젤리|판나코타/],
  ['bubble-tea', /버블티|밀크티|타피오카/],
  ['hot-beverage', /라떼|커피|코코아|초코우유/],
  ['teacup-without-handle', /식혜|수정과|녹차|보리차|차$/],
  ['cup-with-straw', /에이드|스무디|쉐이크|셰이크|슬러시|탄산|사이다|콜라|아이스티/],
  ['beverage-box', /주스|쥬스|음료|두유|쿨$|쥬시|모구모구/],
  ['glass-of-milk', /우유|요구르트|요거트|야쿠르트|요플레|미숫가루/],
  ['strawberry', /딸기|딸바/],
  ['watermelon', /수박/],
  ['grapes', /포도|샤인/],
  ['tangerine', /귤|오렌지|한라봉|천혜향|레드향|자몽/],
  ['banana', /바나나/],
  ['kiwi-fruit', /키위/],
  ['pineapple', /파인애플/],
  ['melon', /멜론|메론|참외/],
  ['peach', /복숭아|천도|자두/],
  ['mango', /망고/],
  ['pear', /배$/],
  ['red-apple', /사과|과일|후르츠|프루츠/],
  ['blueberries', /블루베리/],
  ['cookie', /쿠키|비스킷|비스켓|머랭|마카롱|쫀쿠|쿠$/],
  ['doughnut', /도넛|도너츠|츄러스/],
  ['waffle', /와플/],
  ['pancakes', /팬케이크|핫케이크|호떡/],
  ['croissant', /크루아상|크로와상|페스츄리|패스츄리|데니쉬/],
  ['hamburger', /버거/],
  ['pizza', /피자/],
  ['hot-dog', /핫도그|콘도그/],
  ['sandwich', /샌드위치|토스트/],
  ['bagel', /베이글|프레첼/],
  ['taco', /타코|나쵸/],
  ['burrito', /부리또|브리또|또띠아|퀘사디아|케밥/],
  ['bread', /빵|브레드|모닝롤|번$|^난$/],
  ['french-fries', /감자튀김|웨지감자|프렌치프라이|포테이토/],
  ['chocolate-bar', /초코|초콜릿|빼빼로/],
  ['pie', /파이|타르트/],
  ['dango', /떡꼬치|경단|약과|강정떡|소떡|송편|찹쌀떡|인절미|떡$/],
  ['rice-cracker', /누룽지|쌀과자|뻥튀기/],
  // 밥·면·국
  ['curry-rice', /카레(?!구이)|(?<!치)커리|하이라이스|짜장밥/],
  ['sushi', /김밥|초밥|유부초밥|롤$/],
  ['rice-ball', /주먹밥|삼각김밥|무스비/],
  ['bento-box', /덮밥|비빔밥|볶음밥|오므라이스|도시락|컵밥|라이스$|필라프|리조또|규동|돈부리/],
  ['bowl-with-spoon', /죽$|스프|수프|크림스프/],
  ['spaghetti', /스파게티|파스타|펜네|파르팔레|뇨끼|라자냐|그라탕|마카로니/],
  ['steaming-bowl', /국수|우동|라면|짬뽕|짜장|냉면|쫄면|소바|쌀국수|칼국수|수제비|면$|라멘/],
  ['pot-of-food', /국$|국밥|탕$|찌개|전골|스튜|샤브|훠궈|부대/],
  ['cooked-rice', /밥$|밥\//],
  // 떡·만두·어묵
  ['oden', /떡볶이|라볶이|어묵|오뎅/],
  ['dumpling', /만두|딤섬|교자|춘권/],
  // 해산물
  ['fried-shrimp', /새우튀김|새우까스|에비|멘보샤/],
  ['shrimp', /새우|쉬림프|랍스터|랍스타/],
  ['squid', /오징어|낙지|주꾸미|쭈꾸미|문어|오삼/],
  ['crab', /게살|꽃게|크래미|게맛살|대게/],
  ['oyster', /조개|바지락|홍합|굴|전복|가리비/],
  ['fish-cake-with-swirl', /맛살|어육/],
  ['fish', /생선|고등어|삼치|갈치|연어|가자미|동태|명태|코다리|대구|조기|꽁치|참치|멸치|황태|북어|임연수|장어|가오리|아귀|피쉬|피시/],
  // 고기·달걀·두부
  ['poultry-leg', /닭|치킨|계육|윙|텐더|너겟|순살|오리|유린기|깐풍기/],
  ['bacon', /베이컨|햄(?!버)|소시지|소세지|스팸/],
  ['cut-of-meat', /한우|소고기|쇠고기|우육|차돌|양지|사골|우삼겹|육개장|불고기|스테이크|함박|떡갈비|미트|육전|너비아니/],
  ['meat-on-bone', /돼지|돈육|돈까스|돈가스|까스$|가스$|제육|삼겹|목살|보쌈|족발|탕수육|갈비|수육|순대|동그랑땡|폭찹|등심|안심|카츠|꿔바로우/],
  ['cooking', /달걀|계란|에그|오믈렛|스크램블|메추리알/],
  ['egg', /알$/],
  // 채소·반찬
  ['leafy-green', /김치|깍두기|석박지|섞박지|겉절이|백김치|동치미|열무|김부각|김자반|파래|미역/],
  ['hot-pepper', /고추|꽈리|청양/],
  ['cucumber', /오이|피클|짠지|장아찌|단무지/],
  ['potato', /감자/],
  ['roasted-sweet-potato', /고구마|맛탕/],
  ['ear-of-corn', /옥수수|콘/],
  ['brown-mushroom', /버섯/],
  ['broccoli', /브로콜리|양배추/],
  ['carrot', /당근|우엉|연근|무조림|무생채/],
  ['tomato', /토마토/],
  ['peanuts', /땅콩|견과|호두|아몬드|멸치볶음/],
  ['cheese-wedge', /치즈/],
  ['fried-shrimp', /튀김$/],
  ['broccoli', /채소|야채/],
  ['green-salad', /샐러드|무침|나물|생채|숙채|쌈|겉절|묵|잡채|채$|볶음$|조림$|전$|부침|두부|비지|콩/],
]

export const FALLBACK_IMAGE = 'fork-and-knife-with-plate'

const clean = (s: string) => s.replace(/\([^)]*\)/g, '').replace(/[^0-9A-Za-z가-힣/,&+]/g, '')

function match(n: string): string | null {
  for (const [slug, re] of RULES) if (re.test(n)) return slug
  return null
}

/** 메뉴 이름에 어울리는 그림 이름. "곤드레밥/양념장"처럼 묶인 이름은 앞쪽 주요리부터 본다. 맞는 규칙이 없으면 접시 그림 */
export function foodImage(name: string): string {
  const c = clean(name)
  const main = c.split(/[/,&+]/)[0]
  return match(main) ?? match(c.replace(/[/,&+]/g, '')) ?? FALLBACK_IMAGE
}

export const imageSrc = (slug: string) => `/img/fluent/${slug}.webp`
