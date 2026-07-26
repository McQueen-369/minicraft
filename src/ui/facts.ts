import { BlockId } from '../core/blocks'
import { ItemId, type AnimalKind } from '../items/items'

/**
 * Real-world "did you know?" notes for the things players meet in the world:
 * the animals they tame, the plants they harvest, and the materials they mine.
 *
 * Every entry is a short, checkable fact about the real animal, plant or
 * material — the game rules live in `info.ts`, and these sit beside them so an
 * info card teaches something as well as explaining a control.
 */

const ANIMAL_FACTS: Record<AnimalKind, string[]> = {
  pig: [
    'Pigs cannot sweat. They wallow in mud to cool down — and the dried mud also works as sunscreen.',
    'A pig\'s sense of smell is strong enough that pigs are trained to sniff out truffles buried underground.',
    'Pigs are among the most trainable farm animals and can learn their own name in a few weeks.',
  ],
  chicken: [
    'A hen turns her eggs about once an hour while brooding, so the yolk never settles against the shell.',
    'Chickens see more colours than we do: they have a fourth type of colour receptor and can see ultraviolet light.',
    'There are more chickens on Earth than any other bird — roughly three for every person alive.',
  ],
  sheep: [
    'Sheep have rectangular pupils, giving them a field of view of well over 270° without turning their head.',
    'One fleece can grow several kilograms of wool a year, which is why sheep need shearing to stay comfortable.',
    'Sheep recognise and remember individual faces — both sheep faces and human ones — for years.',
  ],
  rabbit: [
    'Rabbit teeth never stop growing, so they gnaw on tough plants to keep them worn down.',
    'A rabbit\'s eyes sit high on the sides of its head, giving it almost 360° vision to spot predators.',
    'Rabbits thump a hind foot on the ground as an alarm signal that other rabbits can feel through the soil.',
  ],
  cat: [
    'A cat\'s whiskers are roughly as wide as its body and help it judge whether a gap is big enough to fit through.',
    'Cats have a reflective layer behind the retina called the tapetum lucidum — that is why their eyes shine at night.',
    'House cats sleep between 12 and 16 hours a day, a habit inherited from ambush-hunting ancestors.',
  ],
  dog: [
    'A dog\'s nose print is as unique as a human fingerprint.',
    'Dogs have up to 300 million scent receptors in their nose; people have about 6 million.',
    'Dogs mostly sweat through their paw pads, so panting is how they shed heat.',
  ],
  horse: [
    'Horses can sleep standing up: a "stay apparatus" of tendons locks their legs so the muscles can rest.',
    'A horse\'s eye is the largest of any land mammal, and it can see almost all the way around itself.',
    'Foals can stand and walk within a couple of hours of being born.',
  ],
  villager: [
    'Trade began with barter — swapping goods directly — long before anyone minted the first coins.',
    'The oldest known towns, like Çatalhöyük in Turkey, are around 9,000 years old.',
  ],
  zombie: [
    'Real "zombies" exist in nature: the fungus Ophiocordyceps takes over an ant\'s behaviour before it dies.',
    'The word zombie reached English from West African and Caribbean folklore in the early 1800s.',
  ],
  robot: [
    'The word "robot" comes from the Czech play R.U.R. (1920); it is built on robota, meaning forced labour.',
    'Most factory robots are arms bolted to the floor — walking on two legs is far harder than it looks.',
    'Robots find their way with sensors that measure distance many times a second, a bit like a bat using echoes.',
  ],
}

/** Facts about placed blocks and carried items, keyed by item/block id. */
const ITEM_FACTS: Record<number, string[]> = {
  // ---- robot world ----
  [ItemId.CannedFood]: [
    'Canning was invented in 1809 for Napoleon\'s armies — the can opener only turned up about 50 years later.',
    'Heating food inside a sealed can kills the microbes that spoil it, which is why tins keep for years.',
    'Tin cans are mostly steel with a micro-thin tin lining that stops the food reacting with the metal.',
  ],
  [BlockId.MetalPanel]: [
    'Steel is iron with a pinch of carbon — under 2% of it — and that pinch is what makes it hard.',
    'Rivets held ships and bridges together long before welding: each one is hammered flat to lock two plates.',
  ],
  // ---- plants & living things ----
  [BlockId.Grass]: [
    'Grasses cover about a quarter of all the land on Earth, from lawns to prairies to bamboo forests.',
    'Grass grows from the base of the leaf, not the tip — which is exactly why mowing does not kill it.',
  ],
  [BlockId.Leaves]: [
    'Leaves are solar panels: chlorophyll captures sunlight and uses it to turn air and water into sugar.',
    'Leaves look green because chlorophyll absorbs red and blue light and reflects the green back at you.',
    'A large tree can move hundreds of litres of water a day from its roots out through its leaves.',
  ],
  [BlockId.AppleLeaves]: [
    'Apples are about 25% air by volume, which is why they float in water.',
    'Every apple variety — over 7,500 of them — is grown by grafting, because seeds do not breed true.',
    'Apple trees belong to the rose family, alongside pears, cherries and strawberries.',
  ],
  [BlockId.Wood]: [
    'Tree rings record the weather: a wide ring means a good growing year, a narrow one a hard year.',
    'Wood is mostly cellulose and lignin — lignin is the glue that lets a trunk stand up against gravity.',
  ],
  [BlockId.Plank]: [
    'Plywood is stronger than a plain plank because its thin layers are glued with the grain crossing each time.',
    'Timber is dried before use — "seasoned" wood shrinks and warps far less once it is in a building.',
  ],
  [ItemId.Apple]: [
    'Apples are about 25% air by volume, which is why they float — handy for apple bobbing.',
    'Slicing an apple crossways reveals a five-pointed star of seed pockets in the core.',
  ],
  [ItemId.Wheat]: [
    'Wheat was one of the first crops farmed, in the Fertile Crescent roughly 10,000 years ago.',
    'Wheat is grown on more of the world\'s farmland than any other food crop.',
  ],
  [ItemId.Carrot]: [
    'The first cultivated carrots were purple and yellow; the familiar orange one was bred much later.',
    'Carrots are rich in beta-carotene, which the body converts into the vitamin A that eyes need.',
  ],
  [ItemId.Seeds]: [
    'Seeds can wait a very long time: a date palm seed roughly 2,000 years old was successfully sprouted.',
    'A seed carries a tiny plant plus its packed lunch — the starchy store it lives on until the first leaves open.',
  ],
  [ItemId.Fish]: [
    'Most fish breathe by pulling oxygen straight out of the water through their gills.',
    'You can age a fish by counting growth rings on its scales or ear bones, much like tree rings.',
  ],
  [ItemId.Egg]: [
    'An eggshell is mostly calcium carbonate — the same mineral as chalk and limestone — with thousands of tiny pores.',
    'Egg white is roughly 90% water; nearly all of the rest is protein.',
  ],
  [ItemId.Bone]: [
    'Bone is a living tissue that constantly rebuilds itself; adults replace much of their skeleton over a decade.',
    'Bone is stronger than concrete for its weight, because it is a springy mesh rather than a solid block.',
  ],
  // ---- rocks, minerals & materials ----
  [BlockId.Stone]: [
    'Rock comes in three families: igneous (cooled from magma), sedimentary (settled in layers), and metamorphic (reshaped by heat and pressure).',
    'The Stone Age is named for tools knapped from flint and chert, which fracture into razor-sharp edges.',
  ],
  [BlockId.Dirt]: [
    'A single teaspoon of healthy soil can hold more microorganisms than there are people on Earth.',
    'It can take a century or more for nature to build a single centimetre of topsoil.',
  ],
  [BlockId.Sand]: [
    'Sand is simply rock ground down to grains between 0.06 mm and 2 mm across — anything finer is silt.',
    'Most sand is quartz, because quartz is hard enough to survive being tumbled by rivers and waves.',
  ],
  [BlockId.Glass]: [
    'Glass is made by melting sand at around 1,700 °C — the silica cools without ever forming crystals.',
    'Glass can be recycled endlessly without losing quality, unlike most plastics.',
  ],
  [BlockId.Brick]: [
    'Fired mud bricks have been used for building for over 5,000 years, from Mesopotamia onward.',
    'Firing a brick drives out its water and fuses the clay grains, which is what makes it weatherproof.',
  ],
  [BlockId.GoldOre]: [
    'Gold never rusts or tarnishes — that is why gold artefacts come out of ancient tombs still shining.',
    'Gold is so soft and stretchy that a single gram can be beaten into a sheet a square metre across.',
    'Essentially all the gold on Earth was forged in dying stars and delivered by the rocks that formed the planet.',
  ],
  [ItemId.Gold]: [
    'Gold conducts electricity superbly and never corrodes, so it plates the contacts in phones and spacecraft.',
    'All the gold ever mined would fit into a cube about 22 metres on a side.',
  ],
  [BlockId.DiamondOre]: [
    'Diamonds form 150 km or more underground, where carbon is squeezed at over 1,000 °C.',
    'Volcanic eruptions carry diamonds up to the surface inside a rock called kimberlite.',
  ],
  [ItemId.Diamond]: [
    'Diamond is the hardest natural material — only another diamond can scratch it.',
    'Diamond and graphite (pencil "lead") are both pure carbon; only the arrangement of the atoms differs.',
  ],
  [BlockId.Lava]: [
    'Lava is just magma that has reached the surface — underground, the same molten rock is called magma.',
    'Lava erupts at roughly 700–1,200 °C, hot enough to glow orange-white in daylight.',
    'Cooled lava becomes basalt, the most common rock on Earth\'s surface and the floor of every ocean.',
  ],
  [BlockId.TNT]: [
    'TNT was first made as a yellow dye in 1863; it was 30 years before anyone used it as an explosive.',
    'Explosive power is measured in "TNT equivalent" — a tonne of TNT releases about 4.2 billion joules.',
  ],
  [BlockId.Ladder]: [
    'A cave painting in Spain roughly 8,000 years old shows someone on a rope ladder raiding a wild bees\' nest.',
  ],
  [BlockId.Fence]: [
    'Fences are one of the oldest farm technologies — keeping animals in is far less work than herding them.',
  ],
}

/**
 * How many facts each subject has already shown, so opening the same card
 * twice teaches something new instead of repeating itself.
 */
const seen = new Map<string, number>()

function nextFact(key: string, list: string[] | undefined): string | null {
  if (!list?.length) return null
  const n = seen.get(key) ?? 0
  seen.set(key, n + 1)
  return list[n % list.length]
}

/** A real-world fact about an animal, rotating on each call; null when we have none. */
export function animalFact(kind: AnimalKind): string | null {
  return nextFact(`a:${kind}`, ANIMAL_FACTS[kind])
}

/** A real-world fact about an item or placed block, rotating on each call. */
export function itemFact(itemId: number): string | null {
  return nextFact(`i:${itemId}`, ITEM_FACTS[itemId])
}

/** Facts known for a subject, in order — exposed for tests. */
export function factsForAnimal(kind: AnimalKind): readonly string[] {
  return ANIMAL_FACTS[kind] ?? []
}

export function factsForItem(itemId: number): readonly string[] {
  return ITEM_FACTS[itemId] ?? []
}

/** Every fact in the module, used to keep the collection under test. */
export function allFacts(): string[] {
  return [...Object.values(ANIMAL_FACTS), ...Object.values(ITEM_FACTS)].flat()
}

/** Reset the rotation counters (tests only). */
export function resetFactRotation(): void {
  seen.clear()
}
