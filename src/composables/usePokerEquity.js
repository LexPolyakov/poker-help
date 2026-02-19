import PokerHand from 'poker-hand-evaluator'

const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A']
const SUITS = ['s', 'h', 'd', 'c']

function fullDeck() {
  const cards = []
  for (const r of RANKS) for (const s of SUITS) cards.push(r + s)
  return cards
}

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function toUpper(cards) {
  return cards.map((c) => c.toUpperCase()).join(' ')
}

function combos(arr, k) {
  if (k === 0) return [[]]
  if (arr.length < k) return []
  const [first, ...rest] = arr
  return [
    ...combos(rest, k - 1).map((c) => [first, ...c]),
    ...combos(rest, k),
  ]
}

const RANK_NAMES = {
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

function best5of7(cards) {
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

export function usePokerEquity() {
  const calculate = (heroCards, boardCards, numOpponents, pot, ourBet, iterations = 2500) => {
    const hero = heroCards.filter(Boolean)
    const board = boardCards.filter(Boolean)
    if (hero.length !== 2 || new Set(hero).size !== 2 || board.length < 3)
      return { equity: 0, ev: 0, handName: '', potOdds: 0, outs: 0, drawOdds: 0 }

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

    const knownCards = [...hero, ...board]
    const handName = knownCards.length >= 5 ? best5of7(knownCards).rank : ''

    let outs = 0
    let drawOdds = 0
    const streetsLeft = 5 - board.length
    if (streetsLeft > 0 && knownCards.length >= 5) {
      const currentScore = best5of7(knownCards).score
      for (const c of deck) {
        const improved = best5of7([...knownCards, c])
        if (improved.score < currentScore) outs++
      }
      const rem = deck.length
      if (streetsLeft === 1) {
        drawOdds = Math.round((outs / rem) * 10000) / 100
      } else {
        const miss = rem > 0 && rem > outs
          ? ((rem - outs) / rem) * ((rem - 1 - outs) / (rem - 1))
          : 0
        drawOdds = Math.round((1 - miss) * 10000) / 100
      }
    }

    return { equity, ev, handName, potOdds, outs, drawOdds }
  }

  return { calculate }
}
