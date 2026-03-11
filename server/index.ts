import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import { WebSocketServer } from 'ws';
import { getDb } from './db/index.js';
import { characterRoutes } from './routes/character.js';
import { sceneRoutes } from './routes/scene.js';
import { taskRoutes } from './routes/task.js';
import { WSManager } from './services/wsManager.js';

dotenv.config({ path: '../.env' });

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

app.use(cors());
app.use(express.json({ limit: '5mb' }));

// Initialize database
getDb();

// Health check
app.get('/api/health', (_req, res) => {
  const apiKeyConfigured = !!process.env.ANTHROPIC_API_KEY;
  res.json({
    status: apiKeyConfigured ? 'ok' : 'degraded',
    apiKeyConfigured,
    dbReady: true,
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use('/api/character', characterRoutes);
app.use('/api/scene', sceneRoutes);
app.use('/api/task', taskRoutes);

// Create HTTP server and attach WebSocket
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

// Initialize WebSocket manager
WSManager.init(wss);

wss.on('connection', (ws) => {
  console.log('WebSocket client connected');
  ws.on('close', () => console.log('WebSocket client disconnected'));
});

server.listen(PORT, () => {
  console.log(`Pixel Agent server running on http://localhost:${PORT}`);
  console.log(`WebSocket server on ws://localhost:${PORT}/ws`);
  console.log(`API key configured: ${!!process.env.ANTHROPIC_API_KEY}`);
});
