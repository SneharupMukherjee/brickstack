if (window.Telegram && window.Telegram.WebApp) {
  window.Telegram.WebApp.expand(); // Makes it fullscreen
  window.Telegram.WebApp.ready();  // Marks app as ready
}

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

const bgCanvas = document.getElementById("bgCanvas");
const bgCtx = bgCanvas.getContext("2d");
bgCtx.imageSmoothingEnabled = false;

resizeCanvas();
resizeBg();

// === GLOBAL UI COLOR PALETTE ===
const palette = {
  background: "#070D0D",
  primary: "#FFF2BA",
  secondary: "#5368AC",
  success: "#75AC58",
  warning: "#CCB449",
  failure: "#DE3D3D"
};


function applyPalette() {
  const root = document.documentElement;
  for (let key in palette) {
    root.style.setProperty(`--${key}`, palette[key]);
  }
}
applyPalette();


window.addEventListener("resize", () => {
  resizeCanvas();
  resizeBg();
  resetGame();
});

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

function resizeBg() {
  bgCanvas.width = window.innerWidth;
  bgCanvas.height = window.innerHeight;
}

// === CONFIG ===
const blockHeight = 30;
const blockWidth = 130;
const originalBlockWidth = blockWidth;
const bottomPadding = 100;
const SCROLL_START_BLOCK = 8;
let speed = 15;

let stack = [];
let isDropping = false;
let fallingSlices = [];
let gameStarted = false;
let hasStacked = false;

// === STARFIELD BG ===
const stars = [];
const numStars = 80;
for (let i = 0; i < numStars; i++) {
  stars.push({
    x: Math.floor(Math.random() * bgCanvas.width),
    y: Math.floor(Math.random() * bgCanvas.height),
    size: 4 + Math.floor(Math.random() * 3),
    speed: 0.5 + Math.random() * 0.8
  });
}

function updateBackground() {
  bgCtx.fillStyle = palette.background;
  bgCtx.fillRect(0, 0, bgCanvas.width, bgCanvas.height);

  bgCtx.fillStyle = "#444";
  for (let star of stars) {
    star.y += star.speed;
    if (star.y > bgCanvas.height) star.y = 0;
    bgCtx.fillRect(star.x, star.y, star.size, star.size);
  }

  requestAnimationFrame(updateBackground);
}
updateBackground();

// === GAME INIT ===
stack.push({
  x: canvas.width / 2 - blockWidth / 2,
  y: canvas.height - bottomPadding - blockHeight,
  width: blockWidth,
  color: getRandomColor()
});
let currentBlock = createNewBlock(stack[stack.length - 1].width);

function createNewBlock(width) {
  return {
    x: 0,
    y: canvas.height - bottomPadding - blockHeight,
    width: width,
    direction: 1,
    color: getRandomColor()
  };
}

function drawBlock(x, y, width, color, offsetY = 0) {
  const px = Math.floor(x);
  const py = Math.floor(y + offsetY);
  const pw = Math.floor(width);
  const ph = blockHeight;
  const depth = 12;

  const topColor = shadeColor(color, 30);
  const sideColor = shadeColor(color, -40);

  ctx.fillStyle = color;
  ctx.fillRect(px, py, pw, ph);

  ctx.fillStyle = topColor;
  ctx.beginPath();
  ctx.moveTo(px, py);
  ctx.lineTo(px - depth, py - depth);
  ctx.lineTo(px + pw - depth, py - depth);
  ctx.lineTo(px + pw, py);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = sideColor;
  ctx.beginPath();
  ctx.moveTo(px, py);
  ctx.lineTo(px - depth, py - depth);
  ctx.lineTo(px - depth, py + ph - depth);
  ctx.lineTo(px, py + ph);
  ctx.closePath();
  ctx.fill();
}

function update() {
  if (!isDropping) {
    currentBlock.x += speed * currentBlock.direction;
    if (currentBlock.x <= 0 || currentBlock.x + currentBlock.width >= canvas.width) {
      currentBlock.direction *= -1;
    }
  }

  for (let slice of fallingSlices) {
    slice.y += 5;
  }
  fallingSlices = fallingSlices.filter(slice => slice.y < canvas.height + 100);

  draw();
  requestAnimationFrame(update);
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const cameraOffsetY = Math.max(0, (stack.length - SCROLL_START_BLOCK) * blockHeight);

  for (let b of stack) {
    drawBlock(b.x, b.y + cameraOffsetY, b.width, b.color);
  }

  drawBlock(
    currentBlock.x,
    currentBlock.y - stack.length * blockHeight + cameraOffsetY,
    currentBlock.width,
    currentBlock.color
  );

  for (let s of fallingSlices) {
    drawBlock(s.x, s.y + cameraOffsetY, s.width, s.color);
  }

  document.getElementById("scoreOverlay").innerText = `Stack: ${stack.length - 1}`;
  const widthPercent = Math.round((currentBlock.width / originalBlockWidth) * 100);
  document.getElementById("widthOverlay").innerText = `Percentage: ${widthPercent}%`;
}

function dropBlock() {
  if (isDropping) return;
  gameStarted = true;
  isDropping = true;

  let topBlock = stack[stack.length - 1];
  let newY = canvas.height - bottomPadding - blockHeight * (stack.length + 1);
  let offset = currentBlock.x - topBlock.x;

  if (Math.abs(offset) < currentBlock.width) {
    let newWidth = currentBlock.width - Math.abs(offset);
    let newX = offset > 0 ? currentBlock.x : topBlock.x;

    if (offset !== 0) {
      fallingSlices.push({
        x: offset > 0 ? topBlock.x + newWidth : currentBlock.x,
        y: newY,
        width: Math.abs(offset),
        color: currentBlock.color
      });
    }

    stack.push({
      x: newX,
      y: newY,
      width: newWidth,
      color: currentBlock.color
    });

    hasStacked = true;
    currentBlock = createNewBlock(newWidth);
    isDropping = false;
  } else {
    if (hasStacked) {
      flashRed().then(() => {
        showGameOver(stack.length - 1);
      });
    } else {
      resetGame();
    }
  }
}

function showGameOver(finalScore) {
  const finalPercent = Math.round((currentBlock.width / originalBlockWidth) * 100);
  document.getElementById("finalStack").innerText = finalScore;
  document.getElementById("finalPercent").innerText = `${finalPercent}%`;
  document.getElementById("gameOverScreen").classList.remove("hidden");
}

function restartGame() {
  document.getElementById("gameOverScreen").classList.add("hidden");
  resetGame();
  gameStarted = false;
  hasStacked = false;
}

function resetGame() {
  stack = [{
    x: canvas.width / 2 - blockWidth / 2,
    y: canvas.height - bottomPadding - blockHeight,
    width: blockWidth,
    color: getRandomColor()
  }];
  currentBlock = createNewBlock(blockWidth);
  fallingSlices = [];
  isDropping = false;
}

function getRandomColor() {
  const blockPalette = [
    "#E2662D", // Flame
    "#FFF2BA", // Vanilla
    "#5368AC", // Savoy Blue
    "#75AC58", // Asparagus
    "#CCB449", // Old Gold
    "#DE3D3D"  // Poppy
  ];
  return blockPalette[Math.floor(Math.random() * blockPalette.length)];
}


function shadeColor(color, percent) {
  let f = parseInt(color.slice(1), 16),
    t = percent < 0 ? 0 : 255,
    p = Math.abs(percent) / 100,
    R = f >> 16,
    G = f >> 8 & 0x00FF,
    B = f & 0x0000FF;
  return "#" + (
    0x1000000 +
    (Math.round((t - R) * p) + R) * 0x10000 +
    (Math.round((t - G) * p) + G) * 0x100 +
    (Math.round((t - B) * p) + B)
  ).toString(16).slice(1);
}

function flashRed() {
  return new Promise(resolve => {
    document.body.style.backgroundColor = palette.failure;
    setTimeout(() => {
      document.body.style.backgroundColor = palette.secondary;
      resolve();
    }, 150);
  });
}

// Controls
document.addEventListener("keydown", (e) => {
  if (e.code === "Space") dropBlock();
});
canvas.addEventListener("click", dropBlock);
canvas.addEventListener("touchstart", (e) => {
  e.preventDefault();
  dropBlock();
}, { passive: false });

// === START SEQUENCE ===
function startGame() {
  document.getElementById("startScreen").style.display = "none";
  startCountdownAndGame();
}

function startCountdownAndGame() {
  const overlay = document.getElementById("countdownOverlay");
  const text = document.getElementById("countdownText");
  overlay.classList.remove("hidden");

  const steps = ["Get", "Set", "GO!", ""];
  let i = 0;

  const countdown = setInterval(() => {
    text.innerText = steps[i];
    i++;

    if (i === steps.length) {
      clearInterval(countdown);
      overlay.classList.add("hidden");
      update();
    }
  }, 700);
}
