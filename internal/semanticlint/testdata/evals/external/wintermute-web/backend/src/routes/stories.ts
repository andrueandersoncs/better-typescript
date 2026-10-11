import { Elysia, t } from 'elysia';
import * as storage from '../services/storage';
import {
  CreateStoryRequestSchema,
  UpdateStoryRequestSchema,
  type ListStoriesResponse,
  type Story,
  type StartStoryResponse,
} from '../types/story';
import {
  NotFoundError,
  ValidationError,
  ConflictError,
} from '../errors';
import { agentManager } from '../services/agent';
import { sessionRegistry } from '../services/session';
import type { Message } from '@anthropic-ai/claude-agent-sdk';

export const storiesRoutes = new Elysia({ prefix: '/api/stories' })
  // List all stories
  .get('/', async (): Promise<ListStoriesResponse> => {
    const stories = await storage.listStories();
    return { stories };
  })

  // Get single story
  .get('/:id', async ({ params }): Promise<Story> => {
    const story = await storage.getStory(params.id);
    return story;
  })

  // Create new story
  .post(
    '/',
    async ({ body, set }): Promise<Story> => {
      // Validate request body
      const validatedData = CreateStoryRequestSchema.parse(body);
      const story = await storage.createStory(validatedData);
      set.status = 201;
      return story;
    },
    {
      body: t.Object({
        story: t.String({ minLength: 1 }),
        source: t.Optional(t.String()),
      }),
    }
  )

  // Update story
  .put(
    '/:id',
    async ({ params, body }): Promise<Story> => {
      // Validate request body
      const validatedData = UpdateStoryRequestSchema.parse(body);

      // Check if story exists and get current state
      const existingStory = await storage.getStory(params.id);

      // Reject update if agent is running
      if (existingStory.agentStatus === 'running') {
        throw new ConflictError('Cannot edit while agent is running');
      }

      // Update story
      const updatedStory = await storage.updateStory(
        params.id,
        validatedData
      );
      return updatedStory;
    },
    {
      body: t.Object({
        story: t.Optional(t.String({ minLength: 1 })),
        source: t.Optional(t.String()),
      }),
    }
  )

  // Delete story
  .delete('/:id', async ({ params, set }) => {
    // Check if story exists and get current state
    const existingStory = await storage.getStory(params.id);

    // Reject delete if agent is running
    if (existingStory.agentStatus === 'running') {
      throw new ConflictError('Cannot delete while agent is running');
    }

    await storage.deleteStory(params.id);
    set.status = 204;
    return;
  })

  // Start agent for a story
  .post('/:id/start', async ({ params, set }): Promise<StartStoryResponse> => {
    const { id } = params;

    // Check if story exists
    const story = await storage.getStory(id);

    // Check if agent is already running
    if (agentManager.isRunning(id)) {
      throw new ConflictError('Agent already running');
    }

    // Create prompt for the agent
    const prompt = `Run the engineering-process workflow for this user story:

${story.story}

Start with the "understand" phase and proceed through all phases.`;

    // Start the agent
    const sessionId = await agentManager.start(id, prompt);

    // Register session
    sessionRegistry.register(id, sessionId);

    set.status = 200;
    return {
      id,
      agentStatus: 'running',
      sessionId,
      streamUrl: `/api/stories/${id}/stream`,
    };
  })

  // Pause running agent
  .post('/:id/pause', async ({ params, set }) => {
    const { id } = params;

    // Check if story exists
    const story = await storage.getStory(id);

    // Check if agent is running
    if (!agentManager.isRunning(id)) {
      throw new ConflictError('Agent is not running');
    }

    // Pause the agent
    agentManager.pause(id);

    // Update story status
    await storage.updateStory(id, {
      agentStatus: 'paused',
    });

    set.status = 200;
    return {
      id,
      agentStatus: 'paused',
      sessionId: story.sessionId,
    };
  })

  // Resume paused agent
  .post('/:id/resume', async ({ params, set }) => {
    const { id } = params;

    // Check if story exists
    const story = await storage.getStory(id);

    // Check if story has a session ID
    if (!story.sessionId) {
      throw new ValidationError('Story has no session to resume');
    }

    // Check if agent is already running
    if (agentManager.isRunning(id)) {
      throw new ConflictError('Agent already running');
    }

    // Resume the agent
    await agentManager.resume(id, story.sessionId);

    set.status = 200;
    return {
      id,
      agentStatus: 'running',
      sessionId: story.sessionId,
      streamUrl: `/api/stories/${id}/stream`,
    };
  })

  // Stream agent messages (SSE)
  .get('/:id/stream', async ({ params, set, request }) => {
    const { id } = params;

    // Check if story exists
    const story = await storage.getStory(id);

    // Check if agent is running
    if (!agentManager.isRunning(id)) {
      throw new ConflictError('Agent is not running for this story');
    }

    // Set SSE headers
    set.headers = {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    };

    // Create a readable stream for SSE
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        // Helper to send SSE event
        const sendEvent = (event: string, data: any) => {
          const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(message));
        };

        // Set up heartbeat
        const heartbeatInterval = setInterval(() => {
          try {
            sendEvent('heartbeat', { timestamp: new Date().toISOString() });
          } catch (error) {
            clearInterval(heartbeatInterval);
          }
        }, 30000);

        try {
          // Stream messages from the agent
          for await (const message of agentManager.stream(id)) {
            // Send message event
            sendEvent('message', {
              type: message.type,
              content: 'content' in message ? message.content : '',
            });

            // Check for phase transitions in the updated story
            const updatedStory = await storage.getStory(id);
            if (updatedStory.currentPhase !== story.currentPhase) {
              sendEvent('phase', {
                phase: updatedStory.currentPhase,
                completedPhases: updatedStory.completedPhases,
              });
              // Update local reference
              story.currentPhase = updatedStory.currentPhase;
              story.completedPhases = updatedStory.completedPhases;
            }

            // Send artifact events if new artifacts are found
            if (Object.keys(updatedStory.artifacts).length > Object.keys(story.artifacts).length) {
              for (const [type, path] of Object.entries(updatedStory.artifacts)) {
                if (!story.artifacts[type]) {
                  sendEvent('artifact', { type, path });
                }
              }
              story.artifacts = updatedStory.artifacts;
            }
          }

          // Stream ended - send completion status
          sendEvent('status', { agentStatus: 'completed' });
        } catch (error) {
          // Send error event
          sendEvent('error', {
            error: error instanceof Error ? error.message : 'Unknown error',
            code: 'AGENT_ERROR',
          });
        } finally {
          clearInterval(heartbeatInterval);
          controller.close();

          // Unregister session
          sessionRegistry.unregister(id);
        }
      },
    });

    return new Response(stream);
  });
