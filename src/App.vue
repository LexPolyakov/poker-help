<script setup>
import { ref, computed, nextTick } from "vue";
import CardSelect from "./components/CardSelect.vue";
import PositionSelect from "./components/PositionSelect.vue";
import { useDeck } from "./composables/useDeck.js";
import EquityWorker from "./worker/equity.worker.js?worker";

const { options, SUIT_SYMBOLS, SUIT_COLORS, RANK_LABELS_EN } = useDeck();

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

let worker = null;

function calculate() {
  if (!canCalculate.value || isCalculating.value) return;
  isCalculating.value = true;
  result.value = null;

  if (worker) worker.terminate();
  worker = new EquityWorker();
  worker.onmessage = (e) => {
    result.value = e.data;
    isCalculating.value = false;
    nextTick(() =>
      resultRef.value?.scrollIntoView({ behavior: "smooth", block: "start" })
    );
    if (worker) worker.terminate();
    worker = null;
  };
  worker.postMessage({
    heroCards: [card1.value, card2.value],
    boardCards: [
      flop1.value,
      flop2.value,
      flop3.value,
      turn.value,
      river.value,
    ].filter(Boolean),
    numOpponents: Math.max(0, playersInPot.value - 1),
    pot: pot.value,
    ourBet: ourBet.value,
    iterations: 2500,
  });
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
  if (worker) worker.terminate();
  worker = null;
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
      <h1 class="title">Poker Help</h1>
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
            <label class="label">В банке (с нами)</label>
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
          class="btn btn-neon"
          :disabled="!canCalculate || isCalculating"
          @click="calculate"
        >
          {{ isCalculating ? "Считаем…" : "Рассчитать" }}
        </button>
        <button type="button" class="btn btn-reset" @click="resetAll">
          Сброс
        </button>
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
          <div v-if="result.drawOdds > 0" class="stat-col">
            <span class="stat-label">Доезд</span>
            <span class="stat-value ev-outs">{{ result.drawOdds }}%</span>
          </div>
        </div>

        <div class="result-row result-row-verdict">
          <p class="ev-verdict" :class="isPlusEV ? 'ev-positive' : 'ev-negative'">
            {{ isPlusEV ? "Плюсовое решение" : "Минусовое решение" }}
          </p>
        </div>
        <div class="result-legend">
          <ul class="legend-list">
            <li>
              <strong>Эквити (круг)</strong> — доля банка, которую ваша рука выигрывает в среднем в этой ситуации (вероятность победы).
            </li>
            <li>
              <strong>Название комбинации</strong> — лучшая возможная рука по вашим картам и борду (флоп/терн/ривер).
            </li>
            <li>
              <strong>EV (ожидаемая ценность)</strong> — средний выигрыш или проигрыш от действия в условных единицах; «+» — выгодно, «−» — невыгодно.
            </li>
            <li>
              <strong>Пот-оддсы</strong> — минимальный процент побед, при котором колл безубыточен (сравнивайте с эквити: эквити ≥ пот-оддсы — колл ок).
            </li>
            <li>
              <strong>Ауты</strong> — количество карт в колоде, которые улучат вашу текущую комбинацию на следующей улице.
            </li>
            <li>
              <strong>Доезд</strong> — вероятность (%) словить хотя бы один аут на оставшихся улицах (терн/ривер).
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
        <div v-if="showOutsModal && result && result.outsList?.length" class="outs-overlay" @click.self="showOutsModal = false">
          <div class="outs-modal">
            <div class="outs-header">
              <h2 class="outs-title">Ауты — {{ result.outs }} карт</h2>
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

.title {
  font-size: 1.75rem;
  font-weight: 700;
  margin: 0 0 0.25rem;
  color: #0ea5e9;
  text-shadow: 0 0 6px rgba(14, 165, 233, 0.4), 0 0 14px rgba(14, 165, 233, 0.2);
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
  gap: 2rem;
}

.result-row-verdict {
  padding-top: 0.75rem;
  border-top: 1px solid var(--border);
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
}

.stat-label {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.stat-value {
  font-size: 1.25rem;
  font-weight: 700;
}

.ev-outs {
  color: #a78bfa;
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
  border-top: 1px solid var(--border);
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
  padding: 1rem;
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
