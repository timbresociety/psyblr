import { useMemo, useState } from 'react';
import type { Card } from '@psyblr/game-engine';

interface InfoRow {
  label: string;
  value: string;
}

interface SecretCardPickerProps {
  title: string;
  subtitle: string;
  cards: Card[];
  requiredSelections: number;
  selectionMode: 'single' | 'multiple';
  confirmLabel: string;
  helperText?: string;
  infoRows?: InfoRow[];
  confirmDisabled?: boolean;
  onConfirm: (cardIds: string[]) => string | null;
}

function getCardClasses(card: Card, selected: boolean, disabled: boolean): string {
  const colorClass = card.color === 'black' ? 'playing-card--black' : 'playing-card--red';
  const selectedClass = selected ? 'playing-card--selected' : '';
  const disabledClass = disabled ? 'playing-card--disabled' : '';

  return ['playing-card', colorClass, selectedClass, disabledClass].filter(Boolean).join(' ');
}

export function SecretCardPicker({
  title,
  subtitle,
  cards,
  requiredSelections,
  selectionMode,
  confirmLabel,
  helperText,
  infoRows,
  confirmDisabled,
  onConfirm,
}: SecretCardPickerProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const isSelectionComplete = selectedIds.length === requiredSelections;
  const maxSelectionsReached = selectionMode === 'multiple' && selectedIds.length >= requiredSelections;

  const selectionText = useMemo(() => {
    if (selectionMode === 'single') {
      return selectedIds.length === 1 ? '1 card ready' : 'Choose 1 card';
    }

    return `${selectedIds.length} of ${requiredSelections} cards ready`;
  }, [requiredSelections, selectedIds.length, selectionMode]);

  function toggleCard(cardId: string) {
    setError(null);
    setSelectedIds((currentSelectedIds) => {
      const alreadySelected = currentSelectedIds.includes(cardId);

      if (selectionMode === 'single') {
        return alreadySelected ? [] : [cardId];
      }

      if (alreadySelected) {
        return currentSelectedIds.filter((currentCardId) => currentCardId !== cardId);
      }

      if (currentSelectedIds.length >= requiredSelections) {
        return currentSelectedIds;
      }

      return [...currentSelectedIds, cardId];
    });
  }

  function handleConfirm() {
    if (selectedIds.length !== requiredSelections) {
      setError(`Choose exactly ${requiredSelections} card${requiredSelections === 1 ? '' : 's'} to continue.`);
      return;
    }

    const result = onConfirm(selectedIds);
    if (result) {
      setError(result);
    }
  }

  return (
    <section className="liquid-panel liquid-panel--hidden screen-entrance px-6 py-6 sm:px-8 sm:py-8">
      <div className="flex flex-col gap-5 border-b border-white/40 pb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <span className="glass-chip glass-chip--hidden">Private player surface</span>
            <h2 className="liquid-title mt-4 text-3xl sm:text-4xl">{title}</h2>
            <p className="body-copy mt-3">{subtitle}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="glass-chip glass-chip--hidden">{selectionText}</span>
            {infoRows?.map((row) => (
              <span key={row.label} className="glass-chip">
                {row.label}: {row.value}
              </span>
            ))}
          </div>
        </div>
      </div>

      {helperText ? (
        <div className="mt-5 rounded-[1.5rem] border border-white/50 bg-white/45 px-4 py-4 text-sm leading-6 text-[color:var(--ink-700)] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
          {helperText}
        </div>
      ) : null}

      {error ? (
        <div className="mt-5 rounded-[1.5rem] border border-white/50 bg-[rgba(255,143,129,0.18)] px-4 py-4 text-sm leading-6 text-[color:var(--ink-950)] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
          {error}
        </div>
      ) : null}

      {cards.length === 0 ? (
        <div className="mt-6 rounded-[1.75rem] border border-white/50 bg-white/40 px-5 py-6 text-sm leading-6 text-[color:var(--ink-700)] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
          No eligible cards are available on this screen. If this looks wrong during testing, restart the match and note which step led here.
        </div>
      ) : (
        <div className="card-grid mt-6">
          {cards.map((card) => {
            const selected = selectedIds.includes(card.id);
            const disabled = maxSelectionsReached && !selected;

            return (
              <button
                key={card.id}
                type="button"
                onClick={() => toggleCard(card.id)}
                disabled={disabled}
                aria-pressed={selected}
                className={getCardClasses(card, selected, disabled)}
              >
                <div className="relative z-10 flex h-full min-h-[220px] flex-col justify-between px-4 py-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="playing-card-corner">{card.color === 'black' ? 'Black pool' : 'Red pool'}</p>
                      <p className="playing-card-rank mt-3">{card.shortLabel}</p>
                    </div>
                    <span className="playing-card-value">{card.value}</span>
                  </div>

                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] opacity-70">
                      {selected ? 'Locked in' : 'Tap to select'}
                    </p>
                    <p className="mt-2 text-sm leading-6 opacity-80">{card.displayLabel}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-6 text-[color:var(--ink-500)]">
          Hidden choices remain secret until the proper public reveal screen appears.
        </p>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!isSelectionComplete || confirmDisabled}
          className="chrome-button w-full sm:w-auto"
        >
          {confirmLabel}
        </button>
      </div>
    </section>
  );
}
