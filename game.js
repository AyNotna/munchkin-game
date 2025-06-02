// game.js

let socket = null;
let playerId = null;
let roomId = null;
let players = {};

// Вспомогательные функции
function updateHandUI(container, handData, showCards) {
  container.innerHTML = '';

  if (Array.isArray(handData)) {
    if (showCards) {
      handData.forEach(card => {
        const cardDiv = document.createElement('div');
        cardDiv.className = 'card';
        cardDiv.textContent = card.name || 'Карта';
        container.appendChild(cardDiv);
      });
    }
  } else if (typeof handData === 'number') {
    for (let i = 0; i < handData; i++) {
      const cardBack = document.createElement('div');
      cardBack.className = 'card';
      cardBack.style.backgroundColor = '#444';
      cardBack.textContent = '🂠';
      container.appendChild(cardBack);
    }
  }
}

function renderDoorCard(card) {
  const display = document.createElement('div');
  display.id = 'door-card-display';

  const cardDiv = document.createElement('div');
  cardDiv.className = 'card-large';

  const name = document.createElement('div');
  name.className = 'name';
  name.textContent = card.name || 'Без названия';
  cardDiv.appendChild(name);

  if (card.type === 'monster') {
    const level = document.createElement('div');
    level.className = 'level';
    level.textContent = `Уровень: ${card.level}`;
    cardDiv.appendChild(level);

    const effect = document.createElement('div');
    effect.className = 'effect';
    effect.textContent = `Эффект: ${card.effect || '—'}`;
    cardDiv.appendChild(effect);

    if (card.bonus_against) {
      const bonus = document.createElement('div');
      bonus.className = 'effect';
      bonus.textContent = `Бонус против: ${card.bonus_against}`;
      cardDiv.appendChild(bonus);
    }

    const bad = document.createElement('div');
    bad.className = 'bad-stuff';
    bad.textContent = `Непотребство: ${card.bad_stuff || '—'}`;
    cardDiv.appendChild(bad);

    const footer = document.createElement('div');
    footer.className = 'footer';
    footer.innerHTML = `<span>+${card.reward_level || 0} уровень(я)</span><span>💰 ${card.reward_treasure || 0}</span>`;
    cardDiv.appendChild(footer);
  } else if (card.type === 'curse') {
    const description = document.createElement('div');
    description.className = 'description';
    description.textContent = `Описание: ${card.description || '—'}`;
    cardDiv.appendChild(description);

    if (card.effect) {
      const effect = document.createElement('div');
      effect.className = 'effect';
      effect.textContent = `Эффект: ${card.effect}`;
      cardDiv.appendChild(effect);
    }
  }

  display.appendChild(cardDiv);

  const centerArea = document.getElementById('center-area');
  centerArea.innerHTML = '';
  centerArea.appendChild(display);
}

function showMessage(text, isError = false) {
  const centerArea = document.getElementById('center-area');
  centerArea.innerHTML = `<p style="color:${isError ? 'red' : 'black'};">${text}</p>`;
}

window.addEventListener('DOMContentLoaded', () => {
  // DOM-элементы
  const leftPlayerName = document.getElementById('left-player-name');
  const rightPlayerName = document.getElementById('right-player-name');
  const bottomPlayerName = document.getElementById('bottom-player-name');

  const leftPlayerHand = document.getElementById('left-player-hand');
  const rightPlayerHand = document.getElementById('right-player-hand');
  const bottomPlayerHand = document.getElementById('bottom-player-hand');

  const doorDeck = document.getElementById('door-deck');
  const treasureDeck = document.getElementById('treasure-deck');

  const centerArea = document.getElementById('center-area');

  playerId = localStorage.getItem('playerId');
  roomId = localStorage.getItem('currentRoomId');
  const nickname = localStorage.getItem('nickname');

  if (!roomId || !playerId || !nickname) {
    showMessage('Ошибка: Не указаны данные игрока или комнаты', true);
    return;
  }

  // Подключение WebSocket
  socket = new WebSocket('ws://localhost:3000');

  socket.onopen = () => {
    console.log('✅ WebSocket подключён');
    // Отправляем сообщение для входа в комнату
    socket.send(JSON.stringify({ type: 'join-room', roomId, nickname }));
  };

  socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log('📨 От сервера:', data);

    switch (data.type) {
      case 'init-game':
        roomId = data.roomId;
        playerId = data.playerId;
        players = data.players;
        updatePlayersUI();
        showMessage(`Вы в комнате: ${roomId}`);
        break;

      case 'update-players':
        players = data.players;
        updatePlayersUI();
        break;

      case 'game-message':
        showMessage(data.message);
        break;

      case 'error':
        showMessage(`Ошибка: ${data.message}`, true);
        break;

      case 'door-card-drawn':
        renderDoorCard(data.card);
        break;

      // Добавь другие типы сообщений при необходимости
    }
  };

  socket.onerror = (err) => {
    console.error('❌ WebSocket ошибка:', err);
    showMessage('Ошибка соединения с сервером', true);
  };

  socket.onclose = () => {
    console.warn('🔌 WebSocket отключён');
    showMessage('Соединение потеряно', true);
  };

  // Клик по колоде дверей
  doorDeck.addEventListener('click', () => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return showMessage('Нет подключения к серверу', true);
    }
    socket.send(JSON.stringify({ type: 'draw-door-card', roomId, playerId }));
  });

  // Клик по колоде сокровищ
  treasureDeck.addEventListener('click', () => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return showMessage('Нет подключения к серверу', true);
    }
    socket.send(JSON.stringify({ type: 'draw-treasure-card', roomId, playerId }));
  });

  function updatePlayersUI() {
    const ids = Object.keys(players);
    if (!playerId || !ids.includes(playerId)) {
      return showMessage('Ошибка: ваш ID не найден среди игроков', true);
    }

    const myIndex = ids.indexOf(playerId);
    const leftIndex = (myIndex + 1) % ids.length;
    const rightIndex = (myIndex + 2) % ids.length;

    const leftPlayer = players[ids[leftIndex]];
    const rightPlayer = players[ids[rightIndex]];
    const bottomPlayer = players[playerId];

    leftPlayerName.textContent = leftPlayer.nickname || 'Игрок слева';
    rightPlayerName.textContent = rightPlayer.nickname || 'Игрок справа';
    bottomPlayerName.textContent = bottomPlayer.nickname || 'Вы';

    updateHandUI(leftPlayerHand, leftPlayer.hand.length, false);
    updateHandUI(rightPlayerHand, rightPlayer.hand.length, false);
    updateHandUI(bottomPlayerHand, bottomPlayer.hand, true);
  }
});
