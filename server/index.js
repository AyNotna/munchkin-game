const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const pool = require('./db');
const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const saltRounds = 10;

// Регистрация
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

// Авторизация
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

// ✅ Сохранение персонажа
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

// ✅ Получение выбранного персонажа
console.log("Регистрируем маршруты /api/save-character и /api/get-character");
app.get('/api/get-character', async (req, res) => {
  const { email } = req.query;

  if (!email) {
    return res.status(400).send('Email обязателен');
  }

  try {
    const result = await pool.query(
      'SELECT character FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(404).send('Пользователь не найден');
    }

    res.json({ character: result.rows[0].character });
  } catch (err) {
    console.error('Ошибка при получении персонажа:', err);
    res.status(500).send('Ошибка сервера');
  }
});

app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});
