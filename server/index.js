const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const pool = require('./db');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = 3000;
const saltRounds = 10;
const rooms = {}; // { roomId: [{ ws, nickname }] }

app.use(cors({
  origin: 'http://127.0.0.1:5500'
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// === WebSocket ===
wss.on('connection', (ws) => {
  ws.on('message', async (message) => {
    let data;
    try {
      data = JSON.parse(message);
    } catch (err) {
      console.error('❌ Ошибка парсинга JSON:', message);
      return;
    }

    const { type, roomId, nickname } = data;

    switch (type) {
      case 'create-room':
        if (!roomId || !nickname) {
          return ws.send(JSON.stringify({ type: 'error', message: 'roomId и nickname обязательны' }));
        }

        if (rooms[roomId]) {
          return ws.send(JSON.stringify({ type: 'error', message: 'Комната уже существует' }));
        }

        rooms[roomId] = [{ ws, nickname }];
        ws.roomId = roomId;
        ws.nickname = nickname;

        ws.send(JSON.stringify({
          type: 'room-created',
          roomId,
          players: [nickname]
        }));
        break;

      case 'join-room':
        if (!roomId || !nickname) {
          return ws.send(JSON.stringify({ type: 'error', message: 'roomId и nickname обязательны' }));
        }

        if (!rooms[roomId]) {
          return ws.send(JSON.stringify({ type: 'error', message: 'Комната не найдена' }));
        }

        rooms[roomId].push({ ws, nickname });
        ws.roomId = roomId;
        ws.nickname = nickname;

        const playerNicknames = rooms[roomId].map(c => c.nickname);

        ws.send(JSON.stringify({
          type: 'joined',
          roomId,
          players: playerNicknames
        }));

        broadcast(roomId, {
          type: 'user-joined',
          nickname,
          players: playerNicknames
        });
        break;

      case 'start-game':
        if (!roomId || !nickname) {
          return ws.send(JSON.stringify({ type: 'error', message: 'roomId и nickname обязательны' }));
        }

        const clients = rooms[roomId];
        if (!clients || clients.length !== 3) {
          return ws.send(JSON.stringify({ type: 'error', message: 'Для начала игры нужно ровно 3 игрока' }));
        }

        const creator = clients[0];
        if (creator.nickname !== nickname) {
          return ws.send(JSON.stringify({ type: 'error', message: 'Только создатель может начать игру' }));
        }

        broadcast(roomId, {
          type: 'game-started'
        });
        break;

      case 'draw-door-card':
        if (!roomId) {
          return ws.send(JSON.stringify({ type: 'error', message: 'roomId обязателен' }));
        }

        try {
          const result = await pool.query(`
            SELECT * FROM cards
            WHERE type IN ('monster', 'curse')
            ORDER BY RANDOM()
            LIMIT 1
          `);

          if (result.rows.length === 0) {
            return ws.send(JSON.stringify({ type: 'error', message: 'Нет доступных карт двери' }));
          }

          const card = result.rows[0];

          ws.send(JSON.stringify({
            type: 'door-card-drawn',
            card
          }));
        } catch (err) {
          console.error('Ошибка при вытягивании карты двери:', err);
          ws.send(JSON.stringify({ type: 'error', message: 'Ошибка при получении карты' }));
        }
        break;

      case 'leave-room':
        handleDisconnect(ws);
        break;

      default:
        ws.send(JSON.stringify({ type: 'error', message: `Неизвестный тип сообщения: ${type}` }));
        break;
    }
  });

  ws.on('close', () => {
    handleDisconnect(ws);
  });
});

// === Утилиты WebSocket ===
function broadcast(roomId, data) {
  const clients = rooms[roomId];
  if (!clients) return;

  clients.forEach(({ ws }) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  });
}

function handleDisconnect(ws) {
  const { roomId, nickname } = ws;
  if (!roomId || !rooms[roomId]) return;

  rooms[roomId] = rooms[roomId].filter(client => client.ws !== ws);

  if (rooms[roomId].length === 0) {
    delete rooms[roomId];
  } else {
    broadcast(roomId, {
      type: 'user-left',
      nickname,
      players: rooms[roomId].map(client => client.nickname),
    });
  }
}

// === REST API ===

app.post('/register', async (req, res) => {
  const { email, password, nickname } = req.body;

  if (!email || !password || !nickname) {
    return res.status(400).send('Все поля обязательны');
  }

  try {
    const checkUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

    if (checkUser.rows.length > 0) {
      return res.status(409).send('Пользователь с такой почтой уже существует');
    }

    const hashedPassword = await bcrypt.hash(password, saltRounds);

    await pool.query(
      'INSERT INTO users (email, password, nickname) VALUES ($1, $2, $3)',
      [email, hashedPassword, nickname]
    );

    res.status(201).send('Пользователь успешно зарегистрирован');
  } catch (err) {
    console.error('Ошибка при регистрации:', err);
    res.status(500).send('Ошибка сервера');
  }
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).send('Email и пароль обязательны');
  }

  try {
    const user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

    if (user.rows.length === 0) {
      return res.status(401).send('Неверная почта или пароль');
    }

    const validPassword = await bcrypt.compare(password, user.rows[0].password);

    if (!validPassword) {
      return res.status(401).send('Неверная почта или пароль');
    }

    res.status(200).send('Успешная авторизация');
  } catch (err) {
    console.error('Ошибка при авторизации:', err);
    res.status(500).send('Ошибка сервера');
  }
});

app.post('/api/save-character', async (req, res) => {
  const { email, character } = req.body;

  if (!email || !character) {
    return res.status(400).send('Email и персонаж обязательны');
  }

  try {
    await pool.query(
      'UPDATE users SET character = $1 WHERE email = $2',
      [character, email]
    );
    res.status(200).send('Персонаж сохранён');
  } catch (err) {
    console.error('Ошибка при сохранении персонажа:', err);
    res.status(500).send('Ошибка сервера');
  }
});

app.get('/api/get-character', async (req, res) => {
  const { email } = req.query;

  if (!email) {
    return res.status(400).send('Email обязателен');
  }

  try {
    const result = await pool.query(
      'SELECT character, nickname FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(404).send('Пользователь не найден');
    }

    res.json({
      character: result.rows[0].character,
      nickname: result.rows[0].nickname
    });
  } catch (err) {
    console.error('Ошибка при получении персонажа и никнейма:', err);
    res.status(500).send('Ошибка сервера');
  }
});

// Получить все карты
app.get('/api/cards', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM cards');
    res.json(result.rows);
  } catch (err) {
    console.error('Ошибка при получении карт:', err);
    res.status(500).send('Ошибка при получении карт');
  }
});

server.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на http://localhost:${PORT}`);
});
