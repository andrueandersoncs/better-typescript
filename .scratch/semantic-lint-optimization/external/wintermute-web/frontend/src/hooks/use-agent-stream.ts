import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { MessageData } from '@/types/story';

export function useAgentStream(storyId: string, isRunning: boolean) {
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isRunning || !storyId) {
      return;
    }

    const eventSource = new EventSource(`/api/stories/${storyId}/stream`);

    eventSource.onopen = () => {
      setError(null);
    };

    eventSource.addEventListener('message', (e) => {
      try {
        const data = JSON.parse(e.data) as MessageData;
        setMessages((prev) => [...prev, data]);
      } catch (err) {
        console.error('Failed to parse message:', err);
      }
    });

    eventSource.addEventListener('phase', () => {
      // Invalidate story query to refresh phase data
      queryClient.invalidateQueries({ queryKey: ['stories', storyId] });
    });

    eventSource.addEventListener('status', () => {
      // Invalidate story query to refresh status
      queryClient.invalidateQueries({ queryKey: ['stories', storyId] });
    });

    eventSource.addEventListener('artifact', () => {
      // Invalidate story query to refresh artifacts
      queryClient.invalidateQueries({ queryKey: ['stories', storyId] });
    });

    eventSource.onerror = () => {
      const errorMessage = 'Connection lost. Reconnecting...';
      setError(errorMessage);
      toast.info(errorMessage);
      // EventSource automatically reconnects
    };

    return () => {
      eventSource.close();
    };
  }, [storyId, isRunning, queryClient]);

  const clearMessages = () => setMessages([]);

  return { messages, error, clearMessages };
}
