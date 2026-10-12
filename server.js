const express = require('express');
const app = express();
const PORT = process.env.PORT || 8080;

// Получаем секрет из переменных окружения
const MY_SECRET = process.env.MY_SECRET_KEY;

app.get('/api/my-function', (req, res) => {
  if (!MY_SECRET) {
    return res.status(500).json({ error: 'Секрет не настроен на сервере' });
  }

  // --- ТУТ ВАШ ТЕКУЩИЙ КОД ФУНКЦИИ ---
  const result = `Функция выполнена. Секрет: ${MY_SECRET.substring(0, 3)}***`;
  // ----------------------------------

  res.json({ status: 'success', result: result });
});

app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});

