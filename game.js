// game.js

let socket = null;
let playerId = null;        // Твой уникальный идентификатор игрока
let roomId = null;          // Текущая игровая комната
let players = {};           // Данные по игрокам {id: {nickname, hand: []}}

// Элементы DOM
const leftPlayerName = document.getElementById('left-player-name');
const rightPlayerName = document.getElementById('right-player-name');
const bottomPlayerName = document.getElementById('bottom-player-name');

const leftPlayerHand = document.getElementById('left-player-hand');
const rightPlayerHand = document.getElementById('right-player-hand');
const bottomPlayerHand = document.getElementById('bottom-player-hand');

const doorDeck = document.getElementById('door-deck');
const treasureDeck = document.getElementById('treasure-deck');

const centerArea = document.getElementById('center-area');

function connectWebSocket() {
  socket = new WebSocket('ws://localhost:3000');

  socket.onopen = () => {
    console.log('✅ WebSocket подключён к игре');
    // Можно отправить сообщение серверу о присоединении к игре
    if (roomId && playerId) {
      socket.send(JSON.stringify({ type: 'join-game', roomId, playerId }));
    }
  };

  socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log('📨 Сообщение от сервера:', data);

    switch (data.type) {
      case 'init-game':
        // Получили начальные данные игры: комната, игроки, твой ID
        roomId = data.roomId;
        playerId = data.playerId;
        players = data.players; // {id: {nickname, hand: []}}

        updatePlayersUI();
        showMessage(`Вы в комнате: ${roomId}`);
        break;

      case 'update-players':
        // Обновление данных игроков
        players = data.players;
        updatePlayersUI();
        break;

      case 'game-message':
        // Вывод сообщения в центр
        showMessage(data.message);
        break;

      case 'error':
        showMessage(`Ошибка: ${data.message}`, true);
        break;

      // Добавь другие case для обработки игрового процесса (например, карты, ход и т.п.)
    }
  };

  socket.onerror = (err) => {
    console.error('❌ Ошибка WebSocket:', err);
    showMessage('Ошибка соединения с сервером', true);
  };

  socket.onclose = () => {
    console.warn('🔌 WebSocket отключён');
    showMessage('Соединение потеряно', true);
  };
}

function updatePlayersUI() {
  // Определяем позицию игрока в массиве и назначаем по местам

  // Создадим упорядоченный массив игроков по id
  const ids = Object.keys(players);
  if (!playerId || !ids.includes(playerId)) {
    return showMessage('Ошибка: ваш ID не найден среди игроков', true);
  }

  // Позиция твоего игрока (нижняя часть)
  const myIndex = ids.indexOf(playerId);

  // Для 3 игроков:
  // left: (myIndex + 1) % 3
  // right: (myIndex + 2) % 3

  const leftIndex = (myIndex + 1) % ids.length;
  const rightIndex = (myIndex + 2) % ids.length;

  const leftPlayer = players[ids[leftIndex]];
  const rightPlayer = players[ids[rightIndex]];
  const bottomPlayer = players[playerId];

  // Обновим имена
  leftPlayerName.textContent = leftPlayer.nickname || 'Игрок слева';
  rightPlayerName.textContent = rightPlayer.nickname || 'Игрок справа';
  bottomPlayerName.textContent = bottomPlayer.nickname || 'Вы';

  // Обновим руки игроков (просто количество карт, чтобы не раскрывать карты другим)
  updateHandUI(leftPlayerHand, leftPlayer.hand.length, false);
  updateHandUI(rightPlayerHand, rightPlayer.hand.length, false);

  // Для себя показываем реальные карты
  updateHandUI(bottomPlayerHand, bottomPlayer.hand, true);
}

function updateHandUI(container, handData, showCards) {
  container.innerHTML = '';

  if (Array.isArray(handData)) {
    // handData — массив карт (для своего игрока)
    if (showCards) {
      handData.forEach(card => {
        const cardDiv = document.createElement('div');
        cardDiv.className = 'card';
        cardDiv.textContent = card.name || 'Карта';
        container.appendChild(cardDiv);
      });
    }
  } else if (typeof handData === 'number') {
    // handData — число карт (для других игроков)
    for (let i = 0; i < handData; i++) {
      const cardBack = document.createElement('div');
      cardBack.className = 'card';
      cardBack.style.backgroundColor = '#444';
      cardBack.textContent = '🂠';
      container.appendChild(cardBack);
    }
  }
}

function showMessage(text, isError = false) {
  centerArea.innerHTML = `<p style="color:${isError ? 'red' : 'black'};">${text}</p>`;
}

// Обработка кликов на колоды
doorDeck.addEventListener('click', () => {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    return showMessage('Нет подключения к серверу', true);
  }
  socket.send(JSON.stringify({ type: 'draw-door-card', roomId, playerId }));
});

treasureDeck.addEventListener('click', () => {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    return showMessage('Нет подключения к серверу', true);
  }
  socket.send(JSON.stringify({ type: 'draw-treasure-card', roomId, playerId }));
});

// Инициализация при загрузке
window.addEventListener('DOMContentLoaded', () => {
  // Получаем roomId и playerId из localStorage или URL (как у тебя будет удобно)
  roomId = localStorage.getItem('currentRoomId');
  playerId = localStorage.getItem('playerId');

  if (!roomId || !playerId) {
    showMessage('Ошибка: Не указана комната или ID игрока', true);
    return;
  }

  connectWebSocket();
});
