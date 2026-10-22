/**
 * moby_storage.js - Moby Family Unified Client-Side Storage & Reactive Engine
 * MTBank Moby Family 2026.
 * 
 * Works 100% autonomously in the browser via LocalStorage.
 * Cross-tab reactive synchronization via StorageEvent and CustomEvent.
 * Provides transparent mock/interceptor for fetch('/api/...') and form submissions
 * to enable seamless deployment to GitHub Pages.
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'moby_family_db_v2';
  const AUTH_KEY = 'moby_family_auth_session';

  // --- SEED QUESTIONS ---
  const KIDS_QUESTIONS = [
    {
      id: 'q1',
      topic: 'Безопасность банковских карт',
      question: 'Тебе в мессенджере пишет «друг» и просит прислать 3 секретные цифры с обратной стороны твоей карты Moby (CVC/CVV), чтобы «перевести подарок». Что сделать?',
      option_a: 'Быстро отправить фото обеих сторон карты',
      option_b: 'Назвать цифры, ведь это же друг',
      option_c: 'Не называть CVC/CVV никому и сразу рассказать родителям: аккаунт друга могли взломать',
      option_d: 'Назвать только две цифры из трех для безопасности',
      correct_option: 'C',
      hint_text: 'Код CVC/CVV и коды из SMS — это ключи к твоим деньгам! Настоящие сотрудники МТБанка и друзья никогда их не спросят.'
    },
    {
      id: 'q2',
      topic: 'Копилка и финансовая цель',
      question: 'Ты получил 60 рублей в подарок на праздник и мечтаешь купить беспроводные наушники за 180 рублей. Какая финансовая стратегия самая разумная?',
      option_a: 'Сразу потратить все 60 рублей на фастфуд и снеки',
      option_b: 'Отложить 45 рублей в копилку Moby, а 15 рублей оставить на текущие радости',
      option_c: 'Одолжить все деньги малознакомому приятелю',
      option_d: 'Забыть о наушниках: накопить такую сумму подростку невозможно',
      correct_option: 'B',
      hint_text: 'Золотое правило личного бюджета: откладывай большую часть на цель (в копилку), а малую — оставляй на карманные расходы!'
    },
    {
      id: 'q3',
      topic: 'Защита от фишинга в играх',
      question: 'В чате онлайн-игры тебе прислали ссылку на «секретный сайт», где раздают бесплатную игровую валюту, но просят ввести логин, пароль и номер карты мамы. Что это?',
      option_a: 'Честная промо-акция от создателей игры',
      option_b: 'Фишинговый мошеннический сайт для кражи аккаунта и денег',
      option_c: 'Обычное игровое событие с викториной',
      option_d: 'Безопасный промокод от популярного стримера',
      correct_option: 'B',
      hint_text: 'Фишинг маскируется под подарки. Никогда не вводи пароли и реквизиты карт на подозрительных сайтах!'
    },
    {
      id: 'q4',
      topic: 'Разумные траты и осознанность',
      question: 'Возле кассы супермаркета ты увидел яркую трендовую игрушку и захотел купить её, потратив все карманные деньги. Как поступить грамотно?',
      option_a: 'Купить немедленно, пока товар не разобрали',
      option_b: 'Применить «правило 24 часов»: подождать сутки, чтобы понять, действительно ли вещь нужна',
      option_c: 'Обидеться и потребовать у родителей оплатить покупку',
      option_d: 'Взять в долг у одноклассников под проценты',
      correct_option: 'B',
      hint_text: 'Импульсивные покупки у кассы рассчитаны на эмоции. Пауза в 24 часа помогает сберечь карманные деньги для важных целей.'
    },
    {
      id: 'q5',
      topic: 'Банковские бонусы: Кэшбэк',
      question: 'Что такое «кэшбэк» по детской карте Moby от МТБанка?',
      option_a: 'Комиссия, которую банк списывает за каждую покупку',
      option_b: 'Возврат части потраченных денег обратно на карту за покупки в магазинах',
      option_c: 'Штрафной балл за то, что на карте мало средств',
      option_d: 'Платная подписка на SMS-уведомления',
      correct_option: 'B',
      hint_text: 'Кэшбэк (Cashback) возвращает процент от стоимости покупок деньгами обратно на твою карту Moby!'
    },
    {
      id: 'q6',
      topic: 'Безопасность у банкомата',
      question: 'Ты снимаешь наличные в банкомате МТБанка, и сзади вплотную подошел незнакомый человек. Как правильно ввести ПИН-код?',
      option_a: 'Громко произнести цифры вслух, чтобы не забыть',
      option_b: 'Прикрыть клавиатуру ладонью или кошельком от посторонних глаз и камер',
      option_c: 'Попросить незнакомца помочь нажать нужные кнопки',
      option_d: 'Бросить карту в банкомате и убежать',
      correct_option: 'B',
      hint_text: 'Всегда прикрывай клавиатуру рукой при вводе 4 цифр ПИН-кода — это базовое правило безопасности!'
    }
  ];

  const TEENS_QUESTIONS = [
    {
      id: 'qt1',
      topic: 'Дропперство и закон (УК РБ)',
      question: 'В Telegram незнакомец предлагает 150 BYN за оформление карты МТБанка на твое имя и передачу реквизитов "для переводов с криптобиржи". Что это?',
      option_a: 'Легкий и безопасный заработок для подростка',
      option_b: 'Обычная работа промоутером банка',
      option_c: 'Дропперство — соучастие в отмывании денег с уголовной ответственностью по ст. 222 УК РБ',
      option_d: 'Реферальная программа с бонусом за друга',
      correct_option: 'C',
      hint_text: 'Передача своих банковских карт третьим лицам за вознаграждение (дропперство) в Беларуси влечет уголовную ответственность (ст. 222 УК РБ)!'
    },
    {
      id: 'qt2',
      topic: 'Сложные проценты и инвестиции',
      question: 'Ты положил 200 BYN на вклад МТБанка под 12% годовых с ежемесячной капитализацией (сложный процент). Как начисляется доход?',
      option_a: 'Проценты начисляются только на изначальные 200 BYN',
      option_b: 'Каждый месяц проценты прибавляются к телу вклада, и в следующем месяце процент начисляется уже на бóльшую сумму',
      option_c: 'Банк забирает половину процентов себе в качестве комиссии',
      option_d: 'Сумма вклада уменьшается из-за инфляции каждый месяц',
      correct_option: 'B',
      hint_text: 'Сложный процент — это "проценты на проценты". С каждым периодом капитал растет быстрее благодаря капитализации!'
    },
    {
      id: 'qt3',
      topic: 'Фриланс и легальный доход (НПД)',
      question: 'Тебе 16 лет, ты создаешь сайты и логотипы на заказ. Как в Беларуси легально получать оплату от заказчиков на карту Moby?',
      option_a: 'Никак, подросткам запрещено подрабатывать до 18 лет',
      option_b: 'Принимать оплату только на карту родителей без учета',
      option_c: 'Установить мобильное приложение "Профдоход" и платить льготный налог на профессиональный доход (10%)',
      option_d: 'Принимать оплату только криптовалютой через анонимные кошельки',
      correct_option: 'C',
      hint_text: 'С 14 лет подростки в РБ могут законно работать на себя в IT, дизайне и репетиторстве через режим "Налог на профессиональный доход"!'
    },
    {
      id: 'qt4',
      topic: 'Студенческий овердрафт',
      question: 'Что такое "овердрафт" по карте и чем он принципиально отличается от обычного дебетового баланса?',
      option_a: 'Бесплатный подарок от банка на день рождения',
      option_b: 'Краткосрочный кредит от банка, позволяющий уйти "в минус" при нехватке своих средств, который нужно вернуть с процентами',
      option_c: 'Кэшбэк за покупку железнодорожных и авиабилетов',
      option_d: 'Блокировка карты при частых платежах',
      correct_option: 'B',
      hint_text: 'Овердрафт — это кредитный лимит банка. Тратя овердрафт, ты берешь деньги в долг у банка и обязан погасить задолженность в срок!'
    },
    {
      id: 'qt5',
      topic: 'P2P-переводы и безопасность',
      question: 'Покупатель на барахолке предлагает перевести тебе деньги за кроссовки и присылает ссылку на сайт, где нужно ввести номер карты, срок действия и CVC-код "для получения средств". Твои действия?',
      option_a: 'Срочно ввести все данные, чтобы не потерять клиента',
      option_b: 'Для получения перевода на карту отправителю нужен ТОЛЬКО номер карты (16 цифр) или номер телефона. Ссылка — фишинг!',
      option_c: 'Ввести только CVC-код без номера карты',
      option_d: 'Отправить скриншот паспорта',
      correct_option: 'B',
      hint_text: 'Для зачисления денег входящим переводом CVC-код и срок действия НИКОГДА не требуются! Запрос CVC на получение перевода — 100% скам.'
    },
    {
      id: 'qt6',
      topic: 'Финансовая подушка безопасности',
      question: 'Какой размер финансовой подушки безопасности считается финансово грамотным стандартом для студента или молодого специалиста?',
      option_a: 'Сумма на 1 поход в кафе (20–30 BYN)',
      option_b: 'Запас расходов на 3–6 месяцев жизни на случай непредвиденных ситуаций',
      option_c: 'Все деньги нужно инвестировать в высокорисковые акции без остатка',
      option_d: 'Подушка безопасности не нужна, если есть родители',
      correct_option: 'B',
      hint_text: 'Финансовая подушка на 3–6 месяцев обязательных расходов дает независимость и защищает от долгов при любых форс-мажорах!'
    }
  ];

  // --- INITIAL DATABASE SEED ---
  function getInitialDatabase() {
    const today = new Date().toLocaleDateString('ru-RU');
    return {
      version: 2,
      parentCards: [
        { id: 'card-kaktus', name: 'МТБанк «Кактус»', cardNumber: '4314 •••• •••• 4120', balance: 1840.50, currency: 'BYN' },
        { id: 'card-halva', name: 'МТБанк «Халва MIX»', cardNumber: '4314 •••• •••• 9931', balance: 920.00, currency: 'BYN' },
        { id: 'card-belkart', name: 'МТБанк «Белкарт-Премиум»', cardNumber: '9112 •••• •••• 8842', balance: 540.20, currency: 'BYN' }
      ],
      children: [
        {
          id: 'child_1',
          name: 'Михаил',
          age: 10,
          role: 'child7',
          parentCardId: 'card-kaktus',
          cardNumber: '4314 •••• •••• 5521',
          balance: 15.00,
          currency: 'BYN',
          dailyLimit: 20.00,
          spentToday: 8.50,
          selfLimit: 10.00,
          mobyScore: 740,
          piggyName: 'Горный велосипед 🚲',
          piggySaved: 45.00,
          piggyGoal: 150.00,
          piggyMatchPercent: 50,
          piggyMatchMaxMonthly: 30.00,
          piggyParentBonusTotal: 22.50,
          quizRewardAmount: 2.00,
          cardStatus: 'ACTIVE',
          cardDesign: 'indigo',
          avatar: '🦁',
          categoryLimits: [
            { id: 'cl_1_1', category: 'Кафе и фастфуд', categoryIcon: '🍔', limitAmount: 7.00, spentAmount: 4.00, isBlocked: 0 },
            { id: 'cl_1_2', category: 'Игры, приложения и подписки', categoryIcon: '🎮', limitAmount: 5.00, spentAmount: 0.00, isBlocked: 0 },
            { id: 'cl_1_3', category: 'Транспорт', categoryIcon: '🚇', limitAmount: 4.00, spentAmount: 2.00, isBlocked: 0 },
            { id: 'cl_1_4', category: 'Развлечения и кино', categoryIcon: '🍿', limitAmount: 0.00, spentAmount: 0.00, isBlocked: 0 },
            { id: 'cl_1_5', category: 'Онлайн-покупки и переводы', categoryIcon: '🛍️', limitAmount: 0.00, spentAmount: 0.00, isBlocked: 0 }
          ]
        },
        {
          id: 'teen_1',
          name: 'Алина',
          age: 16,
          role: 'child14',
          parentCardId: 'card-halva',
          cardNumber: '4314 •••• •••• 7749',
          balance: 65.40,
          currency: 'BYN',
          dailyLimit: 40.00,
          spentToday: 14.20,
          selfLimit: 20.00,
          mobyScore: 780,
          piggyName: 'Курсы веб-дизайна 🎨',
          piggySaved: 120.00,
          piggyGoal: 600.00,
          piggyMatchPercent: 50,
          piggyMatchMaxMonthly: 50.00,
          piggyParentBonusTotal: 60.00,
          quizRewardAmount: 3.00,
          cardStatus: 'ACTIVE',
          cardDesign: 'teen_dark',
          avatar: '👧',
          categoryLimits: [
            { id: 'cl_2_1', category: 'Кафе и фастфуд', categoryIcon: '🍔', limitAmount: 15.00, spentAmount: 8.50, isBlocked: 0 },
            { id: 'cl_2_2', category: 'Игры, приложения и подписки', categoryIcon: '🎮', limitAmount: 10.00, spentAmount: 0.00, isBlocked: 0 },
            { id: 'cl_2_3', category: 'Транспорт', categoryIcon: '🚇', limitAmount: 8.00, spentAmount: 3.20, isBlocked: 0 },
            { id: 'cl_2_4', category: 'Одежда и стиль', categoryIcon: '👟', limitAmount: 0.00, spentAmount: 0.00, isBlocked: 0 },
            { id: 'cl_2_5', category: 'Онлайн-покупки и переводы', categoryIcon: '🛍️', limitAmount: 0.00, spentAmount: 2.50, isBlocked: 0 }
          ]
        }
      ],
      tasks: [
        { id: 't1', childId: 'child_1', childName: 'Михаил', title: 'Помыть посуду', rewardAmount: 5.00, reward_amount: 5.00, status: 'ASSIGNED', createdAt: '2026-10-21T10:00:00.000Z' },
        { id: 't2', childId: 'child_1', childName: 'Михаил', title: 'Убраться в комнате', rewardAmount: 7.00, reward_amount: 7.00, status: 'ASSIGNED', createdAt: '2026-10-21T10:05:00.000Z' },
        { id: 't3', childId: 'teen_1', childName: 'Алина', title: 'Подготовить курсовую по веб-дизайну', rewardAmount: 15.00, reward_amount: 15.00, status: 'ASSIGNED', createdAt: '2026-10-21T10:10:00.000Z' }
      ],
      requests: [
        {
          id: 'req_1',
          childId: 'child_1',
          childName: 'Михаил',
          childAvatar: '🦁',
          title: 'Карманные на поход в кино 🍿',
          amount: 10.00,
          status: 'PENDING',
          requestType: 'MONEY',
          riskScore: 10,
          date: today,
          time: '14:20'
        }
      ],
      parentTransactions: [
        { id: 'pt_1', title: 'Перевод: Пополнение счета Михаил', childName: 'Михаил', amount: 10.00, type: 'TRANSFER', date: today, time: '12:30' },
        { id: 'pt_2', title: 'Перевод: Карманные расходы Алина', childName: 'Алина', amount: 20.00, type: 'TRANSFER', date: today, time: '10:15' }
      ],
      childTransactions: [
        { id: 'tx_1', child_id: 'child_1', title: 'Мороженое и сок', amount: -4.00, category: 'Кафе и фастфуд', category_icon: '🍔', date: today, time: '13:40', type: 'EXPENSE' },
        { id: 'tx_2', child_id: 'child_1', title: 'Проездной талон', amount: -2.00, category: 'Транспорт', category_icon: '🚇', date: today, time: '08:20', type: 'EXPENSE' },
        { id: 'tx_3', child_id: 'teen_1', title: 'Кофейня CoffeeBerry', amount: -8.50, category: 'Кафе и фастфуд', category_icon: '🍔', date: today, time: '15:10', type: 'EXPENSE' },
        { id: 'tx_4', child_id: 'teen_1', title: 'Метрополитен', amount: -3.20, category: 'Транспорт', category_icon: '🚇', date: today, time: '09:00', type: 'EXPENSE' }
      ],
      inventory: {
        child_1: { child_id: 'child_1', coins: 100, hint_5050: 2, extra_lives: 2, text_hints: 2, high_score: 120, bonus_games_today: 0, last_bonus_date: today },
        teen_1: { child_id: 'teen_1', coins: 150, hint_5050: 2, extra_lives: 2, text_hints: 2, high_score: 160, bonus_games_today: 0, last_bonus_date: today }
      },
      quizState: {
        child_1: { child_id: 'child_1', streak_days: 3, last_quiz_date: null, total_answered: 5, earned_byn: 10.0, xp: 150 },
        teen_1: { child_id: 'teen_1', streak_days: 4, last_quiz_date: null, total_answered: 8, earned_byn: 18.0, xp: 240 }
      },
      questions: {
        kids: KIDS_QUESTIONS,
        teens: TEENS_QUESTIONS
      }
    };
  }

  // --- STORAGE WRAPPER ---
  const MobyStorage = {
    DEFAULT_PIN: '1111',

    // Load entire database
    getState() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.version === 2) {
            // Auto-normalize task rewards (both camelCase and snake_case)
            if (Array.isArray(parsed.tasks)) {
              parsed.tasks.forEach(t => {
                const r = Number(t.rewardAmount !== undefined ? t.rewardAmount : (t.reward_amount !== undefined ? t.reward_amount : 0));
                t.rewardAmount = r;
                t.reward_amount = r;
              });
            }
            return parsed;
          }
        }
      } catch (e) {
        console.warn('MobyStorage read error, reseeding:', e);
      }
      const initial = getInitialDatabase();
      this.saveState(initial, false);
      return initial;
    },

    // Save entire database and broadcast
    saveState(state, broadcast = true) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        if (broadcast) {
          window.dispatchEvent(new CustomEvent('moby_storage_updated', { detail: state }));
        }
      } catch (e) {
        console.error('MobyStorage save error:', e);
      }
    },

    // Subscriptions
    subscribe(callback) {
      const listener = (event) => {
        if (event.type === 'moby_storage_updated') {
          callback(event.detail);
        } else if (event.type === 'storage' && event.key === STORAGE_KEY) {
          callback(this.getState());
        }
      };
      window.addEventListener('moby_storage_updated', listener);
      window.addEventListener('storage', listener);
      return () => {
        window.removeEventListener('moby_storage_updated', listener);
        window.removeEventListener('storage', listener);
      };
    },

    // --- AUTH & ROLES ---
    // Roles: 'parent', 'child_1', 'teen_1'
    getCurrentUser() {
      try {
        return localStorage.getItem(AUTH_KEY) || null;
      } catch (_) {
        return null;
      }
    },

    login(role, pin) {
      if (pin !== this.DEFAULT_PIN) {
        return { success: false, message: 'Неверный ПИН-код. Попробуйте пароль по умолчанию: 1111' };
      }
      try {
        localStorage.setItem(AUTH_KEY, role);
      } catch (_) {}
      return { success: true, role };
    },

    logout() {
      try {
        localStorage.removeItem(AUTH_KEY);
      } catch (_) {}
      window.location.href = './index.html';
    },

    // --- DATA ACCESS METHODS ---
    getChildren() {
      return this.getState().children || [];
    },

    getChild(childId) {
      const children = this.getChildren();
      return children.find(c => c.id === childId) || children[0] || null;
    },

    getParentCards() {
      return this.getState().parentCards || [];
    },

    getTasks(childId) {
      const state = this.getState();
      if (!childId) return state.tasks || [];
      return (state.tasks || []).filter(t => t.childId === childId);
    },

    getRequests() {
      return this.getState().requests || [];
    },

    getInventory(childId = 'child_1') {
      const state = this.getState();
      const today = new Date().toLocaleDateString('ru-RU');
      if (!state.inventory[childId]) {
        state.inventory[childId] = {
          child_id: childId,
          coins: 100,
          hint_5050: 2,
          extra_lives: 2,
          text_hints: 2,
          high_score: 0,
          bonus_games_today: 0,
          last_bonus_date: today
        };
        this.saveState(state);
      }
      // Reset daily bonus games if new day
      const inv = state.inventory[childId];
      if (inv.last_bonus_date !== today) {
        inv.bonus_games_today = 0;
        inv.last_bonus_date = today;
        this.saveState(state);
      }
      return inv;
    },

    getQuizState(childId = 'child_1') {
      const state = this.getState();
      if (!state.quizState[childId]) {
        state.quizState[childId] = {
          child_id: childId,
          streak_days: 0,
          last_quiz_date: null,
          total_answered: 0,
          earned_byn: 0.0,
          xp: 0
        };
        this.saveState(state);
      }
      return state.quizState[childId];
    },

    getQuestions(audience = 'kids') {
      const state = this.getState();
      if (audience === 'teens') {
        return state.questions.teens || TEENS_QUESTIONS;
      }
      return state.questions.kids || KIDS_QUESTIONS;
    },

    // --- PARENT ACTIONS ---
    topUpChild(childId, amount, parentCardId) {
      const numAmt = Math.abs(Number(amount));
      if (!numAmt || numAmt <= 0) return { success: false, error: 'Неверная сумма' };

      const state = this.getState();
      const child = state.children.find(c => c.id === childId);
      if (!child) return { success: false, error: 'Ребенок не найден' };

      // Deduct from parent card
      const pCard = state.parentCards.find(c => c.id === (parentCardId || child.parentCardId)) || state.parentCards[0];
      if (pCard) {
        pCard.balance = Math.max(0, pCard.balance - numAmt);
      }

      child.balance = Math.round((child.balance + numAmt) * 100) / 100;

      // Log parent transaction
      const now = new Date();
      state.parentTransactions.unshift({
        id: 'pt_' + Date.now(),
        title: `Пополнение счета ${child.name}`,
        childName: child.name,
        amount: numAmt,
        type: 'TRANSFER',
        date: now.toLocaleDateString('ru-RU'),
        time: now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
      });

      // Log child income transaction
      state.childTransactions.unshift({
        id: 'ctx_' + Date.now(),
        child_id: child.id,
        title: 'Пополнение от родителей',
        amount: numAmt,
        category: 'Переводы',
        category_icon: '💰',
        date: now.toLocaleDateString('ru-RU'),
        time: now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
        type: 'INCOME'
      });

      this.saveState(state);
      return { success: true, balance: child.balance };
    },

    setDailyLimit(childId, limit) {
      const numLimit = Math.max(1, Number(limit));
      const state = this.getState();
      const child = state.children.find(c => c.id === childId);
      if (!child) return { success: false, error: 'Ребенок не найден' };

      child.dailyLimit = numLimit;
      this.saveState(state);
      return { success: true, dailyLimit: child.dailyLimit };
    },

    setQuizReward(childId, rewardAmount) {
      const numReward = Math.max(0, Number(rewardAmount));
      const state = this.getState();
      const child = state.children.find(c => c.id === childId);
      if (!child) return { success: false, error: 'Ребенок не найден' };

      child.quizRewardAmount = numReward;
      this.saveState(state);
      return { success: true, quizRewardAmount: child.quizRewardAmount };
    },

    setCategoryLimit(childId, category, limitAmount) {
      const numLimit = Math.max(0, Number(limitAmount));
      const state = this.getState();
      const child = state.children.find(c => c.id === childId);
      if (!child) return { success: false, error: 'Ребенок не найден' };

      let cat = child.categoryLimits.find(c => c.category === category);
      if (cat) {
        cat.limitAmount = numLimit;
      } else {
        child.categoryLimits.push({
          id: 'cl_' + Date.now(),
          category,
          categoryIcon: '🛍️',
          limitAmount: numLimit,
          spentAmount: 0.00,
          isBlocked: 0
        });
      }
      this.saveState(state);
      return { success: true };
    },

    toggleCategoryBlock(childId, category) {
      const state = this.getState();
      const child = state.children.find(c => c.id === childId);
      if (!child) return { success: false, error: 'Ребенок не найден' };

      let cat = child.categoryLimits.find(c => c.category === category);
      if (cat) {
        cat.isBlocked = cat.isBlocked ? 0 : 1;
      } else {
        child.categoryLimits.push({
          id: 'cl_' + Date.now(),
          category,
          categoryIcon: '🛍️',
          limitAmount: 0.00,
          spentAmount: 0.00,
          isBlocked: 1
        });
      }
      this.saveState(state);
      return { success: true, isBlocked: cat ? cat.isBlocked : 1 };
    },

    toggleCardLock(childId) {
      const state = this.getState();
      const child = state.children.find(c => c.id === childId);
      if (!child) return { success: false, error: 'Ребенок не найден' };

      child.cardStatus = (child.cardStatus === 'FROZEN' || child.cardStatus === 'blocked') ? 'ACTIVE' : 'FROZEN';
      this.saveState(state);
      return { success: true, cardStatus: child.cardStatus };
    },

    setPiggyMatch(childId, percent) {
      const pct = Math.max(0, Math.min(100, Number(percent)));
      const state = this.getState();
      const child = state.children.find(c => c.id === childId);
      if (!child) return { success: false, error: 'Ребенок не найден' };

      child.piggyMatchPercent = pct;
      this.saveState(state);
      return { success: true, piggyMatchPercent: pct };
    },

    addChild(name, age, parentCardId) {
      const state = this.getState();
      const numAge = Number(age);
      const isTeen = numAge >= 14;
      const newId = isTeen ? ('teen_' + (state.children.length + 1)) : ('child_' + (state.children.length + 1));
      const randDigits = Math.floor(1000 + Math.random() * 9000);

      const newChild = {
        id: newId,
        name: name.trim(),
        age: numAge,
        role: isTeen ? 'child14' : 'child7',
        parentCardId: parentCardId || 'card-kaktus',
        cardNumber: `4314 •••• •••• ${randDigits}`,
        balance: 20.00,
        currency: 'BYN',
        dailyLimit: isTeen ? 40.00 : 25.00,
        spentToday: 0.00,
        selfLimit: isTeen ? 20.00 : 10.00,
        mobyScore: 750,
        piggyName: 'Копилка мечты ⭐',
        piggySaved: 0.00,
        piggyGoal: 100.00,
        piggyMatchPercent: 50,
        piggyMatchMaxMonthly: 30.00,
        piggyParentBonusTotal: 0.00,
        quizRewardAmount: 2.00,
        cardStatus: 'ACTIVE',
        cardDesign: isTeen ? 'teen_dark' : 'orange',
        avatar: isTeen ? '⚡' : '🦊',
        categoryLimits: [
          { id: 'cl_new_1', category: 'Кафе и фастфуд', categoryIcon: '🍔', limitAmount: 10.00, spentAmount: 0.00, isBlocked: 0 },
          { id: 'cl_new_2', category: 'Игры, приложения и подписки', categoryIcon: '🎮', limitAmount: 5.00, spentAmount: 0.00, isBlocked: 0 },
          { id: 'cl_new_3', category: 'Транспорт', categoryIcon: '🚇', limitAmount: 5.00, spentAmount: 0.00, isBlocked: 0 }
        ]
      };

      state.children.push(newChild);
      this.saveState(state);
      return { success: true, child: newChild };
    },

    // --- TASK MANAGEMENT ---
    addTask(childId, title, rewardAmount) {
      const state = this.getState();
      const child = state.children.find(c => c.id === childId);
      if (!child) return { success: false, error: 'Ребенок не найден' };

      const r = Math.max(0.5, Number(rewardAmount));
      const newTask = {
        id: 'task_' + Date.now(),
        childId: child.id,
        childName: child.name,
        title: title.trim(),
        rewardAmount: r,
        reward_amount: r,
        status: 'ASSIGNED',
        createdAt: new Date().toISOString()
      };

      state.tasks.unshift(newTask);
      this.saveState(state);
      return { success: true, task: newTask };
    },

    editTask(taskId, title, rewardAmount, childId) {
      const state = this.getState();
      const task = state.tasks.find(t => t.id === taskId);
      if (!task) return { success: false, error: 'Задание не найдено' };

      const r = Math.max(0.5, Number(rewardAmount));
      task.title = title.trim();
      task.rewardAmount = r;
      task.reward_amount = r;
      if (childId) {
        const child = state.children.find(c => c.id === childId);
        if (child) {
          task.childId = child.id;
          task.childName = child.name;
        }
      }
      this.saveState(state);
      return { success: true, task };
    },

    deleteTask(taskId) {
      const state = this.getState();
      state.tasks = state.tasks.filter(t => t.id !== taskId);
      this.saveState(state);
      return { success: true };
    },

    completeTaskByChild(taskId) {
      const state = this.getState();
      const task = state.tasks.find(t => t.id === taskId);
      if (!task) return { success: false, error: 'Задание не найдено' };

      task.status = 'WAITING';

      // Create a verification request for parent
      const now = new Date();
      state.requests.unshift({
        id: 'req_task_' + task.id,
        childId: task.childId,
        childName: task.childName,
        childAvatar: '⭐',
        title: `Выполнено задание: «${task.title}»`,
        amount: task.rewardAmount,
        status: 'PENDING',
        requestType: 'TASK_REWARD',
        riskScore: 0,
        date: now.toLocaleDateString('ru-RU'),
        time: now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
      });

      this.saveState(state);
      return { success: true, task };
    },

    approveRequest(requestId) {
      const state = this.getState();
      const req = state.requests.find(r => r.id === requestId);
      if (!req) return { success: false, error: 'Запрос не найден' };

      const child = state.children.find(c => c.id === req.childId);
      if (child) {
        child.balance = Math.round((child.balance + req.amount) * 100) / 100;
        const now = new Date();
        state.childTransactions.unshift({
          id: 'ctx_' + Date.now(),
          child_id: child.id,
          title: `Одобрено: ${req.title}`,
          amount: req.amount,
          category: req.requestType === 'TASK_REWARD' ? 'Награды' : 'Карманные',
          category_icon: '🎁',
          date: now.toLocaleDateString('ru-RU'),
          time: now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
          type: 'REWARD'
        });
      }

      // If associated with a task
      if (req.requestType === 'TASK_REWARD') {
        const taskId = req.id.replace('req_task_', '');
        const task = state.tasks.find(t => t.id === taskId);
        if (task) task.status = 'COMPLETED';
      }

      state.requests = state.requests.filter(r => r.id !== requestId);
      this.saveState(state);
      return { success: true };
    },

    rejectRequest(requestId) {
      const state = this.getState();
      const req = state.requests.find(r => r.id === requestId);
      if (req && req.requestType === 'TASK_REWARD') {
        const taskId = req.id.replace('req_task_', '');
        const task = state.tasks.find(t => t.id === taskId);
        if (task) task.status = 'ASSIGNED';
      }
      state.requests = state.requests.filter(r => r.id !== requestId);
      this.saveState(state);
      return { success: true };
    },

    // --- CHILD FINANCIAL OPERATIONS ---
    childSpend(childId, amount, title, category, merchant) {
      const numAmt = Math.abs(Number(amount));
      const state = this.getState();
      const child = state.children.find(c => c.id === childId);
      if (!child) return { success: false, error: 'Счет не найден' };

      if (child.cardStatus === 'FROZEN' || child.cardStatus === 'blocked') {
        return { success: false, error: 'Карта заблокирована' };
      }

      // Check category block
      const cat = child.categoryLimits.find(c => c.category === category);
      if (cat && cat.isBlocked) {
        return { success: false, error: `Категория «${category}» заблокирована родителем!` };
      }

      if (child.balance < numAmt) {
        return { success: false, error: 'Недостаточно средств на счете' };
      }

      child.balance = Math.round((child.balance - numAmt) * 100) / 100;
      child.spentToday = Math.round(((child.spentToday || 0) + numAmt) * 100) / 100;

      if (cat) {
        cat.spentAmount = Math.round(((cat.spentAmount || 0) + numAmt) * 100) / 100;
      }

      const now = new Date();
      state.childTransactions.unshift({
        id: 'ctx_' + Date.now(),
        child_id: child.id,
        title: title || merchant || 'Покупка',
        amount: -numAmt,
        category: category || 'Покупки',
        category_icon: (cat && cat.categoryIcon) || '🛍️',
        date: now.toLocaleDateString('ru-RU'),
        time: now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
        type: 'EXPENSE'
      });

      this.saveState(state);
      return { success: true, balance: child.balance, spentToday: child.spentToday };
    },

    childSaveToPiggy(childId, amount) {
      const numAmt = Math.abs(Number(amount));
      const state = this.getState();
      const child = state.children.find(c => c.id === childId);
      if (!child) return { success: false, error: 'Ребенок не найден' };

      if (child.balance < numAmt) {
        return { success: false, error: 'Недостаточно средств' };
      }

      // Calculate parent co-financing bonus
      const matchPct = Number(child.piggyMatchPercent || 50);
      const parentBonus = Math.round((numAmt * (matchPct / 100)) * 100) / 100;
      const totalPiggyDeposit = numAmt + parentBonus;

      child.balance = Math.round((child.balance - numAmt) * 100) / 100;
      child.piggySaved = Math.round(((child.piggySaved || 0) + totalPiggyDeposit) * 100) / 100;
      child.piggyParentBonusTotal = Math.round(((child.piggyParentBonusTotal || 0) + parentBonus) * 100) / 100;

      const now = new Date();
      state.childTransactions.unshift({
        id: 'ctx_piggy_' + Date.now(),
        child_id: child.id,
        title: `Копилка: +${parentBonus.toFixed(2)} BYN бонус от родителей!`,
        amount: -numAmt,
        category: 'Копилка',
        category_icon: '🐷',
        date: now.toLocaleDateString('ru-RU'),
        time: now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
        type: 'PIGGY'
      });

      this.saveState(state);
      return {
        success: true,
        balance: child.balance,
        piggySaved: child.piggySaved,
        parentBonus,
        totalDeposit: totalPiggyDeposit
      };
    },

    childRequestMoney(childId, amount, title, requestType = 'MONEY') {
      const numAmt = Math.abs(Number(amount));
      const state = this.getState();
      const child = state.children.find(c => c.id === childId);
      if (!child) return { success: false, error: 'Ребенок не найден' };

      const now = new Date();
      const newReq = {
        id: 'req_' + Date.now(),
        childId: child.id,
        childName: child.name,
        childAvatar: child.avatar || '🦁',
        title: title || 'Запрос карманных денег',
        amount: numAmt,
        status: 'PENDING',
        requestType: requestType,
        riskScore: requestType === 'ANTIFRAUD' ? 85 : 0,
        date: now.toLocaleDateString('ru-RU'),
        time: now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
      };

      state.requests.unshift(newReq);
      this.saveState(state);
      return { success: true, request: newReq };
    },

    p2pTransfer(fromChildId, recipient, recipientName, amount, comment) {
      const numAmt = Math.abs(Number(amount));
      const state = this.getState();
      const sender = state.children.find(c => c.id === fromChildId) || state.children.find(c => c.age >= 14);
      if (!sender) return { success: false, error: 'Отправитель не найден' };

      if (sender.cardStatus === 'FROZEN' || sender.cardStatus === 'blocked') {
        return { success: false, error: 'Карта заблокирована' };
      }
      if (sender.balance < numAmt) {
        return { success: false, error: 'Недостаточно средств на балансе' };
      }

      sender.balance = Math.round((sender.balance - numAmt) * 100) / 100;
      sender.spentToday = Math.round(((sender.spentToday || 0) + numAmt) * 100) / 100;

      const now = new Date();
      state.childTransactions.unshift({
        id: 'p2p_' + Date.now(),
        child_id: sender.id,
        title: `P2P-перевод: ${recipientName || recipient}`,
        amount: -numAmt,
        category: 'Переводы P2P',
        category_icon: '📲',
        date: now.toLocaleDateString('ru-RU'),
        time: now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
        type: 'P2P'
      });

      this.saveState(state);
      return { success: true, balance: sender.balance };
    },

    // --- MINI-GAME & QUIZ ---
    consumeBonusGame(childId = 'child_1') {
      const state = this.getState();
      const today = new Date().toLocaleDateString('ru-RU');
      const inv = this.getInventory(childId);

      if (inv.bonus_games_today >= 3 && inv.last_bonus_date === today) {
        return { success: false, error: 'Лимит бонусов из мини-игры исчерпан (максимум 3 раза в день)!' };
      }

      inv.bonus_games_today = (inv.bonus_games_today || 0) + 1;
      inv.last_bonus_date = today;
      this.saveState(state);
      return { success: true, bonusGamesToday: inv.bonus_games_today, remaining: 3 - inv.bonus_games_today };
    },

    syncGameRewards(childId, rewards) {
      const state = this.getState();
      const inv = this.getInventory(childId);

      inv.coins = (inv.coins || 0) + (Number(rewards.coins) || 0);
      inv.hint_5050 = (inv.hint_5050 || 0) + (Number(rewards.hint_5050) || 0);
      inv.extra_lives = (inv.extra_lives || 0) + (Number(rewards.extra_lives) || 0);
      inv.text_hints = (inv.text_hints || 0) + (Number(rewards.text_hints) || 0);
      if (rewards.score > (inv.high_score || 0)) {
        inv.high_score = Number(rewards.score);
      }

      this.saveState(state);
      return inv;
    },

    useQuizHint(childId, hintType, questionId) {
      const state = this.getState();
      const inv = this.getInventory(childId);

      if (hintType === 'hint_5050') {
        if (inv.hint_5050 <= 0) return { success: false, message: 'Подсказки 50/50 закончились! Загляни в игру.' };
        inv.hint_5050--;
      } else if (hintType === 'extra_lives') {
        if (inv.extra_lives <= 0) return { success: false, message: 'Щиты от ошибок закончились!' };
        inv.extra_lives--;
      } else if (hintType === 'text_hints') {
        if (inv.text_hints <= 0) return { success: false, message: 'Подсказки маскота закончились!' };
        inv.text_hints--;
      }

      this.saveState(state);

      // Find question for hint payload
      const allQ = [...KIDS_QUESTIONS, ...TEENS_QUESTIONS];
      const q = allQ.find(item => item.id === questionId);

      let eliminatedOptions = [];
      let hintText = null;

      if (hintType === 'hint_5050' && q) {
        const wrong = ['A', 'B', 'C', 'D'].filter(opt => opt !== q.correct_option);
        wrong.sort(() => Math.random() - 0.5);
        eliminatedOptions = wrong.slice(0, 2);
      }
      if (hintType === 'text_hints' && q) {
        hintText = q.hint_text;
      }

      return {
        success: true,
        hintType,
        inventory: inv,
        eliminatedOptions,
        hintText
      };
    },

    recordQuizAnswer(childId, questionId, selectedOption) {
      const state = this.getState();
      const allQ = [...KIDS_QUESTIONS, ...TEENS_QUESTIONS];
      const q = allQ.find(item => item.id === questionId);
      if (!q) return { success: false, error: 'Вопрос не найден' };

      const isCorrect = selectedOption.toUpperCase() === q.correct_option.toUpperCase();
      const qState = this.getQuizState(childId);
      qState.total_answered = (qState.total_answered || 0) + 1;

      if (isCorrect) {
        qState.xp = (qState.xp || 0) + 25;
      }

      this.saveState(state);
      return {
        success: true,
        isCorrect,
        correctOption: q.correct_option,
        hintText: q.hint_text,
        quizState: qState
      };
    },

    completeQuizReward(childId) {
      const state = this.getState();
      const child = state.children.find(c => c.id === childId);
      if (!child) return { success: false, error: 'Ребенок не найден' };

      const qState = this.getQuizState(childId);
      const today = new Date().toLocaleDateString('ru-RU');

      // Streak increments ONLY if completed once per day!
      let streakUpdated = false;
      if (qState.last_quiz_date !== today) {
        qState.streak_days = (qState.streak_days || 0) + 1;
        qState.last_quiz_date = today;
        streakUpdated = true;
      }

      // Add parent reward to balance
      const reward = Number(child.quizRewardAmount !== undefined ? child.quizRewardAmount : 2.00);
      child.balance = Math.round((child.balance + reward) * 100) / 100;
      qState.earned_byn = Math.round(((qState.earned_byn || 0) + reward) * 100) / 100;

      const now = new Date();
      state.childTransactions.unshift({
        id: 'ctx_quiz_' + Date.now(),
        child_id: child.id,
        title: 'Награда за решение квиза 🧠',
        amount: reward,
        category: 'Награды',
        category_icon: '🎓',
        date: now.toLocaleDateString('ru-RU'),
        time: now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
        type: 'REWARD'
      });

      this.saveState(state);
      return {
        success: true,
        rewardAmount: reward,
        streakDays: qState.streak_days,
        streakUpdated,
        newBalance: child.balance,
        quizState: qState
      };
    },

    resetDemo() {
      const fresh = getInitialDatabase();
      this.saveState(fresh);
      try {
        localStorage.removeItem(AUTH_KEY);
      } catch (_) {}
      return fresh;
    }
  };

  // --- CLIENT FETCH & FORM SUBMISSION INTERCEPTOR ---
  // Transparently fulfills all API and backend calls for static hosting!
  const originalFetch = window.__origFetch || window.fetch;
  window.__origFetch = originalFetch;

  window.fetch = async function (input, init) {
    const url = typeof input === 'string' ? input : (input && input.url ? input.url : '');

    // 1. Intercept /api/parent/live-state
    if (url.includes('/api/parent/live-state')) {
      const state = MobyStorage.getState();
      const parentCard = state.parentCards[0];
      return new Response(JSON.stringify({
        success: true,
        hasChildren: state.children.length > 0,
        children: state.children,
        parentTransactions: state.parentTransactions,
        childRequests: state.requests,
        childTasks: state.tasks,
        parentCard
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // 2. Intercept /api/child/state and /api/teen/state
    if (url.includes('/api/child/state') || url.includes('/api/teen/state')) {
      const u = new URL(url, window.location.origin);
      const isTeen = url.includes('teen');
      const childId = u.searchParams.get('childId') || (isTeen ? 'teen_1' : 'child_1');
      const child = MobyStorage.getChild(childId);
      const state = MobyStorage.getState();
      const targetId = child ? child.id : childId;
      const childTasks = (state.tasks || []).filter(t => t.childId === targetId);
      const childTx = (state.childTransactions || []).filter(t => t.child_id === targetId);
      const inv = MobyStorage.getInventory(targetId);
      const qState = MobyStorage.getQuizState(targetId);

      const formattedChild = child ? {
        id: child.id,
        name: child.name,
        age: child.age,
        balance: Number(child.balance),
        cardNumber: child.cardNumber,
        cardStatus: (child.cardStatus === 'FROZEN' || child.cardStatus === 'blocked') ? 'blocked' : 'active',
        dailyLimit: Number(child.dailyLimit),
        selfLimit: Number(child.selfLimit || 10.0),
        spentToday: Number(child.spentToday || 0),
        mobyScore: Number(child.mobyScore || 740),
        piggySaved: Number(child.piggySaved || 0),
        piggyGoal: Number(child.piggyGoal || 100),
        piggyName: child.piggyName || 'Копилка',
        piggyMatchPercent: Number(child.piggyMatchPercent !== undefined ? child.piggyMatchPercent : 50),
        piggyMatchMaxMonthly: Number(child.piggyMatchMaxMonthly !== undefined ? child.piggyMatchMaxMonthly : 30),
        piggyParentBonusTotal: Number(child.piggyParentBonusTotal || 0),
        quizRewardAmount: Number(child.quizRewardAmount !== undefined ? child.quizRewardAmount : 2.00),
        avatar: child.avatar || (isTeen ? '👧' : '🦁')
      } : null;

      return new Response(JSON.stringify({
        success: true,
        exists: Boolean(child),
        child: formattedChild,
        teen: formattedChild,
        limits: child ? child.categoryLimits : [],
        tasks: childTasks,
        transactions: childTx,
        inventory: inv,
        quizState: qState
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // 3. Intercept /api/inventory
    if (url.includes('/api/inventory')) {
      const parts = url.split('/');
      const childId = parts[parts.length - 1] || 'child_1';
      const cleanChildId = childId.includes('?') ? childId.split('?')[0] : childId;
      const child = MobyStorage.getChild(cleanChildId);
      const inv = MobyStorage.getInventory(cleanChildId);
      const qState = MobyStorage.getQuizState(cleanChildId);

      return new Response(JSON.stringify({
        success: true,
        childId: cleanChildId,
        inventory: inv,
        quizState: qState,
        quizRewardAmount: child ? child.quizRewardAmount : 2.00
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // 4. Intercept /api/quiz/questions
    if (url.includes('/api/quiz/questions')) {
      const isTeens = url.includes('teens') || (window.location.pathname.includes('teens'));
      const q = MobyStorage.getQuestions(isTeens ? 'teens' : 'kids');
      return new Response(JSON.stringify({
        success: true,
        audience: isTeens ? 'teens' : 'kids',
        questions: q
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // 5. Intercept /api/quiz/use-hint
    if (url.includes('/api/quiz/use-hint')) {
      let body = {};
      try { body = init && init.body ? JSON.parse(init.body) : {}; } catch (_) {}
      const res = MobyStorage.useQuizHint(body.childId || 'child_1', body.hintType, body.questionId);
      return new Response(JSON.stringify(res), {
        status: res.success ? 200 : 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 6. Intercept /api/quiz/answer
    if (url.includes('/api/quiz/answer')) {
      let body = {};
      try { body = init && init.body ? JSON.parse(init.body) : {}; } catch (_) {}
      const res = MobyStorage.recordQuizAnswer(body.childId || 'child_1', body.questionId, body.selectedOption);
      const inv = MobyStorage.getInventory(body.childId || 'child_1');
      return new Response(JSON.stringify({ ...res, inventory: inv }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 7. Intercept /api/quiz/complete
    if (url.includes('/api/quiz/complete')) {
      let body = {};
      try { body = init && init.body ? JSON.parse(init.body) : {}; } catch (_) {}
      const res = MobyStorage.completeQuizReward(body.childId || 'child_1');
      return new Response(JSON.stringify(res), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // 8. Intercept /api/game/sync-rewards
    if (url.includes('/api/game/sync-rewards')) {
      let body = {};
      try { body = init && init.body ? JSON.parse(init.body) : {}; } catch (_) {}
      const inv = MobyStorage.syncGameRewards(body.childId || 'child_1', body);
      const qState = MobyStorage.getQuizState(body.childId || 'child_1');
      return new Response(JSON.stringify({
        success: true,
        inventory: inv,
        quizState: qState
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // 9. Intercept /api/child/payment and /api/teen/payment
    if (url.includes('/payment')) {
      let body = {};
      try { body = init && init.body ? JSON.parse(init.body) : {}; } catch (_) {}
      const targetChildId = body.childId || (url.includes('teen') ? 'teen_1' : 'child_1');
      if (body.isSuspicious) {
        MobyStorage.childRequestMoney(targetChildId, body.amount, body.title, 'ANTIFRAUD');
        return new Response(JSON.stringify({ success: true, suspicious: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      } else {
        const res = MobyStorage.childSpend(targetChildId, body.amount, body.title, body.category, body.merchant);
        return new Response(JSON.stringify(res), { status: res.success ? 200 : 400, headers: { 'Content-Type': 'application/json' } });
      }
    }

    // 10. Intercept /api/p2p/transfer
    if (url.includes('/api/p2p/transfer')) {
      let body = {};
      try { body = init && init.body ? JSON.parse(init.body) : {}; } catch (_) {}
      const res = MobyStorage.p2pTransfer(body.childId || 'teen_1', body.recipient, body.recipientName, body.amount, body.comment);
      return new Response(JSON.stringify(res), { status: res.success ? 200 : 400, headers: { 'Content-Type': 'application/json' } });
    }

    // 11. Intercept /api/child/piggy-topup and /api/teen/piggy-topup
    if (url.includes('/piggy-topup')) {
      let body = {};
      try { body = init && init.body ? JSON.parse(init.body) : {}; } catch (_) {}
      const targetChildId = body.childId || (url.includes('teen') ? 'teen_1' : 'child_1');
      const res = MobyStorage.childSaveToPiggy(targetChildId, body.amount);
      const child = MobyStorage.getChild(targetChildId);
      return new Response(JSON.stringify({
        success: res.success,
        balance: child ? child.balance : 0,
        piggySaved: child ? child.piggySaved : 0,
        parentBonus: res.parentBonus || 0,
        matchPercent: child ? child.piggyMatchPercent : 50,
        totalAdded: res.totalDeposit || body.amount,
        piggyGoal: child ? child.piggyGoal : 100,
        piggyName: child ? child.piggyName : 'Копилка'
      }), { status: res.success ? 200 : 400, headers: { 'Content-Type': 'application/json' } });
    }

    // 12. Intercept /api/child/piggy-edit, /api/teen/piggy-edit, and /api/child/piggy-save
    if (url.includes('/piggy-edit') || url.includes('/piggy-save')) {
      let body = {};
      try { body = init && init.body ? JSON.parse(init.body) : {}; } catch (_) {}
      const targetChildId = body.childId || (url.includes('teen') ? 'teen_1' : 'child_1');
      const state = MobyStorage.getState();
      const child = state.children.find(c => c.id === targetChildId) || state.children[0];
      if (child) {
        if (body.name) child.piggyName = String(body.name).trim();
        if (body.goal) child.piggyGoal = Math.max(1, Number(body.goal));
        if (body.saved !== undefined) child.piggySaved = Number(body.saved);
        MobyStorage.saveState(state);
        return new Response(JSON.stringify({ success: true, piggyName: child.piggyName, piggyGoal: child.piggyGoal }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
    }

    // 13. Intercept /api/teen/update-self-limit
    if (url.includes('/update-self-limit')) {
      let body = {};
      try { body = init && init.body ? JSON.parse(init.body) : {}; } catch (_) {}
      const state = MobyStorage.getState();
      const teen = state.children.find(c => c.id === (body.childId || 'teen_1'));
      if (teen && body.selfLimit) {
        teen.selfLimit = Math.max(1, Number(body.selfLimit));
        MobyStorage.saveState(state);
        return new Response(JSON.stringify({ success: true, selfLimit: teen.selfLimit }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
    }

    // 14. Intercept /complete-task
    if (url.includes('/complete-task') || url.includes('/tasks/complete')) {
      let body = {};
      try { body = init && init.body ? JSON.parse(init.body) : {}; } catch (_) {}
      const res = MobyStorage.completeTaskByChild(body.taskId);
      return new Response(JSON.stringify(res), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // 15. Intercept /api/child/toggle-freeze
    if (url.includes('/toggle-freeze')) {
      let body = {};
      try { body = init && init.body ? JSON.parse(init.body) : {}; } catch (_) {}
      const res = MobyStorage.toggleCardLock(body.childId || 'child_1');
      return new Response(JSON.stringify(res), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // 16. Intercept /api/parent-request and /api/child/request-money
    if (url.includes('/request-money') || url.includes('/parent-request')) {
      let body = {};
      try { body = init && init.body ? JSON.parse(init.body) : {}; } catch (_) {}
      const targetChildId = body.childId || (url.includes('teen') ? 'teen_1' : 'child_1');
      const res = MobyStorage.childRequestMoney(targetChildId, body.amount, body.title, 'MONEY');
      return new Response(JSON.stringify(res), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // 17. Intercept /api/reset and /api/dev/reset
    if (url.includes('/reset')) {
      MobyStorage.resetDemo();
      return new Response(JSON.stringify({ success: true, message: 'Данные сброшены' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // Fallback to original fetch
    if (originalFetch) {
      return originalFetch.call(this, input, init);
    }
    return new Response('{}', { status: 200 });
  };

  // --- FORM SUBMIT INTERCEPTOR ---
  // Catches standard HTML POST forms in parent dashboard (top-up, set-limit, add-task, etc.)
  document.addEventListener('submit', function (e) {
    const form = e.target;
    const action = form.getAttribute('action') || '';
    if (!action || !action.startsWith('/')) return;

    e.preventDefault();
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    if (action === '/add-child') {
      MobyStorage.addChild(data.name, data.age, data.parentCardId);
      if (typeof window.closeModal === 'function') window.closeModal('addChildModal');
      if (typeof window.showToast === 'function') window.showToast('Детская карта успешно выпущена! 💳');
    } else if (action === '/child-action/top-up') {
      MobyStorage.topUpChild(data.childId, data.amount);
      if (typeof window.closeModal === 'function') window.closeModal(`topUpModal_${data.childId}`);
      if (typeof window.showToast === 'function') window.showToast(`Баланс пополнен на ${Number(data.amount).toFixed(2)} BYN! 💰`);
    } else if (action === '/child-action/set-limit') {
      MobyStorage.setDailyLimit(data.childId, data.dailyLimit);
      if (typeof window.closeModal === 'function') window.closeModal(`limitsModal_${data.childId}`);
      if (typeof window.showToast === 'function') window.showToast(`Лимит установлен: ${Number(data.dailyLimit).toFixed(2)} BYN 📊`);
    } else if (action === '/child-action/set-quiz-reward') {
      MobyStorage.setQuizReward(data.childId, data.rewardAmount);
      if (typeof window.showToast === 'function') window.showToast(`Награда за квиз сохранена: ${Number(data.rewardAmount).toFixed(2)} BYN 🧠`);
    } else if (action === '/child-action/set-category-limit') {
      MobyStorage.setCategoryLimit(data.childId, data.category, data.limit);
      if (typeof window.showToast === 'function') window.showToast(`Лимит для «${data.category}» установлен: ${Number(data.limit).toFixed(2)} BYN`);
    } else if (action === '/child-action/toggle-category-block') {
      const res = MobyStorage.toggleCategoryBlock(data.childId, data.category);
      if (typeof window.showToast === 'function') {
        window.showToast(res.isBlocked ? `Категория «${data.category}» запрещена 🚫` : `Категория «${data.category}» разрешена ✅`);
      }
    } else if (action === '/child-action/toggle-lock') {
      const res = MobyStorage.toggleCardLock(data.childId);
      if (typeof window.showToast === 'function') {
        window.showToast(res.cardStatus === 'FROZEN' ? 'Карта заблокирована ❄️' : 'Карта разблокирована ☀️');
      }
    } else if (action === '/child-action/add-task' || action === '/add-task') {
      MobyStorage.addTask(data.childId, data.title, data.rewardAmount);
      if (typeof window.closeModal === 'function') window.closeModal('addTaskModal');
      if (typeof window.showToast === 'function') window.showToast('Задание успешно назначено! 🎯');
    } else if (action === '/child-action/edit-task' || action === '/edit-task') {
      MobyStorage.editTask(data.taskId, data.title, data.rewardAmount, data.childId);
      if (typeof window.closeModal === 'function') window.closeModal('editTaskModal');
      if (typeof window.showToast === 'function') window.showToast('Задание обновлено! ✏️');
    } else if (action === '/child-action/delete-task' || action === '/delete-task') {
      MobyStorage.deleteTask(data.taskId);
      if (typeof window.showToast === 'function') window.showToast('Задание удалено 🗑️');
    } else if (action === '/child-action/approve-request') {
      MobyStorage.approveRequest(data.requestId);
      if (typeof window.showToast === 'function') window.showToast('Запрос одобрен! Выплата произведена ✅');
    } else if (action === '/child-action/reject-request') {
      MobyStorage.rejectRequest(data.requestId);
      if (typeof window.showToast === 'function') window.showToast('Запрос отклонен ✕');
    }
  });

  // Expose globally
  window.MobyStorage = MobyStorage;

  // Initialize immediately
  MobyStorage.getState();
})();
