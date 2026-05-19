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
    title: 'Create or join one live room',
    detail: 'One player hosts, the other joins with the code, and both browsers connect to the same authoritative backend.',
  },
  {
    number: '02',
    title: 'Keep hidden picks on your own screen',
    detail: 'Only your client shows your hand, pool, and budget details. Opponent hidden information never appears on your device.',
  },
  {
    number: '03',
    title: 'Lock cards and let the server resolve',
    detail: 'Starting hands, round cards, and replenishment buys are sent as intent. The server decides when both players are ready and computes the outcome.',
  },
  {
    number: '04',
    title: 'Watch wickets for the rest of the match',
    detail: 'Same rank means wicket. That attacker still keeps defending normally later, but can never score again on future attack rounds.',
  },
];

const publicVsHidden = [
  {
    label: 'Public data',
    tone: 'glass-chip--public',
    detail: 'Room code, player names, scores, wicket state, starting spend totals after reveal, round results, and discard history.',
  },
  {
    label: 'Private data',
    tone: 'glass-chip--hidden',
    detail: 'Your current hand, remaining pool, exact selected cards, and remaining budget. The opponent never receives these values.',
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

  const title = mode === 'quickstart' ? 'First room quick start' : 'Rules and room flow';
  const subtitle =
    mode === 'quickstart'
      ? 'The minimum briefing before you lock real cards into a live room.'
      : 'A compact guide to the room setup, hidden-information model, and scoring rules.';

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
            <button
              type="button"
              onClick={() => onSwitchMode(mode === 'quickstart' ? 'rules' : 'quickstart')}
              className="chrome-button chrome-button--ghost"
            >
              {mode === 'quickstart' ? 'See full rules' : 'Quick start'}
            </button>
            <button type="button" onClick={onClose} className="chrome-button">
              {mode === 'quickstart' ? 'Back to room' : hasStarted ? 'Close help' : 'Close'}
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
            <p className="micro-copy">Budget pressure</p>
            <p className="body-copy mt-3">
              Each player gets 69 total points, drafts 5 starting cards, then buys 1 more after rounds 1 to 5.
            </p>
          </article>
          <article className="liquid-panel liquid-panel--neutral px-5 py-5">
            <p className="micro-copy">Scoring</p>
            <p className="body-copy mt-3">
              Attack greater than defense scores the difference. Defense equal to or greater than attack means 0.
            </p>
          </article>
          <article className="liquid-panel liquid-panel--neutral px-5 py-5">
            <p className="micro-copy">Wicket check</p>
            <p className="body-copy mt-3">
              Same rank is always a wicket, and it permanently shuts down that attacker’s future scoring turns.
            </p>
          </article>
        </div>
      </div>
    </div>
  );
}
