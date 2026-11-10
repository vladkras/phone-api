const express = require('express');

const app = express();
const PORT = process.env.PORT || 8080;

const MAX_API_TOKEN = process.env.MAX_API_TOKEN;
const MAX_CHAT_ID = process.env.MAX_CHAT_ID || '-76883267657110';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Форма на сайте ходит на этот контейнер cross-origin (Content-Type: application/json
// и Authorization → браузер делает preflight OPTIONS): без этих заголовков запрос падает.
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Container Apps опрашивает /health, чтобы понять, что ревизия жива
app.get(['/health', '/ready', '/ping'], (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/', (req, res) => {
  res.type('text/plain').send('phone-api is running');
});

// Получаем телефон и страницу, с которой пришла заявка, и отправляем их в MAX
app.post('/phone-form', async (req, res) => {
  const phone = String(req.body?.phone ?? '').trim();
  const url = String(req.body?.url ?? '').trim();

  if (!phone || !url) {
    console.log(`phone-form: phone and url are required, body=${JSON.stringify(req.body)}`);
    return res.status(400).json({ status: 'error', error: 'phone and url required' });
  }

  const text = `📞 Новая заявка с сайта\n\nТелефон: ${phone}\nСтраница: ${url}`;

  try {
    const response = await fetch(
      `https://platform-api2.max.ru/messages?chat_id=${MAX_CHAT_ID}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: MAX_API_TOKEN,
        },
        body: JSON.stringify({ text }),
      }
    );

    const result = await response.text();

    if (!response.ok) {
      console.log(`phone-form: MAX API error ${response.status}: ${result}`);
      return res.status(502).json({ status: 'error', result });
    }

    console.log(`phone-form: ${phone} (${url}) sent to chat ${MAX_CHAT_ID}`);
    res.json({ status: 'success' });
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
