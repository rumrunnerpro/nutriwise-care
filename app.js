/* NutriCare — Core data layer. window.NC namespace. */
(function () {
  'use strict';

  const KEYS = {
    profile: 'nc_profile',
    foods: 'nc_foods',
    recipes: 'nc_recipes',
    logs: 'nc_logs',
    medicines: 'nc_medicines',
    medLogs: 'nc_med_logs',
    targets: 'nc_targets',
    seeded: 'nc_seeded_v1',
    settings: 'nc_settings',
    carePin: 'nc_care_pin'
  };

  /* ── NUTRIENT DEFINITIONS ── */
  const NUTRIENTS = {
    calories: { label: 'Calories', unit: 'kcal', group: 'macro', dv: null },
    protein:  { label: 'Protein', unit: 'g', group: 'macro', dv: 75 },
    carbs:    { label: 'Carbohydrates', unit: 'g', group: 'macro', dv: 225 },
    fat:      { label: 'Total Fat', unit: 'g', group: 'macro', dv: 55 },
    fiber:    { label: 'Fiber', unit: 'g', group: 'macro', dv: 21 },
    // Bone
    calcium:    { label: 'Calcium', unit: 'mg', group: 'bone', dv: 1200 },
    vitaminD:   { label: 'Vitamin D', unit: 'mcg', group: 'bone', dv: 20 },
    vitaminK:   { label: 'Vitamin K', unit: 'mcg', group: 'bone', dv: 90 },
    magnesium:  { label: 'Magnesium', unit: 'mg', group: 'bone', dv: 320 },
    phosphorus: { label: 'Phosphorus', unit: 'mg', group: 'bone', dv: 700 },
    // Brain
    omega3dha: { label: 'Omega-3 DHA', unit: 'mg', group: 'brain', dv: 200 },
    omega3epa: { label: 'Omega-3 EPA', unit: 'mg', group: 'brain', dv: 200 },
    choline:   { label: 'Choline', unit: 'mg', group: 'brain', dv: 425 },
    b12:       { label: 'Vitamin B12', unit: 'mcg', group: 'brain', dv: 2.4 },
    folate:    { label: 'Folate', unit: 'mcg', group: 'brain', dv: 400 },
    zinc:      { label: 'Zinc', unit: 'mg', group: 'brain', dv: 8 },
    // Heart
    potassium: { label: 'Potassium', unit: 'mg', group: 'heart', dv: 2600 },
    sodium:    { label: 'Sodium', unit: 'mg', group: 'heart', dv: 2300, limit: true },
    // Recovery
    vitaminC: { label: 'Vitamin C', unit: 'mg', group: 'recovery', dv: 75 },
    iron:     { label: 'Iron', unit: 'mg', group: 'recovery', dv: 8 }
  };

  const GROUP_META = {
    macro:    { label: 'Macros', icon: '⚡', color: '--primary' },
    bone:     { label: 'Bone Health', icon: '🦴', color: '--bone' },
    brain:    { label: 'Brain Health', icon: '🧠', color: '--brain' },
    heart:    { label: 'Heart Health', icon: '❤️', color: '--heart' },
    recovery: { label: 'Recovery', icon: '💪', color: '--recovery' }
  };

  /* ── STORAGE ── */
  const store = {
    get: (key, fallback = null) => {
      try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
    },
    set: (key, val) => {
      try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { console.error('Storage write failed', e); }
    },
    update: (key, fn, fallback) => {
      const cur = store.get(key, fallback);
      const next = fn(cur);
      store.set(key, next);
      return next;
    }
  };

  /* ── EVENT BUS ── */
  const bus = {
    _h: {},
    on: (ev, fn) => { (bus._h[ev] = bus._h[ev] || []).push(fn); },
    off: (ev, fn) => { bus._h[ev] = (bus._h[ev] || []).filter(f => f !== fn); },
    emit: (ev, data) => { (bus._h[ev] || []).forEach(fn => fn(data)); }
  };

  /* ── ID & DATE UTILS ── */
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  /* Local-date string — avoids UTC rollover bug from toISOString() */
  const localDateStr = (d) => {
    const dt = d || new Date();
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  const today = () => localDateStr();
  const formatDate = (d) => {
    const dt = d ? new Date(d) : new Date();
    return dt.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  };
  const formatTime = (iso) => {
    return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };
  const hhmm = (iso) => new Date(iso).toTimeString().slice(0, 5);
  const hhmmToday = (hhmm) => {
    const [h, m] = hhmm.split(':').map(Number);
    const d = new Date(); d.setHours(h, m, 0, 0);
    return d;
  };

  /* ── ZERO NUTRIENTS OBJECT ── */
  const zeroNutrients = () => Object.fromEntries(Object.keys(NUTRIENTS).map(k => [k, 0]));

  /* ── NUTRIENT SCALING ── */
  const scaleNutrients = (base, servings) => {
    const out = {};
    for (const k in base) out[k] = +(base[k] * servings).toFixed(3);
    return out;
  };

  const addNutrients = (a, b) => {
    const out = { ...a };
    for (const k in b) out[k] = +(( out[k] || 0) + (b[k] || 0)).toFixed(3);
    return out;
  };

  /* ── PROFILE ── */
  const getProfile = () => store.get(KEYS.profile, null);
  const saveProfile = (p) => { store.set(KEYS.profile, { ...p, updatedAt: new Date().toISOString() }); bus.emit('profile:changed', p); };

  /* ── TARGETS (daily nutrition goals) ── */
  const DEFAULT_TARGETS = {
    calories: 1600,
    protein: 75, carbs: 200, fat: 55, fiber: 21,
    calcium: 1200, vitaminD: 20, vitaminK: 90, magnesium: 320, phosphorus: 700,
    omega3dha: 200, omega3epa: 200, choline: 425, b12: 2.4, folate: 400, zinc: 8,
    potassium: 2600, sodium: 2300,
    vitaminC: 75, iron: 8
  };
  const getTargets = () => ({ ...DEFAULT_TARGETS, ...(store.get(KEYS.targets, {})) });
  const saveTargets = (t) => { store.set(KEYS.targets, t); bus.emit('targets:changed', t); };

  /* ── FOODS ── */
  const getFoods = () => store.get(KEYS.foods, []);
  const saveFoods = (foods) => store.set(KEYS.foods, foods);
  const getFoodById = (id) => getFoods().find(f => f.id === id) || null;
  const addFood = (food) => {
    const f = { ...food, id: uid(), custom: true, createdAt: new Date().toISOString() };
    store.update(KEYS.foods, foods => [...foods, f], []);
    bus.emit('foods:changed');
    return f;
  };
  const updateFood = (id, patch) => {
    store.update(KEYS.foods, foods => foods.map(f => f.id === id ? { ...f, ...patch } : f), []);
    bus.emit('foods:changed');
  };
  const deleteFood = (id) => {
    store.update(KEYS.foods, foods => foods.filter(f => f.id !== id), []);
    bus.emit('foods:changed');
  };
  const searchFoods = (q) => {
    if (!q) return getFoods();
    const lq = q.toLowerCase();
    return getFoods().filter(f => f.name.toLowerCase().includes(lq) || (f.brand || '').toLowerCase().includes(lq));
  };

  /* ── RECIPES ── */
  const getRecipes = () => store.get(KEYS.recipes, []);
  const saveRecipes = (r) => store.set(KEYS.recipes, r);
  const getRecipeById = (id) => getRecipes().find(r => r.id === id) || null;
  const computeRecipeNutrients = (ingredients) => {
    let total = zeroNutrients();
    for (const ing of ingredients) {
      const food = getFoodById(ing.foodId);
      if (!food) continue;
      total = addNutrients(total, scaleNutrients(food.nutrients, ing.servings));
    }
    return total;
  };
  const addRecipe = (recipe) => {
    const r = {
      ...recipe,
      id: uid(),
      nutrients: computeRecipeNutrients(recipe.ingredients),
      createdAt: new Date().toISOString()
    };
    store.update(KEYS.recipes, rs => [...rs, r], []);
    bus.emit('recipes:changed');
    return r;
  };
  const updateRecipe = (id, patch) => {
    const update = { ...patch };
    if (patch.ingredients) update.nutrients = computeRecipeNutrients(patch.ingredients);
    store.update(KEYS.recipes, rs => rs.map(r => r.id === id ? { ...r, ...update } : r), []);
    bus.emit('recipes:changed');
  };
  const deleteRecipe = (id) => {
    store.update(KEYS.recipes, rs => rs.filter(r => r.id !== id), []);
    bus.emit('recipes:changed');
  };

  /* ── FOOD LOG ── */
  const getLogs = () => store.get(KEYS.logs, []);
  const getLogsForDate = (date) => getLogs().filter(l => l.date === date);
  const addLog = (entry) => {
    let nutrients;
    if (entry.recipeId) {
      const recipe = getRecipeById(entry.recipeId);
      nutrients = recipe ? scaleNutrients(recipe.nutrients, entry.servings) : zeroNutrients();
    } else {
      const food = getFoodById(entry.foodId);
      nutrients = food ? scaleNutrients(food.nutrients, entry.servings) : zeroNutrients();
    }
    const log = {
      id: uid(),
      date: entry.date || today(),
      meal: entry.meal || 'snack',
      foodId: entry.foodId || null,
      recipeId: entry.recipeId || null,
      servings: entry.servings || 1,
      nutrients,
      loggedAt: new Date().toISOString()
    };
    store.update(KEYS.logs, logs => [...logs, log], []);
    bus.emit('log:changed', { date: log.date });
    return log;
  };
  const deleteLog = (id) => {
    const log = getLogs().find(l => l.id === id);
    store.update(KEYS.logs, logs => logs.filter(l => l.id !== id), []);
    if (log) bus.emit('log:changed', { date: log.date });
  };
  const sumNutrients = (logs) => logs.reduce((acc, l) => addNutrients(acc, l.nutrients || {}), zeroNutrients());

  /* ── NUDGES ── */
  const buildNudges = (date) => {
    const logs = getLogsForDate(date || today());
    const totals = sumNutrients(logs);
    const targets = getTargets();
    const now = new Date();
    const hour = now.getHours();
    const nudges = [];

    const pct = (k) => targets[k] ? (totals[k] / targets[k]) * 100 : 0;

    if (hour >= 14 && pct('calories') < 40) {
      nudges.push({ type: 'warn', text: 'Calories are low for mid-afternoon. A protein-rich snack like Greek yogurt or almonds would help recovery.' });
    }
    if (pct('calcium') < 50) {
      nudges.push({ type: 'bone', text: `Calcium is at ${Math.round(pct('calcium'))}% of daily goal. Try milk, fortified OJ, or tofu.` });
    }
    if (pct('protein') < 60 && hour >= 12) {
      nudges.push({ type: 'recovery', text: `Protein at ${Math.round(pct('protein'))}%. Aim for ${targets.protein}g today to support healing.` });
    }
    if (pct('potassium') < 40 && hour >= 16) {
      nudges.push({ type: 'heart', text: 'Potassium is low. A banana, sweet potato, or avocado would help heart function.' });
    }
    if (pct('vitaminD') < 30) {
      nudges.push({ type: 'bone', text: 'Vitamin D is low — critical for hip bone healing. Salmon, sardines, or fortified milk are great sources.' });
    }
    if (totals.sodium > targets.sodium * 0.85 && hour < 18) {
      nudges.push({ type: 'warn', text: `Sodium is already at ${Math.round(pct('sodium'))}% of the daily limit. Watch processed foods.` });
    }
    if (pct('omega3dha') < 50 && hour >= 10) {
      nudges.push({ type: 'brain', text: 'Omega-3 DHA is low. Even a small serving of salmon or sardines today would support brain recovery.' });
    }

    // Recipe suggestions
    const recipes = getRecipes();
    if (nudges.length && recipes.length) {
      const deficient = Object.keys(NUTRIENTS).filter(k => NUTRIENTS[k].dv && pct(k) < 40);
      for (const r of recipes) {
        if (deficient.some(k => (r.nutrients[k] || 0) > (NUTRIENTS[k].dv * 0.2))) {
          nudges.push({ type: 'recipe', text: `Recipe suggestion: "${r.name}" would help with today's gaps.`, recipeId: r.id });
          break;
        }
      }
    }

    return nudges;
  };

  /* ── MEDICINES ── */
  const getMedicines = () => store.get(KEYS.medicines, []);
  const getMedById = (id) => getMedicines().find(m => m.id === id) || null;
  const addMedicine = (med) => {
    const m = { ...med, id: uid(), active: true, createdAt: new Date().toISOString() };
    store.update(KEYS.medicines, meds => [...meds, m], []);
    bus.emit('medicines:changed');
    return m;
  };
  const updateMedicine = (id, patch) => {
    store.update(KEYS.medicines, meds => meds.map(m => m.id === id ? { ...m, ...patch } : m), []);
    bus.emit('medicines:changed');
  };
  const deleteMedicine = (id) => {
    store.update(KEYS.medicines, meds => meds.filter(m => m.id !== id), []);
    bus.emit('medicines:changed');
  };

  /* ── MEDICINE LOGS ── */
  const getMedLogs = () => store.get(KEYS.medLogs, []);
  const getMedLogsForDate = (date) => getMedLogs().filter(l => l.date === date);
  const logMedTaken = (medicineId, scheduledTime) => {
    const date = localDateStr(new Date(scheduledTime));
    store.update(KEYS.medLogs, logs => {
      const existing = logs.find(l => l.medicineId === medicineId && l.scheduledTime === scheduledTime);
      if (existing) return logs.map(l => l.medicineId === medicineId && l.scheduledTime === scheduledTime
        ? { ...l, takenAt: new Date().toISOString(), skipped: false, snoozedUntil: null }
        : l);
      return [...logs, {
        id: uid(), medicineId, scheduledTime, date,
        takenAt: new Date().toISOString(), skipped: false, snoozedUntil: null
      }];
    }, []);
    bus.emit('medlog:changed');
  };
  const logMedSkipped = (medicineId, scheduledTime) => {
    const date = localDateStr(new Date(scheduledTime));
    store.update(KEYS.medLogs, logs => {
      const existing = logs.find(l => l.medicineId === medicineId && l.scheduledTime === scheduledTime);
      if (existing) return logs.map(l => l.medicineId === medicineId && l.scheduledTime === scheduledTime
        ? { ...l, skipped: true, takenAt: null }
        : l);
      return [...logs, { id: uid(), medicineId, scheduledTime, date, takenAt: null, skipped: true, snoozedUntil: null }];
    }, []);
    bus.emit('medlog:changed');
  };
  const snoozeMed = (medicineId, scheduledTime, minutes) => {
    const date = localDateStr(new Date(scheduledTime));
    const snoozedUntil = new Date(Date.now() + minutes * 60000).toISOString();
    store.update(KEYS.medLogs, logs => {
      const existing = logs.find(l => l.medicineId === medicineId && l.scheduledTime === scheduledTime);
      if (existing) return logs.map(l => l.medicineId === medicineId && l.scheduledTime === scheduledTime
        ? { ...l, snoozedUntil }
        : l);
      return [...logs, { id: uid(), medicineId, scheduledTime, date, takenAt: null, skipped: false, snoozedUntil }];
    }, []);
    bus.emit('medlog:changed');
    return snoozedUntil;
  };
  const getMedLogEntry = (medicineId, scheduledTime) =>
    getMedLogs().find(l => l.medicineId === medicineId && l.scheduledTime === scheduledTime) || null;

  /* ── CAREGIVER MODE ── */
  const getSettings = () => store.get(KEYS.settings, { caregiverMode: false });
  const saveSettings = (s) => { store.set(KEYS.settings, s); bus.emit('settings:changed', s); };
  const isCaregiver = () => getSettings().caregiverMode === true;
  const getCarePin = () => store.get(KEYS.carePin, null);
  const setCarePin = (pin) => store.set(KEYS.carePin, pin);
  const verifyCarePin = (pin) => {
    const stored = getCarePin();
    if (!stored) return true; // no pin set yet
    return stored === pin;
  };
  const setCaregiverMode = (on) => { saveSettings({ ...getSettings(), caregiverMode: on }); };

  /* ── TOAST ── */
  const showToast = (msg, type = 'info') => {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = msg;
    container.appendChild(el);
    setTimeout(() => el.remove(), 3200);
  };

  /* ── DRAWER ── */
  const openDrawer = (title, bodyHTML, footerHTML, onClose) => {
    const overlay = document.getElementById('overlay');
    const drawer = document.getElementById('drawer');
    document.getElementById('drawer-title').textContent = title;
    document.getElementById('drawer-body').innerHTML = bodyHTML;
    document.getElementById('drawer-footer').innerHTML = footerHTML || '';
    overlay.classList.add('open');
    drawer._onClose = onClose;
  };
  const closeDrawer = () => {
    const overlay = document.getElementById('overlay');
    if (!overlay) return;
    overlay.classList.remove('open');
    const drawer = document.getElementById('drawer');
    if (drawer && typeof drawer._onClose === 'function') {
      drawer._onClose();
      drawer._onClose = null;
    }
  };

  /* ── NAVIGATION ── */
  const navigateTo = (tab) => {
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    const panel = document.getElementById(`tab-${tab}`);
    const btn = document.querySelector(`[data-tab="${tab}"]`);
    if (panel) panel.classList.add('active');
    if (btn) btn.classList.add('active');
    bus.emit('tab:changed', tab);
  };

  /* ── FORMATTING ── */
  const fmtN = (val, decimals = 0) => {
    if (val == null || isNaN(val)) return '0';
    return Number(val).toFixed(decimals).replace(/\.0+$/, '');
  };
  const fmtNutrient = (key, val) => {
    const n = NUTRIENTS[key];
    if (!n) return String(val);
    const d = key === 'b12' || key === 'vitaminD' || key === 'vitaminK' ? 1 : 0;
    return `${fmtN(val, d)} ${n.unit}`;
  };
  const progressPct = (key, val) => {
    const n = NUTRIENTS[key];
    if (!n || !n.dv) return 0;
    return Math.min(100, Math.round((val / n.dv) * 100));
  };
  const progressClass = (key, val) => {
    const n = NUTRIENTS[key];
    if (!n || !n.dv) return '';
    const pct = (val / n.dv) * 100;
    if (n.limit) return pct > 100 ? 'over' : pct > 80 ? 'warn' : 'good';
    return pct >= 100 ? 'good' : pct >= 60 ? '' : pct < 30 ? 'warn' : '';
  };

  /* ── FOOD EMOJI HELPER ── */
  const foodEmoji = (name) => {
    const n = name.toLowerCase();
    if (n.includes('salmon') || n.includes('fish')) return '🐟';
    if (n.includes('sardine')) return '🐠';
    if (n.includes('egg')) return '🥚';
    if (n.includes('milk')) return '🥛';
    if (n.includes('yogurt')) return '🫙';
    if (n.includes('cheese')) return '🧀';
    if (n.includes('chicken')) return '🍗';
    if (n.includes('beef') || n.includes('liver')) return '🥩';
    if (n.includes('spinach') || n.includes('kale')) return '🥬';
    if (n.includes('broccoli')) return '🥦';
    if (n.includes('avocado')) return '🥑';
    if (n.includes('banana')) return '🍌';
    if (n.includes('orange')) return '🍊';
    if (n.includes('blueberr')) return '🫐';
    if (n.includes('sweet potato') || n.includes('potato')) return '🍠';
    if (n.includes('almond') || n.includes('walnut') || n.includes('nut')) return '🥜';
    if (n.includes('oat') || n.includes('cereal')) return '🥣';
    if (n.includes('bread')) return '🍞';
    if (n.includes('bean') || n.includes('lentil')) return '🫘';
    if (n.includes('tofu')) return '🧆';
    if (n.includes('cottage')) return '🫙';
    if (n.includes('juice')) return '🧃';
    if (n.includes('recipe') || n.includes('smoothie') || n.includes('bowl')) return '🍲';
    return '🍽️';
  };

  /* ── MEDICINE COLORS ── */
  const MED_COLORS = ['#4a7c6f','#e67e22','#8b6f2e','#6b48a0','#b5344a','#1d6fa4','#27ae60','#c0392b'];
  const medColor = (idx) => MED_COLORS[idx % MED_COLORS.length];

  /* ── WEIGHT PROJECTION ── */
  const weightProjection = (days = 7) => {
    const targets = getTargets();
    const allLogs = getLogs();
    const now = new Date();
    let totalBalance = 0;
    let count = 0;
    for (let i = 0; i < days; i++) {
      const d = new Date(now); d.setDate(d.getDate() - i);
      const ds = localDateStr(d);
      const dayLogs = allLogs.filter(l => l.date === ds);
      if (dayLogs.length) {
        const totals = sumNutrients(dayLogs);
        totalBalance += totals.calories - targets.calories;
        count++;
      }
    }
    if (!count) return null;
    const avgBalance = totalBalance / count;
    const lbsPerWeek = (avgBalance * 7) / 3500;
    const kgPerWeek = lbsPerWeek * 0.453592;
    return { avgBalance: Math.round(avgBalance), kgPerWeek: +kgPerWeek.toFixed(2), lbsPerWeek: +lbsPerWeek.toFixed(2) };
  };

  /* ── HISTORY (last N days totals) ── */
  const getHistoryTotals = (days = 7) => {
    const out = [];
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i);
      const ds = localDateStr(d);
      const logs = getLogsForDate(ds);
      out.push({ date: ds, totals: sumNutrients(logs), count: logs.length });
    }
    return out;
  };

  /* ── EXPORT DATA ── */
  const exportData = () => {
    const data = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      profile: getProfile(),
      targets: getTargets(),
      foods: getFoods(),
      recipes: getRecipes(),
      logs: getLogs(),
      medicines: getMedicines(),
      medLogs: getMedLogs()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `nutricare-backup-${today()}.json`;
    a.click(); URL.revokeObjectURL(url);
  };

  const importData = (json) => {
    try {
      const data = JSON.parse(json);
      if (data.profile) store.set(KEYS.profile, data.profile);
      if (data.targets) store.set(KEYS.targets, data.targets);
      if (data.foods) store.set(KEYS.foods, data.foods);
      if (data.recipes) store.set(KEYS.recipes, data.recipes);
      if (data.logs) store.set(KEYS.logs, data.logs);
      if (data.medicines) store.set(KEYS.medicines, data.medicines);
      if (data.medLogs) store.set(KEYS.medLogs, data.medLogs);
      bus.emit('data:imported');
      return true;
    } catch { return false; }
  };

  /* ── EXPOSE GLOBAL ── */
  window.NC = {
    KEYS, NUTRIENTS, GROUP_META,
    store, bus,
    uid, today, localDateStr, formatDate, formatTime, hhmm, hhmmToday,
    zeroNutrients, scaleNutrients, addNutrients,
    getProfile, saveProfile,
    getTargets, saveTargets, DEFAULT_TARGETS,
    getFoods, saveFoods, getFoodById, addFood, updateFood, deleteFood, searchFoods,
    getRecipes, saveRecipes, getRecipeById, computeRecipeNutrients, addRecipe, updateRecipe, deleteRecipe,
    getLogs, getLogsForDate, addLog, deleteLog, sumNutrients,
    buildNudges,
    getMedicines, getMedById, addMedicine, updateMedicine, deleteMedicine,
    getMedLogs, getMedLogsForDate, logMedTaken, logMedSkipped, snoozeMed, getMedLogEntry,
    getSettings, saveSettings, isCaregiver, getCarePin, setCarePin, verifyCarePin, setCaregiverMode,
    showToast, openDrawer, closeDrawer, navigateTo,
    fmtN, fmtNutrient, progressPct, progressClass,
    foodEmoji, medColor, MED_COLORS,
    weightProjection, getHistoryTotals,
    exportData, importData
  };
})();
