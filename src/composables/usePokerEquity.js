import { evaluate, getCardCode, rank, HandRank } from '@pokertools/evaluator'

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

const RANK_NAMES = {
  [HandRank.StraightFlush]: 'Стрит-флеш',
  [HandRank.FourOfAKind]: 'Каре',
  [HandRank.FullHouse]: 'Фулл-хаус',
  [HandRank.Flush]: 'Флеш',
  [HandRank.Straight]: 'Стрит',
  [HandRank.ThreeOfAKind]: 'Тройка',
  [HandRank.TwoPair]: 'Две пары',
  [HandRank.OnePair]: 'Пара',
  [HandRank.HighCard]: 'Старшая карта',
}

const CARD_CODES = Object.fromEntries(
  fullDeck().map((card) => [card, getCardCode(card)])
)

function best5of7(cards) {
  if (cards.length < 5 || cards.length > 7 || new Set(cards).size !== cards.length) {
    return { score: Infinity, rank: '', rankValue: Infinity }
  }

  const codes = []
  for (const card of cards) {
    const code = CARD_CODES[card]
    if (code == null) return { score: Infinity, rank: '', rankValue: Infinity }
    codes.push(code)
  }

  const score = evaluate(codes)
  const rankValue = rank(codes)
  return { score, rank: RANK_NAMES[rankValue] || '', rankValue }
}

function simulateScenario(hero, boardBase, deckBase, numOpponents, trials) {
  const missingBoard = 5 - boardBase.length
  let equityShareSum = 0
  let losses = 0
  let counted = 0
  let topOppRank = ''
  let topOppScore = Infinity

  for (let i = 0; i < trials; i++) {
    const s = shuffle(deckBase)
    const filledBoard = missingBoard > 0 ? [...boardBase, ...s.slice(0, missingBoard)] : boardBase
    const heroRes = best5of7([...hero, ...filledBoard])
    if (heroRes.score === Infinity) continue

    let oppStart = missingBoard
    let bestScore = heroRes.score
    let winners = 1
    let bestOppInTrialScore = Infinity
    let bestOppInTrialRank = ''

    for (let o = 0; o < numOpponents; o++) {
      const oppRes = best5of7([s[oppStart], s[oppStart + 1], ...filledBoard])
      oppStart += 2

      if (oppRes.score < bestOppInTrialScore) {
        bestOppInTrialScore = oppRes.score
        bestOppInTrialRank = oppRes.rank
      }

      if (oppRes.score < bestScore) {
        bestScore = oppRes.score
        winners = 1
      } else if (oppRes.score === bestScore) {
        winners++
      }
    }

    const heroShare = heroRes.score === bestScore ? 1 / winners : 0
    equityShareSum += heroShare
    counted++

    if (heroShare === 0) {
      losses++
      if (bestOppInTrialScore < topOppScore) {
        topOppScore = bestOppInTrialScore
        topOppRank = bestOppInTrialRank
      }
    }
  }

  return {
    equity: counted > 0 ? equityShareSum / counted : 0,
    lossRate: counted > 0 ? losses / counted : 0,
    topOppRank,
  }
}

export function usePokerEquity() {
  const calculate = (heroCards, boardCards, numOpponents, pot, ourBet, iterations = 2500) => {
    const hero = heroCards.filter(Boolean)
    const board = boardCards.filter(Boolean)
    if (hero.length !== 2 || new Set(hero).size !== 2 || board.length < 3)
      return {
        equity: 0,
        ev: 0,
        handName: '',
        potOdds: 0,
        outs: 0,
        drawOdds: 0,
        outsList: [],
        dirtyOuts: 0,
        dirtyOutsList: [],
        reverseOuts: 0,
        reverseDrawOdds: 0,
        reverseOutsList: [],
      }

    const allKnown = [...hero, ...board]
    const used = new Set(allKnown)
    const deck = fullDeck().filter((c) => !used.has(c))
    const baseSim = simulateScenario(hero, board, deck, numOpponents, iterations)
    const equity = Math.round(baseSim.equity * 10000) / 100
    const e = equity / 100
    const potAfter = pot + ourBet
    const ev = Math.round((e * potAfter - (1 - e) * ourBet) * 100) / 100
    const potOdds = ourBet > 0 ? Math.round((ourBet / (pot + ourBet)) * 10000) / 100 : 0

    const knownCards = [...hero, ...board]
    const handName = knownCards.length >= 5 ? best5of7(knownCards).rank : ''

    let outs = 0
    let drawOdds = 0
    const outsList = []
    let dirtyOuts = 0
    const dirtyOutsList = []
    let reverseOuts = 0
    let reverseDrawOdds = 0
    const reverseOutsList = []
    const streetsLeft = 5 - board.length

    if (streetsLeft > 0 && knownCards.length >= 5) {
      const current = best5of7(knownCards)
      const baseEquity = baseSim.equity
      const baseLossRate = baseSim.lossRate
      const sampleN = Math.max(140, Math.floor(iterations / 12))
      const equityEpsilon = 0.005
      const rem = deck.length

      for (const c of deck) {
        const improved = best5of7([...knownCards, c])
        const improvesHand = improved.rankValue < current.rankValue
        const newBoard = [...board, c]
        const deckMinusC = deck.filter(d => d !== c)
        const afterSim = simulateScenario(hero, newBoard, deckMinusC, numOpponents, sampleN)
        const equityAfter = afterSim.equity
        const isRealOut = improvesHand && equityAfter > baseEquity + equityEpsilon

        if (isRealOut) {
          outs++
          outsList.push({
            card: c,
            handName: improved.rank,
          })
        } else if (improvesHand) {
          dirtyOuts++
          dirtyOutsList.push({
            card: c,
            handName: improved.rank,
          })
        }

        if (!isRealOut && afterSim.lossRate > baseLossRate + 0.08) {
          reverseOuts++
          reverseOutsList.push({ card: c, handName: afterSim.topOppRank })
        }
      }

      if (streetsLeft === 1) {
        drawOdds = Math.round((outs / rem) * 10000) / 100
      } else {
        const miss = rem > 0 && rem > outs
          ? ((rem - outs) / rem) * ((rem - 1 - outs) / (rem - 1))
          : 0
        drawOdds = Math.round((1 - miss) * 10000) / 100
      }

      if (reverseOuts > 0) {
        if (streetsLeft === 1) {
          reverseDrawOdds = Math.round((reverseOuts / rem) * 10000) / 100
        } else {
          const miss3 = ((rem - reverseOuts) / rem) * ((rem - 1 - reverseOuts) / (rem - 1))
          reverseDrawOdds = Math.round((1 - miss3) * 10000) / 100
        }
      }
    }

    return {
      equity,
      ev,
      handName,
      potOdds,
      outs,
      drawOdds,
      outsList,
      dirtyOuts,
      dirtyOutsList,
      reverseOuts,
      reverseDrawOdds,
      reverseOutsList,
    }
  }

  return { calculate }
}
