// ======================= pixel-trail.js - Full Game Logic =======================

let backgroundX = 0;
const wagon = { x: 50, y: 220, speed: 1 };
let state = null;
let musicStarted = false;

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// Setup audio DOM-based for music, new Audio for SFX
const audio = {
  click: new Audio('assets/click.wav'),
  shoot: new Audio('assets/shoot.wav'),
  death: new Audio('assets/death.wav'),
  win: new Audio('assets/win.wav'),
  bg: new Audio('assets/bg-music.mp3') // Fallback to Audio object if element failed
};

audio.bg.loop = true;

function unlockAudio() {
  for (let key in audio) {
    const sound = audio[key];
    if (sound instanceof HTMLAudioElement) {
      sound.play().then(() => sound.pause()).catch(() => {});
    }
  }
  window.removeEventListener('pointerdown', unlockAudio);
}

window.addEventListener('pointerdown', unlockAudio);

function playMusic() {
  if (musicStarted || !audio.bg) return;
  audio.bg.volume = 0.4;
  audio.bg.loop = true;
  audio.bg.play().then(() => {
    musicStarted = true;
    console.log("🎶 Music started");
  }).catch(err => {
    console.warn("❌ Music failed to play:", err);
  });
}

function playSound(name) {
  const sound = audio[name];
  if (!sound) return;
  sound.pause();
  sound.currentTime = 0;
  sound.play().catch(err => {
    console.warn(`Sound '${name}' failed to play:`, err);
  });
}

function updateBudgetTotal() {
  const totalBudget = 500;
  const food = +document.getElementById('food').value;
  const ammo = +document.getElementById('ammo').value;
  const oxen = +document.getElementById('oxen').value;
  const parts = +document.getElementById('parts').value;
  const meds = +document.getElementById('meds').value;
  const cost = food * 1 + ammo * 2 + oxen * 40 + parts * 20 + meds * 25;
  console.log(`🧾 Budget spent: $${cost} out of $${totalBudget}`);
  const budgetTotal = document.getElementById('budget-total');
  budgetTotal.textContent = `Total: $${cost} / $${totalBudget}`;
  if (cost < 300) {
    budgetTotal.style.color = '#00FFAA';
  } else if (cost < 450) {
    budgetTotal.style.color = 'gold';
  } else if (cost <= 500) {
    budgetTotal.style.color = 'orange';
  } else {
    budgetTotal.style.color = 'red';
    document.getElementById('budget-warning').style.display = 'block';
    return;
  }
  document.getElementById('budget-warning').style.display = 'none';
}

window.addEventListener('load', () => {
  const locationInfo = document.createElement('div');
  locationInfo.id = 'location-info';
  locationInfo.style.color = '#00FFAA';
  locationInfo.style.margin = '10px';
  document.getElementById('ui')?.appendChild(locationInfo);
  const startBtn = document.getElementById('start-button');
  if (startBtn) startBtn.addEventListener('click', startGame);
  ['food', 'ammo', 'oxen', 'parts', 'meds'].forEach(id => {
    const input = document.getElementById(id);
    if (input) input.addEventListener('input', updateBudgetTotal);
  });
  updateBudgetTotal();

  const muteBtn = document.getElementById('mute-toggle');
  if (muteBtn) {
    muteBtn.addEventListener('click', () => {
      audio.bg.muted = !audio.bg.muted;
      muteBtn.textContent = audio.bg.muted ? '🔇 Unmute' : '🔊 Mute';
    });
  }

  const huntBtn = document.getElementById('hunt-button');
  if (huntBtn) {
    huntBtn.addEventListener('click', () => {
      if (typeof startHunting === 'function') startHunting();
    });
  }

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
    updateLocationInfo();
    document.getElementById('status').textContent = `Welcome back, ${state.player}. Day ${state.day}`;
    playMusic();
  } else {
    localStorage.removeItem('pixelTrailState');
  }
});

function updateLocationInfo() {
  const locationBox = document.getElementById('location-info');
  if (!locationBox || !state) return;
  const miles = state.miles;
  let landmark = "Wilderness";
  if (miles > 1800) landmark = "Almost Oregon!";
  else if (miles > 1500) landmark = "Rocky Mountains";
  else if (miles > 1000) landmark = "Great Plains";
  else if (miles > 500) landmark = "Missouri River";
  else if (miles > 100) landmark = "The Frontier";
  locationBox.textContent = `📍 Location: ${landmark} (${miles} mi)`;
}

function pauseForFuneral(name) {
  return new Promise(resolve => {
    setTimeout(() => {
      alert(`🪦 Funeral held for ${name}. A moment of silence.`);
      resolve();
    }, 1000);
  });
}

window.travelDay = async function travelDay() {
  const riverChance = 0.15;
  state.onRiver = Math.random() < riverChance;
  draw();
  if (state.onRiver) {
    playSound('click');
    setTimeout(async () => {
      const riverDepth = Math.random();
      if (riverDepth < 0.3) {
        alert("🛶 You approached a river. It’s shallow, so you easily crossed.");
        state.riversCrossed++;
      } else {
        const choice = prompt("🌊 A deep river blocks your path. Do you 'ford', 'float', 'build raft', or 'hire guide'?");
        const roll = Math.random();
        if (choice === 'ford' && roll < 0.4) {
          alert("💥 The current was strong. You lost some supplies.");
          state.supplies.food = Math.max(0, state.supplies.food - 30);
        } else if (choice === 'float' && roll < 0.6) {
          const i = Math.floor(Math.random() * state.partyHealth.length);
          state.partyHealth[i] = 0;
          const name = i === 0 ? state.player : state.companions[i - 1];
          playSound('death');
          alert(`🌊 The river tipped your wagon! ${name} drowned.`);
          await pauseForFuneral(name);
        } else if (choice === 'build raft' && state.supplies.parts > 0) {
          alert("🪵 You built a raft and crossed safely, using 1 spare part.");
          state.supplies.parts--;
        } else if (choice === 'hire guide') {
          if (state.supplies.food >= 10) {
            state.supplies.food -= 10;
            alert("🧭 A local native guides you across safely for 10 lbs of food.");
            state.riversCrossed++;
          } else {
            alert("⚠️ You don't have enough food to pay the guide. Must try another way.");
          }
        } else {
          alert("⚠️ Failed crossing. You lost food.");
          state.supplies.food = Math.max(0, state.supplies.food - 20);
        }
      }
      updatePartyStatus();
      updateLocationInfo();
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
  if (state.miles >= 2000) {
    playSound('win');
    alert("🎉 You made it to Oregon!");
    localStorage.removeItem('pixelTrailState');
    location.reload();
    return;
  }
  if (typeof triggerRandomEvent === 'function' && Math.random() < 0.1) triggerRandomEvent();
  document.getElementById('status').textContent = `Day ${state.day}: Traveled ${dailyMiles} miles. Total: ${state.miles} mi. Food: ${state.supplies.food} lbs`;
  updatePartyStatus();
  updateLocationInfo();
  localStorage.setItem('pixelTrailState', JSON.stringify(state));
};

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
  let html = `<strong>🛻 Wagon Party</strong><br/>`;
  html += `🧍 ${player} - ${partyHealth[0] > 0 ? partyHealth[0] + '%' : '💀 Dead'}<br/>`;
  companions.forEach((name, idx) => {
    const hp = partyHealth[idx + 1] ?? 100;
    html += `👤 ${name} - ${hp > 0 ? hp + '%' : '💀 Dead'}<br/>`;
  });
  html += `<br/><strong>🎒 Supplies</strong><br/>`;
  html += `🍖 Food: ${supplies.food} lbs<br/>`;
  html += `🔫 Ammo: ${supplies.ammo}<br/>`;
  html += `🐂 Oxen: ${supplies.oxen}<br/>`;
  html += `🛠️ Parts: ${supplies.parts}<br/>`;
  html += `💊 Meds: ${supplies.meds}<br/>`;
  html += `<br/>🌊 Rivers Crossed: ${riversCrossed || 0}`;

  const panel = document.getElementById('party-status');
  panel.innerHTML = html;
  panel.style.display = 'block';
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

// === HUNTING MODE ===
window.startHunting = function startHunting() {
  playSound('click');

  const gameCanvas = document.getElementById('game');
  const huntWrapper = document.getElementById('hunt-wrapper');
  const huntCanvas = document.getElementById('hunt-canvas');
  const hctx = huntCanvas.getContext('2d');

  gameCanvas.style.display = 'none';
  huntWrapper.style.display = 'flex';

  let deerList = [];

  for (let i = 0; i < 5; i++) {
    deerList.push({
      x: 640 + i * 150,
      y: 180 + Math.random() * 80,
      width: 30,
      height: 20,
      speed: 1.5 + Math.random() * 1.5,
      hit: false,
      type: Math.random() < 0.7 ? 'buck' : 'doe' // More bucks!
    });
  }

  // Add a bear 25% of the time
  if (Math.random() < 0.25) {
    deerList.push({
      x: 640 + Math.random() * 300,
      y: 200 + Math.random() * 60,
      width: 50,
      height: 40,
      speed: 1.2,
      hit: false,
      type: 'bear'
    });
  }

  let crosshair = { x: 320, y: 200 };
  let ammoUsed = 0;
  let hits = 0;
  const ammoLimit = 5;

  let bucksShot = 0;
  let doesShot = 0;
  let bearsShot = 0;
  let foodGained = 0;

  function drawDeerPixel(animal) {
    const baseX = Math.floor(animal.x);
    const baseY = Math.floor(animal.y);
    let px, scale;

    if (animal.type === 'bear') {
      px = 5;
      scale = 3;

      hctx.fillStyle = '#4B3621';
      hctx.fillRect(baseX, baseY, px * 5 * scale, px * 3 * scale);
      hctx.fillRect(baseX + px, baseY + px * 3 * scale, px * scale, px * scale);
      hctx.fillRect(baseX + px * 4 * scale, baseY + px * 3 * scale, px * scale, px * scale);
      hctx.fillRect(baseX - px * 2 * scale, baseY, px * 2 * scale, px * 2 * scale);

      hctx.fillStyle = '#FFFFFF';
      hctx.fillRect(baseX - px * 2 * scale, baseY, px, px);
    } else {
      px = animal.type === 'buck' ? 5 : 4;
      scale = 2;

      hctx.fillStyle = '#8B4513';
      hctx.fillRect(baseX, baseY, px * 4 * scale, px * 2 * scale);
      hctx.fillRect(baseX + px, baseY + px * 2 * scale, px * scale, px * scale);
      hctx.fillRect(baseX + px * 3 * scale, baseY + px * 2 * scale, px * scale, px * scale);
      hctx.fillRect(baseX - px * 2 * scale, baseY, px * 2 * scale, px * 2 * scale);

      if (animal.type === 'buck') {
        hctx.fillStyle = '#D2B48C';
        hctx.fillRect(baseX - px * 3 * scale, baseY - px * scale, px * scale, px * scale);
        hctx.fillRect(baseX - px, baseY - px * scale, px * scale, px * scale);
        hctx.fillRect(baseX - px * 4 * scale, baseY - px * 2 * scale, px * scale, px * scale);
        hctx.fillRect(baseX, baseY - px * 2 * scale, px * scale, px * scale);
      }
    }

    if (animal.hit) {
      hctx.fillStyle = '#FF0000';
      hctx.font = 'bold 14px monospace';
      hctx.fillText('💀', baseX, baseY - 5);
    }
  }

  function drawScene() {
    hctx.clearRect(0, 0, 640, 400);
    hctx.fillStyle = '#224422';
    hctx.fillRect(0, 0, 640, 400);

    deerList.forEach(animal => {
      drawDeerPixel(animal);
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

    deerList.forEach(animal => {
      if (!animal.hit) {
        let px, scale;
        if (animal.type === 'bear') {
          px = 5;
          scale = 3;
        } else {
          px = animal.type === 'buck' ? 5 : 4;
          scale = 2;
        }

        const bodyWidth = px * 4 * scale;
        const bodyHeight = (px * 3 + 1) * scale;
        const hitboxX = animal.x;
        const hitboxY = animal.y;

        const inX = crosshair.x >= hitboxX && crosshair.x <= hitboxX + bodyWidth;
        const inY = crosshair.y >= hitboxY && crosshair.y <= hitboxY + bodyHeight;

        if (inX && inY) {
          animal.hit = true;
          hit = true;
          hits++;
          playSound('death');

          if (animal.type === 'bear') {
            state.supplies.food += 150;
            foodGained += 150;
            bearsShot++;
            alert("🐻 You shot a bear! +150 lbs of food!");
          } else if (animal.type === 'buck') {
            state.supplies.food += 80;
            foodGained += 80;
            bucksShot++;
          } else {
            state.supplies.food += 50;
            foodGained += 50;
            doesShot++;
          }
        }
      }
    });

    if (!hit) console.log('Missed!');

    updatePartyStatus();

    if (ammoUsed >= ammoLimit || hits === deerList.length) {
      setTimeout(endHunting, 800);
    }
  }

  function moveDeer() {
    deerList.forEach(animal => {
      if (!animal.hit) {
        animal.x -= animal.speed;
        if (animal.x < -animal.width) {
          animal.x = 640 + Math.random() * 100;
          animal.y = 180 + Math.random() * 80;
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

    alert(`🏹 Hunt Summary:
Bucks: ${bucksShot}
Does: ${doesShot}
Bears: ${bearsShot}
Total Food Gained: ${foodGained} lbs`);
  }

  document.addEventListener('keydown', moveCrosshair);
  huntCanvas.addEventListener('mousemove', mouseMove);
  huntCanvas.addEventListener('click', mouseClick);
  moveDeer();
};

