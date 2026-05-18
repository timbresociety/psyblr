import { useMemo, useReducer, useState } from 'react';
import { BrandWordmark } from './components/BrandWordmark';
import { HistoryPanel } from './components/HistoryPanel';
import { HelpModal } from './components/HelpModal';
import { HomeScreen } from './components/HomeScreen';
import { Layout } from './components/Layout';
import { PassDeviceScreen } from './components/PassDeviceScreen';
import { RoundPlayScreen } from './components/RoundPlayScreen';
import { Scoreboard } from './components/Scoreboard';
import { SecretCardPicker } from './components/SecretCardPicker';
import { SummaryScreen } from './components/SummaryScreen';
import {
  TOTAL_BUDGET,
  TOTAL_ROUNDS,
  STARTING_CARD_COUNT,
  TOTAL_SELECTED_CARDS,
  createInitialGameState,
  gameReducer,
  getCardsByIds,
  getMinimumFutureSpend,
  getRemainingPoolCards,
  validatePlayableCard,
  validateReplenishmentPurchase,
  validateStartingSelection,
} from './lib/game';
import type { Card, GamePhase, PlayerId, PlayerState, RoundRecord } from './types/game';

function formatSelectionInfo(player: PlayerState, futureMinimumSpend: number) {
  return [
    { label: 'Chosen', value: `${player.selectedCardIds.length}/${TOTAL_SELECTED_CARDS}` },
    { label: 'Hand', value: player.handCardIds.length.toString() },
    { label: 'Pool left', value: (player.poolCardIds.length - player.selectedCardIds.length).toString() },
    { label: 'Budget left', value: (TOTAL_BUDGET - player.spent).toString() },
    {
      label: 'Min reserve',
      value: Number.isFinite(futureMinimumSpend) ? futureMinimumSpend.toString() : 'Unavailable',
    },
  ];
}

function RevealedCard({
  card,
  label,
  tone,
}: {
  card: Card;
  label: string;
  tone: Card['color'];
}) {
  return (
    <div className={`playing-card ${tone === 'black' ? 'playing-card--black' : 'playing-card--red'} px-4 py-5`}>
      <div className="relative z-10">
        <p className="playing-card-corner">{label}</p>
        <div className="mt-4 flex items-start justify-between gap-4">
          <div>
            <p className="playing-card-rank">{card.shortLabel}</p>
            <p className="mt-3 text-sm leading-6 opacity-80">{card.displayLabel}</p>
          </div>
          <span className="playing-card-value">{card.value}</span>
        </div>
      </div>
    </div>
  );
}

function RoundResultScreen({
  round,
  cardsById,
  onContinue,
}: {
  round: RoundRecord;
  cardsById: Record<string, Card>;
  onContinue: () => void;
}) {
  const outcomeTitle = round.wicket
    ? 'Wicket. Attacking scoreline is shut down.'
    : round.pointsScored > 0
      ? `Clean hit for ${round.pointsScored} run${round.pointsScored === 1 ? '' : 's'}.`
      : 'Defense holds. No runs scored.';
  const nextStepText =
    round.roundNumber < TOTAL_ROUNDS
      ? round.roundNumber <= 5
        ? 'Next up: both players make one hidden replenishment buy before the next round starts.'
        : 'Next up: the device passes into the next secret card reveal cycle.'
      : 'Next up: final summary and rematch options.';

  return (
    <section className={`liquid-panel ${round.wicket ? 'liquid-panel--hidden' : 'liquid-panel--public'} screen-entrance px-6 py-7 sm:px-8`}>
      <div className="flex flex-col gap-5 border-b border-white/40 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <span className={`glass-chip ${round.wicket ? 'glass-chip--hidden' : 'glass-chip--public'}`}>
            {round.wicket ? 'Wicket reveal' : 'Round reveal'}
          </span>
          <h2 className="liquid-title mt-4 text-3xl sm:text-4xl">Round {round.roundNumber} resolved</h2>
          <p className="body-copy mt-3">{outcomeTitle}</p>
          <p className="mt-3 text-sm leading-6 text-[color:var(--ink-500)]">{nextStepText}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="glass-chip">Attack value {round.attackCardValue}</span>
          <span className="glass-chip">Defense value {round.defenseCardValue}</span>
          <span className={`glass-chip ${round.wicket ? 'glass-chip--hidden' : 'glass-chip--success'}`}>
            {round.wicket ? 'Wicket' : `${round.pointsScored} runs`}
          </span>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <RevealedCard card={cardsById[round.attackCardId]} label="Attack card" tone={cardsById[round.attackCardId].color} />
        <RevealedCard card={cardsById[round.defenseCardId]} label="Defense card" tone={cardsById[round.defenseCardId].color} />
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <span className="glass-chip glass-chip--public">P1 score {round.scoresAfterRound.player1}</span>
          <span className="glass-chip glass-chip--public">P2 score {round.scoresAfterRound.player2}</span>
          <span className="glass-chip">{round.attacker === 'player1' ? 'P1 attacked' : 'P2 attacked'}</span>
        </div>
        <button type="button" onClick={onContinue} className="chrome-button w-full sm:w-auto">
          {round.roundNumber === TOTAL_ROUNDS ? 'View final summary' : 'Continue'}
        </button>
      </div>
    </section>
  );
}

function StartingTotalsScreen({
  player1Spend,
  player2Spend,
  onContinue,
}: {
  player1Spend: number;
  player2Spend: number;
  onContinue: () => void;
}) {
  return (
    <section className="liquid-panel liquid-panel--public screen-entrance px-6 py-7 sm:px-8">
      <div className="flex flex-col gap-5 border-b border-white/40 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <span className="glass-chip glass-chip--public">Public reveal</span>
          <h2 className="liquid-title mt-4 text-3xl sm:text-4xl">Only the opening totals are revealed</h2>
          <p className="body-copy mt-3">
            Both five-card starting hands are now locked. Only the spend totals go public here, not the exact cards.
          </p>
        </div>
        <button type="button" onClick={onContinue} className="chrome-button min-w-[180px]">
          Start round 1
        </button>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <article className="liquid-panel liquid-panel--neutral px-5 py-5">
          <span className="glass-chip">Player 1</span>
          <p className="liquid-title mt-4 text-5xl">{player1Spend}</p>
          <p className="mt-3 text-sm leading-6 text-[color:var(--ink-700)]">Black cards only. Exact opening picks stay hidden.</p>
        </article>
        <article className="liquid-panel liquid-panel--neutral px-5 py-5">
          <span className="glass-chip">Player 2</span>
          <p className="liquid-title mt-4 text-5xl">{player2Spend}</p>
          <p className="mt-3 text-sm leading-6 text-[color:var(--ink-700)]">Red cards only. Exact opening picks stay hidden.</p>
        </article>
      </div>
    </section>
  );
}

function getPublicStepSummary(phase: GamePhase): {
  title: string;
  description: string;
  badges: { label: string; tone?: string }[];
} {
  switch (phase.type) {
    case 'setup':
      return {
        title: `${phase.player === 'player1' ? 'Player 1' : 'Player 2'} is choosing a hidden starting hand`,
        description: 'Five secret cards are being locked in before the opening reveal.',
        badges: [
          { label: 'Hidden setup', tone: 'glass-chip--hidden' },
          { label: `${STARTING_CARD_COUNT} starting cards` },
        ],
      };
    case 'pass':
      return {
        title: 'The device is being handed off',
        description: phase.message,
        badges: [{ label: 'Secret flow protected', tone: 'glass-chip--hidden' }],
      };
    case 'starting-totals':
      return {
        title: 'The shared board is showing public opening spend',
        description: 'Only the totals spent on the starting five are visible at this point.',
        badges: [{ label: 'Public reveal', tone: 'glass-chip--public' }],
      };
    case 'play':
      return {
        title: `Round ${phase.roundNumber} is in motion`,
        description: `${phase.player === 'player1' ? 'Player 1' : 'Player 2'} is choosing the hidden ${phase.role} card for this reveal cycle.`,
        badges: [
          { label: `Round ${phase.roundNumber}` },
          { label: phase.role === 'attack' ? 'Attack selection' : 'Defense selection', tone: 'glass-chip--gold' },
          { label: phase.player === 'player1' ? 'Player 1 active' : 'Player 2 active', tone: 'glass-chip--hidden' },
        ],
      };
    case 'round-result':
      return {
        title: `Round ${phase.roundNumber} has been revealed`,
        description: 'The actual cards, the score impact, and any wicket are now public.',
        badges: [
          { label: `Round ${phase.roundNumber}` },
          { label: phase.result.wicket ? 'Wicket' : `${phase.result.pointsScored} runs`, tone: phase.result.wicket ? 'glass-chip--hidden' : 'glass-chip--success' },
        ],
      };
    case 'buy':
      return {
        title: 'A hidden replenishment buy is happening',
        description: `This secret purchase follows round ${phase.roundNumber} and stays private until used in later play.`,
        badges: [
          { label: `After round ${phase.roundNumber}` },
          { label: 'Replenishment', tone: 'glass-chip--hidden' },
        ],
      };
    case 'game-over':
      return {
        title: 'The 10-round match is complete',
        description: 'Final score, wicket state, and full reveal history are now public.',
        badges: [
          { label: `${TOTAL_ROUNDS} rounds complete`, tone: 'glass-chip--success' },
        ],
      };
  }
}

function getPassTone(phase: Extract<GamePhase, { type: 'pass' }>): 'hidden' | 'public' {
  return phase.next.type === 'starting-totals' || phase.next.type === 'round-result' || phase.next.type === 'game-over'
    ? 'public'
    : 'hidden';
}

export default function App() {
  const [state, dispatch] = useReducer(gameReducer, undefined, createInitialGameState);
  const [hasStarted, setHasStarted] = useState(false);
  const [hasSeenQuickstart, setHasSeenQuickstart] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [helpMode, setHelpMode] = useState<'quickstart' | 'rules'>('rules');

  const stepSummary = useMemo(() => getPublicStepSummary(state.phase), [state.phase]);

  function startMatch() {
    dispatch({ type: 'restart' });
    setHasStarted(true);

    if (!hasSeenQuickstart) {
      setHasSeenQuickstart(true);
      setHelpMode('quickstart');
      setHelpOpen(true);
    }
  }

  function returnHome() {
    dispatch({ type: 'restart' });
    setHasStarted(false);
    setHelpOpen(false);
  }

  function restartMatch() {
    dispatch({ type: 'restart' });
    setHelpOpen(false);
  }

  function openRules(mode: 'quickstart' | 'rules' = 'rules') {
    setHelpMode(mode);
    setHelpOpen(true);
  }

  function confirmStartingSelection(playerId: PlayerId, cardIds: string[]) {
    const player = state.players[playerId];
    const validation = validateStartingSelection(player, cardIds, state.cardsById);
    if (!validation.valid) {
      return validation.reason ?? 'Invalid starting selection.';
    }

    dispatch({ type: 'confirm-setup', player: playerId, cardIds });
    return null;
  }

  function confirmRoundPlay(playerId: PlayerId, cardId: string) {
    const player = state.players[playerId];
    const validation = validatePlayableCard(player, cardId);
    if (!validation.valid) {
      return validation.reason ?? 'Invalid play.';
    }

    dispatch({ type: 'confirm-play', player: playerId, cardId });
    return null;
  }

  function confirmReplenishment(playerId: PlayerId, cardId: string) {
    const player = state.players[playerId];
    const validation = validateReplenishmentPurchase(player, cardId, state.cardsById, state.currentRound);
    if (!validation.valid) {
      return validation.reason ?? 'Invalid replenishment purchase.';
    }

    dispatch({ type: 'confirm-buy', player: playerId, cardId });
    return null;
  }

  function renderMainPanel() {
    switch (state.phase.type) {
      case 'setup': {
        const player = state.players[state.phase.player];
        const availableCards = getRemainingPoolCards(player, state.cardsById);
        const futureMinimumSpend = getMinimumFutureSpend(player, state.cardsById, []);

        return (
          <SecretCardPicker
            key={`setup-${player.id}`}
            title={`${player.name}: build the opening five`}
            subtitle="Choose exactly five hidden cards from your color pool. The opponent only gets to see the total value spent on these five cards."
            cards={availableCards}
            requiredSelections={STARTING_CARD_COUNT}
            selectionMode="multiple"
            confirmLabel="Lock opening hand"
            helperText="Stay disciplined with budget. You still need one extra hidden buy after each of rounds 1 to 5."
            infoRows={formatSelectionInfo(player, futureMinimumSpend)}
            onConfirm={(cardIds) => confirmStartingSelection(player.id, cardIds)}
          />
        );
      }
      case 'pass':
        return (
          <PassDeviceScreen
            title={state.phase.title}
            message={state.phase.message}
            tone={getPassTone(state.phase)}
            onContinue={() => dispatch({ type: 'advance-pass' })}
          />
        );
      case 'starting-totals':
        return (
          <StartingTotalsScreen
            player1Spend={state.players.player1.startingSpend}
            player2Spend={state.players.player2.startingSpend}
            onContinue={() => dispatch({ type: 'acknowledge-starting-totals' })}
          />
        );
      case 'play': {
        const player = state.players[state.phase.player];
        const handCards = getCardsByIds(player.handCardIds, state.cardsById);

        return (
          <RoundPlayScreen
            key={`play-${state.phase.player}-${state.phase.roundNumber}`}
            player={player}
            roundNumber={state.phase.roundNumber}
            role={state.phase.role}
            cards={handCards}
            onConfirm={(cardId) => confirmRoundPlay(player.id, cardId)}
          />
        );
      }
      case 'round-result':
        return (
          <RoundResultScreen
            round={state.phase.result}
            cardsById={state.cardsById}
            onContinue={() => dispatch({ type: 'advance-after-round' })}
          />
        );
      case 'buy': {
        const player = state.players[state.phase.player];
        const availableCards = getRemainingPoolCards(player, state.cardsById);
        const futureMinimumSpend = getMinimumFutureSpend(player, state.cardsById, []);

        return (
          <SecretCardPicker
            key={`buy-${player.id}-${state.phase.roundNumber}`}
            title={`${player.name}: buy 1 hidden card`}
            subtitle={`This secret buy happens after round ${state.phase.roundNumber}. It joins the hand for later reveals.`}
            cards={availableCards}
            requiredSelections={1}
            selectionMode="single"
            confirmLabel="Buy card"
            helperText="This purchase still has to leave enough budget to complete the full 10-card plan."
            infoRows={formatSelectionInfo(player, futureMinimumSpend)}
            onConfirm={(cardIds) => confirmReplenishment(player.id, cardIds[0])}
          />
        );
      }
      case 'game-over':
        return (
          <SummaryScreen
            winner={state.winner ?? 'draw'}
            players={state.players}
            history={state.history}
            cardsById={state.cardsById}
            onRestart={restartMatch}
            onReturnHome={returnHome}
          />
        );
    }
  }

  if (!hasStarted) {
    return (
      <Layout>
        <HomeScreen onStart={startMatch} onOpenRules={() => openRules('rules')} />
        <HelpModal
          open={helpOpen}
          mode={helpMode}
          hasStarted={hasStarted}
          onClose={() => setHelpOpen(false)}
          onSwitchMode={setHelpMode}
        />
      </Layout>
    );
  }

  return (
    <Layout>
      <section className="liquid-panel liquid-panel--hero screen-entrance px-6 py-7 sm:px-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="section-kicker">Premium Arcade Strategy</p>
            <div className="mt-4">
              <BrandWordmark />
            </div>
            <p className="body-copy mt-4 max-w-3xl">
              Hidden hands, precise budget choices, and clean public reveals. The chrome board stays public while private
              choice screens stay clearly sealed off.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="glass-chip glass-chip--public">Public board</span>
            <span className="glass-chip glass-chip--hidden">Hidden hands</span>
            <span className="glass-chip">Local device only</span>
            <button type="button" onClick={() => openRules('rules')} className="chrome-button chrome-button--ghost">
              Rules
            </button>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.9fr)_minmax(340px,1fr)]">
        <div className="flex flex-col gap-6">
          <Scoreboard
            players={state.players}
            currentRound={state.currentRound}
            phase={state.phase}
            showStartingSpend={state.startingTotalsRevealed}
          />

          <section className="liquid-panel liquid-panel--neutral screen-entrance px-6 py-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="section-kicker">Current Step</p>
                <h2 className="liquid-title mt-3 text-2xl sm:text-3xl">{stepSummary.title}</h2>
                <p className="body-copy mt-3 max-w-3xl">{stepSummary.description}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {stepSummary.badges.map((badge) => (
                  <span key={badge.label} className={`glass-chip ${badge.tone ?? ''}`.trim()}>
                    {badge.label}
                  </span>
                ))}
                <button type="button" onClick={() => openRules('rules')} className="chrome-button chrome-button--ghost">
                  Help
                </button>
              </div>
            </div>
          </section>

          {renderMainPanel()}
        </div>

        <div className="flex flex-col gap-6">
          <HistoryPanel history={state.history} cardsById={state.cardsById} />
          <section className="liquid-panel liquid-panel--neutral screen-entrance px-6 py-6">
            <p className="section-kicker">Rules Snapshot</p>
            <h2 className="liquid-title mt-3 text-2xl">What stays locked in</h2>
            <div className="mt-5 space-y-3 text-sm leading-6 text-[color:var(--ink-700)]">
              <p>Every player finishes with exactly 10 selected cards and a total spend of at most {TOTAL_BUDGET}.</p>
              <p>Rounds 1 to 5 are each followed by one hidden replenishment buy for both players.</p>
              <p>Same rank on attack and defense is a wicket and shuts off future scoring on that attacker’s remaining turns.</p>
            </div>
          </section>
        </div>
      </div>

      <HelpModal
        open={helpOpen}
        mode={helpMode}
        hasStarted={hasStarted}
        onClose={() => setHelpOpen(false)}
        onSwitchMode={setHelpMode}
      />
    </Layout>
  );
}
