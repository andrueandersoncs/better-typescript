import type { WorkflowPhase } from '@/types/story';

interface PhaseProgressProps {
  currentPhase: WorkflowPhase;
  completedPhases: WorkflowPhase[];
}

const phases: WorkflowPhase[] = [
  'understand',
  'research',
  'scope',
  'design',
  'decompose',
  'implement',
  'validate',
  'deploy',
];

const phaseLabels: Record<WorkflowPhase, string> = {
  understand: 'Understand',
  research: 'Research',
  scope: 'Scope',
  design: 'Design',
  decompose: 'Decompose',
  implement: 'Implement',
  validate: 'Validate',
  deploy: 'Deploy',
  complete: 'Complete',
};

export function PhaseProgress({ currentPhase, completedPhases }: PhaseProgressProps) {
  const getPhaseStatus = (phase: WorkflowPhase): 'completed' | 'current' | 'future' => {
    if (completedPhases.includes(phase)) return 'completed';
    if (phase === currentPhase) return 'current';
    return 'future';
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Progress</h3>
        <span className="text-xs text-muted-foreground">
          {completedPhases.length} / {phases.length} phases
        </span>
      </div>

      <div className="relative">
        {/* Progress bar */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-muted">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{
              width: `${(completedPhases.length / phases.length) * 100}%`,
            }}
          />
        </div>

        {/* Phase steps */}
        <div className="relative flex justify-between">
          {phases.map((phase) => {
            const status = getPhaseStatus(phase);
            return (
              <div key={phase} className="flex flex-col items-center gap-2">
                <div
                  className={`w-10 h-10 rounded-full border-2 flex items-center justify-center text-xs font-medium transition-colors ${
                    status === 'completed'
                      ? 'bg-primary border-primary text-primary-foreground'
                      : status === 'current'
                      ? 'bg-background border-primary text-primary'
                      : 'bg-background border-muted text-muted-foreground'
                  }`}
                >
                  {phases.indexOf(phase) + 1}
                </div>
                <span
                  className={`text-xs text-center w-20 ${
                    status === 'future' ? 'text-muted-foreground' : 'text-foreground'
                  }`}
                >
                  {phaseLabels[phase]}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
