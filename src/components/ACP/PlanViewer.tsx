import { CheckCircle, Circle, Loader2, XCircle, ChevronRight } from 'lucide-react';
import type { PlanStep } from '@/lib/types';

interface PlanViewerProps {
  steps: PlanStep[];
  currentStepIndex?: number;
}

export function PlanViewer({ steps, currentStepIndex = 0 }: PlanViewerProps) {
  const completedSteps = steps.filter((s) => s.status === 'completed').length;
  const progress = steps.length > 0 ? (completedSteps / steps.length) * 100 : 0;

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Execution Plan</span>
          <span className="text-xs text-muted-foreground">
            ({completedSteps}/{steps.length} steps)
          </span>
        </div>
        <div className="text-xs text-muted-foreground">
          {Math.round(progress)}% complete
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-1 bg-muted">
        <div
          className="h-full bg-accent transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Steps */}
      <div className="divide-y divide-border">
        {steps.map((step, index) => (
          <PlanStepItem
            key={step.id}
            step={step}
            index={index}
            isActive={index === currentStepIndex}
          />
        ))}
      </div>

      {steps.length === 0 && (
        <div className="px-4 py-8 text-center text-muted-foreground">
          <Circle className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No plan steps yet</p>
        </div>
      )}
    </div>
  );
}

interface PlanStepItemProps {
  step: PlanStep;
  index: number;
  isActive: boolean;
}

function PlanStepItem({ step, index, isActive }: PlanStepItemProps) {
  const getStatusIcon = () => {
    switch (step.status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'skipped':
        return <Circle className="w-5 h-5 text-gray-400" />;
      case 'in_progress':
        return (
          <Loader2 className="w-5 h-5 text-accent animate-spin" />
        );
      default:
        return <Circle className="w-5 h-5 text-muted-foreground" />;
    }
  };

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 ${
        isActive ? 'bg-accent/10' : ''
      } ${step.status === 'completed' ? 'opacity-60' : ''}`}
    >
      <div className="mt-0.5 shrink-0">{getStatusIcon()}</div>
      <div className="flex-1">
        <div className="text-sm">{step.description}</div>
        <div className="text-xs text-muted-foreground mt-0.5">
          Step {index + 1}
          {step.status === 'in_progress' && (
            <span className="text-accent ml-2">Running...</span>
          )}
        </div>
      </div>
      {isActive && (
        <ChevronRight className="w-4 h-4 text-accent shrink-0" />
      )}
    </div>
  );
}
