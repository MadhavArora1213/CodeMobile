require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { handleTerminalWS } = require('./ws/terminalWS');
const authRoutes = require('./routes/auth');
const authMiddleware = require('./middleware/auth');
const errorHandler = require('./middleware/errors');
const axios = require('axios');
const cors = require('cors');
const helmet = require('helmet');

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);

// M12 - AI Proxy (Streaming enabled)
app.post('/api/ai/chat', async (req, res) => {
  const { prompt, context, stream = false } = req.body;
  
  const systemPrompt = `You are CodeMobile AI Assistant. 
    Generate complete, working code. Include comments. Use best practices.
    Multilingual support: English, Hindi, Hinglish.
    Context:
    ${context}
  `;

  try {
    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      const ollamaRes = await axios({
        method: 'post',
        url: (process.env.OLLAMA_URL || 'http://localhost:11434') + '/api/generate',
        data: { model: 'qwen2.5:latest', system: systemPrompt, prompt, stream: true },
        responseType: 'stream'
      });

      ollamaRes.data.on('data', chunk => {
        const lines = chunk.toString().split('\n');
        for (const line of lines) {
          if (!line.trim()) continue;
          const parsed = JSON.parse(line);
          if (parsed.response) res.write(`data: ${JSON.stringify({ text: parsed.response })}\n\n`);
          if (parsed.done) {
            res.write('data: [DONE]\n\n');
            res.end();
          }
        }
      });
    } else {
      const response = await axios.post((process.env.OLLAMA_URL || 'http://localhost:11434') + '/api/generate', {
        model: 'qwen2.5:latest',
        system: systemPrompt,
        prompt: prompt,
        stream: false,
      });
      res.json({ response: response.data.response });
    }
  } catch (error) {
    console.error('AI Proxy Error Detail:', error.message);
    if (error.response) {
      console.error('Ollama Response Error:', error.response.status, error.response.data);
    }
    res.status(500).json({ error: 'AI Proxy Error', details: error.message });
  }
});

const vm = require('node:vm');

// M16 - Code Execution Proxy (Local JS Runner + Cloud Fallback)
// M16 - Code Execution Proxy (Exclusive Piston Runner)
app.post('/api/execute', async (req, res) => {
  const { language, version, files, stdin, args } = req.body;

  try {
    const pistonUrl = process.env.PISTON_URL || 'https://emkc.org/api/v2/piston/execute';
    console.log(`⚡ Using Piston for ${language} execution...`);
    
    // Some versions of Piston use /api/v2/piston/execute
    // Others might use /api/v2/piston
    const targetUrl = pistonUrl.includes('/execute') ? pistonUrl : pistonUrl + '/execute';

    const response = await axios.post(targetUrl, {
      language,
      version: version || '*',
      files: files || [],
      stdin: stdin || "",
      args: args || [],
      compile_timeout: 10000,
      run_timeout: 3000
    });

    res.json(response.data);

  } catch (error) {
    if (error.response) {
      console.error('Piston Error Response:', error.response.data);
    }
    console.error('Piston Execution Error:', error.message);
    res.status(500).json({ error: 'Execution Failed', details: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date() });
});

// Error handling - MUST be last middleware
app.use(errorHandler);

// Server setup
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// WebSocket Routing
wss.on('connection', (ws, req) => {
  if (req.url.startsWith('/terminal')) {
    handleTerminalWS(ws, req);
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 CodeMobile Backend running on port ${PORT}`);
});
