export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'API key not configured', details: 'No key found' });
  }

  try {
    const { messages, system, mode } = req.body;
    const today = new Date().toLocaleDateString('ru-RU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    
    let systemPrompt = system;
    if (mode === 'parse') {
      systemPrompt = `Ты AI-парсер задач. Сегодня: ${today}. Извлеки задачи из текста и верни JSON массив: [{"title":"задача","priority":"urgent|high|medium|low","deadline":"YYYY-MM-DD или null","category":"work|personal|finance|health|other"}]. "завтра"=завтрашняя дата, "срочно"=urgent, "важно"=high. Если нет задач, верни [].`;
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
      return res.status(400).json({ error: data.error.message, type: data.error.type });
    }
    
    return res.status(200).json({ content: data.content[0].text });
  } catch (error) {
    return res.status(500).json({ error: error.message, stack: error.stack });
  }
}
