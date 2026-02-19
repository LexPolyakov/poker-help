import { computed } from 'vue'

const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'] as const
const SUITS = ['s', 'h', 'd', 'c'] as const
const SUIT_SYMBOLS: Record<string, string> = { s: '♠', h: '♥', d: '♦', c: '♣' }
const RANK_LABELS_EN: Record<string, string> = { T: '10', J: 'J', Q: 'Q', K: 'K', A: 'A' }
/** Красный, синий, зелёный, белый */
const SUIT_COLORS: Record<string, string> = {
  h: '#ef4444',  /* ♥ red */
  d: '#3b82f6',  /* ♦ blue */
  c: '#22c55e',  /* ♣ green */
  s: '#e4e4e7',  /* ♠ white */
}

export type CardOption = { value: string; label: string; rank: string; suitChar: string; suitColor: string }

export function useDeck() {
  const deck = computed(() => {
    const cards: string[] = []
    for (const r of RANKS) {
      for (const s of SUITS) cards.push(r + s)
    }
    return cards
  })

  const cardToLabel = (card: string) => {
    if (!card) return ''
    const r = card[0]
    const s = card[1] || ''
    return (RANK_LABELS_EN[r] || r) + (SUIT_SYMBOLS[s] || s)
  }

  const options = computed<CardOption[]>(() =>
    deck.value.map((id) => {
      const r = id[0]
      const s = id[1] || ''
      return {
        value: id,
        label: cardToLabel(id),
        rank: RANK_LABELS_EN[r] || r,
        suitChar: SUIT_SYMBOLS[s] || s,
        suitColor: SUIT_COLORS[s] || '#e4e4e7',
      }
    })
  )

  return { deck, cardToLabel, options, RANKS, SUITS, SUIT_SYMBOLS, SUIT_COLORS }
}
