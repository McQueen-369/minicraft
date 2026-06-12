import { Game } from './game'

const game = new Game(document.getElementById('app')!)
// Console/debug handle (e.g. automated smoke tests).
;(window as unknown as { __minicraft: Game }).__minicraft = game
