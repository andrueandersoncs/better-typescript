import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function SkeletonDetail() {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header skeleton */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <Button variant="ghost" size="sm" disabled>
              ← Back
            </Button>
            <div className="h-6 w-20 bg-muted rounded animate-pulse" />
          </div>
          <div className="h-8 bg-muted rounded w-3/4 mb-2 animate-pulse" />
          <div className="flex items-center gap-4">
            <div className="h-4 w-40 bg-muted rounded animate-pulse" />
            <div className="h-4 w-40 bg-muted rounded animate-pulse" />
          </div>
        </div>
      </div>

      {/* Progress skeleton */}
      <Card>
        <CardHeader>
          <div className="h-6 bg-muted rounded w-48 animate-pulse" />
          <div className="h-4 bg-muted rounded w-full mt-2 animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="h-24 bg-muted rounded animate-pulse" />
        </CardContent>
      </Card>

      {/* Actions skeleton */}
      <Card>
        <CardHeader>
          <div className="h-6 bg-muted rounded w-24 animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <div className="h-10 w-24 bg-muted rounded animate-pulse" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
