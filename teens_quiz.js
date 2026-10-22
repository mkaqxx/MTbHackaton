/**
 * MobyQuizEngine - Изолированный ES6-класс интерактивного тренажера финансовой грамотности
 * «Moby Quiz Hub» для модуля «Moby Family» (МТБанк).
 * 
 * ВЕРСИЯ 2.0 (СТРОГО ПО ОФИЦИАЛЬНОМУ БРЕНДБУКУ МТБАНКА):
 * - Полный отказ от разнородных системных эмодзи.
 * - Векторные SVG-иконки в фирменных цветах: MT Blue (#2334C8), MT Red (#E42C26), MT Orange (#FF5912).
 * - Огненный стрик с фирменными лучами МТБанка.
 * - Карточки и кнопки в строгом соответствии с гайдлайнами финтеха МТБанка.
 */

// Векторные SVG-иконки бренда
const SVG_ICONS = {
  fire: `
    <svg class="fire-icon-svg" viewBox="0 0 24 24">
      <path d="M12 2C8.5 7 11 9 9 13C8 10 6 9 6 12C6 16.4 9.6 20 14 20C17.3 20 20 17.3 20 14C20 9 14.5 7 12 2Z"/>
    </svg>
  `,
  split5050: `
    <svg viewBox="0 0 24 24">
      <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM7.5 6C8.3 6 9 6.7 9 7.5C9 8.3 8.3 9 7.5 9C6.7 9 6 8.3 6 7.5C6 6.7 6.7 6 7.5 6ZM6 18L18 6L19 7L7 19L6 18ZM16.5 18C15.7 18 15 17.3 15 16.5C15 15.7 15.7 15 16.5 15C17.3 15 18 15.7 18 16.5C18 17.3 17.3 18 16.5 18Z"/>
    </svg>
  `,
  shield: `
    <svg viewBox="0 0 24 24">
      <path d="M12 2L4 5V11.09C4 16.14 7.41 20.85 12 22C16.59 20.85 20 16.14 20 11.09V5L12 2ZM12 4.15L18 6.4V11.09C18 15.14 15.45 18.93 12 19.92C8.55 18.93 6 15.14 6 11.09V6.4L12 4.15Z"/>
    </svg>
  `,
  bulb: `
    <svg viewBox="0 0 24 24">
      <path d="M9 21C9 21.55 9.45 22 10 22H14C14.55 22 15 21.55 15 21V20H9V21ZM12 2C8.14 2 5 5.14 5 9C5 11.38 6.19 13.47 8 14.74V17C8 17.55 8.45 18 9 18H15C15.55 18 16 17.55 16 17V14.74C17.81 13.47 19 11.38 19 9C19 5.14 15.86 2 12 2ZM14.85 13.1L14 13.7V16H10V13.7L9.15 13.1C7.8 12.16 7 10.63 7 9C7 6.24 9.24 4 12 4C14.76 4 17 6.24 17 9C17 10.63 16.2 12.16 14.85 13.1Z"/>
    </svg>
  `,
  mascotHead: `
    <svg viewBox="0 0 24 24">
      <path d="M12 2C6.5 2 2 6.5 2 12C2 17.5 6.5 22 12 22C17.5 22 22 17.5 22 12C22 6.5 17.5 2 12 2ZM8.5 9.5C9.3 9.5 10 10.2 10 11C10 11.8 9.3 12.5 8.5 12.5C7.7 12.5 7 11.8 7 11C7 10.2 7.7 9.5 8.5 9.5ZM15.5 9.5C16.3 9.5 17 10.2 17 11C17 11.8 16.3 12.5 15.5 12.5C14.7 12.5 14 11.8 14 11C14 10.2 14.7 9.5 15.5 9.5ZM12 17.5C9.7 17.5 7.8 16.2 7 14.5H17C16.2 16.2 14.3 17.5 12 17.5Z"/>
    </svg>
  `,
  trophy: `
    <svg viewBox="0 0 24 24">
      <path d="M19 5H17V3H7V5H5C3.9 5 3 5.9 3 7V9C3 11.2 4.8 13 7 13.1C7.8 14.8 9.3 16.1 11 16.7V19H8V21H16V19H13V16.7C14.7 16.1 16.2 14.8 17 13.1C19.2 13 21 11.2 21 9V7C21 5.9 20.1 5 19 5ZM5 9V7H7V11C5.9 11 5 10.1 5 9ZM19 9C19 10.1 18.1 11 17 11V7H19V9Z"/>
    </svg>
  `,
  rays: `
    <svg class="streak-rays-svg" viewBox="0 0 160 80" preserveAspectRatio="none">
      <polygon points="40,0 160,0 120,40" fill="#FF5912" opacity="0.85"/>
      <polygon points="120,40 160,0 160,80 80,80" fill="#E42C26" opacity="0.9"/>
    </svg>
  `
};

export class MobyQuizEngine {
  constructor(container, options = {}) {
    if (!container) throw new Error('MobyQuizEngine: Container element is required');
    this.container = container;

    this.options = {
      childId: options.childId || 'teen_1',
      apiBase: options.apiBase || '',
      audience: options.audience || 'teens',
      onInventoryChange: options.onInventoryChange || (() => {}),
      onScoreUpdate: options.onScoreUpdate || (() => {}),
      onQuizCompleted: options.onQuizCompleted || (() => {}),
      soundEnabled: options.soundEnabled !== false
    };

    // Состояние квиза
    this.questions = [];
    this.currentQuestionIndex = 0;
    this.inventory = {
      coins: 0,
      hint_5050: 0,
      extra_lives: 0,
      text_hints: 0,
      high_score: 0
    };
    this.quizState = {
      streak_days: 0,
      total_answered: 0,
      earned_byn: 0.0,
      xp: 0
    };

    // Флаги состояния текущего вопроса
    this.isAnswered = false;
    this.is5050UsedForCurrent = false;
    this.isTextHintOpen = false;
    this.disabledOptions = new Set();
    this.shieldJustTriggered = false;

    this.initAudio();
  }

  // Web Audio API
  initAudio() {
    this.audioCtx = null;
    this.ensureAudio = () => {
      if (!this.audioCtx && typeof window !== 'undefined') {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) this.audioCtx = new AudioContextClass();
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
    };
  }

  playSound(type) {
    if (!this.options.soundEnabled) return;
    try {
      this.ensureAudio();
      if (!this.audioCtx) return;

      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      if (type === 'correct') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.setValueAtTime(659.25, now + 0.1);
        osc.frequency.setValueAtTime(783.99, now + 0.2);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
      } else if (type === 'wrong') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.setValueAtTime(140, now + 0.15);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
      } else if (type === 'shield') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(900, now + 0.25);
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === 'hint') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(700, now);
        osc.frequency.exponentialRampToValueAtTime(1100, now + 0.1);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
      }
    } catch (e) {
      console.warn('Quiz audio error:', e);
    }
  }

  async init() {
    this.renderLoading();
    await this.refreshState();
    await this.loadQuestions();
    this.render();
  }

  async refreshState() {
    try {
      const res = await fetch(`${this.options.apiBase}/api/inventory/${this.options.childId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success) {
        this.inventory = data.inventory;
        this.quizState = data.quizState;
        if (data.quizRewardAmount !== undefined) {
          this.quizRewardAmount = Number(data.quizRewardAmount);
        }
        this.options.onInventoryChange(this.inventory);
      }
    } catch (err) {
      console.error('Ошибка загрузки инвентаря в MobyQuizEngine:', err);
    }
  }

  async loadQuestions() {
    try {
      const res = await fetch(`${this.options.apiBase}/api/quiz/questions?audience=${this.options.audience || 'teens'}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success && data.questions) {
        this.questions = data.questions;
        this.currentQuestionIndex = 0;
      }
    } catch (err) {
      console.error('Ошибка загрузки вопросов:', err);
    }
  }

  resetQuestionFlags() {
    this.isAnswered = false;
    this.is5050UsedForCurrent = false;
    this.isTextHintOpen = false;
    this.disabledOptions.clear();
    this.shieldJustTriggered = false;
    this.selectedOption = null;
    this.answerResult = null;
  }

  // --- Главный рендеринг интерфейса ---
  render() {
    if (!this.questions || this.questions.length === 0) {
      this.container.innerHTML = `
        <div class="moby-quiz-empty">
          <h3>Вопросы загружаются...</h3>
        </div>
      `;
      return;
    }

    const currentQuestion = this.questions[this.currentQuestionIndex];

    this.container.innerHTML = `
      <div class="moby-quiz-hub">
        <!-- 1. Верхний баннер стрика (MT Blue + Лучи МТБанка) -->
        <div class="quiz-streak-banner">
          ${SVG_ICONS.rays}
          <div class="streak-badge">
            ${SVG_ICONS.fire}
            <div class="streak-info">
              <span class="streak-count font-accent">${this.quizState.streak_days} дн.</span>
              <span class="streak-label">Огненный стрик</span>
            </div>
          </div>
          <div class="stats-pills">
            <div class="stat-pill">
              <span class="stat-pill-label">Решено</span>
              <span class="stat-pill-value">${this.quizState.total_answered}</span>
            </div>
            <div class="stat-pill byn-pill">
              <span class="stat-pill-label">Награда за квиз</span>
              <span class="stat-pill-value">+${Number(this.quizRewardAmount !== undefined ? this.quizRewardAmount : 2.00).toFixed(2)} BYN</span>
            </div>
          </div>
        </div>

        <!-- 2. Панель инвентаря подсказок (Векторные монохромные иконки) -->
        <div class="quiz-hints-panel">
          <div class="hints-panel-title">
            <span>Подсказки из игры «Ловец бонусов»:</span>
          </div>
          <div class="hint-badges-row">
            <!-- 50/50 -->
            <button 
              class="hint-btn hint-5050 ${this.inventory.hint_5050 <= 0 || this.is5050UsedForCurrent || this.isAnswered ? 'disabled' : ''}" 
              id="btn-hint-5050"
              title="Исключить 2 неверных ответа"
            >
              ${SVG_ICONS.split5050}
              <span class="hint-name">50/50</span>
              <span class="hint-qty">${this.inventory.hint_5050}</span>
            </button>

            <!-- Доп. Жизнь / Щит от ошибок -->
            <div 
              class="hint-btn hint-life ${this.inventory.extra_lives <= 0 ? 'inactive' : 'active'}" 
              id="badge-hint-life"
              title="Автоматическая вторая попытка при ошибке"
            >
              ${SVG_ICONS.shield}
              <span class="hint-name">Щит</span>
              <span class="hint-qty">${this.inventory.extra_lives}</span>
            </div>

            <!-- Текстовый совет маскота -->
            <button 
              class="hint-btn hint-advice ${this.inventory.text_hints <= 0 || this.isAnswered ? 'disabled' : ''}" 
              id="btn-hint-advice"
              title="Получить обучающий совет Маскота Moby"
            >
              ${SVG_ICONS.bulb}
              <span class="hint-name">Совет</span>
              <span class="hint-qty">${this.inventory.text_hints}</span>
            </button>
          </div>
        </div>

        <!-- 3. Облако мыслей маскота (MT Blue + иконка маскота) -->
        <div class="mascot-thought-bubble ${this.isTextHintOpen ? 'visible' : ''}" id="mascot-thought-box">
          <div class="mascot-avatar-mini">
            ${SVG_ICONS.mascotHead}
          </div>
          <div class="thought-content">
            <div class="thought-header">Совет от Маскота Moby:</div>
            <div class="thought-body">${currentQuestion.hint_text}</div>
          </div>
          <button class="thought-close-btn" id="btn-close-thought">✕</button>
        </div>

        <!-- 4. Уведомление о срабатывании щита (MT Red) -->
        <div class="shield-alert ${this.shieldJustTriggered ? 'visible' : ''}" id="shield-alert-box">
          ${SVG_ICONS.shield}
          <div class="shield-alert-text">
            <strong>Щит Moby активирован!</strong> Потрачена 1 доп. жизнь. Стрик спасен — выбери другой вариант!
          </div>
        </div>

        <!-- 5. Карточка вопроса -->
        <div class="quiz-card">
          <div class="quiz-card-meta">
            <span class="topic-tag">${currentQuestion.topic || 'Финансовая грамотность'}</span>
            <span class="question-progress">Вопрос ${this.currentQuestionIndex + 1} из ${this.questions.length}</span>
          </div>

          <!-- Дуалинго-диалог: Статичная моделька-референс маскота слева + облачко от его рта -->
          <div class="duo-mascot-dialogue">
            <div class="duo-mascot-avatar-wrap">
              <div class="duo-fox-model-box">
                <model-viewer
                  class="duo-fox-model"
                  src="fox.glb"
                  alt="3D Маскот Фокси"
                  interaction-prompt="none"
                  disable-zoom
                  disable-pan
                  disable-tap
                  camera-orbit="0deg 80deg 105%"
                  exposure="1.05"
                  tone-mapping="neutral"
                  style="width: 80px; height: 105px; background: transparent; --poster-color: transparent;">
                </model-viewer>
              </div>
              <div class="duo-mascot-name font-accent">Фокси 🦊</div>
            </div>

            <div class="duo-speech-bubble">
              <div class="duo-speech-tail"></div>
              <div class="duo-speech-text font-accent">
                ${currentQuestion.question}
              </div>
            </div>
          </div>

          <!-- Варианты ответов (A, B, C, D) -->
          <div class="quiz-options-list">
            ${['A', 'B', 'C', 'D'].map(key => {
              const optText = currentQuestion[`option_${key.toLowerCase()}`];
              const isDisabled = this.disabledOptions.has(key);
              let statusClass = '';

              if (this.isAnswered) {
                if (key === this.answerResult?.correctOption) {
                  statusClass = 'correct-opt';
                } else if (key === this.selectedOption && !this.answerResult?.correct) {
                  statusClass = 'wrong-opt';
                }
              } else if (this.disabledOptions.has(key)) {
                statusClass = 'struck-opt';
              }

              return `
                <button 
                  class="option-btn ${statusClass} ${isDisabled ? 'disabled' : ''}" 
                  data-option="${key}"
                  ${isDisabled || this.isAnswered ? 'disabled' : ''}
                >
                  <span class="opt-key-badge font-accent">${key}</span>
                  <span class="opt-label">${optText}</span>
                </button>
              `;
            }).join('')}
          </div>

          <!-- Результат и пояснение после ответа -->
          ${this.isAnswered ? `
            <div class="quiz-result-box ${this.answerResult?.correct ? 'result-success' : 'result-fail'}">
              <div class="result-header">
                <span class="result-title">
                  ${this.answerResult?.correct ? '✓ Отлично! Правильный ответ!' : '✕ Нужно повторить правило'}
                </span>
              </div>
              <p class="result-explanation">${this.answerResult?.hintText || currentQuestion.hint_text}</p>
              
              <div class="result-actions">
                <button class="next-question-btn font-accent" id="btn-next-question">
                  ${this.currentQuestionIndex < this.questions.length - 1 ? 'Следующий вопрос' : 'Завершить тренажер'}
                </button>
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    `;

    this.attachDomEvents();
  }

  attachDomEvents() {
    const btn5050 = this.container.querySelector('#btn-hint-5050');
    if (btn5050) {
      btn5050.addEventListener('click', () => this.useHint5050());
    }

    const btnAdvice = this.container.querySelector('#btn-hint-advice');
    if (btnAdvice) {
      btnAdvice.addEventListener('click', () => this.useTextHint());
    }

    const btnCloseThought = this.container.querySelector('#btn-close-thought');
    if (btnCloseThought) {
      btnCloseThought.addEventListener('click', () => {
        this.isTextHintOpen = false;
        this.render();
      });
    }

    const optionButtons = this.container.querySelectorAll('.option-btn');
    optionButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const optionKey = btn.getAttribute('data-option');
        if (optionKey && !this.disabledOptions.has(optionKey) && !this.isAnswered) {
          this.handleOptionSelect(optionKey);
        }
      });
    });

    const btnNext = this.container.querySelector('#btn-next-question');
    if (btnNext) {
      btnNext.addEventListener('click', () => this.nextQuestion());
    }
  }

  async useHint5050() {
    if (this.inventory.hint_5050 <= 0 || this.is5050UsedForCurrent || this.isAnswered) return;

    this.playSound('hint');
    const currentQ = this.questions[this.currentQuestionIndex];

    try {
      const res = await fetch(`${this.options.apiBase}/api/quiz/use-hint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childId: this.options.childId,
          hintType: 'hint_5050',
          questionId: currentQ.id
        })
      });

      const data = await res.json();
      if (data.success) {
        this.inventory = data.inventory;
        this.is5050UsedForCurrent = true;

        if (data.eliminatedOptions && Array.isArray(data.eliminatedOptions)) {
          data.eliminatedOptions.forEach(opt => this.disabledOptions.add(opt));
        }

        this.options.onInventoryChange(this.inventory);
        this.render();
      } else {
        alert(data.message || 'Не удалось применить подсказку 50/50');
      }
    } catch (err) {
      console.error('Ошибка применения подсказки 50/50:', err);
    }
  }

  async useTextHint() {
    if (this.inventory.text_hints <= 0 || this.isAnswered) return;
    if (this.isTextHintOpen) return;

    this.playSound('hint');
    const currentQ = this.questions[this.currentQuestionIndex];

    try {
      const res = await fetch(`${this.options.apiBase}/api/quiz/use-hint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childId: this.options.childId,
          hintType: 'text_hints',
          questionId: currentQ.id
        })
      });

      const data = await res.json();
      if (data.success) {
        this.inventory = data.inventory;
        this.isTextHintOpen = true;
        this.options.onInventoryChange(this.inventory);
        this.render();
      } else {
        alert(data.message || 'Не удалось применить совет');
      }
    } catch (err) {
      console.error('Ошибка получения текстового совета:', err);
    }
  }

  async handleOptionSelect(selectedKey) {
    if (this.isAnswered) return;

    this.selectedOption = selectedKey;
    const currentQ = this.questions[this.currentQuestionIndex];

    try {
      const res = await fetch(`${this.options.apiBase}/api/quiz/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childId: this.options.childId,
          questionId: currentQ.id,
          selectedOption: selectedKey
        })
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      // 1. ВЕРНЫЙ ОТВЕТ
      if (data.correct) {
        this.playSound('correct');
        this.isAnswered = true;
        this.shieldJustTriggered = false;
        this.answerResult = data;
        this.quizState = data.quizState;
        this.inventory = data.inventory;

        this.options.onScoreUpdate(this.quizState, true);
        this.options.onInventoryChange(this.inventory);
        this.render();
        return;
      }

      // 2. НЕВЕРНЫЙ ОТВЕТ, НО ЕСТЬ ДОПОЛНИТЕЛЬНАЯ ЖИЗНЬ (ЩИТ)
      if (!data.correct && this.inventory.extra_lives > 0) {
        this.playSound('shield');

        const hintRes = await fetch(`${this.options.apiBase}/api/quiz/use-hint`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            childId: this.options.childId,
            hintType: 'extra_lives',
            questionId: currentQ.id
          })
        });

        const hintData = await hintRes.json();
        if (hintData.success) {
          this.inventory = hintData.inventory;
        }

        this.disabledOptions.add(selectedKey);
        this.shieldJustTriggered = true;
        this.isAnswered = false; // Вторая попытка!

        this.options.onInventoryChange(this.inventory);
        this.render();
        return;
      }

      // 3. НЕВЕРНЫЙ ОТВЕТ И ЖИЗНЕЙ НЕТ
      this.playSound('wrong');
      this.isAnswered = true;
      this.shieldJustTriggered = false;
      this.answerResult = data;
      this.quizState = data.quizState;
      this.inventory = data.inventory;

      this.options.onScoreUpdate(this.quizState, false);
      this.options.onInventoryChange(this.inventory);
      this.render();

    } catch (err) {
      console.error('Ошибка проверки ответа:', err);
    }
  }

  nextQuestion() {
    if (this.currentQuestionIndex < this.questions.length - 1) {
      this.currentQuestionIndex += 1;
      this.resetQuestionFlags();
      this.render();
    } else {
      this.completeQuiz();
    }
  }

  async completeQuiz() {
    let rewardAmount = Number(this.quizRewardAmount !== undefined ? this.quizRewardAmount : 2.00);
    let newBalance = null;

    try {
      const res = await fetch(`${this.options.apiBase}/api/quiz/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ childId: this.options.childId })
      });
      const data = await res.json();
      if (data.success) {
        rewardAmount = Number(data.rewardAmount !== undefined ? data.rewardAmount : rewardAmount);
        newBalance = data.newBalance;
        if (data.quizState) {
          this.quizState = data.quizState;
        }
      }
    } catch (err) {
      console.error('Ошибка завершения квиза и выплаты вознаграждения:', err);
    }

    this.quizRewardAmount = rewardAmount;
    this.options.onQuizCompleted({
      totalAnswered: this.quizState.total_answered,
      streakDays: this.quizState.streak_days,
      rewardAmount,
      newBalance
    });

    this.renderCompletionScreen();
  }

  renderCompletionScreen() {
    this.container.innerHTML = `
      <div class="quiz-completion-card">
        <div class="completion-mascot-badge">
          ${SVG_ICONS.trophy}
        </div>
        <h2 class="font-accent">Квиз-тренажер завершен!</h2>
        <p class="completion-desc">
          Ты ответил на все вопросы по финансовой безопасности! Родители начислили вознаграждение за пройденный квиз на твою карту Moby!
        </p>

        <div class="completion-stats-grid">
          <div class="comp-stat-item">
            <span class="comp-stat-val">${this.quizState.streak_days} дн.</span>
            <span class="comp-stat-lbl">Огненный стрик</span>
          </div>
          <div class="comp-stat-item">
            <span class="comp-stat-val" style="color:#FF5912;">+${Number(this.quizRewardAmount !== undefined ? this.quizRewardAmount : 2.00).toFixed(2)} BYN</span>
            <span class="comp-stat-lbl">Выплата от родителей</span>
          </div>
          <div class="comp-stat-item">
            <span class="comp-stat-val">${this.quizState.xp || 240} XP</span>
            <span class="comp-stat-lbl">Опыт финграмотности</span>
          </div>
        </div>

        <div class="completion-actions">
          <button class="btn-primary-mtb font-accent" id="btn-restart-quiz">Пройти еще раз</button>
        </div>
      </div>
    `;

    const restartBtn = this.container.querySelector('#btn-restart-quiz');
    if (restartBtn) {
      restartBtn.addEventListener('click', () => {
        this.currentQuestionIndex = 0;
        this.resetQuestionFlags();
        this.render();
      });
    }
  }

  renderLoading() {
    this.container.innerHTML = `
      <div class="moby-quiz-loading">
        <div class="spinner-mtb"></div>
        <p>Синхронизация с базой данных MTBank Moby...</p>
      </div>
    `;
  }
}
