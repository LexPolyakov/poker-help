<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import type { CardOption } from "../composables/useDeck";

const props = defineProps<{
  modelValue: string;
  options: CardOption[];
  placeholder?: string;
}>();

const emit = defineEmits<{ "update:modelValue": [value: string] }>();

const open = ref(false);
const root = ref<HTMLElement | null>(null);

const emptyOption: CardOption = {
  value: "",
  label: "—",
  rank: "—",
  suitChar: "",
  suitColor: "transparent",
};
const listOptions = computed(() => [emptyOption, ...props.options]);
const selected = computed(() =>
  listOptions.value.find((o) => o.value === props.modelValue)
);

function toggle() {
  open.value = !open.value;
}

function select(opt: CardOption) {
  emit("update:modelValue", opt.value);
  open.value = false;
}

function close() {
  open.value = false;
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === "Escape") close();
}

onMounted(() => {
  document.addEventListener("click", handleClickOutside);
});
onUnmounted(() => {
  document.removeEventListener("click", handleClickOutside);
});

function handleClickOutside(e: MouseEvent) {
  if (root.value && !root.value.contains(e.target as Node)) close();
}
</script>

<template>
  <div ref="root" class="card-select">
    <button
      type="button"
      class="card-select-trigger"
      :class="{ open }"
      @click="toggle"
      @keydown="onKeydown"
    >
      <template v-if="selected">
        <span class="card-rank">{{ selected.rank }}</span
        ><span class="card-suit" :style="{ color: selected.suitColor }">{{
          selected.suitChar
        }}</span>
      </template>
      <span v-else class="card-placeholder">{{ placeholder || "—" }}</span>
    </button>
    <Transition name="dropdown">
      <div v-show="open" class="card-select-dropdown">
        <button
          v-for="opt in listOptions"
          :key="opt.value || 'empty'"
          type="button"
          class="card-option"
          :class="{ active: opt.value === modelValue }"
          @click="select(opt)"
        >
          <span class="card-rank">{{ opt.rank }}</span
          ><span class="card-suit" :style="{ color: opt.suitColor }">{{
            opt.suitChar
          }}</span>
        </button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.card-select {
  position: relative;
  width: 100%;
}

.card-select-trigger {
  width: 100%;
  padding: 0.6rem 12px;
  background: var(--surface-hover);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.15s;
}

.card-select-trigger:hover,
.card-select-trigger.open {
  border-color: var(--accent);
}

.card-placeholder {
  color: var(--text-muted);
}

.card-rank {
  margin-right: 2px;
}

.card-suit {
  font-weight: 500;
}

.card-select-dropdown {
  position: absolute;
  z-index: 50;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  max-height: 220px;
  overflow-y: auto;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 4px;
}

.card-option {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 0.4rem 10px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--text);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.card-option:hover {
  background: var(--surface-hover);
}

.card-option.active {
  background: rgba(59, 130, 246, 0.15);
}

.dropdown-enter-active,
.dropdown-leave-active {
  transition: opacity 0.15s ease, transform 0.1s ease;
}
.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
