/* NutriCare — Nutrient reports, history, and nudges */
(function () {
  'use strict';

  let _reportDate = NC.today();
  let _historyDays = 7;

  const render = () => {
    const todayDate = NC.today();
    const isToday = _reportDate === todayDate;
    const logs = NC.getLogsForDate(_reportDate);
    const totals = NC.sumNutrients(logs);
    const targets = NC.getTargets();
    const nudges = NC.buildNudges(_reportDate);
    const history = NC.getHistoryTotals(_historyDays);

    const groups = ['macro', 'bone', 'brain', 'heart', 'recovery'];

    return `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 0 6px">
        <div style="font-size:1.05rem;font-weight:800">Nutrient Report</div>
        <div style="display:flex;align-items:center;gap:8px">
          <input type="date" id="report-date" value="${_reportDate}" max="${todayDate}"
            style="font-size:0.82rem;padding:6px 8px;border:1.5px solid var(--border);border-radius:8px;background:var(--surface)"
            onchange="NCReports.setDate(this.value)">
        </div>
      </div>

      ${nudges.length ? `
        <div class="section-head">💡 Today's Nudges</div>
        ${nudges.slice(0, 3).map(n => renderNudgeRow(n)).join('')}
      ` : ''}

      <div class="pill-tabs" id="report-tabs">
        ${groups.map(g => {
          const meta = NC.GROUP_META[g];
          return `<button class="pill-tab" data-group="${g}" onclick="NCReports.setGroup('${g}')">${meta.icon} ${meta.label}</button>`;
        }).join('')}
      </div>

      <div id="report-group-content">
        ${renderGroupSection('macro', totals, targets)}
      </div>

      <hr class="divider">
      <div class="section-head">📅 ${_historyDays}-Day History</div>
      ${renderHistory(history, targets)}

      ${renderWeightProjection()}
      <div style="height:16px"></div>
    `;
  };

  const renderNudgeRow = (nudge) => {
    const icons = { bone:'🦴', brain:'🧠', heart:'❤️', recovery:'💪', warn:'⚠️', recipe:'🍲' };
    const colors = { bone:'var(--bone-bg)', brain:'var(--brain-bg)', heart:'var(--heart-bg)', recovery:'var(--recovery-bg)', warn:'var(--warning-bg)', recipe:'var(--primary-bg)' };
    const textColors = { bone:'var(--bone)', brain:'var(--brain)', heart:'var(--heart)', recovery:'var(--recovery)', warn:'var(--warning)', recipe:'var(--primary)' };
    const bg = colors[nudge.type] || 'var(--surface-alt)';
    const tc = textColors[nudge.type] || 'var(--text)';
    return `
    <div style="background:${bg};border-radius:var(--radius-sm);padding:12px 14px;margin-bottom:8px">
      <div style="font-size:0.88rem;color:${tc}">${icons[nudge.type] || '💡'} ${nudge.text}</div>
      ${nudge.recipeId ? `<button class="btn btn-sm btn-secondary" style="margin-top:6px" onclick="NC.navigateTo('today')">View Today</button>` : ''}
    </div>`;
  };

  const renderGroupSection = (group, totals, targets) => {
    const keys = Object.entries(NC.NUTRIENTS).filter(([k, n]) => n.group === group);
    const meta = NC.GROUP_META[group];
    return `
      <div class="card" style="padding:16px">
        <div class="group-label ${group}">${meta.icon} ${meta.label}</div>
        ${keys.map(([k, n]) => {
          const val = totals[k] || 0;
          const target = targets[k] || n.dv;
          const pct = target ? Math.min(100, Math.round((val / target) * 100)) : null;
          const cls = NC.progressClass(k, val);
          const over = n.limit && val > (target || 0);
          return `
          <div class="progress-bar-wrap group-${group}">
            <div class="progress-bar-label">
              <span class="name" style="font-weight:600">${n.label}</span>
              <span class="value" style="${over ? 'color:var(--danger)' : ''}">
                ${NC.fmtNutrient(k, val)}
                ${target ? `<span style="color:var(--text-muted)"> / ${NC.fmtN(target, k==='b12'||k==='vitaminD'||k==='vitaminK'?1:0)}${n.unit}</span>` : ''}
                ${pct !== null ? `<span style="font-size:0.75rem;margin-left:4px;color:${over?'var(--danger)':pct>=100?'var(--success)':'var(--text-muted)'}">${pct}%</span>` : ''}
              </span>
            </div>
            ${target ? `<div class="progress-bar-track"><div class="progress-bar-fill ${cls}" style="width:${pct}%"></div></div>` : ''}
          </div>`;
        }).join('')}
      </div>`;
  };

  const renderHistory = (history, targets) => {
    const calTarget = targets.calories || 1600;
    const bars = history.map(day => {
      const cal = day.totals.calories || 0;
      const pct = Math.min(100, Math.round((cal / calTarget) * 100));
      const date = new Date(day.date + 'T12:00:00');
      const label = date.toLocaleDateString('en-US', { weekday: 'short' });
      const isToday = day.date === NC.today();
      return `
        <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px">
          <div style="font-size:0.7rem;color:var(--text-muted);font-weight:600;writing-mode:vertical-rl;transform:rotate(180deg);height:30px;line-height:1">${Math.round(cal)||'–'}</div>
          <div style="width:100%;flex:1;background:var(--surface-alt);border-radius:4px;overflow:hidden;display:flex;align-items:flex-end;min-height:60px">
            <div style="width:100%;height:${pct}%;background:${isToday?'var(--primary)':'var(--primary-light)'};transition:height 0.4s;min-height:${day.count?'2px':'0'}"></div>
          </div>
          <div style="font-size:0.7rem;font-weight:${isToday?'800':'600'};color:${isToday?'var(--primary)':'var(--text-muted)'}">${label}</div>
        </div>`;
    }).join('');

    return `
    <div class="card" style="padding:16px">
      <div style="font-size:0.82rem;color:var(--text-muted);margin-bottom:12px">Daily calories vs. ${calTarget} kcal goal</div>
      <div style="display:flex;gap:6px;height:120px;align-items:flex-end">${bars}</div>
      <div style="margin-top:16px">
        <div style="font-size:0.82rem;font-weight:700;margin-bottom:8px">Average intakes (${_historyDays} days)</div>
        ${renderAverages(history)}
      </div>
    </div>`;
  };

  const renderAverages = (history) => {
    const daysWithData = history.filter(d => d.count > 0);
    if (!daysWithData.length) return `<div class="text-muted text-sm">No data yet — start logging meals.</div>`;
    const keys = ['calories', 'protein', 'calcium', 'vitaminD', 'potassium', 'omega3dha'];
    return keys.map(k => {
      const n = NC.NUTRIENTS[k];
      const avg = daysWithData.reduce((s, d) => s + (d.totals[k] || 0), 0) / daysWithData.length;
      const pct = n.dv ? Math.round((avg / n.dv) * 100) : null;
      return `
      <div style="display:flex;justify-content:space-between;font-size:0.82rem;padding:4px 0;border-bottom:1px solid var(--border)">
        <span>${n.label}</span>
        <span style="font-weight:700;color:${pct && pct < 60?'var(--warning)':pct && pct>=100?'var(--success)':'var(--text)'}">
          ${NC.fmtNutrient(k, avg)}${pct !== null ? ` (${pct}%)` : ''}
        </span>
      </div>`;
    }).join('');
  };

  const renderWeightProjection = () => {
    const proj = NC.weightProjection(7);
    if (!proj) return '';
    const dir = proj.avgBalance > 0 ? '↑' : proj.avgBalance < 0 ? '↓' : '→';
    const color = Math.abs(proj.avgBalance) < 100 ? 'var(--success)' : proj.avgBalance > 0 ? 'var(--warning)' : 'var(--info)';
    return `
    <div class="card" style="margin-top:12px">
      <div class="card-title">Weight Trend</div>
      <div style="display:flex;align-items:center;gap:12px">
        <div style="font-size:2rem">${dir}</div>
        <div>
          <div style="font-weight:700;color:${color}">${proj.avgBalance > 0 ? '+' : ''}${proj.avgBalance} kcal/day avg</div>
          <div style="font-size:0.82rem;color:var(--text-muted)">
            ${Math.abs(proj.lbsPerWeek).toFixed(1)} lb/week ${proj.avgBalance > 0 ? 'gain' : proj.avgBalance < 0 ? 'loss' : 'maintenance'}
            (${Math.abs(proj.kgPerWeek).toFixed(2)} kg/week)
          </div>
          <div style="font-size:0.78rem;color:var(--text-muted);margin-top:4px">Based on last 7 days · 3500 kcal = 1 lb</div>
        </div>
      </div>
    </div>`;
  };

  let _activeGroup = 'macro';
  const setGroup = (group) => {
    _activeGroup = group;
    document.querySelectorAll('.pill-tab').forEach(t => t.classList.toggle('active', t.dataset.group === group));
    const logs = NC.getLogsForDate(_reportDate);
    const totals = NC.sumNutrients(logs);
    const targets = NC.getTargets();
    const content = document.getElementById('report-group-content');
    if (content) content.innerHTML = renderGroupSection(group, totals, targets);
  };

  const setDate = (date) => {
    _reportDate = date;
    renderToPanel();
  };

  const renderToPanel = () => {
    const panel = document.getElementById('tab-reports');
    if (!panel) return;
    panel.innerHTML = render();
    // Activate the currently selected tab
    setTimeout(() => {
      document.querySelectorAll('.pill-tab').forEach(t => t.classList.toggle('active', t.dataset.group === _activeGroup));
      const logs = NC.getLogsForDate(_reportDate);
      const totals = NC.sumNutrients(logs);
      const targets = NC.getTargets();
      const content = document.getElementById('report-group-content');
      if (content) content.innerHTML = renderGroupSection(_activeGroup, totals, targets);
    }, 0);
  };

  NC.bus.on('tab:changed', tab => { if (tab === 'reports') { _reportDate = NC.today(); renderToPanel(); } });
  NC.bus.on('log:changed', () => { if (document.getElementById('tab-reports')?.classList.contains('active')) renderToPanel(); });

  window.NCReports = { render, renderToPanel, setGroup, setDate };
})();
