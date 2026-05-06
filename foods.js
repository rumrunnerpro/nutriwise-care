/* NutriCare — Foods & Recipes browser + custom food entry */
(function () {
  'use strict';

  let _pendingMeal = null;
  let _pendingDate = null;
  let _pendingLogAfterSave = false;

  const render = () => {
    const foods = NC.getFoods();
    const recipes = NC.getRecipes();
    return `
      <div class="search-wrap" style="margin-top:8px">
        <span class="search-icon">🔍</span>
        <input type="search" class="search-input" id="foods-search"
          placeholder="Search foods and recipes…" autocomplete="off">
      </div>
      <div id="foods-list">
        ${renderFoodsList(recipes, foods)}
      </div>
      <div style="padding:16px 0">
        <button class="btn btn-primary btn-full" onclick="NCFoods.openNewFood()">+ Add Custom Food</button>
      </div>
      <div style="height:8px"></div>
    `;
  };

  const renderFoodsList = (recipes, foods) => {
    const customFoods = foods.filter(f => f.custom);
    const builtinFoods = foods.filter(f => !f.custom);
    return `
      ${recipes.length ? `
        <div class="section-head">My Recipes (${recipes.length})</div>
        ${recipes.map(r => renderRecipeItem(r)).join('')}
      ` : ''}
      ${customFoods.length ? `
        <div class="section-head">My Foods (${customFoods.length})</div>
        ${customFoods.map(f => renderFoodItem(f)).join('')}
      ` : ''}
      <div class="section-head">Food Database (${builtinFoods.length})</div>
      ${builtinFoods.map(f => renderFoodItem(f)).join('')}
    `;
  };

  const renderFoodItem = (food) => `
    <div class="food-item" onclick="NCFoods.openFoodDetail('${food.id}')">
      <span class="food-emoji">${food.emoji || NC.foodEmoji(food.name)}</span>
      <div class="food-info">
        <div class="food-name">${food.name}</div>
        <div class="food-detail">${food.servingUnit}</div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
        <span class="food-kcal">${Math.round(food.nutrients?.calories || 0)} kcal</span>
        ${food.custom ? '<span class="food-tag custom">Custom</span>' : ''}
      </div>
    </div>`;

  const renderRecipeItem = (recipe) => `
    <div class="food-item" onclick="NCFoods.openRecipeDetail('${recipe.id}')">
      <span class="food-emoji">🍲</span>
      <div class="food-info">
        <div class="food-name">${recipe.name}</div>
        <div class="food-detail">${recipe.ingredients?.length || 0} ingredients · ${Math.round(recipe.nutrients?.calories || 0)} kcal/serving</div>
      </div>
      <span class="food-tag">Recipe</span>
    </div>`;

  /* ── FOOD DETAIL DRAWER ── */
  const openFoodDetail = (id) => {
    const food = NC.getFoodById(id);
    if (!food) return;
    const groups = ['macro', 'bone', 'brain', 'heart', 'recovery'];
    const nutrientRows = groups.map(g => {
      const keys = Object.entries(NC.NUTRIENTS).filter(([k, n]) => n.group === g);
      if (!keys.length) return '';
      const meta = NC.GROUP_META[g];
      return `
        <div style="margin-bottom:16px">
          <span class="group-label ${g}">${meta.icon} ${meta.label}</span>
          ${keys.map(([k, n]) => {
            const val = food.nutrients?.[k] || 0;
            const pct = NC.progressPct(k, val);
            const cls = NC.progressClass(k, val);
            return `
              <div class="progress-bar-wrap group-${g}">
                <div class="progress-bar-label">
                  <span class="name">${n.label}</span>
                  <span class="value">${NC.fmtNutrient(k, val)}${n.dv ? ` <span style="color:var(--text-muted)">/ ${n.dv}${n.unit}</span>` : ''}</span>
                </div>
                ${n.dv ? `<div class="progress-bar-track"><div class="progress-bar-fill ${cls}" style="width:${pct}%"></div></div>` : ''}
              </div>`;
          }).join('')}
        </div>`;
    }).join('');

    const footer = food.custom
      ? `<button class="btn btn-danger" onclick="NCFoods.deleteFood('${food.id}')">Delete</button>
         <button class="btn btn-secondary" onclick="NCFoods.editFood('${food.id}')">Edit</button>
         <button class="btn btn-primary flex-1" onclick="NC.closeDrawer()">Done</button>`
      : `<button class="btn btn-primary btn-full" onclick="NC.closeDrawer()">Done</button>`;

    NC.openDrawer(
      `${food.emoji || NC.foodEmoji(food.name)} ${food.name}`,
      `<div style="font-size:0.85rem;color:var(--text-muted);margin-bottom:16px">Per ${food.servingUnit}</div>${nutrientRows}`,
      `<div style="display:flex;gap:8px;width:100%">${footer}</div>`
    );
  };

  /* ── RECIPE DETAIL DRAWER ── */
  const openRecipeDetail = (id) => {
    const recipe = NC.getRecipeById(id);
    if (!recipe) return;

    const ingredientList = (recipe.ingredients || []).map(ing => {
      const food = NC.getFoodById(ing.foodId);
      if (!food) return `<div class="ingredient-item"><div class="ingredient-info"><div class="ingredient-name">Unknown food</div></div></div>`;
      return `
        <div class="ingredient-item">
          <span>${food.emoji || NC.foodEmoji(food.name)}</span>
          <div class="ingredient-info">
            <div class="ingredient-name">${food.name}</div>
            <div class="ingredient-qty">${NC.fmtN(ing.servings, 2).replace(/\.?0+$/, '')} × ${food.servingUnit}</div>
          </div>
        </div>`;
    }).join('');

    const totals = recipe.nutrients || NC.zeroNutrients();
    const macroSummary = `
      <div class="macro-pills" style="flex-wrap:wrap;margin-bottom:16px">
        <span class="macro-pill protein">Protein: ${NC.fmtN(totals.protein)}g</span>
        <span class="macro-pill carbs">Carbs: ${NC.fmtN(totals.carbs)}g</span>
        <span class="macro-pill fat">Fat: ${NC.fmtN(totals.fat)}g</span>
        <span class="macro-pill fiber">Fiber: ${NC.fmtN(totals.fiber)}g</span>
      </div>`;

    NC.openDrawer(
      `🍲 ${recipe.name}`,
      `<div style="font-size:0.9rem;color:var(--text-muted);margin-bottom:10px">${Math.round(totals.calories)} kcal per serving</div>
       ${macroSummary}
       <div class="section-head">Ingredients</div>
       ${ingredientList}`,
      `<div style="display:flex;gap:8px;width:100%">
        <button class="btn btn-danger" onclick="NCFoods.deleteRecipe('${recipe.id}')">Delete</button>
        <button class="btn btn-secondary" onclick="NCFoods.openRecipeBuilder('${recipe.id}')">Edit</button>
        <button class="btn btn-primary flex-1" onclick="NC.closeDrawer()">Done</button>
      </div>`
    );
  };

  /* ── NEW / EDIT FOOD DRAWER ── */
  const openNewFood = (logAfter = false, meal = null, date = null) => {
    _pendingLogAfterSave = logAfter;
    _pendingMeal = meal;
    _pendingDate = date;
    openFoodForm(null);
  };

  const editFood = (id) => {
    NC.closeDrawer();
    setTimeout(() => openFoodForm(id), 300);
  };

  const openFoodForm = (editId) => {
    const food = editId ? NC.getFoodById(editId) : null;
    const f = food || {};
    const n = f.nutrients || {};
    const hasWA = typeof NCWolfram !== 'undefined' && NCWolfram.hasAppId();

    const nutFields = Object.entries(NC.NUTRIENTS).map(([k, def]) => {
      const val = n[k] ?? '';
      const step = def.unit === 'mcg' && def.dv && def.dv < 10 ? '0.1' : '1';
      return `
        <div class="form-group" style="margin-bottom:10px">
          <label class="form-label" id="fn_lbl_${k}">${def.label} <span style="font-weight:400;color:var(--text-muted)">(${def.unit})</span></label>
          <input type="number" class="form-input" id="fn_${k}" value="${val !== '' ? val : ''}"
            placeholder="0" min="0" step="${step}">
        </div>`;
    }).join('');

    const waSection = hasWA ? `
      <div style="background:var(--primary-bg);border:1.5px solid var(--primary-light);border-radius:var(--radius-sm);padding:14px;margin-bottom:16px">
        <div style="font-size:0.82rem;font-weight:700;color:var(--primary-dark);margin-bottom:8px">🔬 WolframAlpha Nutrition Lookup</div>
        <div style="font-size:0.78rem;color:var(--text-muted);margin-bottom:10px">
          Type a food name and quantity, then tap Look Up to auto-fill nutrients from WolframAlpha.
          Values are per the amount in your query — adjust serving size to match.
        </div>
        <div style="display:flex;gap:8px">
          <input type="text" class="form-input" id="wa-query"
            placeholder="e.g. salmon 100g" style="flex:1;min-height:44px">
          <button class="btn btn-secondary" id="wa-btn" onclick="NCFoods.waLookup()" style="white-space:nowrap;min-width:80px">Look Up</button>
        </div>
        <div id="wa-status" style="font-size:0.82rem;margin-top:8px;min-height:18px;line-height:1.4"></div>
      </div>` : '';

    NC.openDrawer(
      food ? `Edit: ${food.name}` : 'Add Custom Food',
      `<div style="font-size:0.85rem;color:var(--text-muted);margin-bottom:16px">Nutrients are per one serving.</div>
      <div class="form-group">
        <label class="form-label">Food Name <span class="required">*</span></label>
        <input type="text" class="form-input" id="fn_name" value="${f.name || ''}"
          placeholder="e.g. Almond Milk" oninput="NCFoods.waQuerySync(this.value)">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Serving Size</label>
          <input type="number" class="form-input" id="fn_size" value="${f.servingSize || 1}" min="0.1" step="0.1">
        </div>
        <div class="form-group">
          <label class="form-label">Serving Unit</label>
          <input type="text" class="form-input" id="fn_unit" value="${f.servingUnit || ''}" placeholder="e.g. cup, oz">
        </div>
      </div>
      ${waSection}
      <div style="font-weight:700;margin-bottom:12px">Nutrition Facts <span style="font-size:0.8rem;font-weight:400;color:var(--text-muted)">(per serving)</span></div>
      ${nutFields}`,
      `<div style="display:flex;gap:8px;width:100%">
        <button class="btn btn-secondary" onclick="NC.closeDrawer()">Cancel</button>
        <button class="btn btn-primary flex-1" onclick="NCFoods.saveFood('${editId || ''}')">Save Food</button>
      </div>`
    );

    /* Pre-fill the WA query from the food name if editing */
    if (hasWA && f.name) {
      setTimeout(() => {
        const q = document.getElementById('wa-query');
        if (q && !q.value) q.value = `${f.name} nutrition`;
      }, 50);
    }
  };

  /* Sync food name → WA query box while user types (only if box is still the auto-generated value) */
  const waQuerySync = (name) => {
    const q = document.getElementById('wa-query');
    if (!q) return;
    /* Only auto-update if user hasn't manually edited the query */
    if (!q.dataset.userEdited) q.value = name ? `${name} nutrition` : '';
    q.addEventListener('input', () => { q.dataset.userEdited = '1'; }, { once: true });
  };

  /* ── WOLFRAMALPHA LOOKUP ── */
  const waLookup = async () => {
    const query = document.getElementById('wa-query')?.value?.trim();
    const status = document.getElementById('wa-status');
    const btn = document.getElementById('wa-btn');
    if (!query || !status || !btn) return;

    btn.disabled = true;
    btn.textContent = '…';
    status.innerHTML = '<span style="color:var(--text-muted)">Querying WolframAlpha…</span>';

    try {
      const result = await NCWolfram.lookup(query);
      const { nutrients, matched } = result;

      if (!matched.length) {
        status.innerHTML = '<span style="color:var(--warning)">⚠️ No nutrition data found for this query. Try a different description.</span>';
        btn.disabled = false; btn.textContent = 'Look Up';
        return;
      }

      /* Populate form inputs and highlight them */
      let populated = 0;
      for (const [key, val] of Object.entries(nutrients)) {
        const el = document.getElementById(`fn_${key}`);
        if (el) {
          el.value = val;
          /* Flash highlight */
          el.style.borderColor = 'var(--primary)';
          el.style.background = 'var(--primary-bg)';
          setTimeout(() => {
            el.style.borderColor = '';
            el.style.background = '';
          }, 2000);
          populated++;
        }
      }

      const missed = Object.keys(NC.NUTRIENTS).length - populated;
      status.innerHTML = `
        <span style="color:var(--success);font-weight:700">✓ Filled ${populated} fields</span>
        <span style="color:var(--text-muted)"> · ${missed} remain blank — enter manually if known.</span>
        <br><span style="color:var(--text-muted);font-size:0.75rem">Matched: ${matched.join(', ')}</span>`;

    } catch (err) {
      let msg = err.message || 'Lookup failed.';
      if (err.code === 'no_appid') {
        msg = 'No App ID set — add your WolframAlpha key in Profile settings.';
      } else if (err.code === 'auth') {
        msg = 'App ID rejected — check the key in Profile → WolframAlpha.';
      } else if (err.code === 'no_results') {
        msg = 'No results. Try rephrasing — e.g. "100g salmon" or "1 cup greek yogurt".';
        if (err.suggestions?.length) msg += ` Did you mean: ${err.suggestions.join(', ')}?`;
      } else if (err.code === 'network') {
        msg = 'Network error — the app needs internet access for WolframAlpha lookups.';
      }
      status.innerHTML = `<span style="color:var(--danger)">✕ ${msg}</span>`;
    }

    btn.disabled = false;
    btn.textContent = 'Look Up';
  };

  const saveFood = (editId) => {
    const name = document.getElementById('fn_name')?.value.trim();
    if (!name) { NC.showToast('Food name is required', 'error'); return; }
    const nutrients = {};
    Object.keys(NC.NUTRIENTS).forEach(k => {
      const el = document.getElementById(`fn_${k}`);
      nutrients[k] = parseFloat(el?.value) || 0;
    });
    const food = {
      name,
      servingSize: parseFloat(document.getElementById('fn_size')?.value) || 1,
      servingUnit: document.getElementById('fn_unit')?.value.trim() || 'serving',
      nutrients,
      emoji: NC.foodEmoji(name)
    };

    if (editId) {
      NC.updateFood(editId, food);
      NC.showToast('Food updated ✓', 'success');
    } else {
      const saved = NC.addFood(food);
      NC.showToast('Food saved ✓', 'success');
      if (_pendingLogAfterSave && _pendingMeal) {
        NC.closeDrawer();
        setTimeout(() => {
          NC.addLog({ date: _pendingDate || NC.today(), meal: _pendingMeal, foodId: saved.id, servings: 1 });
          NC.showToast('Food also logged ✓', 'success');
          NC.navigateTo('today');
        }, 300);
        return;
      }
    }
    NC.closeDrawer();
    renderToPanel();
  };

  const deleteFood = (id) => {
    if (!confirm('Delete this food?')) return;
    NC.deleteFood(id);
    NC.closeDrawer();
    NC.showToast('Food deleted', 'info');
    renderToPanel();
  };

  /* ── RECIPE BUILDER ── */
  let _recipeIngredients = [];
  let _editingRecipeId = null;

  const openRecipeBuilder = (editId) => {
    NC.closeDrawer();
    _editingRecipeId = editId || null;
    _recipeIngredients = [];
    if (editId) {
      const r = NC.getRecipeById(editId);
      if (r) _recipeIngredients = [...r.ingredients];
    }
    setTimeout(() => showRecipeBuilderDrawer(editId), 300);
  };

  const showRecipeBuilderDrawer = (editId) => {
    const recipe = editId ? NC.getRecipeById(editId) : null;
    NC.openDrawer(
      recipe ? 'Edit Recipe' : 'New Recipe',
      buildRecipeBuilderBody(recipe),
      `<div style="display:flex;gap:8px;width:100%">
        <button class="btn btn-secondary" onclick="NC.closeDrawer()">Cancel</button>
        <button class="btn btn-primary flex-1" onclick="NCFoods.saveRecipe('${editId || ''}')">Save Recipe</button>
      </div>`
    );
  };

  const buildRecipeBuilderBody = (recipe) => {
    return `
      <div class="form-group">
        <label class="form-label">Recipe Name <span class="required">*</span></label>
        <input type="text" class="form-input" id="recipe-name" value="${recipe?.name || ''}" placeholder="e.g. Morning Smoothie">
      </div>
      <div class="form-group">
        <label class="form-label">Servings This Makes</label>
        <input type="number" class="form-input" id="recipe-servings" value="${recipe?.servings || 1}" min="1" step="1">
      </div>
      <hr class="divider">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
        <div style="font-weight:700">Ingredients</div>
        <button class="btn btn-sm btn-secondary" onclick="NCFoods.addIngredient()">+ Add</button>
      </div>
      <div id="ingredient-list">${renderIngredientList()}</div>
      ${_recipeIngredients.length === 0 ? `<div class="empty-state" style="padding:20px 0"><div class="empty-state-icon">🧂</div><div class="empty-state-text">No ingredients yet. Tap + Add.</div></div>` : ''}
    `;
  };

  const renderIngredientList = () => _recipeIngredients.map((ing, i) => {
    const food = NC.getFoodById(ing.foodId);
    if (!food) return '';
    return `
      <div class="ingredient-item" id="ing-${i}">
        <span>${food.emoji || NC.foodEmoji(food.name)}</span>
        <div class="ingredient-info">
          <div class="ingredient-name">${food.name}</div>
          <div class="ingredient-qty">
            <input type="number" value="${ing.servings}" min="0.25" step="0.25" style="width:60px;padding:4px;border:1px solid var(--border);border-radius:6px;font-size:0.85rem" onchange="NCFoods.updateIngQty(${i}, this.value)">
            × ${food.servingUnit}
          </div>
        </div>
        <button class="btn-icon" onclick="NCFoods.removeIngredient(${i})">✕</button>
      </div>`;
  }).join('');

  const addIngredient = () => {
    const foods = NC.getFoods();
    const body = `
      <div class="search-wrap">
        <span class="search-icon">🔍</span>
        <input type="search" class="search-input" id="ing-search" placeholder="Search foods…" autocomplete="off">
      </div>
      <div id="ing-search-list">
        ${foods.slice(0, 15).map(f => `
          <div class="food-item" onclick="NCFoods.pickIngredient('${f.id}')">
            <span class="food-emoji">${f.emoji || NC.foodEmoji(f.name)}</span>
            <div class="food-info">
              <div class="food-name">${f.name}</div>
              <div class="food-detail">${f.servingUnit}</div>
            </div>
          </div>`).join('')}
      </div>`;
    NC.openDrawer('Add Ingredient', body, `<button class="btn btn-secondary btn-full" onclick="NCFoods.backToRecipeBuilder()">Back</button>`);
    setTimeout(() => {
      const inp = document.getElementById('ing-search');
      if (!inp) return;
      inp.addEventListener('input', () => {
        const q = inp.value.trim();
        const list = document.getElementById('ing-search-list');
        const matched = q ? NC.searchFoods(q) : NC.getFoods().slice(0, 15);
        if (list) list.innerHTML = matched.map(f => `
          <div class="food-item" onclick="NCFoods.pickIngredient('${f.id}')">
            <span class="food-emoji">${f.emoji || NC.foodEmoji(f.name)}</span>
            <div class="food-info"><div class="food-name">${f.name}</div><div class="food-detail">${f.servingUnit}</div></div>
          </div>`).join('');
      });
    }, 50);
  };

  const pickIngredient = (foodId) => {
    _recipeIngredients.push({ foodId, servings: 1 });
    backToRecipeBuilder();
  };

  const backToRecipeBuilder = () => {
    NC.closeDrawer();
    setTimeout(() => showRecipeBuilderDrawer(_editingRecipeId), 300);
  };

  const removeIngredient = (idx) => {
    _recipeIngredients.splice(idx, 1);
    const list = document.getElementById('ingredient-list');
    if (list) list.innerHTML = renderIngredientList();
  };

  const updateIngQty = (idx, val) => {
    _recipeIngredients[idx].servings = parseFloat(val) || 1;
  };

  const saveRecipe = (editId) => {
    const name = document.getElementById('recipe-name')?.value.trim();
    if (!name) { NC.showToast('Recipe name is required', 'error'); return; }
    if (!_recipeIngredients.length) { NC.showToast('Add at least one ingredient', 'error'); return; }

    // Re-read qty inputs
    _recipeIngredients.forEach((ing, i) => {
      const el = document.querySelector(`#ing-${i} input[type=number]`);
      if (el) ing.servings = parseFloat(el.value) || 1;
    });

    const servings = parseInt(document.getElementById('recipe-servings')?.value) || 1;
    const recipe = { name, servings, ingredients: _recipeIngredients };

    if (editId) {
      NC.updateRecipe(editId, recipe);
      NC.showToast('Recipe updated ✓', 'success');
    } else {
      NC.addRecipe(recipe);
      NC.showToast('Recipe saved ✓', 'success');
    }
    NC.closeDrawer();
    renderToPanel();
  };

  const deleteRecipe = (id) => {
    if (!confirm('Delete this recipe?')) return;
    NC.deleteRecipe(id);
    NC.closeDrawer();
    NC.showToast('Recipe deleted', 'info');
    renderToPanel();
  };

  const attachSearchEvents = () => {
    const inp = document.getElementById('foods-search');
    if (!inp) return;
    inp.addEventListener('input', () => {
      const q = inp.value.trim();
      const list = document.getElementById('foods-list');
      if (!list) return;
      if (!q) {
        list.innerHTML = renderFoodsList(NC.getRecipes(), NC.getFoods());
        return;
      }
      const foods = NC.searchFoods(q);
      const recipes = NC.getRecipes().filter(r => r.name.toLowerCase().includes(q.toLowerCase()));
      list.innerHTML = `
        ${recipes.length ? `<div class="section-head">Recipes</div>${recipes.map(r => renderRecipeItem(r)).join('')}` : ''}
        ${foods.length ? `<div class="section-head">Foods</div>${foods.map(f => renderFoodItem(f)).join('')}` : '<div class="empty-state"><div class="empty-state-icon">🔍</div><div class="empty-state-title">No foods found</div></div>'}
      `;
    });
  };

  const renderToPanel = () => {
    const panel = document.getElementById('tab-foods');
    if (!panel) return;
    panel.innerHTML = render();
    setTimeout(attachSearchEvents, 50);
  };

  NC.bus.on('tab:changed', tab => { if (tab === 'foods') renderToPanel(); });
  NC.bus.on('foods:changed', () => { if (document.getElementById('tab-foods')?.classList.contains('active')) renderToPanel(); });
  NC.bus.on('recipes:changed', () => { if (document.getElementById('tab-foods')?.classList.contains('active')) renderToPanel(); });

  window.NCFoods = {
    render, renderToPanel,
    openFoodDetail, openRecipeDetail,
    openNewFood, editFood, saveFood, deleteFood,
    openRecipeBuilder, addIngredient, pickIngredient, backToRecipeBuilder,
    removeIngredient, updateIngQty, saveRecipe, deleteRecipe,
    waLookup, waQuerySync
  };
})();
