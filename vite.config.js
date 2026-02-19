import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

function groqDevPlugin() {
  let groqKey = ''
  return {
    name: 'groq-dev',
    configResolved(config) {
      groqKey = loadEnv(config.mode, config.root, '')['GROQ_API_KEY'] || ''
    },
    configureServer(server) {
      server.middlewares.use('/api/analyze', async (req, res) => {
        if (req.method !== 'POST') {
          res.writeHead(405, { 'Content-Type': 'application/json' })
          return res.end(JSON.stringify({ error: 'Method not allowed' }))
        }
        let body = ''
        for await (const chunk of req) body += chunk
        try {
          const { prompt } = JSON.parse(body)
          const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${groqKey}`
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
            res.writeHead(400, { 'Content-Type': 'application/json' })
            return res.end(JSON.stringify({ error: data.error.message }))
          }
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ content: data.choices[0].message.content }))
        } catch (e) {
          res.writeHead(500, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: e.message }))
        }
      })
    }
  }
}

export default defineConfig({
  plugins: [vue(), groqDevPlugin()],
})
