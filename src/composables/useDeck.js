import { computed } from 'vue'

const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A']
const SUITS = ['s', 'h', 'd', 'c']
const SUIT_SYMBOLS = { s: '♠', h: '♥', d: '♦', c: '♣' }
const RANK_LABELS_EN = { T: '10', J: 'J', Q: 'Q', K: 'K', A: 'A' }
const SUIT_COLORS = {
  h: '#ef4444',
  d: '#3b82f6',
  c: '#22c55e',
  s: '#e4e4e7',
}

export function useDeck() {
  const deck = computed(() => {
    const cards = []
    for (const r of RANKS) {
      for (const s of SUITS) cards.push(r + s)
    }
    return cards
  })

  const cardToLabel = (card) => {
    if (!card) return ''
    const r = card[0]
    const s = card[1] || ''
    return (RANK_LABELS_EN[r] || r) + (SUIT_SYMBOLS[s] || s)
  }

  const options = computed(() =>
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
