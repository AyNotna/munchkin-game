const pool = require('./db');
const fs = require('fs');

const importCards = async () => {
  const cards = JSON.parse(fs.readFileSync('cards.json', 'utf-8'));

  for (const card of cards) {
    try {
      await pool.query(
        `
        INSERT INTO cards
        (name, type, level, bonus, bonus_against, reward_level, reward_treasure, bad_stuff, effect, equipment_slot, usable_by, description)
        VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `,
        [
          card.name,
          card.type,
          card.level,
          card.bonus,
          card.bonus_against,
          card.reward_level,
          card.reward_treasure,
          card.bad_stuff,
          card.effect,
          card.equipment_slot,
          card.usable_by,
          card.description,
        ]
      );
      console.log(`Карта "${card.name}" добавлена.`);
    } catch (err) {
      console.error(`Ошибка с картой "${card.name}":`, err.message);
    }
  }

  pool.end();
};

importCards();
