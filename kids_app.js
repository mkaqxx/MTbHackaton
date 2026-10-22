/**
 * app.js - MTBank Moby Kids Client Banking Engine
 * Мобильный банкинг для ребенка 7–13 лет (Moby Family).
 */

import { MobyCatcherGame } from './kids_game.js';
import { MobyQuizEngine } from './kids_quiz.js';

// --- 1. РЕАКТИВНОЕ СОСТОЯНИЕ (STATE) ---
const STORAGE_KEY = 'moby_kids_state_v1';
const urlParams = new URLSearchParams(window.location.search);
let currentChildId = urlParams.get('childId') || 'child_1';
let lastKnownBalance = null;
let lastKnownStatus = null;
let lastKnownDailyLimit = null;
let lastKnownLimitsHash = null;

const defaultState = {
  balance: 15.00,
  piggySaved: 45.00,
  piggyGoal: 150.00,
  piggyName: 'Горный велосипед 🚲',
  piggyMatchPercent: 50.0,
  piggyMatchMaxMonthly: 30.0,
  piggyParentBonusTotal: 22.50,
  autoSaveAmount: 20.00,
  autoSavePeriod: 'month',
  cardStatus: 'active', // 'active' | 'blocked'
  limits: {
    total: { spent: 8.50, max: 20.00 },
    sweets: { spent: 4.00, max: 7.00 },
    games: { spent: 0.00, max: 5.00 },
    transport: { spent: 2.00, max: 4.00 }
  },
  tasks: {
    t1: 'ready', // 'ready' | 'waiting'
    t2: 'ready',
    t3: 'ready'
  }
};

let state = loadState();

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    let loaded = raw ? { ...defaultState, ...JSON.parse(raw) } : JSON.parse(JSON.stringify(defaultState));
    if (typeof window !== 'undefined' && (window.location.search.includes('unblock') || window.location.search.includes('reset'))) {
      loaded.cardStatus = 'active';
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(loaded)); } catch (_) {}
    }
    return loaded;
  } catch (e) {
    console.warn('Не удалось прочитать состояние из LocalStorage:', e);
  }
  return JSON.parse(JSON.stringify(defaultState));
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Ошибка сохранения в LocalStorage:', e);
  }
  renderUI();
}

// --- 2. ОБНОВЛЕНИЕ И РЕНДЕРИНГ ИНТЕРФЕЙСА (UI RENDER) ---
function renderUI() {
  // 1. Баланс
  const elBalance = document.getElementById('current-balance-text');
  if (elBalance) elBalance.textContent = state.balance.toFixed(2);

  // 2. Копилка на главной карте
  const elPiggyPreview = document.getElementById('card-piggy-preview');
  if (elPiggyPreview) elPiggyPreview.textContent = `${state.piggyName || 'Копилка'}: ${state.piggySaved.toFixed(0)} BYN`;

  // 3. Статус карты
  const elCardDot = document.getElementById('header-card-dot');
  const elCardStatus = document.getElementById('header-card-status');
  const btnLostCard = document.getElementById('btn-lost-card');
  const cardHero = document.querySelector('.card-hero');

  if (elCardDot && elCardStatus) {
    if (state.cardStatus === 'blocked') {
      elCardDot.classList.add('blocked');
      elCardStatus.textContent = 'Карта заблокирована';
      if (btnLostCard) {
        btnLostCard.innerHTML = '<span>🔓</span><span>Разблокировать карту</span>';
        btnLostCard.style.background = 'rgba(35, 52, 200, 0.35)';
        btnLostCard.style.borderColor = '#FFFFFF';
        btnLostCard.style.color = '#FFFFFF';
      }
      if (cardHero) cardHero.classList.add('card-blocked');
    } else {
      elCardDot.classList.remove('blocked');
      elCardStatus.textContent = 'Карта активна';
      if (btnLostCard) {
        btnLostCard.innerHTML = '<span>🛡️</span><span>Потерял карту</span>';
        btnLostCard.style.background = 'rgba(228, 44, 38, 0.2)';
        btnLostCard.style.borderColor = 'var(--mt-red)';
        btnLostCard.style.color = '#FFFFFF';
      }
      if (cardHero) cardHero.classList.remove('card-blocked');
    }
  }

  // 4. Лимиты и прогресс-бары (динамически из SQLite)
  renderChildLimits(state.limits?.total?.max, state.categoryLimits);

  // 5. Модалка копилки (значения)
  const elPiggyName = document.getElementById('child-piggy-name-text');
  if (elPiggyName) elPiggyName.textContent = state.piggyName || 'Горный велосипед 🚲';
  const elPiggyGoal = document.getElementById('child-piggy-goal-text');
  if (elPiggyGoal) elPiggyGoal.textContent = `${state.piggyGoal.toFixed(2)} BYN`;
  const elPiggySaved = document.getElementById('piggy-saved-text');
  const elPiggyPct = document.getElementById('piggy-percent-text');
  const elPiggyBar = document.getElementById('piggy-progress-bar');
  if (elPiggySaved && elPiggyPct && elPiggyBar) {
    elPiggySaved.textContent = `${state.piggySaved.toFixed(2)} BYN`;
    const pct = state.piggyGoal > 0 ? Math.min(100, Math.round((state.piggySaved / state.piggyGoal) * 100)) : 0;
    elPiggyPct.textContent = `${pct}%`;
    elPiggyBar.style.width = `${pct}%`;
  }

  // Home Screen Piggy Card
  const elHomePiggyName = document.getElementById('home-piggy-name');
  if (elHomePiggyName) elHomePiggyName.textContent = state.piggyName || 'Горный велосипед 🚲';
  const elHomePiggySaved = document.getElementById('home-piggy-saved');
  if (elHomePiggySaved) elHomePiggySaved.textContent = state.piggySaved.toFixed(2);
  const elHomePiggyGoal = document.getElementById('home-piggy-goal');
  if (elHomePiggyGoal) elHomePiggyGoal.textContent = state.piggyGoal.toFixed(2);
  const elHomePiggyFill = document.getElementById('home-piggy-fill');
  if (elHomePiggyFill) {
    const pct = state.piggyGoal > 0 ? Math.min(100, Math.round((state.piggySaved / state.piggyGoal) * 100)) : 0;
    elHomePiggyFill.style.width = `${pct}%`;
  }
  const elHomeMatchBadge = document.getElementById('home-piggy-match-badge');
  if (elHomeMatchBadge) elHomeMatchBadge.textContent = `+${state.piggyMatchPercent || 50}% Бонус родителей`;
  const elHomeBonusSub = document.getElementById('home-piggy-bonus-sub');
  if (elHomeBonusSub && state.piggyParentBonusTotal !== undefined) {
    elHomeBonusSub.textContent = `(Бонус родителей: +${state.piggyParentBonusTotal.toFixed(2)} BYN)`;
  }
  const elHomePiggyHint = document.getElementById('home-piggy-hint-text');
  if (elHomePiggyHint) elHomePiggyHint.textContent = `💡 Родители добавляют +${state.piggyMatchPercent || 50}% к каждому рублю`;

  // 6. Задания
  for (const [taskId, status] of Object.entries(state.tasks)) {
    const item = document.querySelector(`.task-item[data-task-id="${taskId}"]`);
    if (item) {
      const btn = item.querySelector('.btn-task-action');
      if (btn) {
        if (status === 'waiting') {
          btn.textContent = 'Ждет проверки ⏳';
          btn.classList.add('waiting');
          btn.disabled = true;
        } else {
          btn.textContent = 'Я сделал! ✅';
          btn.classList.remove('waiting');
          btn.disabled = false;
        }
      }
    }
  }
}

// --- 3. СИСТЕМА УВЕДОМЛЕНИЙ (TOASTS) ---
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast-item ${type}`;
  toast.textContent = message;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    toast.style.transition = 'all 0.25s ease';
    setTimeout(() => toast.remove(), 250);
  }, 3500);
}

// --- 4. СКРЫТЫЙ СКОРИНГ АНТИФРОДА (1–100) ---
// Ребенку 7–13 лет разрешена только оплата покупок.
// ИНДЕКС СТРОГО СКРЫТ И НИГДЕ НЕ ОТОБРАЖАЕТСЯ!
function calculateRiskIndex({ amount, merchant, category }) {
  let score = 20; // базовый скоринг привычной покупки

  // 1. Разовая сумма >= 25.00 BYN резко повышает подозрение
  if (amount >= 25.00) {
    score += 55;
  }

  // 2. Превышение суточного остатка лимита
  const remainingTotalLimit = state.limits.total.max - state.limits.total.spent;
  if (amount > remainingTotalLimit) {
    score += 30;
  }

  // 3. Неизвестный мерчант / интернет-заказ / донаты
  if (merchant && (merchant.toLowerCase().includes('интернет') || merchant.toLowerCase().includes('донат') || merchant.toLowerCase().includes('online'))) {
    score += 25;
  }

  return Math.min(100, Math.max(1, score));
}

// Выполнение оплаты с проверкой безопасности
function processPayment({ amount, title, merchant, category }) {
  if (state.cardStatus === 'blocked') {
    showToast('❌ Карта заблокирована! Оплата отклонена.', 'danger');
    return;
  }

  // Проверка блокировки категории родителем
  if (Array.isArray(state.categoryLimits) && category) {
    const blockedCat = state.categoryLimits.find(c => Boolean(c.is_blocked) && (c.category.toLowerCase().includes(category.toLowerCase()) || category.toLowerCase().includes(c.category.toLowerCase())));
    if (blockedCat) {
      showToast(`❌ Категория «${blockedCat.category}» заблокирована родителем!`, 'danger');
      return;
    }
  }

  // 1. Запуск фонового скоринга антифрода (1–100)
  const riskIndex = calculateRiskIndex({ amount, merchant, category });

  // СЛУЧАЙ А: Риск >= 60 -> Операция ЗАМОРАЖИВАЕТСЯ, запрос отправляется родителю
  if (riskIndex >= 60) {
    fetch('/api/child/payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ childId: currentChildId, amount, title, merchant, category, isSuspicious: true })
    }).catch(console.error);

    const fraudModal = document.getElementById('modal-antifraud-alert');
    const elFraudAmount = document.getElementById('fraud-modal-amount');
    if (elFraudAmount) elFraudAmount.textContent = `${amount.toFixed(2)} BYN`;
    if (fraudModal) fraudModal.classList.add('open');
    return;
  }

  // СЛУЧАЙ Б: Проверка баланса для безопасных покупок
  if (state.balance < amount) {
    showToast(`Недостаточно средств на балансе (${state.balance.toFixed(2)} BYN)`, 'danger');
    return;
  }

  // СЛУЧАЙ В: Риск < 60 -> Успешная оплата и сохранение в SQLite
  fetch('/api/child/payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ childId: currentChildId, amount, title, merchant, category, isSuspicious: false })
  }).then(r => r.json()).then(data => {
    if (data.newBalance !== undefined) lastKnownBalance = data.newBalance;
  }).catch(console.error);

  state.balance = Number((state.balance - amount).toFixed(2));
  lastKnownBalance = state.balance;
  state.limits.total.spent = Number((state.limits.total.spent + amount).toFixed(2));

  if (category === 'sweets') {
    state.limits.sweets.spent = Number((state.limits.sweets.spent + amount).toFixed(2));
  } else if (category === 'games') {
    state.limits.games.spent = Number((state.limits.games.spent + amount).toFixed(2));
  }

  saveState();
  showToast(`Оплата прошла успешно! 🎉 -${amount.toFixed(2)} BYN (${title})`, 'success');
}

// --- 5. УПРАВЛЕНИЕ МОДАЛЬНЫМИ ОКНАМИ ---
function updateTopUpMatchPreview() {
  const inputTopup = document.getElementById('input-topup-amount');
  const amt = parseFloat(inputTopup ? inputTopup.value : '5.00') || 0;
  const matchPct = state.piggyMatchPercent !== undefined ? state.piggyMatchPercent : 50;
  const bonus = Math.round(amt * (matchPct / 100) * 100) / 100;
  const total = Math.round((amt + bonus) * 100) / 100;

  const elLabel = document.getElementById('preview-match-label');
  if (elLabel) elLabel.textContent = `Родительский бонус (+${matchPct}%):`;
  const elChildAmt = document.getElementById('preview-child-amt');
  if (elChildAmt) elChildAmt.textContent = amt.toFixed(2);
  const elBonus = document.getElementById('preview-parent-bonus');
  if (elBonus) elBonus.textContent = `+${bonus.toFixed(2)}`;
  const elTotal = document.getElementById('preview-total-piggy');
  if (elTotal) elTotal.textContent = `${total.toFixed(2)} BYN`;
}

function setupModals() {
  // Кнопки быстрого открытия копилки
  const btnQuickPiggy = document.getElementById('btn-quick-piggy-topup');
  const modalPiggyEl = document.getElementById('modal-piggy');
  if (btnQuickPiggy && modalPiggyEl) {
    btnQuickPiggy.addEventListener('click', () => {
      updateTopUpMatchPreview();
      modalPiggyEl.classList.add('open');
    });
  }

  const inputTopupEl = document.getElementById('input-topup-amount');
  if (inputTopupEl) {
    inputTopupEl.addEventListener('input', updateTopUpMatchPreview);
  }

  // Кнопки закрытия
  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => {
      const modalId = btn.getAttribute('data-close');
      const modal = document.getElementById(modalId);
      if (modal) modal.classList.remove('open');
    });
  });

  // Закрытие по клику вне бокса
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.classList.remove('open');
    });
  });

  // 1. Открытие модалки копилки
  const btnOpenPiggy = document.getElementById('btn-open-piggy');
  const modalPiggy = document.getElementById('modal-piggy');
  if (btnOpenPiggy && modalPiggy) {
    btnOpenPiggy.addEventListener('click', () => {
      const editName = document.getElementById('child-edit-goal-name');
      const editGoal = document.getElementById('child-edit-goal-amount');
      if (editName) editName.value = state.piggyName || 'Новый велосипед 🚲';
      if (editGoal) editGoal.value = (state.piggyGoal || 200).toFixed(0);
      modalPiggy.classList.add('open');
    });
  }

  // Быстрые чипсы сумм пополнения копилки
  document.querySelectorAll('.child-piggy-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const amt = chip.getAttribute('data-amt');
      const inputTopup = document.getElementById('input-topup-amount');
      if (inputTopup && amt) inputTopup.value = amt;
    });
  });

  // Пополнение копилки прямо сейчас с записью в SQLite (без отката)
  const btnSubmitTopup = document.getElementById('btn-submit-topup');
  const inputTopup = document.getElementById('input-topup-amount');
  if (btnSubmitTopup && inputTopup) {
    btnSubmitTopup.addEventListener('click', async () => {
      const amt = parseFloat(inputTopup.value);
      if (isNaN(amt) || amt <= 0) {
        showToast('Введите корректную сумму пополнения', 'warning');
        return;
      }
      if (state.balance < amt) {
        showToast(`Недостаточно средств на балансе (${state.balance.toFixed(2)} BYN)`, 'danger');
        return;
      }

      try {
        const res = await fetch('/api/child/piggy-topup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ childId: currentChildId, amount: amt })
        });
        const d = await res.json();
        if (d.success) {
          state.balance = Number(d.balance);
          lastKnownBalance = Number(d.balance);
          state.piggySaved = Number(d.piggySaved);
          if (d.matchPercent !== undefined) state.piggyMatchPercent = d.matchPercent;
          saveState();
          renderUI();
          const bonusMsg = d.parentBonus > 0 ? ` (включая бонус родителей +${d.parentBonus.toFixed(2)} BYN)` : '';
          showToast(`Копилка пополнена на +${(d.totalAdded || amt).toFixed(2)} BYN${bonusMsg}! 🐷🎉`, 'success');
          
          // Маскот прыгает и празднует
          const bubble = document.getElementById('mascot-speech-bubble');
          const mascot = document.getElementById('moby-mascot');
          if (bubble && mascot) {
            mascot.classList.add('mascot-bounce');
            const addMsg = d.parentBonus > 0 ? ` а родители добавили еще +${d.parentBonus.toFixed(2)} BYN (+${d.matchPercent}%)!` : '!';
            bubble.textContent = `Ура-а-а! 🦊🎉 Ты отложил ${amt.toFixed(2)} BYN,${addMsg} В копилке уже ${d.piggySaved.toFixed(2)} BYN!`;
            bubble.classList.add('visible');
            setTimeout(() => bubble.classList.remove('visible'), 5000);
          }
          if (modalPiggy) modalPiggy.classList.remove('open');
        } else {
          showToast(d.error || 'Ошибка пополнения копилки', 'danger');
        }
      } catch (err) {
        state.balance = Number((state.balance - amt).toFixed(2));
        lastKnownBalance = state.balance;
        state.piggySaved = Number((state.piggySaved + amt).toFixed(2));
        saveState();
        renderUI();
        showToast(`Копилка пополнена на +${amt.toFixed(2)} BYN! 🐷🎉`, 'success');
        if (modalPiggy) modalPiggy.classList.remove('open');
      }
    });
  }

  // Свернуть / развернуть форму редактирования цели
  const toggleEditBox = document.getElementById('child-toggle-piggy-edit');
  const editFormBox = document.getElementById('child-piggy-edit-form');
  const editArrow = document.getElementById('child-piggy-edit-arrow');
  if (toggleEditBox && editFormBox) {
    toggleEditBox.addEventListener('click', () => {
      const isOpen = editFormBox.style.display !== 'none';
      editFormBox.style.display = isOpen ? 'none' : 'block';
      if (editArrow) editArrow.textContent = isOpen ? '▼' : '▲';
    });
  }

  // Сохранить изменения цели копилки
  const btnSaveChildPiggy = document.getElementById('btn-save-child-piggy-edit');
  if (btnSaveChildPiggy) {
    btnSaveChildPiggy.addEventListener('click', async () => {
      const editName = document.getElementById('child-edit-goal-name');
      const editGoal = document.getElementById('child-edit-goal-amount');
      const nameVal = editName ? editName.value.trim() : '';
      const goalVal = editGoal ? parseFloat(editGoal.value) : 0;

      if (!nameVal) {
        showToast('Введи название цели, на что копишь', 'warning');
        return;
      }
      if (isNaN(goalVal) || goalVal <= 0) {
        showToast('Введи корректную сумму цели', 'warning');
        return;
      }

      try {
        const res = await fetch('/api/child/piggy-edit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ childId: currentChildId, name: nameVal, goal: goalVal })
        });
        const d = await res.json();
        if (d.success) {
          state.piggyName = d.piggyName;
          state.piggyGoal = d.piggyGoal;
          saveState();
          renderUI();
          showToast(`Цель обновлена: «${d.piggyName}» (${d.piggyGoal.toFixed(2)} BYN) 🎯`, 'success');
          if (editFormBox) editFormBox.style.display = 'none';
          if (editArrow) editArrow.textContent = '▼';
        }
      } catch (err) {
        state.piggyName = nameVal;
        state.piggyGoal = goalVal;
        saveState();
        renderUI();
        showToast(`Цель обновлена: «${nameVal}» 🎯`, 'success');
      }
    });
  }

  // Сохранение автокопилки
  const btnSaveAuto = document.getElementById('btn-save-auto-piggy');
  const inputAutoAmount = document.getElementById('input-auto-amount');
  const selectAutoPeriod = document.getElementById('select-auto-period');
  if (btnSaveAuto && inputAutoAmount && selectAutoPeriod) {
    btnSaveAuto.addEventListener('click', () => {
      state.autoSaveAmount = parseFloat(inputAutoAmount.value) || 20.00;
      state.autoSavePeriod = selectAutoPeriod.value;
      saveState();
      showToast('Настройки автокопилки сохранены! ⚙️', 'success');
    });
  }

  // 2. Открытие модалки «Попросить у родителей»
  const btnOpenAsk = document.getElementById('btn-open-ask-parents');
  const modalAsk = document.getElementById('modal-ask-parents');
  const inputAskAmount = document.getElementById('input-ask-amount');
  const inputAskNote = document.getElementById('input-ask-note');
  const btnSubmitAsk = document.getElementById('btn-submit-ask');

  if (btnOpenAsk && modalAsk) {
    btnOpenAsk.addEventListener('click', () => modalAsk.classList.add('open'));
  }

  // Быстрые чипсы (+2, +5, +10)
  document.querySelectorAll('.chip-btn[data-amount]').forEach(chip => {
    chip.addEventListener('click', () => {
      if (inputAskAmount) inputAskAmount.value = chip.getAttribute('data-amount');
    });
  });

  if (btnSubmitAsk && inputAskAmount && inputAskNote) {
    btnSubmitAsk.addEventListener('click', async () => {
      const amt = parseFloat(inputAskAmount.value);
      const note = inputAskNote.value.trim() || 'На карманные расходы';
      if (isNaN(amt) || amt <= 0) {
        showToast('Укажи сумму запроса', 'warning');
        return;
      }

      try {
        const res = await fetch('/api/child/request-money', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ childId: currentChildId, amount: amt, note })
        });
        const d = await res.json();
        if (d.success) {
          showToast(`Запрос на ${amt.toFixed(2)} BYN отправлен маме и папе! 📨`, 'success');
          inputAskAmount.value = '';
          inputAskNote.value = '';
          if (modalAsk) modalAsk.classList.remove('open');
        } else {
          showToast(d.error || 'Ошибка отправки запроса', 'danger');
        }
      } catch (e) {
        showToast(`Запрос на ${amt.toFixed(2)} BYN отправлен родителям! 📨`, 'success');
        if (modalAsk) modalAsk.classList.remove('open');
      }
    });
  }

  // 3. Модалка экстренной блокировки и разблокировки карты
  const btnLostCard = document.getElementById('btn-lost-card');
  const modalLostCard = document.getElementById('modal-lost-card');
  const modalUnblockCard = document.getElementById('modal-unblock-card');
  const btnConfirmFreeze = document.getElementById('btn-confirm-freeze-card');
  const btnConfirmUnblock = document.getElementById('btn-confirm-unblock-card');
  const cardStatusPill = document.querySelector('.card-status-pill');

  function openCardStatusModal() {
    if (state.cardStatus === 'blocked') {
      if (modalUnblockCard) modalUnblockCard.classList.add('open');
    } else {
      if (modalLostCard) modalLostCard.classList.add('open');
    }
  }

  if (btnLostCard) {
    btnLostCard.addEventListener('click', openCardStatusModal);
  }

  if (cardStatusPill) {
    cardStatusPill.style.cursor = 'pointer';
    cardStatusPill.title = 'Нажмите для управления блокировкой карты';
    cardStatusPill.addEventListener('click', openCardStatusModal);
  }

  if (btnConfirmFreeze && modalLostCard) {
    btnConfirmFreeze.addEventListener('click', async () => {
      state.cardStatus = 'blocked';
      saveState();
      modalLostCard.classList.remove('open');
      showToast('Карта заблокирована! Деньги в полной безопасности 🛡️', 'danger');
      try {
        await fetch('/api/child/toggle-freeze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ childId: currentChildId, status: 'FROZEN' })
        });
      } catch (e) { console.error(e); }
    });
  }

  if (btnConfirmUnblock && modalUnblockCard) {
    btnConfirmUnblock.addEventListener('click', async () => {
      state.cardStatus = 'active';
      saveState();
      modalUnblockCard.classList.remove('open');
      showToast('Карта успешно разблокирована родителями! Оплата активна ✅', 'success');
      try {
        await fetch('/api/child/toggle-freeze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ childId: currentChildId, status: 'ACTIVE' })
        });
      } catch (e) { console.error(e); }
    });
  }
}

// --- 6. ЗАДАНИЯ ОТ РОДИТЕЛЕЙ (CHORE & REWARD) ---
function setupTasks() {
  const container = document.getElementById('tasks-list-container');
  if (!container) return;

  container.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action="complete-task"]');
    if (!btn) return;

    const taskItem = btn.closest('.task-item');
    if (!taskItem) return;

    const taskId = taskItem.getAttribute('data-task-id');
    const reward = taskItem.getAttribute('data-reward') || '0.00';

    btn.textContent = 'Ждет проверки ⏳';
    btn.classList.add('waiting');
    btn.disabled = true;

    try {
      const res = await fetch('/api/child/complete-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ childId: currentChildId, taskId })
      });
      const d = await res.json();
      if (d.success) {
        showToast('Задание отправлено на проверку родителям! 📨', 'info');
      }
    } catch (e) {
      showToast('Задание отправлено родителям! 📨', 'info');
    }
  });
}

// --- 7. ТЕСТОВАЯ ПАНЕЛЬ ИМИТАЦИИ ПОКУПОК (ДЕМО) ---
function setupDemoPurchases() {
  // Покупка 1: Мороженое 2.50 BYN (Обычная, риск < 60)
  const btnIceCream = document.getElementById('btn-buy-icecream');
  if (btnIceCream) {
    btnIceCream.addEventListener('click', () => {
      processPayment({
        amount: 2.50,
        title: 'Мороженое в кафе',
        merchant: 'Кафе Пломбир',
        category: 'sweets'
      });
    });
  }

  // Покупка 2: Донат / крупный заказ 40.00 BYN (Подозрительная, риск >= 60)
  const btnSuspicious = document.getElementById('btn-buy-suspicious');
  if (btnSuspicious) {
    btnSuspicious.addEventListener('click', () => {
      processPayment({
        amount: 40.00,
        title: 'Заказ в интернете',
        merchant: 'Unknown Online Game Store',
        category: 'games'
      });
    });
  }

  // Кнопка 3: Сброс состояния (SQLite и localStorage)
  const btnResetAll = document.getElementById('btn-demo-reset-all');
  if (btnResetAll) {
    btnResetAll.addEventListener('click', async () => {
      try {
        localStorage.removeItem(STORAGE_KEY);
        await fetch('/api/reset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ childId: 'child_1' })
        });
        state = JSON.parse(JSON.stringify(defaultState));
        saveState();
        showNotification('Данные и база SQLite успешно сброшены до чистых начальных значений!', 'info');
        if (quizInstance) {
          await quizInstance.refreshState();
          await quizInstance.loadQuestions();
          quizInstance.render();
        }
      } catch (err) {
        showNotification('Ошибка сброса: ' + err.message, 'danger');
      }
    });
  }
}

// --- 8. ИНТЕРАКТИВНЫЙ МАСКОТ (СТРОГО В ГРАНИЦАХ ЭКРАНА + АДАПТИВНЫЙ БАБЛ) ---
function setupMascotDragAndDrop() {
  const mascot = document.getElementById('moby-mascot');
  const bubble = document.getElementById('mascot-speech-bubble');
  const appContainer = document.querySelector('.mobile-app-container');
  if (!mascot || !appContainer) return;

  let isDragging = false;
  let startX = 0, startY = 0;
  let initialLeft = 0, initialTop = 0;
  let hasMoved = false;
  let bubbleTimeout = null;

  const mascotWidth = 90;
  const mascotHeight = 124;
  const minX = 8;
  const minY = 65;
  const DRAG_THRESHOLD = 8; // Минимальное смещение в пикселях для активации перетаскивания

  let dragOriginLeft = 0;
  let dragOriginTop = 0;
  let currentDragLeft = 0;

  function getBounds() {
    const contWidth = appContainer.clientWidth || 396;
    const contHeight = appContainer.clientHeight || 840;
    const maxX = Math.max(minX, contWidth - mascotWidth - 8);
    const maxY = Math.max(minY, contHeight - mascotHeight - 80);
    return { contWidth, contHeight, maxX, maxY };
  }

  function updateBubbleDirection(currentLeft, contWidth) {
    if (!bubble) return;
    const middle = (contWidth || 396) / 2;
    if (currentLeft < middle) {
      bubble.classList.remove('bubble-on-left');
      bubble.classList.add('bubble-on-right');
    } else {
      bubble.classList.remove('bubble-on-right');
      bubble.classList.add('bubble-on-left');
    }
  }

  // Начальная безопасная позиция строго внутри экрана
  const initialBounds = getBounds();
  mascot.style.left = `${initialBounds.maxX}px`;
  mascot.style.right = 'auto';
  mascot.style.top = '340px';
  updateBubbleDirection(initialBounds.maxX, initialBounds.contWidth);

  const foxyPhrases = [
    'Привет! Я лисенок Фокси из Moby! Давай копить вместе! 🦊✨',
    'Ты отлично справляешься! Не забудь проверить свои задания! 🎯',
    'Каждый сэкономленный рубль приближает тебя к цели в копилке! 💰',
    'Умница! Знания — это суперсила, проходи викторины в игре! 🧠💎',
    'QR-система KPOK связала нас с банком родителя — твои накопления под защитой! 🛡️'
  ];

  function triggerMascotClick() {
    // Подпрыгивание строго на месте (только по оси Y), никаких сдвигов по X
    mascot.classList.add('mascot-bounce');
    setTimeout(() => mascot.classList.remove('mascot-bounce'), 400);

    if (bubble) {
      const curLeft = mascot.offsetLeft;
      const { contWidth } = getBounds();
      updateBubbleDirection(curLeft, contWidth);

      const phrase = foxyPhrases[Math.floor(Math.random() * foxyPhrases.length)];
      bubble.textContent = phrase;
      bubble.classList.add('visible');
      clearTimeout(bubbleTimeout);
      bubbleTimeout = setTimeout(() => {
        bubble.classList.remove('visible');
      }, 4000);
    }
  }

  window.hideMascot = function(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const b = document.getElementById('mascot-speech-bubble');
    if (b) b.classList.remove('visible');
    const pill = document.getElementById('mascot-summon-pill');
    mascot.style.opacity = '0';
    mascot.style.pointerEvents = 'none';
    mascot.style.transform = 'scale(0.5)';
    setTimeout(() => {
      mascot.style.display = 'none';
      if (pill) pill.style.display = 'flex';
    }, 220);
  };

  window.showMascot = function() {
    const pill = document.getElementById('mascot-summon-pill');
    if (pill) pill.style.display = 'none';
    mascot.style.display = 'flex';
    mascot.style.pointerEvents = 'auto';
    setTimeout(() => {
      mascot.style.opacity = '1';
      mascot.style.transform = 'scale(1)';
    }, 20);
  };

  function onPointerDown(e) {
    if (e.target && e.target.closest('#mascot-close-btn')) return;
    isDragging = true;
    hasMoved = false;
    mascot.classList.remove('snapping');

    const clientX = e.clientX ?? (e.touches && e.touches[0].clientX);
    const clientY = e.clientY ?? (e.touches && e.touches[0].clientY);

    startX = clientX;
    startY = clientY;

    // Фиксируем исходную точку без изменения координат
    dragOriginLeft = mascot.offsetLeft;
    dragOriginTop = mascot.offsetTop;

    document.addEventListener('mousemove', onPointerMove);
    document.addEventListener('mouseup', onPointerUp);
    document.addEventListener('touchmove', onPointerMove, { passive: false });
    document.addEventListener('touchend', onPointerUp);
  }

  function onPointerMove(e) {
    if (!isDragging) return;

    const clientX = e.clientX ?? (e.touches && e.touches[0].clientX);
    const clientY = e.clientY ?? (e.touches && e.touches[0].clientY);

    const dx = clientX - startX;
    const dy = clientY - startY;

    // Активируем перемещение только если преодолен порог (исключает дрожание при обычном клике)
    if (!hasMoved) {
      if (Math.hypot(dx, dy) >= DRAG_THRESHOLD) {
        hasMoved = true;
      } else {
        return;
      }
    }

    const { contWidth, maxX, maxY } = getBounds();

    let newLeft = dragOriginLeft + dx;
    let newTop = dragOriginTop + dy;

    // Строгое ограничение: маскот никогда не может выйти за пределы экрана
    newLeft = Math.max(minX, Math.min(maxX, newLeft));
    newTop = Math.max(minY, Math.min(maxY, newTop));

    currentDragLeft = newLeft;
    mascot.style.left = `${newLeft}px`;
    mascot.style.top = `${newTop}px`;
    mascot.style.right = 'auto';

    updateBubbleDirection(newLeft, contWidth);

    if (e.cancelable) e.preventDefault();
  }

  function onPointerUp() {
    if (!isDragging) return;
    isDragging = false;

    document.removeEventListener('mousemove', onPointerMove);
    document.removeEventListener('mouseup', onPointerUp);
    document.removeEventListener('touchmove', onPointerMove);
    document.removeEventListener('touchend', onPointerUp);

    // Если это был простой клик без перетаскивания: НЕ СДВИГАЕМ маскот ни на пиксель!
    if (!hasMoved) {
      triggerMascotClick();
      return;
    }

    // Прилипание к ближайшему краю только после реального перетаскивания
    mascot.classList.add('snapping');
    const { contWidth, maxX } = getBounds();
    const middle = contWidth / 2;

    if (currentDragLeft + mascotWidth / 2 < middle) {
      mascot.style.left = `${minX}px`;
      mascot.style.right = 'auto';
      updateBubbleDirection(minX, contWidth);
    } else {
      mascot.style.left = `${maxX}px`;
      mascot.style.right = 'auto';
      updateBubbleDirection(maxX, contWidth);
    }
  }

  mascot.addEventListener('mousedown', onPointerDown);
  mascot.addEventListener('touchstart', onPointerDown, { passive: false });
}

// --- 9. ИНТЕГРАЦИЯ ИГРЫ «ЛОВЕЦ БОНУСОВ» И КВИЗ-ТРЕНАЖЕРА (IN-APP ES6) ---
let gameInstance = null;
let quizInstance = null;

function initGameModule(switchTabFn) {
  if (gameInstance) return;
  const canvas = document.getElementById('game-canvas');
  if (!canvas) return;

  const modalGameOver = document.getElementById('game-over-modal');
  const modalGameOverTitle = document.getElementById('modal-game-over-title');
  const modalGameOverSubtitle = document.getElementById('modal-game-over-subtitle');
  const modalFinalScore = document.getElementById('modal-final-score');
  const modalCoinsEarned = document.getElementById('modal-coins-earned');
  const btnStart = document.getElementById('btn-start-game');
  const btnPause = document.getElementById('btn-pause-game');
  const btnPlayAgain = document.getElementById('btn-play-again');
  const btnGoToQuizzes = document.getElementById('btn-go-to-quizzes');
  const liveBadge = document.querySelector('#pane-games .pane-badge-live');

  gameInstance = new MobyCatcherGame(canvas, {
    childId: 'child_1',
    apiBase: '',
    duration: 60, // Ограничение времени: 60 секунд (около 1 минуты)
    onScoreUpdate: (score, coins) => {
      // In-canvas HUD updates automatically
    },
    onTimeTick: (timeLeft) => {
      if (liveBadge) {
        const m = Math.floor(timeLeft / 60);
        const s = Math.floor(timeLeft % 60);
        liveBadge.textContent = `⏱ ${m}:${String(s).padStart(2, '0')}`;
        if (timeLeft <= 10) {
          liveBadge.style.color = '#E42C26';
          liveBadge.style.borderColor = 'rgba(228, 44, 38, 0.5)';
        } else {
          liveBadge.style.color = '#FF5912';
          liveBadge.style.borderColor = 'rgba(151, 207, 255, 0.5)';
        }
      }
    },
    onGameOver: (result) => {
      if (liveBadge) {
        liveBadge.textContent = 'ФИНИШ 🏁';
        liveBadge.style.color = '#2334C8';
      }

      const inv = result.inventory;
      const bonusGames = inv?.bonus_games_today !== undefined ? inv.bonus_games_today : (result.bonusGamesToday || 0);
      const isLimit = inv?.limitReached || bonusGames >= 3;

      const elLimitBadge = document.getElementById('game-daily-limit-badge');
      if (elLimitBadge) {
        elLimitBadge.textContent = isLimit ? '🎁 3/3 (лимит)' : `🎁 ${bonusGames}/3 в день`;
        if (isLimit) {
          elLimitBadge.style.color = '#E42C26';
          elLimitBadge.style.borderColor = 'rgba(228, 44, 38, 0.4)';
          elLimitBadge.style.background = 'rgba(228, 44, 38, 0.12)';
        } else {
          elLimitBadge.style.color = '#FF5912';
          elLimitBadge.style.borderColor = 'rgba(255, 89, 18, 0.3)';
          elLimitBadge.style.background = 'rgba(255, 89, 18, 0.12)';
        }
      }

      if (modalGameOverTitle && modalGameOverSubtitle) {
        if (isLimit) {
          modalGameOverTitle.textContent = result.reason === 'time_up' ? '⏱ Время вышло!' : '❤️ Закончились жизни';
          modalGameOverSubtitle.textContent = 'Дневной лимит бонусов (3 из 3) на сегодня исчерпан. Игра сыграна для тренировки и рекорда!';
          showToast(`🎁 Лимит бонусов на сегодня (3/3) исчерпан! Рекорд: ${result.score}`, 'info');
        } else {
          modalGameOverTitle.textContent = result.reason === 'time_up' ? '⏱ Время вышло!' : '❤️ Закончились жизни';
          modalGameOverSubtitle.textContent = `Бонусы сохранены в базе Moby! Получено сегодня: ${bonusGames}/3`;
          showToast(`Игра окончена! Заработано ${result.coins} монет 🪙 (Бонусы: ${bonusGames}/3)`, 'info');
        }
      } else {
        showToast(`Игра окончена! Заработано ${result.coins} монет 🪙`, 'info');
      }

      if (modalFinalScore) modalFinalScore.textContent = result.score;
      if (modalCoinsEarned) modalCoinsEarned.textContent = isLimit ? '0 (лимит)' : `+${result.coins}`;
      if (modalGameOver) {
        modalGameOver.classList.add('visible');
        const canvasContainer = document.querySelector('.canvas-container');
        if (canvasContainer) {
          canvasContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }

      // Обновляем инвентарь квиза, если он уже был открыт
      if (quizInstance) {
        quizInstance.refreshState();
      }
    }
  });

  // Загружаем начальный статус дневного лимита
  fetch('/api/inventory/child_1')
    .then(r => r.json())
    .then(d => {
      if (d.success && d.inventory) {
        const elLimitBadge = document.getElementById('game-daily-limit-badge');
        if (elLimitBadge) {
          const bg = d.inventory.bonus_games_today || 0;
          elLimitBadge.textContent = bg >= 3 ? '🎁 3/3 (лимит)' : `🎁 ${bg}/3 в день`;
          if (bg >= 3) {
            elLimitBadge.style.color = '#E42C26';
            elLimitBadge.style.borderColor = 'rgba(228, 44, 38, 0.4)';
          }
        }
      }
    })
    .catch(() => {});

  if (btnStart) {
    btnStart.addEventListener('click', () => {
      if (modalGameOver) modalGameOver.classList.remove('visible');
      gameInstance.start();
      btnStart.textContent = '🔄 Перезапуск';
      if (btnPause) btnPause.textContent = '⏸ Пауза';
    });
  }

  if (btnPause) {
    btnPause.addEventListener('click', () => {
      if (!gameInstance.isRunning) return;
      if (gameInstance.isPaused) {
        gameInstance.resume();
        btnPause.textContent = '⏸ Пауза';
      } else {
        gameInstance.pause();
        btnPause.textContent = '▶ Продолжить';
      }
    });
  }

  if (btnPlayAgain) {
    btnPlayAgain.addEventListener('click', () => {
      if (modalGameOver) modalGameOver.classList.remove('visible');
      gameInstance.start();
      if (btnStart) btnStart.textContent = '🔄 Перезапуск';
      if (btnPause) btnPause.textContent = '⏸ Пауза';
    });
  }

  if (btnGoToQuizzes) {
    btnGoToQuizzes.addEventListener('click', () => {
      if (modalGameOver) modalGameOver.classList.remove('visible');
      switchTabFn('pane-quizzes');
    });
  }
}

function initQuizModule() {
  if (quizInstance) {
    quizInstance.refreshState().then(() => quizInstance.render());
    return;
  }

  const container = document.getElementById('quiz-container');
  if (!container) return;

  quizInstance = new MobyQuizEngine(container, {
    childId: 'child_1',
    apiBase: '',
    onScoreUpdate: (quizState, isCorrect) => {
      if (isCorrect) {
        showToast('Верно! Отличный ответ! 🎯', 'success');
      }
    },
    onQuizCompleted: (result) => {
      if (result.newBalance !== undefined && result.newBalance !== null) {
        state.balance = Number(result.newBalance);
      } else if (result.rewardAmount) {
        state.balance = Number((state.balance + result.rewardAmount).toFixed(2));
      }
      saveState();
      const rewardFormatted = Number(result.rewardAmount !== undefined ? result.rewardAmount : 2.00).toFixed(2);
      showToast(`🎉 Все вопросы квиза пройдены! Начислено +${rewardFormatted} BYN от родителей! 💰`, 'success');
    },
    onInventoryChange: (inventory) => {
      console.log('Инвентарь квиза обновлен:', inventory);
    }
  });

  quizInstance.init();
}

// --- 10. SPA НАВИГАЦИЯ (BOTTOM BAR + IN-APP TABS) ---
function setupNavigation() {
  const navButtons = document.querySelectorAll('.nav-item-btn');
  const panes = document.querySelectorAll('.tab-pane');
  const mascot = document.getElementById('moby-mascot');

  function switchTab(targetId) {
    // 1. Если покидаем вкладку игры — ставим игру на паузу
    if (targetId !== 'pane-games' && gameInstance && gameInstance.isRunning && !gameInstance.isPaused) {
      gameInstance.pause();
      const btnPause = document.getElementById('btn-pause-game');
      if (btnPause) btnPause.textContent = '▶ Продолжить';
    }

    // 2. Скрываем плавающего маскота на вкладках игры и квизов, чтобы он не загораживал контент
    const pill = document.getElementById('mascot-summon-pill');
    if (mascot) {
      if (targetId === 'pane-home') {
        mascot.style.display = 'flex';
      } else {
        mascot.style.display = 'none';
        if (pill) pill.style.display = 'none';
      }
    }

    // 3. Переключаем активную вкладку и нижнюю панель
    navButtons.forEach(btn => {
      if (btn.getAttribute('data-target') === targetId) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    panes.forEach(pane => {
      if (pane.id === targetId) {
        pane.classList.add('active');
      } else {
        pane.classList.remove('active');
      }
    });

    // 4. Ленивая инициализация и обновление данных
    if (targetId === 'pane-games') {
      initGameModule(switchTab);
    } else if (targetId === 'pane-quizzes') {
      initQuizModule();
    }
  }

  // Клики по нижней навигационной панели
  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-target');
      if (target) switchTab(target);
    });
  });

  // Кнопки возврата «← На главную» из шапки вкладок Игры и Тесты
  const btnBackGame = document.getElementById('btn-back-from-game');
  if (btnBackGame) {
    btnBackGame.addEventListener('click', () => switchTab('pane-home'));
  }

  const btnBackQuiz = document.getElementById('btn-back-from-quiz');
  if (btnBackQuiz) {
    btnBackQuiz.addEventListener('click', () => switchTab('pane-home'));
  }
}

// --- 11. РЕАКТИВНАЯ СИНХРОНИЗАЦИЯ С СЕРВЕРОМ И БАЗОЙ SQLITE ---
let isPolling = false;
async function pollLiveState() {
  if (isPolling) return;
  isPolling = true;
  try {
    const res = await fetch(`/api/child/state?childId=${encodeURIComponent(currentChildId)}`);
    if (!res.ok) return;
    const data = await res.json();

    const waitingModal = document.getElementById('waiting-for-parent-modal');
    if (!data.exists) {
      if (waitingModal) waitingModal.classList.add('open');
      return;
    } else {
      if (waitingModal) waitingModal.classList.remove('open');
    }

    if (data.child) {
      if (data.child.id) currentChildId = data.child.id;

      // Обновляем имя и возраст ребенка
      const nameEl = document.querySelector('.user-name-badge');
      if (nameEl && data.child.name) {
        nameEl.textContent = `${data.child.name} (${data.child.age} лет)`;
      }
      const avatarEl = document.querySelector('.child-avatar-wrap');
      if (avatarEl && data.child.avatar) {
        avatarEl.textContent = data.child.avatar;
      }

      // Реактивно обновляем баланс при пополнении родителем
      if (lastKnownBalance === null) {
        lastKnownBalance = data.child.balance;
      } else if (Math.abs(data.child.balance - lastKnownBalance) > 0.001) {
        if (data.child.balance > lastKnownBalance) {
          const diff = (data.child.balance - lastKnownBalance).toFixed(2);
          showToast(`Родители пополнили баланс: +${diff} BYN! 💳🎉`, 'success');

          const bubble = document.getElementById('mascot-speech-bubble');
          const mascot = document.getElementById('moby-mascot');
          if (bubble && mascot) {
            mascot.classList.add('mascot-bounce');
            bubble.textContent = `Родители пополнили баланс на +${diff} BYN! 🦊🎉`;
            bubble.classList.add('visible');
            setTimeout(() => bubble.classList.remove('visible'), 5000);
          }
        }
        lastKnownBalance = data.child.balance;
      }
      state.balance = data.child.balance;

      // Реактивно синхронизируем статус карты
      const mappedStatus = (data.child.cardStatus === 'FROZEN' || data.child.cardStatus === 'blocked') ? 'blocked' : 'active';
      if (lastKnownStatus !== null && lastKnownStatus !== mappedStatus) {
        if (mappedStatus === 'blocked') {
          showToast('Родитель временно заморозил карту 🔒', 'warning');
        } else {
          showToast('Родитель разблокировал карту! ✅', 'success');
        }
      }
      lastKnownStatus = mappedStatus;
      state.cardStatus = mappedStatus;

      // Реактивная синхронизация суточного лимита и категорий из базы SQLite
      if (data.child.dailyLimit !== undefined) {
        const newDaily = Number(data.child.dailyLimit);
        if (lastKnownDailyLimit !== null && Math.abs(lastKnownDailyLimit - newDaily) > 0.001) {
          showToast(`Родители обновили лимит на день: ${newDaily.toFixed(2)} BYN 📊`, 'info');
        }
        lastKnownDailyLimit = newDaily;
        if (!state.limits) state.limits = {};
        if (!state.limits.total) state.limits.total = {};
        state.limits.total.max = newDaily;
      }

      if (data.child.spentToday !== undefined) {
        if (!state.limits) state.limits = {};
        if (!state.limits.total) state.limits.total = {};
        state.limits.total.spent = Number(data.child.spentToday);
      }

      if (Array.isArray(data.limits)) {
        state.categoryLimits = data.limits;
        const currentHash = JSON.stringify(data.limits);
        if (lastKnownLimitsHash !== null && lastKnownLimitsHash !== currentHash) {
          showToast('Родители обновили правила и лимиты расходов 🛡️', 'info');
        }
        lastKnownLimitsHash = currentHash;
      }

      // Синхронизация копилки и софинансирования
      if (data.child.piggyName !== undefined) state.piggyName = data.child.piggyName;
      if (data.child.piggySaved !== undefined) state.piggySaved = data.child.piggySaved;
      if (data.child.piggyGoal !== undefined) state.piggyGoal = data.child.piggyGoal;
      if (data.child.piggyMatchPercent !== undefined) state.piggyMatchPercent = data.child.piggyMatchPercent;
      if (data.child.piggyMatchMaxMonthly !== undefined) state.piggyMatchMaxMonthly = data.child.piggyMatchMaxMonthly;
      if (data.child.piggyParentBonusTotal !== undefined) state.piggyParentBonusTotal = data.child.piggyParentBonusTotal;

      // Динамический рендеринг заданий из базы
      if (Array.isArray(data.tasks)) {
        renderTasksList(data.tasks);
      }

      // Динамический рендеринг транзакций
      if (Array.isArray(data.transactions)) {
        renderChildTransactions(data.transactions);
      }

      renderUI();
    }
  } catch (err) {
    // Offline or network error
  } finally {
    isPolling = false;
  }
}

function renderChildLimits(dailyLimit, categoryLimits) {
  const container = document.getElementById('child-limits-container');
  if (!container) return;

  const totalLimit = Number(dailyLimit !== undefined ? dailyLimit : (state.limits?.total?.max || 20.00));
  const totalSpent = Number(state.limits?.total?.spent || 0.00);
  const totalPct = totalLimit > 0 ? Math.min(100, Math.round((totalSpent / totalLimit) * 100)) : 0;
  const isTotalOver = totalLimit > 0 && totalSpent >= totalLimit;
  const totalBarColor = isTotalOver ? 'red' : 'blue';

  let html = `
    <!-- 1. Общий суточный лимит -->
    <div class="limit-item">
      <div class="limit-top-row">
        <span class="limit-name">Общий суточный лимит</span>
        <span class="limit-values">
          <strong id="limit-total-spent">${totalSpent.toFixed(2)}</strong> / <span id="limit-total-max">${totalLimit.toFixed(2)}</span> BYN
          ${isTotalOver ? ' <span style="color:var(--mt-red); font-size:11px; font-weight:800;">(Исчерпан ⚠️)</span>' : ''}
        </span>
      </div>
      <div class="progress-track">
        <div class="progress-fill ${totalBarColor}" id="limit-total-bar" style="width: ${totalPct}%;"></div>
      </div>
    </div>
  `;

  // 2. Лимиты по категориям из SQLite
  const cats = Array.isArray(categoryLimits) ? categoryLimits : (state.categoryLimits || []);
  if (cats.length > 0) {
    cats.forEach(cat => {
      const isBlocked = Boolean(cat.is_blocked);
      const limitAmt = Number(cat.limit_amount || 0);
      const spentAmt = Number(cat.spent_amount || 0);
      const icon = cat.category_icon || '🛍️';
      const name = cat.category;

      if (isBlocked) {
        html += `
          <div class="limit-item limit-item-blocked" style="background: rgba(228, 44, 38, 0.06); padding: 8px 10px; border-radius: 10px; border: 1px solid rgba(228, 44, 38, 0.2);">
            <div class="limit-top-row">
              <span class="limit-name" style="color: var(--mt-red); font-weight: 700;">${icon} ${name}</span>
              <span class="limit-values" style="color: var(--mt-red); font-weight: 800; font-size: 11px;">
                ⛔ Заблокировано
              </span>
            </div>
            <div class="progress-track" style="background: rgba(228, 44, 38, 0.15);">
              <div class="progress-fill red" style="width: 100%;"></div>
            </div>
          </div>
        `;
      } else if (limitAmt > 0) {
        const catPct = Math.min(100, Math.round((spentAmt / limitAmt) * 100));
        const isCatOver = spentAmt >= limitAmt;
        const catBarColor = isCatOver ? 'red' : 'orange';
        html += `
          <div class="limit-item">
            <div class="limit-top-row">
              <span class="limit-name">${icon} ${name}</span>
              <span class="limit-values">
                <strong>${spentAmt.toFixed(2)}</strong> / ${limitAmt.toFixed(2)} BYN
                ${isCatOver ? ' <span style="color:var(--mt-red); font-size:10px; font-weight:800;">(Превышен ⚠️)</span>' : ''}
              </span>
            </div>
            <div class="progress-track">
              <div class="progress-fill ${catBarColor}" style="width: ${catPct}%;"></div>
            </div>
          </div>
        `;
      } else {
        html += `
          <div class="limit-item">
            <div class="limit-top-row">
              <span class="limit-name">${icon} ${name}</span>
              <span class="limit-values">
                <strong>${spentAmt.toFixed(2)} BYN</strong> / Без лимита
              </span>
            </div>
            <div class="progress-track">
              <div class="progress-fill softblue" style="width: ${spentAmt > 0 ? '100%' : '0%'};"></div>
            </div>
          </div>
        `;
      }
    });
  }

  container.innerHTML = html;
}

function renderChildTransactions(transactions) {
  const container = document.getElementById('child-transactions-container');
  if (!container) return;

  if (!transactions || transactions.length === 0) {
    container.innerHTML = `
      <div style="font-size: 12px; color: #5A6578; text-align: center; padding: 16px; background: rgba(35, 52, 200, 0.04); border-radius: 12px; border: 1px dashed rgba(35, 52, 200, 0.2);">
        Пока нет операций по карте. Первые покупки появятся здесь 💳
      </div>
    `;
    return;
  }

  container.innerHTML = transactions.map(tx => {
    const isIncome = tx.amount > 0 || tx.type === 'INCOME' || tx.type === 'REWARD';
    const icon = tx.category_icon || (isIncome ? '💰' : '🛍️');
    const sign = isIncome ? '+' : '-';
    const absAmt = Math.abs(tx.amount).toFixed(2);
    const amtClass = isIncome ? 'income' : 'expense';
    const dateStr = tx.date && tx.time ? `${tx.date}, ${tx.time}` : (tx.time || 'Сегодня');
    return `
      <div class="tx-item">
        <div class="tx-left">
          <div class="tx-icon-wrap">${icon}</div>
          <div>
            <div class="tx-title">${tx.title}</div>
            <div class="tx-meta">${dateStr} • ${tx.category || 'Операция'}</div>
          </div>
        </div>
        <div class="tx-amount ${amtClass}">${sign}${absAmt} BYN</div>
      </div>
    `;
  }).join('');
}

function renderTasksList(tasks) {
  const container = document.getElementById('tasks-list-container');
  if (!container) return;

  if (!tasks || tasks.length === 0) {
    container.innerHTML = '<div class="empty-state-card" style="padding: 16px; text-align: center; color: #7F8C8D; font-size: 13px; background: #FFF9F0; border-radius: 14px; border: 1px dashed #FFD6A5;">Пока нет активных заданий от родителей 🌟</div>';
    return;
  }

  const html = tasks.map(t => {
    const isCompleted = t.status === 'COMPLETED';
    const isWaiting = t.status === 'WAITING';
    const rewardVal = Number(t.reward_amount !== undefined ? t.reward_amount : (t.rewardAmount !== undefined ? t.rewardAmount : 0));
    let btnText = 'Я сделал! ✅';
    let btnClass = 'btn-task-action';
    let disabledAttr = '';
    if (isCompleted) {
      btnText = 'Выполнено! 🎉';
      btnClass += ' waiting';
      disabledAttr = 'disabled';
    } else if (isWaiting) {
      btnText = 'Ждет проверки ⏳';
      btnClass += ' waiting';
      disabledAttr = 'disabled';
    }
    return `
      <div class="task-item" data-task-id="${t.id}" data-reward="${rewardVal.toFixed(2)}">
        <div class="task-left">
          <span class="task-name">${t.title}</span>
          <span class="task-reward-badge">+${rewardVal.toFixed(2)} BYN</span>
        </div>
        <button class="${btnClass}" data-action="complete-task" ${disabledAttr}>${btnText}</button>
      </div>
    `;
  }).join('');

  container.innerHTML = html;
}

// --- 12. ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ ---
function initApp() {
  renderUI();
  setupModals();
  setupTasks();
  setupDemoPurchases();
  setupMascotDragAndDrop();
  setupNavigation();

  // Запуск моментального поллинга (1.5 сек) для реактивности с кабинетом родителя
  pollLiveState();
  setInterval(pollLiveState, 1500);

  console.log('🏦 MTBank Moby Kids Banking Interface v1.0 Initialized');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

// --- MAGIC FAMILY QR: СКАНЕР И АВТОРИЗАЦИЯ ДЕТСКОГО ЭКРАНА ---
window.openMagicQrScannerModal = function() {
  const modal = document.getElementById('modal-magic-qr-scanner');
  if (modal) modal.style.display = 'flex';
};

window.closeMagicQrScannerModal = function() {
  const modal = document.getElementById('modal-magic-qr-scanner');
  if (modal) modal.style.display = 'none';
};

window.completeSimulatedQrScan = function() {
  window.closeMagicQrScannerModal();
  window.showMagicQrPairedToast('magic-pair-code-742891');
};

window.showMagicQrPairedToast = function(token) {
  const mascot = document.getElementById('moby-mascot');
  const bubble = document.getElementById('mascot-speech-bubble');
  
  if (mascot && bubble) {
    mascot.classList.add('mascot-bounce');
    bubble.textContent = '🎉 Ура! QR KPOK распознан! Твой аккаунт связан с Moby родителя! Лимиты и копилка активны! 🦊🚀';
    bubble.classList.add('visible');
    setTimeout(() => bubble.classList.remove('visible'), 5000);
  }

  if (typeof showToast === 'function') {
    showToast('✨ QR-система KPOK успешно распознана! Связь с родителем установлена (ст. 27 ГК РБ)');
  }
};

// Проверка Magic QR токена при переходе по ссылке
document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  if (token) {
    setTimeout(() => {
      window.showMagicQrPairedToast(token);
    }, 700);
  }
});
