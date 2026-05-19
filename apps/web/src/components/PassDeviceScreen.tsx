interface PassDeviceScreenProps {
  title: string;
  message: string;
  tone?: 'hidden' | 'public';
  onContinue: () => void;
}

export function PassDeviceScreen({ title, message, tone = 'hidden', onContinue }: PassDeviceScreenProps) {
  const toneClass = tone === 'public' ? 'liquid-panel--public' : 'liquid-panel--hidden';
  const chipClass = tone === 'public' ? 'glass-chip--public' : 'glass-chip--hidden';

  return (
    <section className={`liquid-panel ${toneClass} screen-entrance px-6 py-10 sm:px-8 sm:py-12`}>
      <div className="mx-auto max-w-2xl text-center">
        <span className={`glass-chip ${chipClass}`}>{tone === 'public' ? 'Public reveal next' : 'Hidden handoff'}</span>
        <h2 className="liquid-title mt-5 text-3xl sm:text-4xl">{title}</h2>
        <p className="body-copy mt-4">{message}</p>
        <p className="mt-5 text-sm leading-6 text-[color:var(--ink-500)]">
          Hand the device to the next player first, then continue.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <span className="glass-chip">Pass</span>
          <span className={`glass-chip ${chipClass}`}>{tone === 'public' ? 'Reveal' : 'Private turn'}</span>
          <span className="glass-chip">Continue</span>
        </div>
        <button type="button" onClick={onContinue} className="chrome-button mt-8 min-w-[180px]">
          Continue
        </button>
      </div>
    </section>
  );
}
