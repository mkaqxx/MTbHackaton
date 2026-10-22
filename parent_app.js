/**
 * parent_app.js - MTBank Moby Family Parent Dashboard Client Engine
 * Fully reactive client-side rendering with MobyStorage.
 */

let currentSlide = 0;
let currentSelectedChildId = 'child_1';

document.addEventListener('DOMContentLoaded', () => {
  // Check auth session
  const user = MobyStorage.getCurrentUser();
  if (!user) {
    // default to parent if opened directly
    MobyStorage.login('parent', '1111');
  }

  // Initial render
  renderParentDashboard();

  // Subscribe to storage changes (real-time cross-tab reactivity!)
  MobyStorage.subscribe((state) => {
    renderParentDashboard();
  });
});

function renderParentDashboard() {
  const state = MobyStorage.getState();
  const children = state.children || [];
  const parentCards = state.parentCards || [];
  const requests = state.requests || [];
  const tasks = state.tasks || [];
  const pTransactions = state.parentTransactions || [];

  const activeChild = children[currentSlide] || children[0] || null;
  if (activeChild) currentSelectedChildId = activeChild.id;

  // 1. Render Carousel of Children Cards
  renderCarousel(children);

  // 2. Render Daily & Category Limits for Active Child
  renderLimitsBlock(activeChild);

  // 3. Render Parent Transactions
  renderTransactionsBlock(pTransactions);

  // 4. Render Child Requests
  renderRequestsBlock(requests);

  // 5. Render Tasks
  renderTasksBlock(tasks, children);

  // 6. Update Modals content
  renderModalsContent(children, parentCards);
}

// --- CAROUSEL RENDERING ---
function renderCarousel(children) {
  const track = document.getElementById('carouselTrack');
  const dotsContainer = document.getElementById('carouselDots');
  if (!track) return;

  if (children.length === 0) {
    track.innerHTML = `
      <div class="moby-block" style="text-align: center; padding: 36px 16px; width: 100%;">
        <div style="font-size: 38px; margin-bottom: 10px;">👶💳</div>
        <div style="font-size: 16px; font-weight: 800; margin-bottom: 6px;">Нет привязанных детей</div>
        <div style="font-size: 12px; color: var(--moby-text-muted); margin-bottom: 18px;">
          Откройте детский счет, чтобы начать контролировать расходы и поощрять ребенка
        </div>
        <button class="btn-moby btn-moby-orange" onclick="openModal('addChildModal')">
          + Добавить ребенка
        </button>
      </div>
    `;
    if (dotsContainer) dotsContainer.innerHTML = '';
    return;
  }

  track.innerHTML = children.map((child, idx) => {
    const isFrozen = child.cardStatus === 'FROZEN' || child.cardStatus === 'blocked';
    const childUrl = child.age <= 13 ? './kids.html' : './teens.html';

    return `
      <div class="carousel-slide-item" data-child-id="${child.id}">
        <div class="child-card-banner" onclick="openChildDetailsModal('${child.id}')" title="Нажмите для детальной статистики">
          <div class="card-brand-corner-ray"></div>

          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 10px; position:relative; z-index:2;">
            <div style="display:flex; align-items:center; gap: 8px;">
              <span style="font-size: 20px;">${child.avatar || '🦁'}</span>
              <div>
                <div style="font-size: 15px; font-weight: 800; color: white;">${escapeHtml(child.name)} (${child.age} лет)</div>
                <div style="font-size: 10px; color: var(--moby-text-muted);">
                  ${escapeHtml(child.cardNumber)} • <span style="color:${isFrozen ? 'var(--moby-red)' : '#10B981'}; font-weight:700;">${isFrozen ? '❄️ Заблокирована' : '● Активна'}</span>
                </div>
              </div>
            </div>
            <div class="card-gold-chip"></div>
          </div>

          <div style="position:relative; z-index:2;">
            <div class="card-balance-caption">Баланс счета ребенка</div>
            <div class="card-balance-val">
              ${Number(child.balance).toFixed(2)} <span class="byn-accent">${child.currency || 'BYN'}</span>
            </div>

            <!-- Action Pills -->
            <div class="card-pills-row">
              <button type="button" class="card-pill-btn pill-orange" onclick="event.stopPropagation(); openTopUpModal('${child.id}');">
                <span>💰</span>
                <span>Пополнить</span>
              </button>
              <button type="button" class="card-pill-btn pill-blue" onclick="event.stopPropagation(); openLimitsModal('${child.id}');">
                <span>⚙️</span>
                <span>Лимиты</span>
              </button>
              <button type="button" class="card-pill-btn" style="background:#20283C; color:white;" onclick="event.stopPropagation(); openModal('magicQrModal');">
                <span>📱</span>
                <span>Magic QR</span>
              </button>
              <button type="button" class="card-pill-btn" style="background:#3B1C5A; border:1px solid #9333EA; color:#E9D5FF;" onclick="event.stopPropagation(); openPiggyMatchModal('${child.id}');">
                <span>🐷</span>
                <span>Копилка +${child.piggyMatchPercent || 50}%</span>
              </button>
            </div>

            <div class="card-footer-limit">
              <div style="display:flex; align-items:center; gap: 4px; color:white; font-weight:600;" onclick="event.stopPropagation(); openChildDetailsModal('${child.id}')">
                <span>📊 Подробная статистика</span>
                <span style="color:var(--moby-orange);">→</span>
              </div>
              <a href="${childUrl}" target="_blank" onclick="event.stopPropagation();" style="color:var(--mt-orange, #FF5912); font-weight:700; text-decoration:none;">
                Кабинет ребенка ↗
              </a>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  if (dotsContainer) {
    dotsContainer.innerHTML = children.map((_, idx) => `
      <div class="moby-dot ${idx === currentSlide ? 'active' : ''}" onclick="goToSlide(${idx})"></div>
    `).join('');
  }

  updateCarousel();
}

function updateCarousel() {
  const track = document.getElementById('carouselTrack');
  const dots = document.querySelectorAll('.moby-dot');
  if (track) {
    track.style.transform = `translateX(-${currentSlide * 100}%)`;
  }
  dots.forEach((dot, idx) => {
    dot.classList.toggle('active', idx === currentSlide);
  });
}

function goToSlide(idx) {
  currentSlide = idx;
  updateCarousel();
  const state = MobyStorage.getState();
  if (state.children && state.children[idx]) {
    renderLimitsBlock(state.children[idx]);
  }
}

// --- LIMITS BLOCK ---
function renderLimitsBlock(child) {
  const container = document.getElementById('parentLimitsBlockContainer');
  if (!container) return;
  if (!child) {
    container.innerHTML = '';
    return;
  }

  const spentToday = Number(child.spentToday || 0);
  const dailyLimit = Number(child.dailyLimit || 30);
  const totalPct = dailyLimit > 0 ? Math.min(100, Math.round((spentToday / dailyLimit) * 100)) : 0;
  const cats = child.categoryLimits || [];

  let html = `
    <section class="moby-block">
      <div class="moby-block-header">
        <div class="moby-block-title">
          <span>📊</span>
          <span>Лимиты на день (${escapeHtml(child.name)})</span>
        </div>
        <button class="btn-moby btn-moby-outline" style="font-size: 10px; padding: 3px 8px;" onclick="openLimitsModal('${child.id}')">
          Изменить ⚙️
        </button>
      </div>

      <!-- Общий суточный лимит -->
      <div class="limit-bar-row">
        <div class="limit-bar-labels">
          <span style="color:var(--moby-text, white);">Общий суточный лимит</span>
          <span id="parent-main-daily-limit-text" style="color:var(--moby-text-muted, #8E9BB5);">
            ${spentToday.toFixed(2)} / ${dailyLimit.toFixed(2)} BYN
          </span>
        </div>
        <div class="limit-bar-track">
          <div class="limit-bar-fill fill-blue" style="width: ${totalPct}%;"></div>
        </div>
      </div>

      <!-- Категории -->
      ${cats.map(cat => {
        const spent = Number(cat.spentAmount || 0);
        const limit = Number(cat.limitAmount || 0);
        const catPct = limit > 0 ? Math.min(100, Math.round((spent / limit) * 100)) : (spent > 0 ? 100 : 0);
        const isOver = (limit > 0 && spent >= limit) || cat.isBlocked;
        const barFillClass = isOver ? 'fill-orange' : 'fill-sky';

        return `
          <div class="limit-bar-row">
            <div class="limit-bar-labels">
              <span style="color:var(--moby-text, white);">
                ${cat.categoryIcon || '🛍️'} ${escapeHtml(cat.category)}
                ${cat.isBlocked ? ' <span style="color:var(--moby-red, #E42C26); font-size:10px; font-weight:700;">(Запрещено ⛔)</span>' : ''}
              </span>
              <span style="color:var(--moby-text-muted, #8E9BB5);">
                ${spent.toFixed(2)} / ${limit > 0 ? `${limit.toFixed(2)} BYN` : 'без лимита'}
              </span>
            </div>
            <div class="limit-bar-track">
              <div class="limit-bar-fill ${barFillClass}" style="width: ${cat.isBlocked ? 100 : catPct}%;"></div>
            </div>
          </div>
        `;
      }).join('')}
    </section>
  `;

  container.innerHTML = html;
}

// --- TRANSACTIONS BLOCK ---
function renderTransactionsBlock(transactions) {
  const container = document.getElementById('parentTransactionsList');
  if (!container) return;

  if (!transactions || transactions.length === 0) {
    container.innerHTML = `
      <div style="font-size: 12px; color: var(--moby-text-muted, #8E9BB5); text-align: center; padding: 12px;">
        Пока нет родительских операций
      </div>
    `;
    return;
  }

  container.innerHTML = transactions.slice(0, 5).map(tx => `
    <div class="parent-tx-row">
      <div style="display:flex; align-items:center; gap: 10px;">
        <div class="tx-icon-pill">💳</div>
        <div>
          <div style="font-size: 13px; font-weight: 600; color: white;">${escapeHtml(tx.title)}</div>
          <div style="font-size: 11px; color: var(--moby-text-dim, #64748B);">${tx.date} в ${tx.time}</div>
        </div>
      </div>
      <div style="font-size: 13px; font-weight: 800; color: #60A5FA;">
        -${Number(tx.amount).toFixed(2)} BYN
      </div>
    </div>
  `).join('');
}

// --- REQUESTS BLOCK ---
function renderRequestsBlock(requests) {
  const container = document.getElementById('childRequestsListContainer');
  const countBadge = document.getElementById('requestsCountBadge');
  if (!container) return;

  if (countBadge) {
    countBadge.textContent = requests.length > 0 ? `+${requests.length}` : '0';
    countBadge.style.display = requests.length > 0 ? 'inline-block' : 'none';
  }

  if (!requests || requests.length === 0) {
    container.innerHTML = `
      <div style="background: #111520; border-radius: 14px; padding: 14px; text-align: center; border: 1px dashed rgba(255,255,255,0.08);">
        <div style="font-size: 12px; color: var(--moby-text-muted, #8E9BB5);">
          Новых запросов на деньги от детей нет
        </div>
      </div>
    `;
    return;
  }

  container.innerHTML = requests.map(req => {
    const isAntiFraud = req.requestType === 'ANTIFRAUD';
    const isTask = req.requestType === 'TASK_REWARD';

    let borderStyle = 'border: 1px solid rgba(255,255,255,0.08);';
    let icon = req.childAvatar || '🦁';
    let typeTitle = `💸 Запрос денег: ${escapeHtml(req.childName)}`;
    let approveText = '✓ Одобрить';
    let approveClass = 'btn-moby-orange';

    if (isAntiFraud) {
      borderStyle = 'border: 1px solid var(--moby-red, #E42C26); background: rgba(228, 44, 38, 0.12);';
      icon = '🛡️';
      typeTitle = `🚨 Антифрод: ${escapeHtml(req.childName)}`;
      approveText = '✓ Разрешить';
      approveClass = 'btn-moby-blue';
    } else if (isTask) {
      borderStyle = 'border: 1px solid var(--mt-orange, #FF5912); background: rgba(255, 89, 18, 0.1);';
      icon = '⭐';
      typeTitle = `🎯 Проверка задания: ${escapeHtml(req.childName)}`;
      approveText = '✓ Одобрить и выплатить';
    }

    return `
      <div class="request-banner-moby" style="${borderStyle}; margin-bottom: 8px;">
        <div class="request-banner-top">
          <div class="request-child-tag">
            <span style="font-size: 20px;">${icon}</span>
            <div>
              <div style="font-size: 13px; font-weight: 700; color: ${isAntiFraud ? 'var(--moby-red, #E42C26)' : 'white'};">
                ${typeTitle}
              </div>
              <div style="font-size: 11px; color: var(--moby-text-muted, #8E9BB5);">«${escapeHtml(req.title)}»</div>
            </div>
          </div>
          <div class="request-amount-pill">+${Number(req.amount).toFixed(2)} BYN</div>
        </div>
        <div class="request-btns-row" style="display:flex; gap: 8px; margin-top: 10px;">
          <button type="button" class="btn-moby ${approveClass}" style="flex:1; font-size:11px; padding:6px 0;" onclick="MobyStorage.approveRequest('${req.id}')">
            ${approveText}
          </button>
          <button type="button" class="btn-moby btn-moby-outline" style="flex:1; font-size:11px; padding:6px 0;" onclick="MobyStorage.rejectRequest('${req.id}')">
            ✕ Отклонить
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// --- TASKS BLOCK ---
function renderTasksBlock(tasks, children) {
  const container = document.getElementById('childTasksListContainer');
  const countBadge = document.getElementById('tasksCountBadge');
  if (!container) return;

  if (countBadge) {
    countBadge.textContent = String(tasks.length);
  }

  if (!tasks || tasks.length === 0) {
    container.innerHTML = `
      <div style="font-size: 12px; color: var(--moby-text-muted, #8E9BB5); text-align: center; padding: 14px; background: #111520; border-radius: 14px; border: 1px dashed rgba(255,255,255,0.08);">
        Нет назначенных заданий. Нажмите «+ Добавить задание ребенку».
      </div>
    `;
    return;
  }

  container.innerHTML = tasks.map(task => {
    const isCompleted = task.status === 'COMPLETED';
    const isWaiting = task.status === 'WAITING';
    let statusBadge = 'В процессе ⏳';
    let badgeColor = '#60A5FA';
    if (isCompleted) {
      statusBadge = 'Выполнено ✅';
      badgeColor = '#10B981';
    } else if (isWaiting) {
      statusBadge = 'Ждет проверки 🔍';
      badgeColor = '#FF5912';
    }

    const safeTitle = escapeHtml(task.title).replace(/'/g, "\\'");

    return `
      <div class="task-card-moby" style="margin-bottom: 8px;">
        <div class="task-card-top-row">
          <div>
            <div class="task-title-text">${escapeHtml(task.title)}</div>
            <div style="font-size: 11px; color: var(--moby-text-dim, #64748B); margin-top: 2px;">
              Для: <strong style="color:white;">${escapeHtml(task.childName)}</strong>
            </div>
            <div class="task-reward-badge" style="margin-top: 4px;">+${Number(task.rewardAmount).toFixed(2)} BYN</div>
          </div>
          <div class="task-status-btn" style="color: ${badgeColor}; border-color: ${badgeColor}; font-size:11px; padding:3px 8px;">
            ${statusBadge}
          </div>
        </div>

        <div class="task-actions-row">
          <button type="button" class="btn-task-action-mini" onclick="openEditTaskModal('${task.id}', '${safeTitle}', ${task.rewardAmount}, '${task.childId}')">
            <span>✏️</span> <span>Редактировать</span>
          </button>
          <button type="button" class="btn-task-action-mini delete" onclick="if(confirm('Удалить задание «${safeTitle}»?')) MobyStorage.deleteTask('${task.id}')">
            <span>🗑️</span> <span>Удалить</span>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// --- MODALS DYNAMIC GENERATION ---
function renderModalsContent(children, parentCards) {
  // Update Child selects in Add Task & Edit Task
  const addTaskSelect = document.getElementById('addTaskChildSelect');
  if (addTaskSelect) {
    addTaskSelect.innerHTML = children.map(c => `
      <option value="${c.id}">${escapeHtml(c.name)} (${c.age} лет)</option>
    `).join('');
  }

  const editTaskSelect = document.getElementById('editTaskChildSelect');
  if (editTaskSelect) {
    editTaskSelect.innerHTML = children.map(c => `
      <option value="${c.id}">${escapeHtml(c.name)} (${c.age} лет)</option>
    `).join('');
  }

  const addChildCardSelect = document.getElementById('addChildParentCardSelect');
  if (addChildCardSelect) {
    addChildCardSelect.innerHTML = parentCards.map(c => `
      <option value="${c.id}">${c.name} (${c.cardNumber}) — ${Number(c.balance).toFixed(2)} ${c.currency}</option>
    `).join('');
  }

  // Generate dynamic TopUp and Limits modals for each child
  const dynamicModalsContainer = document.getElementById('dynamicChildModalsContainer');
  if (dynamicModalsContainer) {
    dynamicModalsContainer.innerHTML = children.map(c => `
      ${renderTopUpModalHtml(c)}
      ${renderLimitsModalHtml(c)}
      ${renderPiggyMatchModalHtml(c)}
    `).join('');
  }
}

function renderTopUpModalHtml(child) {
  return `
    <div id="topUpModal_${child.id}" class="moby-modal-backdrop">
      <div class="moby-modal-dialog">
        <button class="moby-modal-close" onclick="closeModal('topUpModal_${child.id}')">✕</button>

        <div style="display:flex; align-items:center; gap: 10px; margin-bottom: 16px;">
          <span style="font-size: 26px;">💰</span>
          <div>
            <div style="font-size: 17px; font-weight: 800; color: white;">Пополнить баланс</div>
            <div style="font-size: 12px; color: var(--moby-text-muted);">
              Счет ребенка: <strong style="color:white;">${escapeHtml(child.name)}</strong>
            </div>
          </div>
        </div>

        <div style="background:#111520; border:1px solid rgba(255,255,255,0.08); padding:16px; border-radius:14px; margin-bottom:18px;">
          <div style="font-size: 11px; text-transform:uppercase; color: var(--moby-text-dim); margin-bottom: 4px;">Текущий остаток на карте</div>
          <div style="font-size: 26px; font-weight: 900; color: var(--mt-orange, #FF5912);">
            ${Number(child.balance).toFixed(2)} <span style="font-size: 16px; color: white;">BYN</span>
          </div>
        </div>

        <!-- Быстрые суммы -->
        <div style="margin-bottom: 14px;">
          <div style="font-size: 12px; font-weight: 700; color: var(--moby-text-muted); margin-bottom: 8px;">Выберите сумму пополнения:</div>
          <div style="display:flex; gap: 6px; margin-bottom: 12px;">
            <button type="button" class="btn-moby btn-moby-outline" style="flex:1; padding:8px 0;" onclick="setTopUpValue('${child.id}', 3)">+3 BYN</button>
            <button type="button" class="btn-moby btn-moby-outline" style="flex:1; padding:8px 0;" onclick="setTopUpValue('${child.id}', 5)">+5 BYN</button>
            <button type="button" class="btn-moby btn-moby-outline" style="flex:1; padding:8px 0;" onclick="setTopUpValue('${child.id}', 10)">+10 BYN</button>
            <button type="button" class="btn-moby btn-moby-outline" style="flex:1; padding:8px 0;" onclick="setTopUpValue('${child.id}', 20)">+20 BYN</button>
          </div>
        </div>

        <form action="/child-action/top-up" method="POST">
          <input type="hidden" name="childId" value="${child.id}">
          <div class="form-group" style="margin-bottom: 18px;">
            <label style="display:block; font-size: 12px; font-weight: 700; color: var(--moby-text-muted); margin-bottom: 4px;">Или введите точную сумму (BYN):</label>
            <input type="number" step="0.5" id="topUpInput_${child.id}" name="amount" class="moby-input" placeholder="0.00" required min="0.5" value="10.00">
          </div>
          <div style="display:flex; justify-content:flex-end; gap: 8px;">
            <button type="button" class="btn-moby btn-moby-outline" onclick="closeModal('topUpModal_${child.id}')">Отмена</button>
            <button type="submit" class="btn-moby btn-moby-orange" style="padding: 10px 20px;">Пополнить карту</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

function renderLimitsModalHtml(child) {
  const cats = child.categoryLimits || [];
  return `
    <div id="limitsModal_${child.id}" class="moby-modal-backdrop">
      <div class="moby-modal-dialog">
        <button class="moby-modal-close" onclick="closeModal('limitsModal_${child.id}')">✕</button>

        <div style="display:flex; align-items:center; gap: 10px; margin-bottom: 16px;">
          <span style="font-size: 24px;">⚙️</span>
          <div>
            <div style="font-size: 17px; font-weight: 800; color: white;">Лимиты расходов</div>
            <div style="font-size: 12px; color: var(--moby-text-muted);">
              Настройка ограничений для <strong style="color:white;">${escapeHtml(child.name)}</strong>
            </div>
          </div>
        </div>

        <!-- Общий суточный лимит -->
        <div style="background:#111520; border:1px solid rgba(255,255,255,0.08); padding:14px; border-radius:14px; margin-bottom:16px;">
          <div style="font-size: 12px; font-weight: 800; color: white; margin-bottom: 4px;">Общий суточный лимит трат</div>
          <div style="font-size: 11px; color: var(--moby-text-dim); margin-bottom: 10px;">
            Максимальная сумма, которую ребенок может потратить в день
          </div>
          <form action="/child-action/set-limit" method="POST" style="display:flex; gap: 8px;">
            <input type="hidden" name="childId" value="${child.id}">
            <input type="number" step="1" name="dailyLimit" value="${child.dailyLimit}" class="moby-input" min="1" required style="padding:8px 12px; font-size:14px;">
            <button type="submit" class="btn-moby btn-moby-blue" style="padding:8px 14px; white-space:nowrap;">Сохранить</button>
          </form>
        </div>

        <!-- Категории трат -->
        <div>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 10px;">
            <div style="font-size: 13px; font-weight: 800; color: white;">Категории трат</div>
            <button type="button" class="btn-moby btn-moby-outline" style="font-size:11px; padding:4px 8px;" onclick="showCategoryLimitForm('${child.id}')">
              + Установить лимит
            </button>
          </div>

          <div id="catLimitForm_${child.id}" style="display:none; background:#0E131F; padding:12px; border-radius:10px; margin-bottom:12px; border:1px solid rgba(255,255,255,0.1);">
            <form action="/child-action/set-category-limit" method="POST">
              <input type="hidden" name="childId" value="${child.id}">
              <div style="font-size:11px; color:var(--moby-text-muted); margin-bottom:4px;">Категория:</div>
              <select name="category" class="moby-select" style="padding:8px; font-size:12px; margin-bottom:8px;" required>
                ${cats.map(c => `<option value="${c.category}">${c.category}</option>`).join('')}
              </select>
              <div style="font-size:11px; color:var(--moby-text-muted); margin-bottom:4px;">Лимит трат (BYN):</div>
              <div style="display:flex; gap:8px;">
                <input type="number" step="1" name="limit" placeholder="Например: 10.00" class="moby-input" style="padding:8px 10px; font-size:13px;" required min="1">
                <button type="submit" class="btn-moby btn-moby-orange" style="font-size:12px; padding:8px 12px;">ОК</button>
              </div>
            </form>
          </div>

          <div style="display:flex; flex-direction:column; gap: 8px;">
            ${cats.map(cat => `
              <div style="display:flex; align-items:center; justify-content:space-between; background:#111520; padding:10px 12px; border-radius:12px; border:1px solid rgba(255,255,255,0.06);">
                <div>
                  <div style="font-size: 13px; font-weight: 700; color: ${cat.isBlocked ? 'var(--moby-red, #E42C26)' : 'white'};">
                    ${cat.isBlocked ? '🚫 ' : ''}${escapeHtml(cat.category)}
                  </div>
                  <div style="font-size: 11px; color: var(--moby-text-dim);">
                    Лимит: ${cat.limitAmount > 0 ? `<strong style="color:var(--mt-orange, #FF5912);">${Number(cat.limitAmount).toFixed(2)} BYN</strong>` : 'без ограничений'}
                    ${cat.isBlocked ? ' • <span style="color:var(--moby-red, #E42C26); font-weight:700;">Траты запрещены</span>' : ''}
                  </div>
                </div>
                <form action="/child-action/toggle-category-block" method="POST" style="margin:0;">
                  <input type="hidden" name="childId" value="${child.id}">
                  <input type="hidden" name="category" value="${escapeHtml(cat.category)}">
                  <button type="submit" class="btn-moby ${cat.isBlocked ? 'btn-moby-orange' : 'btn-moby-outline'}" style="font-size:11px; padding:5px 10px;">
                    ${cat.isBlocked ? 'Разрешить' : 'Запретить'}
                  </button>
                </form>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Награда за квиз -->
        <div style="background:#111520; border:1px solid rgba(255,255,255,0.08); padding:14px; border-radius:14px; margin-top:16px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
            <div style="font-size: 13px; font-weight: 800; color: white; display:flex; align-items:center; gap: 6px;">
              <span>🧠</span>
              <span>Награда за пройденный квиз</span>
            </div>
            <span style="font-size: 11px; font-weight: 800; color: var(--mt-orange, #FF5912); background: rgba(255,89,18,0.15); padding: 2px 8px; border-radius: 8px;">
              ${Number(child.quizRewardAmount !== undefined ? child.quizRewardAmount : 2.00).toFixed(2)} BYN
            </span>
          </div>
          <div style="font-size: 11px; color: var(--moby-text-dim); margin-bottom: 10px;">
            Сумма, которая выплачивается на карту ребенка, когда он правильно ответит на все вопросы из квиза
          </div>
          <form action="/child-action/set-quiz-reward" method="POST" style="display:flex; gap: 8px;">
            <input type="hidden" name="childId" value="${child.id}">
            <input type="number" step="0.5" name="rewardAmount" value="${Number(child.quizRewardAmount !== undefined ? child.quizRewardAmount : 2.00).toFixed(2)}" class="moby-input" min="0" required style="padding:8px 12px; font-size:14px;">
            <button type="submit" class="btn-moby btn-moby-orange" style="padding:8px 14px; white-space:nowrap;">Сохранить 💾</button>
          </form>
        </div>

        <div style="margin-top: 20px; text-align:right;">
          <button type="button" class="btn-moby btn-moby-outline" onclick="closeModal('limitsModal_${child.id}')">Закрыть</button>
        </div>
      </div>
    </div>
  `;
}

function renderPiggyMatchModalHtml(child) {
  const currentPct = child.piggyMatchPercent || 50;
  return `
    <div id="piggyMatchModal_${child.id}" class="moby-modal-backdrop">
      <div class="moby-modal-dialog">
        <button class="moby-modal-close" onclick="closeModal('piggyMatchModal_${child.id}')">✕</button>

        <div style="display:flex; align-items:center; gap: 10px; margin-bottom: 16px;">
          <span style="font-size: 26px;">🐷</span>
          <div>
            <div style="font-size: 17px; font-weight: 800; color: white;">Софинансирование Копилки</div>
            <div style="font-size: 12px; color: var(--moby-text-muted);">
              Счет ребенка: <strong style="color:white;">${escapeHtml(child.name)}</strong>
            </div>
          </div>
        </div>

        <div style="background:#111520; border:1px solid rgba(255,255,255,0.08); padding:16px; border-radius:14px; margin-bottom:18px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <span style="font-size:12px; color:var(--moby-text-muted);">Бонус родителя к пополнению:</span>
            <span id="piggyMatchValDisplay_${child.id}" style="font-size:18px; font-weight:900; color:var(--mt-orange, #FF5912);">+${currentPct}%</span>
          </div>
          <input type="range" id="piggyMatchSlider_${child.id}" min="0" max="100" step="5" value="${currentPct}" style="width:100%; accent-color:var(--mt-orange, #FF5912);" oninput="updateMatchPreview('${child.id}')">

          <div style="display:flex; gap:6px; margin-top:10px;">
            <button type="button" class="btn-moby btn-moby-outline" style="flex:1; font-size:11px; padding:4px 0;" onclick="setMatchPercent('${child.id}', 25)">+25%</button>
            <button type="button" class="btn-moby btn-moby-outline" style="flex:1; font-size:11px; padding:4px 0;" onclick="setMatchPercent('${child.id}', 50)">+50%</button>
            <button type="button" class="btn-moby btn-moby-outline" style="flex:1; font-size:11px; padding:4px 0;" onclick="setMatchPercent('${child.id}', 100)">+100%</button>
          </div>
        </div>

        <div id="piggyMatchCalcPreview_${child.id}" style="background:#0D1426; border:1px dashed rgba(59,130,246,0.3); border-radius:12px; padding:12px; font-size:12px; color:#CBD5E1; margin-bottom:18px; line-height:1.5;">
          💡 Если ребенок отложит <strong>10.00 BYN</strong>: вы добавите <strong style="color:var(--mt-orange, #FF5912);">+${(10 * (currentPct / 100)).toFixed(2)} BYN</strong>, а в копилку поступит <strong style="color:#10B981;">${(10 * (1 + currentPct / 100)).toFixed(2)} BYN</strong>!
        </div>

        <div style="display:flex; justify-content:flex-end; gap:8px;">
          <button type="button" class="btn-moby btn-moby-outline" onclick="closeModal('piggyMatchModal_${child.id}')">Отмена</button>
          <button type="button" class="btn-moby btn-moby-orange" onclick="savePiggyMatch('${child.id}')">Сохранить бонус 🐷</button>
        </div>
      </div>
    </div>
  `;
}

// --- CHILD DETAILS MODAL ---
function openChildDetailsModal(childId) {
  const child = MobyStorage.getChild(childId);
  if (!child) return;

  const modal = document.getElementById('childDetailsModal');
  const content = document.getElementById('childDetailsModalContent');
  if (!modal || !content) return;

  const isFrozen = child.cardStatus === 'FROZEN' || child.cardStatus === 'blocked';
  const state = MobyStorage.getState();
  const txList = (state.childTransactions || []).filter(t => t.child_id === child.id);

  content.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 14px;">
      <div style="display:flex; align-items:center; gap: 10px;">
        <span style="font-size: 28px;">${child.avatar || '🦁'}</span>
        <div>
          <div style="font-size: 18px; font-weight: 800; color: white;">${escapeHtml(child.name)} (${child.age} лет)</div>
          <div style="font-size: 11px; color: var(--moby-text-muted);">${escapeHtml(child.cardNumber)}</div>
        </div>
      </div>
      <button type="button" class="card-pill-btn ${isFrozen ? 'pill-orange' : 'pill-blue'}" onclick="MobyStorage.toggleCardLock('${child.id}'); openChildDetailsModal('${child.id}');">
        <span>${isFrozen ? '☀️ Разблокировать' : '❄️ Заблокировать'}</span>
      </button>
    </div>

    <!-- Баланс и Копилка -->
    <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px;">
      <div style="background:#111520; padding:12px; border-radius:12px; border:1px solid rgba(255,255,255,0.06);">
        <div style="font-size:11px; color:var(--moby-text-dim);">Баланс счета</div>
        <div style="font-size:20px; font-weight:900; color:white; margin-top:4px;">${Number(child.balance).toFixed(2)} BYN</div>
      </div>
      <div style="background:#111520; padding:12px; border-radius:12px; border:1px solid rgba(255,255,255,0.06);">
        <div style="font-size:11px; color:var(--moby-text-dim);">Копилка (${escapeHtml(child.piggyName || 'Мечта')})</div>
        <div style="font-size:20px; font-weight:900; color:#10B981; margin-top:4px;">${Number(child.piggySaved).toFixed(2)} / ${Number(child.piggyGoal).toFixed(2)} BYN</div>
      </div>
    </div>

    <!-- История операций ребенка -->
    <div style="margin-bottom: 14px;">
      <div style="font-size: 13px; font-weight: 800; color: white; margin-bottom: 8px;">Последние операции по карте:</div>
      <div style="max-height: 220px; overflow-y: auto; display:flex; flex-direction:column; gap:6px;">
        ${txList.length > 0 ? txList.map(tx => `
          <div style="display:flex; justify-content:space-between; align-items:center; background:#111520; padding:8px 12px; border-radius:10px;">
            <div style="display:flex; align-items:center; gap:8px;">
              <span>${tx.category_icon || '💳'}</span>
              <div>
                <div style="font-size:12px; font-weight:700; color:white;">${escapeHtml(tx.title)}</div>
                <div style="font-size:10px; color:var(--moby-text-dim);">${tx.date} • ${tx.category}</div>
              </div>
            </div>
            <div style="font-size:12px; font-weight:800; color:${tx.amount > 0 ? '#10B981' : '#F87171'};">
              ${tx.amount > 0 ? '+' : ''}${Number(tx.amount).toFixed(2)} BYN
            </div>
          </div>
        `).join('') : '<div style="font-size:11px; color:var(--moby-text-muted); text-align:center; padding:10px;">Пока нет операций</div>'}
      </div>
    </div>
  `;

  modal.style.display = 'flex';
}

// --- MODAL UTILITIES ---
function openModal(id) {
  const m = document.getElementById(id);
  if (m) m.style.display = 'flex';
}
function closeModal(id) {
  const m = document.getElementById(id);
  if (m) m.style.display = 'none';
}
function openTopUpModal(childId) {
  openModal(`topUpModal_${childId}`);
}
function openLimitsModal(childId) {
  openModal(`limitsModal_${childId}`);
}
function openPiggyMatchModal(childId) {
  openModal(`piggyMatchModal_${childId}`);
}

function setTopUpValue(childId, amount) {
  const input = document.getElementById(`topUpInput_${childId}`);
  if (input) {
    input.value = amount;
    input.focus();
  }
}
function showCategoryLimitForm(childId) {
  const formBox = document.getElementById(`catLimitForm_${childId}`);
  if (formBox) {
    formBox.style.display = formBox.style.display === 'none' ? 'block' : 'none';
  }
}
function revealAddChildFields() {
  const btnBox = document.getElementById('initialAddChildBtnBox');
  const formBox = document.getElementById('addChildFieldsForm');
  if (btnBox) btnBox.style.display = 'none';
  if (formBox) formBox.style.display = 'block';
}

function setMatchPercent(childId, pct) {
  const slider = document.getElementById(`piggyMatchSlider_${childId}`);
  if (slider) {
    slider.value = pct;
    updateMatchPreview(childId);
  }
}

function updateMatchPreview(childId) {
  const slider = document.getElementById(`piggyMatchSlider_${childId}`);
  const display = document.getElementById(`piggyMatchValDisplay_${childId}`);
  const preview = document.getElementById(`piggyMatchCalcPreview_${childId}`);
  if (!slider) return;

  const pct = parseFloat(slider.value) || 0;
  if (display) display.textContent = `+${pct}%`;

  if (preview) {
    const childAmt = 10.0;
    const parentBonus = Math.round(childAmt * (pct / 100) * 100) / 100;
    const total = Math.round((childAmt + parentBonus) * 100) / 100;
    preview.innerHTML = `💡 Если ребенок отложит <strong>${childAmt.toFixed(2)} BYN</strong>: вы добавите <strong style="color:var(--mt-orange, #FF5912);">+${parentBonus.toFixed(2)} BYN</strong>, а в копилку поступит <strong style="color:#10B981;">${total.toFixed(2)} BYN</strong>!`;
  }
}

function savePiggyMatch(childId) {
  const slider = document.getElementById(`piggyMatchSlider_${childId}`);
  if (slider) {
    MobyStorage.setPiggyMatch(childId, slider.value);
    closeModal(`piggyMatchModal_${childId}`);
    showToast('Бонус софинансирования копилки сохранен! 🐷');
  }
}

function openEditTaskModal(taskId, title, rewardAmount, childId) {
  const idInput = document.getElementById('editTaskIdInput');
  const titleInput = document.getElementById('editTaskTitleInput');
  const rewardInput = document.getElementById('editTaskRewardInput');
  const childSelect = document.getElementById('editTaskChildSelect');

  if (idInput) idInput.value = taskId;
  if (titleInput) titleInput.value = title;
  if (rewardInput) rewardInput.value = rewardAmount;
  if (childSelect && childId) childSelect.value = childId;

  openModal('editTaskModal');
}

function showToast(message) {
  let toast = document.getElementById('appToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'appToast';
    toast.className = 'moby-toast';
    document.body.appendChild(toast);
  }
  toast.innerHTML = `<span>✓</span> <span>${message}</span>`;
  toast.style.display = 'block';
  setTimeout(() => {
    toast.style.display = 'none';
  }, 3000);
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Magic QR Simulation
let activeQrTarget = { childId: 'child_1', name: 'Михаил (10 лет)', port: 'kids', pin: '742-891' };
function selectQrChild(childId, name, port, pin) {
  activeQrTarget = { childId, name, port, pin };
  const pinEl = document.getElementById('qrPinDisplay');
  if (pinEl) pinEl.textContent = pin;
}

function simulateQrPairing() {
  showToast(`🚀 Авторизация KPOK QR ребенком (${activeQrTarget.name}) успешно выполнена!`);
  const targetUrl = activeQrTarget.childId === 'child_1' ? './kids.html?token=magic-pair-742-891' : './teens.html?token=magic-pair-915-384';
  window.open(targetUrl, '_blank');
}
