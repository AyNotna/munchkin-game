const playBtn = document.getElementById('play-btn');
const playOptions = document.getElementById('play-options');
const mainMenu = document.getElementById('main-menu');
const backBtns = document.querySelectorAll('.back-btn');
const characterSelect = document.getElementById('character-select');
const multiplayerOptions = document.getElementById('multiplayer-options');
const multiplayerBtn = document.getElementById('multiplayer-btn');

const createRoomBtn = document.getElementById('create-room-btn');
const joinRoomBtn = document.getElementById('join-room-btn');

const createRoomMenu = document.getElementById('create-room-menu');
const confirmCreateRoomBtn = document.getElementById('confirm-create-room-btn');
const roomNameInput = document.getElementById('room-name-input');

const joinRoomMenu = document.getElementById('join-room-menu');
const confirmJoinRoomBtn = document.getElementById('confirm-join-room-btn');
const joinRoomInput = document.getElementById('join-room-input');

const roomLobby = document.getElementById('room-lobby');
const roomNameDisplay = document.getElementById('room-name-display');
const playersList = document.getElementById('players-list');

const startGameBtn = document.getElementById('start-game-btn');
const leaveRoomBtn = document.getElementById('leave-room-btn');

const errorBox = document.getElementById('error-box') || createErrorBox();

let socket = null;
let currentRoomId = null;

// Инициализация WebSocket (один раз)
function connectWebSocket() {
  if (socket && socket.readyState === WebSocket.OPEN) return;

  socket = new WebSocket('ws://localhost:3000');

  socket.onopen = () => {
    console.log('✅ WebSocket подключён');
    showError('');
  };

  socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log('📨 Получено сообщение от сервера:', data);

    switch (data.type) {
      case 'room-created':
        roomNameInput.value = '';
        showRoomLobby(data.roomId);
        updateLobbyPlayers(data.players);
        break;
      case 'joined':
        joinRoomInput.value = '';
        showRoomLobby(data.roomId);
        updateLobbyPlayers(data.players);
        break;
      case 'user-joined':
      case 'user-left':
        updateLobbyPlayers(data.players);
        break;
      case 'game-started':
        showError("Игра начинается! 🚀");
        localStorage.setItem('currentRoomId', data.roomId);
        localStorage.setItem('playerId', localStorage.getItem('nickname'));
        window.location.href = 'game.html';
        break;
      case 'error':
        showError(data.message);
        break;
    }
  };

  socket.onerror = (err) => {
    console.error('❌ Ошибка WebSocket:', err);
    showError('Ошибка соединения с сервером.');
  };

  socket.onclose = () => {
    console.warn('🔌 WebSocket отключён. Переподключение...');
    showError('Соединение потеряно. Повторная попытка...');
    setTimeout(connectWebSocket, 2000);
  };
}

function selectCharacter(gender) {
  const email = localStorage.getItem('userEmail');
  if (!email) return showError("Пользователь не авторизован");

  fetch('http://localhost:3000/api/save-character', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, character: gender })
  })
    .then(res => {
      if (!res.ok) throw new Error("Ошибка при сохранении персонажа");
      return res.text();
    })
    .then(() => {
      characterSelect.classList.add('hidden');
      mainMenu.classList.remove('hidden');
    })
    .catch(err => {
      console.error("Ошибка:", err);
      showError("Не удалось сохранить персонажа");
    });
}

window.addEventListener('DOMContentLoaded', () => {
  const email = localStorage.getItem('userEmail');
  if (!email) return;

  fetch(`http://localhost:3000/api/get-character?email=${email}`)
    .then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then(data => {
      if (data.character) {
        characterSelect.classList.add('hidden');
        mainMenu.classList.remove('hidden');
      }

      if (data.nickname) {
        localStorage.setItem('nickname', data.nickname);
      }
    })
    .catch(err => console.error("Ошибка загрузки персонажа:", err));
});

playBtn.addEventListener('click', () => {
  mainMenu.classList.add('hidden');
  playOptions.classList.remove('hidden');
});

backBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    [playOptions, multiplayerOptions, createRoomMenu, joinRoomMenu, roomLobby].forEach(e => e.classList.add('hidden'));
    mainMenu.classList.remove('hidden');
    showError('');
  });
});

multiplayerBtn.addEventListener('click', () => {
  playOptions.classList.add('hidden');
  multiplayerOptions.classList.remove('hidden');
});

createRoomBtn.addEventListener('click', () => {
  multiplayerOptions.classList.add('hidden');
  createRoomMenu.classList.remove('hidden');
});

joinRoomBtn.addEventListener('click', () => {
  multiplayerOptions.classList.add('hidden');
  joinRoomMenu.classList.remove('hidden');
});

confirmCreateRoomBtn.addEventListener('click', () => {
  const roomId = roomNameInput.value.trim();
  const nickname = localStorage.getItem('nickname');

  if (!roomId || !nickname || !socket || socket.readyState !== WebSocket.OPEN) {
    return showError("Введите имя комнаты и убедитесь, что WebSocket подключён");
  }

  socket.send(JSON.stringify({ type: 'create-room', roomId, nickname }));
  currentRoomId = roomId;
});

confirmJoinRoomBtn.addEventListener('click', () => {
  const roomId = joinRoomInput.value.trim();
  const nickname = localStorage.getItem('nickname');

  if (!roomId || !nickname || !socket || socket.readyState !== WebSocket.OPEN) {
    return showError("Введите ID комнаты и убедитесь, что WebSocket подключён");
  }

  socket.send(JSON.stringify({ type: 'join-room', roomId, nickname }));
  currentRoomId = roomId;
});

function showRoomLobby(roomId) {
  [createRoomMenu, joinRoomMenu].forEach(e => e.classList.add('hidden'));
  roomLobby.classList.remove('hidden');
  roomNameDisplay.textContent = roomId;
  playersList.innerHTML = `<p>Вы в комнате "${roomId}". Ожидание других игроков...</p>`;
  startGameBtn.classList.add('hidden');
}

function updateLobbyPlayers(players) {
  playersList.innerHTML = '';
  players.forEach(nickname => {
    const p = document.createElement('p');
    p.textContent = nickname;
    playersList.appendChild(p);
  });

  const myNickname = localStorage.getItem('nickname');
  if (players[0] === myNickname) {
    startGameBtn.classList.remove('hidden');
  } else {
    startGameBtn.classList.add('hidden');
  }
}

function showError(message) {
  errorBox.textContent = message;
  errorBox.style.display = message ? 'block' : 'none';
}

function createErrorBox() {
  const box = document.createElement('div');
  box.id = 'error-box';
  box.style.cssText = `
    display: none;
    color: red;
    margin: 10px;
    text-align: center;
    font-weight: bold;
  `;
  document.body.appendChild(box);
  return box;
}

startGameBtn.addEventListener('click', () => {
  const nickname = localStorage.getItem('nickname');

  if (!socket || socket.readyState !== WebSocket.OPEN || !currentRoomId || !nickname) {
    return showError('Невозможно начать игру. Проверьте соединение, комнату и никнейм.');
  }

  socket.send(JSON.stringify({
    type: 'start-game',
    roomId: currentRoomId,
    nickname
  }));
});

leaveRoomBtn.addEventListener('click', () => {
  if (socket && socket.readyState === WebSocket.OPEN && currentRoomId) {
    socket.send(JSON.stringify({ type: 'leave-room', roomId: currentRoomId }));
  }
  currentRoomId = null;
  roomLobby.classList.add('hidden');
  mainMenu.classList.remove('hidden');
  showError('');
});

// === Запуск ===
connectWebSocket();
