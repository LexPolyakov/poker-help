<script setup lang="ts">
import { ref, computed, nextTick } from "vue";
import CardSelect from "./components/CardSelect.vue";
import PositionSelect from "./components/PositionSelect.vue";
import { useDeck } from "./composables/useDeck";
import type { EquityResult } from "./composables/usePokerEquity";
import EquityWorker from "./worker/equity.worker?worker";

const { options } = useDeck();

const card1 = ref("");
const card2 = ref("");
const flop1 = ref("");
const flop2 = ref("");
const flop3 = ref("");
const turn = ref("");
const river = ref("");
const pot = ref(100);
const ourBet = ref(0);
const playersInPot = ref(1);
const heroPosition = ref("BTN");

const result = ref<EquityResult | null>(null);
const isCalculating = ref(false);
const resultRef = ref<HTMLElement | null>(null);

function onDigitsInput(
  e: Event,
  r: { value: number },
  min: number,
  max?: number
) {
  const el = e.target as HTMLInputElement;
  let v = el.value.replace(/\D/g, "");
  v = v.replace(/^0+/, "") || "0";
  el.value = v;
  if (v === "") r.value = min;
  else if (v === "0") {
    r.value = min === 0 ? 0 : min;
    el.value = String(r.value);
  } else {
    let n = Number(v);
    if (max != null) n = Math.min(max, Math.max(min, n));
    else n = Math.max(min, n);
    r.value = n;
    el.value = String(n);
  }
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

let worker: Worker | null = null;

function calculate() {
  if (!canCalculate.value || isCalculating.value) return;
  isCalculating.value = true;
  result.value = null;

  worker?.terminate();
  worker = new EquityWorker();
  worker.onmessage = (e: MessageEvent<EquityResult>) => {
    result.value = e.data;
    isCalculating.value = false;
    nextTick(() =>
      resultRef.value?.scrollIntoView({ behavior: "smooth", block: "start" })
    );
    worker?.terminate();
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
  playersInPot.value = 1;
  heroPosition.value = "BTN";
  result.value = null;
  worker?.terminate();
  worker = null;
  isCalculating.value = false;
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
      <p class="subtitle">Эквити и EV с учётом позиции и банка</p>
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
              @input="onDigitsInput($event, pot, 0)"
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
              @input="onDigitsInput($event, ourBet, 0)"
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
              placeholder="1"
              @input="onDigitsInput($event, playersInPot, 1, 10)"
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
        <p v-if="result.handName" class="hand-name">{{ result.handName }}</p>

        <div class="result-grid">
          <div class="result-block">
            <div class="equity-ring">
              <svg width="88" height="88" class="progress-ring">
                <circle
                  class="progress-ring-bg"
                  stroke-width="8"
                  :r="equityRingRadius"
                  cx="44"
                  cy="44"
                />
                <circle
                  class="progress-ring-fill"
                  :stroke="isPlusEV ? 'var(--positive)' : 'var(--negative)'"
                  stroke-width="8"
                  :r="equityRingRadius"
                  cx="44"
                  cy="44"
                  :stroke-dasharray="equityRingCircumference"
                  :stroke-dashoffset="equityRingOffset"
                />
              </svg>
              <span class="equity-value">{{ result.equity }}%</span>
            </div>
          </div>
          <div class="result-block ev-block">
            <div class="ev-row">
              <div>
                <p class="ev-label">EV</p>
                <p
                  class="ev-value"
                  :class="isPlusEV ? 'ev-positive' : 'ev-negative'"
                >
                  {{ result.ev > 0 ? "+" : "" }}{{ result.ev }}
                </p>
              </div>
              <div v-if="result.potOdds > 0">
                <p class="ev-label">Пот-оддсы</p>
                <p
                  class="ev-value"
                  :class="
                    result.equity >= result.potOdds
                      ? 'ev-positive'
                      : 'ev-negative'
                  "
                >
                  {{ result.potOdds }}%
                </p>
              </div>
            </div>
            <p
              class="ev-verdict"
              :class="isPlusEV ? 'ev-positive' : 'ev-negative'"
            >
              {{ isPlusEV ? "Плюсовое решение" : "Минусовое решение" }}
            </p>
          </div>
        </div>
      </section>
    </main>
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
  color: var(--text);
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
  box-shadow: 0 0 15px rgba(14, 165, 233, 0.6),
    0 0 30px rgba(14, 165, 233, 0.35), inset 0 0 20px rgba(14, 165, 233, 0.1);
}

.btn-neon:hover:not(:disabled) {
  box-shadow: 0 0 20px rgba(14, 165, 233, 0.8),
    0 0 40px rgba(14, 165, 233, 0.45), inset 0 0 25px rgba(14, 165, 233, 0.15);
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
  font-size: 2.15rem;
  font-weight: 700;
  color: #0ea5e9;
  text-align: center;
  margin: 0 0 1rem;
  text-shadow: 0 0 8px rgba(14, 165, 233, 0.7), 0 0 20px rgba(14, 165, 233, 0.4),
    0 0 40px rgba(14, 165, 233, 0.2);
}

.result-grid {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  flex-wrap: nowrap;
}

.equity-ring {
  position: relative;
  width: 88px;
  height: 88px;
}

.equity-value {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  font-weight: 600;
}

.result-label {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin: 0.35rem 0 0;
}

.ev-block {
  text-align: left;
}

.ev-row {
  display: flex;
  gap: 1.5rem;
}

.ev-label {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin: 0 0 0.25rem;
}

.ev-value {
  font-size: 1.35rem;
  font-weight: 700;
  margin: 0;
}

.ev-verdict {
  font-size: 0.95rem;
  font-weight: 600;
  margin: 0.5rem 0 0;
}

@media (max-width: 420px) {
  .result-grid {
    gap: 1rem;
  }
  .ev-value {
    font-size: 1.1rem;
  }
}
</style>
