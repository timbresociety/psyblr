import { useEffect } from 'react';
import { BrandWordmark } from './BrandWordmark';

type HelpMode = 'quickstart' | 'rules';

interface HelpModalProps {
  open: boolean;
  mode: HelpMode;
  hasStarted: boolean;
  onClose: () => void;
  onSwitchMode: (mode: HelpMode) => void;
}

const flowSteps = [
  {
    number: '01',
    title: 'Protect the secret screens',
    detail: 'Only the active player should look during setup, card play, and replenishment buys. The pass screens are safe shared moments.',
  },
  {
    number: '02',
    title: 'Build within 69 total budget',
    detail: 'Each player drafts 5 starting cards, then buys 1 more after each of rounds 1 to 5 for exactly 10 selected cards total.',
  },
  {
    number: '03',
    title: 'Attack beats defense by value',
    detail: 'If the attack card is stronger, the attacker scores the value difference. If defense matches or beats it, the score is 0.',
  },
  {
    number: '04',
    title: 'Same rank is a wicket',
    detail: 'A wicket shuts off scoring on all of that attacker’s remaining attack turns, so the wicket badge matters for the rest of the match.',
  },
];

const publicVsHidden = [
  {
    label: 'Public board',
    tone: 'glass-chip--public',
    detail: 'Scores, starting spend totals after reveal, round results, discard history, and endgame summary.',
  },
  {
    label: 'Hidden screens',
    tone: 'glass-chip--hidden',
    detail: 'Opening hand choices, attack or defense card selection, replenishment purchases, and private budget guidance.',
  },
];

export function HelpModal({ open, mode, hasStarted, onClose, onSwitchMode }: HelpModalProps) {
  useEffect(() => {
    if (!open) {
      return undefined;
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  const title = mode === 'quickstart' ? 'First match quick start' : 'Rules and play flow';
  const subtitle =
    mode === 'quickstart'
      ? 'This is the minimum you need before the first hidden turn starts.'
      : 'A compact explanation of the score system, hidden-information flow, and testing checklist.';

  return (
    <div className="modal-scrim" role="dialog" aria-modal="true" aria-label={title}>
      <div className="modal-card px-6 py-6 sm:px-8 sm:py-8">
        <div className="flex flex-col gap-5 border-b border-white/40 pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className={`glass-chip ${mode === 'quickstart' ? 'glass-chip--gold' : 'glass-chip--public'}`}>
              {mode === 'quickstart' ? 'Onboarding' : 'Help'}
            </span>
            <div className="mt-4">
              <BrandWordmark />
            </div>
            <h2 className="liquid-title mt-5 text-3xl sm:text-4xl">{title}</h2>
            <p className="body-copy mt-3 max-w-3xl">{subtitle}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => onSwitchMode(mode === 'quickstart' ? 'rules' : 'quickstart')} className="chrome-button chrome-button--ghost">
              {mode === 'quickstart' ? 'See full rules' : 'Quick start'}
            </button>
            <button type="button" onClick={onClose} className="chrome-button">
              {mode === 'quickstart' ? 'Begin hidden turn' : hasStarted ? 'Back to game' : 'Close'}
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {flowSteps.map((step) => (
            <article key={step.number} className="flow-step">
              <p className="flow-step-number">{step.number}</p>
              <h3 className="liquid-title mt-4 text-xl">{step.title}</h3>
              <p className="body-copy mt-3">{step.detail}</p>
            </article>
          ))}
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {publicVsHidden.map((item) => (
            <article key={item.label} className="liquid-panel liquid-panel--neutral px-5 py-5">
              <span className={`glass-chip ${item.tone}`}>{item.label}</span>
              <p className="body-copy mt-4">{item.detail}</p>
            </article>
          ))}
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-3">
          <article className="liquid-panel liquid-panel--neutral px-5 py-5">
            <p className="micro-copy">Scoring</p>
            <p className="body-copy mt-3">Attack greater than defense scores the difference. Defense greater than or equal to attack means 0 runs.</p>
          </article>
          <article className="liquid-panel liquid-panel--neutral px-5 py-5">
            <p className="micro-copy">Wicket check</p>
            <p className="body-copy mt-3">Same rank on both cards is a wicket even if the values differ in another way.</p>
          </article>
          <article className="liquid-panel liquid-panel--neutral px-5 py-5">
            <p className="micro-copy">Budget cues</p>
            <p className="body-copy mt-3">The hidden screens show budget left, cards chosen, remaining pool, and the minimum reserve needed to finish all 10 cards.</p>
          </article>
        </div>
      </div>
    </div>
  );
}
