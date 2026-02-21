<script setup>
import { ref, computed, watch, nextTick } from "vue";
import CardSelect from "./components/CardSelect.vue";
import PositionSelect from "./components/PositionSelect.vue";
import { useDeck } from "./composables/useDeck.js";
import { usePokerEquity } from "./composables/usePokerEquity.js";

const { options, SUIT_SYMBOLS, SUIT_COLORS, RANK_LABELS_EN } = useDeck();
const { calculate } = usePokerEquity();

const RANK_LABELS = { T: '10', J: 'J', Q: 'Q', K: 'K', A: 'A' };
function cardDisplay(c) {
  const r = c[0];
  const s = c[1] || '';
  return {
    rank: RANK_LABELS[r] || r,
    suit: SUIT_SYMBOLS[s] || s,
    color: SUIT_COLORS[s] || '#e4e4e7',
  };
}

const showOutsModal = ref(false);
const showDirtyOutsModal = ref(false);
const showReverseOutsModal = ref(false);

const card1 = ref("");
const card2 = ref("");
const flop1 = ref("");
const flop2 = ref("");
const flop3 = ref("");
const turn = ref("");
const river = ref("");
const pot = ref(100);
const ourBet = ref(0);
const playersInPot = ref(2);
const heroPosition = ref("BTN");

const result = ref(null);
const isCalculating = ref(false);
const resultRef = ref(null);

function onDigitsInput(e, r, min, max) {
  const el = e.target;
  let v = el.value.replace(/\D/g, "");
  if (v === "") {
    el.value = "";
    return;
  }
  v = v.replace(/^0+/, "") || "0";
  let n = Number(v);
  if (v === "0" && min > 0) {
    el.value = v;
    return;
  }
  if (max != null) n = Math.min(max, Math.max(min, n));
  else n = Math.max(min, n);
  r.value = n;
  el.value = String(n);
}

function onDigitsBlur(e, r, min) {
  const el = e.target;
  if (el.value === "" || Number(el.value) < min) {
    r.value = min;
    el.value = String(min);
  }
}

function onPotInput(e) {
  onDigitsInput(e, pot, 0);
}
function onOurBetInput(e) {
  onDigitsInput(e, ourBet, 0);
}
function onPlayersInPotInput(e) {
  onDigitsInput(e, playersInPot, 2, 10);
}
function onPotBlur(e) {
  onDigitsBlur(e, pot, 0);
}
function onOurBetBlur(e) {
  onDigitsBlur(e, ourBet, 0);
}
function onPlayersBlur(e) {
  onDigitsBlur(e, playersInPot, 2);
}

const POSITIONS = [
  { value: "BTN", label: "BTN" },
  { value: "SB", label: "SB" },
  { value: "BB", label: "BB" },
  { value: "UTG", label: "UTG" },
  { value: "MP", label: "MP" },
  { value: "CO", label: "CO" },
];

const allSelected = computed(() =>
  [
    card1.value,
    card2.value,
    flop1.value,
    flop2.value,
    flop3.value,
    turn.value,
    river.value,
  ].filter(Boolean)
);
const usedByBoard = computed(() => new Set(allSelected.value));

const optionsCard1 = computed(() =>
  options.value.filter(
    (o) =>
      o.value === card1.value ||
      (!usedByBoard.value.has(o.value) && o.value !== card2.value)
  )
);
const optionsCard2 = computed(() =>
  options.value.filter(
    (o) =>
      o.value === card2.value ||
      (!usedByBoard.value.has(o.value) && o.value !== card1.value)
  )
);
const optionsFlop1 = computed(() =>
  options.value.filter(
    (o) =>
      o.value === flop1.value ||
      (!usedByBoard.value.has(o.value) &&
        o.value !== flop2.value &&
        o.value !== flop3.value &&
        o.value !== turn.value &&
        o.value !== river.value)
  )
);
const optionsFlop2 = computed(() =>
  options.value.filter(
    (o) =>
      o.value === flop2.value ||
      (!usedByBoard.value.has(o.value) &&
        o.value !== flop1.value &&
        o.value !== flop3.value &&
        o.value !== turn.value &&
        o.value !== river.value)
  )
);
const optionsFlop3 = computed(() =>
  options.value.filter(
    (o) =>
      o.value === flop3.value ||
      (!usedByBoard.value.has(o.value) &&
        o.value !== flop1.value &&
        o.value !== flop2.value &&
        o.value !== turn.value &&
        o.value !== river.value)
  )
);
const optionsTurn = computed(() =>
  options.value.filter(
    (o) =>
      o.value === turn.value ||
      (!usedByBoard.value.has(o.value) && o.value !== river.value)
  )
);
const optionsRiver = computed(() =>
  options.value.filter(
    (o) =>
      o.value === river.value ||
      (!usedByBoard.value.has(o.value) && o.value !== turn.value)
  )
);

const flopFilled = computed(
  () => !!(flop1.value && flop2.value && flop3.value)
);
const turnFilled = computed(() => !!turn.value);

const canCalculate = computed(() => {
  const s = new Set(
    [card1.value, card2.value, flop1.value, flop2.value, flop3.value].filter(
      Boolean
    )
  );
  return s.size === 5;
});

const aiAnalysis = ref("");
const aiError = ref("");
const isAiLoading = ref(false);
const aiUnlocked = ref(false);
const showCodeModal = ref(false);
const codeInput = ref("");
const codeError = ref(false);
const codeModalForStrategy = ref(false);
const showStrategyFullscreen = ref(false);
const strategyContent = ref("");
const strategyLoading = ref(false);

watch(
  [card1, card2, flop1, flop2, flop3, turn, river, pot, ourBet, playersInPot, heroPosition],
  () => {
    result.value = null;
    aiAnalysis.value = "";
    aiError.value = "";
    showStrategyFullscreen.value = false;
    strategyContent.value = "";
  }
);

function tryUnlock() {
  if (codeInput.value === import.meta.env.VITE_ANALYTICS_KEY) {
    aiUnlocked.value = true;
    showCodeModal.value = false;
    codeInput.value = "";
    codeError.value = false;
    if (codeModalForStrategy.value) {
      codeModalForStrategy.value = false;
      fetchStrategy();
    }
  } else {
    codeError.value = true;
  }
}

function openStrategyPassword() {
  if (strategyLoading.value) return;
  if (aiUnlocked.value) {
    fetchStrategy();
    return;
  }
  codeModalForStrategy.value = true;
  showCodeModal.value = true;
}

function buildStrategyPrompt() {
  const r = result.value;
  const hand = `${cardLabel(card1.value)} ${cardLabel(card2.value)}`;
  const boardCards = [flop1.value, flop2.value, flop3.value, turn.value, river.value];
  const filledBoard = boardCards.filter(Boolean);
  const board = filledBoard.map(cardLabel).join(' ');
  const boardRanks = filledBoard.map(c => c[0]);
  const boardSuits = filledBoard.map(c => c[1]);
  const threats = [];
  const rankCounts = {};
  for (const rank of boardRanks) rankCounts[rank] = (rankCounts[rank] || 0) + 1;
  const pairs = Object.entries(rankCounts).filter(([, v]) => v >= 2);
  if (pairs.length) threats.push(`Борд спарен (${pairs.map(([rank, v]) => `${RANK_LABELS[rank] || rank}×${v}`).join(', ')}) → возможны фулл-хаус/каре у оппонентов`);
  const suitCounts = {};
  for (const s of boardSuits) suitCounts[s] = (suitCounts[s] || 0) + 1;
  const flushSuit = Object.entries(suitCounts).find(([, v]) => v >= 3);
  if (flushSuit) threats.push(`${flushSuit[1]} карты масти ${SUIT_SYMBOLS[flushSuit[0]]} → возможен флеш у оппонентов`);
  const heroRanks = [card1.value[0], card2.value[0]];
  if (heroRanks.every(hr => !boardRanks.includes(hr)) && r.handName && !['Старшая карта', 'Пара'].includes(r.handName))
    threats.push('Комбинация героя опирается на борд → оппоненты могут иметь ту же или лучшую');
  return `Ты — профессиональный покерный аналитик. Дай краткую рекомендацию (3-5 предложений) по ситуации в Texas Hold'em.

ДАННЫЕ (рассчитаны точно, через Monte Carlo 2500 итераций):
Рука героя: ${hand}
Борд: ${board}
Комбинация героя: ${r.handName}
Эквити: ${r.equity}% (вероятность победы против случайных рук)
EV: ${r.ev}
${r.potOdds > 0 ? `Пот-оддсы: ${r.potOdds}% (нужно эквити ≥ ${r.potOdds}% для безубыточного колла)` : 'Ставка: 0 (чек)'}
${r.outs > 0 ? `Ауты: ${r.outs}, шанс доезда: ${r.drawOdds}%` : 'Ауты: 0 (нет карт, которые повышают эквити)'}
${r.dirtyOuts > 0 ? `Грязные ауты: ${r.dirtyOuts} (улучшают категорию, но не повышают эквити)` : 'Грязные ауты: 0'}
${r.reverseOuts > 0 ? `Перезды: ${r.reverseOuts}, шанс перезда: ${r.reverseDrawOdds}%` : 'Перезды: 0'}
Позиция: ${heroPosition.value}, игроков в банке: ${playersInPot.value}
Банк: ${pot.value}, ставка/колл: ${ourBet.value}
${threats.length ? `\nУГРОЗЫ БОРДА:\n${threats.map(t => '- ' + t).join('\n')}` : ''}

ПРАВИЛА ОТВЕТА:
- Эквити — главный индикатор. Не называй комбинацию "сильной" если эквити < 60%.
- Сравни эквити с пот-оддсами для решения колл/фолд.
- Укажи какие руки оппонентов бьют нашу на этом борде.
- Учти позицию и число игроков.
- Только текст, без JSON/markdown.`;
}

async function fetchStrategy() {
  if (strategyLoading.value) return;
  strategyLoading.value = true;
  strategyContent.value = "";
  try {
    const prompt = buildStrategyPrompt();
    const raw = await callAi(prompt);
    strategyContent.value = raw.trim();
    showStrategyFullscreen.value = true;
  } catch (e) {
    const msg = String(e?.message || "");
    strategyContent.value = /forbidden/i.test(msg)
      ? "Ошибка доступа к AI. Проверьте GROQ_API_KEY в .env и перезапустите dev-сервер."
      : "Ошибка AI: " + msg;
    showStrategyFullscreen.value = true;
  } finally {
    strategyLoading.value = false;
  }
}

async function callAi(prompt) {
  const res = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt })
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error || `HTTP ${res.status}`);
  return data.content;
}

function cardLabel(c) {
  const d = cardDisplay(c);
  return d.rank + d.suit;
}

function analyze() {
  if (!canCalculate.value || isCalculating.value) return;

  isCalculating.value = true;
  result.value = null;
  aiError.value = "";

  const heroCards = [card1.value, card2.value];
  const boardCards = [flop1.value, flop2.value, flop3.value, turn.value, river.value];
  const numOpponents = playersInPot.value - 1;

  const calc = calculate(heroCards, boardCards, numOpponents, pot.value, ourBet.value);
  result.value = {
    equity: calc.equity,
    ev: calc.ev,
    handName: calc.handName,
    potOdds: calc.potOdds,
    outs: calc.outs,
    drawOdds: calc.drawOdds,
    outsList: calc.outsList || [],
    dirtyOuts: calc.dirtyOuts || 0,
    dirtyOutsList: calc.dirtyOutsList || [],
    reverseOuts: calc.reverseOuts,
    reverseDrawOdds: calc.reverseDrawOdds,
    reverseOutsList: calc.reverseOutsList || [],
  };

  isCalculating.value = false;
  nextTick(() =>
    resultRef.value?.scrollIntoView({ behavior: "smooth", block: "start" })
  );
}

function resetAll() {
  card1.value = "";
  card2.value = "";
  flop1.value = "";
  flop2.value = "";
  flop3.value = "";
  turn.value = "";
  river.value = "";
  pot.value = 100;
  ourBet.value = 0;
  playersInPot.value = 2;
  heroPosition.value = "BTN";
  result.value = null;
  aiAnalysis.value = "";
  aiError.value = "";
  showStrategyFullscreen.value = false;
  strategyContent.value = "";
  isCalculating.value = false;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

const isPlusEV = computed(() => result.value != null && result.value.ev > 0);
const equityRingRadius = 36;
const equityRingCircumference = 2 * Math.PI * equityRingRadius;
const equityRingOffset = computed(() =>
  result.value != null
    ? equityRingCircumference -
      (result.value.equity / 100) * equityRingCircumference
    : equityRingCircumference
);
</script>

<template>
  <div class="page">
    <header class="header">
      <h1 class="title">Poker Help <span class="by">(by Lex)</span></h1>
    </header>

    <main class="main">
      <section class="card-panel section">
        <h2 class="section-title">Моя рука</h2>
        <div class="row selects-row">
          <div class="field">
            <label class="label">Карта 1</label>
            <CardSelect
              v-model="card1"
              :options="optionsCard1"
              placeholder="—"
            />
          </div>
          <div class="field">
            <label class="label">Карта 2</label>
            <CardSelect
              v-model="card2"
              :options="optionsCard2"
              placeholder="—"
            />
          </div>
        </div>
      </section>

      <section class="card-panel section">
        <label class="label">Флоп</label>
        <div class="row selects-row three">
          <div class="field">
            <CardSelect
              v-model="flop1"
              :options="optionsFlop1"
              placeholder="—"
            />
          </div>
          <div class="field">
            <CardSelect
              v-model="flop2"
              :options="optionsFlop2"
              placeholder="—"
            />
          </div>
          <div class="field">
            <CardSelect
              v-model="flop3"
              :options="optionsFlop3"
              placeholder="—"
            />
          </div>
        </div>
        <div class="row selects-row turn-river">
          <div class="field" :class="{ disabled: !flopFilled }">
            <label class="label">Терн</label>
            <CardSelect
              v-model="turn"
              :options="flopFilled ? optionsTurn : []"
              :placeholder="flopFilled ? '—' : '⋯'"
            />
          </div>
          <div class="field" :class="{ disabled: !turnFilled }">
            <label class="label">Ривер</label>
            <CardSelect
              v-model="river"
              :options="turnFilled ? optionsRiver : []"
              :placeholder="turnFilled ? '—' : '⋯'"
            />
          </div>
        </div>
      </section>

      <section class="card-panel section">
        <h2 class="section-title">Банк и ставки</h2>
        <div class="row inputs-row">
          <div class="field">
            <label class="label">Банк</label>
            <input
              :value="pot"
              type="text"
              inputmode="numeric"
              class="input-field"
              placeholder="100"
              @input="onPotInput"
              @blur="onPotBlur"
            />
          </div>
          <div class="field">
            <label class="label">Ставка / колл</label>
            <input
              :value="ourBet"
              type="text"
              inputmode="numeric"
              class="input-field"
              placeholder="0"
              @input="onOurBetInput"
              @blur="onOurBetBlur"
            />
          </div>
        </div>
        <div class="row inputs-row row-two">
          <div class="field">
            <label class="label">Игроков в банке</label>
            <input
              :value="playersInPot"
              type="text"
              inputmode="numeric"
              class="input-field"
              placeholder="2"
              @input="onPlayersInPotInput"
              @blur="onPlayersBlur"
            />
          </div>
          <div class="field position-field">
            <label class="label">Наша позиция</label>
            <PositionSelect v-model="heroPosition" :options="POSITIONS" />
          </div>
        </div>
      </section>

      <div class="actions">
        <button
          type="button"
          class="btn btn-ai"
          :disabled="!canCalculate || isCalculating"
          @click="analyze"
        >
          {{ isCalculating ? "Анализ…" : "Анализ" }}
        </button>
        <button type="button" class="btn btn-reset" @click="resetAll">
          Сброс
        </button>
      </div>

      <div v-if="aiError" class="card-panel section error-panel">
        <p class="error-text">Ошибка: {{ aiError }}</p>
      </div>

      <section v-if="result" ref="resultRef" class="card-panel section result">
        <div class="result-row result-row-main">
          <p v-if="result.handName" class="hand-name">{{ result.handName }}</p>
          <div class="equity-ring">
            <svg width="88" height="88" class="progress-ring">
              <circle class="progress-ring-bg" stroke-width="8" :r="equityRingRadius" cx="44" cy="44" />
              <circle class="progress-ring-fill" :stroke="isPlusEV ? 'var(--positive)' : 'var(--negative)'" stroke-width="8" :r="equityRingRadius" cx="44" cy="44" :stroke-dasharray="equityRingCircumference" :stroke-dashoffset="equityRingOffset" />
            </svg>
            <span class="equity-value">{{ result.equity }}%</span>
          </div>
          <p class="ev-inline">
            <span class="ev-label">EV</span>
            <span class="ev-value" :class="isPlusEV ? 'ev-positive' : 'ev-negative'">
              {{ result.ev > 0 ? "+" : "" }}{{ result.ev }}
            </span>
          </p>
        </div>

        <div class="result-row result-row-stats">
          <div v-if="result.potOdds > 0" class="stat-col">
            <span class="stat-label">Пот-оддсы</span>
            <span class="stat-value" :class="result.equity >= result.potOdds ? 'ev-positive' : 'ev-negative'">{{ result.potOdds }}%</span>
          </div>
          <div v-if="result.outs > 0" class="stat-col stat-clickable" @click="showOutsModal = true">
            <span class="stat-label">Ауты</span>
            <span class="stat-value ev-outs">{{ result.outs }}</span>
          </div>
          <div v-if="result.dirtyOuts > 0" class="stat-col stat-clickable" @click="showDirtyOutsModal = true">
            <span class="stat-label">Грязные ауты</span>
            <span class="stat-value ev-danger">{{ result.dirtyOuts }}</span>
          </div>
          <div v-if="result.drawOdds > 0" class="stat-col">
            <span class="stat-label">Доезд</span>
            <span class="stat-value ev-outs">{{ result.drawOdds }}%</span>
          </div>
          <div v-if="result.reverseOuts > 0" class="stat-col stat-clickable stat-danger" @click="showReverseOutsModal = true">
            <span class="stat-label">Перезды</span>
            <span class="stat-value ev-danger">{{ result.reverseOuts }}</span>
          </div>
          <div v-if="result.reverseDrawOdds > 0" class="stat-col">
            <span class="stat-label">Перезд</span>
            <span class="stat-value ev-danger">{{ result.reverseDrawOdds }}%</span>
          </div>
        </div>

        <div class="result-row result-row-verdict">
          <p class="ev-verdict" :class="isPlusEV ? 'ev-positive' : 'ev-negative'">
            {{ isPlusEV ? "Плюсовое решение" : "Минусовое решение" }}
          </p>
        </div>

        <div class="result-row result-row-strategy">
          <button
            type="button"
            class="btn btn-ai btn-strategy"
            :disabled="strategyLoading"
            @click="openStrategyPassword"
          >
            {{ strategyLoading ? "Стратегия…" : "Стратегия" }}
          </button>
        </div>

        <div class="result-legend">
          <ul class="legend-list">
            <li v-if="result.handName">
              <strong>Название комбинации</strong> — лучшая возможная рука по вашим картам и борду (флоп/терн/ривер).
            </li>
            <li>
              <strong>Эквити (круг)</strong> — доля банка, которую ваша рука выигрывает в среднем в этой ситуации (вероятность победы).
            </li>
            <li>
              <strong>EV (ожидаемая ценность)</strong> — средний выигрыш или проигрыш от действия в условных единицах; «+» — выгодно, «−» — невыгодно.
            </li>
            <li v-if="result.potOdds > 0">
              <strong>Пот-оддсы</strong> — минимальный процент побед, при котором колл безубыточен (сравнивайте с эквити: эквити ≥ пот-оддсы — колл ок).
            </li>
            <li v-if="result.outs > 0">
              <strong>Ауты</strong> — карты, которые увеличивают ваше эквити против диапазона оппонента.
            </li>
            <li v-if="result.dirtyOuts > 0">
              <strong>Грязные ауты</strong> — карты, которые улучшают видимую комбинацию, но не увеличивают эквити.
            </li>
            <li v-if="result.drawOdds > 0">
              <strong>Доезд</strong> — вероятность (%) словить хотя бы один аут на оставшихся улицах (терн/ривер).
            </li>
            <li v-if="result.reverseOuts > 0">
              <strong>Перезды</strong> — карты в колоде, при выходе которых на борд оппоненты побеждают значительно чаще.
            </li>
            <li v-if="result.reverseDrawOdds > 0">
              <strong>Перезд</strong> — вероятность (%) выхода хотя бы одного перезда на оставшихся улицах.
            </li>
            <li>
              <strong>Плюсовое/минусовое решение</strong> — вывод по EV: положительный EV = выгодно делать ставку/колл, отрицательный = невыгодно.
            </li>
          </ul>
        </div>
      </section>
    </main>

    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showOutsModal && result && result.outsList?.length" class="outs-overlay outs-overlay-fullscreen" @click.self="showOutsModal = false">
          <div class="outs-modal outs-modal-fullscreen">
            <div class="outs-header">
              <h2 class="outs-title">Ауты</h2>
              <button class="outs-close" @click="showOutsModal = false">✕</button>
            </div>
            <div class="outs-grid">
              <div v-for="(out, i) in result.outsList" :key="i" class="out-card">
                <span class="out-card-face">
                  <span class="out-rank">{{ cardDisplay(out.card).rank }}</span><span class="out-suit" :style="{ color: cardDisplay(out.card).color }">{{ cardDisplay(out.card).suit }}</span>
                </span>
                <span class="out-hand">{{ out.handName }}</span>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showReverseOutsModal && result && result.reverseOutsList?.length" class="outs-overlay outs-overlay-fullscreen" @click.self="showReverseOutsModal = false">
          <div class="outs-modal outs-modal-fullscreen">
            <div class="outs-header">
              <h2 class="outs-title reverse-title">Перезды</h2>
              <button class="outs-close" @click="showReverseOutsModal = false">✕</button>
            </div>
            <p class="reverse-desc">Карты, при выходе которых оппоненты побеждают чаще</p>
            <div class="outs-grid">
              <div v-for="(out, i) in result.reverseOutsList" :key="i" class="out-card reverse-card">
                <span class="out-card-face">
                  <span class="out-rank">{{ cardDisplay(out.card).rank }}</span><span class="out-suit" :style="{ color: cardDisplay(out.card).color }">{{ cardDisplay(out.card).suit }}</span>
                </span>
                <span class="out-hand">{{ out.handName }}</span>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showDirtyOutsModal && result && result.dirtyOutsList?.length" class="outs-overlay outs-overlay-fullscreen" @click.self="showDirtyOutsModal = false">
          <div class="outs-modal outs-modal-fullscreen">
            <div class="outs-header">
              <h2 class="outs-title reverse-title">Грязные ауты</h2>
              <button class="outs-close" @click="showDirtyOutsModal = false">✕</button>
            </div>
            <p class="reverse-desc">Карты, которые улучшают комбинацию по названию, но не повышают эквити</p>
            <div class="outs-grid">
              <div v-for="(out, i) in result.dirtyOutsList" :key="i" class="out-card reverse-card">
                <span class="out-card-face">
                  <span class="out-rank">{{ cardDisplay(out.card).rank }}</span><span class="out-suit" :style="{ color: cardDisplay(out.card).color }">{{ cardDisplay(out.card).suit }}</span>
                </span>
                <span class="out-hand">{{ out.handName }}</span>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showCodeModal" class="outs-overlay" @click.self="showCodeModal = false">
          <div class="code-modal">
            <h3 class="code-title">Введите код доступа</h3>
            <input
              v-model="codeInput"
              type="text"
              inputmode="numeric"
              maxlength="3"
              class="code-input"
              :class="{ 'code-error': codeError }"
              placeholder="•••"
              @input="codeError = false"
              @keydown.enter="tryUnlock"
            />
            <p v-if="codeError" class="code-error-text">Неверный код</p>
            <button class="btn btn-ai code-btn" @click="tryUnlock">Разблокировать</button>
          </div>
        </div>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showStrategyFullscreen" class="strategy-fullscreen" @click.self="showStrategyFullscreen = false">
          <div class="strategy-fullscreen-inner">
            <div class="strategy-fullscreen-header">
              <h2 class="strategy-fullscreen-title">Стратегия</h2>
              <button type="button" class="outs-close strategy-close" @click="showStrategyFullscreen = false">✕</button>
            </div>
            <div v-if="strategyLoading" class="strategy-loading">
              <div class="strategy-spinner"></div>
              <p>Загрузка анализа…</p>
            </div>
            <div v-else class="strategy-body">{{ strategyContent }}</div>
          </div>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>

<style scoped>
.page {
  min-height: 100vh;
  padding: 2rem 1rem 3rem;
  max-width: 640px;
  margin: 0 auto;
}

.header {
  text-align: center;
  margin-bottom: 2rem;
}

h1 .by{
  font-size: .4em;
  font-weight: 400;
  vertical-align: middle;
}

.title {
  font-size: 1.75rem;
  font-weight: 700;
  margin: 0 0 0.25rem;
  background: linear-gradient(135deg, #a78bfa, #7c3aed);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  filter: drop-shadow(0 0 8px rgba(167, 139, 250, 0.4)) drop-shadow(0 0 16px rgba(124, 58, 237, 0.2));
}

.subtitle {
  font-size: 0.9rem;
  color: var(--text-muted);
  margin: 0;
}

.main {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.section-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text);
  margin: 0 0 1rem;
}

.row {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.selects-row.three {
  flex-wrap: nowrap;
}
.selects-row.three .field {
  flex: 1 1 0;
  min-width: 0;
}
.selects-row.turn-river {
  flex-wrap: nowrap;
  margin-top: 0.75rem;
}
.selects-row.turn-river .field {
  flex: 1 1 0;
  min-width: 0;
}
.inputs-row .field {
  flex: 1;
  min-width: 100px;
}

.field {
  flex: 1;
  min-width: 0;
}

.field.disabled {
  opacity: 0.4;
  pointer-events: none;
}

.row-two {
  margin-top: 0.75rem;
}

.position-field {
  width: 100%;
  max-width: 160px;
}

.actions {
  margin-top: 0.5rem;
  display: flex;
  gap: 0.75rem;
}

.btn-neon {
  flex: 1;
  padding: 0.75rem 1.25rem;
  background: #0ea5e9;
  color: #fff;
  border: none;
  border-radius: 10px;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: box-shadow 0.2s, opacity 0.2s;
  box-shadow: 0 0 10px rgba(14, 165, 233, 0.35),
    0 0 20px rgba(14, 165, 233, 0.2), inset 0 0 12px rgba(14, 165, 233, 0.06);
}

.btn-neon:hover:not(:disabled) {
  box-shadow: 0 0 14px rgba(14, 165, 233, 0.5),
    0 0 28px rgba(14, 165, 233, 0.28), inset 0 0 16px rgba(14, 165, 233, 0.09);
}

.btn-neon:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  box-shadow: none;
}

.btn-reset {
  padding: 0.75rem 1.25rem;
  background: transparent;
  color: var(--text-muted);
  border: 1px solid var(--border);
  border-radius: 10px;
  font-weight: 500;
  font-size: 1rem;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
}

.btn-reset:hover {
  border-color: var(--text-muted);
  color: var(--text);
}

.result {
  margin-top: 0.5rem;
}

.hand-name {
  font-size: 1.5rem;
  font-weight: 700;
  color: #0ea5e9;
  margin: 0;
  text-shadow: 0 0 6px rgba(14, 165, 233, 0.4), 0 0 14px rgba(14, 165, 233, 0.2);
}

.result-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1.25rem;
}

.result-row-main {
  padding-bottom: 0.75rem;
}

.result-row-stats {
  padding: 0.75rem 0;
  border-top: 1px solid var(--border);
  flex-wrap: wrap;
  gap: 0.85rem 1.5rem;
}

.result-row-verdict {
  padding-top: 0.75rem;
  border-top: 1px solid var(--border);
}

.result-row-strategy {
  padding-top: 0.75rem;
}

.btn-strategy {
  width: 100%;
  max-width: none;
}

.equity-ring {
  position: relative;
  width: 88px;
  height: 88px;
  flex-shrink: 0;
}

.equity-value {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
}

.ev-inline {
  display: flex;
  align-items: baseline;
  gap: 0.4rem;
  margin: 0;
}

.ev-label {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.ev-value {
  font-size: 1.35rem;
  font-weight: 700;
}

.stat-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.15rem;
  min-width: 68px;
}

.stat-label {
  font-size: 0.75rem;
  color: var(--text-muted);
  white-space: nowrap;
}

.stat-value {
  font-size: 1.25rem;
  font-weight: 700;
}

.ev-outs {
  color: #a78bfa;
}

.ev-danger {
  color: #f87171;
}

.stat-danger {
  animation: pulse-danger 2s ease-in-out infinite;
}
.stat-danger:hover {
  animation: none;
}

@keyframes pulse-danger {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.reverse-title {
  color: #f87171 !important;
}

.reverse-desc {
  margin: 0;
  padding: 0.5rem 1.25rem;
  font-size: 0.78rem;
  color: var(--text-muted);
}

.reverse-card {
  border-color: rgba(248, 113, 113, 0.2);
}

.ev-verdict {
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
  text-align: center;
}

.result-legend {
  margin-top: 0.75rem;
  padding-top: 1rem;
}

.legend-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text);
  margin: 0 0 0.6rem;
}

.legend-list {
  margin: 0;
  padding-left: 1.2rem;
  font-size: 0.8rem;
  color: var(--text-muted);
  line-height: 1.5;
}

.legend-list li {
  margin-bottom: 0.4rem;
}

.legend-list li:last-child {
  margin-bottom: 0;
}

.legend-list strong {
  color: var(--text);
}

.ai-section {
  margin-top: 1rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--border);
}

.ai-section-title {
  font-size: 0.85rem;
  font-weight: 600;
  color: #a78bfa;
  margin: 0 0 0.5rem;
}

.ai-inline-text {
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.6;
  color: var(--text);
  white-space: pre-wrap;
}

.error-panel {
  border-color: var(--negative);
}

.error-text {
  margin: 0;
  color: var(--negative);
  font-size: 0.9rem;
  text-align: center;
}

.btn-ai {
  width: 100%;
  padding: 0.65rem 1rem;
  background: linear-gradient(135deg, #a78bfa, #7c3aed);
  color: #fff;
  border: none;
  border-radius: 10px;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  transition: opacity 0.2s, box-shadow 0.2s;
  box-shadow: 0 0 10px rgba(167, 139, 250, 0.3);
}

.btn-ai:hover:not(:disabled) {
  box-shadow: 0 0 16px rgba(167, 139, 250, 0.5);
}

.btn-ai:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}


.code-modal {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 2rem 1.5rem;
  width: 280px;
  text-align: center;
}

.code-title {
  margin: 0 0 1rem;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text);
}

.code-input {
  width: 100%;
  padding: 0.75rem;
  font-size: 1.5rem;
  font-weight: 700;
  text-align: center;
  letter-spacing: 0.5em;
  background: var(--surface-hover);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text);
  outline: none;
  transition: border-color 0.15s;
  box-sizing: border-box;
}

.code-input:focus {
  border-color: #a78bfa;
}

.code-input.code-error {
  border-color: var(--negative);
  animation: shake 0.3s;
}

.code-error-text {
  color: var(--negative);
  font-size: 0.8rem;
  margin: 0.4rem 0 0;
}

.code-btn {
  margin-top: 1rem;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-6px); }
  75% { transform: translateX(6px); }
}

.stat-clickable {
  cursor: pointer;
  padding: 0.35rem 0.5rem;
  border-radius: 6px;
  transition: background 0.15s;
  animation: pulse-outs 2s ease-in-out infinite;
}
.stat-clickable:hover {
  background: var(--surface-hover);
  animation: none;
}

@keyframes pulse-outs {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.outs-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.outs-modal {
  width: 100%;
  max-width: 520px;
  max-height: 90vh;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.outs-overlay-fullscreen {
  align-items: stretch;
  justify-content: stretch;
}

.outs-modal-fullscreen {
  width: 100vw;
  height: 100vh;
  max-width: none;
  max-height: none;
  border: none;
  border-radius: 0;
}

.outs-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  background: var(--surface);
  z-index: 1;
}

.outs-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: #a78bfa;
  margin: 0;
}

.outs-close {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 1.25rem;
  cursor: pointer;
  padding: 0.25rem;
  line-height: 1;
}
.outs-close:hover {
  color: var(--text);
}

.outs-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 0.5rem;
  padding: 1rem 1.25rem;
}

.out-card {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.65rem;
  background: var(--surface-hover);
  border-radius: 8px;
  border: 1px solid var(--border);
}

.out-card-face {
  font-size: 1.1rem;
  font-weight: 700;
  white-space: nowrap;
}

.out-rank {
  color: var(--text);
}

.out-hand {
  font-size: 0.72rem;
  color: var(--text-muted);
  line-height: 1.2;
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}
.modal-enter-active .outs-modal,
.modal-leave-active .outs-modal {
  transition: transform 0.2s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-enter-from .outs-modal {
  transform: scale(0.95);
}
.modal-leave-to .outs-modal {
  transform: scale(0.95);
}

.strategy-fullscreen {
  position: fixed;
  inset: 0;
  z-index: 1001;
  background: rgba(0, 0, 0, 0.92);
  display: flex;
  align-items: stretch;
  justify-content: stretch;
  padding: 0;
  box-sizing: border-box;
}

.strategy-fullscreen-inner {
  width: 100vw;
  height: 100vh;
  max-width: none;
  max-height: none;
  background: var(--surface);
  border: none;
  border-radius: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.strategy-fullscreen-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.strategy-fullscreen-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: #a78bfa;
  margin: 0;
}

.strategy-close {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 1.25rem;
  cursor: pointer;
  padding: 0.25rem;
  line-height: 1;
}

.strategy-close:hover {
  color: var(--text);
}

.strategy-loading {
  padding: 3rem 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  color: var(--text-muted);
  font-size: 0.9rem;
}

.strategy-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border);
  border-top-color: #a78bfa;
  border-radius: 50%;
  animation: strategy-spin 0.8s linear infinite;
}

@keyframes strategy-spin {
  to { transform: rotate(360deg); }
}

.strategy-body {
  padding: 1.25rem 1.5rem;
  overflow-y: auto;
  flex: 1;
  font-size: 0.95rem;
  line-height: 1.65;
  color: var(--text);
  white-space: pre-wrap;
}

@media (max-width: 420px) {
  .result-row-stats {
    gap: 1.25rem;
  }
  .hand-name {
    font-size: 1.25rem;
  }
  .ev-value,
  .stat-value {
    font-size: 1.1rem;
  }
}
</style>
