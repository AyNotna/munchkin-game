// Функция для перехода между шагами
function goToStep(stepId) {
  document.querySelectorAll('.form-card').forEach(card => card.classList.add('hidden'));
  document.getElementById(stepId).classList.remove('hidden');
}

// Элементы для регистрации
const emailInput = document.getElementById('register-email');
const passwordInput = document.getElementById('register-password');
const nicknameInput = document.getElementById('nickname');
const submitBtn = document.getElementById('submit-register');
const emailStepNextBtn = document.getElementById('email-step-next');

// Поля ошибок
const emailError = document.getElementById('email-error');
const passwordError = document.getElementById('password-error');
const nicknameError = document.getElementById('nickname-error');

// Валидация Email и Пароля на первой плашке
emailStepNextBtn.addEventListener('click', () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  let valid = true;

  // Валидация email
  const emailRegex = /^[^\s@]+@[^\s@]+\.(ru|com|net|org)$/i;
  if (!emailRegex.test(email)) {
    emailError.textContent = 'Некорректный email (например, user@mail.ru)';
    emailInput.classList.add('invalid');
    valid = false;
  }

  // Валидация пароля
  if (password.length < 6) {
    passwordError.textContent = 'Пароль должен быть минимум 6 символов';
    passwordInput.classList.add('invalid');
    valid = false;
  }

  if (valid) {
    goToStep('step-code');
  }
});

// Очистка ошибок при вводе
emailInput.addEventListener('input', () => {
  if (emailInput.classList.contains('invalid')) {
    const email = emailInput.value.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.(ru|com|net|org)$/i;
    if (emailRegex.test(email)) {
      emailError.textContent = '';
      emailInput.classList.remove('invalid');
    }
  }
});

passwordInput.addEventListener('input', () => {
  if (passwordInput.classList.contains('invalid')) {
    const password = passwordInput.value.trim();
    if (password.length >= 6) {
      passwordError.textContent = '';
      passwordInput.classList.remove('invalid');
    }
  }
});

nicknameInput.addEventListener('input', () => {
  if (nicknameInput.classList.contains('invalid')) {
    const nickname = nicknameInput.value.trim();
    if (nickname.length >= 3) {
      nicknameError.textContent = '';
      nicknameInput.classList.remove('invalid');
    }
  }
});

// Отправка формы регистрации
submitBtn.addEventListener('click', async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();
  const nickname = nicknameInput.value.trim();

  let valid = true;

  if (nickname.length < 3) {
    nicknameError.textContent = 'Никнейм должен быть минимум 3 символа';
    nicknameInput.classList.add('invalid');
    valid = false;
  }

  if (!valid) return;

  try {
    const response = await fetch('http://localhost:3000/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, nickname })
    });

    const message = await response.text();

    if (response.ok) {
      alert('Регистрация прошла успешно!');
      goToStep('step-login');
    } else {
      nicknameError.textContent = message;
    }
  } catch (err) {
    nicknameError.textContent = 'Ошибка подключения к серверу';
    console.error(err);
  }
});

// Авторизация
const loginBtn = document.getElementById('login-btn');

loginBtn.addEventListener('click', async () => {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value.trim();

  if (!email || !password) {
    return alert('Введите все поля');
  }

  try {
    const response = await fetch('http://localhost:3000/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (response.ok) {
      window.location.href = 'main.html'; // Переход на главную страницу
    } else {
      alert('Неверная почта или пароль');
    }
  } catch (err) {
    alert('Сервер не отвечает');
    console.error(err);
  }
});
