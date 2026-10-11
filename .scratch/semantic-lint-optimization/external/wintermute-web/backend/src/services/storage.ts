import { existsSync } from 'fs';
import { mkdir, readdir, unlink, rename } from 'fs/promises';
import { homedir } from 'os';
import { join, basename } from 'path';
import { randomUUID } from 'crypto';
import type { Story, CreateStoryRequest } from '../types/story';
import { StorySchema } from '../types/story';
import { NotFoundError, ValidationError } from '../errors';

const STORIES_DIR = join(homedir(), '.claude', 'stories');

// Ensure the stories directory exists
async function ensureStoriesDirectory(): Promise<void> {
  if (!existsSync(STORIES_DIR)) {
    await mkdir(STORIES_DIR, { recursive: true });
  }
}

// Validate story ID to prevent path traversal attacks
function validateStoryId(id: string): void {
  // UUID v4 format validation
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    throw new ValidationError('Invalid story ID format');
  }
  // Ensure no path traversal
  if (id.includes('..') || id.includes('/') || id.includes('\\')) {
    throw new ValidationError('Invalid story ID format');
  }
}

// Get the file path for a story ID
function getStoryPath(id: string): string {
  validateStoryId(id);
  return join(STORIES_DIR, `${id}.json`);
}

// Check if a string is a valid UUID v4 format
function isValidUUID(id: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

// List all stories
export async function listStories(): Promise<Story[]> {
  await ensureStoriesDirectory();

  const files = await readdir(STORIES_DIR);

  // Filter to only JSON files with valid UUID names
  const storyFiles = files.filter((file) => {
    if (!file.endsWith('.json')) return false;
    const id = basename(file, '.json');
    return isValidUUID(id);
  });

  const stories = await Promise.all(
    storyFiles.map(async (file) => {
      try {
        const id = basename(file, '.json');
        return await getStory(id);
      } catch (error) {
        // Skip files that fail to parse
        console.error(`Failed to read story file ${file}:`, error);
        return null;
      }
    })
  );

  // Filter out null values from failed reads
  return stories.filter((story): story is Story => story !== null);
}

// Get a single story by ID
export async function getStory(id: string): Promise<Story> {
  const filePath = getStoryPath(id);

  if (!existsSync(filePath)) {
    throw new NotFoundError(`Story not found: ${id}`);
  }

  const file = Bun.file(filePath);
  const content = await file.text();
  const data = JSON.parse(content);

  // Validate the story data
  const story = StorySchema.parse(data);
  return story;
}

// Create a new story
export async function createStory(
  data: CreateStoryRequest
): Promise<Story> {
  await ensureStoriesDirectory();

  const now = new Date().toISOString();
  const story: Story = {
    id: randomUUID(),
    story: data.story,
    source: data.source || 'direct',
    agentStatus: 'idle',
    currentPhase: 'understand',
    completedPhases: [],
    startedAt: now,
    updatedAt: now,
    artifacts: {},
  };

  const filePath = getStoryPath(story.id);
  await Bun.write(filePath, JSON.stringify(story, null, 2));

  return story;
}

// Update an existing story (atomic write)
export async function updateStory(
  id: string,
  updates: Partial<Story>
): Promise<Story> {
  const existingStory = await getStory(id);

  const updatedStory: Story = {
    ...existingStory,
    ...updates,
    id: existingStory.id, // Prevent ID change
    updatedAt: new Date().toISOString(),
  };

  // Validate the updated story
  const validatedStory = StorySchema.parse(updatedStory);

  // Atomic write: write to temp file, then rename
  const filePath = getStoryPath(id);
  const tempPath = `${filePath}.tmp`;

  // Write to temp file
  await Bun.write(tempPath, JSON.stringify(validatedStory, null, 2));

  // Atomic rename operation (replaces the target file)
  await rename(tempPath, filePath);

  return validatedStory;
}

// Delete a story
export async function deleteStory(id: string): Promise<void> {
  const filePath = getStoryPath(id);

  if (!existsSync(filePath)) {
    throw new NotFoundError(`Story not found: ${id}`);
  }

  await unlink(filePath);
}
