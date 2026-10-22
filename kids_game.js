/**
 * MobyCatcherGame - Изолированный ES6-класс аркадной 2D-мини-игры «Ловец бонусов»
 * Модуль для детского банкинга MTBank Moby Family.
 * 
 * ВЕРСИЯ 2.0 (СТРОГО ПО ОФИЦИАЛЬНОМУ БРЕНДБУКУ МТБАНКА):
 * - Основной цвет MT Blue (60%): #2334C8
 * - Акцентный цвет MT Red (20%): #E42C26
 * - Дополнительный акцент MT Orange (20%): #FF5912
 * - Фон: чистый градиент #FFFFFF -> #E7F4FF (MT Cloud Blue) с кольцами #97CFFF (MT Sky Blue)
 * - Монеты строго в цвете MT Orange #FF5912 с белой «М»
 * - Препятствия строго в цвете MT Red #E42C26
 * - Сердечки жизней строго в цвете MT Red #E42C26 (потерянные — серый контур #D1D5DB)
 * - Маскот Moby с фирменным шлемом MT Blue и элементами энергии «Лучи» (#FF5912 / #E42C26)
 */
export class MobyCatcherGame {
  constructor(canvas, options = {}) {
    if (!canvas) throw new Error('MobyCatcherGame: Canvas element is required');
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    // Настройки и колбэки
    this.options = {
      childId: options.childId || 'child_1',
      apiBase: options.apiBase || '',
      duration: options.duration || 60, // Ограничение по времени: 60 сек (1 минута)
      onScoreUpdate: options.onScoreUpdate || (() => {}),
      onHintEarned: options.onHintEarned || (() => {}),
      onGameOver: options.onGameOver || (() => {}),
      onLifeLost: options.onLifeLost || (() => {}),
      onTimeTick: options.onTimeTick || (() => {}),
      soundEnabled: options.soundEnabled !== false
    };

    // ОФИЦИАЛЬНАЯ ПАЛИТРА МТБАНКА (СТРОГО ПО БРЕНДБУКУ)
    this.COLORS = {
      mtBlue: '#2334C8',       // 60%
      mtRed: '#E42C26',        // 20%
      mtOrange: '#FF5912',     // 20%
      mtCloudBlue: '#E7F4FF',
      mtSkyBlue: '#97CFFF',
      mtSoftBlue: '#82AED3',
      white: '#FFFFFF',
      black: '#141416',
      grayInactive: '#D1D5DB'
    };

    // Размеры холста
    this.width = this.canvas.width = 400;
    this.height = this.canvas.height = 550;

    // Состояние игры и таймер (1 минута)
    this.isRunning = false;
    this.isPaused = false;
    this.duration = this.options.duration;
    this.timeLeft = this.duration;
    this.score = 0;
    this.coinsCollected = 0;
    this.lives = 3;
    this.maxLives = 3;

    // Награды за текущую сессию для отправки в SQLite
    this.sessionRewards = {
      coins: 0,
      hint_5050: 0,
      extra_lives: 0,
      text_hints: 0,
      score: 0
    };

    // Состояние Маскота Moby
    this.mascot = {
      x: this.width / 2,
      y: this.height - 55,
      targetX: this.width / 2,
      width: 74,
      height: 64,
      speed: 12,
      tilt: 0,
      blinkTimer: 0,
      isBlinking: false
    };

    // Игровые объекты и эффекты
    this.fallingObjects = [];
    this.particles = [];
    this.floatingTexts = [];
    this.shakeDuration = 0;
    this.flashRedAlpha = 0;

    // Таймеры спавна
    this.lastTime = 0;
    this.coinSpawnTimer = 0;
    this.hazardSpawnTimer = 0;
    this.bonusSpawnTimer = 0;

    // Управление клавишами
    this.keys = {
      left: false,
      right: false
    };

    // Инициализация звука и слушателей
    this.initAudio();
    this.bindEvents();
  }

  // --- Web Audio API Синтезатор эффектов ---
  initAudio() {
    this.audioCtx = null;
    this.ensureAudio = () => {
      if (!this.audioCtx && typeof window !== 'undefined') {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
          this.audioCtx = new AudioContextClass();
        }
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

      if (type === 'coin') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(1400, now + 0.12);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
      } else if (type === 'bonus') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.setValueAtTime(659.25, now + 0.08);
        osc.frequency.setValueAtTime(783.99, now + 0.16);
        osc.frequency.setValueAtTime(1046.50, now + 0.24);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === 'hit') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.22);
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      } else if (type === 'gameover') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(110, now + 0.5);
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.55);
        osc.start(now);
        osc.stop(now + 0.55);
      } else if (type === 'tick') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(750, now);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
        osc.start(now);
        osc.stop(now + 0.05);
      }
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  }

  // --- Привязка событий управления ---
  bindEvents() {
    this._handleKeyDown = (e) => {
      this.ensureAudio();
      if (['ArrowLeft', 'KeyA', 'a', 'A', 'ф', 'Ф'].includes(e.code) || ['ArrowLeft', 'a', 'A'].includes(e.key)) {
        this.keys.left = true;
      }
      if (['ArrowRight', 'KeyD', 'd', 'D', 'в', 'В'].includes(e.code) || ['ArrowRight', 'd', 'D'].includes(e.key)) {
        this.keys.right = true;
      }
    };

    this._handleKeyUp = (e) => {
      if (['ArrowLeft', 'KeyA', 'a', 'A', 'ф', 'Ф'].includes(e.code) || ['ArrowLeft', 'a', 'A'].includes(e.key)) {
        this.keys.left = false;
      }
      if (['ArrowRight', 'KeyD', 'd', 'D', 'в', 'В'].includes(e.code) || ['ArrowRight', 'd', 'D'].includes(e.key)) {
        this.keys.right = false;
      }
    };

    this._handleMouseMove = (e) => {
      this.ensureAudio();
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const clientX = e.clientX - rect.left;
      this.mascot.targetX = Math.max(
        this.mascot.width / 2,
        Math.min(this.width - this.mascot.width / 2, clientX * scaleX)
      );
    };

    this._handleTouchMove = (e) => {
      this.ensureAudio();
      if (e.touches.length > 0) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const clientX = e.touches[0].clientX - rect.left;
        this.mascot.targetX = Math.max(
          this.mascot.width / 2,
          Math.min(this.width - this.mascot.width / 2, clientX * scaleX)
        );
      }
      if (this.isRunning && !this.isPaused) {
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', this._handleKeyDown);
    window.addEventListener('keyup', this._handleKeyUp);
    this.canvas.addEventListener('mousemove', this._handleMouseMove);
    this.canvas.addEventListener('touchmove', this._handleTouchMove, { passive: false });
    this.canvas.addEventListener('touchstart', this._handleTouchMove, { passive: false });
  }

  // --- Запуск, Пауза, Рестарт ---
  start() {
    this.ensureAudio();
    this.isRunning = true;
    this.isPaused = false;
    this.score = 0;
    this.coinsCollected = 0;
    this.lives = 3;
    this.timeLeft = this.duration; // Сброс таймера на 60 сек
    this.fallingObjects = [];
    this.particles = [];
    this.floatingTexts = [];
    this.shakeDuration = 0;
    this.flashRedAlpha = 0;

    this.sessionRewards = {
      coins: 0,
      hint_5050: 0,
      extra_lives: 0,
      text_hints: 0,
      score: 0
    };

    this.mascot.x = this.width / 2;
    this.mascot.targetX = this.width / 2;
    this.lastTime = performance.now();

    this.options.onScoreUpdate(this.score, this.coinsCollected);
    this.options.onTimeTick(this.timeLeft);

    cancelAnimationFrame(this.animFrameId);
    this.gameLoop(this.lastTime);
  }

  pause() {
    this.isPaused = true;
  }

  resume() {
    if (this.isRunning && this.isPaused) {
      this.isPaused = false;
      this.lastTime = performance.now();
      this.gameLoop(this.lastTime);
    }
  }

  restart() {
    this.start();
  }

  // --- Главный игровой цикл ---
  gameLoop(currentTime) {
    if (!this.isRunning) return;

    if (this.isPaused) {
      this.drawPausedOverlay();
      return;
    }

    const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.1);
    this.lastTime = currentTime;

    this.update(deltaTime);
    this.render();

    this.animFrameId = requestAnimationFrame((time) => this.gameLoop(time));
  }

  // --- Обновление логики (Physics & State) ---
  update(dt) {
    // 0. Таймер обратного отсчета (ограничение ~1 минута = 60 сек)
    const prevSec = Math.ceil(this.timeLeft);
    this.timeLeft = Math.max(0, this.timeLeft - dt);
    const currSec = Math.ceil(this.timeLeft);

    if (currSec !== prevSec) {
      this.options.onTimeTick(this.timeLeft);
      if (this.timeLeft <= 5 && this.timeLeft > 0) {
        this.playSound('tick');
      }
    }

    if (this.timeLeft <= 0) {
      this.gameOver('time_up');
      return;
    }

    // 1. Управление маскотом
    if (this.keys.left) {
      this.mascot.targetX -= this.mascot.speed;
    }
    if (this.keys.right) {
      this.mascot.targetX += this.mascot.speed;
    }

    this.mascot.targetX = Math.max(
      this.mascot.width / 2,
      Math.min(this.width - this.mascot.width / 2, this.mascot.targetX)
    );

    // Плавное следование (Lerp) к целевой координате
    const dx = this.mascot.targetX - this.mascot.x;
    this.mascot.x += dx * 0.22;
    this.mascot.tilt = Math.max(-0.25, Math.min(0.25, dx * 0.02));

    // Анимация моргания глаз Moby
    this.mascot.blinkTimer += dt;
    if (this.mascot.blinkTimer > 3.2) {
      this.mascot.isBlinking = true;
      if (this.mascot.blinkTimer > 3.4) {
        this.mascot.isBlinking = false;
        this.mascot.blinkTimer = 0;
      }
    }

    // 2. Спавн падающих объектов
    // Обычные золотые монетки MT Orange (каждые 0.75 сек)
    this.coinSpawnTimer += dt;
    if (this.coinSpawnTimer > 0.75) {
      this.coinSpawnTimer = 0;
      this.spawnObject('coin');
    }

    // Препятствия MT Red (каждые 1.6 - 2.0 сек, скорость растет со счетом)
    this.hazardSpawnTimer += dt;
    const hazardInterval = Math.max(1.1, 2.0 - (this.score / 600));
    if (this.hazardSpawnTimer > hazardInterval) {
      this.hazardSpawnTimer = 0;
      this.spawnObject('hazard');
    }

    // Редкие бонусы (каждые 7.5 - 9.5 секунд)
    this.bonusSpawnTimer += dt;
    if (this.bonusSpawnTimer > 8.0) {
      this.bonusSpawnTimer = 0;
      const bonusTypes = ['bonus_5050', 'bonus_life', 'bonus_hint'];
      const chosenType = bonusTypes[Math.floor(Math.random() * bonusTypes.length)];
      this.spawnObject(chosenType);
    }

    // 3. Обновление падающих объектов и коллизий
    const speedFactor = 1 + Math.min(this.score / 500, 1.6);

    for (let i = this.fallingObjects.length - 1; i >= 0; i--) {
      const obj = this.fallingObjects[i];
      obj.y += obj.speed * speedFactor * dt * 60;
      obj.rotation += obj.rotSpeed * dt * 60;

      // Проверка столкновения с Маскотом Moby
      if (this.checkCollision(this.mascot, obj)) {
        this.handleCatch(obj);
        this.fallingObjects.splice(i, 1);
        continue;
      }

      // Удаление за пределами экрана
      if (obj.y > this.height + 40) {
        this.fallingObjects.splice(i, 1);
      }
    }

    // 4. Обновление частиц
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= p.fade;
      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // 5. Всплывающий текст (+10, +50/50 и т.д.)
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y -= 1.4;
      ft.alpha -= 0.025;
      if (ft.alpha <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }

    // 6. Тряска экрана и вспышка урона
    if (this.shakeDuration > 0) {
      this.shakeDuration -= dt * 60;
    }
    if (this.flashRedAlpha > 0) {
      this.flashRedAlpha = Math.max(0, this.flashRedAlpha - dt * 2.5);
    }
  }

  // Спавн объекта с уникальными свойствами
  spawnObject(type) {
    const margin = 35;
    const x = margin + Math.random() * (this.width - margin * 2);
    let speed = 2.4;
    let radius = 17;

    if (type === 'coin') {
      speed = 2.5 + Math.random() * 0.8;
      radius = 16;
    } else if (type === 'hazard') {
      speed = 2.8 + Math.random() * 1.1;
      radius = 18;
    } else {
      speed = 2.0 + Math.random() * 0.5;
      radius = 19;
    }

    this.fallingObjects.push({
      type,
      x,
      y: -25,
      radius,
      speed,
      rotation: 0,
      rotSpeed: (Math.random() - 0.5) * 0.08
    });
  }

  // Определение столкновения
  checkCollision(mascot, obj) {
    const catcherTop = mascot.y - 20;
    const catcherBottom = mascot.y + 25;
    const catcherLeft = mascot.x - mascot.width / 2 + 5;
    const catcherRight = mascot.x + mascot.width / 2 - 5;

    return (
      obj.x + obj.radius > catcherLeft &&
      obj.x - obj.radius < catcherRight &&
      obj.y + obj.radius > catcherTop &&
      obj.y - obj.radius < catcherBottom
    );
  }

  // Обработка ловли объекта
  handleCatch(obj) {
    if (obj.type === 'coin') {
      this.score += 10;
      this.coinsCollected += 1;
      this.sessionRewards.coins += 1;
      this.sessionRewards.score = this.score;

      this.playSound('coin');
      this.addScoreText('+10', obj.x, obj.y, this.COLORS.mtOrange);
      this.spawnParticles(obj.x, obj.y, this.COLORS.mtOrange, 10);
      this.options.onScoreUpdate(this.score, this.coinsCollected);
    } else if (obj.type === 'hazard') {
      this.lives = Math.max(0, this.lives - 1);
      this.playSound('hit');
      this.shakeDuration = 12;
      this.flashRedAlpha = 0.35;
      this.addScoreText('-1 ❤️', obj.x, obj.y, this.COLORS.mtRed);
      this.spawnParticles(obj.x, obj.y, this.COLORS.mtRed, 14);
      this.options.onLifeLost(this.lives);

      if (this.lives <= 0) {
        this.gameOver('lives_lost');
      }
    } else if (obj.type === 'bonus_5050') {
      this.score += 25;
      this.sessionRewards.hint_5050 += 1;
      this.playSound('bonus');
      this.addScoreText('+50/50', obj.x, obj.y, this.COLORS.mtBlue);
      this.spawnParticles(obj.x, obj.y, this.COLORS.mtBlue, 14);
      this.options.onHintEarned('hint_5050', this.sessionRewards.hint_5050);
      this.options.onScoreUpdate(this.score, this.coinsCollected);
    } else if (obj.type === 'bonus_life') {
      this.score += 20;
      if (this.lives < this.maxLives) {
        this.lives += 1;
      }
      this.sessionRewards.extra_lives += 1;
      this.playSound('bonus');
      this.addScoreText('+1 Жизнь', obj.x, obj.y, this.COLORS.mtRed);
      this.spawnParticles(obj.x, obj.y, this.COLORS.mtRed, 14);
      this.options.onHintEarned('extra_lives', this.sessionRewards.extra_lives);
      this.options.onScoreUpdate(this.score, this.coinsCollected);
    } else if (obj.type === 'bonus_hint') {
      this.score += 25;
      this.sessionRewards.text_hints += 1;
      this.playSound('bonus');
      this.addScoreText('+Совет', obj.x, obj.y, this.COLORS.mtOrange);
      this.spawnParticles(obj.x, obj.y, this.COLORS.mtOrange, 14);
      this.options.onHintEarned('text_hints', this.sessionRewards.text_hints);
      this.options.onScoreUpdate(this.score, this.coinsCollected);
    }
  }

  // Завершение сессии и отправка наград на бэкенд
  async gameOver(reason = 'lives_lost') {
    this.isRunning = false;
    this.playSound(reason === 'time_up' ? 'bonus' : 'gameover');
    cancelAnimationFrame(this.animFrameId);

    this.render();

    let updatedInventory = null;
    try {
      updatedInventory = await this.syncRewards();
    } catch (err) {
      console.error('Ошибка синхронизации наград в SQLite:', err);
    }

    this.options.onGameOver({
      reason,
      score: this.score,
      coins: this.sessionRewards.coins,
      hint_5050: this.sessionRewards.hint_5050,
      extra_lives: this.sessionRewards.extra_lives,
      text_hints: this.sessionRewards.text_hints,
      inventory: updatedInventory
    });
  }

  // Синхронизация наград с сервером SQLite
  async syncRewards() {
    const payload = {
      childId: this.options.childId,
      coins: this.sessionRewards.coins,
      hint_5050: this.sessionRewards.hint_5050,
      extra_lives: this.sessionRewards.extra_lives,
      text_hints: this.sessionRewards.text_hints,
      score: this.score
    };

    const response = await fetch(`${this.options.apiBase}/api/game/sync-rewards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }

    const data = await response.json();
    return data.inventory;
  }

  addScoreText(text, x, y, color) {
    this.floatingTexts.push({
      text,
      x,
      y,
      color,
      alpha: 1.0
    });
  }

  spawnParticles(x, y, color, count = 10) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.2 + Math.random() * 3.5;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        size: 3 + Math.random() * 3,
        alpha: 1.0,
        fade: 0.025 + Math.random() * 0.03
      });
    }
  }

  // --- Отрисовка (Canvas Rendering) ---
  render() {
    this.ctx.save();

    if (this.shakeDuration > 0) {
      const offsetX = (Math.random() - 0.5) * 8;
      const offsetY = (Math.random() - 0.5) * 8;
      this.ctx.translate(offsetX, offsetY);
    }

    // 1. Фон игрового поля по брендбуку
    this.drawBackground();

    // 2. Падающие объекты
    for (const obj of this.fallingObjects) {
      this.drawFallingObject(obj);
    }

    // 3. Частицы
    for (const p of this.particles) {
      this.ctx.save();
      this.ctx.globalAlpha = Math.max(0, p.alpha);
      this.ctx.fillStyle = p.color;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }

    // 4. Маскот Moby
    this.drawMascot();

    // 5. Всплывающий текст
    for (const ft of this.floatingTexts) {
      this.ctx.save();
      this.ctx.globalAlpha = Math.max(0, ft.alpha);
      this.ctx.fillStyle = ft.color;
      this.ctx.font = 'bold 16px "TikTok Sans", Inter, sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.shadowColor = 'rgba(20, 20, 22, 0.15)';
      this.ctx.shadowBlur = 4;
      this.ctx.fillText(ft.text, ft.x, ft.y);
      this.ctx.restore();
    }

    // 6. Верхний HUD (Статус-панель)
    this.drawHUD();

    // 7. Вспышка урона MT Red
    if (this.flashRedAlpha > 0) {
      this.ctx.fillStyle = `rgba(228, 44, 38, ${this.flashRedAlpha})`;
      this.ctx.fillRect(0, 0, this.width, this.height);
    }

    this.ctx.restore();
  }

  // Фон: градиент от #FFFFFF к #E7F4FF (MT Cloud Blue) с тонкими кругами #97CFFF (MT Sky Blue)
  drawBackground() {
    const bgGrad = this.ctx.createLinearGradient(0, 0, 0, this.height);
    bgGrad.addColorStop(0, '#FFFFFF');
    bgGrad.addColorStop(1, '#E7F4FF');
    this.ctx.fillStyle = bgGrad;
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Тонкие концентрические кольца MT Sky Blue (#97CFFF) с низкой прозрачностью
    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(151, 207, 255, 0.28)';
    this.ctx.lineWidth = 1.5;

    for (let r = 70; r <= 350; r += 70) {
      this.ctx.beginPath();
      this.ctx.arc(this.width / 2, this.height * 0.45, r, 0, Math.PI * 2);
      this.ctx.stroke();
    }

    // Линия пола
    this.ctx.fillStyle = 'rgba(35, 52, 200, 0.05)';
    this.ctx.fillRect(0, this.height - 24, this.width, 24);
    this.ctx.restore();
  }

  // Отрисовка фирменного маскота-лисы Фокси (Fox Mascot 2D)
  drawMascot() {
    const { x, y, tilt, isBlinking } = this.mascot;
    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.rotate(tilt);

    // 1. Тень под лисой
    this.ctx.fillStyle = 'rgba(255, 89, 18, 0.15)';
    this.ctx.beginPath();
    this.ctx.ellipse(0, 30, 34, 8, 0, 0, Math.PI * 2);
    this.ctx.fill();

    // 2. Пышный лисий хвост с белым кончиком (справа сзади)
    this.ctx.save();
    this.ctx.translate(18, 14);
    this.ctx.rotate(0.25 - tilt * 0.8);
    // Основная оранжевая часть хвоста
    this.ctx.fillStyle = '#FF5912';
    this.ctx.beginPath();
    this.ctx.ellipse(14, -6, 18, 10, -0.35, 0, Math.PI * 2);
    this.ctx.fill();
    // Белый кончик хвоста
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.beginPath();
    this.ctx.ellipse(26, -11, 7, 5, -0.35, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();

    // 3. Тело лисы
    this.ctx.fillStyle = '#FF5912';
    this.ctx.beginPath();
    this.ctx.ellipse(0, 16, 22, 16, 0, 0, Math.PI * 2);
    this.ctx.fill();

    // Белая манишка / грудка
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.beginPath();
    this.ctx.ellipse(0, 17, 13, 11, 0, 0, Math.PI * 2);
    this.ctx.fill();

    // Фирменный галстучек MT Blue (#2334C8) с золотистой монеткой МТБанка
    this.ctx.fillStyle = this.COLORS.mtBlue;
    this.ctx.beginPath();
    this.ctx.moveTo(-6, 8);
    this.ctx.lineTo(6, 8);
    this.ctx.lineTo(0, 16);
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.fillStyle = '#FFD700';
    this.ctx.beginPath();
    this.ctx.arc(0, 9, 2.5, 0, Math.PI * 2);
    this.ctx.fill();

    // 4. Острые лисьи ушки
    // Левое ушко
    this.ctx.fillStyle = '#FF5912';
    this.ctx.beginPath();
    this.ctx.moveTo(-22, -10);
    this.ctx.lineTo(-26, -32);
    this.ctx.lineTo(-8, -18);
    this.ctx.closePath();
    this.ctx.fill();
    // Внутренняя розовая часть левого ушка
    this.ctx.fillStyle = '#FFE5D9';
    this.ctx.beginPath();
    this.ctx.moveTo(-20, -12);
    this.ctx.lineTo(-24, -28);
    this.ctx.lineTo(-11, -18);
    this.ctx.closePath();
    this.ctx.fill();
    // Темный кончик ушка
    this.ctx.fillStyle = '#141416';
    this.ctx.beginPath();
    this.ctx.moveTo(-24, -26);
    this.ctx.lineTo(-26, -32);
    this.ctx.lineTo(-21, -29);
    this.ctx.closePath();
    this.ctx.fill();

    // Правое ушко
    this.ctx.fillStyle = '#FF5912';
    this.ctx.beginPath();
    this.ctx.moveTo(22, -10);
    this.ctx.lineTo(26, -32);
    this.ctx.lineTo(8, -18);
    this.ctx.closePath();
    this.ctx.fill();
    // Внутренняя часть правого ушка
    this.ctx.fillStyle = '#FFE5D9';
    this.ctx.beginPath();
    this.ctx.moveTo(20, -12);
    this.ctx.lineTo(24, -28);
    this.ctx.lineTo(11, -18);
    this.ctx.closePath();
    this.ctx.fill();
    // Темный кончик правого ушка
    this.ctx.fillStyle = '#141416';
    this.ctx.beginPath();
    this.ctx.moveTo(24, -26);
    this.ctx.lineTo(26, -32);
    this.ctx.lineTo(21, -29);
    this.ctx.closePath();
    this.ctx.fill();

    // 5. Голова лисы (пушистая мордочка)
    this.ctx.fillStyle = '#FF5912';
    this.ctx.beginPath();
    this.ctx.ellipse(0, -6, 26, 21, 0, 0, Math.PI * 2);
    this.ctx.fill();

    // Пушистые щечки (выступы по бокам)
    this.ctx.beginPath();
    this.ctx.moveTo(-25, -4);
    this.ctx.lineTo(-32, -1);
    this.ctx.lineTo(-24, 6);
    this.ctx.lineTo(-28, 8);
    this.ctx.lineTo(-18, 12);
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.beginPath();
    this.ctx.moveTo(25, -4);
    this.ctx.lineTo(32, -1);
    this.ctx.lineTo(24, 6);
    this.ctx.lineTo(28, 8);
    this.ctx.lineTo(18, 12);
    this.ctx.closePath();
    this.ctx.fill();

    // 6. Белая маска / щечки мордочки
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.beginPath();
    this.ctx.moveTo(-24, -1);
    this.ctx.quadraticCurveTo(-14, 6, 0, 6);
    this.ctx.quadraticCurveTo(14, 6, 24, -1);
    this.ctx.quadraticCurveTo(28, 8, 16, 13);
    this.ctx.quadraticCurveTo(0, 16, -16, 13);
    this.ctx.quadraticCurveTo(-28, 8, -24, -1);
    this.ctx.closePath();
    this.ctx.fill();

    // 7. Глазки Фокси
    if (isBlinking) {
      this.ctx.strokeStyle = '#141416';
      this.ctx.lineWidth = 2.4;
      this.ctx.lineCap = 'round';
      // Левый закрытый глазик (дуга улыбки)
      this.ctx.beginPath();
      this.ctx.arc(-11, -8, 5, 0.9 * Math.PI, 0.1 * Math.PI, true);
      this.ctx.stroke();
      // Правый закрытый глазик
      this.ctx.beginPath();
      this.ctx.arc(11, -8, 5, 0.9 * Math.PI, 0.1 * Math.PI, true);
      this.ctx.stroke();
    } else {
      // Левый глазик (большой выразительный)
      this.ctx.fillStyle = '#141416';
      this.ctx.beginPath();
      this.ctx.ellipse(-11, -8, 4.2, 5.5, 0, 0, Math.PI * 2);
      this.ctx.fill();
      // Искорка / блик
      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.beginPath();
      this.ctx.arc(-9.8, -9.8, 1.8, 0, Math.PI * 2);
      this.ctx.arc(-12.2, -6.5, 0.8, 0, Math.PI * 2);
      this.ctx.fill();

      // Правый глазик
      this.ctx.fillStyle = '#141416';
      this.ctx.beginPath();
      this.ctx.ellipse(11, -8, 4.2, 5.5, 0, 0, Math.PI * 2);
      this.ctx.fill();
      // Искорка / блик
      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.beginPath();
      this.ctx.arc(12.2, -9.8, 1.8, 0, Math.PI * 2);
      this.ctx.arc(9.8, -6.5, 0.8, 0, Math.PI * 2);
      this.ctx.fill();
    }

    // 8. Носик и милая улыбка
    this.ctx.fillStyle = '#141416';
    this.ctx.beginPath();
    this.ctx.ellipse(0, 1, 3.2, 2.2, 0, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.strokeStyle = '#141416';
    this.ctx.lineWidth = 1.6;
    this.ctx.lineCap = 'round';
    this.ctx.beginPath();
    this.ctx.moveTo(0, 3);
    this.ctx.lineTo(0, 5);
    this.ctx.moveTo(-3.5, 6);
    this.ctx.quadraticCurveTo(0, 8.5, 3.5, 6);
    this.ctx.stroke();

    // 9. Передние лапки с ловящей чашей энергии
    // Левая лапка
    this.ctx.fillStyle = '#FF5912';
    this.ctx.beginPath();
    this.ctx.ellipse(-18, 15, 6, 8, 0.4, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.beginPath();
    this.ctx.ellipse(-19, 12, 4, 4, 0, 0, Math.PI * 2);
    this.ctx.fill();

    // Правая лапка
    this.ctx.fillStyle = '#FF5912';
    this.ctx.beginPath();
    this.ctx.ellipse(18, 15, 6, 8, -0.4, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.beginPath();
    this.ctx.ellipse(19, 12, 4, 4, 0, 0, Math.PI * 2);
    this.ctx.fill();

    // Ловящая чаша энергии МТБанка («Лучи энергии»)
    this.ctx.strokeStyle = this.COLORS.mtOrange;
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.arc(0, -2, 34, 0.25 * Math.PI, 0.75 * Math.PI);
    this.ctx.stroke();

    this.ctx.strokeStyle = this.COLORS.mtRed;
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(0, 2, 36, 0.3 * Math.PI, 0.7 * Math.PI);
    this.ctx.stroke();

    this.ctx.restore();
  }

  // Отрисовка падающего объекта строго по палитре
  drawFallingObject(obj) {
    this.ctx.save();
    this.ctx.translate(obj.x, obj.y);
    this.ctx.rotate(obj.rotation);

    if (obj.type === 'coin') {
      // Монета MT Orange (#FF5912) с белой буквой «М»
      this.ctx.fillStyle = this.COLORS.mtOrange;
      this.ctx.beginPath();
      this.ctx.arc(0, 0, obj.radius, 0, Math.PI * 2);
      this.ctx.fill();

      // Тонкий внутренний ободок
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      this.ctx.lineWidth = 1.5;
      this.ctx.beginPath();
      this.ctx.arc(0, 0, obj.radius - 3, 0, Math.PI * 2);
      this.ctx.stroke();

      // Белая буква «М»
      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.font = 'bold 15px "TikTok Sans", Inter, sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText('M', 0, 1);

    } else if (obj.type === 'hazard') {
      // Препятствие строго в цвете MT Red (#E42C26)
      this.ctx.fillStyle = this.COLORS.mtRed;
      this.ctx.beginPath();
      const spikes = 6;
      for (let s = 0; s < spikes * 2; s++) {
        const r = (s % 2 === 0) ? obj.radius : obj.radius * 0.55;
        const angle = (s * Math.PI) / spikes;
        const sx = Math.cos(angle) * r;
        const sy = Math.sin(angle) * r;
        if (s === 0) this.ctx.moveTo(sx, sy);
        else this.ctx.lineTo(sx, sy);
      }
      this.ctx.closePath();
      this.ctx.fill();

      // Белый восклицательный знак
      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.font = 'bold 15px "TikTok Sans", Inter, sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText('!', 0, 1);

    } else if (obj.type === 'bonus_5050') {
      // Бонус 50/50: плашка MT Blue (#2334C8) с белой надписью
      this.ctx.fillStyle = this.COLORS.mtBlue;
      this.ctx.beginPath();
      this.ctx.arc(0, 0, obj.radius, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.strokeStyle = '#FFFFFF';
      this.ctx.lineWidth = 1.5;
      this.ctx.stroke();

      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.font = 'bold 11px "TikTok Sans", Inter, sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText('50/50', 0, 1);

    } else if (obj.type === 'bonus_life') {
      // Сердечко строго в цвете MT Red (#E42C26)
      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.beginPath();
      this.ctx.arc(0, 0, obj.radius, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.strokeStyle = this.COLORS.mtRed;
      this.ctx.lineWidth = 2;
      this.ctx.stroke();

      // Рисуем векторное сердце
      this.drawHeartIcon(0, -1, 14, this.COLORS.mtRed);

    } else if (obj.type === 'bonus_hint') {
      // Бонус Совет: основа MT Orange (#FF5912) с ободком MT Red
      this.ctx.fillStyle = this.COLORS.mtOrange;
      this.ctx.beginPath();
      this.ctx.arc(0, 0, obj.radius, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.strokeStyle = this.COLORS.mtRed;
      this.ctx.lineWidth = 2;
      this.ctx.stroke();

      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.font = 'bold 12px "TikTok Sans", Inter, sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText('💡', 0, 1);
    }

    this.ctx.restore();
  }

  // Отрисовка векторного сердца в координатах
  drawHeartIcon(cx, cy, size, color) {
    this.ctx.save();
    this.ctx.translate(cx, cy);
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    const topCurveHeight = size * 0.3;
    this.ctx.moveTo(0, topCurveHeight);
    this.ctx.bezierCurveTo(0, 0, -size / 2, 0, -size / 2, topCurveHeight);
    this.ctx.bezierCurveTo(-size / 2, (size + topCurveHeight) / 2, 0, (size + topCurveHeight) / 2, 0, size);
    this.ctx.bezierCurveTo(0, (size + topCurveHeight) / 2, size / 2, (size + topCurveHeight) / 2, size / 2, topCurveHeight);
    this.ctx.bezierCurveTo(size / 2, 0, 0, 0, 0, topCurveHeight);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.restore();
  }

  // Верхняя статус-панель игры (HUD)
  drawHUD() {
    this.ctx.save();

    // Плашка с глассморфизмом
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.96)';
    this.ctx.shadowColor = 'rgba(35, 52, 200, 0.08)';
    this.ctx.shadowBlur = 12;
    this.ctx.beginPath();
    this.ctx.roundRect(14, 12, this.width - 28, 48, 14);
    this.ctx.fill();
    this.ctx.shadowBlur = 0;

    this.ctx.strokeStyle = 'rgba(151, 207, 255, 0.45)';
    this.ctx.lineWidth = 1;
    this.ctx.stroke();

    // 1. Монеты строго в цвете MT Orange (#FF5912)
    this.ctx.fillStyle = this.COLORS.mtOrange;
    this.ctx.beginPath();
    this.ctx.arc(32, 36, 9, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.font = 'bold 10px "TikTok Sans", Inter, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('M', 32, 36.5);

    // Текст очков монет
    this.ctx.fillStyle = this.COLORS.mtOrange;
    this.ctx.font = 'bold 15px "TikTok Sans", Inter, sans-serif';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(`${this.score}`, 46, 36.5);

    // 2. Жизни: сердечки строго в цвете MT Red (#E42C26)
    const heartSpacing = 16;
    const startX = 98;

    for (let i = 0; i < this.maxLives; i++) {
      const hx = startX + i * heartSpacing;
      if (i < this.lives) {
        this.drawHeartIcon(hx, 30, 11, this.COLORS.mtRed);
      } else {
        // Потерянная жизнь: контур
        this.ctx.save();
        this.ctx.strokeStyle = this.COLORS.grayInactive;
        this.ctx.lineWidth = 1.6;
        this.ctx.translate(hx, 30);
        this.ctx.beginPath();
        const s = 11;
        const tch = s * 0.3;
        this.ctx.moveTo(0, tch);
        this.ctx.bezierCurveTo(0, 0, -s / 2, 0, -s / 2, tch);
        this.ctx.bezierCurveTo(-s / 2, (s + tch) / 2, 0, (s + tch) / 2, 0, s);
        this.ctx.bezierCurveTo(0, (s + tch) / 2, s / 2, (s + tch) / 2, s / 2, tch);
        this.ctx.bezierCurveTo(s / 2, 0, 0, 0, 0, tch);
        this.ctx.closePath();
        this.ctx.stroke();
        this.ctx.restore();
      }
    }

    // 3. Таймер: Ограничение времени (около 1 минуты = 60 сек)
    const isUrgent = this.timeLeft <= 10;
    const minutes = Math.floor(this.timeLeft / 60);
    const seconds = Math.floor(this.timeLeft % 60);
    const timeFormatted = `${minutes}:${String(seconds).padStart(2, '0')}`;

    // Бейдж таймера
    const timerX = 158;
    const timerW = 76;
    this.ctx.fillStyle = isUrgent ? '#FFF0F0' : 'rgba(35, 52, 200, 0.08)';
    this.ctx.strokeStyle = isUrgent ? this.COLORS.mtRed : 'rgba(35, 52, 200, 0.2)';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.roundRect(timerX, 23, timerW, 26, 7);
    this.ctx.fill();
    this.ctx.stroke();

    // Иконка секундомера
    this.ctx.fillStyle = isUrgent ? this.COLORS.mtRed : this.COLORS.mtBlue;
    this.ctx.font = 'bold 11px Inter, sans-serif';
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('⏱', timerX + 7, 36.5);

    // Текст времени
    this.ctx.font = 'bold 13px "TikTok Sans", Inter, sans-serif';
    this.ctx.fillText(timeFormatted, timerX + 24, 36.5);

    // 4. Бонусы: подарок с акцентом MT Blue
    const totalBonuses = this.sessionRewards.hint_5050 + this.sessionRewards.extra_lives + this.sessionRewards.text_hints;
    this.ctx.fillStyle = this.COLORS.mtBlue;
    this.ctx.font = 'bold 12px "TikTok Sans", Inter, sans-serif';
    this.ctx.textAlign = 'right';
    this.ctx.fillText(`+${totalBonuses} 🎁`, this.width - 24, 36.5);

    // 5. Прогресс-полоска таймера внизу плашки HUD
    const progress = Math.max(0, Math.min(1, this.timeLeft / this.duration));
    const barW = (this.width - 28) * progress;
    this.ctx.fillStyle = isUrgent ? this.COLORS.mtRed : this.COLORS.mtOrange;
    this.ctx.beginPath();
    this.ctx.roundRect(14, 57, barW, 3, [0, 0, 3, 3]);
    this.ctx.fill();

    this.ctx.restore();
  }

  // Оверлей паузы
  drawPausedOverlay() {
    this.ctx.save();
    this.ctx.fillStyle = 'rgba(20, 20, 22, 0.7)';
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.font = 'bold 22px "TikTok Sans", Inter, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('ИГРА НА ПАУЗЕ', this.width / 2, this.height / 2 - 12);

    this.ctx.font = '13px Inter, sans-serif';
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    this.ctx.fillText('Нажмите «Продолжить», чтобы играть', this.width / 2, this.height / 2 + 18);
    this.ctx.restore();
  }

  destroy() {
    this.isRunning = false;
    cancelAnimationFrame(this.animFrameId);
    window.removeEventListener('keydown', this._handleKeyDown);
    window.removeEventListener('keyup', this._handleKeyUp);
    this.canvas.removeEventListener('mousemove', this._handleMouseMove);
    this.canvas.removeEventListener('touchmove', this._handleTouchMove);
    this.canvas.removeEventListener('touchstart', this._handleTouchMove);
  }
}
