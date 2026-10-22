/**
 * app.js - MTBank Moby Teens (14-17 years) Client Banking Engine
 * Подростковый мобильный банкинг с P2P, двухслойным лимитом самоконтроля,
 * мягким антифродом (75+), кибер-маскотом и встроенными модулями Game/Quiz.
 */

import { MobyCatcherGame } from './teens_game.js';
import { MobyQuizEngine } from './teens_quiz.js';

// --- 1. РЕАКТИВНОЕ СОСТОЯНИЕ (STATE) ---
const STORAGE_KEY = 'moby_teens_state_v1';
const urlParams = new URLSearchParams(window.location.search);
let currentChildId = urlParams.get('childId') || 'teen_1';
let lastKnownBalance = null;
let lastKnownStatus = null;
let lastKnownDailyLimit = null;

const defaultState = {
  childId: currentChildId,
  balance: 42.50,
  piggySaved: 120.00,
  piggyGoal: 350.00,
  piggyName: 'Курсы веб-дизайна 🎨',
  piggyMatchPercent: 50.0,
  piggyMatchMaxMonthly: 50.0,
  piggyParentBonusTotal: 60.00,
  mobyScore: 740,
  cardStatus: 'active', // 'active' | 'blocked'
  limits: {
    parentMax: 30.00,   // Жесткий родительский потолок (нельзя изменить подростку)
    selfMax: 18.00,     // Добровольный лимит самоконтроля (настраивается подростком)
    spentToday: 12.50   // Потрачено за сегодня
  },
  tasks: {
    tt1: 'ready',       // 'ready' | 'waiting'
    tt2: 'ready',
    tt3: 'ready'
  }
};

let inMemoryState = null;
let state = loadState();
let pendingOperation = null; // Для подтверждения при превышении лимита самоконтроля

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    let loaded = raw ? { ...defaultState, ...JSON.parse(raw) } : null;
    if (loaded && typeof window !== 'undefined' && (window.location.search.includes('unblock') || window.location.search.includes('reset'))) {
      loaded.cardStatus = 'active';
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(loaded)); } catch (_) {}
    }
    if (loaded) return loaded;
  } catch (e) {
    console.warn('LocalStorage недоступен, используется оперативная память:', e);
  }
  if (!inMemoryState) {
    inMemoryState = JSON.parse(JSON.stringify(defaultState));
  }
  return inMemoryState;
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    inMemoryState = JSON.parse(JSON.stringify(state));
  }
  renderUI();
}

// --- 2. ОБНОВЛЕНИЕ И РЕНДЕРИНГ ИНТЕРФЕЙСА (UI RENDER) ---
function renderUI() {
  // 1. Баланс
  const elBalance = document.getElementById('current-balance-text');
  if (elBalance) elBalance.textContent = state.balance.toFixed(2);

  // 2. Moby Score
  const elScore = document.getElementById('moby-score-val');
  if (elScore) elScore.textContent = state.mobyScore;

  // 3. Копилка на главной
  const elPiggyPreview = document.getElementById('card-piggy-preview');
  if (elPiggyPreview) elPiggyPreview.textContent = `${state.piggyName || 'Цель'}: ${state.piggySaved.toFixed(0)} BYN`;

  // 4. Модалка копилки
  const elPiggyTitle = document.getElementById('piggy-modal-title');
  if (elPiggyTitle) elPiggyTitle.textContent = `Цель: ${state.piggyName || 'Ноутбук'}`;
  const elPiggyGoal = document.getElementById('piggy-modal-goal');
  if (elPiggyGoal) elPiggyGoal.textContent = state.piggyGoal.toFixed(2);
  const elPiggySaved = document.getElementById('piggy-modal-saved');
  const elPiggyPct = document.getElementById('piggy-modal-pct');
  const elPiggyBar = document.getElementById('piggy-modal-bar');
  if (elPiggySaved && elPiggyPct && elPiggyBar) {
    elPiggySaved.textContent = state.piggySaved.toFixed(2);
    const pct = state.piggyGoal > 0 ? Math.min(100, Math.round((state.piggySaved / state.piggyGoal) * 100)) : 0;
    elPiggyPct.textContent = `${pct}%`;
    elPiggyBar.style.width = `${pct}%`;
  }

  // 5. Двухслойные лимиты
  const elParentMax = document.getElementById('limit-parent-max-text');
  const elSelfMax = document.getElementById('limit-self-max-text');
  const elSpentToday = document.getElementById('limit-spent-today-text');
  const elTrackFill = document.getElementById('dual-track-fill-bar');
  const elMarkerLine = document.getElementById('self-limit-marker-line');

  if (elParentMax) elParentMax.textContent = state.limits.parentMax.toFixed(2);
  if (elSelfMax) elSelfMax.textContent = state.limits.selfMax.toFixed(2);
  if (elSpentToday) elSpentToday.textContent = state.limits.spentToday.toFixed(2);

  if (elTrackFill && elMarkerLine) {
    // Процент заполнения относительно родительского максимума
    const spentPct = Math.min(100, (state.limits.spentToday / state.limits.parentMax) * 100);
    const selfLimitPct = Math.min(100, (state.limits.selfMax / state.limits.parentMax) * 100);

    elTrackFill.style.width = `${spentPct}%`;
    elMarkerLine.style.left = `${selfLimitPct}%`;

    const markerTag = elMarkerLine.querySelector('.self-limit-marker-tag');
    if (markerTag) {
      markerTag.textContent = `Лимит ${state.limits.selfMax.toFixed(0)} BYN`;
    }

    if (state.limits.spentToday > state.limits.selfMax) {
      elTrackFill.classList.add('over-self-limit');
    } else {
      elTrackFill.classList.remove('over-self-limit');
    }
  }

  // Динамические тексты лимита самоконтроля и подсказок
  const elTipText = document.getElementById('self-limit-tip-text');
  if (elTipText) {
    elTipText.textContent = `Если покупка превысит ваш личный лимит (${state.limits.selfMax.toFixed(0)} BYN), банк предупредит вас и поможет сохранить деньги на ${state.piggyName || 'цель'}!`;
  }
  const elModalDesc = document.getElementById('self-limit-modal-desc');
  if (elModalDesc) {
    elModalDesc.innerHTML = `Вы можете <strong>добровольно ужесточить свой лимит</strong> ниже родительского потолка (${state.limits.parentMax.toFixed(2)} BYN/день), чтобы выработать дисциплину и быстрее накопить на цель.`;
  }
  const elRangeMaxLabel = document.getElementById('self-limit-range-max-label');
  if (elRangeMaxLabel) {
    elRangeMaxLabel.textContent = `Макс: ${state.limits.parentMax.toFixed(2)} BYN`;
  }
  const elRangeInput = document.getElementById('self-limit-range');
  const elNumInput = document.getElementById('self-limit-number-input');
  if (elRangeInput) {
    elRangeInput.max = String(Math.round(state.limits.parentMax));
    elRangeInput.min = '1';
  }
  if (elNumInput) {
    elNumInput.max = String(Math.round(state.limits.parentMax));
    elNumInput.min = '1';
  }

  // 6. Задания от родителей
  for (const [taskId, status] of Object.entries(state.tasks)) {
    const item = document.querySelector(`.teen-task-item[data-task-id="${taskId}"]`);
    if (item) {
      const btn = item.querySelector('.btn-teen-task');
      if (btn) {
        if (status === 'waiting') {
          btn.textContent = 'Ждет проверки ⏳';
          btn.classList.add('waiting');
          btn.disabled = true;
        } else {
          btn.textContent = 'Я выполнил! ✅';
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

// --- 4. СКРЫТЫЙ СКОРИНГ АНТИФРОДА ДЛЯ ПОДРОСТКОВ (ПОРОГ 75+) ---
function evaluateTeenRisk(operation) {
  let score = 15; // базовый доверенный скоринг для подростка

  // 1. Крупная разовая сумма (от 50 BYN)
  if (operation.amount >= 50.00) {
    score += 40;
  }

  // 2. Подозрительные ключевые слова в назначении / мерчанте
  const text = ((operation.merchant || '') + ' ' + (operation.comment || '') + ' ' + (operation.title || '')).toLowerCase();
  if (text.includes('донат') || text.includes('крипта') || text.includes('unknown') || text.includes('casino') || text.includes('сомнительн') || text.includes('обмен')) {
    score += 35;
  }

  // 3. Превышение жесткого родительского дневного потолка
  if (state.limits.spentToday + operation.amount > state.limits.parentMax) {
    score += 60; // Гарантированно уходит в категорию 75+
  }

  return Math.min(100, Math.max(1, score));
}

// Выполнение финансовой операции (покупка или P2P перевод)
async function processOperation(op, isConfirmedOverlimit = false) {
  if (state.cardStatus === 'blocked') {
    showToast('❌ Карта заблокирована! Операция отклонена.', 'danger');
    return false;
  }

  const risk = evaluateTeenRisk(op);

  // СЛУЧАЙ А: Риск >= 75 или превышение родительского жесткого потолка
  if (risk >= 75) {
    const antifraudModal = document.getElementById('modal-antifraud-approval');
    const antifraudDesc = document.getElementById('antifraud-modal-desc');
    if (antifraudDesc) {
      if (state.limits.spentToday + op.amount > state.limits.parentMax) {
        antifraudDesc.textContent = `Сумма операции (${op.amount.toFixed(2)} BYN) превышает жесткий дневной лимит, установленный родителями (${state.limits.parentMax.toFixed(2)} BYN). Запрос на подтверждение отправлен в родительское приложение Moby Family.`;
      } else {
        antifraudDesc.textContent = `Сумма (${op.amount.toFixed(2)} BYN) или получатель вызвали сомнения антифрод-системы безопасности банка. Запрос отправлен родителям на одобрение.`;
      }
    }
    if (antifraudModal) antifraudModal.classList.add('open');
    showToast('Операция отправлена на подтверждение родителям 🛡️', 'warning');

    fetch('/api/teen/payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        childId: currentChildId,
        amount: op.amount,
        title: op.title || 'Подозрительная операция',
        merchant: op.recipientName || op.merchant || 'Онлайн-сервис',
        isSuspicious: true
      })
    }).catch(console.error);

    return false;
  }

  // СЛУЧАЙ Б: Превышение добровольного лимита самоконтроля (но укладывается в родительский)
  const isOverSelfLimit = (state.limits.spentToday + op.amount > state.limits.selfMax);
  if (isOverSelfLimit && !isConfirmedOverlimit) {
    pendingOperation = op;
    const warningModal = document.getElementById('modal-self-limit-warning');
    const descText = document.getElementById('warning-alert-desc-text');
    if (descText) {
      descText.textContent = `Вы собираетесь потратить ${op.amount.toFixed(2)} BYN. Это превысит ваш личный лимит самоконтроля (${state.limits.selfMax.toFixed(2)} BYN/день), но укладывается в родительский лимит (${state.limits.parentMax.toFixed(2)} BYN).`;
    }
    if (warningModal) warningModal.classList.add('open');
    return false;
  }

  // СЛУЧАЙ В: Проверка баланса счета
  if (state.balance < op.amount) {
    showToast(`Недостаточно средств на счете (Баланс: ${state.balance.toFixed(2)} BYN)`, 'danger');
    return false;
  }

  // СЛУЧАЙ Г: Успешное выполнение
  state.balance = Number((state.balance - op.amount).toFixed(2));
  state.limits.spentToday = Number((state.limits.spentToday + op.amount).toFixed(2));

  // Награда очками Moby Score за финансовую активность
  state.mobyScore = Math.min(850, state.mobyScore + 2);

  if (op.type === 'p2p') {
    try {
      await fetch('/api/p2p/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childId: currentChildId,
          recipient: op.recipient,
          recipientName: op.recipientName || op.recipient,
          amount: op.amount,
          comment: op.comment
        })
      });
    } catch (e) {
      console.warn('P2P API error:', e);
    }
    showToast(`⚡ Перевод ${op.amount.toFixed(2)} BYN отправлен получателю ${op.recipientName || op.recipient}!`, 'success');
  } else {
    try {
      await fetch('/api/teen/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childId: currentChildId,
          amount: op.amount,
          title: op.title || 'Оплата покупок',
          merchant: op.merchant || 'МТБанк Магазин',
          category: op.category || 'Покупки',
          isSuspicious: false
        })
      });
    } catch (e) {
      console.warn('Payment API error:', e);
    }
    showToast(`💳 Оплата ${op.amount.toFixed(2)} BYN успешно совершена!`, 'success');
  }

  saveState();
  return true;
}

// --- 5. УПРАВЛЕНИЕ МОДАЛЬНЫМИ ОКНАМИ ---
function updateTeenMatchPreview() {
  const inputTopup = document.getElementById('teen-piggy-topup-input');
  const amt = parseFloat(inputTopup ? inputTopup.value : '10.00') || 0;
  const matchPct = state.piggyMatchPercent !== undefined ? state.piggyMatchPercent : 50;
  const bonus = Math.round(amt * (matchPct / 100) * 100) / 100;
  const total = Math.round((amt + bonus) * 100) / 100;

  const elLabel = document.getElementById('teen-preview-match-label');
  if (elLabel) elLabel.textContent = `Бонус родителей (+${matchPct}%):`;
  const elChildAmt = document.getElementById('teen-preview-child-amt');
  if (elChildAmt) elChildAmt.textContent = amt.toFixed(2);
  const elBonus = document.getElementById('teen-preview-parent-bonus');
  if (elBonus) elBonus.textContent = `+${bonus.toFixed(2)}`;
  const elTotal = document.getElementById('teen-preview-total-piggy');
  if (elTotal) elTotal.textContent = `${total.toFixed(2)} BYN`;
}

function setupModals() {
  const inputTeenTopup = document.getElementById('teen-piggy-topup-input');
  if (inputTeenTopup) {
    inputTeenTopup.addEventListener('input', updateTeenMatchPreview);
  }

  // Универсальные кнопки закрытия data-close
  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => {
      const modalId = btn.getAttribute('data-close');
      const modal = document.getElementById(modalId);
      if (modal) modal.classList.remove('open');
    });
  });

  // Закрытие по клику на оверлей
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.classList.remove('open');
    });
  });

  // 1. Модалка P2P перевода
  const btnOpenP2P = document.getElementById('btn-open-p2p-modal');
  const modalP2P = document.getElementById('modal-p2p-transfer');
  const inputRecipient = document.getElementById('p2p-recipient-input');
  const inputP2PAmount = document.getElementById('p2p-amount-input');
  const inputP2PComment = document.getElementById('p2p-comment-input');
  const btnSubmitP2P = document.getElementById('btn-submit-p2p');

  let selectedContactName = '';

  if (btnOpenP2P && modalP2P) {
    btnOpenP2P.addEventListener('click', () => {
      modalP2P.classList.add('open');
    });
  }

  // Быстрые контакты P2P
  document.querySelectorAll('.p2p-contact-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.p2p-contact-chip').forEach(c => c.classList.remove('selected'));
      chip.classList.add('selected');
      const phone = chip.getAttribute('data-phone');
      selectedContactName = chip.getAttribute('data-name');
      if (inputRecipient) inputRecipient.value = phone;
    });
  });

  // Чипсы сумм P2P
  document.querySelectorAll('.amount-chip-btn[data-amount]').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.amount-chip-btn[data-amount]').forEach(c => c.classList.remove('selected'));
      chip.classList.add('selected');
      if (inputP2PAmount) inputP2PAmount.value = chip.getAttribute('data-amount');
    });
  });

  if (btnSubmitP2P) {
    btnSubmitP2P.addEventListener('click', async () => {
      const recipient = inputRecipient?.value.trim();
      const amount = parseFloat(inputP2PAmount?.value || '0');
      const comment = inputP2PComment?.value.trim();

      if (!recipient) {
        showToast('Укажите номер телефона или карты получателя', 'warning');
        return;
      }
      if (isNaN(amount) || amount <= 0) {
        showToast('Укажите корректную сумму перевода', 'warning');
        return;
      }

      const success = await processOperation({
        type: 'p2p',
        recipient,
        recipientName: selectedContactName || recipient,
        amount,
        comment,
        title: 'Перевод другу'
      });

      if (success) {
        modalP2P.classList.remove('open');
        if (inputP2PAmount) inputP2PAmount.value = '';
        if (inputP2PComment) inputP2PComment.value = '';
      }
    });
  }

  // 2. Модалка запроса у родителей
  const btnOpenParentReq = document.getElementById('btn-open-parent-request-modal');
  const modalParentReq = document.getElementById('modal-parent-request');
  const inputReqAmount = document.getElementById('parent-req-amount-input');
  const selectPurpose = document.getElementById('parent-req-purpose-select');
  const inputReqComment = document.getElementById('parent-req-comment-input');
  const btnSubmitParentReq = document.getElementById('btn-submit-parent-request');

  if (btnOpenParentReq && modalParentReq) {
    btnOpenParentReq.addEventListener('click', () => {
      modalParentReq.classList.add('open');
    });
  }

  document.querySelectorAll('.amount-chip-btn[data-req-amount]').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.amount-chip-btn[data-req-amount]').forEach(c => c.classList.remove('selected'));
      chip.classList.add('selected');
      if (inputReqAmount) inputReqAmount.value = chip.getAttribute('data-req-amount');
    });
  });

  if (btnSubmitParentReq) {
    btnSubmitParentReq.addEventListener('click', async () => {
      const amount = parseFloat(inputReqAmount?.value || '0');
      const purpose = selectPurpose?.value || 'Книги и курсы';
      const comment = inputReqComment?.value.trim();

      if (isNaN(amount) || amount <= 0) {
        showToast('Укажите сумму запроса', 'warning');
        return;
      }

      try {
        await fetch('/api/parent-request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ childId: currentChildId, amount, purpose, message: comment })
        });
      } catch (e) {
        console.warn('Parent request error:', e);
      }

      modalParentReq.classList.remove('open');
      showToast(`Запрос на ${amount.toFixed(2)} BYN («${purpose}») отправлен родителям в Moby Family 📲`, 'success');
      if (inputReqAmount) inputReqAmount.value = '';
    });
  }

  // 3. Модалка настройки лимита самоконтроля
  const btnOpenSelfLimit = document.getElementById('btn-open-self-limit-modal');
  const modalSelfLimit = document.getElementById('modal-self-limit-setup');
  const rangeSelfLimit = document.getElementById('self-limit-range');
  const rangeValText = document.getElementById('self-limit-range-val');
  const inputSelfLimitNum = document.getElementById('self-limit-number-input');
  const rangeMaxLabel = document.getElementById('self-limit-range-max-label');
  const modalDesc = document.getElementById('self-limit-modal-desc');
  const btnSaveSelfLimit = document.getElementById('btn-save-self-limit');

  if (btnOpenSelfLimit && modalSelfLimit) {
    btnOpenSelfLimit.addEventListener('click', () => {
      const maxLimit = Math.max(1, Math.round(state.limits.parentMax));
      const currentVal = Math.min(maxLimit, Math.max(1, Math.round(state.limits.selfMax)));

      if (rangeSelfLimit) {
        rangeSelfLimit.min = '1';
        rangeSelfLimit.max = String(maxLimit);
        rangeSelfLimit.value = String(currentVal);
      }
      if (inputSelfLimitNum) {
        inputSelfLimitNum.min = '1';
        inputSelfLimitNum.max = String(maxLimit);
        inputSelfLimitNum.value = String(currentVal);
      }
      if (rangeValText) {
        rangeValText.textContent = `${currentVal.toFixed(2)} BYN`;
      }
      if (rangeMaxLabel) {
        rangeMaxLabel.textContent = `Макс: ${state.limits.parentMax.toFixed(2)} BYN`;
      }
      if (modalDesc) {
        modalDesc.innerHTML = `Вы можете <strong>добровольно ужесточить свой лимит</strong> ниже родительского потолка (${state.limits.parentMax.toFixed(2)} BYN/день), чтобы выработать дисциплину и быстрее накопить на цель.`;
      }
      modalSelfLimit.classList.add('open');
    });
  }

  // Синхронизация слайдера с числовым полем и текстом
  if (rangeSelfLimit) {
    rangeSelfLimit.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      if (rangeValText) rangeValText.textContent = `${val.toFixed(2)} BYN`;
      if (inputSelfLimitNum) inputSelfLimitNum.value = String(val);
    });
  }

  // Синхронизация прямого числового ввода со слайдером
  if (inputSelfLimitNum) {
    inputSelfLimitNum.addEventListener('input', (e) => {
      let val = parseFloat(e.target.value);
      if (isNaN(val)) return;
      val = Math.min(state.limits.parentMax, Math.max(1, val));
      if (rangeSelfLimit) rangeSelfLimit.value = String(val);
      if (rangeValText) rangeValText.textContent = `${val.toFixed(2)} BYN`;
    });
  }

  if (btnSaveSelfLimit) {
    btnSaveSelfLimit.addEventListener('click', async () => {
      let val = parseFloat(inputSelfLimitNum?.value || rangeSelfLimit?.value || '18');
      if (isNaN(val) || val <= 0) val = 1;
      // Ограничиваем сверху жестким родительским потолком, снизу 1 BYN
      state.limits.selfMax = Math.min(state.limits.parentMax, Math.max(1, val));
      saveState();

      try {
        await fetch('/api/teen/update-self-limit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ childId: currentChildId, selfLimit: state.limits.selfMax })
        });
      } catch (e) { console.error(e); }

      modalSelfLimit.classList.remove('open');
      showToast(`Личный лимит самоконтроля установлен: ${state.limits.selfMax.toFixed(2)} BYN/день 🎯`, 'info');
    });
  }

  // 4. Модалка подтверждения оплаты сверх лимита самоконтроля
  const btnConfirmOverlimit = document.getElementById('btn-confirm-overlimit-pay');
  const modalWarning = document.getElementById('modal-self-limit-warning');

  if (btnConfirmOverlimit) {
    btnConfirmOverlimit.addEventListener('click', async () => {
      if (modalWarning) modalWarning.classList.remove('open');
      if (pendingOperation) {
        const op = pendingOperation;
        pendingOperation = null;
        await processOperation(op, true);
      }
    });
  }

  // Отмена покупки в модалке предупреждения (поощрение финансовой дисциплины)
  const btnCancelOverlimit = modalWarning?.querySelector('[data-close="modal-self-limit-warning"]');
  if (btnCancelOverlimit) {
    btnCancelOverlimit.addEventListener('click', () => {
      pendingOperation = null;
      state.mobyScore = Math.min(850, state.mobyScore + 5);
      saveState();
      showToast('Отличный выбор! Деньги сохранены для цели «Ноутбук» (+5 к Moby Score) 🎯', 'success');
    });
  }

  // 5. Модалка копилки
  const btnOpenPiggy = document.getElementById('btn-open-piggy-modal');
  const modalPiggy = document.getElementById('modal-piggy-goal');
  const btnTopupPiggy = document.getElementById('btn-topup-piggy-fast');
  const inputTopup = document.getElementById('teen-piggy-topup-input');

  if (btnOpenPiggy && modalPiggy) {
    btnOpenPiggy.addEventListener('click', () => {
      // Предзаполняем поля редактирования текущими значениями
      const editName = document.getElementById('teen-edit-goal-name');
      const editGoal = document.getElementById('teen-edit-goal-amount');
      if (editName) editName.value = state.piggyName || 'Ноутбук';
      if (editGoal) editGoal.value = (state.piggyGoal || 600).toFixed(0);
      modalPiggy.classList.add('open');
    });
  }

  // Быстрые чипсы сумм пополнения копилки
  document.querySelectorAll('.teen-piggy-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const amt = chip.getAttribute('data-amt');
      if (inputTopup && amt) inputTopup.value = amt;
    });
  });

  if (btnTopupPiggy && inputTopup) {
    btnTopupPiggy.addEventListener('click', async () => {
      const topupAmt = parseFloat(inputTopup.value);
      if (isNaN(topupAmt) || topupAmt <= 0) {
        showToast('Введите корректную сумму пополнения', 'warning');
        return;
      }
      if (state.balance < topupAmt) {
        showToast(`Недостаточно средств на балансе (${state.balance.toFixed(2)} BYN)`, 'warning');
        return;
      }

      try {
        const res = await fetch('/api/teen/piggy-topup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ childId: currentChildId, amount: topupAmt })
        });
        const d = await res.json();
        if (d.success) {
          state.balance = Number(d.balance);
          lastKnownBalance = Number(d.balance);
          state.piggySaved = Number(d.piggySaved);
          if (d.matchPercent !== undefined) state.piggyMatchPercent = d.matchPercent;
          state.mobyScore = Math.min(850, state.mobyScore + 3);
          saveState();
          renderUI();
          const bonusMsg = d.parentBonus > 0 ? ` (включая бонус родителей +${d.parentBonus.toFixed(2)} BYN)` : '';
          showToast(`Копилка «${state.piggyName || 'Цель'}» пополнена на +${(d.totalAdded || topupAmt).toFixed(2)} BYN${bonusMsg}! 🎯🎉`, 'success');
          
          const bubble = document.getElementById('mascot-speech-bubble');
          const mascot = document.getElementById('moby-mascot');
          if (bubble && mascot) {
            mascot.classList.add('mascot-bounce');
            const addMsg = d.parentBonus > 0 ? ` а родители добавили еще +${d.parentBonus.toFixed(2)} BYN (+${d.matchPercent}%)!` : '!';
            bubble.textContent = `Супер цель! 🦊🚀 Ты отложил ${topupAmt.toFixed(2)} BYN,${addMsg} Накоплено: ${d.piggySaved.toFixed(2)} BYN!`;
            bubble.classList.add('visible');
            setTimeout(() => bubble.classList.remove('visible'), 5000);
          }
          if (modalPiggy) modalPiggy.classList.remove('open');
        } else {
          showToast(d.error || 'Ошибка пополнения копилки', 'danger');
        }
      } catch (err) {
        state.balance = Number((state.balance - topupAmt).toFixed(2));
        lastKnownBalance = state.balance;
        state.piggySaved = Number((state.piggySaved + topupAmt).toFixed(2));
        saveState();
        renderUI();
        showToast(`Копилка пополнена на +${topupAmt.toFixed(2)} BYN! 💰`, 'success');
        if (modalPiggy) modalPiggy.classList.remove('open');
      }
    });
  }

  // Свернуть / развернуть форму редактирования цели
  const toggleEditBox = document.getElementById('teen-toggle-piggy-edit');
  const editFormBox = document.getElementById('teen-piggy-edit-form');
  const editArrow = document.getElementById('teen-piggy-edit-arrow');
  if (toggleEditBox && editFormBox) {
    toggleEditBox.addEventListener('click', () => {
      const isOpen = editFormBox.style.display !== 'none';
      editFormBox.style.display = isOpen ? 'none' : 'block';
      if (editArrow) editArrow.textContent = isOpen ? '▼' : '▲';
    });
  }

  // Сохранить изменения цели копилки
  const btnSaveEdit = document.getElementById('btn-save-piggy-edit');
  if (btnSaveEdit) {
    btnSaveEdit.addEventListener('click', async () => {
      const editName = document.getElementById('teen-edit-goal-name');
      const editGoal = document.getElementById('teen-edit-goal-amount');
      const nameVal = editName ? editName.value.trim() : '';
      const goalVal = editGoal ? parseFloat(editGoal.value) : 0;

      if (!nameVal) {
        showToast('Введите название финансовой цели', 'warning');
        return;
      }
      if (isNaN(goalVal) || goalVal <= 0) {
        showToast('Введите корректную сумму цели', 'warning');
        return;
      }

      try {
        const res = await fetch('/api/teen/piggy-edit', {
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

  // Инфо по Moby Score в шапке
  const btnScoreInfo = document.getElementById('btn-moby-score-info');
  if (btnScoreInfo) {
    btnScoreInfo.addEventListener('click', () => {
      showToast(`Moby Score: ${state.mobyScore} / 850. До совершеннолетия и льготного студенческого овердрафта осталось совсем немного! 📈`, 'info');
    });
  }
}

// --- 6. ЗАДАНИЯ ОТ РОДИТЕЛЕЙ (CHORE & REWARD) ---
function setupTasks() {
  const container = document.getElementById('teen-tasks-container');
  if (!container) return;

  container.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action="complete-task"]');
    if (!btn || btn.disabled) return;

    const item = btn.closest('.teen-task-item');
    const taskId = item ? item.getAttribute('data-task-id') : null;
    const reward = item ? item.getAttribute('data-reward') : '0';

    if (taskId) {
      btn.textContent = 'Ждет проверки ⏳';
      btn.classList.add('waiting');
      btn.disabled = true;

      try {
        const res = await fetch('/api/teen/complete-task', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ childId: currentChildId, taskId })
        });
        const d = await res.json();
        if (d.success) {
          showToast('Задание отправлено на проверку родителям! 📨', 'info');
        }
      } catch (e) {
        showToast('Задание отправлено на проверку родителям! ⏳', 'info');
      }
    }
  });
}

// --- 7. ТЕСТОВАЯ ДЕМО-ПАНЕЛЬ (АНТИФРОД 75+ И САМОКОНТРОЛЬ) ---
function setupDemoOperations() {
  // Кнопка 1: Перевод другу 5.00 BYN (Обычная операция, Риск 15)
  const btnP2PLowRisk = document.getElementById('btn-demo-p2p-lowrisk');
  if (btnP2PLowRisk) {
    btnP2PLowRisk.addEventListener('click', () => {
      processOperation({
        type: 'p2p',
        recipient: '+375 29 111-22-33',
        recipientName: 'Макс (Одноклассник)',
        amount: 5.00,
        comment: 'За обед в пиццерии',
        title: 'Перевод другу'
      });
    });
  }

  // Кнопка 2: Превышение добровольного лимита самоконтроля (25.00 BYN)
  const btnOverlimit = document.getElementById('btn-demo-overlimit');
  if (btnOverlimit) {
    btnOverlimit.addEventListener('click', () => {
      processOperation({
        type: 'purchase',
        amount: 25.00,
        title: 'Покупка одежды',
        merchant: 'Zara / Bershka Mall'
      });
    });
  }

  // Кнопка 3: Донат на подозрительном сайте 70.00 BYN (Риск 85, Антифрод)
  const btnAntifraud = document.getElementById('btn-demo-antifraud');
  if (btnAntifraud) {
    btnAntifraud.addEventListener('click', () => {
      processOperation({
        type: 'purchase',
        amount: 70.00,
        title: 'Донат в неизвестной онлайн-игре',
        merchant: 'Unknown Game Exchange Online Crypto'
      });
    });
  }

  // Кнопка 4: Сброс состояния (SQLite и localStorage)
  const btnResetAll = document.getElementById('btn-demo-reset-all');
  if (btnResetAll) {
    btnResetAll.addEventListener('click', async () => {
      try {
        localStorage.removeItem(STORAGE_KEY);
        await fetch('/api/reset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ childId: 'teen_1' })
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

// --- 8. КИБЕР-МАСКОТ MOBY TEEN (СТРОГО В ГРАНИЦАХ ЭКРАНА + АДАПТИВНЫЙ БАБЛ) ---
function setupCyberMascot() {
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
  const DRAG_THRESHOLD = 8; // Порог в пикселях для активации перетаскивания

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

  const initialBounds = getBounds();
  mascot.style.left = `${initialBounds.maxX}px`;
  mascot.style.right = 'auto';
  mascot.style.top = '340px';
  updateBubbleDirection(initialBounds.maxX, initialBounds.contWidth);

  const teenTips = [
    'Привет! Я лисенок Фокси — твой финансовый напарник Moby! 🦊 Твой Moby Score в надежных лапах!',
    'Твой Moby Score: 740! До совершеннолетия и льготного студенческого овердрафта осталось совсем немного! 📈',
    'Совет: 10% от любой подработки сразу откладывай в копилку под сложный процент! 💡',
    'Защита: никогда не вводи CVC-код карты для «получения перевода» на барахолках — это 100% скам! 🛡️',
    'Дропперство — уголовное преступление (ст. 222 УК РБ). Твоя карта Moby должна быть только твоей! ⚖️',
    'Национальная система KPOK подключила твой аккаунт без бюрократии (ст. 27 ГК РБ)! 🚀'
  ];
  let tipIndex = 0;

  function triggerMascotClick() {
    // Подпрыгивание строго на месте (только по оси Y), без поворотов и масштабирования
    mascot.classList.add('mascot-bounce');
    setTimeout(() => mascot.classList.remove('mascot-bounce'), 400);

    if (bubble) {
      const curLeft = mascot.offsetLeft;
      const { contWidth } = getBounds();
      updateBubbleDirection(curLeft, contWidth);

      bubble.textContent = teenTips[tipIndex % teenTips.length];
      tipIndex++;
      bubble.classList.add('visible');
      clearTimeout(bubbleTimeout);
      bubbleTimeout = setTimeout(() => {
        bubble.classList.remove('visible');
      }, 4500);
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

    // Активируем перемещение только если преодолен порог
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

    // Строгое ограничение в границах экрана
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

    // Если это был простой клик без перетаскивания: НЕ СДВИГАЕМ маскот!
    if (!hasMoved) {
      triggerMascotClick();
      return;
    }

    // Прилипание к ближайшему краю только после реального перемещения
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

// --- 9. ИНТЕГРАЦИЯ ИГРЫ И КВИЗА (IN-APP CANVAS + QUIZ) ---
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
  const liveBadge = document.getElementById('game-live-badge');

  gameInstance = new MobyCatcherGame(canvas, {
    childId: 'teen_1',
    apiBase: '',
    duration: 60, // 60 секунд (1 минута)
    onScoreUpdate: (score, coins) => {
      // In-canvas HUD
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
          modalGameOverSubtitle.textContent = `Бонусы сохранены в базе Moby Teens! Получено сегодня: ${bonusGames}/3`;
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

      if (quizInstance) {
        quizInstance.refreshState();
      }
    }
  });

  // Загружаем начальный статус дневного лимита бонусов
  fetch('/api/inventory/teen_1')
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
    childId: 'teen_1',
    apiBase: '',
    audience: 'teens', // Вопросы для подростков 14-17 лет
    onScoreUpdate: (quizState, isCorrect) => {
      if (isCorrect) {
        state.mobyScore = Math.min(850, state.mobyScore + 3);
        saveState();
        showToast('Верно! Отличный ответ (+3 к Moby Score)! 🧠', 'success');
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
      console.log('Инвентарь Moby Teens обновлен:', inventory);
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
    // 1. Автопауза игры при смене вкладки
    if (targetId !== 'pane-games' && gameInstance && gameInstance.isRunning && !gameInstance.isPaused) {
      gameInstance.pause();
      const btnPause = document.getElementById('btn-pause-game');
      if (btnPause) btnPause.textContent = '▶ Продолжить';
    }

    // 2. Скрытие маскота в игре и квизах
    const pill = document.getElementById('mascot-summon-pill');
    if (mascot) {
      if (targetId === 'pane-home') {
        mascot.style.display = 'flex';
      } else {
        mascot.style.display = 'none';
        if (pill) pill.style.display = 'none';
      }
    }

    // 3. Активные табы
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

    // 4. Ленивая инициализация
    if (targetId === 'pane-games') {
      initGameModule(switchTab);
    } else if (targetId === 'pane-quizzes') {
      initQuizModule();
    }
  }

  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-target');
      if (target) switchTab(target);
    });
  });

  // Кнопки возврата «← На главную»
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
    const res = await fetch(`/api/teen/state?childId=${encodeURIComponent(currentChildId)}`);
    if (!res.ok) return;
    const data = await res.json();

    const waitingModal = document.getElementById('waiting-for-parent-modal');
    if (!data.exists) {
      if (waitingModal) waitingModal.classList.add('open');
      return;
    } else {
      if (waitingModal) waitingModal.classList.remove('open');
    }

    if (data.teen) {
      if (data.teen.id) currentChildId = data.teen.id;

      // Обновляем имя и возраст
      const nameEl = document.querySelector('.user-name-badge');
      if (nameEl && data.teen.name) {
        nameEl.textContent = `${data.teen.name} (${data.teen.age} лет)`;
      }
      const avatarEl = document.querySelector('.teen-avatar-wrap');
      if (avatarEl && data.teen.avatar) {
        avatarEl.textContent = data.teen.avatar;
      }

      // Moby Score
      if (data.teen.mobyScore !== undefined) {
        state.mobyScore = data.teen.mobyScore;
      }

      // Баланс счета
      if (lastKnownBalance === null) {
        lastKnownBalance = data.teen.balance;
      } else if (Math.abs(data.teen.balance - lastKnownBalance) > 0.001) {
        if (data.teen.balance > lastKnownBalance) {
          const diff = (data.teen.balance - lastKnownBalance).toFixed(2);
          showToast(`Родители пополнили баланс: +${diff} BYN! 💳⚡`, 'success');
        }
        lastKnownBalance = data.teen.balance;
      }
      state.balance = data.teen.balance;

      // Статус карты
      const mappedStatus = (data.teen.cardStatus === 'FROZEN' || data.teen.cardStatus === 'blocked') ? 'blocked' : 'active';
      if (lastKnownStatus !== null && lastKnownStatus !== mappedStatus) {
        if (mappedStatus === 'blocked') {
          showToast('Родитель временно заморозил карту 🔒', 'warning');
        } else {
          showToast('Родитель разблокировал карту! ✅', 'success');
        }
      }
      lastKnownStatus = mappedStatus;
      state.cardStatus = mappedStatus;

      // Лимиты
      if (data.teen.dailyLimit !== undefined) {
        const newDaily = Number(data.teen.dailyLimit);
        if (lastKnownDailyLimit !== null && Math.abs(lastKnownDailyLimit - newDaily) > 0.001) {
          showToast(`Родители обновили суточный лимит: ${newDaily.toFixed(2)} BYN 📊`, 'info');
        }
        lastKnownDailyLimit = newDaily;
        state.limits.parentMax = newDaily;
        if (state.limits.selfMax > state.limits.parentMax) {
          state.limits.selfMax = state.limits.parentMax;
        }
      }
      if (data.teen.spentToday !== undefined) {
        state.limits.spentToday = Number(data.teen.spentToday);
      }
      if (data.teen.selfLimit !== undefined) {
        state.limits.selfMax = Math.min(state.limits.parentMax, Number(data.teen.selfLimit));
      }

      // Копилка
      if (data.teen.piggyName !== undefined) state.piggyName = data.teen.piggyName;
      if (data.teen.piggySaved !== undefined) state.piggySaved = data.teen.piggySaved;
      if (data.teen.piggyGoal !== undefined) state.piggyGoal = data.teen.piggyGoal;
      if (data.teen.piggyMatchPercent !== undefined) state.piggyMatchPercent = data.teen.piggyMatchPercent;
      if (data.teen.piggyMatchMaxMonthly !== undefined) state.piggyMatchMaxMonthly = data.teen.piggyMatchMaxMonthly;
      if (data.teen.piggyParentBonusTotal !== undefined) state.piggyParentBonusTotal = data.teen.piggyParentBonusTotal;

      // Задания
      if (Array.isArray(data.tasks)) {
        renderTeenTasks(data.tasks);
      }

      // Транзакции
      if (Array.isArray(data.transactions)) {
        renderTeenTransactions(data.transactions);
      }

      renderUI();
    }
  } catch (err) {
    // Offline or network error
  } finally {
    isPolling = false;
  }
}

function renderTeenTransactions(transactions) {
  const container = document.getElementById('teen-transactions-container');
  if (!container) return;

  if (!transactions || transactions.length === 0) {
    container.innerHTML = `
      <div style="font-size: 12px; color: #5A6578; text-align: center; padding: 16px; background: rgba(35, 52, 200, 0.04); border-radius: 12px; border: 1px dashed rgba(35, 52, 200, 0.2);">
        Пока нет операций. Первые переводы или покупки появятся здесь 💳
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

function renderTeenTasks(tasks) {
  const container = document.getElementById('teen-tasks-container');
  if (!container) return;

  if (!tasks || tasks.length === 0) {
    container.innerHTML = '<div class="empty-state-card" style="padding: 16px; text-align: center; color: #5A6578; font-size: 13px; background: #FFFFFF; border-radius: 14px; border: 1px dashed #CBD5E1;">Пока нет активных заданий от родителей 🌟</div>';
    return;
  }

  const html = tasks.map(t => {
    const isCompleted = t.status === 'COMPLETED';
    const isWaiting = t.status === 'WAITING';
    const rewardVal = Number(t.reward_amount !== undefined ? t.reward_amount : (t.rewardAmount !== undefined ? t.rewardAmount : 0));
    let btnText = 'Я выполнил! ✅';
    let btnClass = 'btn-teen-task font-accent';
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
      <div class="teen-task-item" data-task-id="${t.id}" data-reward="${rewardVal.toFixed(2)}">
        <div class="teen-task-left">
          <span class="teen-task-name">${t.title}</span>
          <span class="teen-task-reward-pill font-accent">+${rewardVal.toFixed(2)} BYN</span>
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
  setupDemoOperations();
  setupCyberMascot();
  setupNavigation();

  // Запуск реактивного поллинга (1.5 сек)
  pollLiveState();
  setInterval(pollLiveState, 1500);

  console.log('🏦 MTBank Moby Teens (14-17 years) Interface v1.0 Initialized');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

// --- MAGIC FAMILY QR: СКАНЕР И АВТОРИЗАЦИЯ MOBY TEEN ---
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
  window.showMagicQrPairedToast('magic-pair-code-915384');
};

window.showMagicQrPairedToast = function(token) {
  const mascot = document.getElementById('moby-mascot');
  const bubble = document.getElementById('mascot-speech-bubble');
  
  if (mascot && bubble) {
    mascot.classList.add('mascot-bounce');
    bubble.textContent = '⚡ KPOK QR подтвержден! Суб-аккаунт синхронизирован с Moby родителя. Moby Score активен! 🦊🚀';
    bubble.classList.add('visible');
    setTimeout(() => bubble.classList.remove('visible'), 5000);
  }

  if (typeof showToast === 'function') {
    showToast('✨ QR-система KPOK успешно распознана! Связь с родителем установлена (ст. 27 ГК РБ)');
  }
};

document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  if (token) {
    setTimeout(() => {
      window.showMagicQrPairedToast(token);
    }, 700);
  }
});
