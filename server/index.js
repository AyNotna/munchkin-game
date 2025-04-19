const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const pool = require('./db');
const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // ← нужно для форм

// Количество раундов для хеширования
const saltRounds = 10;

// Регистрация
app.post('/register', async (req, res) => {
  const { email, password, nickname } = req.body;

  if (!email || !password || !nickname) {
    return res.status(400).send('Все поля обязательны');
  }

  try {
    // Проверка на наличие пользователя с таким email
    const checkUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

    if (checkUser.rows.length > 0) {
      return res.status(409).send('Пользователь с такой почтой уже существует');
    }

    // Хеширование пароля
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Вставка нового пользователя в базу
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
    // Поиск пользователя по email
    const user = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (user.rows.length === 0) {
      return res.status(401).send('Неверная почта или пароль');
    }

    // Сравнение введенного пароля с хешированным
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

// Запуск сервера
app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});
