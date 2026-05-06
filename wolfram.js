/* NutriCare — WolframAlpha Full Results API, nutrition lookup */
(function () {
  'use strict';

  const KEY = 'nc_wa_appid';

  const getAppId = () => NC.store.get(KEY, null);
  const setAppId = (id) => NC.store.set(KEY, id ? id.trim() : null);
  const hasAppId = () => !!getAppId();

  /* ── NUTRIENT NAME → our key mapping ──
     Each entry: [[name aliases...], ourKey, targetUnit]
     Names are matched case-insensitively, whitespace-normalized,
     against the left-hand side of WolframAlpha's "nutrient | value" rows.
  */
  const MAPPING = [
    [['calories','energy','caloric content','total calories'],       'calories',   'kcal'],
    [['protein','proteins'],                                          'protein',    'g'],
    [['total fat','fat','lipids','total fats'],                       'fat',        'g'],
    [['total carbohydrate','total carbohydrates',
      'carbohydrate','carbohydrates','net carbs'],                    'carbs',      'g'],
    [['dietary fiber','total dietary fiber','fiber','fibre'],         'fiber',      'g'],
    [['calcium'],                                                     'calcium',    'mg'],
    [['vitamin d','vitamin d3','vitamin d2',
      'cholecalciferol','ergocalciferol'],                            'vitaminD',   'mcg'],
    [['vitamin k','vitamin k1','phylloquinone',
      'vitamin k2','menaquinone'],                                    'vitaminK',   'mcg'],
    [['magnesium'],                                                   'magnesium',  'mg'],
    [['phosphorus'],                                                  'phosphorus', 'mg'],
    [['potassium'],                                                   'potassium',  'mg'],
    [['sodium'],                                                      'sodium',     'mg'],
    [['vitamin c','ascorbic acid','l-ascorbic acid'],                 'vitaminC',   'mg'],
    [['iron'],                                                        'iron',       'mg'],
    [['zinc'],                                                        'zinc',       'mg'],
    [['folate','folic acid','vitamin b9',
      'total folate','dietary folate equivalents',
      'dietary folate','dfe'],                                        'folate',     'mcg'],
    [['vitamin b12','cobalamin','cyanocobalamin','methylcobalamin'],  'b12',        'mcg'],
    [['choline','total choline'],                                     'choline',    'mg'],
    [['dha','docosahexaenoic acid','22:6 n-3','dha (22:6 n-3)'],     'omega3dha',  'mg'],
    [['epa','eicosapentaenoic acid','20:5 n-3','epa (20:5 n-3)'],    'omega3epa',  'mg'],
  ];

  /* Flat lookup: lowercase name → { key, targetUnit } */
  const NAME_MAP = {};
  for (const [aliases, key, targetUnit] of MAPPING) {
    for (const alias of aliases) NAME_MAP[alias] = { key, targetUnit };
  }

  /* Parse a value string like "20.5 g", "2.4 μg", "40 IU", "165 Cal" */
  const parseVal = (str, targetUnit) => {
    if (!str) return null;
    const m = str.trim().match(/([\d,]+\.?\d*)\s*(cal|kcal|kcals|kj|g|mg|mcg|μg|µg|iu|%)?/i);
    if (!m) return null;
    let val = parseFloat(m[1].replace(/,/g, ''));
    if (isNaN(val)) return null;
    const srcUnit = (m[2] || '').toLowerCase().replace('kcals', 'kcal');

    /* Unit conversions into targetUnit */
    if (srcUnit === 'iu') {
      /* Vitamin D: 40 IU = 1 mcg (D3/D2 roughly equivalent here) */
      if (targetUnit === 'mcg') val = +(val / 40).toFixed(3);
      /* Vitamin A, E etc. — won't reach here since we don't map them */
    } else if ((srcUnit === 'μg' || srcUnit === 'µg' || srcUnit === 'mcg') && targetUnit === 'mg') {
      val = +(val / 1000).toFixed(5);
    } else if (srcUnit === 'mg' && targetUnit === 'mcg') {
      val = +(val * 1000).toFixed(2);
    } else if (srcUnit === 'g' && targetUnit === 'mg') {
      val = +(val * 1000).toFixed(2);
    } else if (srcUnit === 'g' && targetUnit === 'mcg') {
      val = +(val * 1e6).toFixed(0);
    }
    /* kj → kcal: 1 kcal = 4.184 kJ */
    if (srcUnit === 'kj' && targetUnit === 'kcal') val = +(val / 4.184).toFixed(1);

    return val;
  };

  /* Scan all pods' plaintext for pipe-delimited rows "nutrient | value unit" */
  const parsePods = (pods) => {
    const nutrients = {};
    const matched = [];   // human-readable labels of what was found

    for (const pod of (pods || [])) {
      for (const sub of (pod.subpods || [])) {
        const text = sub.plaintext || '';
        if (!text) continue;
        for (const rawLine of text.split('\n')) {
          const pipeIdx = rawLine.indexOf('|');
          if (pipeIdx < 0) continue;
          const rawName = rawLine.slice(0, pipeIdx).trim().toLowerCase().replace(/\s+/g, ' ');
          const valStr  = rawLine.slice(pipeIdx + 1).trim();
          const mapping = NAME_MAP[rawName];
          if (mapping && nutrients[mapping.key] === undefined) {
            const val = parseVal(valStr, mapping.targetUnit);
            if (val !== null) {
              nutrients[mapping.key] = val;
              const label = NC.NUTRIENTS[mapping.key]?.label || mapping.key;
              matched.push(label);
            }
          }
        }
      }
    }
    return { nutrients, matched };
  };

  /* Main lookup — returns { nutrients, matched, query } */
  const lookup = async (query) => {
    const appId = getAppId();
    if (!appId) {
      const err = new Error('No WolframAlpha App ID set.');
      err.code = 'no_appid';
      throw err;
    }

    const params = new URLSearchParams({ input: query, appid: appId, output: 'json', format: 'plaintext' });
    let resp;
    try {
      resp = await fetch(`https://api.wolframalpha.com/v2/query?${params}`);
    } catch (e) {
      const err = new Error('Network error — check your connection and that HTTPS is in use.');
      err.code = 'network';
      throw err;
    }

    if (resp.status === 403) {
      const err = new Error('Invalid App ID — check the key in your Profile settings.');
      err.code = 'auth';
      throw err;
    }
    if (!resp.ok) {
      throw new Error(`WolframAlpha API error ${resp.status}`);
    }

    let data;
    try { data = await resp.json(); } catch {
      throw new Error('Unexpected response from WolframAlpha.');
    }

    const qr = data?.queryresult;
    if (!qr) throw new Error('Malformed API response.');

    if (!qr.success) {
      /* Collect "did you mean" suggestions if available */
      const suggestions = [].concat(qr.didyoumeans?.didyoumean || [])
        .map(s => s.val || s['#text'] || '').filter(Boolean);
      const err = new Error('WolframAlpha returned no results for this query.');
      err.code = 'no_results';
      err.suggestions = suggestions;
      throw err;
    }

    const { nutrients, matched } = parsePods(qr.pods);
    return { nutrients, matched, query };
  };

  window.NCWolfram = { getAppId, setAppId, hasAppId, lookup };
})();
