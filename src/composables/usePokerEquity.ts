import PokerHand from 'poker-hand-evaluator'

const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A']
const SUITS = ['s', 'h', 'd', 'c']

function fullDeck(): string[] {
  const cards: string[] = []
  for (const r of RANKS) for (const s of SUITS) cards.push(r + s)
  return cards
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function toUpper(cards: string[]): string {
  return cards.map((c) => c.toUpperCase()).join(' ')
}

function combos<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]]
  if (arr.length < k) return []
  const [first, ...rest] = arr
  return [
    ...combos(rest, k - 1).map((c) => [first, ...c]),
    ...combos(rest, k),
  ]
}

const RANK_NAMES: Record<string, string> = {
  STRAIGHT_FLUSH: 'Стрит-флеш',
  FOUR_OF_A_KIND: 'Каре',
  FULL_HOUSE: 'Фулл-хаус',
  FLUSH: 'Флеш',
  STRAIGHT: 'Стрит',
  THREE_OF_A_KIND: 'Тройка',
  TWO_PAIRS: 'Две пары',
  ONE_PAIR: 'Пара',
  HIGH_CARD: 'Старшая карта',
}

function best5of7(cards: string[]): { score: number; rank: string } {
  if (cards.length < 5) return { score: Infinity, rank: '' }
  const pool = cards.length > 5 ? combos(cards, 5) : [cards]
  let bestScore = Infinity
  let bestRank = ''
  for (const five of pool) {
    const ph = new PokerHand(toUpper(five))
    const s = ph.getScore()
    if (s < bestScore) {
      bestScore = s
      bestRank = ph.getRank()
    }
  }
  return { score: bestScore, rank: RANK_NAMES[bestRank] || bestRank }
}

export interface EquityResult {
  equity: number
  ev: number
  handName: string
  potOdds: number
}

export function usePokerEquity() {
  const calculate = (
    heroCards: string[],
    boardCards: string[],
    numOpponents: number,
    pot: number,
    ourBet: number,
    iterations: number = 2500
  ): EquityResult => {
    const hero = heroCards.filter(Boolean)
    const board = boardCards.filter(Boolean)
    if (hero.length !== 2 || new Set(hero).size !== 2 || board.length < 3)
      return { equity: 0, ev: 0, handName: '', potOdds: 0 }

    const allKnown = [...hero, ...board]
    const used = new Set(allKnown)
    const deck = fullDeck().filter((c) => !used.has(c))
    const missingBoard = 5 - board.length

    let wins = 0
    let counted = 0

    for (let i = 0; i < iterations; i++) {
      const rest = shuffle(deck)
      const filledBoard = [...board, ...rest.slice(0, missingBoard)]
      const heroSeven = [...hero, ...filledBoard]
      const heroResult = best5of7(heroSeven)
      if (heroResult.score === Infinity) continue

      let oppStart = missingBoard
      let heroWins = true
      for (let o = 0; o < numOpponents; o++) {
        const opp1 = rest[oppStart]
        const opp2 = rest[oppStart + 1]
        oppStart += 2
        const oppSeven = [opp1, opp2, ...filledBoard]
        const oppResult = best5of7(oppSeven)
        if (oppResult.score <= heroResult.score) {
          heroWins = false
          break
        }
      }
      if (heroWins) wins++
      counted++
    }

    const equity = counted > 0 ? Math.round((wins / counted) * 10000) / 100 : 0
    const e = equity / 100
    const potAfter = pot + ourBet
    const ev = Math.round((e * potAfter - (1 - e) * ourBet) * 100) / 100
    const potOdds = ourBet > 0 ? Math.round((ourBet / (pot + ourBet)) * 10000) / 100 : 0

    const currentBoard = board.length >= 5 ? board : [...board, ...deck.slice(0, 5 - board.length)]
    const { rank: handName } = best5of7([...hero, ...currentBoard])

    return { equity, ev, handName, potOdds }
  }

  return { calculate }
}
