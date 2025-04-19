const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',        // имя пользователя, чаще всего postgres
  host: 'localhost',       // или 127.0.0.1
  database: 'munchkin',    // имя твоей базы (ты создавал её)
  password: '12345678', // замени на свой пароль
  port: 5432,              // стандартный порт PostgreSQL
});

module.exports = pool;
