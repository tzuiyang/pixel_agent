import { useState, useEffect } from 'react';

const ONBOARDING_KEY = 'pixel-agent-onboarded';

interface OnboardingGuideProps {
  step: 'scene-created' | 'has-characters' | 'task-assigned';
}

const STEPS = [
  {
    key: 'scene-created' as const,
    title: 'Welcome to your world!',
    message: 'Click "+ New Agent" to create your first AI character.',
    hint: 'Describe any character — a wizard, a robot, a cat in a suit — and watch it appear as pixel art!',
  },
  {
    key: 'has-characters' as const,
    title: 'Your agent is ready!',
    message: 'Click on your character to open the inspector and assign a task.',
    hint: 'Try something like "Write a short poem about coding" or "Research the best pizza toppings".',
  },
  {
    key: 'task-assigned' as const,
    title: 'Watch the magic!',
    message: 'Your agent is working. Watch the speech bubble for progress updates.',
    hint: 'When done, click the character again to see their output. You can assign more tasks or create more agents!',
  },
];

export function OnboardingGuide({ step }: OnboardingGuideProps) {
  const [dismissed, setDismissed] = useState(false);
  const [hasOnboarded, setHasOnboarded] = useState(true);

  useEffect(() => {
    const onboarded = localStorage.getItem(ONBOARDING_KEY);
    if (!onboarded) setHasOnboarded(false);
  }, []);

  if (hasOnboarded || dismissed) return null;

  const currentStep = STEPS.find((s) => s.key === step);
  if (!currentStep) return null;

  const stepIndex = STEPS.findIndex((s) => s.key === step);

  // BUG-012 FIX: always persist dismissal to localStorage
  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem(ONBOARDING_KEY, 'true');
  };

  return (
    <div
      className="fixed bottom-16 left-1/2 -translate-x-1/2 z-50 max-w-md w-full px-4"
    >
      <div
        className="rounded-xl border border-[#9B5DE5]/50 p-4 shadow-2xl"
        style={{ backgroundColor: '#1A1A3A' }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-sm font-bold" style={{ color: '#9B5DE5' }}>
                {currentStep.title}
              </h3>
              <span className="text-xs text-[#555577]">
                {stepIndex + 1}/{STEPS.length}
              </span>
            </div>
            <p className="text-sm text-white mb-1">{currentStep.message}</p>
            <p className="text-xs text-[#8888AA]">{currentStep.hint}</p>
          </div>
          <button
            onClick={handleDismiss}
            className="text-[#8888AA] hover:text-white text-sm shrink-0 cursor-pointer"
          >
            {step === 'task-assigned' ? 'Got it!' : 'Skip'}
          </button>
        </div>

        {/* Progress dots */}
        <div className="flex gap-1.5 mt-3">
          {STEPS.map((s, i) => (
            <div
              key={s.key}
              className="h-1 rounded-full flex-1"
              style={{
                backgroundColor: i <= stepIndex ? '#9B5DE5' : '#2A2A4A',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function resetOnboarding() {
  localStorage.removeItem(ONBOARDING_KEY);
}
