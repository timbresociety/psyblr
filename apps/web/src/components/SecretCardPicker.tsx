import { useEffect, useMemo, useState } from 'react';
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

function getCardClasses(card: Card, selected: boolean, disabled: boolean, compact: boolean): string {
  const colorClass = card.color === 'black' ? 'playing-card--black' : 'playing-card--red';
  const selectedClass = selected ? 'playing-card--selected' : '';
  const disabledClass = disabled ? 'playing-card--disabled' : '';
  const compactClass = compact ? 'playing-card--compact' : '';

  return ['playing-card', colorClass, selectedClass, disabledClass, compactClass].filter(Boolean).join(' ');
}

function getSuitLabel(suit: Card['suit']): string {
  return suit.charAt(0).toUpperCase() + suit.slice(1);
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
  const suitOptions = useMemo(
    () =>
      Array.from(new Set(cards.map((card) => card.suit))).map((suit) => ({
        key: suit,
        label: getSuitLabel(suit),
      })),
    [cards],
  );
  const cardLookup = useMemo(() => new Map(cards.map((card) => [card.id, card])), [cards]);
  const defaultFilter = cards.length > 14 && suitOptions.length > 1 ? suitOptions[0]?.key ?? 'all' : 'all';
  const [activeFilter, setActiveFilter] = useState<string>(defaultFilter);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const isSelectionComplete = selectedIds.length === requiredSelections;
  const maxSelectionsReached = selectionMode === 'multiple' && selectedIds.length >= requiredSelections;
  const useCompactCards = cards.length > 6;
  const selectedCards = selectedIds
    .map((cardId) => cardLookup.get(cardId))
    .filter((card): card is Card => Boolean(card));

  useEffect(() => {
    setActiveFilter((currentFilter) => {
      const isCurrentFilterAvailable =
        currentFilter === 'all' || suitOptions.some((option) => option.key === currentFilter);

      if (!isCurrentFilterAvailable) {
        return defaultFilter;
      }

      if (cards.length > 14 && currentFilter === 'all' && suitOptions.length > 1) {
        return defaultFilter;
      }

      return currentFilter;
    });
  }, [cards.length, defaultFilter, suitOptions]);

  const visibleCards = useMemo(() => {
    if (activeFilter === 'all') {
      return cards;
    }

    return cards.filter((card) => card.suit === activeFilter);
  }, [activeFilter, cards]);

  const selectionText = useMemo(() => {
    if (selectionMode === 'single') {
      return selectedIds.length === 1 ? '1 card selected' : 'Choose 1 card';
    }

    return `${selectedIds.length} of ${requiredSelections} selected`;
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
    <section className="liquid-panel liquid-panel--hidden screen-entrance phase-shell">
      <div className="phase-shell-header">
        <div className="min-w-0">
          <span className="glass-chip glass-chip--hidden">Private table</span>
          <h2 className="liquid-title mt-2 text-[clamp(1.45rem,3vw,2.35rem)] leading-tight">{title}</h2>
          <p className="body-copy mt-1 max-w-3xl">{subtitle}</p>
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

      <div className="picker-layout">
        <aside className="picker-sidecar">
          <article className="phase-block">
            <p className="section-kicker">Selection status</p>
            <h3 className="liquid-title mt-2 text-xl">
              {isSelectionComplete ? 'Ready to lock' : selectionMode === 'single' ? 'Pick your card' : 'Build the five-card hand'}
            </h3>
            <p className="body-copy mt-2">
              {helperText ??
                'Your choices remain private on this device until the server reaches the correct public reveal.'}
            </p>
          </article>

          {error ? (
            <div className="rounded-[1.4rem] border border-white/50 bg-[rgba(255,143,129,0.18)] px-4 py-4 text-sm leading-6 text-[color:var(--ink-950)] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
              {error}
            </div>
          ) : null}

          <div className="phase-stat-grid">
            <article className="glass-stat">
              <p className="glass-stat-label">Required</p>
              <p className="glass-stat-value text-2xl">{requiredSelections}</p>
            </article>
            <article className="glass-stat">
              <p className="glass-stat-label">Selected</p>
              <p className="glass-stat-value text-2xl">{selectedIds.length}</p>
            </article>
          </div>

          <article className="phase-block flex min-h-0 flex-col">
            <div className="flex items-center justify-between gap-3">
              <p className="section-kicker">Chosen cards</p>
              <span className="glass-chip glass-chip--hidden">{selectionText}</span>
            </div>

            <div className="surface-scroll mt-3 flex min-h-0 flex-1 flex-col">
              {selectedCards.length > 0 ? (
                <div className="selected-card-list">
                  {selectedCards.map((card) => (
                    <div key={card.id} className="selected-card-pill">
                      {card.shortLabel} • {card.displayLabel}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm leading-6 text-[color:var(--ink-700)]">Nothing selected yet.</p>
              )}
            </div>
          </article>

          <article className="phase-block">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!isSelectionComplete || confirmDisabled}
              className="chrome-button w-full"
            >
              {confirmLabel}
            </button>
            <p className="mt-2 text-sm leading-6 text-[color:var(--ink-500)]">
              The server locks your hidden choice instantly after confirmation.
            </p>
          </article>
        </aside>

        <div className="picker-canvas">
          {suitOptions.length > 1 ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setActiveFilter('all')}
                className={`archive-chip ${activeFilter === 'all' ? 'archive-chip--active' : ''}`}
              >
                All cards
              </button>
              {suitOptions.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setActiveFilter(option.key)}
                  className={`archive-chip ${activeFilter === option.key ? 'archive-chip--active' : ''}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          ) : null}

          <article className="phase-block surface-scroll flex min-h-0 flex-1 flex-col">
            {visibleCards.length === 0 ? (
              <div className="rounded-[1.35rem] border border-white/50 bg-white/40 px-4 py-5 text-sm leading-6 text-[color:var(--ink-700)] shadow-[inset_0_1px_0_rgba(255,255,255,0.76)]">
                No eligible cards are available on this screen. If this looks wrong during testing, restart the match and note which step led here.
              </div>
            ) : (
              <div className={`selection-grid ${useCompactCards ? 'selection-grid--compact' : ''}`}>
                {visibleCards.map((card) => {
                  const selected = selectedIds.includes(card.id);
                  const disabled = maxSelectionsReached && !selected;

                  return (
                    <button
                      key={card.id}
                      type="button"
                      onClick={() => toggleCard(card.id)}
                      disabled={disabled}
                      aria-pressed={selected}
                      className={getCardClasses(card, selected, disabled, useCompactCards)}
                    >
                      <div
                        className={`relative z-10 flex h-full flex-col ${
                          useCompactCards ? 'justify-between gap-3 px-3 py-3 text-left' : 'min-h-[210px] justify-between px-4 py-5 text-left'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="playing-card-corner">
                              {card.suitSymbol} {getSuitLabel(card.suit)}
                            </p>
                            <p className={`${useCompactCards ? 'mt-2 text-2xl font-extrabold leading-none' : 'playing-card-rank mt-3'}`}>
                              {card.shortLabel}
                            </p>
                          </div>
                          <span className={`${useCompactCards ? 'playing-card-value h-8 w-8 text-xs' : 'playing-card-value'}`}>
                            {card.value}
                          </span>
                        </div>

                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-70">
                            {selected ? 'Selected' : 'Tap to select'}
                          </p>
                          <p className={`${useCompactCards ? 'mt-2 text-xs leading-5 opacity-80' : 'mt-2 text-sm leading-6 opacity-80'}`}>
                            {card.displayLabel}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </article>
        </div>
      </div>
    </section>
  );
}
