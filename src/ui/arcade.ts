import type { Inventory } from '../items/inventory'
import { ItemId, itemDef } from '../items/items'
import {
  DIFFICULTIES,
  DIFFICULTY_META,
  difficultyRules,
  scalePrizes,
  type Difficulty,
  type Prize,
} from './challenge'
import { revealPane } from './theme'

/** How one kiosk presents itself: identity, accent, briefing and reward. */
interface GameMeta {
  title: string
  badge: string
  /** Accent colour, matched to the cabinet model on the island. */
  accent: string
  /** Translucent accent for fills, so panels stay readable over dark chrome. */
  accentSoft: string
  /** Short "how to play" chips, shown before the first move. */
  how: (d: Difficulty) => string[]
  /** One line about what the chosen difficulty changes about the game itself. */
  twist: Record<Difficulty, string>
}

const GAMES: Record<string, GameMeta> = {
  arcadePuzzle: {
    title: 'Sliding Puzzle',
    badge: '🧩',
    accent: '#7cd7ff',
    accentSoft: 'rgba(124,215,255,0.18)',
    how: (d) => [
      `🎯 Put the tiles back in order 1–${difficultyRules(d).puzzle.size ** 2 - 1}`,
      '👆 Tap a tile next to the gap',
      `⚡ ${difficultyRules(d).puzzle.swiftMoves} moves or fewer = top prize tier`,
    ],
    twist: {
      easy: '3×3 grid, lightly shuffled',
      normal: '3×3 grid, fully shuffled',
      hard: '4×4 grid — fifteen tiles to order',
    },
  },
  arcadeRunner: {
    title: 'Island Runner',
    badge: '🏃',
    accent: '#63dd97',
    accentSoft: 'rgba(99,221,151,0.18)',
    how: (d) => [
      '🎯 Jump the cacti, run as far as you can',
      '👆 SPACE or tap the track to jump',
      `⚡ ${difficultyRules(d).runner.target}+ points wins a prize`,
    ],
    twist: {
      easy: 'gentle pace, well-spaced cacti',
      normal: 'standard pace',
      hard: 'fast track, cacti close together',
    },
  },
  arcadeMath: {
    title: 'Math Blaster',
    badge: '🎯',
    accent: '#ffb066',
    accentSoft: 'rgba(255,176,102,0.18)',
    how: (d) => {
      const r = difficultyRules(d).math
      return [
        '🎯 Shoot the target with the right answer',
        `❤ ${r.questions} questions, ${r.lives} lives`,
        `⚡ ${r.target}+ correct wins gold`,
      ]
    },
    twist: {
      easy: 'addition and subtraction only, 5 lives',
      normal: '+ − × ÷ mixed, 3 lives',
      hard: 'bigger numbers and two-step sums, 2 lives',
    },
  },
  arcadeWord: {
    title: 'Word Wizard',
    badge: '🔤',
    accent: '#c79bff',
    accentSoft: 'rgba(199,155,255,0.18)',
    how: (d) => {
      const r = difficultyRules(d).word
      return [
        '🎯 Guess the hidden word letter by letter',
        '⌨ Tap a key or type on your keyboard',
        `⚡ ${r.lives} wrong guesses and the round ends`,
        '📖 Win or lose, you end up with what the word means',
      ]
    },
    twist: {
      easy: 'short words, 8 lives, hint shown',
      normal: 'medium words, 6 lives, hint shown',
      hard: 'long words, 4 lives, hint hidden until your first mistake',
    },
  },
}

const STYLE = `
.mc-arc-overlay {
  position: absolute; inset: 0; z-index: 22;
  display: none; align-items: center; justify-content: center; padding: 14px;
}
.mc-arc-box {
  --acc: var(--mc-accent, #7cd7ff);
  --acc-soft: var(--mc-accent-soft, rgba(124,215,255,0.16));
  border-top: 2px solid var(--acc);
  width: 620px; max-width: 100%; max-height: 94vh;
  display: flex; flex-direction: column; overflow: hidden;
}
.mc-arc-hdr {
  flex: 0 0 auto; padding: 14px 16px;
  border-bottom: 1px solid var(--mc-stroke, rgba(255,255,255,0.12));
  display: flex; align-items: center; gap: 12px;
}
.mc-arc-badge {
  width: 2.2em; height: 2.2em; flex: 0 0 auto;
  border-radius: var(--mc-radius-sm, 10px); background: var(--acc-soft);
  border: 1px solid var(--acc); display: flex; align-items: center; justify-content: center;
  font-size: var(--mc-fs-md, 16px);
}
.mc-arc-titles { flex: 1 1 auto; min-width: 0; }
.mc-arc-title { font-size: var(--mc-fs-lg, 18px); font-weight: 600; color: #fff; }
.mc-arc-reward { font-size: var(--mc-fs-xs, 12.5px); color: var(--mc-gold, #ffd77a); margin-top: 3px; }
.mc-arc-body {
  flex: 1 1 auto; overflow-y: auto; padding: 18px;
  display: flex; flex-direction: column; gap: 14px; align-items: center;
}
/* Briefing chips: the rules of the game, before you have to guess them. */
.mc-arc-how { display: flex; flex-wrap: wrap; gap: 7px; justify-content: center; }
.mc-arc-chip {
  background: var(--acc-soft); border: 1px solid var(--acc);
  border-radius: var(--mc-radius-pill, 999px);
  padding: 6px 14px; font-size: var(--mc-fs-xs, 12.5px); color: #eef1ff; line-height: 1.4;
}
.mc-arc-status {
  font-size: var(--mc-fs-md, 16px); font-weight: 600; color: #fff; text-align: center;
  background: var(--mc-raised, rgba(255,255,255,0.06));
  border: 1px solid var(--mc-stroke, rgba(255,255,255,0.12));
  border-radius: var(--mc-radius-pill, 999px);
  padding: 9px 20px; min-width: 200px; letter-spacing: 0.8px;
}
.mc-arc-btn {
  background: var(--acc-soft); border: 1px solid var(--acc); color: #dcf3ff;
  border-radius: var(--mc-radius-sm, 10px);
  font-family: var(--mc-font, sans-serif); font-size: var(--mc-fs-md, 16px); font-weight: 600;
  padding: 11px 22px; cursor: pointer; -webkit-tap-highlight-color: transparent;
  transition: background 0.16s var(--mc-ease, ease), transform 0.1s var(--mc-ease, ease);
}
.mc-arc-btn:hover { background: rgba(124,215,255,0.3); }
.mc-arc-btn:active { transform: translateY(1px); }
.mc-arc-btn.alt {
  background: var(--mc-raised, rgba(255,255,255,0.06));
  border-color: var(--mc-stroke, rgba(255,255,255,0.12)); color: var(--mc-text, #fff);
}
.mc-arc-btn.alt:hover { background: var(--mc-raised-hover, rgba(255,255,255,0.12)); }
.mc-arc-actions { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; }
/* --- difficulty picker --- */
.mc-arc-pick-head {
  font-size: var(--mc-fs-md, 16px); font-weight: 600; color: #fff; text-align: center;
}
.mc-arc-pick-sub {
  font-size: var(--mc-fs-xs, 12.5px); color: var(--mc-text-faint, #888);
  text-align: center; margin-top: -8px;
}
.mc-arc-levels {
  display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; width: 100%;
}
.mc-arc-level {
  --lvl: var(--mc-accent, #7cd7ff);
  flex: 1 1 170px; max-width: 220px; min-width: 150px;
  background: var(--mc-raised, rgba(255,255,255,0.06));
  border: 1px solid var(--lvl); border-radius: var(--mc-radius, 16px);
  color: var(--mc-text, #fff); font-family: var(--mc-font, sans-serif); text-align: left;
  padding: 14px; cursor: pointer; -webkit-tap-highlight-color: transparent;
  display: flex; flex-direction: column; gap: 6px;
  transition: background 0.16s var(--mc-ease, ease), transform 0.12s var(--mc-ease, ease);
}
.mc-arc-level:hover { background: var(--mc-raised-hover, rgba(255,255,255,0.12)); transform: translateY(-2px); }
.mc-arc-level-name { font-size: var(--mc-fs-lg, 18px); font-weight: 600; color: var(--lvl); }
.mc-arc-level-reward { font-size: var(--mc-fs-sm, 14px); font-weight: 600; color: var(--mc-gold, #ffd77a); }
.mc-arc-level-blurb { font-size: var(--mc-fs-xs, 12.5px); color: var(--mc-text-dim, #ccc); line-height: 1.5; }
.mc-arc-level-twist {
  font-size: var(--mc-fs-xs, 12.5px); color: var(--mc-text-faint, #888); line-height: 1.5;
  border-top: 1px solid var(--mc-stroke, rgba(255,255,255,0.12)); padding-top: 6px;
}
/* --- puzzle --- */
.mc-arc-grid {
  display: grid; grid-template-columns: repeat(3, var(--tile)); gap: 7px;
  --tile: clamp(62px, 19vmin, 88px);
}
.mc-arc-tile {
  width: var(--tile); height: var(--tile); font-size: var(--mc-fs-2xl, 28px); font-weight: 600;
  cursor: pointer; border-radius: var(--mc-radius-sm, 10px); color: #0d1520;
  background: var(--acc); border: 1px solid rgba(255,255,255,0.3);
  font-family: var(--mc-font, sans-serif);
  transition: filter 0.14s var(--mc-ease, ease), transform 0.1s var(--mc-ease, ease);
  -webkit-tap-highlight-color: transparent;
}
.mc-arc-tile:hover { filter: brightness(1.12); }
.mc-arc-tile:active { transform: scale(0.96); }
.mc-arc-tile.blank {
  background: rgba(255,255,255,0.04); border-color: var(--mc-stroke, rgba(255,255,255,0.12));
  cursor: default;
}
/* --- runner --- */
.mc-arc-canvas {
  background: rgba(8,11,18,0.72); border: 1px solid var(--mc-stroke, rgba(255,255,255,0.12));
  border-radius: var(--mc-radius-sm, 10px);
  touch-action: none; width: 100%; max-width: 520px; height: auto;
}
/* --- math --- */
.mc-arc-question {
  font-size: var(--mc-fs-2xl, 28px); font-weight: 600; letter-spacing: 2px; color: #fff;
}
.mc-arc-targets {
  position: relative; width: 100%; max-width: 500px;
  height: clamp(200px, 34vh, 250px);
}
.mc-arc-target {
  position: absolute; width: var(--target); height: var(--target); border-radius: 50%;
  --target: clamp(62px, 17vmin, 84px); cursor: crosshair;
  background: radial-gradient(circle, #ffdf6b 0 28%, #e67e22 30% 60%, #c0392b 62% 100%);
  border: 2px solid rgba(255,255,255,0.35); color: #1a1a1a;
  font-size: var(--mc-fs-lg, 20px); font-weight: 700;
  font-family: var(--mc-font, sans-serif); -webkit-tap-highlight-color: transparent;
  box-shadow: 0 6px 20px rgba(0,0,0,0.4);
  animation: mc-arc-bob 2.2s ease-in-out infinite;
}
.mc-arc-target:nth-child(2n) { animation-duration: 2.8s; }
.mc-arc-target:nth-child(3n) { animation-delay: 0.6s; }
@keyframes mc-arc-bob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-14px); } }
/* --- word --- */
.mc-arc-word {
  font-family: var(--mc-font-mono, monospace);
  font-size: var(--mc-fs-2xl, 30px); letter-spacing: 0.32em; font-weight: 700; color: #fff;
  text-align: center; word-break: break-all; line-height: 1.4;
}
.mc-arc-hint {
  font-size: var(--mc-fs-sm, 14px); color: var(--mc-text-dim, #ccc); text-align: center; line-height: 1.6;
  background: var(--mc-raised, rgba(255,255,255,0.06));
  border: 1px solid var(--mc-stroke, rgba(255,255,255,0.12));
  border-left: 2px solid var(--acc); border-radius: var(--mc-radius-sm, 10px);
  padding: 11px 14px; max-width: 460px;
}
.mc-arc-kb { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; max-width: 460px; }
.mc-arc-key {
  width: clamp(34px, 9vmin, 44px); height: clamp(38px, 10vmin, 48px);
  background: var(--mc-raised, rgba(255,255,255,0.06)); color: #fff; font-weight: 600;
  border-radius: var(--mc-radius-xs, 6px);
  border: 1px solid var(--mc-stroke, rgba(255,255,255,0.12)); cursor: pointer;
  font-family: var(--mc-font, sans-serif); font-size: var(--mc-fs-md, 16px);
  transition: background 0.14s var(--mc-ease, ease);
  -webkit-tap-highlight-color: transparent;
}
.mc-arc-key:hover:not(:disabled) { background: var(--mc-raised-hover, rgba(255,255,255,0.12)); }
.mc-arc-key:disabled { opacity: 0.3; cursor: default; }
.mc-arc-key.good {
  background: var(--mc-good-soft, rgba(99,221,151,0.18)); border-color: rgba(99,221,151,0.6); color: #d8ffe8;
}
.mc-arc-key.bad {
  background: var(--mc-bad-soft, rgba(255,130,114,0.18)); border-color: rgba(255,130,114,0.6); color: #ffd9d3;
}
/* --- results --- */
.mc-arc-result {
  width: 100%; max-width: 460px; border-radius: var(--mc-radius, 16px);
  padding: 14px 18px; text-align: center;
  border: 1px solid rgba(99,221,151,0.45); background: var(--mc-good-soft, rgba(99,221,151,0.18));
}
.mc-arc-result.lose {
  border-color: rgba(255,130,114,0.45); background: var(--mc-bad-soft, rgba(255,130,114,0.18));
}
.mc-arc-result-head {
  font-size: var(--mc-fs-lg, 18px); font-weight: 600; color: var(--mc-good, #63dd97); margin-bottom: 5px;
}
.mc-arc-result.lose .mc-arc-result-head { color: var(--mc-bad, #ff8272); }
.mc-arc-result-body { font-size: var(--mc-fs-sm, 14px); color: var(--mc-text-dim, #ccc); line-height: 1.7; }
.mc-arc-prize {
  margin-top: 10px; font-size: var(--mc-fs-md, 16px); font-weight: 600;
  color: var(--mc-gold, #ffd77a); line-height: 1.7;
}
/* --- the word's dictionary entry, shown once the round is over --- */
.mc-arc-define {
  width: 100%; max-width: 460px; text-align: left;
  background: var(--mc-raised, rgba(255,255,255,0.06));
  border: 1px solid var(--mc-stroke, rgba(255,255,255,0.12));
  border-left: 2px solid var(--acc);
  border-radius: var(--mc-radius, 16px);
  padding: 14px 18px;
}
.mc-arc-define-label {
  font-size: var(--mc-fs-2xs, 11px); font-weight: 600; letter-spacing: 1.2px;
  text-transform: uppercase; color: var(--mc-text-faint, #888); margin-bottom: 8px;
}
.mc-arc-define-head {
  display: flex; align-items: baseline; flex-wrap: wrap; gap: 10px; margin-bottom: 6px;
}
.mc-arc-define-word {
  font-size: var(--mc-fs-lg, 18px); font-weight: 700; letter-spacing: 1.5px; color: #fff;
}
.mc-arc-define-pos {
  font-size: var(--mc-fs-xs, 12.5px); font-style: italic; color: var(--acc);
}
.mc-arc-define-meaning {
  font-size: var(--mc-fs-sm, 14px); color: var(--mc-text-dim, #ccc); line-height: 1.65;
}
`

/**
 * One round's word.
 *
 * `hint` is the riddle you play against — deliberately oblique, so guessing
 * still takes work. `pos` and `meaning` are the dictionary entry shown once the
 * round is over: a plain definition of the word itself, the part players are
 * meant to walk away with. Keeping the two apart matters — a definition given
 * up front would hand over most rounds, and a riddle kept as the takeaway
 * would teach nothing.
 */
export interface WordEntry {
  word: string
  hint: string
  /** Part of speech, as a dictionary would label it. */
  pos: string
  /** What the word actually means, in a sentence a child can read. */
  meaning: string
}

export const WORDS: WordEntry[] = [
  // short (easy)
  {
    word: 'LAVA', hint: 'Molten rock once it reaches the surface', pos: 'noun',
    meaning: 'Molten rock that has erupted onto the surface of the Earth, where it flows, cools and hardens.',
  },
  {
    word: 'SEED', hint: 'A tiny plant packed with its own lunch', pos: 'noun',
    meaning: 'The small part a plant makes to grow a new plant, holding a tiny embryo and a store of food for it.',
  },
  {
    word: 'WOOL', hint: 'What a sheep grows and a shearer collects', pos: 'noun',
    meaning: 'The soft, curly hair that grows on a sheep, spun into yarn and woven or knitted into warm cloth.',
  },
  {
    word: 'ROOT', hint: 'The part of a plant that drinks from the soil', pos: 'noun',
    meaning: 'The underground part of a plant, which holds it in place and draws up water and nutrients from the soil.',
  },
  {
    word: 'GILLS', hint: 'How a fish pulls oxygen out of water', pos: 'plural noun',
    meaning: 'The feathery organs a fish breathes with, taking oxygen out of the water that flows over them.',
  },
  {
    word: 'STONE', hint: 'The grey block a pickaxe is made for', pos: 'noun',
    meaning: 'Hard, solid mineral matter that rock is made of — or a single piece broken from it.',
  },
  {
    word: 'OCEAN', hint: 'Covers about seven tenths of the planet', pos: 'noun',
    meaning: 'The vast body of salt water that covers most of the Earth, divided into five named parts.',
  },
  {
    word: 'CRUST', hint: 'The thin outer shell of the Earth', pos: 'noun',
    meaning: "The thin, solid outermost layer of the Earth, resting on the far hotter mantle beneath it.",
  },
  // medium (normal)
  {
    word: 'CHICKEN', hint: 'Tamed with seeds — lays eggs every two days', pos: 'noun',
    meaning: 'A domesticated bird, descended from the wild junglefowl, kept for its eggs and its meat.',
  },
  {
    word: 'ISLAND', hint: 'Land completely surrounded by water', pos: 'noun',
    meaning: 'A piece of land smaller than a continent and completely surrounded by water.',
  },
  {
    word: 'VOLCANO', hint: 'A mountain that can erupt with lava', pos: 'noun',
    meaning: "An opening in the Earth's crust through which lava, ash and gas erupt, often building a mountain over time.",
  },
  {
    word: 'ENERGY', hint: 'You spend it mining; food and sleep restore it', pos: 'noun',
    meaning: 'The capacity to do work — what is spent whenever something moves, heats up or gives off light.',
  },
  {
    word: 'PUZZLE', hint: 'A problem you solve for fun', pos: 'noun / verb',
    meaning: 'A problem or game set as a test of cleverness. As a verb, it means to leave someone baffled.',
  },
  {
    word: 'TREASURE', hint: 'Hidden riches explorers hunt for', pos: 'noun',
    meaning: 'A store of valuable things — gold, jewels, money — especially one that has been hidden or lost.',
  },
  {
    word: 'COMPASS', hint: 'It always points north', pos: 'noun',
    meaning: "An instrument for finding direction, using a magnetised needle that swings to line up with the Earth's magnetic field.",
  },
  {
    word: 'HARVEST', hint: 'Gathering crops when they are ready', pos: 'noun / verb',
    meaning: 'The gathering in of ripe crops — also the season it happens in, and the amount brought in.',
  },
  {
    word: 'LANTERN', hint: 'A little light you can carry at night', pos: 'noun',
    meaning: 'A portable lamp with a transparent case that shields the flame or bulb inside from wind and rain.',
  },
  {
    word: 'GLACIER', hint: 'A slow-moving river of ice', pos: 'noun',
    meaning: 'A huge mass of ice, built up from packed snow, that creeps slowly downhill under its own weight.',
  },
  {
    word: 'ORCHARD', hint: 'A field of fruit trees', pos: 'noun',
    meaning: 'A piece of land planted with fruit trees, grown together so the crop can be tended and picked.',
  },
  {
    word: 'MINERAL', hint: 'Gold ore is one of these', pos: 'noun',
    meaning: 'A naturally occurring solid with a definite chemical make-up and an orderly crystal structure — what rocks are built from.',
  },
  {
    word: 'MAGMA', hint: 'What lava is called while it is still underground', pos: 'noun',
    meaning: "Molten rock still beneath the Earth's surface. The same material is called lava once it erupts.",
  },
  {
    word: 'BASALT', hint: 'The dark rock that cooled lava turns into', pos: 'noun',
    meaning: 'A dark, fine-grained volcanic rock formed when lava cools quickly — the commonest rock of the ocean floor.',
  },
  // long (hard)
  {
    word: 'CHLOROPHYLL', hint: 'The green pigment a leaf uses to catch sunlight', pos: 'noun',
    meaning: 'The green pigment in plants that absorbs sunlight and powers photosynthesis. It is what makes leaves green.',
  },
  {
    word: 'PHOTOSYNTHESIS', hint: 'Turning light, air and water into sugar', pos: 'noun',
    meaning: 'The process by which green plants use light energy to turn carbon dioxide and water into sugar, giving off oxygen.',
  },
  {
    word: 'SEDIMENTARY', hint: 'Rock built up from settled layers', pos: 'adjective',
    meaning: 'Of rock: formed from layers of sand, mud or shell that settled, piled up and were pressed together over ages.',
  },
  {
    word: 'CRYSTALLINE', hint: 'Made of atoms locked in a repeating pattern', pos: 'adjective',
    meaning: 'Made of atoms arranged in a regular, repeating three-dimensional pattern — or simply as clear as crystal.',
  },
  {
    word: 'EVAPORATION', hint: 'Water leaving a puddle as invisible vapour', pos: 'noun',
    meaning: 'The change of a liquid into vapour at its surface, happening below boiling point — how a puddle dries up.',
  },
  {
    word: 'HIBERNATION', hint: 'Sleeping through the winter to save energy', pos: 'noun',
    meaning: "A deep winter sleep in which an animal's heartbeat, breathing and temperature drop so it can live off stored fat.",
  },
  {
    word: 'ARCHAEOLOGY', hint: 'Digging up the past to study it', pos: 'noun',
    meaning: 'The study of human history through digging up sites and examining the buildings and objects people left behind.',
  },
  {
    word: 'CONSTELLATION', hint: 'A pattern people traced between the stars', pos: 'noun',
    meaning: 'A group of stars seen from Earth as forming a pattern, given a name — such as Orion or the Great Bear.',
  },
  {
    word: 'GERMINATION', hint: 'The moment a seed starts to sprout', pos: 'noun',
    meaning: 'The sprouting of a seed: it takes in water, splits its coat and pushes out a root and shoot to become a seedling.',
  },
  {
    word: 'THERMOMETER', hint: 'It tells you how hot the lava is — from a safe distance', pos: 'noun',
    meaning: 'An instrument for measuring temperature, reading out how hot or cold something is on a fixed scale.',
  },
]

/**
 * The word's dictionary entry, built for the end-of-round card.
 *
 * The point of the word game is the word, not the guessing, so this is shown
 * on a win and a loss alike: guessing it right and not knowing what it means
 * teaches nothing.
 */
export function defineCard(entry: WordEntry): HTMLDivElement {
  const box = document.createElement('div')
  box.className = 'mc-arc-define'
  const label = document.createElement('div')
  label.className = 'mc-arc-define-label'
  label.textContent = '📖 What it means'
  const head = document.createElement('div')
  head.className = 'mc-arc-define-head'
  const word = document.createElement('span')
  word.className = 'mc-arc-define-word'
  word.textContent = entry.word
  const pos = document.createElement('span')
  pos.className = 'mc-arc-define-pos'
  pos.textContent = entry.pos
  head.append(word, pos)
  const meaning = document.createElement('div')
  meaning.className = 'mc-arc-define-meaning'
  meaning.textContent = entry.meaning
  box.append(label, head, meaning)
  return box
}

/** Words whose length fits the tier, falling back to the whole list. */
export function wordsFor(rules: { minLength: number; maxLength: number }): WordEntry[] {
  const fit = WORDS.filter((w) => w.word.length >= rules.minLength && w.word.length <= rules.maxLength)
  return fit.length ? fit : WORDS
}

/**
 * The secret island's mini-game arcade: four small educational games
 * (sliding puzzle, endless runner, math target shooting, word guessing)
 * that pay out item prizes into the player's inventory.
 *
 * Every game is framed the same way — badge, title, advertised reward, a row
 * of "how to play" chips, one status pill, then the game — so a player who has
 * learned one kiosk already knows how to read the next.
 */
export class ArcadePanel {
  private readonly overlay: HTMLDivElement
  private readonly box: HTMLDivElement
  private readonly badgeEl: HTMLSpanElement
  private readonly titleEl: HTMLDivElement
  private readonly rewardEl: HTMLDivElement
  private readonly body: HTMLDivElement
  private _isOpen = false
  private runnerRaf = 0
  private keyHandler: ((e: KeyboardEvent) => void) | null = null
  /** Which kiosk is open, so "change difficulty" can re-show its picker. */
  private kind = 'arcadePuzzle'
  /** Tier chosen for the round in progress. */
  private level: Difficulty = 'normal'

  onClose: () => void = () => {}
  onPrize: (summary: string) => void = () => {}

  get isOpen(): boolean { return this._isOpen }

  constructor(
    root: HTMLElement,
    private readonly inventory: Inventory,
  ) {
    const style = document.createElement('style')
    style.textContent = STYLE
    document.head.appendChild(style)

    this.overlay = document.createElement('div')
    this.overlay.className = 'mc-arc-overlay mc-scrim'
    this.overlay.addEventListener('mousedown', (e) => { if (e.target === this.overlay) this.close() })

    this.box = document.createElement('div')
    this.box.className = 'mc-arc-box mc-glass'
    const hdr = document.createElement('div')
    hdr.className = 'mc-arc-hdr'
    this.badgeEl = document.createElement('span')
    this.badgeEl.className = 'mc-arc-badge'
    const titles = document.createElement('div')
    titles.className = 'mc-arc-titles'
    this.titleEl = document.createElement('div')
    this.titleEl.className = 'mc-arc-title'
    this.rewardEl = document.createElement('div')
    this.rewardEl.className = 'mc-arc-reward'
    titles.append(this.titleEl, this.rewardEl)
    const closeBtn = document.createElement('button')
    closeBtn.className = 'mc-arc-close mc-close-btn'
    closeBtn.textContent = '✕'
    closeBtn.title = 'Close (Esc)'
    const doClose = (e: Event) => { e.preventDefault(); this.close() }
    closeBtn.addEventListener('click', doClose)
    closeBtn.addEventListener('touchstart', doClose, { passive: false })
    hdr.append(this.badgeEl, titles, closeBtn)

    this.body = document.createElement('div')
    this.body.className = 'mc-arc-body'

    this.box.append(hdr, this.body)
    this.overlay.appendChild(this.box)
    root.appendChild(this.overlay)
  }

  /** Open the kiosk for an arcade kind (e.g. 'arcadePuzzle') at its difficulty picker. */
  open(kind: string): void {
    this._isOpen = true
    this.overlay.style.display = 'flex'
    revealPane(this.box)
    this.kind = kind in GAMES ? kind : 'arcadePuzzle'
    this.showDifficultyPicker()
  }

  /**
   * The gate every challenge starts at: pick Easy, Normal or Hard. Each option
   * spells out both what changes about the game and what the win is worth, so
   * the trade is visible before the player commits.
   */
  private showDifficultyPicker(): void {
    const meta = this.frame(this.kind, null)
    this.body.appendChild(this.el('div', 'mc-arc-pick-head', 'Choose your challenge'))
    this.body.appendChild(this.el('div', 'mc-arc-pick-sub', 'Harder rounds pay bigger rewards.'))
    const levels = this.el('div', 'mc-arc-levels')
    for (const d of DIFFICULTIES) {
      const dm = DIFFICULTY_META[d]
      const btn = this.el('button', 'mc-arc-level')
      btn.style.setProperty('--lvl', dm.colour)
      btn.appendChild(this.el('div', 'mc-arc-level-name', `${dm.badge} ${dm.label}`))
      btn.appendChild(this.el('div', 'mc-arc-level-reward', `🏆 ${rewardMultiplierLabel(d)}`))
      btn.appendChild(this.el('div', 'mc-arc-level-blurb', dm.blurb))
      btn.appendChild(this.el('div', 'mc-arc-level-twist', meta.twist[d]))
      const press = (e: Event) => { e.preventDefault(); this.startAtLevel(d) }
      btn.addEventListener('click', press)
      btn.addEventListener('touchstart', press, { passive: false })
      levels.appendChild(btn)
    }
    this.body.appendChild(levels)
  }

  private startAtLevel(d: Difficulty): void {
    this.level = d
    if (this.kind === 'arcadePuzzle') this.startPuzzle()
    else if (this.kind === 'arcadeRunner') this.startRunner()
    else if (this.kind === 'arcadeMath') this.startMath()
    else this.startWord()
  }

  /** Actions offered on every result card: replay this tier, or change tier. */
  private replayActions(replay: () => void): { label: string; onClick: () => void; alt?: boolean }[] {
    return [
      { label: '↻ Play again', onClick: replay, alt: true },
      { label: '⚙ Change difficulty', onClick: () => this.showDifficultyPicker(), alt: true },
    ]
  }

  close(): void {
    if (!this._isOpen) return
    this._isOpen = false
    this.overlay.style.display = 'none'
    this.stopLoops()
    this.onClose()
  }

  private stopLoops(): void {
    if (this.runnerRaf) cancelAnimationFrame(this.runnerRaf)
    this.runnerRaf = 0
    if (this.keyHandler) document.removeEventListener('keydown', this.keyHandler)
    this.keyHandler = null
  }

  private el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
    const e = document.createElement(tag)
    if (className) e.className = className
    if (text !== undefined) e.textContent = text
    return e
  }

  /**
   * Reset the panel to one game's identity: accent, header and briefing.
   * Pass `null` for the difficulty on the picker screen, where no tier has
   * been chosen yet and there are no rules to describe.
   */
  private frame(kind: keyof typeof GAMES | string, level: Difficulty | null = this.level): GameMeta {
    this.stopLoops()
    const meta = GAMES[kind] ?? GAMES.arcadePuzzle
    this.box.style.setProperty('--acc', meta.accent)
    this.box.style.setProperty('--acc-soft', meta.accentSoft)
    this.badgeEl.textContent = meta.badge
    this.titleEl.textContent = meta.title
    this.rewardEl.textContent = level
      ? `${DIFFICULTY_META[level].badge} ${DIFFICULTY_META[level].label} · 🏆 ${rewardMultiplierLabel(level)}`
      : '🏆 Pick a difficulty to begin'
    this.body.innerHTML = ''
    if (level) {
      const how = this.el('div', 'mc-arc-how')
      for (const line of meta.how(level)) how.appendChild(this.el('span', 'mc-arc-chip', line))
      this.body.appendChild(how)
    }
    return meta
  }

  /** Grant a prize bundle, scaled by the tier the player chose. */
  private award(prizes: Prize[]): string {
    const scaled = scalePrizes(prizes, this.level)
    for (const p of scaled) this.inventory.add(p.itemId, p.count)
    const summary = scaled.map((p) => `${p.count}× ${itemDef(p.itemId)?.name ?? 'item'}`).join(' + ')
    this.onPrize(summary)
    return summary
  }

  /**
   * The end-of-round card: what happened, what it earned, and what to do next.
   * Always the same shape, win or lose, so the outcome is never ambiguous.
   *
   * `lesson` is the takeaway for games that teach something specific — the word
   * game passes its word's dictionary entry, so a round always ends with the
   * player knowing what the word means whether or not they guessed it.
   */
  private showResult(
    won: boolean,
    headline: string,
    detail: string,
    prizeSummary: string | null,
    actions: { label: string; onClick: () => void; alt?: boolean }[],
    lesson?: WordEntry,
  ): void {
    const card = this.el('div', `mc-arc-result${won ? '' : ' lose'}`)
    card.appendChild(this.el('div', 'mc-arc-result-head', headline))
    card.appendChild(this.el('div', 'mc-arc-result-body', detail))
    if (prizeSummary) card.appendChild(this.el('div', 'mc-arc-prize', `🏆 Prize collected: ${prizeSummary}`))
    const row = this.el('div', 'mc-arc-actions')
    for (const a of actions) {
      const b = this.el('button', `mc-arc-btn${a.alt ? ' alt' : ''}`, a.label)
      const press = (e: Event) => { e.preventDefault(); a.onClick() }
      b.addEventListener('click', press)
      b.addEventListener('touchstart', press, { passive: false })
      row.appendChild(b)
    }
    // The lesson sits between the outcome and the replay buttons, so it is read
    // on the way to hitting "play again" rather than tucked under them. It is
    // also what gets scrolled to: the spent game board above is tall enough to
    // push the takeaway off the bottom of the panel otherwise.
    const define = lesson ? defineCard(lesson) : null
    if (define) this.body.append(card, define, row)
    else this.body.append(card, row)
    ;(define ?? card).scrollIntoView({ block: 'nearest' })
  }

  // ------------------------------------------------------------ 1. puzzle

  private startPuzzle(): void {
    this.frame('arcadePuzzle')
    const rules = difficultyRules(this.level).puzzle
    const size = rules.size
    const count = size * size
    const status = this.el('div', 'mc-arc-status', 'Moves: 0')
    const grid = this.el('div', 'mc-arc-grid')
    // Hard's 4×4 board needs a fourth column and slightly smaller tiles.
    grid.style.gridTemplateColumns = `repeat(${size}, var(--tile))`
    if (size > 3) grid.style.setProperty('--tile', 'clamp(48px, 14vmin, 68px)')
    this.body.append(status, grid)

    // Shuffle by random walking the blank from the solved state — always solvable.
    const tiles = Array.from({ length: count }, (_, i) => (i + 1) % count)
    let blank = count - 1
    let prev = -1
    for (let i = 0; i < rules.shuffle; i++) {
      const opts = neighbors(blank, size).filter((n) => n !== prev)
      const n = opts[Math.floor(Math.random() * opts.length)]
      tiles[blank] = tiles[n]
      tiles[n] = 0
      prev = blank
      blank = n
    }
    let moves = 0
    let won = false

    const render = () => {
      grid.innerHTML = ''
      tiles.forEach((t, i) => {
        const b = this.el('button', 'mc-arc-tile' + (t === 0 ? ' blank' : ''), t === 0 ? '' : String(t))
        if (t !== 0 && !won) {
          const tryMove = (e: Event) => {
            e.preventDefault()
            if (!neighbors(blank, size).includes(i)) return
            tiles[blank] = t
            tiles[i] = 0
            blank = i
            moves++
            status.textContent = `Moves: ${moves}`
            if (tiles.every((v, j) => v === (j + 1) % count)) {
              won = true
              status.textContent = `✨ Solved in ${moves} moves!`
              const swift = moves <= rules.swiftMoves
              const prize = this.award(swift
                ? [{ itemId: ItemId.Gold, count: 15 }, { itemId: ItemId.FishStew, count: 1 }]
                : [{ itemId: ItemId.Gold, count: 8 }, { itemId: ItemId.Apple, count: 2 }])
              render()
              this.showResult(
                true,
                `✨ Solved in ${moves} moves!`,
                swift
                  ? `Under ${rules.swiftMoves} moves — top prize tier.`
                  : `Solve it in ${rules.swiftMoves} moves or fewer for the top prize tier.`,
                prize,
                this.replayActions(() => this.startPuzzle()),
              )
              return
            }
            render()
          }
          b.addEventListener('click', tryMove)
          b.addEventListener('touchstart', tryMove, { passive: false })
        }
        grid.appendChild(b)
      })
    }
    render()
  }

  // ------------------------------------------------------------ 2. runner

  private startRunner(): void {
    this.frame('arcadeRunner')
    const rules = difficultyRules(this.level).runner
    const status = this.el('div', 'mc-arc-status', 'Score: 0')
    const canvas = this.el('canvas', 'mc-arc-canvas') as HTMLCanvasElement
    canvas.width = 500
    canvas.height = 170
    this.body.append(status, canvas)
    const ctx = canvas.getContext('2d')!

    const GROUND = 140
    const player = { y: GROUND, vy: 0, w: 22, h: 30 }
    let obstacles: { x: number; w: number; h: number }[] = []
    let speed = rules.speed
    let score = 0
    let spawnIn = 1.2 * rules.spacing
    let alive = true
    let last = performance.now()

    const jump = () => {
      if (alive && player.y >= GROUND - 0.5) player.vy = -430
    }
    this.keyHandler = (e) => {
      if (e.code === 'Space') { e.preventDefault(); jump() }
    }
    document.addEventListener('keydown', this.keyHandler)
    canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); jump() })

    const loop = () => {
      if (!this._isOpen) return
      const now = performance.now()
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now

      if (alive) {
        score += dt * 12
        speed += dt * 7
        player.vy += 1300 * dt
        player.y = Math.min(GROUND, player.y + player.vy * dt)
        spawnIn -= dt
        if (spawnIn <= 0) {
          spawnIn = (0.9 + Math.random() * 1.1) * rules.spacing - Math.min(0.5, speed / 900)
          obstacles.push({ x: canvas.width + 20, w: 14 + Math.random() * 14, h: 26 + Math.random() * 22 })
        }
        for (const o of obstacles) o.x -= speed * dt
        obstacles = obstacles.filter((o) => o.x + o.w > -10)
        // Collision (player fixed at x=60). One crash ends the run, so stop at
        // the first hit rather than paying out once per overlapping cactus.
        for (const o of obstacles) {
          if (alive && 60 + player.w > o.x && 60 < o.x + o.w && player.y > GROUND - o.h) {
            alive = false
            const points = Math.floor(score)
            status.textContent = `💥 Wiped out at ${points} points!`
            const cleared = points >= rules.target
            const prize = cleared
              ? this.award([
                { itemId: ItemId.Gold, count: Math.min(20, Math.max(4, Math.floor(points / 40) * 4)) },
                { itemId: ItemId.CookedFish, count: 1 },
              ])
              : null
            this.showResult(
              cleared,
              cleared ? `🏁 ${points} points — you made it!` : `💥 Wiped out at ${points} points`,
              cleared
                ? 'The longer the run, the more gold it pays.'
                : `Reach ${rules.target} points to win a prize — the cacti speed up, so jump early.`,
              prize,
              this.replayActions(() => this.startRunner()),
            )
          }
        }
        status.textContent = alive ? `Score: ${Math.floor(score)}` : status.textContent
      }

      // Draw
      ctx.fillStyle = '#0e1220'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      // Parallax dunes, so the track reads as a place rather than a void.
      ctx.fillStyle = '#161d33'
      for (let i = 0; i < 4; i++) {
        const bx = ((i * 160 - (score * 6) % 640) + 640) % 640 - 80
        ctx.beginPath()
        ctx.ellipse(bx, GROUND + 4, 90, 34, 0, Math.PI, 0)
        ctx.fill()
      }
      ctx.fillStyle = '#3a7a4a'
      ctx.fillRect(0, GROUND + 1, canvas.width, 4)
      ctx.fillStyle = alive ? '#ffd34d' : '#c0392b'
      ctx.fillRect(60, player.y - player.h, player.w, player.h)
      ctx.fillStyle = '#27ae60'
      for (const o of obstacles) {
        ctx.fillRect(o.x, GROUND - o.h, o.w, o.h)
        // Cactus arms — a silhouette beats a plain rectangle.
        ctx.fillRect(o.x - 5, GROUND - o.h * 0.7, 5, o.w * 0.4)
        ctx.fillRect(o.x + o.w, GROUND - o.h * 0.85, 5, o.w * 0.4)
      }
      if (alive) this.runnerRaf = requestAnimationFrame(loop)
    }
    loop()
  }

  // ------------------------------------------------------------ 3. math

  private startMath(): void {
    this.frame('arcadeMath')
    const rules = difficultyRules(this.level).math
    const maxLives = rules.lives
    const status = this.el('div', 'mc-arc-status')
    const question = this.el('div', 'mc-arc-question')
    const targets = this.el('div', 'mc-arc-targets')
    this.body.append(status, question, targets)

    let qIndex = 0
    let correct = 0
    let lives = maxLives
    let done = false

    const finish = () => {
      done = true
      question.textContent = ''
      targets.innerHTML = ''
      status.textContent = `${correct}/${rules.questions} correct`
      const won = correct >= rules.target
      const perfect = correct === rules.questions
      const prize = won
        ? this.award(perfect
          ? [{ itemId: ItemId.Gold, count: 25 }, { itemId: ItemId.FishStew, count: 1 }]
          : [{ itemId: ItemId.Gold, count: correct * 2 }])
        : null
      this.showResult(
        won,
        `🎯 ${correct}/${rules.questions} correct${won ? '!' : ''}`,
        won
          ? perfect ? 'A perfect round — top prize tier.' : 'Every extra correct answer pays more gold.'
          : `Score ${rules.target} or more to earn a prize.`,
        prize,
        this.replayActions(() => this.startMath()),
      )
    }

    const nextQuestion = () => {
      if (done) return
      if (qIndex >= rules.questions || lives <= 0) { finish(); return }
      qIndex++
      status.textContent =
        `Q${qIndex}/${rules.questions}   ${'❤'.repeat(lives)}${'♡'.repeat(maxLives - lives)}   ✔ ${correct}`
      // Questions ramp across the round, capped by the tier: Easy never leaves
      // + and −, Hard reaches two-step sums with bigger numbers.
      const ramp = Math.floor(((qIndex - 1) / rules.questions) * (rules.topLevel + 1))
      const { text, answer } = mathQuestion(Math.min(ramp, rules.topLevel), rules.range)
      question.textContent = `${text} = ?`
      // One correct + three near-miss decoys, all unique.
      const answers = new Set<number>([answer])
      while (answers.size < 4) {
        const off = Math.floor(Math.random() * 10) - 5 + (Math.random() < 0.3 ? 10 : 0)
        const decoy = answer + (off === 0 ? 6 : off)
        if (decoy >= 0) answers.add(decoy)
      }
      const shuffled = [...answers].sort(() => Math.random() - 0.5)
      targets.innerHTML = ''
      shuffled.forEach((val, i) => {
        const t = this.el('button', 'mc-arc-target', String(val))
        t.style.left = `${6 + i * 23 + Math.random() * 4}%`
        t.style.top = `${14 + Math.random() * 48}%`
        const shoot = (e: Event) => {
          e.preventDefault()
          if (done) return
          if (val === answer) {
            correct++
          } else {
            lives--
          }
          nextQuestion()
        }
        t.addEventListener('click', shoot)
        t.addEventListener('touchstart', shoot, { passive: false })
        targets.appendChild(t)
      })
    }
    nextQuestion()
  }

  // ------------------------------------------------------------ 4. word

  private startWord(): void {
    this.frame('arcadeWord')
    const rules = difficultyRules(this.level).word
    const maxLives = rules.lives
    const pool = wordsFor(rules)
    const pick = pool[Math.floor(Math.random() * pool.length)]
    const hint = this.el('div', 'mc-arc-hint')
    // Hard keeps the hint back until the first wrong guess, so the opening
    // letters have to come from the shape of the word.
    hint.textContent = rules.hintUpFront ? `💡 Hint: ${pick.hint}` : '💡 Hint unlocks after your first wrong guess'
    const status = this.el('div', 'mc-arc-status', '❤'.repeat(maxLives))
    const wordEl = this.el('div', 'mc-arc-word')
    const kb = this.el('div', 'mc-arc-kb')
    this.body.append(hint, status, wordEl, kb)

    const guessed = new Set<string>()
    let lives = maxLives
    let done = false

    const render = () => {
      wordEl.textContent = [...pick.word].map((c) => (guessed.has(c) ? c : '_')).join('')
      status.textContent = '❤'.repeat(lives) + '♡'.repeat(maxLives - lives)
      if (lives < maxLives) hint.textContent = `💡 Hint: ${pick.hint}`
    }

    const keyButtons = new Map<string, HTMLButtonElement>()
    const guess = (letter: string) => {
      if (done || guessed.has(letter)) return
      guessed.add(letter)
      const btn = keyButtons.get(letter)
      const inWord = pick.word.includes(letter)
      if (btn) {
        btn.disabled = true
        btn.classList.add(inWord ? 'good' : 'bad')
      }
      if (!inWord) lives--
      render()
      if ([...pick.word].every((c) => guessed.has(c))) {
        done = true
        const misses = maxLives - lives
        const flawless = misses === 0
        const prize = this.award(flawless
          ? [{ itemId: ItemId.Gold, count: 15 }, { itemId: ItemId.Apple, count: 3 }]
          : [{ itemId: ItemId.Gold, count: 6 + lives }, { itemId: ItemId.Apple, count: 1 }])
        this.showResult(
          true,
          `✨ ${pick.word} — you got it!`,
          flawless
            ? 'Not a single wrong guess — top prize tier.'
            : `${misses} wrong guess${misses === 1 ? '' : 'es'}; a clean round pays more.`,
          prize,
          this.replayActions(() => this.startWord()),
          pick,
        )
      } else if (lives <= 0) {
        done = true
        wordEl.textContent = pick.word
        hint.textContent = `💡 ${pick.hint}`
        this.showResult(
          false,
          `The word was ${pick.word}`,
          'Out of guesses — the hint narrows it down fast, so read it before picking letters.',
          null,
          this.replayActions(() => this.startWord()),
          pick,
        )
      }
    }

    for (const letter of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
      const b = this.el('button', 'mc-arc-key', letter)
      const press = (e: Event) => { e.preventDefault(); guess(letter) }
      b.addEventListener('click', press)
      b.addEventListener('touchstart', press, { passive: false })
      keyButtons.set(letter, b)
      kb.appendChild(b)
    }
    this.keyHandler = (e) => {
      const letter = e.key.toUpperCase()
      if (letter.length === 1 && letter >= 'A' && letter <= 'Z') guess(letter)
    }
    document.addEventListener('keydown', this.keyHandler)
    render()
  }
}

/**
 * One arithmetic question at a difficulty level, with `range` scaling how big
 * the numbers get. Levels: 0 = + and −, 1 = adds ×, 2 = adds ÷ (whole answers),
 * 3 = two-step sums evaluated left to right.
 */
export function mathQuestion(level: number, range = 1): { text: string; answer: number } {
  const scale = (n: number) => Math.max(2, Math.round(n * range))
  if (level <= 0) {
    const a = 5 + Math.floor(Math.random() * scale(40))
    const b = 3 + Math.floor(Math.random() * scale(30))
    if (Math.random() < 0.5) return { text: `${a} + ${b}`, answer: a + b }
    return { text: `${a + b} − ${b}`, answer: a }
  }
  if (level === 1) {
    const a = 3 + Math.floor(Math.random() * scale(10))
    const b = 3 + Math.floor(Math.random() * scale(10))
    return { text: `${a} × ${b}`, answer: a * b }
  }
  if (level === 2) {
    const b = 2 + Math.floor(Math.random() * scale(9))
    const q = 2 + Math.floor(Math.random() * scale(10))
    return { text: `${b * q} ÷ ${b}`, answer: q }
  }
  // Two steps: a × b ± c, worked left to right.
  const a = 2 + Math.floor(Math.random() * scale(9))
  const b = 2 + Math.floor(Math.random() * scale(9))
  const c = 2 + Math.floor(Math.random() * scale(20))
  if (Math.random() < 0.5) return { text: `${a} × ${b} + ${c}`, answer: a * b + c }
  return { text: `${a} × ${b} − ${c}`, answer: a * b - c }
}

/** Indices adjacent to i on an n×n grid. */
export function neighbors(i: number, n: number): number[] {
  const r = Math.floor(i / n)
  const c = i % n
  const out: number[] = []
  if (r > 0) out.push(i - n)
  if (r < n - 1) out.push(i + n)
  if (c > 0) out.push(i - 1)
  if (c < n - 1) out.push(i + 1)
  return out
}

/** "×2.5 reward" style label for a tier's payout multiplier. */
function rewardMultiplierLabel(d: Difficulty): string {
  const m = DIFFICULTY_META[d].rewardMultiplier
  return `×${m} reward`
}
