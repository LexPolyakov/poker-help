<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

const props = defineProps<{
  modelValue: string
  options: { value: string; label: string }[]
}>()

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const open = ref(false)
const root = ref<HTMLElement | null>(null)

const selected = computed(() => props.options.find((o) => o.value === props.modelValue)?.label ?? '—')

function toggle() {
  open.value = !open.value
}

function select(opt: { value: string }) {
  emit('update:modelValue', opt.value)
  open.value = false
}

function handleClickOutside(e: MouseEvent) {
  if (root.value && !root.value.contains(e.target as Node)) open.value = false
}

onMounted(() => document.addEventListener('click', handleClickOutside))
onUnmounted(() => document.removeEventListener('click', handleClickOutside))
</script>

<template>
  <div ref="root" class="position-select">
    <button
      type="button"
      class="position-select-trigger"
      :class="{ open }"
      @click="toggle"
    >
      {{ selected }}
    </button>
    <Transition name="dropdown">
      <div v-show="open" class="position-select-dropdown">
        <button
          v-for="opt in options"
          :key="opt.value"
          type="button"
          class="position-option"
          :class="{ active: opt.value === modelValue }"
          @click="select(opt)"
        >
          {{ opt.label }}
        </button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.position-select {
  position: relative;
  width: 100%;
  z-index: 20;
}

.position-select-trigger {
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
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23a1a1aa' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 36px;
}

.position-select-trigger:hover,
.position-select-trigger.open {
  border-color: var(--accent);
}

.position-select-dropdown {
  position: absolute;
  z-index: 100;
  bottom: calc(100% + 4px);
  left: 0;
  right: 0;
  max-height: 220px;
  overflow-y: auto;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 4px;
  box-shadow: 0 -8px 24px rgba(0, 0, 0, 0.4);
}

.position-option {
  display: block;
  width: 100%;
  padding: 0.5rem 10px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--text);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.position-option:hover {
  background: var(--surface-hover);
}

.position-option.active {
  background: rgba(59, 130, 246, 0.15);
}

.dropdown-enter-active,
.dropdown-leave-active {
  transition: opacity 0.15s ease, transform 0.1s ease;
}
.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(4px);
}
</style>
