import React from 'react';
import { Check } from 'lucide-react';

interface StepperProps {
  steps: string[];
  currentStep: number; // 0-indexed
}

export const Stepper: React.FC<StepperProps> = ({ steps, currentStep }) => {
  return (
    <div aria-label="Progress steps" className="portal-card p-4">
      <div className="flex items-center justify-between gap-2">
        {steps.map((label, index) => {
          const completed = index < currentStep;
          const active = index === currentStep;
          return (
            <React.Fragment key={label}>
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 border transition-colors ${
                    completed
                      ? 'bg-[#C5A880] border-[#C5A880] text-[#0B1B30]'
                      : active
                      ? 'bg-[#152E54] border-[#C5A880] text-[#C5A880]'
                      : 'bg-[#0B1B30] border-[#1D3860] text-[#8EA7C7]'
                  }`}
                >
                  {completed ? <Check className="w-3.5 h-3.5" /> : index + 1}
                </span>
                <span
                  className={`text-xs truncate hidden sm:inline ${
                    active ? 'font-semibold text-white' : completed ? 'text-[#C5A880]' : 'text-[#8EA7C7]'
                  }`}
                >
                  {label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`flex-1 h-0.5 rounded-full ${
                    completed ? 'bg-[#C5A880]' : 'bg-[#1D3860]'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
      <div className="mt-2.5 sm:hidden text-xs font-medium text-[#C5A880]">
        Step {currentStep + 1} of {steps.length} · {steps[currentStep]}
      </div>
    </div>
  );
};
