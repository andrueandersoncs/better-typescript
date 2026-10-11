import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { StatusBadge } from '@/components/status-badge';
import { PhaseIndicator } from '@/components/phase-indicator';
import type { Story } from '@/types/story';

interface StoryCardProps {
  story: Story;
}

export function StoryCard({ story }: StoryCardProps) {
  const navigate = useNavigate();

  const truncateStory = (text: string, maxLength: number = 120) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  };

  return (
    <Card
      className="cursor-pointer hover:border-primary transition-colors"
      onClick={() => navigate(`/${story.id}`)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <h3 className="text-lg font-semibold line-clamp-2 flex-1">
            {truncateStory(story.story, 80)}
          </h3>
          <StatusBadge status={story.agentStatus} />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <PhaseIndicator phase={story.currentPhase} compact />
        {story.lastMessage && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {story.lastMessage}
          </p>
        )}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Started: {new Date(story.startedAt).toLocaleDateString()}</span>
          <span>{story.completedPhases.length}/8 phases</span>
        </div>
      </CardContent>
    </Card>
  );
}
