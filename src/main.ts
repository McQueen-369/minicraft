import { Game } from './game'
import { installTheme } from './ui/theme'

// The shared type scale must land before any panel injects its own styles.
installTheme()

const game = new Game(document.getElementById('app')!)
// Console/debug handle (e.g. automated smoke tests).
;(window as unknown as { __minicraft: Game }).__minicraft = game
