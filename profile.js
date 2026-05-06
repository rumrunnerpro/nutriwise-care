/* NutriCare — Profile and settings */
(function () {
  'use strict';

  const render = () => {
    const profile = NC.getProfile();
    const targets = NC.getTargets();
    const isCaregiver = NC.isCaregiver();

    if (!profile) return renderSetup();

    const bmi = profile.weight_kg && profile.height_cm
      ? (profile.weight_kg / Math.pow(profile.height_cm / 100, 2)).toFixed(1)
      : null;

    return `
      <div style="padding-top:16px">
        <div class="profile-avatar">👩</div>
        <div style="text-align:center;margin-bottom:20px">
          <div style="font-size:1.25rem;font-weight:800">${profile.name || 'Your Name'}</div>
          <div style="font-size:0.9rem;color:var(--text-muted)">${profileSubtitle(profile)}</div>
        </div>

        <div class="stat-grid" style="margin-bottom:16px">
          ${profile.age ? `<div class="stat-item"><div class="stat-value">${profile.age}</div><div class="stat-label">Age</div></div>` : ''}
          ${profile.weight_kg ? `<div class="stat-item"><div class="stat-value">${profile.weight_kg}<span style="font-size:0.9rem">kg</span></div><div class="stat-label">Weight</div></div>` : ''}
          ${profile.height_cm ? `<div class="stat-item"><div class="stat-value">${profile.height_cm}<span style="font-size:0.9rem">cm</span></div><div class="stat-label">Height</div></div>` : ''}
          ${bmi ? `<div class="stat-item"><div class="stat-value">${bmi}</div><div class="stat-label">BMI</div></div>` : ''}
        </div>

        <button class="btn btn-secondary btn-full" onclick="NCProfile.editProfile()" style="margin-bottom:10px">Edit Profile</button>

        ${isCaregiver ? `
          <hr class="divider">
          <div class="section-head">🎯 Daily Nutrition Targets</div>
          ${renderTargets(targets)}
          <button class="btn btn-secondary btn-full" style="margin-top:10px" onclick="NCProfile.editTargets()">Edit Targets</button>
        ` : ''}

        <hr class="divider">
        <div class="section-head">💾 Data</div>
        <div style="display:flex;gap:10px;margin-bottom:10px">
          <button class="btn btn-secondary flex-1" onclick="NC.exportData()">Export Backup</button>
          <button class="btn btn-secondary flex-1" onclick="NCProfile.importPrompt()">Import</button>
        </div>

        <hr class="divider">
        <div class="section-head">🔬 WolframAlpha</div>
        <div class="card card-sm" style="margin-bottom:8px">
          <div style="display:flex;align-items:center;gap:12px">
            <div style="flex:1">
              <div style="font-weight:600;font-size:0.9rem">Nutrition Lookup</div>
              <div style="font-size:0.78rem;color:var(--text-muted);margin-top:2px">
                ${(typeof NCWolfram !== 'undefined' && NCWolfram.hasAppId())
                  ? '✓ App ID configured — lookup available when adding foods'
                  : 'Not configured — set an App ID to enable auto-fill when adding foods'}
              </div>
            </div>
            <button class="btn btn-sm btn-secondary" onclick="NCProfile.editWAAppId()">
              ${(typeof NCWolfram !== 'undefined' && NCWolfram.hasAppId()) ? 'Edit' : 'Set up'}
            </button>
          </div>
        </div>

        <hr class="divider">
        <div class="section-head">📱 App</div>
        <div class="card card-sm" style="margin-bottom:8px">
          <div class="toggle-wrap">
            <span class="toggle-label">Notifications</span>
            <button class="btn btn-sm ${NCNotify?.canNotify() ? 'btn-primary' : 'btn-secondary'}" onclick="NCProfile.requestNotifications()">
              ${NCNotify?.canNotify() ? '✓ Enabled' : 'Enable'}
            </button>
          </div>
        </div>
        <div style="text-align:center;font-size:0.75rem;color:var(--text-muted);padding:12px 0">NutriCare v1.1.2 · Offline-ready PWA</div>
      </div>
    `;
  };

  const profileSubtitle = (p) => {
    const parts = [];
    if (p.sex) parts.push(p.sex === 'female' ? 'Female' : p.sex === 'male' ? 'Male' : p.sex);
    if (p.age) parts.push(`${p.age} years old`);
    return parts.join(' · ') || 'Edit your profile';
  };

  const renderTargets = (targets) => {
    const keys = ['calories', 'protein', 'carbs', 'fat', 'fiber', 'calcium', 'vitaminD', 'potassium', 'sodium'];
    return keys.map(k => {
      const n = NC.NUTRIENTS[k];
      return `
      <div style="display:flex;justify-content:space-between;font-size:0.88rem;padding:6px 0;border-bottom:1px solid var(--border)">
        <span>${n.label}</span>
        <span style="font-weight:700">${targets[k] || NC.DEFAULT_TARGETS[k]}${n.unit}</span>
      </div>`;
    }).join('');
  };

  /* ── SETUP (first run) ── */
  const renderSetup = () => `
    <div style="padding:24px 0">
      <div class="profile-avatar" style="font-size:2.5rem">👋</div>
      <div style="text-align:center;margin-bottom:24px">
        <div style="font-size:1.3rem;font-weight:800;margin-bottom:8px">Welcome to NutriCare</div>
        <div style="font-size:0.9rem;color:var(--text-muted);line-height:1.5">Let's set up your profile to personalize nutrition targets and tracking.</div>
      </div>
      ${profileFormHTML(null)}
      <div style="margin-top:20px">
        <button class="btn btn-primary btn-full" onclick="NCProfile.saveProfile()">Get Started</button>
      </div>
    </div>
  `;

  const profileFormHTML = (profile) => {
    const p = profile || {};
    return `
    <div class="form-group">
      <label class="form-label">Name <span class="required">*</span></label>
      <input type="text" class="form-input" id="p_name" value="${p.name || ''}" placeholder="First name">
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Age</label>
        <input type="number" class="form-input" id="p_age" value="${p.age || ''}" placeholder="e.g. 74" min="1" max="120">
      </div>
      <div class="form-group">
        <label class="form-label">Sex</label>
        <select class="form-select" id="p_sex">
          <option value="">Select</option>
          <option value="female" ${p.sex === 'female' ? 'selected' : ''}>Female</option>
          <option value="male" ${p.sex === 'male' ? 'selected' : ''}>Male</option>
          <option value="other" ${p.sex === 'other' ? 'selected' : ''}>Other</option>
        </select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="form-label">Height (cm)</label>
        <input type="number" class="form-input" id="p_height" value="${p.height_cm || ''}" placeholder="e.g. 163" min="50" max="250">
      </div>
      <div class="form-group">
        <label class="form-label">Weight (kg)</label>
        <input type="number" class="form-input" id="p_weight" value="${p.weight_kg || ''}" placeholder="e.g. 62" min="20" max="250">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Notes (optional)</label>
      <input type="text" class="form-input" id="p_notes" value="${p.notes || ''}" placeholder="e.g. Hip replacement recovery">
    </div>
    `;
  };

  const saveProfile = () => {
    const name = document.getElementById('p_name')?.value.trim();
    if (!name) { NC.showToast('Please enter a name', 'error'); return; }
    const profile = {
      name,
      age: parseInt(document.getElementById('p_age')?.value) || null,
      sex: document.getElementById('p_sex')?.value || null,
      height_cm: parseFloat(document.getElementById('p_height')?.value) || null,
      weight_kg: parseFloat(document.getElementById('p_weight')?.value) || null,
      notes: document.getElementById('p_notes')?.value.trim() || null
    };

    NC.saveProfile(profile);

    // Adjust targets for elderly woman
    if (profile.sex === 'female' && profile.age && profile.age >= 65) {
      applyElderlyFemaleTargets(profile);
    }

    NC.showToast('Profile saved ✓', 'success');
    renderToPanel();
    // Request notification permission on first profile save
    NCNotify?.requestPermission();
    NCNotify?.scheduleNudgeCheck();
  };

  const applyElderlyFemaleTargets = (profile) => {
    // Compute TDEE using Mifflin-St Jeor, sedentary (injured/recovering)
    let tdee = null;
    if (profile.weight_kg && profile.height_cm && profile.age) {
      const bmr = 10 * profile.weight_kg + 6.25 * profile.height_cm - 5 * profile.age - 161;
      tdee = Math.round(bmr * 1.2); // sedentary multiplier
    }
    const calTarget = tdee || NC.DEFAULT_TARGETS.calories;
    // Protein: 1.2-1.5 g/kg for injury recovery
    const protein = profile.weight_kg ? Math.round(profile.weight_kg * 1.3) : NC.DEFAULT_TARGETS.protein;
    NC.saveTargets({
      ...NC.getTargets(),
      calories: calTarget,
      protein,
      calcium: 1200,     // Elderly women need more
      vitaminD: 20,      // 800 IU
      magnesium: 320,
      potassium: 2600,
      vitaminC: 75,
      omega3dha: 500,    // Higher for brain recovery
      omega3epa: 500,
      choline: 425
    });
  };

  /* ── EDIT PROFILE ── */
  const editProfile = () => {
    const profile = NC.getProfile();
    NC.openDrawer(
      'Edit Profile',
      profileFormHTML(profile),
      `<div style="display:flex;gap:8px;width:100%">
        <button class="btn btn-secondary" onclick="NC.closeDrawer()">Cancel</button>
        <button class="btn btn-primary flex-1" onclick="NCProfile.saveProfileFromDrawer()">Save</button>
      </div>`
    );
  };

  const saveProfileFromDrawer = () => {
    const name = document.getElementById('p_name')?.value.trim();
    if (!name) { NC.showToast('Please enter a name', 'error'); return; }
    const profile = {
      ...NC.getProfile(),
      name,
      age: parseInt(document.getElementById('p_age')?.value) || null,
      sex: document.getElementById('p_sex')?.value || null,
      height_cm: parseFloat(document.getElementById('p_height')?.value) || null,
      weight_kg: parseFloat(document.getElementById('p_weight')?.value) || null,
      notes: document.getElementById('p_notes')?.value.trim() || null
    };
    NC.saveProfile(profile);
    if (profile.sex === 'female' && profile.age >= 65) applyElderlyFemaleTargets(profile);
    NC.showToast('Profile updated ✓', 'success');
    NC.closeDrawer();
    renderToPanel();
  };

  /* ── EDIT TARGETS ── */
  const editTargets = () => {
    if (!NC.isCaregiver()) return;
    const targets = NC.getTargets();
    const groups = ['macro', 'bone', 'brain', 'heart', 'recovery'];
    const fields = groups.map(g => {
      const keys = Object.entries(NC.NUTRIENTS).filter(([k, n]) => n.group === g && n.dv);
      const meta = NC.GROUP_META[g];
      return `
        <div class="section-head">${meta.icon} ${meta.label}</div>
        ${keys.map(([k, n]) => `
          <div class="form-group" style="margin-bottom:8px">
            <label class="form-label">${n.label} (${n.unit})</label>
            <input type="number" class="form-input" id="t_${k}" value="${targets[k] || n.dv}" min="0" step="${n.unit === 'mcg' && n.dv < 10 ? 0.1 : 1}">
          </div>`).join('')}`;
    }).join('');

    NC.openDrawer(
      'Daily Targets',
      `<div style="font-size:0.85rem;color:var(--text-muted);margin-bottom:16px">Personalize daily nutrition targets. Pre-filled with recommendations for elderly women in recovery.</div>${fields}`,
      `<div style="display:flex;gap:8px;width:100%">
        <button class="btn btn-secondary" onclick="NC.closeDrawer()">Cancel</button>
        <button class="btn btn-danger" onclick="NCProfile.resetTargets()">Reset</button>
        <button class="btn btn-primary flex-1" onclick="NCProfile.saveTargets()">Save</button>
      </div>`
    );
  };

  const saveTargets = () => {
    const targets = {};
    Object.entries(NC.NUTRIENTS).forEach(([k, n]) => {
      const el = document.getElementById(`t_${k}`);
      if (el) targets[k] = parseFloat(el.value) || 0;
    });
    NC.saveTargets(targets);
    NC.showToast('Targets updated ✓', 'success');
    NC.closeDrawer();
    renderToPanel();
  };

  const resetTargets = () => {
    NC.saveTargets(NC.DEFAULT_TARGETS);
    const profile = NC.getProfile();
    if (profile?.sex === 'female' && profile?.age >= 65) applyElderlyFemaleTargets(profile);
    NC.showToast('Targets reset to defaults', 'info');
    NC.closeDrawer();
    renderToPanel();
  };

  const requestNotifications = async () => {
    const granted = await NCNotify?.requestPermission();
    if (granted) {
      NC.showToast('Notifications enabled ✓', 'success');
      NCNotify?.scheduleAll();
    } else {
      NC.showToast('Notifications blocked. Check browser settings.', 'error');
    }
    renderToPanel();
  };

  const importPrompt = () => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const ok = NC.importData(ev.target.result);
        if (ok) { NC.showToast('Data imported ✓', 'success'); renderToPanel(); }
        else NC.showToast('Import failed — invalid file', 'error');
      };
      reader.readAsText(file);
    };
    input.click();
  };

  /* ── WOLFRAMALPHA APP ID ── */
  const editWAAppId = () => {
    const wa = typeof NCWolfram !== 'undefined' ? NCWolfram : null;
    const appId    = wa?.getAppId()    || '';
    const proxyUrl = wa?.getProxyUrl() || '';
    const maskedId = appId
      ? `${appId.slice(0, 4)}${'·'.repeat(Math.max(0, appId.length - 8))}${appId.slice(-4)}`
      : '';

    NC.openDrawer(
      '🔬 WolframAlpha Setup',
      `<div style="background:var(--warning-bg);border-radius:var(--radius-sm);padding:12px 14px;margin-bottom:16px;font-size:0.85rem;line-height:1.5;color:var(--warning)">
        <strong>Proxy required.</strong> Browsers block direct WolframAlpha requests (CORS policy).
        You need a one-time free proxy setup before lookups will work.
      </div>

      <div style="font-weight:700;margin-bottom:10px">Step 1 — Get a WolframAlpha App ID</div>
      <div style="font-size:0.85rem;color:var(--text-muted);line-height:1.5;margin-bottom:14px">
        Go to <strong>developer.wolframalpha.com</strong> → Get an AppID → create an app →
        copy the App ID. Free tier = 2,000 queries/month.
      </div>
      <div class="form-group">
        <label class="form-label">App ID${maskedId ? ` <span style="font-weight:400;color:var(--text-muted)">(${maskedId})</span>` : ''}</label>
        <input type="text" class="form-input" id="wa-appid-input"
          value="${appId}"
          placeholder="e.g. XXXXXX-XXXXXXXXXX"
          autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false"
          style="font-family:monospace">
      </div>

      <hr class="divider">
      <div style="font-weight:700;margin-bottom:10px">Step 2 — Deploy the CORS proxy</div>
      <div style="font-size:0.85rem;color:var(--text-muted);line-height:1.5;margin-bottom:14px">
        1. Go to <strong>workers.cloudflare.com</strong> — free account, no credit card.<br>
        2. Create Worker → paste the contents of <strong>wolfram-proxy-worker.js</strong>
           (in the repo root) → Deploy.<br>
        3. Copy the worker URL (e.g. <em>https://my-worker.username.workers.dev</em>)
           and paste it below.
      </div>
      <div class="form-group">
        <label class="form-label">Proxy URL${proxyUrl ? ' <span style="color:var(--success)">✓</span>' : ''}</label>
        <input type="text" class="form-input" id="wa-proxy-input"
          value="${proxyUrl}"
          placeholder="https://my-worker.username.workers.dev"
          autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false"
          style="font-family:monospace">
        <div class="form-hint">Your App ID is sent to this URL, which forwards it to WolframAlpha.</div>
      </div>

      ${(appId || proxyUrl) ? `
        <hr class="divider">
        <button class="btn btn-danger btn-full" onclick="NCProfile.clearWAConfig()">Remove All WolframAlpha Settings</button>
      ` : ''}`,
      `<div style="display:flex;gap:8px;width:100%">
        <button class="btn btn-secondary" onclick="NC.closeDrawer()">Cancel</button>
        <button class="btn btn-primary flex-1" onclick="NCProfile.saveWAAppId()">Save</button>
      </div>`
    );
  };

  const saveWAAppId = () => {
    if (typeof NCWolfram === 'undefined') { NC.showToast('WolframAlpha module not loaded', 'error'); return; }
    const appId    = document.getElementById('wa-appid-input')?.value?.trim();
    const proxyUrl = document.getElementById('wa-proxy-input')?.value?.trim();
    if (!appId) { NC.showToast('App ID is required', 'error'); return; }
    NCWolfram.setAppId(appId);
    NCWolfram.setProxyUrl(proxyUrl || null);
    NC.closeDrawer();
    const msg = proxyUrl ? 'WolframAlpha configured ✓' : 'App ID saved — add a proxy URL to enable lookups';
    NC.showToast(msg, proxyUrl ? 'success' : 'warning');
    renderToPanel();
  };

  const clearWAAppId = () => {
    clearWAConfig();
  };

  const clearWAConfig = () => {
    if (!confirm('Remove all WolframAlpha settings? Nutrition lookup will be disabled.')) return;
    if (typeof NCWolfram !== 'undefined') { NCWolfram.setAppId(null); NCWolfram.setProxyUrl(null); }
    NC.closeDrawer();
    NC.showToast('WolframAlpha settings removed', 'info');
    renderToPanel();
  };

  const renderToPanel = () => {
    const panel = document.getElementById('tab-profile');
    if (!panel) return;
    panel.innerHTML = render();
  };

  NC.bus.on('tab:changed', tab => { if (tab === 'profile') renderToPanel(); });
  NC.bus.on('profile:changed', () => { if (document.getElementById('tab-profile')?.classList.contains('active')) renderToPanel(); });
  NC.bus.on('settings:changed', () => { if (document.getElementById('tab-profile')?.classList.contains('active')) renderToPanel(); });
  NC.bus.on('data:imported', () => renderToPanel());

  window.NCProfile = {
    render, renderToPanel,
    saveProfile, editProfile, saveProfileFromDrawer,
    editTargets, saveTargets, resetTargets,
    requestNotifications, importPrompt,
    editWAAppId, saveWAAppId, clearWAAppId, clearWAConfig
  };
})();
