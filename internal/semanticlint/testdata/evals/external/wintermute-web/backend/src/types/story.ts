import { z } from 'zod';

// Core enums
export const AgentStatusSchema = z.enum([
  'idle',
  'running',
  'paused',
  'completed',
  'error',
]);

export const WorkflowPhaseSchema = z.enum([
  'understand',
  'research',
  'scope',
  'design',
  'decompose',
  'implement',
  'validate',
  'deploy',
  'complete',
]);

export const ArtifactTypeSchema = z.enum([
  'research',
  'design',
  'tasks',
  'pr',
]);

// Derived types
export type AgentStatus = z.infer<typeof AgentStatusSchema>;
export type WorkflowPhase = z.infer<typeof WorkflowPhaseSchema>;
export type ArtifactType = z.infer<typeof ArtifactTypeSchema>;

// Core Story schema
export const StorySchema = z.object({
  id: z.string().uuid(),
  story: z.string().min(1),
  source: z.string(),
  sessionId: z.string().optional(),
  agentStatus: AgentStatusSchema,
  currentPhase: WorkflowPhaseSchema,
  completedPhases: z.array(WorkflowPhaseSchema),
  startedAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  lastMessage: z.string().optional(),
  error: z.string().optional(),
  artifacts: z.record(z.string(), z.string()),
});

export type Story = z.infer<typeof StorySchema>;

// API request schemas
export const CreateStoryRequestSchema = z.object({
  story: z.string().min(1, 'Story description is required'),
  source: z.string().default('direct'),
});

export const UpdateStoryRequestSchema = z.object({
  story: z.string().min(1).optional(),
  source: z.string().optional(),
});

// Derived request/response types
export type CreateStoryRequest = z.infer<typeof CreateStoryRequestSchema>;
export type UpdateStoryRequest = z.infer<typeof UpdateStoryRequestSchema>;

export interface ListStoriesResponse {
  stories: Story[];
}

export interface StartStoryResponse {
  id: string;
  agentStatus: 'running';
  sessionId: string;
  streamUrl: string;
}

// Error response types
export interface ErrorResponse {
  error: string;
  code: string;
}

// Error codes
export enum ErrorCode {
  STORY_NOT_FOUND = 'STORY_NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AGENT_RUNNING = 'AGENT_RUNNING',
  ALREADY_RUNNING = 'ALREADY_RUNNING',
  AGENT_ERROR = 'AGENT_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}
