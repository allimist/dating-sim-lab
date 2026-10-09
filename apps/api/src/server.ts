import Fastify, { type FastifyReply, type FastifyRequest } from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import { fileURLToPath } from 'node:url';
import { GameError } from '@dsl/engine';
import { migrate, pool, seedDemoAccounts } from './db';
import { HttpError } from './store';
import { authRoutes } from './routes/auth';
import { gameRoutes } from './routes/game';
import { conversationRoutes } from './routes/conversations';
import { leaderboardRoutes } from './routes/leaderboard';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}
declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { id: number };
    user: { id: number };
  }
}

const app = Fastify({ logger: { level: process.env.LOG_LEVEL ?? 'info' } });

await app.register(cors, { origin: process.env.CORS_ORIGIN?.split(',') ?? true });
await app.register(jwt, { secret: process.env.JWT_SECRET ?? 'local-learning-secret', sign: { expiresIn: '7d' } });

app.decorate('authenticate', async (req: FastifyRequest, reply: FastifyReply) => {
  try {
    await req.jwtVerify();
  } catch {
    reply.code(401).send({ error: 'unauthorized', message: 'Please log in.' });
  }
});

app.setErrorHandler((err: any, _req, reply) => {
  if (err instanceof HttpError) return reply.code(err.status).send({ error: err.code, message: err.message });
  if (err instanceof GameError) return reply.code(409).send({ error: err.code, message: err.message });
  if (err?.code === '23505') return reply.code(409).send({ error: 'conflict', message: 'Something changed at the same time. Try again.' });
  if (err?.validation) return reply.code(400).send({ error: 'bad_request', message: err.message });
  app.log.error(err);
  return reply.code(500).send({ error: 'server_error', message: 'Something went wrong.' });
});

app.get('/api/health', async () => {
  await pool.query('SELECT 1');
  return { ok: true };
});

await app.register(authRoutes);
await app.register(gameRoutes);
await app.register(conversationRoutes);
await app.register(leaderboardRoutes);

const schema = process.env.SCHEMA_PATH ?? fileURLToPath(new URL('../../../database/schema.sql', import.meta.url));
await migrate(schema);
await seedDemoAccounts();

const port = Number(process.env.PORT ?? 3050);
await app.listen({ port, host: '0.0.0.0' });
