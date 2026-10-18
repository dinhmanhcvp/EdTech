import { Server, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import { CanvasState, SandboxEvent } from '@socratic/types';

/**
 * Feature 4: Interactive Sandbox Gateway
 * Handles Bidirectional Real-time Sync between Teacher Board (75") and Student App (Mobile)
 */
export function initializeSandboxSockets(io: Server) {
  const sandboxNamespace = io.of('/sandbox');

  sandboxNamespace.on('connection', (socket: Socket) => {
    console.log(`Client connected to sandbox: ${socket.id}`);

    // 1. Join a specific class/lesson room
    socket.on('join_lesson', async ({ lessonId, role }: { lessonId: string; role: 'teacher' | 'student' }) => {
      await socket.join(lessonId);
      socket.data.role = role;
      socket.data.lessonId = lessonId;
      console.log(`[${role}] joined lesson ${lessonId}`);
      
      // Optionally fetch latest state from Redis here and emit to newly joined student
    });

    // 2. Teacher or Student modifies a variable (Zero-Latency Sync)
    socket.on('sync_variable', (event: SandboxEvent) => {
      const { lessonId } = socket.data;
      if (!lessonId) return;

      // Broadcast to EVERYONE ELSE in the room immediately
      // The frontend uses optimistic UI, this ensures peers sync instantly
      socket.to(lessonId).emit('variable_updated', event);

      // (Async) Persist latest state to Redis so late-joiners get current state
      // redisClient.set(`lesson:${lessonId}:state`, JSON.stringify(event.fullState));
    });

    // 3. Teacher triggers "Undo to Ink" or "Reset Sim" (Safety Net)
    socket.on('teacher_override', (action: 'reset_sim' | 'undo_ink') => {
      if (socket.data.role !== 'teacher') {
        return socket.emit('error', 'Unauthorized: Only teachers can override state');
      }
      
      socket.to(socket.data.lessonId).emit('force_override', action);
    });

    // 4. Feature 1: Live Drawing Sync (Edge-Cloud hybridization)
    socket.on('draw_stroke', (canvasState: CanvasState) => {
      // High-frequency event: Emit directly without DB hits
      socket.to(socket.data.lessonId).emit('draw_stroke', canvasState);
    });

    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });
}
