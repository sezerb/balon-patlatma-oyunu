const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startButton = document.getElementById('startGame');

canvas.width = 800;
canvas.height = 600;

let score = 0;
let missedBalloons = 0;
let level = 1;
let gameOver = false;
let balloons = [];

// Müzik ayarları
const music = new Audio('assets/heartbreak.mp3');
music.loop = true;
music.volume = 0.5;

function startMusic() {
  music.play().catch((error) => {
    console.log('Müzik başlatılamadı:', error);
  });
}

function stopMusic() {
  music.pause();
  music.currentTime = 0;
}

// Oyun başlatma işlemi
startButton.addEventListener('click', () => {
    startButton.style.display = 'none';  // Butonu gizle
    canvas.style.display = 'block';  // Oyunu göster
    startMusic();  // Müziği başlat
    gameLoop();  // Oyunu başlat
  });

const levels = [
  { scoreToAdvance: 100, background: 'background1.jpg', balloonSpeedFactor: 1.0, balloonCount: 1 },
  { scoreToAdvance: 200, background: 'background2.jpg', balloonSpeedFactor: 1.5, balloonCount: 2 },
  { scoreToAdvance: 300, background: 'background3.jpg', balloonSpeedFactor: 2.0, balloonCount: 3 },
  { scoreToAdvance: 400, background: 'background1.jpg', balloonSpeedFactor: 2.5, balloonCount: 4 },
  { scoreToAdvance: 500, background: 'background2.jpg', balloonSpeedFactor: 3.0, balloonCount: 5 },
  { scoreToAdvance: 600, background: 'background3.jpg', balloonSpeedFactor: 3.5, balloonCount: 6 },
  { scoreToAdvance: 700, background: 'background1.jpg', balloonSpeedFactor: 4.0, balloonCount: 7 },
  { scoreToAdvance: 800, background: 'background2.jpg', balloonSpeedFactor: 4.5, balloonCount: 8 },
  { scoreToAdvance: 900, background: 'background3.jpg', balloonSpeedFactor: 5.0, balloonCount: 9 },
  { scoreToAdvance: 1000, background: 'background10.jpg', balloonSpeedFactor: 5.5, balloonCount: 10 }
];

const backgroundImage = new Image();
backgroundImage.src = levels[0].background;

const balloonImages = ['balloon1.png', 'balloon2.png'];

function createBalloon() {
  const x = Math.random() * (canvas.width - 100);
  const y = canvas.height;
  const size = Math.random() * 80 + 60;
  const speed = ((100 - size) / 20) * levels[level - 1].balloonSpeedFactor;

  const balloonImage = new Image();
  balloonImage.src = balloonImages[Math.floor(Math.random() * balloonImages.length)];

  balloonImage.onload = () => {
    balloons.push({ x, y, size, speed, image: balloonImage });
  };
}

function updateBalloons() {
  ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);

  balloons.forEach((balloon, index) => {
    balloon.y -= balloon.speed;
    ctx.drawImage(balloon.image, balloon.x, balloon.y, balloon.size, balloon.size);

    if (balloon.y + balloon.size < 0) {
      balloons.splice(index, 1);
      missedBalloons += 1;
      document.getElementById('missed').textContent = `Kaçırılan: ${missedBalloons}`;

      if (missedBalloons >= 10) {
        gameOver = true;
        displayGameOver();
      }
    }
  });
}

function displayGameOver() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = '50px Arial';
  ctx.fillStyle = 'red';
  ctx.textAlign = 'center';
  ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2);
}

// Fare hareketini yönetme (Balonları patlatmak için)
canvas.addEventListener('mousemove', (e) => {
  if (gameOver) return;

  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  const mouseX = (e.clientX - rect.left) * scaleX;
  const mouseY = (e.clientY - rect.top) * scaleY;

  balloons.forEach((balloon, index) => {
    const dist = Math.sqrt((mouseX - (balloon.x + balloon.size / 2)) ** 2 + (mouseY - (balloon.y + balloon.size / 2)) ** 2);

    if (dist < balloon.size / 2) {
      balloons.splice(index, 1);
      score += 10;
      document.getElementById('score').textContent = `Skor: ${score}`;
      checkLevelUp();
    }
  });
});

function checkLevelUp() {
  if (level < levels.length && score >= levels[level - 1].scoreToAdvance) {
    level++;
    backgroundImage.src = levels[level - 1].background;
    document.getElementById('level').textContent = `Bölüm: ${level}`;
    increaseBalloonCreationRate();
  }
}

function increaseBalloonCreationRate() {
  clearInterval(balloonCreationInterval);
  balloonCreationInterval = setInterval(() => {
    if (!gameOver) {
      for (let i = 0; i < levels[level - 1].balloonCount; i++) {
        createBalloon();
      }
    }
  }, 800);
}

function gameLoop() {
  if (!gameOver) {
    updateBalloons();
    setTimeout(() => requestAnimationFrame(gameLoop), 16);
  }
}

let balloonCreationInterval = setInterval(() => {
  if (!gameOver) {
    for (let i = 0; i < levels[level - 1].balloonCount; i++) {
      createBalloon();
    }
  }
}, 800);
