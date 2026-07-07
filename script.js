// ---------- Balloon Blast game logic ----------

const playfield   = document.getElementById('playfield');
const scoreEl      = document.getElementById('score');
const bombsEl      = document.getElementById('bombs');
const bestEl       = document.getElementById('best');
const startScreen  = document.getElementById('startScreen');
const endScreen    = document.getElementById('endScreen');
const startBtn     = document.getElementById('startBtn');
const restartBtn   = document.getElementById('restartBtn');
const finalScoreEl = document.getElementById('finalScore');
const endTitleEl   = document.getElementById('endTitle');

const MAX_BOMBS       = 5;
const BOMB_CHANCE     = 0.15;
const RAMP_START      = 40000;
const RAMP_STEP       = 5000;
const RAMP_SPAWN_CUT  = 0.92;
const RAMP_SPEED_CUT  = 0.93;
const MIN_SPAWN_MS    = 220;
const MIN_RISE_S      = 2.2;

const COLORS = ['#ff6b6b', '#ffd93d', '#4ecdc4', '#a29bfe', '#ff9ff3', '#54a0ff'];

let score = 0;
let bombsPopped = 0;
let gameRunning = false;
let gameStartTime = 0;

let spawnIntervalMs = 650;
let riseDurationRange = [5.5, 9];

let spawnTimeoutId = null;
let rampIntervalId = null;

const best = Number(localStorage.getItem('balloonBlastBest') || 0);
bestEl.textContent = best;

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function pickColor() {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

function scheduleNextSpawn() {
  spawnTimeoutId = setTimeout(() => {
    if (gameRunning) {
      spawnBalloon();
      scheduleNextSpawn();
    }
  }, spawnIntervalMs);
}

function rampDifficulty() {
  if (!gameRunning) return;
  spawnIntervalMs = Math.max(MIN_SPAWN_MS, spawnIntervalMs * RAMP_SPAWN_CUT);
  riseDurationRange = [
    Math.max(MIN_RISE_S, riseDurationRange[0] * RAMP_SPEED_CUT),
    Math.max(MIN_RISE_S + 1, riseDurationRange[1] * RAMP_SPEED_CUT)
  ];
}

function spawnBalloon() {
  const balloon = document.createElement('div');
  balloon.className = 'balloon';

  const isBomb = Math.random() < BOMB_CHANCE;
  if (isBomb) balloon.classList.add('bomb');

  const size = randomBetween(0.85, 1.25);
  const duration = randomBetween(riseDurationRange[0], riseDurationRange[1]);
  const startX = randomBetween(4, 92);
  const drift = randomBetween(-40, 40);

  balloon.style.left = `${startX}vw`;
  balloon.style.transform = `scale(${size})`;
  balloon.style.setProperty('--drift', `${drift}px`);
  balloon.style.animationDuration = `${duration}s`;

  const color = pickColor();

  balloon.innerHTML = `
    <div class="string"></div>
    <div class="knot" style="background:${color}"></div>
    <div class="body" style="background:${color}; border-color:${color};"></div>
  `;
  const body = balloon.querySelector('.body');
  body.style.setProperty('border-top-color', color);

  balloon.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    popBalloon(balloon, isBomb);
  });

  balloon.addEventListener('animationend', (e) => {
    if (e.animationName === 'rise' && balloon.parentNode) {
      balloon.remove();
    }
  });

  playfield.appendChild(balloon);
}

function spawnConfetti(x, y, color) {
  for (let i = 0; i < 10; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.left = `${x}px`;
    piece.style.top = `${y}px`;
    piece.style.background = color;
    const angle = randomBetween(0, Math.PI * 2);
    const distance = randomBetween(30, 70);
    piece.style.setProperty('--tx', `${Math.cos(angle) * distance}px`);
    piece.style.setProperty('--ty', `${Math.sin(angle) * distance}px`);
    piece.style.setProperty('--tr', `${randomBetween(0, 360)}deg`);
    playfield.appendChild(piece);
    setTimeout(() => piece.remove(), 650);
  }
}

function showPopLabel(x, y, text, color) {
  const label = document.createElement('div');
  label.className = 'pop-label';
  label.textContent = text;
  label.style.left = `${x}px`;
  label.style.top = `${y}px`;
  label.style.color = color;
  playfield.appendChild(label);
  setTimeout(() => label.remove(), 700);
}

function popBalloon(balloon, isBomb) {
  if (!gameRunning || balloon.classList.contains('pop')) return;

  const rect = balloon.getBoundingClientRect();
  const fieldRect = playfield.getBoundingClientRect();
  const x = rect.left - fieldRect.left + rect.width / 2;
  const y = rect.top - fieldRect.top + rect.height / 2;

  balloon.classList.add('pop');

  if (isBomb) {
    bombsPopped += 1;
    bombsEl.textContent = `${bombsPopped}/${MAX_BOMBS}`;
    showPopLabel(x, y, '💥', '#e63946');
  } else {
    score += 1;
    scoreEl.textContent = score;
    showPopLabel(x, y, '+1', '#2b9348');
    const color = getComputedStyle(balloon.querySelector('.body')).backgroundColor;
    spawnConfetti(x, y, color);
  }

  setTimeout(() => balloon.remove(), 200);

  if (bombsPopped >= MAX_BOMBS) {
    endGame();
  }
}

function startGame() {
  score = 0;
  bombsPopped = 0;
  spawnIntervalMs = 650;
  riseDurationRange = [5.5, 9];
  gameStartTime = Date.now();
  gameRunning = true;

  scoreEl.textContent = score;
  bombsEl.textContent = `${bombsPopped}/${MAX_BOMBS}`;

  startScreen.classList.add('hidden');
  endScreen.classList.add('hidden');
  playfield.innerHTML = '';

  scheduleNextSpawn();

  clearInterval(rampIntervalId);
  rampIntervalId = setInterval(() => {
    if (!gameRunning) return;
    const elapsed = Date.now() - gameStartTime;
    if (elapsed >= RAMP_START) rampDifficulty();
  }, RAMP_STEP);
}

function endGame() {
  gameRunning = false;
  clearTimeout(spawnTimeoutId);
  clearInterval(rampIntervalId);

  if (score > best) {
    localStorage.setItem('balloonBlastBest', score);
    bestEl.textContent = score;
  }

  endTitleEl.textContent = 'Boom! Game Over';
  finalScoreEl.textContent = score;
  endScreen.classList.remove('hidden');

  setTimeout(() => { playfield.innerHTML = ''; }, 300);
}

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);
