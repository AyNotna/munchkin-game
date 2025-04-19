const express = require('express');
const cors = require('cors');
const app = express();
const pool = require('./db');
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // ← нужно для форм

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

    await pool.query(
      'INSERT INTO users (email, password, nickname) VALUES ($1, $2, $3)',
      [email, password, nickname]
    );

    res.status(201).send('Пользователь успешно зарегистрирован');
  } catch (err) {
    console.error('Ошибка при регистрации:', err);
    res.status(500).send('Ошибка сервера');
  }
});

app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});
