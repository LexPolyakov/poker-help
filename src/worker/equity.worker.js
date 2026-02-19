import { usePokerEquity } from '../composables/usePokerEquity'

const { calculate } = usePokerEquity()

self.onmessage = (e) => {
  const { heroCards, boardCards, numOpponents, pot, ourBet, iterations } = e.data
  const result = calculate(heroCards, boardCards, numOpponents, pot, ourBet, iterations)
  self.postMessage(result)
}
