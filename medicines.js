/* NutriCare — Medicine tracker */
(function () {
  'use strict';

  const render = () => {
    const meds = NC.getMedicines();
    const todayDate = NC.today();
    const medLogs = NC.getMedLogsForDate(todayDate);
    const isCaregiver = NC.isCaregiver();

    const { upcoming, taken, missed } = categorizeDoses(meds, medLogs);

    return `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0 6px">
        <div style="font-size:1.05rem;font-weight:800">Medicines</div>
        <div style="display:flex;gap:8px">
          ${isCaregiver ? `<button class="btn btn-sm btn-primary" onclick="NCMeds.openAddMedicine()">+ Add</button>` : ''}
          <button class="btn btn-sm btn-secondary" onclick="NCMeds.toggleCareMode()">
            ${isCaregiver ? '🔓 Patient View' : '🔒 Caregiver'}
          </button>
        </div>
      </div>

      ${!meds.length ? `
        <div class="empty-state" style="margin-top:40px">
          <div class="empty-state-icon">💊</div>
          <div class="empty-state-title">No medicines yet</div>
          <div class="empty-state-text">A caregiver can add medicines and schedules here.</div>
          ${isCaregiver ? `<button class="btn btn-primary" style="margin-top:16px" onclick="NCMeds.openAddMedicine()">Add First Medicine</button>` : ''}
        </div>
      ` : `
        ${upcoming.length ? `
          <div class="section-head">Upcoming / Due Now</div>
          ${upcoming.map(d => renderDoseCard(d, medLogs)).join('')}
        ` : ''}

        ${missed.length ? `
          <div class="section-head" style="color:var(--danger)">⚠️ Missed</div>
          ${missed.map(d => renderDoseCard(d, medLogs, true)).join('')}
        ` : ''}

        ${taken.length ? `
          <div class="section-head">Taken Today</div>
          ${taken.map(d => renderTakenCard(d)).join('')}
        ` : ''}

        ${isCaregiver ? `
          <hr class="divider">
          <div class="section-head">All Medicines</div>
          ${meds.map((m, i) => renderMedListItem(m, i)).join('')}
        ` : ''}
      `}
      <div style="height:16px"></div>
    `;
  };

  const categorizeDoses = (meds, medLogs) => {
    const now = Date.now();
    const upcoming = [], taken = [], missed = [];

    meds.filter(m => m.active).forEach(m => {
      (m.times || []).forEach(hhmm => {
        const dt = NC.hhmmToday(hhmm);
        const scheduledTime = dt.toISOString();
        const log = medLogs.find(l => l.medicineId === m.id && l.scheduledTime === scheduledTime);

        if (log?.takenAt) {
          taken.push({ med: m, scheduledTime, hhmm, log });
        } else if (log?.skipped) {
          missed.push({ med: m, scheduledTime, hhmm, log, overdue: true });
        } else if (dt.getTime() < now - 5 * 60000) {
          // More than 5 min past and not taken
          if (!log?.snoozedUntil || new Date(log.snoozedUntil).getTime() < now) {
            missed.push({ med: m, scheduledTime, hhmm, log: log || null, overdue: true });
          } else {
            // Snoozed
            upcoming.push({ med: m, scheduledTime, hhmm, log, snoozed: true });
          }
        } else {
          upcoming.push({ med: m, scheduledTime, hhmm, log: log || null });
        }
      });
    });

    // Sort
    upcoming.sort((a, b) => a.hhmm.localeCompare(b.hhmm));
    taken.sort((a, b) => new Date(b.log?.takenAt) - new Date(a.log?.takenAt));

    return { upcoming, taken, missed };
  };

  const renderDoseCard = (dose, logs, isOverdue = false) => {
    const { med, scheduledTime, hhmm, log, snoozed } = dose;
    const idx = NC.getMedicines().findIndex(m => m.id === med.id);
    const color = NC.medColor(idx);
    const displayTime = formatHhmm(hhmm);
    const snoozeUntil = log?.snoozedUntil ? `(snoozed until ${NC.formatTime(log.snoozedUntil)})` : '';

    return `
    <div class="med-card ${isOverdue ? 'overdue' : ''}" style="border-left-color:${color}">
      <div class="med-card-header">
        <div class="med-dot" style="background:${color}"></div>
        <div style="flex:1">
          <div class="med-card-name">${med.name}</div>
          <div class="med-card-dose">${med.dose}</div>
          <div class="med-card-time">${isOverdue ? '⚠️' : '🕐'} ${displayTime} ${snoozeUntil}</div>
          ${med.notes ? `<div style="font-size:0.78rem;color:var(--text-muted);margin-top:2px">${med.notes}</div>` : ''}
        </div>
      </div>
      <div class="med-actions">
        <button class="med-taken-btn" onclick="NCMeds.markTaken('${med.id}','${scheduledTime}')">✓ Taken</button>
        <div style="position:relative">
          <button class="med-snooze-btn" onclick="NCMeds.showSnoozeMenu(this, '${med.id}','${scheduledTime}')">⏰ Snooze</button>
        </div>
        <button class="med-skip-btn" onclick="NCMeds.markSkipped('${med.id}','${scheduledTime}')">Skip</button>
      </div>
    </div>`;
  };

  const renderTakenCard = (dose) => {
    const { med, scheduledTime, hhmm, log } = dose;
    const idx = NC.getMedicines().findIndex(m => m.id === med.id);
    const color = NC.medColor(idx);
    const takenAt = log?.takenAt ? NC.formatTime(log.takenAt) : '';
    return `
    <div class="med-card taken" style="border-left-color:${color}">
      <div class="med-card-header">
        <div class="med-dot" style="background:${color}"></div>
        <div style="flex:1">
          <div class="med-card-name">✓ ${med.name}</div>
          <div class="med-card-dose">${med.dose}</div>
          <div class="med-card-time" style="color:var(--success)">Taken at ${takenAt} (scheduled ${formatHhmm(hhmm)})</div>
        </div>
      </div>
    </div>`;
  };

  const renderMedListItem = (med, idx) => {
    const color = NC.medColor(idx);
    const times = (med.times || []).map(t => formatHhmm(t)).join(', ');
    return `
    <div class="med-card" style="border-left-color:${color};${!med.active ? 'opacity:0.5' : ''}">
      <div class="med-card-header">
        <div class="med-dot" style="background:${color}"></div>
        <div style="flex:1">
          <div class="med-card-name">${med.name} ${!med.active ? '(inactive)' : ''}</div>
          <div class="med-card-dose">${med.dose}</div>
          ${times ? `<div class="med-card-time">${times}</div>` : ''}
          ${med.notes ? `<div style="font-size:0.78rem;color:var(--text-muted)">${med.notes}</div>` : ''}
        </div>
        <button class="btn-icon" onclick="NCMeds.editMedicine('${med.id}')">✏️</button>
      </div>
    </div>`;
  };

  const formatHhmm = (hhmm) => {
    const [h, m] = hhmm.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2, '0')} ${period}`;
  };

  /* ── ACTIONS ── */
  const markTaken = (medicineId, scheduledTime) => {
    NC.logMedTaken(medicineId, scheduledTime);
    NC.showToast('Marked as taken ✓', 'success');
    renderToPanel();
    NCNotify?.scheduleAll();
  };

  const markSkipped = (medicineId, scheduledTime) => {
    NC.logMedSkipped(medicineId, scheduledTime);
    NC.showToast('Dose skipped', 'info');
    renderToPanel();
  };

  const showSnoozeMenu = (btn, medicineId, scheduledTime) => {
    // Remove any existing menus
    document.querySelectorAll('.snooze-menu').forEach(m => m.remove());
    const menu = document.createElement('div');
    menu.className = 'snooze-menu';
    menu.innerHTML = `
      <div class="snooze-option" onclick="NCMeds.snooze('${medicineId}','${scheduledTime}',15)">Snooze 15 minutes</div>
      <div class="snooze-option" onclick="NCMeds.snooze('${medicineId}','${scheduledTime}',30)">Snooze 30 minutes</div>
      <div class="snooze-option" onclick="NCMeds.snooze('${medicineId}','${scheduledTime}',60)">Snooze 1 hour</div>
      <div class="snooze-option" onclick="document.querySelectorAll('.snooze-menu').forEach(m=>m.remove())">Cancel</div>
    `;
    btn.parentElement.style.position = 'relative';
    btn.parentElement.appendChild(menu);
    setTimeout(() => document.addEventListener('click', () => menu.remove(), { once: true }), 50);
  };

  const snooze = (medicineId, scheduledTime, minutes) => {
    document.querySelectorAll('.snooze-menu').forEach(m => m.remove());
    NC.snoozeMed(medicineId, scheduledTime, minutes);
    NC.showToast(`Snoozed ${minutes} minutes`, 'info');
    NCNotify?.scheduleAll();
    renderToPanel();
  };

  /* ── CAREGIVER MODE ── */
  const toggleCareMode = () => {
    if (NC.isCaregiver()) {
      NC.setCaregiverMode(false);
      NC.showToast('Switched to patient view', 'info');
      renderToPanel();
    } else {
      showPinModal();
    }
  };

  const showPinModal = () => {
    const modal = document.getElementById('pin-modal');
    if (!modal) return;
    modal.classList.add('open');
    const hasPin = !!NC.getCarePin();
    document.getElementById('pin-title').textContent = hasPin ? 'Caregiver Login' : 'Set Caregiver PIN';
    document.getElementById('pin-subtitle').textContent = hasPin
      ? 'Enter your 4-digit PIN to access caregiver settings.'
      : 'Create a 4-digit PIN for caregiver access.';
    resetPinInput();
  };

  let _pinBuffer = '';
  const resetPinInput = () => {
    _pinBuffer = '';
    updatePinDots();
    document.getElementById('pin-error').textContent = '';
  };

  const updatePinDots = () => {
    document.querySelectorAll('.pin-dot').forEach((dot, i) => {
      dot.classList.toggle('filled', i < _pinBuffer.length);
    });
  };

  const pinKeyPress = (val) => {
    if (val === 'del') { _pinBuffer = _pinBuffer.slice(0, -1); updatePinDots(); return; }
    if (_pinBuffer.length >= 4) return;
    _pinBuffer += val;
    updatePinDots();
    if (_pinBuffer.length === 4) {
      setTimeout(() => submitPin(), 200);
    }
  };

  const submitPin = () => {
    const hasPin = !!NC.getCarePin();
    if (!hasPin) {
      // Set new PIN
      NC.setCarePin(_pinBuffer);
      NC.setCaregiverMode(true);
      closePinModal();
      NC.showToast('PIN set. Caregiver mode active.', 'success');
      renderToPanel();
    } else if (NC.verifyCarePin(_pinBuffer)) {
      NC.setCaregiverMode(true);
      closePinModal();
      NC.showToast('Caregiver mode active', 'success');
      renderToPanel();
    } else {
      document.getElementById('pin-error').textContent = 'Incorrect PIN. Try again.';
      _pinBuffer = '';
      updatePinDots();
    }
  };

  const closePinModal = () => {
    const modal = document.getElementById('pin-modal');
    if (modal) modal.classList.remove('open');
    resetPinInput();
  };

  /* ── ADD / EDIT MEDICINE ── */
  const openAddMedicine = () => {
    if (!NC.isCaregiver()) { showPinModal(); return; }
    openMedicineForm(null);
  };

  const editMedicine = (id) => {
    if (!NC.isCaregiver()) { showPinModal(); return; }
    openMedicineForm(id);
  };

  const openMedicineForm = (editId) => {
    const med = editId ? NC.getMedById(editId) : null;
    const m = med || {};
    const times = (m.times || ['08:00']).join(', ');

    const colorBtns = NC.MED_COLORS.map((c, i) => `
      <button type="button" onclick="NCMeds._selectColor(this, '${c}')"
        style="width:28px;height:28px;border-radius:50%;background:${c};border:3px solid ${c === (m.color || NC.MED_COLORS[0]) ? '#fff' : 'transparent'};outline:2px solid ${c === (m.color || NC.MED_COLORS[0]) ? c : 'transparent'};cursor:pointer"
        data-color="${c}"></button>`).join('');

    NC.openDrawer(
      med ? 'Edit Medicine' : 'Add Medicine',
      `<div class="form-group">
        <label class="form-label">Medicine Name <span class="required">*</span></label>
        <input type="text" class="form-input" id="med-name" value="${m.name || ''}" placeholder="e.g. Calcium + D3">
      </div>
      <div class="form-group">
        <label class="form-label">Dose / Instructions</label>
        <input type="text" class="form-input" id="med-dose" value="${m.dose || ''}" placeholder="e.g. 1 tablet, 500mg">
      </div>
      <div class="form-group">
        <label class="form-label">Reminder Times <span style="font-size:0.78rem;font-weight:400;color:var(--text-muted)">(comma-separated, 24h)</span></label>
        <input type="text" class="form-input" id="med-times" value="${times}" placeholder="e.g. 08:00, 14:00, 20:00">
        <div class="form-hint">Use 24-hour format. Examples: 08:00, 13:30, 21:00</div>
      </div>
      <div class="form-group">
        <label class="form-label">Notes (optional)</label>
        <input type="text" class="form-input" id="med-notes" value="${m.notes || ''}" placeholder="e.g. Take with food">
      </div>
      <div class="form-group">
        <label class="form-label">Color</label>
        <div id="med-color-picker" style="display:flex;gap:8px;flex-wrap:wrap">${colorBtns}</div>
        <input type="hidden" id="med-color" value="${m.color || NC.MED_COLORS[0]}">
      </div>
      <div class="toggle-wrap">
        <span class="toggle-label">Active (scheduled)</span>
        <label class="toggle">
          <input type="checkbox" id="med-active" ${m.active !== false ? 'checked' : ''}>
          <span class="toggle-slider"></span>
        </label>
      </div>
      ${editId ? `<hr class="divider"><button class="btn btn-danger btn-full" onclick="NCMeds.deleteMedicine('${editId}')">Delete Medicine</button>` : ''}`,
      `<div style="display:flex;gap:8px;width:100%">
        <button class="btn btn-secondary" onclick="NC.closeDrawer()">Cancel</button>
        <button class="btn btn-primary flex-1" onclick="NCMeds.saveMedicine('${editId || ''}')">Save</button>
      </div>`
    );
  };

  window.NCMeds = window.NCMeds || {};
  NCMeds._selectColor = (btn, color) => {
    document.getElementById('med-color').value = color;
    document.querySelectorAll('#med-color-picker button').forEach(b => {
      const c = b.dataset.color;
      b.style.border = `3px solid ${c === color ? '#fff' : 'transparent'}`;
      b.style.outline = `2px solid ${c === color ? c : 'transparent'}`;
    });
  };

  const parseTimes = (str) => {
    return str.split(',').map(s => s.trim()).filter(s => /^\d{1,2}:\d{2}$/.test(s)).map(s => {
      const [h, m] = s.split(':').map(Number);
      return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
    });
  };

  const saveMedicine = (editId) => {
    const name = document.getElementById('med-name')?.value.trim();
    if (!name) { NC.showToast('Medicine name is required', 'error'); return; }
    const times = parseTimes(document.getElementById('med-times')?.value || '');
    const med = {
      name,
      dose: document.getElementById('med-dose')?.value.trim() || '',
      times,
      notes: document.getElementById('med-notes')?.value.trim() || '',
      color: document.getElementById('med-color')?.value || NC.MED_COLORS[0],
      active: document.getElementById('med-active')?.checked !== false
    };
    if (editId) {
      NC.updateMedicine(editId, med);
      NC.showToast('Medicine updated ✓', 'success');
    } else {
      NC.addMedicine(med);
      NC.showToast('Medicine added ✓', 'success');
      NCNotify?.requestPermission().then(() => NCNotify?.scheduleAll());
    }
    NC.closeDrawer();
    renderToPanel();
  };

  const deleteMedicine = (id) => {
    if (!confirm('Delete this medicine?')) return;
    NC.deleteMedicine(id);
    NC.closeDrawer();
    NC.showToast('Medicine deleted', 'info');
    renderToPanel();
  };

  const renderToPanel = () => {
    const panel = document.getElementById('tab-medicines');
    if (!panel) return;
    panel.innerHTML = render();
  };

  NC.bus.on('tab:changed', tab => { if (tab === 'medicines') renderToPanel(); });
  NC.bus.on('medicines:changed', () => { if (document.getElementById('tab-medicines')?.classList.contains('active')) renderToPanel(); });
  NC.bus.on('medlog:changed', () => { if (document.getElementById('tab-medicines')?.classList.contains('active')) renderToPanel(); });
  NC.bus.on('settings:changed', () => { if (document.getElementById('tab-medicines')?.classList.contains('active')) renderToPanel(); });
  NC.bus.on('med:due', () => renderToPanel());
  NC.bus.on('med:missed', () => renderToPanel());

  window.NCMeds = Object.assign(window.NCMeds || {}, {
    render, renderToPanel,
    markTaken, markSkipped, showSnoozeMenu, snooze,
    toggleCareMode, showPinModal, pinKeyPress, closePinModal,
    openAddMedicine, editMedicine, openMedicineForm,
    saveMedicine, deleteMedicine
  });
})();
