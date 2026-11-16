import React from 'react';
import { Check } from 'lucide-react';

interface StepperProps {
  steps: string[];
  currentStep: number; // 0-indexed
}

export const Stepper: React.FC<StepperProps> = ({ steps, currentStep }) => {
  return (
    <div aria-label="Progress steps" className="portal-card">
      <div className="flex items-center justify-between gap-2">
        {steps.map((label, index) => {
          const completed = index < currentStep;
          const active = index === currentStep;
          return (
            <React.Fragment key={label}>
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 border transition-colors portal-tabular ${
                    completed
                      ? 'bg-[#6FD8B0] border-[#6FD8B0] text-[#07231A]'
                      : active
                      ? 'bg-[#172228] border-[#6FD8B0] text-[#6FD8B0]'
                      : 'bg-[#0B0F10] border-[#1F2C33] text-[#8FA1A8]'
                  }`}
                >
                  {completed ? <Check className="w-3.5 h-3.5" /> : index + 1}
                </span>
                <span
                  className={`text-xs truncate hidden sm:inline ${
                    active ? 'font-semibold text-[#F2F5F4]' : completed ? 'text-[#6FD8B0]' : 'text-[#8FA1A8]'
                  }`}
                >
                  {label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`flex-1 h-0.5 rounded-full ${
                    completed ? 'bg-[#6FD8B0]' : 'bg-[#1F2C33]'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
      <div className="mt-2.5 sm:hidden text-xs font-medium text-[#6FD8B0]">
        Step {currentStep + 1} of {steps.length} · {steps[currentStep]}
      </div>
    </div>
  );
};
