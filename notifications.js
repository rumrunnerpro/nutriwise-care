/* NutriCare — Notification scheduling and SW message handling */
(function () {
  'use strict';

  let _timers = {};
  let _swReg = null;

  const init = async () => {
    if ('serviceWorker' in navigator) {
      try {
        _swReg = await navigator.serviceWorker.ready;
        navigator.serviceWorker.addEventListener('message', onSwMessage);
      } catch (e) { console.warn('SW not ready:', e); }
    }
    checkMissedDoses();
    scheduleAll();
    NC.bus.on('medicines:changed', scheduleAll);
  };

  const requestPermission = async () => {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    const result = await Notification.requestPermission();
    return result === 'granted';
  };

  const canNotify = () => 'Notification' in window && Notification.permission === 'granted';

  const showNotification = (title, options = {}) => {
    if (!canNotify()) return;
    if (_swReg) {
      _swReg.showNotification(title, {
        icon: '/icons/icon-192.svg',
        badge: '/icons/icon-192.svg',
        vibrate: [200, 100, 200],
        ...options
      });
    } else {
      new Notification(title, { icon: '/icons/icon-192.svg', ...options });
    }
  };

  /* Build scheduled times for a medicine for today */
  const getTodayTimes = (medicine) => {
    if (!medicine.active) return [];
    const todayDate = NC.today();
    return (medicine.times || []).map(hhmm => {
      const [h, m] = hhmm.split(':').map(Number);
      const d = new Date(); d.setHours(h, m, 0, 0);
      return { scheduledTime: d.toISOString(), hhmm, medicineId: medicine.id };
    });
  };

  const clearAll = () => {
    Object.values(_timers).forEach(t => clearTimeout(t));
    _timers = {};
  };

  const scheduleAll = () => {
    clearAll();
    const meds = NC.getMedicines().filter(m => m.active);
    const now = Date.now();

    meds.forEach((med, idx) => {
      getTodayTimes(med).forEach(slot => {
        const t = new Date(slot.scheduledTime).getTime();
        if (t < now - 60000) return; // skip old slots (> 1 min past)

        /* Check if already handled */
        const existing = NC.getMedLogEntry(slot.medicineId, slot.scheduledTime);
        if (existing && (existing.takenAt || existing.skipped)) return;

        /* Check snooze */
        if (existing && existing.snoozedUntil) {
          const snoozeT = new Date(existing.snoozedUntil).getTime();
          if (snoozeT > now) {
            const delay = snoozeT - now;
            const key = `${slot.medicineId}:${slot.scheduledTime}`;
            _timers[key] = setTimeout(() => fireNotification(med, slot), delay);
            return;
          }
        }

        const delay = Math.max(0, t - now);
        const key = `${slot.medicineId}:${slot.scheduledTime}`;
        _timers[key] = setTimeout(() => fireNotification(med, slot), delay);
      });
    });
  };

  const fireNotification = (med, slot) => {
    showNotification(`💊 Medicine Time`, {
      body: `${med.name} — ${med.dose}`,
      tag: `med-${slot.medicineId}-${slot.hhmm}`,
      requireInteraction: true,
      actions: [
        { action: 'taken', title: '✓ Taken' },
        { action: 'snooze15', title: '⏰ 15 min' },
        { action: 'snooze30', title: '⏰ 30 min' }
      ],
      data: { medicineId: slot.medicineId, scheduledTime: slot.scheduledTime }
    });

    /* Pulse in-app if open */
    NC.bus.emit('med:due', slot);
  };

  /* Handle missed doses from a previous day or app reopen */
  const checkMissedDoses = () => {
    const meds = NC.getMedicines().filter(m => m.active);
    const now = Date.now();
    const todayDate = NC.today();

    meds.forEach(med => {
      getTodayTimes(med).forEach(slot => {
        const t = new Date(slot.scheduledTime).getTime();
        if (t >= now) return; // not yet due
        const existing = NC.getMedLogEntry(slot.medicineId, slot.scheduledTime);
        if (!existing || (!existing.takenAt && !existing.skipped)) {
          // Missed! Store as pending missed
          NC.bus.emit('med:missed', { med, slot });
        }
      });
    });
  };

  /* SW postMessage handler */
  const onSwMessage = (event) => {
    const { type, medicineId, scheduledTime, minutes } = event.data || {};
    if (type === 'MED_TAKEN') {
      NC.logMedTaken(medicineId, scheduledTime);
      NC.showToast('Medicine marked as taken ✓', 'success');
      NC.bus.emit('medlog:changed');
    } else if (type === 'MED_SNOOZE') {
      const until = NC.snoozeMed(medicineId, scheduledTime, minutes || 30);
      NC.showToast(`Snoozed ${minutes} minutes`, 'info');
      scheduleAll();
    }
  };

  /* Nutrient nudge notification (call at e.g. 2pm if low calories) */
  const scheduleNudgeCheck = () => {
    const now = new Date();
    const check = new Date(); check.setHours(14, 0, 0, 0);
    if (check <= now) check.setDate(check.getDate() + 1);
    const delay = check.getTime() - now.getTime();
    setTimeout(() => {
      const nudges = NC.buildNudges();
      if (nudges.length && canNotify()) {
        showNotification('🥗 Nutrition Check', {
          body: nudges[0].text,
          tag: 'nudge-daily',
          data: { type: 'nudge' }
        });
      }
      scheduleNudgeCheck(); // reschedule for tomorrow
    }, delay);
  };

  window.NCNotify = {
    init,
    requestPermission,
    canNotify,
    showNotification,
    scheduleAll,
    checkMissedDoses,
    scheduleNudgeCheck
  };
})();
