// ============================================
// THE VIGIL — content data (question pool, station metadata, reward,
// catechism). Split out from vigil.js purely to keep the game engine
// readable; nothing here is engine logic. Mirrors scriptoriumContent.js
// and loavesContent.js's shape.
//
// WHY THIS ONE HAS QUESTIONS AND LOAVES AND FISHES DOES NOT
//   The point of this alcove is the module content -- every question is
//   drawn from the ReEd 101 course pack. A wrong answer does NOT reveal
//   the right one; it only costs an attempt, so a student can't learn a
//   question's answer for free by failing it once and passing it on the
//   next try at the same candle.
//
// Each question carries a `source` flag:
//   "coursepack" -- the answer is stated in the course pack itself, either in
//                  its teaching text or in a verse it quotes.
//   "cited"      -- the course pack names the reference but does not print the
//                  wording, so the text here is a standard rendering. CHECK
//                  THESE against the Bible your modules use before shipping.
//
// Five stations draw 45 of these 54 questions per full vigil run, so without
// per-run de-duplication a student could meet the same question twice --
// see the `asked` list threaded through vigil.js's pick().
// ============================================

export const TIME_PER_QUESTION = 30;
export const ATTEMPTS_PER_VIGIL = 3;
export const COOLDOWN = 30;
/** Seconds the flame is admired before the next candle may be chosen. */
export const ADVANCE_DELAY = 1.5;
/** Seconds a missed question's "wrong" feedback stays up before clearing
 *  back to the nave -- a brief pause, not an answer reveal. */
export const MARK_DELAY = 2.4;

export const QUESTIONS = [
  /* ---- the creation account ---- */
  { id: "q1", source: "coursepack", prompt: "Which tradition is credited with the creation story in Genesis 1:1—2:4a?", options: ["The Priestly tradition", "The Yahwist tradition", "The Elohist tradition", "The Deuteronomist tradition"], answer: 0 },
  { id: "q2", source: "coursepack", prompt: "During which period did the Priestly tradition reach its height?", options: ["The Babylonian exile", "The reign of David", "The Exodus", "The Maccabean revolt"], answer: 0 },
  { id: "q3", source: "coursepack", prompt: "The four sources behind the early chapters of the Hebrew Scriptures are named:", options: ["Yahwist, Elohist, Deuteronomist, Priestly", "Matthew, Mark, Luke, John", "Law, Prophets, Writings, Psalms", "Genesis, Exodus, Leviticus, Numbers"], answer: 0 },
  { id: "q4", source: "coursepack", prompt: "In the course pack, creation is defined chiefly as:", options: ["God's sovereign act giving the world order, meaning and purpose", "The moment physical matter first existed", "A myth borrowed from Babylon", "The first of the seven sacraments"], answer: 0 },
  { id: "q5", source: "coursepack", prompt: "Which phrase recurs through the Priestly creation account?", options: ["God saw that it was good", "Blessed be the Lord", "Let my people go", "Peace be with you"], answer: 0 },
  { id: "q6", source: "coursepack", prompt: "Darkness, in Genesis 1:2, was upon the face of the:", options: ["Deep", "Earth", "Garden", "Waters of Eden"], answer: 0 },
  { id: "q7", source: "coursepack", prompt: "Creation, in Church doctrine, is the beginning of:", options: ["The unfolding story of redemption fulfilled in Christ", "The moral law given at Sinai", "The Church's liturgical year", "The covenant with Abraham"], answer: 0 },

  /* ---- the human person ---- */
  { id: "q8", source: "coursepack", prompt: "Genesis 1:26—27 teaches that man was made in the image and likeness of God. The Latin term for this is:", options: ["Imago Dei", "Opus Dei", "Lumen Gentium", "Corpus Christi"], answer: 0 },
  { id: "q9", source: "coursepack", prompt: "Which account emphasises the dignity of the human person and the call to stewardship?", options: ["The Priestly account, Genesis 1:26—27", "The Yahwist account, Genesis 2:4b—25", "The Elohist account", "The Deuteronomist account"], answer: 0 },
  { id: "q10", source: "coursepack", prompt: "The Yahwist tradition says Yahweh God formed man from:", options: ["The dust of the earth", "The waters of the deep", "The clay of the riverbank", "The breath of the wind"], answer: 0 },
  { id: "q11", source: "coursepack", prompt: "What did God breathe into the man's nostrils?", options: ["The breath of life", "The spirit of wisdom", "A word of blessing", "The fire of the covenant"], answer: 0 },
  { id: "q12", source: "coursepack", prompt: "What the Yahwist tradition emphasises above all is:", options: ["Relationality — between God and people, and between people and creation", "The ordered sequence of the seven days", "The authority of the priesthood", "The dating of the exile"], answer: 0 },
  { id: "q13", source: "coursepack", prompt: "Human life is defined, the course pack says, by:", options: ["The intrinsic value bestowed by the Creator", "Its usefulness to society", "The possessions a person gathers", "The work a person is able to do"], answer: 0 },

  /* ---- the garden and the fall ---- */
  { id: "q14", source: "coursepack", prompt: "The man was placed in the Garden of Eden to do what?", options: ["Till it and take care of it", "Rule over it and subdue it", "Name every creature in it", "Guard it against the serpent"], answer: 0 },
  { id: "q15", source: "coursepack", prompt: "Which tree was forbidden?", options: ["The tree of the understanding of right and wrong", "The tree of life", "The fig tree at the centre", "The olive tree by the river"], answer: 0 },
  { id: "q16", source: "coursepack", prompt: "How did the serpent open the conversation with the woman?", options: ["By asking whether God truly said they could not eat of any tree", "By offering her the fruit outright", "By promising her a kingdom", "By accusing the man of lying to her"], answer: 0 },
  { id: "q17", source: "coursepack", prompt: "The serpent promised that eating the fruit would make them:", options: ["Like God, knowing good and evil", "Rulers over the animals", "Free from labour", "Able to live in the garden forever"], answer: 0 },
  { id: "q18", source: "coursepack", prompt: "What did the man and woman realise immediately after they sinned?", options: ["That they were naked", "That the serpent had gone", "That the garden had withered", "That they were hungry"], answer: 0 },
  { id: "q19", source: "coursepack", prompt: "When God questioned him, the man blamed:", options: ["The woman God had put there with him", "The serpent that had deceived them", "His own weakness", "The hunger that had come upon him"], answer: 0 },
  { id: "q20", source: "coursepack", prompt: "After the exile from Eden, the man was sent to till:", options: ["The ground from which he had been taken", "The fields beyond the river", "The vineyard of his father", "The wilderness of Nod"], answer: 0 },
  { id: "q21", source: "coursepack", prompt: "What guarded the way back to the tree of life?", options: ["Cherubim with flaming, turning swords", "A wall of thorns", "A river no one could cross", "An angel with a trumpet"], answer: 0 },
  { id: "q22", source: "coursepack", prompt: "Cain answered God's question about his brother by asking:", options: ["Am I my brother's keeper?", "Where shall I go from your presence?", "Who am I to be sent?", "Why have you forsaken me?"], answer: 0 },

  /* ---- scripture, tradition and the Church ---- */
  { id: "q23", source: "coursepack", prompt: "Paul tells the Thessalonians to stand firm and hold fast to:", options: ["The traditions they were taught, by word or by letter", "The law given through Moses", "The prophets of old", "The counsel of the elders"], answer: 0 },
  { id: "q24", source: "coursepack", prompt: "John 21:25 says that if everything Jesus did were written down:", options: ["The world itself could not contain the books", "No one would believe the account", "The scribes would labour a hundred years", "The scrolls would fill the temple"], answer: 0 },
  { id: "q25", source: "coursepack", prompt: "In the Great Commission, the disciples are sent to make disciples of:", options: ["All nations", "The house of Israel", "The cities of Judea", "The poor and the captive"], answer: 0 },
  { id: "q26", source: "coursepack", prompt: "Jesus tells Nicodemus that one must be born of:", options: ["Water and Spirit", "Fire and water", "Flesh and blood", "Word and sacrament"], answer: 0 },
  { id: "q27", source: "coursepack", prompt: "The first believers in Acts were together and had:", options: ["All things in common", "One mind and one law", "Neither silver nor gold", "A house in every city"], answer: 0 },
  { id: "q28", source: "cited", prompt: "Isaiah 65:17 promises, at that pivotal time:", options: ["A new heaven and a new earth", "A throne set in the temple", "A return from exile", "A covenant written on the heart"], answer: 0 },
  { id: "q29", source: "cited", prompt: "Ecclesiastes 3 opens by saying there is:", options: ["A time for everything, and a season for every matter under the heavens", "Nothing new under the sun", "A remembrance of former things", "Vanity in all the works of men"], answer: 0 },
  { id: "q30", source: "cited", prompt: "Jacob was renamed Israel because he had striven with God and had:", options: ["Prevailed", "Repented", "Been humbled", "Been forgiven"], answer: 0 },

  /* ---- revelation, tradition and faith ---- */
  { id: "q31", source: "coursepack", prompt: "The Greek word paradosis, behind our word tradition, literally means:", options: ["To hand on, or to pass down", "To write down", "To gather together", "To keep secret"], answer: 0 },
  { id: "q32", source: "coursepack", prompt: "Scripture and Tradition together make up:", options: ["One cohesive deposit of God's Word", "Two rival authorities", "The Old and the New Testaments", "The canon and the apocrypha"], answer: 0 },
  { id: "q33", source: "coursepack", prompt: "The teaching authority of the Church is called the:", options: ["Magisterium", "Episcopate", "Curia", "Synod"], answer: 0 },
  { id: "q34", source: "coursepack", prompt: "Must God reveal himself to us?", options: ["No — but it is his nature, because he always wants to save us", "Yes — he is bound to by justice", "Yes — creation requires it", "No — and so he rarely does"], answer: 0 },
  { id: "q35", source: "coursepack", prompt: "In religion, a mystery is best understood as:", options: ["A divine truth we can grasp, though never entirely", "Something no one may ever know", "A puzzle with a hidden answer", "A miracle without explanation"], answer: 0 },
  { id: "q36", source: "coursepack", prompt: "Faith engages the whole person. What do the head, hands and heart stand for?", options: ["Understanding, obedient deeds, and trust", "Memory, work, and feeling", "Doctrine, liturgy, and charity", "Study, worship, and rest"], answer: 0 },
  { id: "q37", source: "coursepack", prompt: "How does the course pack distinguish faith from belief?", options: ["Faith is the inner light; belief is its expression", "They mean the same thing", "Faith is public; belief is private", "Belief comes first, faith follows"], answer: 0 },

  /* ---- salvation ---- */
  { id: "q38", source: "coursepack", prompt: "Total Salvation is the salvation of:", options: ["The whole person, all peoples, and the whole created universe", "The soul alone", "The Church alone", "Those who ask for it"], answer: 0 },
  { id: "q39", source: "coursepack", prompt: "Beyond sin, salvation frees us from:", options: ["All human evils — disease, hunger, poverty, oppression", "Only bodily death", "Only ignorance", "Only the fear of judgement"], answer: 0 },
  { id: "q40", source: "coursepack", prompt: "Salvation is not simply going to heaven, but salvation for:", options: ["A transformed universe — the new heaven and the new earth", "A longer life on earth", "The nation of Israel", "The age of the apostles"], answer: 0 },
  { id: "q41", source: "coursepack", prompt: "For the early Church, salvation was:", options: ["A present reality as well as a future promise", "Entirely a future promise", "A private experience only", "Reserved for the martyrs"], answer: 0 },
  { id: "q42", source: "coursepack", prompt: "The course pack names present signs of salvation such as:", options: ["Food, rain, bread, health, justice and land", "Visions and prophecies", "Wealth and long life", "Temples and altars"], answer: 0 },

  /* ---- the history of Israel ---- */
  { id: "q43", source: "coursepack", prompt: "Which is the FIRST of the five great events of Israelite history?", options: ["The migration of Abraham to Canaan", "The sojourn in Egypt", "The escape from slavery in Egypt", "The assembly at Sinai"], answer: 0 },
  { id: "q44", source: "coursepack", prompt: "The escape from slavery in Egypt is dated in the course pack to around:", options: ["1280 BCE", "1900 BCE", "1250 BCE", "1200 BCE"], answer: 0 },
  { id: "q45", source: "coursepack", prompt: "The religious assembly at Sinai took place about:", options: ["1250 BCE", "1900 BCE", "1280 BCE", "587 BCE"], answer: 0 },
  { id: "q46", source: "coursepack", prompt: "Which is the LAST of the five great events?", options: ["The occupation of the land of Canaan", "The assembly at Sinai", "The escape from Egypt", "The migration of Abraham"], answer: 0 },
  { id: "q47", source: "coursepack", prompt: "Why did God begin his redemptive work with one particular people?", options: ["Salvation needed a setting in history; it could not happen in a vacuum", "Because they were the most numerous", "Because they alone were sinless", "Because they asked to be chosen"], answer: 0 },

  /* ---- the prophets ---- */
  { id: "q48", source: "coursepack", prompt: "The word prophet comes from the term:", options: ["Nabi", "Dabar", "Torah", "Ruach"], answer: 0 },
  { id: "q49", source: "coursepack", prompt: "More essential than foretelling, the Hebrew prophet's work was:", options: ["Telling forth — announcing the word of Yahweh in public", "Interpreting dreams", "Recording the law", "Anointing kings"], answer: 0 },
  { id: "q50", source: "coursepack", prompt: "The prophets spoke not from worldly power but from:", options: ["Divine charism", "Royal appointment", "Priestly office", "Popular election"], answer: 0 },
  { id: "q51", source: "coursepack", prompt: "Which twin corruptions did the prophets call Israel to abandon?", options: ["Idolatry and injustice", "Pride and greed", "Sloth and envy", "War and famine"], answer: 0 },
  { id: "q52", source: "coursepack", prompt: "When does the prophetic vocation most visibly emerge?", options: ["In times of social, political or religious upheaval", "In times of peace and plenty", "At the death of a king", "During the harvest festivals"], answer: 0 },

  /* ---- stewardship ---- */
  { id: "q53", source: "coursepack", prompt: "Who does the course pack present as the true steward?", options: ["Jesus Christ", "Adam", "Noah", "Moses"], answer: 0 },
  { id: "q54", source: "coursepack", prompt: "The human person is described in Module 2 as:", options: ["The crown of God's creation", "The servant of the animals", "The last of God's afterthoughts", "The equal of the angels"], answer: 0 },
];

// Five stations, each a different place the Church has kept vigil across
// history, drawn small-to-large candle counts (7, 8, 9, 10, 11 = 45 of the
// 54 questions above per full run). `art` names which SVG-builder function
// in vigil.js draws that station's scene (vigil.js can't be imported here
// without a cycle, so it's a string key, not a function reference).
export const STATIONS = [
  {
    key: "nave",
    name: "The Nave",
    art: "nave",
    line: "Seven candles stand unlit in the empty church.",
    note: "Gothic building began at the abbey of Saint-Denis outside Paris in the 1140s, under Abbot Suger. The pointed arch, rib vault and flying buttress carried the weight outward, so walls could be opened up for stained glass — as at Chartres and Notre-Dame.",
    spots: [
      { x: 252, y: 214, s: 0.62 }, { x: 320, y: 206, s: 0.62 }, { x: 388, y: 214, s: 0.62 },
      { x: 176, y: 250, s: 0.84 }, { x: 464, y: 250, s: 0.84 },
      { x: 92, y: 296, s: 1.08 }, { x: 548, y: 296, s: 1.08 },
    ],
  },
  {
    key: "catacomb",
    name: "The Catacomb",
    art: "catacomb",
    line: "Down among the graves, where the vigil was first kept in secret.",
    note: "From the 2nd to the 5th century Roman Christians buried their dead in galleries cut through the soft tufa outside the city walls, such as the Catacomb of Callixtus on the Via Appia, where several 3rd-century popes were laid. They were cemeteries and places of prayer at the martyrs' graves; the notion that Christians lived hidden in them during persecution is a later legend.",
    spots: [
      { x: 286, y: 268, s: 0.5 }, { x: 354, y: 268, s: 0.5 },
      { x: 232, y: 288, s: 0.68 }, { x: 408, y: 288, s: 0.68 },
      { x: 150, y: 312, s: 0.9 }, { x: 490, y: 312, s: 0.9 },
      { x: 60, y: 336, s: 1.12 }, { x: 580, y: 336, s: 1.12 },
    ],
  },
  {
    key: "tomb",
    name: "The Tomb",
    art: "tomb",
    line: "The stone is rolled back, and the linen lies folded where he was laid.",
    note: "The Gospels place the burial in a new rock-cut tomb belonging to Joseph of Arimathea, closed with a stone. Constantine built over the venerated site in Jerusalem in the 330s, clearing a Roman temple that Hadrian had raised there two centuries earlier; the shelf inside the Church of the Holy Sepulchre was uncovered again during restoration in 2016.",
    spots: [
      { x: 268, y: 268, s: 0.55 }, { x: 372, y: 268, s: 0.55 },
      { x: 206, y: 288, s: 0.72 }, { x: 320, y: 292, s: 0.72 }, { x: 434, y: 288, s: 0.72 },
      { x: 128, y: 316, s: 0.94 }, { x: 512, y: 316, s: 0.94 },
      { x: 48, y: 340, s: 1.14 }, { x: 592, y: 340, s: 1.14 },
    ],
  },
  {
    key: "basilica",
    name: "The Ancient Church",
    art: "basilica",
    line: "The first church built above the graves, where the vigil came into the open.",
    note: "Once the Edict of Milan (313) allowed public worship, Christians took their building form not from pagan temples but from the basilica, the Roman civic hall: a long nave, side aisles, and an apse at the end. St John Lateran, dedicated in 324, is the cathedral of Rome and the oldest church in the West.",
    spots: [
      { x: 290, y: 268, s: 0.55 }, { x: 350, y: 268, s: 0.55 },
      { x: 214, y: 286, s: 0.7 }, { x: 426, y: 286, s: 0.7 }, { x: 320, y: 296, s: 0.76 },
      { x: 140, y: 312, s: 0.92 }, { x: 500, y: 312, s: 0.92 },
      { x: 62, y: 338, s: 1.12 }, { x: 578, y: 338, s: 1.12 }, { x: 320, y: 340, s: 1.18 },
    ],
  },
  {
    key: "vatican",
    name: "St Peter's",
    art: "vatican",
    line: "Under the great dome, where the vigil is kept in the sight of the whole Church.",
    note: "Constantine raised the first basilica here in the 320s over a 2nd-century shrine on Vatican Hill, in a Roman burial ground long held to contain Peter's grave; it was excavated between 1940 and 1949. The present church was begun in 1506, consecrated in 1626, roofed by Michelangelo's dome, with Bernini's bronze baldacchino set over the altar in 1623-34.",
    spots: [
      { x: 296, y: 262, s: 0.5 }, { x: 344, y: 262, s: 0.5 },
      { x: 232, y: 276, s: 0.64 }, { x: 408, y: 276, s: 0.64 }, { x: 320, y: 284, s: 0.68 },
      { x: 160, y: 300, s: 0.86 }, { x: 480, y: 300, s: 0.86 },
      { x: 250, y: 314, s: 0.96 }, { x: 390, y: 314, s: 0.96 },
      { x: 66, y: 338, s: 1.14 }, { x: 574, y: 338, s: 1.14 },
    ],
  },
];

// THE SACRED LIGHT — the one reward for keeping the vigil. Flat, not
// tiered by performance, same numbers as Scriptorium's Book of Knowledge
// and Loaves and Fishes' Arcane of Generosity (the established default for
// every Vault Game unless told otherwise).
export const SACRED_LIGHT_REWARD = {
  tickets: [
    { key: "sigil", count: 10 },
    { key: "seal", count: 10 },
    { key: "scroll", count: 10 },
    { key: "herald", count: 10 },
    { key: "shard", count: 25 },
  ],
  unlockTokens: 4,
};

// THE CATECHISM — shown once, between keeping the vigil and opening the
// Sacred Light. Mandatory: no skip, no close button. Gated on BOTH a
// minimum read time and scrolling to the end -- see vigil.js's
// showCatechism() (identical mechanism to the other two games').
//
// Every citation below is a real, checkable source: Matthew 25:1-13,
// Matthew 26:40-41, and the Easter Vigil's own liturgical text (the
// Exsultet / the Roman Missal's proclamation of the Vigil as "the mother
// of all vigils"). If this is ever revised, keep every quote attributable
// to an actual document -- nothing invented or paraphrased into a fake
// citation.
export const CATECHISM_MIN_SECONDS = 100;

export const CATECHISM = {
  title: "Why the Church Keeps Watch",
  intro: "Before you open your reward, learn why this game is built around waiting in the dark for a light that hasn't come yet.",
  sections: [
    {
      heading: "Five Places, One Watch",
      body: "The five stations you just passed through are real places, in the order the Church actually occupied them: a hidden grave in the catacombs, an empty tomb outside Jerusalem, the first legal basilica, a Gothic cathedral, and finally the dome of St Peter's. It's the same vigil the whole way — first kept in secret out of necessity, later kept in the open in the sight of the whole world. The building changed. What the Church was doing inside it did not.",
    },
    {
      heading: "Could You Not Keep Watch One Hour?",
      body: "The word \"vigil\" means keeping watch — staying awake and alert when it would be easier to sleep. The night before he died, Jesus asked his closest friends to stay awake with him while he prayed. They fell asleep three times. It's one of the more uncomfortable moments in the Gospels precisely because it's so easy to imagine doing the same thing.",
      quote: "Could you not keep watch with me one hour?",
      quoteSource: "Matthew 26:40"
    },
    {
      heading: "The Ten Bridesmaids",
      body: "Jesus told a parable about ten young women waiting at night for a bridegroom who was delayed. Five brought enough oil for their lamps to last; five didn't, and were shut out when he finally arrived. The point wasn't when he would come — it was that half of them weren't ready when he did. Vigil-keeping in Scripture is rarely about predicting the moment. It's about staying ready for it.",
      quote: "Therefore, keep watch, because you do not know the day or the hour.",
      quoteSource: "Matthew 25:13"
    },
    {
      heading: "The Vigil of All Vigils",
      body: "The Church's own calendar still centers on a vigil: the Easter Vigil, kept after dark on Holy Saturday, between Christ's death and the first announcement of his resurrection. The Roman Missal doesn't call it one vigil among many — it calls it the greatest and most important one the Church keeps all year, the model every other vigil is measured against.",
      quote: "This is the mother of all holy vigils.",
      quoteSource: "Roman Missal, Easter Vigil"
    },
    {
      heading: "What Watching Actually Looks Like",
      list: [
        { label: "Staying alert", body: "Noticing when your attention, your patience, or your prayer life is starting to drift, instead of only noticing after it's gone." },
        { label: "Being ready before you're asked", body: "The five prepared bridesmaids didn't know exactly when the bridegroom was coming either — they were just ready regardless." },
        { label: "Persevering somewhere uncomfortable", body: "The earliest Christians kept faith in burial tunnels, not cathedrals. Watchfulness doesn't wait for ideal conditions." },
        { label: "Waiting without proof", body: "A vigil is kept before the thing you're waiting for has arrived. If you already had it, you wouldn't need to watch." }
      ]
    },
    {
      heading: "What Now?",
      body: "You don't need seven candles or a cathedral for this either. Pick one thing you know you tend to let slide — a habit of prayer, a promise to someone, a task you keep putting off — and treat it like a vigil this week: pay attention to it before you're forced to, not after. That's the whole discipline this game was built to picture. The candles were never really the point. Staying awake was."
    }
  ]
};
