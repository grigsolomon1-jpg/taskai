export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  
  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'API ключ не настроен' });
  }

  try {
    const { messages, system, mode } = req.body;
    
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Нет сообщений' });
    }

    const today = new Date().toLocaleDateString('ru-RU', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    let systemPrompt = system || '';
    
    if (mode === 'parse') {
      systemPrompt = `Ты AI-парсер задач. Сегодня: ${today}.

Извлеки задачи из текста и верни ТОЛЬКО JSON массив (без markdown, без пояснений):
[{"title":"название","priority":"urgent|important|inwork|later","deadline":"YYYY-MM-DD или null"}]

Правила приоритетов:
- "срочно", "немедленно", "критично", "asap" → "urgent"
- "важно", "обязательно", "приоритет" → "important"  
- "потом", "когда-нибудь", "не срочно", "низкий приоритет" → "later"
- если не указано → "inwork"

Правила дат:
- "завтра" → завтрашняя дата (${new Date(Date.now() + 86400000).toISOString().split('T')[0]})
- "послезавтра" → через 2 дня
- "в понедельник", "во вторник" и т.д. → ближайший такой день
- "на следующей неделе" → ближайший понедельник + 7 дней
- "через N дней" → соответствующая дата

Если задач нет, верни пустой массив: []

Примеры:
"Позвонить клиенту завтра" → [{"title":"Позвонить клиенту","priority":"inwork","deadline":"${new Date(Date.now() + 86400000).toISOString().split('T')[0]}"}]
"Срочно отправить отчет" → [{"title":"Отправить отчет","priority":"urgent","deadline":null}]`;
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        system: systemPrompt,
        messages: messages
      })
    });

    const data = await response.json();
    
    if (data.error) {
      return res.status(400).json({ 
        error: data.error.message || 'Ошибка API'
      });
    }

    if (!data.content || !data.content[0] || !data.content[0].text) {
      return res.status(500).json({ error: 'Пустой ответ от AI' });
    }

    // Возвращаем только текст, без обёрток
    return res.status(200).json({ 
      content: data.content[0].text 
    });
    
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      error: 'Ошибка сервера: ' + error.message 
    });
  }
}
