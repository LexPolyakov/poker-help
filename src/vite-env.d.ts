/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, unknown>
  export default component
}

declare module 'poker-hand-evaluator' {
  export default class PokerHand {
    constructor(hand: string)
    getScore(): number
    getRank(): string
    compareWith(hand: PokerHand): number
  }
}
