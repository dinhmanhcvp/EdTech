import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createClient } from 'redis';
import { createAdapter } from '@socket.io/redis-adapter';
import { initializeSandboxSockets } from './sockets/sandboxGateway';

const PORT = process.env.PORT || 4000;
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

async function bootstrap() {
  const app = express();
  app.use(express.json());

  // 1. Healthcheck Endpoint
  app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'API Gateway is Operational', version: '1.0.0' });
  });

  // 2. Proxy Route to Python AI Engine (Hide AI complexity from Frontends)
  app.post('/api/socratic-proxy', async (req: Request, res: Response) => {
    // In production, this proxies requests to the Python FastAPI securely
    // adding JWT authentication layers here before hitting the AI
    res.status(200).json({ message: 'Proxied to AI Engine' });
  });

  // 3. HTTP Server Setup for WebSockets
  const httpServer = createServer(app);
  
  // 4. Enterprise Socket.io Setup with Redis Adapter
  const io = new Server(httpServer, {
    cors: {
      origin: '*', // Allow connections from Next.js frontends
      methods: ['GET', 'POST']
    }
  });

  try {
    const pubClient = createClient({ url: REDIS_URL });
    const subClient = pubClient.duplicate();

    await Promise.all([pubClient.connect(), subClient.connect()]);
    
    // Áp dụng Redis Adapter để Scale-out nhiều máy chủ Socket.io
    io.adapter(createAdapter(pubClient, subClient));
    console.log('[Redis] Connected and Adapter bound to Socket.io');

  } catch (err) {
    console.warn('[Redis] Connection failed, running in Memory mode (Single Instance).');
  }

  // 5. Initialize Core Domain Sockets (Feature 4 - Sandbox Real-time Sync)
  initializeSandboxSockets(io);

  // 6. Start the Server
  httpServer.listen(PORT, () => {
    console.log(`[API Gateway] Orchestrating traffic on port ${PORT}`);
    console.log(`[API Gateway] WebSocket Engine Ready for Low-Latency Sync`);
  });
}

bootstrap().catch(console.error);
