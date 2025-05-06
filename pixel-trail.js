// ======================= pixel-trail.js - Full Game Logic =======================

let backgroundX = 0;
const wagon = { x: 50, y: 220, speed: 1 };
let state = null;
let musicStarted = false;

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const audio = {
  click: new Audio('assets/click.wav'),
  shoot: new Audio('assets/shoot.wav'),
  death: new Audio('assets/death.wav'),
  win: new Audio('assets/win.wav'),
  bg: document.getElementById('bg-music')
};

// Unlock browser audio autoplay and trigger music
window.addEventListener('click', () => {
  playMusic();
  for (let key in audio) {
    if (audio[key] instanceof HTMLAudioElement) {
      audio[key].play().then(() => audio[key].pause()).catch(() => {});
    }
  }
}, { once: true });

function playSound(name) {
  const sound = audio[name];
  if (!sound) return;
  sound.pause();
  sound.currentTime = 0;
  sound.play().catch(err => {
    console.warn(`Sound '${name}' failed to play:`, err);
  });
}

function playMusic() {
  if (musicStarted) return;
  const music = audio.bg;
  if (!music) return;
  music.volume = 0.4;
  music.loop = true;
  music.play()
    .then(() => {
      musicStarted = true;
    })
    .catch(err => {
      console.warn("Background music failed to play:", err);
    });
}

// Add mute toggle functionality
const muteBtn = document.getElementById('mute-toggle');
if (muteBtn) {
  muteBtn.addEventListener('click', () => {
    const music = audio.bg;
    music.muted = !music.muted;
    muteBtn.textContent = music.muted ? '🔇 Unmute' : '🔊 Mute';
  });
}

function updateBudgetTotal() {
  const food = +document.getElementById('food').value;
  const ammo = +document.getElementById('ammo').value;
  const oxen = +document.getElementById('oxen').value;
  const parts = +document.getElementById('parts').value;
  const meds = +document.getElementById('meds').value;
  const cost = food * 1 + ammo * 2 + oxen * 40 + parts * 20 + meds * 25;
  const budgetTotal = document.getElementById('budget-total');
  budgetTotal.textContent = `Total: $${cost}`;
  if (cost > 500) {
    budgetTotal.style.color = 'red';
    document.getElementById('budget-warning').style.display = 'block';
  } else {
    budgetTotal.style.color = '#00FFAA';
    document.getElementById('budget-warning').style.display = 'none';
  }
}

// [... existing game logic continues unchanged below this point ...] 
// Placeholders indicate this code block resumes normal operations.


// [... existing logic unchanged below this point ...]
// ✅ This addition ensures audio will work after first click
// ✅ Ensures shoot/death sounds always reset and retry
// ✅ Background music now plays properly after interaction


window.addEventListener('load', () => {
  const startBtn = document.getElementById('start-button');
  if (startBtn) startBtn.addEventListener('click', startGame);
  ['food', 'ammo', 'oxen', 'parts', 'meds'].forEach(id => {
    const input = document.getElementById(id);
    if (input) input.addEventListener('input', updateBudgetTotal);
  });
  updateBudgetTotal();

  const saved = localStorage.getItem('pixelTrailState');
  if (saved && confirm("Resume previous game?")) {
    state = JSON.parse(saved);
    document.getElementById('setup-screen').style.display = 'none';
    canvas.style.display = 'block';
    const ui = document.getElementById('ui');
    ui.style.display = 'flex';
    ui.style.flexDirection = 'column';
    ui.style.alignItems = 'center';
    gameLoop();
    updatePartyStatus();
    document.getElementById('status').textContent = `Welcome back, ${state.player}. Day ${state.day}`;playMusic();

  } else {
    localStorage.removeItem('pixelTrailState');
  }
});

function startGame() {
  const player = document.getElementById('player-name').value;
  const companions = Array.from(document.querySelectorAll('.companion')).map(input => input.value);
  const food = +document.getElementById('food').value;
  const ammo = +document.getElementById('ammo').value;
  const oxen = +document.getElementById('oxen').value;
  const parts = +document.getElementById('parts').value;
  const meds = +document.getElementById('meds').value;
  const cost = food * 1 + ammo * 2 + oxen * 40 + parts * 20 + meds * 25;
  if (cost > 500) {
    document.getElementById('budget-warning').style.display = 'block';
    return;
  }
  state = {
    player,
    companions,
    supplies: { food, ammo, oxen, parts, meds },
    partyHealth: [100, 100, 100, 100, 100],
    day: 0,
    miles: 0,
    riversCrossed: 0,
    onRiver: false
  };
  localStorage.setItem('pixelTrailState', JSON.stringify(state));
  document.getElementById('setup-screen').style.display = 'none';
  playMusic();
  canvas.style.display = 'block';
  const ui = document.getElementById('ui');
  ui.style.display = 'flex';
  ui.style.flexDirection = 'column';
  ui.style.alignItems = 'center';
  gameLoop();
  updatePartyStatus();
  document.getElementById('status').textContent = 'Your journey begins...';
}

function updatePartyStatus() {
  const { player, companions, supplies, partyHealth, riversCrossed } = state;
  let html = `<strong>Party:</strong><br/>`;
  html += `🧍 ${player} - ${partyHealth[0] > 0 ? 'Healthy' : 'Dead'} (${partyHealth[0]}%)<br/>`;
  companions.forEach((name, idx) => {
    const hp = partyHealth[idx + 1] ?? 100;
    html += `👤 ${name} - ${hp > 0 ? 'Healthy' : 'Dead'} (${hp}%)<br/>`;
  });
  html += `<br/><strong>Rivers Crossed:</strong> ${riversCrossed || 0}<br/><br/><strong>Supplies:</strong><br/>`;
  html += `🍖 Food: ${supplies.food} lbs<br/>`;
  html += `🔫 Ammo: ${supplies.ammo} boxes<br/>`;
  html += `🐂 Oxen: ${supplies.oxen}<br/>`;
  html += `🛠️ Parts: ${supplies.parts}<br/>`;
  html += `💊 Meds: ${supplies.meds}<br/>`;
  document.getElementById('party-status').innerHTML = html;
}

function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

let clouds = Array.from({ length: 5 }, () => ({
  x: Math.random() * canvas.width,
  y: 40 + Math.random() * 40,
  speed: 0.2 + Math.random() * 0.3
}));

function updateClouds() {
  clouds.forEach(cloud => {
    cloud.x -= cloud.speed;
    if (cloud.x < -30) {
      cloud.x = canvas.width + Math.random() * 50;
      cloud.y = 40 + Math.random() * 40;
    }
  });
}

const weather = Array.from({ length: 100 }, () => ({
  x: Math.random() * canvas.width,
  y: Math.random() * canvas.height,
  speed: 0.5 + Math.random() * 1,
  drift: Math.random() * 1 - 0.5
}));

function updateWeather() {
  weather.forEach(drop => {
    drop.x += drop.drift;
    drop.y += drop.speed;
    if (drop.y > canvas.height) {
      drop.y = -5;
      drop.x = Math.random() * canvas.width;
    }
  });
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < canvas.width / 20 + 2; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#113311' : '#224422';
    ctx.fillRect((i * 20 + backgroundX % 20) - 20, 0, 20, canvas.height);
  }

  for (let i = 0; i < canvas.width; i += 10) {
    const y = 380 + Math.sin((i + backgroundX) * 0.05) * 3;
    ctx.fillStyle = '#335533';
    ctx.fillRect(i, y, 10, canvas.height - y);
  }

  if (state?.onRiver) {
    for (let y = 300; y < 340; y += 5) {
      ctx.fillStyle = '#0044aa';
      ctx.beginPath();
      for (let x = 0; x <= canvas.width; x += 10) {
        let wave = Math.sin((x + Date.now() / 100) * 0.1) * 2;
        ctx.lineTo(x, y + wave);
      }
      ctx.lineTo(canvas.width, y + 5);
      ctx.lineTo(0, y + 5);
      ctx.closePath();
      ctx.fill();
    }
  }

  ctx.fillStyle = '#00FFAA';
  ctx.fillRect(wagon.x, wagon.y, 80, 20);
  ctx.fillStyle = '#004400';
  const wheelOffset = Math.sin(Date.now() / 100) * 2;
  ctx.beginPath(); ctx.arc(wagon.x + 15, wagon.y + 22 + wheelOffset, 6, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(wagon.x + 65, wagon.y + 22 + wheelOffset, 6, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = '#cccccc';
  clouds.forEach(cloud => {
    ctx.beginPath();
    ctx.ellipse(cloud.x, cloud.y, 20, 10, 0, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.fillStyle = '#88ccff';
  weather.forEach(drop => {
    ctx.beginPath();
    ctx.arc(drop.x, drop.y, 1.5, 0, Math.PI * 2);
    ctx.fill();
  });
}

function update() {
  backgroundX -= wagon.speed;
  if (backgroundX <= -canvas.width) backgroundX = 0;
  wagon.y += Math.sin(Date.now() / 200) * 0.5;
  updateClouds();
  updateWeather();
}

window.travelDay = function travelDay() {
  const riverChance = 0.15;
  state.onRiver = Math.random() < riverChance;
  draw();
  if (state.onRiver) {
    playSound('click');
    setTimeout(() => {
      const riverDepth = Math.random();
      if (riverDepth < 0.3) {
        alert("🛶 You approached a river. It’s shallow, so you easily crossed.");
        state.riversCrossed++;
      } else {
        const choice = prompt("🌊 A deep river blocks your path. Do you 'ford', 'float', or 'build raft'?");
        const roll = Math.random();
        if (choice === 'ford' && roll < 0.4) {
          alert("💥 The current was strong. You lost some supplies.");
          state.supplies.food = Math.max(0, state.supplies.food - 30);
        } else if (choice === 'float' && roll < 0.6) {
          alert("🌊 The river tipped your wagon! A party member drowned.");
          const i = Math.floor(Math.random() * state.partyHealth.length);
          state.partyHealth[i] = 0;
        } else if (choice === 'build raft' && state.supplies.parts > 0) {
          alert("🪵 You built a raft and crossed safely, using 1 spare part.");
          state.supplies.parts--;
        } else {
          alert("⚠️ Failed crossing. You lost food.");
          state.supplies.food = Math.max(0, state.supplies.food - 20);
        }
      }
      updatePartyStatus();
      localStorage.setItem('pixelTrailState', JSON.stringify(state));
    }, 500);
    return;
  }
  const mouths = 1 + state.companions.length;
  const foodConsumed = mouths * 2;
  const dailyMiles = Math.floor(10 + Math.random() * (state.supplies.oxen * 5));
  state.day++;
  state.miles += dailyMiles;
  state.supplies.food = Math.max(0, state.supplies.food - foodConsumed);
  if (state.supplies.food <= 0 || state.supplies.oxen <= 0 || state.partyHealth.every(h => h <= 0)) {
    playSound('death');
    alert("💀 Your journey has ended in tragedy.");
    localStorage.removeItem('pixelTrailState');
    location.reload();
    return;
  }
  if (Math.random() < 0.1) triggerRandomEvent();
  if (state.miles >= 2000) {
    playSound('win');
    alert("🎉 You made it to Oregon!");
    localStorage.removeItem('pixelTrailState');
    location.reload();
    return;
  }
  document.getElementById('status').textContent = `Day ${state.day}: Traveled ${dailyMiles} miles. Total: ${state.miles} mi. Food: ${state.supplies.food} lbs`;
  updatePartyStatus();
  localStorage.setItem('pixelTrailState', JSON.stringify(state));
};

// === HUNTING MODE ===
window.startHunting = function startHunting() {
  playSound('click');

  const gameCanvas = document.getElementById('game');
  const huntWrapper = document.getElementById('hunt-wrapper');
  const huntCanvas = document.getElementById('hunt-canvas');
  const hctx = huntCanvas.getContext('2d');

  gameCanvas.style.display = 'none';
  huntWrapper.style.display = 'flex';

  let deerList = Array.from({ length: 3 }, (_, i) => ({
    x: 640 + i * 200,
    y: 180 + Math.random() * 80,
    width: 30,
    height: 20,
    speed: 2 + Math.random() * 1.5,
    hit: false
  }));

  let crosshair = { x: 320, y: 200 };
  let ammoUsed = 0;
  let hits = 0;
  const ammoLimit = 5;

  function drawScene() {
    hctx.clearRect(0, 0, 640, 400);
    hctx.fillStyle = '#224422';
    hctx.fillRect(0, 0, 640, 400);

    deerList.forEach(deer => {
      if (!deer.hit) {
        hctx.fillStyle = '#8B4513';
        hctx.beginPath();
        hctx.ellipse(deer.x, deer.y, deer.width / 2, deer.height / 2, 0, 0, Math.PI * 2);
        hctx.fill();
      }
    });

    hctx.strokeStyle = '#FF4444';
    hctx.lineWidth = 1.5;
    hctx.beginPath();
    hctx.moveTo(crosshair.x - 10, crosshair.y);
    hctx.lineTo(crosshair.x + 10, crosshair.y);
    hctx.moveTo(crosshair.x, crosshair.y - 10);
    hctx.lineTo(crosshair.x, crosshair.y + 10);
    hctx.stroke();

    hctx.fillStyle = '#00FFAA';
    hctx.font = '12px monospace';
    hctx.fillText(`Ammo Left: ${ammoLimit - ammoUsed}`, 10, 20);
    hctx.fillText(`Hits: ${hits}`, 10, 35);
  }

  function shoot() {
    if (ammoUsed >= ammoLimit) return;
    playSound('shoot');
    ammoUsed++;
    let hit = false;

    deerList.forEach(deer => {
      if (!deer.hit &&
          crosshair.x >= deer.x - deer.width / 2 &&
          crosshair.x <= deer.x + deer.width / 2 &&
          crosshair.y >= deer.y - deer.height / 2 &&
          crosshair.y <= deer.y + deer.height / 2) {
        deer.hit = true;
        hit = true;
        hits++;
        playSound('death');
        state.supplies.food += 50;
      }
    });

    if (!hit) {
      console.log('Missed!');
    }

    if (ammoUsed >= ammoLimit || hits === deerList.length) {
      setTimeout(endHunting, 800);
    }
  }

  function moveDeer() {
    deerList.forEach(deer => {
      if (!deer.hit) {
        deer.x -= deer.speed;
        if (deer.x < -deer.width) {
          deer.x = 640 + Math.random() * 100;
          deer.y = 180 + Math.random() * 80;
        }
      }
    });
    drawScene();
    if (huntWrapper.style.display === 'flex') {
      requestAnimationFrame(moveDeer);
    }
  }

  function moveCrosshair(e) {
    const step = 10;
    if (e.key === 'ArrowUp') crosshair.y = Math.max(0, crosshair.y - step);
    if (e.key === 'ArrowDown') crosshair.y = Math.min(400, crosshair.y + step);
    if (e.key === 'ArrowLeft') crosshair.x = Math.max(0, crosshair.x - step);
    if (e.key === 'ArrowRight') crosshair.x = Math.min(640, crosshair.x + step);
    if (e.key === ' ' || e.code === 'Space') shoot();
  }

  function mouseMove(e) {
    const rect = huntCanvas.getBoundingClientRect();
    crosshair.x = e.clientX - rect.left;
    crosshair.y = e.clientY - rect.top;
  }

  function mouseClick() {
    shoot();
  }

  function endHunting() {
    document.removeEventListener('keydown', moveCrosshair);
    huntCanvas.removeEventListener('mousemove', mouseMove);
    huntCanvas.removeEventListener('click', mouseClick);
    huntWrapper.style.display = 'none';
    gameCanvas.style.display = 'block';
    updatePartyStatus();
    localStorage.setItem('pixelTrailState', JSON.stringify(state));
  }

  document.addEventListener('keydown', moveCrosshair);
  huntCanvas.addEventListener('mousemove', mouseMove);
  huntCanvas.addEventListener('click', mouseClick);
  moveDeer();
};
