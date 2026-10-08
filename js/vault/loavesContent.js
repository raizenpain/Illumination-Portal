// ============================================
// LOAVES AND FISHES — content data (crowd pool, reward, catechism).
// Split out from loaves.js purely to keep the game engine readable;
// nothing here is engine logic. Mirrors scriptoriumContent.js's shape.
// ============================================

export const TIME_PER_GUESS = 15;
/** Seconds the thumbs-up stays on screen before the next round opens itself. */
export const ADVANCE_DELAY = 1.6;
export const ATTEMPTS_PER_ROUND = 3;
export const COOLDOWN = 30;
export const LEVELS = [1, 2, 3, 4, 5];
export const LOAVES = 5;
export const FISH = 2;

export const CROWD = [
  "Fishermen of Bethsaida", "Widows from the village", "Children at the front",
  "Shepherds off the hill", "Elders in the shade", "Latecomers from the road",
  "Mothers with infants", "Traders from Tiberias", "The lame by the wall",
  "Pilgrims out of Idumea", "Servants of the house", "Beggars at the gate",
  "Students of the law", "A Samaritan family", "Day labourers not hired",
  "The leper at the edge", "Watchmen from the tower", "Potters of the lower town",
  "Harvesters from the valley", "Widows of Nain", "Tax men from the road",
  "Weavers by the well", "Herdsmen of the plain", "Travellers from Decapolis",
];

// THE ARCANE OF GENEROSITY — the one reward for feeding every hillside.
// Flat, not tiered by performance, same numbers as Scriptorium's Book of
// Knowledge (see BOOK_OF_KNOWLEDGE_REWARD in scriptoriumContent.js) --
// Jornie's explicit call: same haul, different popup and art.
export const ARCANE_OF_GENEROSITY_REWARD = {
  tickets: [
    { key: "sigil", count: 10 },
    { key: "seal", count: 10 },
    { key: "scroll", count: 10 },
    { key: "herald", count: 10 },
    { key: "shard", count: 25 },
  ],
  unlockTokens: 4,
};

// THE CATECHISM — shown once, between the last basket and opening the
// Arcane of Generosity. Mandatory: no skip, no close button. Gated on
// BOTH a minimum read time and scrolling to the end -- see loaves.js's
// showCatechism() (identical mechanism to Scriptorium's).
//
// Every citation below is a real, checkable source: the Gospel accounts
// themselves (Matthew 14, Mark 6, Luke 9, John 6), CCC 1335 on the
// Eucharistic sign, and CCC 2447 on the corporal works of mercy. If this is
// ever revised, keep every quote attributable to an actual document --
// nothing invented or paraphrased into a fake citation.
export const CATECHISM_MIN_SECONDS = 120;

export const CATECHISM = {
  title: "What Five Loaves Can Do",
  intro: "Before you open your reward, learn what actually happened on that hillside — and what it still asks of you.",
  sections: [
    {
      heading: "A Hillside Near Galilee",
      body: "This wasn't a story invented to teach a lesson — the Gospels place it on a real evening beside the Sea of Galilee. A crowd of thousands had followed Jesus out to a remote place to hear him teach and to be healed, and stayed so long that evening came with no food and no town nearby. The disciples wanted to send everyone away to fend for themselves. Jesus didn't.",
      quote: "When he went ashore, he saw a great crowd, and he had compassion for them and healed their sick.",
      quoteSource: "Matthew 14:14"
    },
    {
      heading: "A Boy's Whole Lunch",
      body: "Jesus turned the problem back on his own disciples: you feed them. It was an impossible order — until Andrew found one boy in the crowd holding five barley loaves and two small fish. Barley bread was what the poor ate, not the wheat bread of anyone with money to spare. It was a child's simple meal, nowhere near enough for thousands, and he gave it anyway.",
      quote: "There is a boy here who has five barley loaves and two fish, but what good are these for so many?",
      quoteSource: "John 6:9"
    },
    {
      heading: "Taken, Blessed, Broken, Given",
      body: "Jesus took the boy's loaves, looked up to heaven, blessed them, broke them, and had the disciples hand them out. Everyone ate until they were full — by Matthew's count, about five thousand men, not counting the women and children who were almost certainly there too. And when it was over, Jesus didn't let anything go to waste: the leftover pieces filled twelve full baskets.",
      quote: "Gather the fragments left over, that nothing may be lost.",
      quoteSource: "John 6:12"
    },
    {
      heading: "The Values Worth Carrying Home",
      list: [
        { label: "Compassion", body: "Jesus acted because he saw hungry people in front of him, not because it was owed to anyone." },
        { label: "Generosity", body: "The boy gave everything he had, not what was left over after he'd eaten his fill." },
        { label: "Trust in providence", body: "The disciples obeyed an order that made no sense with the resources they could see." },
        { label: "Gratitude", body: "Jesus gave thanks over the loaves before the miracle happened, not after." },
        { label: "Stewardship", body: "Nothing was left to rot on the ground once everyone had eaten — the fragments were gathered up." },
        { label: "Community", body: "The crowd sat down and ate together, as one body being fed, not as strangers taking their share and leaving." }
      ]
    },
    {
      heading: "Living It Out — As a Christian, and Especially as a Baptized Catholic",
      body: "Every one of those values is meant to leave the story and enter your week. Give something real before you feel you have enough to spare. Say thank you before you see the outcome, not only after. Don't let what you have go to waste while someone nearby goes without. If you're a baptized Catholic, this story is not just a nice example — it's the shape of your own worship: at every Mass, bread is taken, blessed, broken, and given, the same four actions from that hillside, and you're fed by it just as that crowd was. Feeding the hungry is counted among the Church's corporal works of mercy, not a suggestion for those who feel inspired.",
      quote: "The corporal works of mercy... feeding the hungry.",
      quoteSource: "Catechism of the Catholic Church, 2447"
    },
    {
      heading: "Living It Out — Even Without Faith",
      body: "You don't need to believe any of the theology for these values to hold up. Compassion for someone hungry, generosity with what little you have, gratitude, not wasting what you've been given, and eating — or working, or simply living — as a community instead of every person for themselves: none of that requires belief in a miracle. It only requires being willing to notice a need in front of you and to give something real toward it, the way one boy did with a lunch he could have just as easily kept for himself."
    }
  ]
};
