export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const GROQ_KEY = process.env.GROQ_API_KEY
  if (!GROQ_KEY) {
    return res.status(500).json({ error: 'GROQ_API_KEY not configured' })
  }

  try {
    const { prompt } = req.body

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1024,
        temperature: 0.7
      })
    })

    const data = await response.json()
    if (data.error) {
      return res.status(400).json({ error: data.error.message })
    }

    return res.status(200).json({ content: data.choices[0].message.content })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
