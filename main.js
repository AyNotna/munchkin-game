const playBtn = document.getElementById('play-btn');
const playOptions = document.getElementById('play-options');
const mainMenu = document.getElementById('main-menu');
const backBtn = document.getElementById('back-to-main');
const characterSelect = document.getElementById('character-select');

// Обработка выбора персонажа
function selectCharacter(gender) {
  const email = localStorage.getItem('userEmail');

  if (!email) {
    alert("Пользователь не авторизован");
    return;
  }

  fetch('http://localhost:3000/api/save-character', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, character: gender }) // ❗ исправлено
  })
  .then(response => {
    if (!response.ok) {
      throw new Error("Ошибка при сохранении персонажа");
    }
    return response.text();
  })
  .then(data => {
    console.log(data);
    characterSelect.classList.add('hidden');
    mainMenu.classList.remove('hidden');
  })
  .catch(error => {
    console.error("Ошибка:", error);
    alert("Не удалось сохранить персонажа");
  });
}

// Переход на выбор режима
playBtn.addEventListener('click', () => {
  mainMenu.classList.add('hidden');
  playOptions.classList.remove('hidden');
});

// Назад в главное меню
backBtn.addEventListener('click', () => {
  playOptions.classList.add('hidden');
  mainMenu.classList.remove('hidden');
});

// Проверка: выбран ли уже персонаж
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
    })
    .catch(err => {
      console.error("Ошибка загрузки персонажа:", err);
    });
});
