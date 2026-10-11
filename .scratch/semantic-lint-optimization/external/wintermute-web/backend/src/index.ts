import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { storiesRoutes } from './routes/stories';
import { formatError } from './errors';
import { sessionRegistry } from './services/session';

// Initialize session registry on startup
await sessionRegistry.initialize();

const app = new Elysia()
  // Enable CORS for frontend
  .use(
    cors({
      origin: process.env.NODE_ENV === 'production'
        ? 'http://localhost:5173'
        : true,
      credentials: true,
    })
  )

  // Global error handler
  .onError(({ error, set }) => {
    const formatted = formatError(error);
    set.status = formatted.status as 200 | 201 | 204 | 400 | 404 | 409 | 500;
    return formatted.body;
  })

  // Health check endpoint
  .get('/api/health', () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
  }))

  // Mount story routes
  .use(storiesRoutes)

  .listen(3001);

console.log(
  `🦊 Backend is running at ${app.server?.hostname}:${app.server?.port}`
);
