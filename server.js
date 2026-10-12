const express = require('express');

const app = express();
const PORT = process.env.PORT || 8080;

const MAX_API_TOKEN = process.env.MAX_API_TOKEN;
const MAX_CHAT_ID = process.env.MAX_CHAT_ID || '-76883267657110';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Container Apps опрашивает /health, чтобы понять, что ревизия жива
app.get(['/health', '/ready', '/ping'], (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/', (req, res) => {
  res.type('text/plain').send('phone-api is running');
});

// Получаем телефон из тела запроса и отправляем его в MAX
app.post('/phone-form', async (req, res) => {
  const phone = String((req.body && req.body.phone) ?? req.query.phone ?? '').trim();

  if (!phone) {
    console.log(`phone-form: phone is empty, body=${JSON.stringify(req.body)}`);
    return res.status(400).json({ status: 'error', error: 'phone required' });
  }

  try {
    const response = await fetch(
      `https://platform-api2.max.ru/messages?chat_id=${MAX_CHAT_ID}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: MAX_API_TOKEN,
        },
        body: JSON.stringify({ text: phone }),
      }
    );

    const result = await response.text();

    if (!response.ok) {
      console.log(`phone-form: MAX API error ${response.status}: ${result}`);
      return res.status(502).json({ status: 'error', result });
    }

    console.log(`phone-form: ${phone} sent to chat ${MAX_CHAT_ID}`);
    res.json({ status: 'success', result });
  } catch (err) {
    // fetch прячет настоящую причину (TLS/DNS/connect) в err.cause
    const cause = (err.cause && (err.cause.message || err.cause.code)) || '';
    console.log(err);
    console.log(`phone-form: request to MAX API failed: ${err.message}${cause ? ` / ${cause}` : ''}`);
    res.status(502).json({ status: 'error', error: err.message, cause });
  }
});

// Container Apps требует слушать 0.0.0.0 на порту из переменной PORT
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server started on 0.0.0.0:${PORT}`);
});

// Container Apps присылает SIGTERM при остановке контейнера или новой ревизии
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down');
  server.close(() => process.exit(0));
});
