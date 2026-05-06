/* NutriCare — Daily food log module */
(function () {
  'use strict';

  const MEALS = [
    { id: 'breakfast', label: 'Breakfast', icon: '🌅' },
    { id: 'lunch', label: 'Lunch', icon: '☀️' },
    { id: 'dinner', label: 'Dinner', icon: '🌙' },
    { id: 'snack', label: 'Snack', icon: '🍎' }
  ];

  let _currentDate = NC.today();
  let _addForMeal = null;

  const render = (date) => {
    _currentDate = date || NC.today();
    const logs = NC.getLogsForDate(_currentDate);
    const totals = NC.sumNutrients(logs);
    const targets = NC.getTargets();
    const nudges = NC.buildNudges(_currentDate);

    const isToday = _currentDate === NC.today();

    return `
      <div class="date-header">
        ${isToday ? 'Today' : ''} <span>${NC.formatDate(_currentDate)}</span>
        ${!isToday ? `<button class="btn btn-sm btn-secondary" onclick="NCLog.goToday()" style="margin-left:8px">Go to Today</button>` : ''}
      </div>

      ${renderCalorieRing(totals, targets)}

      ${nudges.length ? renderNudges(nudges) : ''}

      ${MEALS.map(m => renderMealSection(m, logs)).join('')}

      <div style="height:16px"></div>
    `;
  };

  const renderCalorieRing = (totals, targets) => {
    const cal = totals.calories || 0;
    const target = targets.calories || 1600;
    const pct = Math.min(100, Math.round((cal / target) * 100));
    const r = 38, circ = 2 * Math.PI * r;
    const dash = circ * (pct / 100);
    const color = pct >= 100 ? 'var(--success)' : pct >= 60 ? 'var(--primary)' : 'var(--warning)';

    const macros = ['protein', 'carbs', 'fat', 'fiber'];

    return `
    <div class="card" style="padding:16px">
      <div class="calorie-ring-wrap">
        <div class="calorie-ring">
          <svg width="90" height="90" viewBox="0 0 90 90">
            <circle cx="45" cy="45" r="${r}" fill="none" stroke="var(--border)" stroke-width="8"/>
            <circle cx="45" cy="45" r="${r}" fill="none" stroke="${color}" stroke-width="8"
              stroke-dasharray="${dash.toFixed(1)} ${circ.toFixed(1)}"
              stroke-linecap="round"/>
          </svg>
          <div class="calorie-ring-text">
            <span class="kcal">${Math.round(cal)}</span>
            <span class="kcal-label">/ ${target} kcal</span>
          </div>
        </div>
        <div>
          <div style="font-size:0.78rem;color:var(--text-muted);margin-bottom:8px">
            ${pct}% of daily goal
          </div>
          <div class="macro-pills">
            ${macros.map(k => {
              const v = totals[k] || 0;
              const dv = NC.NUTRIENTS[k]?.dv;
              const u = NC.NUTRIENTS[k]?.unit || 'g';
              return `<span class="macro-pill ${k}">${NC.NUTRIENTS[k].label.split(' ')[0]}: ${NC.fmtN(v)}${u}${dv ? `<span style="color:var(--text-muted);font-weight:400"> / ${dv}${u}</span>` : ''}</span>`;
            }).join('')}
          </div>
        </div>
      </div>
    </div>`;
  };

  const renderNudges = (nudges) => nudges.slice(0, 2).map(n => `
    <div class="nudge-card">
      <div class="nudge-title">${nudgeIcon(n.type)} Nudge</div>
      <div class="nudge-text">${n.text}</div>
      ${n.recipeId ? `<button class="btn btn-sm btn-secondary" style="margin-top:8px" onclick="NCLog.logRecipe('${n.recipeId}')">Log this recipe</button>` : ''}
    </div>
  `).join('');

  const nudgeIcon = (type) => {
    const map = { bone:'🦴', brain:'🧠', heart:'❤️', recovery:'💪', warn:'⚠️', recipe:'🍲' };
    return map[type] || '💡';
  };

  const renderMealSection = (meal, logs) => {
    const mealLogs = logs.filter(l => l.meal === meal.id);
    return `
    <div class="meal-section">
      <div class="meal-label">${meal.icon} ${meal.label}</div>
      ${mealLogs.map(l => renderLogItem(l)).join('')}
      <button class="add-food-btn" onclick="NCLog.openAddFood('${meal.id}')">
        + Add to ${meal.label}
      </button>
    </div>`;
  };

  const renderLogItem = (log) => {
    let name, detail;
    if (log.recipeId) {
      const r = NC.getRecipeById(log.recipeId);
      name = r ? r.name : 'Unknown Recipe';
      detail = `${log.servings} serving${log.servings !== 1 ? 's' : ''}`;
    } else {
      const f = NC.getFoodById(log.foodId);
      name = f ? f.name : 'Unknown Food';
      detail = f ? `${NC.fmtN(log.servings, 1)} × ${f.servingUnit}` : '';
    }
    const cal = Math.round(log.nutrients?.calories || 0);
    return `
    <div class="log-item">
      <span style="font-size:1.4rem">${log.recipeId ? '🍲' : NC.foodEmoji(name)}</span>
      <div class="log-item-info">
        <div class="log-item-name">${name}</div>
        <div class="log-item-detail">${detail}</div>
      </div>
      <span class="log-item-kcal">${cal} kcal</span>
      <button class="log-item-del" onclick="NCLog.deleteLog('${log.id}')" title="Remove">✕</button>
    </div>`;
  };

  /* ── ADD FOOD DRAWER ── */
  let _searchResults = [];
  let _selectedFood = null;
  let _selectedRecipe = null;

  const openAddFood = (meal) => {
    _addForMeal = meal;
    _selectedFood = null;
    _selectedRecipe = null;
    _searchResults = [...NC.getRecipes().slice(0, 3), ...NC.getFoods().slice(0, 12)];

    NC.openDrawer(
      `Add to ${MEALS.find(m => m.id === meal)?.label || meal}`,
      buildAddFoodBody(),
      `<button class="btn btn-secondary btn-full" onclick="NC.closeDrawer()">Cancel</button>
       <button class="btn btn-primary btn-full" id="confirm-log-btn" onclick="NCLog.confirmLog()" disabled>Log Food</button>`,
      () => { _selectedFood = null; _selectedRecipe = null; }
    );
    setTimeout(() => attachAddFoodEvents(), 50);
  };

  const buildAddFoodBody = () => {
    const recipes = NC.getRecipes();
    const foods = NC.getFoods();
    return `
      <div class="search-wrap" style="margin-bottom:12px">
        <span class="search-icon">🔍</span>
        <input type="search" class="search-input" id="food-search-input"
          placeholder="Search foods and recipes…" autocomplete="off">
      </div>
      <div id="food-search-results">
        ${recipes.length ? `<div class="section-head">My Recipes</div>
          ${recipes.slice(0,3).map(r => renderSearchRecipe(r)).join('')}` : ''}
        <div class="section-head">Foods</div>
        ${foods.slice(0, 10).map(f => renderSearchFood(f)).join('')}
        <button class="btn btn-secondary btn-full" style="margin-top:10px" onclick="NCLog.openNewFood()">+ Enter new food</button>
      </div>
      <div id="serving-picker" style="display:none;margin-top:16px">
        <div class="card" id="selected-food-card"></div>
        <div class="form-group" style="margin-top:12px">
          <label class="form-label">Servings</label>
          <div style="display:flex;align-items:center;gap:12px">
            <button class="btn btn-secondary btn-sm" id="serving-dec">−</button>
            <input type="number" class="form-input" id="serving-input" value="1" min="0.25" step="0.25" style="text-align:center;width:90px">
            <button class="btn btn-secondary btn-sm" id="serving-inc">+</button>
          </div>
        </div>
        <div id="serving-nutrients" style="font-size:0.82rem;color:var(--text-muted);margin-top:4px"></div>
      </div>
    `;
  };

  const renderSearchFood = (food) => `
    <div class="food-item" onclick="NCLog.selectFood('${food.id}')">
      <span class="food-emoji">${food.emoji || NC.foodEmoji(food.name)}</span>
      <div class="food-info">
        <div class="food-name">${food.name}</div>
        <div class="food-detail">${food.servingUnit}</div>
      </div>
      <div class="food-kcal">${Math.round(food.nutrients?.calories || 0)} kcal</div>
    </div>`;

  const renderSearchRecipe = (recipe) => `
    <div class="food-item" onclick="NCLog.selectRecipe('${recipe.id}')">
      <span class="food-emoji">🍲</span>
      <div class="food-info">
        <div class="food-name">${recipe.name}</div>
        <div class="food-detail">Recipe · ${Math.round(recipe.nutrients?.calories || 0)} kcal/serving</div>
      </div>
      <span class="food-tag">Recipe</span>
    </div>`;

  const attachAddFoodEvents = () => {
    const input = document.getElementById('food-search-input');
    if (!input) return;
    input.addEventListener('input', () => {
      const q = input.value.trim();
      const results = document.getElementById('food-search-results');
      if (!results) return;
      if (!q) {
        results.innerHTML = buildDefaultSearchList();
        return;
      }
      const foods = NC.searchFoods(q);
      const recipes = NC.getRecipes().filter(r => r.name.toLowerCase().includes(q.toLowerCase()));
      results.innerHTML = `
        ${recipes.length ? `<div class="section-head">Recipes</div>${recipes.map(r => renderSearchRecipe(r)).join('')}` : ''}
        ${foods.length ? `<div class="section-head">Foods</div>${foods.map(f => renderSearchFood(f)).join('')}` : ''}
        ${!foods.length && !recipes.length ? `<div class="empty-state"><div class="empty-state-icon">🔍</div><div class="empty-state-title">No results</div></div>` : ''}
        <button class="btn btn-secondary btn-full" style="margin-top:10px" onclick="NCLog.openNewFood()">+ Enter new food</button>
      `;
    });
  };

  const buildDefaultSearchList = () => {
    const recipes = NC.getRecipes();
    const foods = NC.getFoods();
    return `
      ${recipes.length ? `<div class="section-head">My Recipes</div>${recipes.slice(0,3).map(r => renderSearchRecipe(r)).join('')}` : ''}
      <div class="section-head">Foods</div>
      ${foods.slice(0,10).map(f => renderSearchFood(f)).join('')}
      <button class="btn btn-secondary btn-full" style="margin-top:10px" onclick="NCLog.openNewFood()">+ Enter new food</button>
    `;
  };

  const selectFood = (id) => {
    const food = NC.getFoodById(id);
    if (!food) return;
    _selectedFood = food;
    _selectedRecipe = null;
    showServingPicker(food.name, food.servingUnit, food.nutrients, food.emoji || NC.foodEmoji(food.name));
  };

  const selectRecipe = (id) => {
    const recipe = NC.getRecipeById(id);
    if (!recipe) return;
    _selectedRecipe = recipe;
    _selectedFood = null;
    showServingPicker(recipe.name, 'serving', recipe.nutrients, '🍲');
  };

  const showServingPicker = (name, unit, nutrients, emoji) => {
    const search = document.getElementById('food-search-results');
    const picker = document.getElementById('serving-picker');
    const card = document.getElementById('selected-food-card');
    const btn = document.getElementById('confirm-log-btn');
    if (search) search.style.display = 'none';
    if (picker) picker.style.display = 'block';
    if (btn) btn.disabled = false;
    if (card) card.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px">
        <span style="font-size:1.8rem">${emoji}</span>
        <div>
          <div style="font-weight:700">${name}</div>
          <div style="font-size:0.82rem;color:var(--text-muted)">${unit}</div>
        </div>
      </div>
    `;
    updateServingNutrients(nutrients, 1);
    attachServingEvents(nutrients);
  };

  const attachServingEvents = (nutrients) => {
    const inp = document.getElementById('serving-input');
    const dec = document.getElementById('serving-dec');
    const inc = document.getElementById('serving-inc');
    if (!inp) return;
    const update = () => updateServingNutrients(nutrients, parseFloat(inp.value) || 1);
    inp.addEventListener('input', update);
    dec && dec.addEventListener('click', () => { inp.value = Math.max(0.25, (parseFloat(inp.value) || 1) - 0.25).toFixed(2).replace(/\.?0+$/, ''); update(); });
    inc && inc.addEventListener('click', () => { inp.value = ((parseFloat(inp.value) || 1) + 0.25).toFixed(2).replace(/\.?0+$/, ''); update(); });
  };

  const updateServingNutrients = (nutrients, servings) => {
    const el = document.getElementById('serving-nutrients');
    if (!el) return;
    const s = NC.scaleNutrients(nutrients, servings);
    el.innerHTML = `Protein: ${NC.fmtN(s.protein)}g · Carbs: ${NC.fmtN(s.carbs)}g · Fat: ${NC.fmtN(s.fat)}g · Fiber: ${NC.fmtN(s.fiber)}g`;
  };

  const confirmLog = () => {
    const inp = document.getElementById('serving-input');
    const servings = parseFloat(inp?.value) || 1;
    if (_selectedFood) {
      NC.addLog({ date: _currentDate, meal: _addForMeal, foodId: _selectedFood.id, servings });
      NC.showToast(`${_selectedFood.name} logged ✓`, 'success');
    } else if (_selectedRecipe) {
      NC.addLog({ date: _currentDate, meal: _addForMeal, recipeId: _selectedRecipe.id, servings });
      NC.showToast(`${_selectedRecipe.name} logged ✓`, 'success');
    }
    NC.closeDrawer();
    renderToPanel();
  };

  const openNewFood = () => {
    NC.closeDrawer();
    setTimeout(() => NC.navigateTo('foods'), 200);
    setTimeout(() => NCFoods && NCFoods.openNewFood(true, _addForMeal, _currentDate), 400);
  };

  const logRecipe = (recipeId) => {
    openAddFood('snack');
    setTimeout(() => selectRecipe(recipeId), 100);
  };

  const deleteLog = (id) => {
    NC.deleteLog(id);
    renderToPanel();
  };

  const goToday = () => {
    _currentDate = NC.today();
    renderToPanel();
  };

  const renderToPanel = () => {
    const panel = document.getElementById('tab-today');
    if (!panel) return;
    panel.innerHTML = render(_currentDate);
  };

  NC.bus.on('tab:changed', tab => { if (tab === 'today') renderToPanel(); });
  NC.bus.on('log:changed', () => { if (document.getElementById('tab-today')?.classList.contains('active')) renderToPanel(); });

  window.NCLog = { render, renderToPanel, openAddFood, selectFood, selectRecipe, confirmLog, deleteLog, goToday, openNewFood, logRecipe };
})();
