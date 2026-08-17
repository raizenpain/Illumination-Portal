// ============================================
// SEASON PATH CONTENT — Midterm, Semifinal, Final
//
// Default placeholder content sourced from the ReEd 101 coursepack
// (Modules 2/3/4). Every season, chapter, and node here is meant to
// be fully replaceable by the admin through the Dungeon Master
// console — nothing is permanent. mergeSeasonContent() layers a
// Firestore settings/seasonContent_{season} override doc (season/
// chapter/node level, matched by id) on top of these defaults at
// runtime; until an override doc exists, these defaults are used as-is.
//
// Quiz nodes carry a `questions` array (2-3 MCQs each) written to make
// the quiz mechanic functional out of the box — these are placeholder
// questions grounded in each node's topic, also fully admin-editable.
// ============================================

export const SEASON_ORDER = ['prelim', 'midterm', 'semifinal', 'final'];

export const SEASON_CONTENT = {
  midterm: {
    seasonId: 'midterm',
    seasonName: 'Midterm Season',
    subtitle: 'The Creation',
    moduleAlignment: "Module 2: Discerning God's Action in the Biblical Faith",
    theme: 'midterm',
    chapters: [
      {
        chapterId: 'midterm_ch1',
        chapterTitle: 'The Seven Days',
        basedOn: 'The Creation Story - Priestly Tradition, Genesis 1:1-2:4a, the Two Formats (Literary and Fixed)',
        nodes: [
          {
            nodeId: 'mt1_n1', type: 'quiz', title: 'Two Patterns of Creation',
            prompt: 'Identify and explain the Literary Format and the Fixed Format used in the Genesis creation story.',
            ticketReward: 'quiz_ticket',
            questions: [
              { text: "The Priestly account of creation in Genesis 1:1-2:4a uses two organizing patterns. What are they commonly called?", choices: ["The Covenant Format and the Exodus Format", "The Literary Format and the Fixed Format", "The Wisdom Format and the Prophetic Format", "The Poetic Format and the Historical Format"], correctIndex: 1 },
              { text: "How many days does the Priestly creation account use to structure God's creative work?", choices: ["Forty", "Three", "Twelve", "Six, with a seventh day of rest"], correctIndex: 3 },
              { text: "What refrain repeats throughout Genesis 1 after each act of creation?", choices: ["“And God saw that it was good”", "“And the angels sang”", "“And the people rejoiced”", "“And it was very difficult”"], correctIndex: 0 },
              { text: "According to the coursepack's Literary Format table, what comes right after 'A Command' in each day's structure?", choices: ["An Identification of the Day", "Introduction", "Accomplishment of the Command", "Affirmation of Goodness"], correctIndex: 2 },
              { text: "According to the coursepack's Fixed Format, what do the first three days of creation accomplish?", choices: ["Separation", "Destruction", "Rest", "Decoration or population"], correctIndex: 0 },
              { text: "What Babylonian creation epic does the coursepack contrast with the biblical creation account?", choices: ["The Book of the Dead", "The Epic of Gilgamesh", "The Code of Hammurabi", "Enuma Elish"], correctIndex: 3 },
              { text: "According to the coursepack, how does the biblical account of creation differ from the Enuma Elish?", choices: ["Both accounts describe the exact same battle between gods", "God creates by His Divine Goodness and loving Design, not through combat between gods", "The biblical account also involves a slain goddess", "There is no meaningful difference between the two"], correctIndex: 1 },
              { text: "According to the coursepack, what does the 'heaven(s) + earth' formula represent in biblical writing?", choices: ["A place that does not really exist", "Only the sky above Israel", "The whole world or universe", "The underworld alone"], correctIndex: 2 },
              { text: "According to the coursepack, why does God 'rest' on the seventh day even though He continues to sustain creation?", choices: ["Because the seventh day marks the end of God's care for creation", "To point toward the eternal rest and joy of union with God, not because God stopped working", "Because God grew tired from His labor", "Because rest was unnecessary until humans were created"], correctIndex: 1 },
              { text: "According to the coursepack, why does darkness in the creation story ultimately serve a purpose rather than remaining pure chaos?", choices: ["Because God gives it a role within the rhythm of life, offering rest and renewal", "Because darkness was created by a rival god", "Because darkness has no connection to the story at all", "Because darkness is stronger than God's light"], correctIndex: 0 }
            ]
          },
          {
            nodeId: 'mt1_n2', type: 'task', title: 'Order Out of Chaos',
            prompt: 'Describe the seven days of creation in order, and explain the recurring pattern the biblical authors used to structure each day.',
            ticketReward: 'task_ticket'
          },
          {
            nodeId: 'mt1_n3', type: 'journal', title: 'Soothing Mother Earth',
            prompt: "Reflect on the 'Soothing the Mother Earth' activity from the module — cultivate a small piece of land or a potted plant and journal your experience of nurturing growth.",
            ticketReward: 'journal_ticket'
          },
          {
            nodeId: 'mt1_n4', type: 'recitation', title: 'One God, Good Creation',
            prompt: "Discuss why the Biblical writers insisted 'God created everything Good,' contrasted with the Babylonian creation myths.",
            ticketReward: 'recitation_ticket'
          }
        ]
      },
      {
        chapterId: 'midterm_ch2',
        chapterTitle: 'Crown of Creation',
        basedOn: 'Human dignity, Imago Dei, Yahwist tradition (Gen 2:4b-25), the Gifts of Land, Freedom, and Justice',
        nodes: [
          {
            nodeId: 'mt2_n1', type: 'quiz', title: 'Imago Dei',
            prompt: "What does it mean that humanity is made in the 'image and likeness' of God (Gen 1:26-27)?",
            ticketReward: 'quiz_ticket',
            questions: [
              { text: "What does it mean that humanity is made in the 'image and likeness' of God, according to Genesis 1:26-27?", choices: ["Only kings and priests carry God's image", "Humans physically resemble God in appearance", "It refers only to Adam, not to all humanity", "Humans share in God's dignity, reason, and capacity to love and create"], correctIndex: 3 },
              { text: "Which creation account (Yahwist tradition) describes God forming humanity from clay and breathing life into it?", choices: ["Genesis 1:1-2:4a", "Genesis 2:4b-25", "Genesis 3:1-24", "Genesis 11:1-9"], correctIndex: 1 },
              { text: "According to the module, humanity's dignity as bearers of God's image calls us to be:", choices: ["Passive observers of creation", "Judges over other people's worth", "Stewards responsible for creation", "Owners who may exploit creation freely"], correctIndex: 2 },
              { text: "According to the coursepack, why is the 'image and likeness' of God in Genesis 1:26-27 NOT about physical appearance?", choices: ["Because only angels can bear God's image", "Because Adam had no physical body at first", "Because the text was written after Adam's death", "Because God is Pure Spirit, so the image reflects spiritual qualities like reason, love, and compassion"], correctIndex: 3 },
              { text: "According to the coursepack, what are the two ancient traditions that together give a complementary picture of the human person?", choices: ["The Exodus tradition and the Wisdom tradition", "The Deuteronomist tradition and the Elohist tradition only", "The Prophetic tradition and the Apocalyptic tradition", "The Priestly tradition (Gen 1:26-27) and the Yahwist tradition (Gen 2:4b-25)"], correctIndex: 3 },
              { text: "According to the Catholic Catechism (CCC 357), quoted in the coursepack, what does it mean that a human being is never merely an object?", choices: ["A human being has no real identity of their own", "A human being is a tool for God's other purposes", "A human being's worth depends on their usefulness", "A human being is always a subject — 'someone' as opposed to 'something'"], correctIndex: 3 },
              { text: "In the Yahwist symbolism, what does 'the Clay' represent about the human person?", choices: ["Kinship with the rest of God's creation", "The absence of any real dignity", "A punishment for disobedience", "A separation from the natural world"], correctIndex: 0 },
              { text: "In the Yahwist symbolism, what does 'the Breath of God' (Ruah) represent about the human person?", choices: ["Kinship with God Himself", "Physical strength alone", "A curse placed on humanity", "A reward for good behavior"], correctIndex: 0 },
              { text: "According to the coursepack, what three gifts did God bestow on humanity at creation?", choices: ["Land, Freedom, and Justice", "Wealth, Power, and Fame", "Peace, War, and Judgment", "Wisdom, Courage, and Beauty"], correctIndex: 0 },
              { text: "According to the coursepack, what right did the Israelites have over the land, as opposed to strict ownership?", choices: ["The right to use and enjoy its fruits (usufruct), while Yahweh remains the true owner", "Ownership only during wartime", "Full and permanent private ownership with no restrictions", "No right to the land at all"], correctIndex: 0 }
            ]
          },
          {
            nodeId: 'mt2_n2', type: 'task', title: 'Clay and Breath',
            prompt: "Explain the symbolism of 'the Clay' and 'the Breath of God' in the Yahwist creation account.",
            ticketReward: 'task_ticket'
          },
          {
            nodeId: 'mt2_n3', type: 'journal', title: 'Steward, Not Owner',
            prompt: 'Reflect on one area of your life (a relationship, a responsibility, a talent) where you are called to be a steward rather than an owner.',
            ticketReward: 'journal_ticket'
          },
          {
            nodeId: 'mt2_n4', type: 'task', title: 'The Three Gifts',
            prompt: 'List and describe the three gifts God gave humanity at creation — Land, Freedom, and Justice.',
            ticketReward: 'task_ticket'
          },
          {
            nodeId: 'mt2_n5', type: 'recitation', title: 'True Freedom',
            prompt: "Discuss why 'true human freedom is exercised in stewardship rather than exploitation.'",
            ticketReward: 'recitation_ticket'
          }
        ]
      },
      {
        chapterId: 'midterm_ch3',
        chapterTitle: 'The Measure of Justice',
        basedOn: 'Meaning and centrality of Justice in biblical faith - tsedaqah, mishpat, justice in Creation, Exodus, the Prophets, and Jesus’ ministry',
        nodes: [
          {
            nodeId: 'mt3_n1', type: 'quiz', title: 'Justice as Divine Attribute',
            prompt: 'Explain justice as an attribute of God and as an attribute of the human person.',
            ticketReward: 'quiz_ticket',
            questions: [
              { text: "In the biblical tradition, justice (tsedaqah/mishpat) is best understood as:", choices: ["A concept that appears only in the New Testament", "A purely legal concept unrelated to God", "An attribute of God and a corresponding attribute of the human person", "A punishment reserved for sinners only"], correctIndex: 2 },
              { text: "Which of these is NOT one of the biblical contexts where justice appears, per the module?", choices: ["The Prophets", "Creation", "The Exodus", "Greek philosophy"], correctIndex: 3 },
              { text: "The module contrasts two views of justice found in Scripture. These are:", choices: ["Justice for the rich vs. justice for the poor", "Loyalty to the covenant vs. legal correctness", "Roman law vs. Jewish law", "Justice in this life vs. justice in the afterlife"], correctIndex: 1 },
              { text: "According to the coursepack, which four Hebrew terms are closely related to biblical justice?", choices: ["Tsedaqah, mishpat, ḥesed, and 'emet", "Elohim, Adonai, YHWH, and El Shaddai", "Torah, Talmud, Mishnah, and Midrash", "Shalom, Ruach, Berit, and Qahal"], correctIndex: 0 },
              { text: "What does 'mishpat' specifically stress in the biblical understanding of justice?", choices: ["Truth and faithfulness alone", "Unwavering love and mercy alone", "Personal wealth and status", "The right structure of society"], correctIndex: 3 },
              { text: "Who are the 'anawim,' the group especially central to the biblical vision of social justice?", choices: ["Foreign conquerors", "Kings and religious leaders", "The weak, the poor, and the oppressed", "Wealthy landowners"], correctIndex: 2 },
              { text: "According to Genesis 18:19, quoted in the coursepack, what task were the Patriarchs given?", choices: ["To practice righteousness and justice (Tsedaqah and Mishpat)", "To establish a monarchy immediately", "To build the first Temple", "To conquer neighboring nations"], correctIndex: 0 },
              { text: "According to the coursepack, why was the expulsion from Eden considered a fair punishment rather than a cruel one?", choices: ["Because Adam and Eve asked to leave the garden", "Because humanity tried to take what was rightfully God's", "Because the garden was too small for them", "Because God no longer wanted to be their Creator"], correctIndex: 1 },
              { text: "In the story of the first murder in Genesis 4, what does the coursepack say 'cries out for justice'?", choices: ["The silence of the garden", "The tears of Eve", "The voice of the serpent", "The blood of Abel from the soil"], correctIndex: 3 },
              { text: "According to the coursepack, what characterized Jesus' ministry of justice toward the anawim?", choices: ["He focused only on ritual purity laws", "He challenged oppressive systems and brought good news to the poor", "He limited his ministry strictly to the wealthy", "He avoided any conflict with religious authorities"], correctIndex: 1 }
            ]
          },
          {
            nodeId: 'mt3_n2', type: 'journal', title: 'Justice in Action',
            prompt: 'Reflect on your community-service experience (or a moment you witnessed injustice) in light of biblical justice.',
            ticketReward: 'journal_ticket'
          },
          {
            nodeId: 'mt3_n3', type: 'task', title: 'Justice Through the Ages',
            prompt: 'Trace how justice appears across the Creation narrative, the Exodus event, the Prophets, and the ministry of Jesus.',
            ticketReward: 'task_ticket'
          },
          {
            nodeId: 'mt3_n4', type: 'recitation', title: 'Loyalty to the Covenant',
            prompt: 'Discuss the two views of justice presented in Scripture — loyalty to the covenant vs. legal correctness.',
            ticketReward: 'recitation_ticket'
          }
        ]
      }
    ]
  },

  semifinal: {
    seasonId: 'semifinal',
    seasonName: 'Semifinal Season',
    subtitle: 'The Destruction',
    moduleAlignment: "Module 3: Discerning Human's Destruction of God's Loving Design",
    theme: 'semifinal',
    chapters: [
      {
        chapterId: 'semifinal_ch1',
        chapterTitle: 'The Broken Garden',
        basedOn: 'Origin of evil, Genesis 3:1-24, symbols of Adam and Eve, the Serpent, the Tree',
        nodes: [
          {
            nodeId: 'sf1_n1', type: 'quiz', title: 'Where Does Evil Come From?',
            prompt: 'If God made everything good, where does evil originate according to Genesis 3?',
            ticketReward: 'quiz_ticket',
            questions: [
              { text: "According to Genesis 3, if God made everything good, evil originates from:", choices: ["A second, evil god", "The misuse of human freedom in disobedience", "Random chance in creation", "Punishment God inflicted for no reason"], correctIndex: 1 },
              { text: "In the ancient Near East, the serpent commonly symbolized health, fertility, and wisdom. How does Genesis 3 reinterpret this symbol?", choices: ["As a minor, unimportant animal", "As a symbol of royal power", "As a symbol of God's presence", "As a symbol of the tempter/deceiver"], correctIndex: 3 },
              { text: "What does 'the Tree in the middle of the Garden' represent in Genesis 3?", choices: ["A symbol with no theological meaning", "A source of physical food only", "A punishment already given before the fall", "A boundary between divine power and human accountability"], correctIndex: 3 },
              { text: "According to the coursepack, what do Adam and Eve symbolize in the Genesis 3 narrative?", choices: ["Two unrelated historical figures", "The nation of Egypt", "Only the priestly class of Israel", "The entire human race, not just two individuals"], correctIndex: 3 },
              { text: "In the coursepack's interpretation, what does the snake/serpent in Genesis 3 primarily symbolize?", choices: ["A literal demon with no symbolic meaning", "An angel sent to test Adam and Eve", "The nation of Babylon", "Human goodness — life, fertility, and wisdom — when left unbridled"], correctIndex: 3 },
              { text: "According to the coursepack, what are the 'two dangers of human goodness'?", choices: ["Being too weak and being too strong", "Loving God too much and loving neighbor too little", "Doing good that turns out wrong, and desiring goodness excessively", "Praying too often and fasting too rarely"], correctIndex: 2 },
              { text: "What does the coursepack call an excessive, superfluous yearning for goodness?", choices: ["Chastity", "Humility", "Irascibility", "Sobriety"], correctIndex: 2 },
              { text: "According to the coursepack, what does the Tree in the middle of the Garden ultimately represent about God?", choices: ["A symbol with no theological significance", "A literal source of poison", "God's absolute goodness and sole authority over life", "A boundary meant to be crossed freely"], correctIndex: 2 },
              { text: "According to the coursepack, where does evil originate if God is the source of all goodness?", choices: ["It has always existed independently of God", "It arises when human goodness is misused, unbridled, or overextended into God's domain", "It is created directly by God as a test", "It originates from the animals God created"], correctIndex: 1 },
              { text: "According to the coursepack, what does the Genesis 3 narrative ultimately demonstrate about the source of evil?", choices: ["That evil was created before humanity existed", "That evil and God are equally powerful forces", "That the failure of humanity, not God, is the source of evil", "That evil is unrelated to human freedom"], correctIndex: 2 }
            ]
          },
          {
            nodeId: 'sf1_n2', type: 'task', title: 'Reading the Serpent',
            prompt: 'Explain the ancient Near Eastern symbolism of the snake (health, fertility, wisdom) and how Genesis reinterprets it.',
            ticketReward: 'task_ticket'
          },
          {
            nodeId: 'sf1_n3', type: 'journal', title: 'Good Gone Wrong',
            prompt: 'Reflect on a time a good intention or desire, taken too far, led to an unintended negative outcome in your own life.',
            ticketReward: 'journal_ticket'
          },
          {
            nodeId: 'sf1_n4', type: 'recitation', title: 'The Line Not to Cross',
            prompt: "Discuss what 'the Tree in the middle of the Garden' represents as a boundary between divine power and human accountability.",
            ticketReward: 'recitation_ticket'
          }
        ]
      },
      {
        chapterId: 'semifinal_ch2',
        chapterTitle: 'Four Alienations',
        basedOn: 'The Birth of Sin - alienation from self, God, nature, and other human beings (Cain and Abel, Tower of Babel)',
        nodes: [
          {
            nodeId: 'sf2_n1', type: 'quiz', title: 'The Four Alienations',
            prompt: 'Identify and explain the four alienations that resulted from sin according to Genesis 3-11.',
            ticketReward: 'quiz_ticket',
            questions: [
              { text: "According to Genesis 3-11, sin results in alienation in how many key relationships?", choices: ["Five", "Two", "Four — self, God, nature, and other people", "Three"], correctIndex: 2 },
              { text: "The story of Cain and Abel (Gen 4:1-16) illustrates which principle about evil?", choices: ["Evil is always immediately punished by exile", "Evil only affects the person who commits it", "Evil is never isolated — it spreads and affects others", "Evil is impossible among family members"], correctIndex: 2 },
              { text: "Which of these is one of the 'three kinds of sin' discussed in the module (alongside Lust of the Flesh and Life's Pride)?", choices: ["Lust of the Eyes", "Fear of the Lord", "Gift of Wisdom", "Zeal for the Law"], correctIndex: 0 },
              { text: "According to the coursepack, what realization in Genesis 3:7 signals humanity's alienation from itself?", choices: ["The realization that they could no longer speak", "The realization that they were hungry", "The realization that they were naked", "The realization that they had grown old"], correctIndex: 2 },
              { text: "In the ancient world, what did nakedness in front of others often symbolize, as referenced in the coursepack?", choices: ["Wealth and royal status", "Vulnerability and humiliation, as with captured soldiers", "A rite of passage into adulthood", "A sign of divine favor"], correctIndex: 1 },
              { text: "According to the coursepack, how does Adam respond when God confronts him in Genesis 3:12?", choices: ["He shifts blame onto Eve, and implicitly onto God", "He remains completely silent", "He blames the serpent directly", "He confesses immediately and asks forgiveness"], correctIndex: 0 },
              { text: "According to biblical scholar Gerhard von Rad, sin causes estrangement from God and from others in what two directions?", choices: ["Nationally and internationally", "Vertically and horizontally", "Temporally and eternally", "Spiritually and physically only"], correctIndex: 1 },
              { text: "According to the coursepack, what does humanity's call to care for creation (Gen 2:15) require, in contrast to what happens after the fall?", choices: ["Complete indifference to the environment", "Faithful stewardship, though humans often destroy creation instead", "Total abandonment of the land", "Worship of nature as divine"], correctIndex: 1 },
              { text: "What does the CBCP's pastoral letter 'What is Happening to Our Beautiful Land' call the destruction of forests, rivers, and seas?", choices: ["The rape of Mother Earth", "A blessing in disguise", "An unavoidable natural cycle", "A necessary sacrifice for progress"], correctIndex: 0 },
              { text: "According to the coursepack, what does Cain's refusal to be 'his brother's keeper' (Gen 4:9) reveal about sin?", choices: ["That sin has no connection to relationships at all", "That sin spreads and corrupts relationships between people, not just with God", "That sin only affects the person who commits it", "That sin is limited to one person and never spreads"], correctIndex: 1 }
            ]
          },
          {
            nodeId: 'sf2_n2', type: 'task', title: 'Cain and Abel',
            prompt: "Explain how the story of Cain and Abel (Gen 4:1-16) shows that 'evil is never isolated.'",
            ticketReward: 'task_ticket'
          },
          {
            nodeId: 'sf2_n3', type: 'journal', title: 'Alienation from Nature',
            prompt: "Reflect on the CBCP pastoral letter theme 'What is Happening to Our Beautiful Land' — how does ecological harm connect to spiritual brokenness?",
            ticketReward: 'journal_ticket'
          },
          {
            nodeId: 'sf2_n4', type: 'task', title: 'Three Kinds of Sin',
            prompt: "Define Lust of the Eyes, Lust of the Flesh, and Life's Pride, with a modern-day example of each.",
            ticketReward: 'task_ticket'
          },
          {
            nodeId: 'sf2_n5', type: 'recitation', title: 'Venial vs. Mortal',
            prompt: 'Distinguish between venial sin and mortal sin according to Catholic teaching.',
            ticketReward: 'recitation_ticket'
          }
        ]
      },
      {
        chapterId: 'semifinal_ch3',
        chapterTitle: 'Sin in Society',
        basedOn: "Social sin - idolatry, heresy, hypocrisy, apostasy, blasphemy; Humanity's ongoing search for God",
        nodes: [
          {
            nodeId: 'sf3_n1', type: 'quiz', title: 'Naming Social Sin',
            prompt: 'Define social sin and give a present-day example of idolatry, hypocrisy, or apostasy in modern society.',
            ticketReward: 'quiz_ticket',
            questions: [
              { text: "'Social sin' refers to:", choices: ["A sin that has no real spiritual effect", "A term used only in the Old Testament", "Sin committed only at social gatherings", "Sin that is embedded in unjust structures and shared societal patterns, not just individual acts"], correctIndex: 3 },
              { text: "Which of these is an example of idolatry in the biblical sense, as discussed in the module?", choices: ["Attending religious services regularly", "Reading Scripture daily", "Placing ultimate trust in wealth, power, or self above God", "Practicing personal prayer"], correctIndex: 2 },
              { text: "Which term describes outwardly religious behavior that masks an inward lack of true faith or integrity?", choices: ["Hypocrisy", "Covenant", "Discernment", "Charity"], correctIndex: 0 },
              { text: "According to the coursepack, what does 'social sin' refer to more precisely?", choices: ["A sin with no real spiritual consequence", "Sin committed exclusively during large public gatherings", "Conditions, institutions, or systems that perpetuate, tolerate, or ignore evil", "A term found only in modern secular law"], correctIndex: 2 },
              { text: "Which commandment does the sin of idolatry directly violate, according to the coursepack?", choices: ["The Sixth Commandment on adultery", "The First Commandment: 'You shall have no other gods before Me'", "The Eighth Commandment on false witness", "The Fourth Commandment on honoring parents"], correctIndex: 1 },
              { text: "According to the coursepack, what happens when a belief system reworks doctrine to fit cultural or personal preference?", choices: ["This is called Apostasy alone", "This is the sin of Heresy", "This is the sin of Blasphemy", "This is considered acceptable adaptation"], correctIndex: 1 },
              { text: "According to the coursepack, what characterizes the sin of hypocrisy?", choices: ["Publicly confessing every personal fault", "Appearing morally upright outwardly while being corrupt inwardly", "Refusing to ever attend religious services", "Following religious law too strictly"], correctIndex: 1 },
              { text: "According to the coursepack, blasphemy is described as violating which commandment?", choices: ["The Fifth Commandment on killing", "The Second Commandment: 'You shall not take the name of the Lord your God in vain'", "The Seventh Commandment on stealing", "The Tenth Commandment on coveting"], correctIndex: 1 },
              { text: "According to the Catholic Catechism (CCC 27), quoted in the coursepack, why is the desire for God 'written in the human heart'?", choices: ["Because man was created by God and for God, who never ceases to draw him", "Because humans fear death and invented religion to cope", "Because ancient philosophers invented the idea", "Because it was added later by Church councils"], correctIndex: 0 },
              { text: "According to St. Augustine, quoted in the coursepack, why does the human heart remain 'restless'?", choices: ["Because sleep is naturally difficult for humans", "Because it was made for God and only rests when united with Him", "Because human life is inherently short", "Because material wealth is never truly satisfying on its own"], correctIndex: 1 }
            ]
          },
          {
            nodeId: 'sf3_n2', type: 'task', title: 'Consequences of Evil',
            prompt: 'Describe three real-world consequences of evil in society today, and share your own reflection on what could be done about each one.',
            ticketReward: 'task_ticket'
          },
          {
            nodeId: 'sf3_n3', type: 'journal', title: "Humanity's Search for God",
            prompt: "Reflect on St. Augustine's line 'You have made us for yourself, O Lord, and our heart is restless until it rests in you.'",
            ticketReward: 'journal_ticket'
          },
          {
            nodeId: 'sf3_n4', type: 'recitation', title: 'Missed the Mark',
            prompt: "Discuss what it means that 'humanity missed the mark' and why no amount of human effort alone can stop evil.",
            ticketReward: 'recitation_ticket'
          }
        ]
      },
      {
        chapterId: 'semifinal_ch4',
        chapterTitle: 'Babel and the Restless Heart',
        basedOn: "Tower of Babel (Gen 11:1-9) - alienation from nations; the two dangers of human goodness; humanity's restless search for God and God's refusal to abandon humanity forever",
        nodes: [
          {
            nodeId: 'sf4_n1', type: 'quiz', title: 'The Tower of Babel',
            prompt: 'Explain what the builders of Babel were really seeking, and how their story parallels the serpent’s promise in Eden.',
            ticketReward: 'quiz_ticket',
            questions: [
              { text: "What building project is at the center of Genesis 11:1-9?", choices: ["The walls of Jericho", "The Ark of the Covenant", "The Temple of Solomon", "The Tower of Babel"], correctIndex: 3 },
              { text: "What ancient architectural structure likely inspired the biblical author's image of the tower?", choices: ["The amphitheater", "The aqueduct", "The ziggurat", "The pyramid"], correctIndex: 2 },
              { text: "In Babylonian culture, ziggurats were believed to represent:", choices: ["Tombs for kings", "Marketplaces for trade", "Military fortresses", "The meeting point of heaven and earth"], correctIndex: 3 },
              { text: "Theologically, the tower in Genesis 11 symbolizes:", choices: ["God's command to build a temple", "A simple engineering achievement", "A punishment already inflicted on humanity", "Humanity's restless desire to rise above creaturehood and establish power independent of God"], correctIndex: 3 },
              { text: "According to Genesis 11:4, what did the builders of Babel specifically want to do?", choices: ["Establish a new system of laws", "'Make a name' for themselves", "Build a home for the poor", "Create a new language"], correctIndex: 1 },
              { text: "In the biblical sense, having a 'name' denotes:", choices: ["Simply an identification tag", "A tax record", "A curse", "Identity, honor, and destiny"], correctIndex: 3 },
              { text: "How does God's later promise to Abram (Gen 12:2) contrast with the builders' pursuit of a 'name'?", choices: ["Abram builds a second tower", "God offers to elevate Abram's name, while the builders sought to make their own name apart from God", "God condemns Abram for the same sin as the builders", "There is no connection between the two accounts"], correctIndex: 1 },
              { text: "The mindset of the Babel builders is compared in the module to which other biblical moment?", choices: ["The flood of Noah", "The exile in Babylon", "Cain's murder of Abel", "The serpent's promise to Eve that she would 'be like God' (Gen 3:4-5)"], correctIndex: 3 },
              { text: "According to the module, the true conflict in the Tower of Babel narrative is between:", choices: ["Rich and poor city-dwellers", "Human pride and divine sovereignty", "Two competing nations", "Farmers and shepherds"], correctIndex: 1 },
              { text: "Ultimately, the module presents the Babel story as a critique of:", choices: ["Nomadic life", "Human arrogance that pursues greatness and unity independent of God", "Physical labor", "The invention of language"], correctIndex: 1 }
            ]
          },
          {
            nodeId: 'sf4_n2', type: 'task', title: 'Two Dangers of Goodness',
            prompt: "Explain the module's two dangers of human goodness — 'we do good, but it turns out wrong' and 'too much desire for goodness is terrible' — with one modern example of each.",
            ticketReward: 'task_ticket'
          },
          {
            nodeId: 'sf4_n3', type: 'journal', title: 'The Restless Heart',
            prompt: "Reflect on St. Augustine's words, 'You have made us for yourself, O Lord, and our hearts are restless until they rest in you,' alongside Psalm 84:1-2. Describe a moment when you sensed that longing in your own life.",
            ticketReward: 'journal_ticket'
          },
          {
            nodeId: 'sf4_n4', type: 'recitation', title: 'God Does Not Abandon',
            prompt: "Discuss why, according to the module, 'God does not delight in punishing man indefinitely' — and what this reveals about God's mercy even after humanity's repeated alienation from Him.",
            ticketReward: 'recitation_ticket'
          }
        ]
      },
      {
        chapterId: 'semifinal_ch5',
        chapterTitle: 'Shame, Blame, and Broken Ground',
        basedOn: "Shame and hiding after the fall (Gen 3:7-10), blame-shifting (Gen 3:12-13), exile from Eden (Gen 3:23-24), ecological sin (CBCP pastoral letter, Laudato Si'), and sin as a broken relationship healed through Reconciliation",
        nodes: [
          {
            nodeId: 'sf5_n1', type: 'quiz', title: 'Shame, Exile, and Broken Ground',
            prompt: "Explain how shame, blame-shifting, exile, and humanity's harm to creation all reveal the same underlying wound: a broken relationship with God.",
            ticketReward: 'quiz_ticket',
            questions: [
              { text: "What realization is described in Genesis 3:7 immediately after Adam and Eve's disobedience?", choices: ["They realized they were naked", "They realized they were alone", "They realized they were immortal", "They realized they were hungry"], correctIndex: 0 },
              { text: "In the ancient world, depictions of captured soldiers made to appear naked symbolized:", choices: ["Wealth and status", "Vulnerability and humiliation", "Athletic skill", "Religious devotion"], correctIndex: 1 },
              { text: "What did Adam and Eve do in response to their shame, according to Genesis 3:7?", choices: ["Sewed fig leaves together as coverings", "Built a wall around the garden", "Fled to another country", "Offered an animal sacrifice"], correctIndex: 0 },
              { text: "When God questions Adam in Genesis 3:12, how does Adam respond?", choices: ["He confesses immediately without excuse", "He shifts blame to Eve (and implicitly to God, who gave her to him)", "He blames the serpent directly", "He remains silent"], correctIndex: 1 },
              { text: "Who does Eve blame for her disobedience in Genesis 3:13?", choices: ["Herself", "Adam", "God", "The serpent"], correctIndex: 3 },
              { text: "According to biblical scholar Gerhard von Rad, sin causes estrangement in which two directions?", choices: ["Only in the afterlife", "Only among nations", "Vertically from God and horizontally from others", "Only within a person's own mind"], correctIndex: 2 },
              { text: "According to Genesis 3:23-24, what happens after Adam and Eve's disobedience?", choices: ["They die immediately", "They are transformed into animals", "They are exiled from the garden, with cherubim guarding the Tree of Life", "They are struck mute"], correctIndex: 2 },
              { text: "The CBCP's 1988 pastoral letter 'What is Happening to Our Beautiful Land' describes the destruction of forests, rivers, and seas as:", choices: ["An exaggeration by activists", "A necessary economic cost", "'The rape of Mother Earth'", "Unrelated to sin"], correctIndex: 2 },
              { text: "In Laudato Si' §220, Pope Francis emphasizes that humanity is:", choices: ["Exempt from ecological concerns", "'Not disconnected from the rest of creatures, but joined in a splendid universal communion'", "Superior to and separate from all creation", "Responsible only for its own wellbeing"], correctIndex: 1 },
              { text: "According to the module, sin as a broken relationship with God is ultimately healed through:", choices: ["The sacrament of Penance and Reconciliation, restoring communion with God and the Church", "Avoiding all social contact", "Political reform only", "Human willpower alone"], correctIndex: 0 }
            ]
          },
          {
            nodeId: 'sf5_n2', type: 'task', title: 'Naked and Ashamed',
            prompt: "Explain the theological meaning of Adam and Eve's shame and hiding (Gen 3:7-10), and describe the pattern of blame-shifting shown in Gen 3:12-13.",
            ticketReward: 'task_ticket'
          },
          {
            nodeId: 'sf5_n3', type: 'journal', title: 'Wounded Earth',
            prompt: "Reflect on the CBCP's description of ecological destruction as 'the rape of Mother Earth' and Pope Francis's call in Laudato Si' for communion with creation. Journal about one way you can better care for the environment in your own life.",
            ticketReward: 'journal_ticket'
          },
          {
            nodeId: 'sf5_n4', type: 'recitation', title: 'Broken and Restored',
            prompt: "Discuss the theological understanding of sin as a breakdown of a loving, free, and just relationship with God, and explain how the sacrament of Reconciliation restores this communion.",
            ticketReward: 'recitation_ticket'
          }
        ]
      },
      {
        chapterId: 'semifinal_ch6',
        chapterTitle: 'Naming What Wounds Us',
        basedOn: "The spread of sin after Eden - first murder (Gen 4:8), the flood (Gen 7:1-22), Babel's confusion (Gen 11:3-4), the genealogies (Gen 5:1-22; 11:10-32); the vocabulary of sin - the five social sins, the three lusts, mortal vs. venial sin",
        nodes: [
          {
            nodeId: 'sf6_n1', type: 'quiz', title: 'The Spread of Sin',
            prompt: "Explain how the stories of Cain and Abel, the flood, and the Tower of Babel each show sin spreading further into human history.",
            ticketReward: 'quiz_ticket',
            questions: [
              { text: "What is described as the 'first murder' in the biblical narrative?", choices: ["Cain killing his father", "Cain killing Abel (Gen 4:8)", "Abel killing Cain", "Noah's son killing his brother"], correctIndex: 1 },
              { text: "What does Cain's refusal to be 'his brother's keeper' (Gen 4:9) reveal about sin?", choices: ["That sin isolates individuals into private conscience only", "That sin has no lasting effect", "That sin only affects nations, not individuals", "That sin spreads and corrupts relationships between people, not just with God"], correctIndex: 3 },
              { text: "Augustine describes the 'city of man' (City of God, XIV.28) as characterized by:", choices: ["Communal harmony", "Pride and self-love, even to the point of disdain for others", "Perfect justice", "Humility and self-sacrifice"], correctIndex: 1 },
              { text: "According to the module, what does the story of the Great Flood (Gen 7:1-22) illustrate?", choices: ["God's intervention to save humanity amid human corruption", "The origin of agriculture", "The beginning of language diversity", "A punishment with no connection to sin"], correctIndex: 0 },
              { text: "What do the genealogies in Genesis (5:1-22; 11:10-32) demonstrate, according to the module?", choices: ["Only royal bloodlines", "The end of human history", "A list with no theological significance", "Both the spread of sin and the continuity of life across generations"], correctIndex: 3 },
              { text: "The confusion of language at Babel (Gen 11:3-4) is presented in Scripture as:", choices: ["A punishment unrelated to pride", "A blessing for diversity", "A sign of humanity's growing alienation from God", "An accident with no meaning"], correctIndex: 2 },
              { text: "According to the module, the stories of the murder, the flood, Babel, and the genealogies are best understood as:", choices: ["Merely historical records with no deeper meaning", "Proof that evil is limited to one family", "Theological depictions of the progressive spread of sin", "Isolated legends unconnected to Genesis 3"], correctIndex: 2 },
              { text: "What pattern do the sacred writers use, according to the module, to illustrate humanity's growing alienation from God?", choices: ["Numerical codes", "Strict historical dating only", "A wealth of imagery, including colors, shapes, and symbols", "Silence and omission"], correctIndex: 2 },
              { text: "What does John Paul II say in Evangelium Vitae (no. 7) about the Cain and Abel story?", choices: ["The story has no relevance to modern life", "Cain was innocent of any wrongdoing", "'Life is always at the center of a great struggle between good and evil, between light and darkness'", "Abel was equally guilty"], correctIndex: 2 },
              { text: "According to the module, what is the only way to end the 'cycle of violence' begun with Cain and Abel?", choices: ["Ignoring the past", "A return to God's mercy (Rom 5:20-21)", "Isolation from society", "Strict human law enforcement alone"], correctIndex: 1 }
            ]
          },
          {
            nodeId: 'sf6_n2', type: 'identification', title: 'Name That Sin',
            prompt: "For each definition below, identify the correct term from the module's vocabulary of sin.",
            ticketReward: 'quiz_ticket',
            questions: [
              { text: "This sin is defined as elevating created realities to the level of divinity and focusing worship on something other than God.", choices: ["Blasphemy", "Idolatry", "Apostasy", "Heresy"], correctIndex: 1 },
              { text: "This sin occurs when a belief system reworks doctrine to fit cultural or personal preference, accepting some parts of the Christian message while rejecting others.", choices: ["Heresy", "Blasphemy", "Apostasy", "Hypocrisy"], correctIndex: 0 },
              { text: "This sin is committed by those who appear morally upright outwardly but are corrupt inwardly, prioritizing reputation over truthful living.", choices: ["Apostasy", "Idolatry", "Hypocrisy", "Heresy"], correctIndex: 2 },
              { text: "This sin is a willful, complete departure from a professed faith in God.", choices: ["Hypocrisy", "Blasphemy", "Apostasy", "Heresy"], correctIndex: 2 },
              { text: "This sin involves using God's name to maintain social standing or defend structures rather than out of true reverence, violating the Second Commandment.", choices: ["Heresy", "Apostasy", "Idolatry", "Blasphemy"], correctIndex: 3 },
              { text: "This kind of sin refers to the disordered desire for material belongings or anything placed before God.", choices: ["Idolatry", "Lust of the Flesh", "Pride of Life", "Lust of the Eyes"], correctIndex: 3 },
              { text: "This kind of sin covers disordered bodily desires — sensuality, selfishness, and enslaving addictions.", choices: ["Lust of the Flesh", "Heresy", "Pride of Life", "Lust of the Eyes"], correctIndex: 0 },
              { text: "This kind of sin is arrogance, self-exaltation, and the desire for dominance or recognition — the sin that caused Satan's fall.", choices: ["Blasphemy", "Pride of Life", "Lust of the Eyes", "Lust of the Flesh"], correctIndex: 1 },
              { text: "This category of sin is described as an 'illness of the soul' that weakens but does not completely sever one's relationship with God.", choices: ["Original sin", "Mortal sin", "Venial sin", "Social sin"], correctIndex: 2 },
              { text: "This category of sin involves the willful breaking of God's law in a grave matter, with full knowledge and consent, and it 'kills' the life of God within a person.", choices: ["Original sin", "Social sin", "Mortal sin", "Venial sin"], correctIndex: 2 }
            ]
          },
          {
            nodeId: 'sf6_n3', type: 'task', title: 'Tracing the Spread of Sin',
            prompt: "Trace the spread of sin from the first murder (Gen 4:8) through the flood (Gen 7:1-22) to the Tower of Babel (Gen 11:1-9), explaining in writing what each story adds to the picture.",
            ticketReward: 'task_ticket'
          },
          {
            nodeId: 'sf6_n4', type: 'journal', title: 'The Sin I Recognize',
            prompt: "From the module's vocabulary of sin (idolatry, heresy, hypocrisy, apostasy, blasphemy, the three lusts), reflect on the one you notice most often in modern life — or in yourself — and journal about why it's so easy to fall into.",
            ticketReward: 'journal_ticket'
          },
          {
            nodeId: 'sf6_n5', type: 'recitation', title: 'From Cain to Mercy',
            prompt: "Discuss how the 'cycle of violence' begun with Cain and Abel can, according to the module, only be broken by a return to God's mercy (Rom 5:20-21).",
            ticketReward: 'recitation_ticket'
          }
        ]
      },
      // Capstone chapter, deliberately last so it's locked behind every
      // other Semifinal chapter (chapters unlock strictly in order).
      // Sourced from the "Reed 101 Semi-Final.docx" answer-keyed exam
      // (first 50 of its questions — the rest of that document is a
      // differently-shaped matching section and an unmarked True/False
      // section, neither of which fits this single-answer MC format).
      // Quiz-only, no ticket reward, worth one star like any other
      // chapter — every correctIndex here is real, taken directly from
      // the document's red-highlighted answers.
      {
        chapterId: 'semifinal_ch7',
        chapterTitle: 'The Comprehensive Exam',
        basedOn: 'Reed 101 Semi-Final Exam — the human person and the call to faith, freedom and revelation, the nature of faith, and faith\'s relationship to reason and prayer',
        nodes: [
          {
            nodeId: 'sf7_n1', type: 'quiz', title: 'The Human Person and the Call to Faith',
            prompt: 'Answer each question on the human person and why faith matters to a full human life.',
            questions: [
              { text: "It is necessary to study the holistic view of the human person and their faith life because __.", choices: ["The human being resolves to be good", "The human being exercises freedom without limit", "The human being experiences God's reality through Faith.", "The human being experiences Life Completely"], correctIndex: 2 },
              { text: "What is the purpose of studying the lesson about Faith and Human being?", choices: ["To expose humanities limitations and responsibility", "To guarantee salvation and freedom", "To restore the calling that every person denied at first", "To provide a fundamental understanding of the human person"], correctIndex: 3 },
              { text: "All statements are correct about human being except______.", choices: ["the human being lives entirely in the context of freedom", "the human being is always accountable for their action", "the human being shares equally the power of God", "all human creature fully shares God's love"], correctIndex: 2 },
              { text: "It is a limitation of the current generation that causes human misery.", choices: ["It is a generation that upholds individual preferences over the common good", "All options are correct", "It is a generation that promotes a \"cancel culture.\"", "It is a generation that prefers material over spiritual"], correctIndex: 1 },
              { text: "According to the Pastoral Constitution on the Church of the Modern World, it is the reason for human being's unhappiness.", choices: ["Imbalances are punishment given to them by the universe", "Rapid changes brought inequalities to the human condition", "God plans unhappy Life from the beginning of Life", "An imbalanced situation is God's curse on human beings"], correctIndex: 1 },
              { text: "Gaudium et Spes is translated to English as _______.", choices: ["Revelation and Faith", "Pastoral Constitution of the Vatican II", "Pastoral Constitution on the Church of the Modern World", "Faith and Reason"], correctIndex: 2 },
              { text: "What mode of existence is limited only to physical reality?", choices: ["Physical level", "Living level", "Environmental level", "Surviving level"], correctIndex: 3 },
              { text: "Men and women affirm the divine pronouncement through ____.", choices: ["gift of knowledge", "human effort", "gift of Faith", "human destiny"], correctIndex: 2 },
              { text: "What enables human beings to acknowledge the revealed truth fully?", choices: ["All options are correct", "The human person thinks perfectly like his God", "God possesses the human intellect", "The human person can recognize his God"], correctIndex: 3 },
              { text: "What do the intellect and will demonstrate?", choices: ["The physical nature of the act", "The spiritual nature of the act", "The societal nature of the act", "The material nature of the act"], correctIndex: 1 }
            ]
          },
          {
            nodeId: 'sf7_n2', type: 'quiz', title: 'Freedom and the Response of Faith',
            prompt: 'Answer each question on human freedom and how faith responds to it.',
            questions: [
              { text: "What do the intellect and will enable human beings to realize fully?", choices: ["Personal preference", "Independence from God", "Option to do wrong", "Freedom to do only what is right"], correctIndex: 3 },
              { text: "Human freedom entails____.", choices: ["All options are correct", "Avoidance of evil", "Responsibility", "Doing only what is good"], correctIndex: 0 },
              { text: "The following are responses of Faith except for _____.", choices: ["Lino trusts the advice of the counselor", "Maria obeys the teachings of the Church", "Jun believes the words of Jesus from the bible", "Sonny informs everybody to comply"], correctIndex: 3 },
              { text: "All statements are correct about Faith except _______.", choices: ["Obeying", "Trusting", "Revealing", "Believing"], correctIndex: 2 },
              { text: "Human freedom necessitates _____.", choices: ["Freedom to do whatever one desires", "Avoidance from evil", "Both a & b", "Doing only what is good"], correctIndex: 2 },
              { text: "A person of Faith is more productive for the following reasons except for ______.", choices: ["He acts responsibly", "He limits only to what is good", "He does only what is proper", "He is free to do whatever he believes in"], correctIndex: 3 },
              { text: "What does revelation mean?", choices: ["God's desire for salvation", "God intends to call everyone", "God's commitment to save", "God's self-communication"], correctIndex: 3 },
              { text: "How does God reveal?", choices: ["by announcing his presence", "by commanding humans to be true", "by hearing the cry of the poor", "by responding to man's plea for salvation"], correctIndex: 0 },
              { text: "A condition that allows the human being to perceive God's revelation.", choices: ["Economic stability", "Physical health", "Trust", "Intellectual ability"], correctIndex: 2 },
              { text: "What does God desire for all men and women?", choices: ["economic stability", "Independence", "salvation", "Intellectual freedom"], correctIndex: 2 }
            ]
          },
          {
            nodeId: 'sf7_n3', type: 'quiz', title: 'The Nature and Characteristics of Faith',
            prompt: 'Answer each question on what faith is and the qualities that define it.',
            questions: [
              { text: "It is a condition in Life that hinders the expression of freedom.", choices: ["Intellectual proficiency", "All options are correct", "Greed", "Poverty"], correctIndex: 2 },
              { text: "Which of the following statements is about Faith?", choices: ["Responding a disclosure", "Following one's instinct", "Divulging one's identity", "Unveiling one's personhood"], correctIndex: 0 },
              { text: "It is the expression of Faith as an affair of the mind.", choices: ["All options are correct", "Understanding", "Believing", "Obeying"], correctIndex: 1 },
              { text: "It is an expression of Faith as an affair of the hand.", choices: ["doing", "trusting", "comprehending", "believing"], correctIndex: 0 },
              { text: "The characteristic of Faith that God infuses.", choices: ["grace", "certainty", "independence", "self-sufficiency"], correctIndex: 0 },
              { text: "Faith as a human act requires ____.", choices: ["All options are correct", "Intellectual ability", "God's grace", "Human independence"], correctIndex: 2 },
              { text: "Faith is certain because _____.", choices: ["All options are wrong", "It comes from God", "The person perceives it correctly", "The indicators can never be wrong"], correctIndex: 1 },
              { text: "It is a characteristic of Christian prayer that leads the believer to Life here-after.", choices: ["Ecclesiological", "Biblical", "Christological", "Eschatological"], correctIndex: 3 },
              { text: "Which of the following is correct about God's Revelation?", choices: ["Only the learned can comprehend", "Only the wise can detect", "It is within the capacity of the person to understand and interpret its meaning", "It requires the person's intellectual proficiency to perceive"], correctIndex: 2 },
              { text: "We must believe in Divine revelation because ___________.", choices: ["The unbelievers suffer death", "God cannot deceive us", "God punishes the unbelievers", "We cannot fathom the truth of revelation"], correctIndex: 1 }
            ]
          },
          {
            nodeId: 'sf7_n4', type: 'quiz', title: 'Revelation to All Humanity',
            prompt: 'Answer each question on how and why God reveals himself to humanity.',
            questions: [
              { text: "Which of the following belongs to the Christian revelation?", choices: ["God revealed himself through Mohamad", "God revealed himself through nature", "God revealed himself through Buddha", "God revealed himself through Jesus Christ"], correctIndex: 3 },
              { text: "It is a process by which God took the first step to let human beings know who he is and what he does.", choices: ["Religion", "Revelation", "Inspiration", "Faith"], correctIndex: 1 },
              { text: "To whom did God reveal himself?", choices: ["To his chosen ones only", "To all humanity", "To those who believe only", "To those who have not yet encountered him only"], correctIndex: 1 },
              { text: "It is a requirement for anyone to perceive God", choices: ["Faith", "Knowledge", "Freewill", "Wisdom"], correctIndex: 0 },
              { text: "Why did God reveal himself?", choices: ["To integrate with humanity", "To let people know of his existence", "To offer salvation", "To let people experience his might"], correctIndex: 2 },
              { text: "Which is correct about divine revelation?", choices: ["It is an initiative of man", "It is a joint initiative of God and man", "It is the influence of the Holy Spirit", "It is an initiative of God"], correctIndex: 3 },
              { text: "It is a gift from God that turns anyone who embraces it into a believer.", choices: ["Faith", "Revelation", "Miracle", "Grace"], correctIndex: 0 },
              { text: "Which of the following is correct?", choices: ["The mind is not essential to anyone who trusts in God", "None of the options are correct", "God's self-communication is understood through the mind", "The heart is enough for a person to live with God's self-communication"], correctIndex: 2 },
              { text: "It is a free assent to the entirety of God's revealed truth.", choices: ["Grace", "Prayer", "Faith", "Revelation"], correctIndex: 2 },
              { text: "It is a necessity for anyone to have Faith.", choices: ["Illumination", "Grace", "Inspiration", "Prayer"], correctIndex: 1 }
            ]
          },
          {
            nodeId: 'sf7_n5', type: 'quiz', title: 'Faith, Reason, and a Life of Prayer',
            prompt: 'Answer each question on the relationship between faith and reason, and on prayer.',
            questions: [
              { text: "Which of the following is correct?", choices: ["The human intellect is not essential to anyone who believes in God", "All options are wrong", "It is through the human will alone that the person believes in God", "Believing is an act of the intellect"], correctIndex: 3 },
              { text: "Our faith is certain because _________________.", choices: ["The certainty of the divine is greater than what the natural reason provides", "All options are correct", "It is the divine who provides", "Nothing can obscure the revealed truths"], correctIndex: 1 },
              { text: "Which of the following is correct?", choices: ["God endowed the human mind with reason", "Faith and reason go together", "All options are correct", "Faith is from God"], correctIndex: 2 },
              { text: "It is a factor that hinders some people to recognize God.", choices: ["Lack of reason", "Insufficient conscience", "All options are correct", "Lack of Faith"], correctIndex: 3 },
              { text: "Why does Faith always triumph over reason?", choices: ["Human reason is unbeatable in all circumstances of Life", "God gives human beings the reason to believe Him", "God empowers human reason with Faith", "God reveals mysteries and instills Faith in the light of reason"], correctIndex: 3 },
              { text: "The following statements are correct about Faith except for ___.", choices: ["Faith is a Grace", "Faith perfects the human act", "Faith is responding", "Faith is a gift"], correctIndex: 1 },
              { text: "Whom of the following is an existential atheist?", choices: ["Kathy appeals to the holy other to avoid despair", "Marco believes that Life's meaning depends on his capacity to provide", "Sheila believes that Life in its perfection is yet to come", "Konie trusts to savor a perfect life after she dies"], correctIndex: 1 },
              { text: "The following describes the nature of the Christian Faith except for ____.", choices: ["Faith is an expression of our love of God.", "Faith is man's independent decision to keep a way of Life", "Faith is a living process.", "Faith is a response to God's invitation to love."], correctIndex: 1 },
              { text: "The Catechism of the Catholic Church describes prayer as ____.", choices: ["The answer that gives to all the struggles of man's existence", "God's gift, a Covenant, and a communion", "The living and liberating action of man to the beautiful works of God", "Human response to God's Revelation"], correctIndex: 1 },
              { text: "How does one form a habit of prayer?", choices: ["By constant repetition or practice", "By recognizing God's presence in his Life", "By disposing oneself to the atmosphere of communing with God", "By acknowledging God is the source of everything"], correctIndex: 0 }
            ]
          }
        ]
      }
    ]
  },

  final: {
    seasonId: 'final',
    seasonName: 'Final Season',
    subtitle: "God's Action",
    moduleAlignment: 'Module 4: Discerning God’s Action in the Life and History of the Israelite People',
    theme: 'final',
    chapters: [
      {
        chapterId: 'final_ch1',
        chapterTitle: 'What Is Salvation?',
        basedOn: 'Meaning of Salvation - common understanding vs. biblical understanding, Total Salvation across Hebrew, Prophetic, Apocalyptic, Jesus, and Early Church periods',
        nodes: [
          {
            nodeId: 'fn1_n1', type: 'quiz', title: 'Common vs. Biblical Salvation',
            prompt: 'Contrast the common (Greek-influenced) understanding of salvation with the biblical/Hebrew understanding.',
            ticketReward: 'quiz_ticket',
            questions: [
              { text: "The 'common' (Greek-influenced) understanding of salvation tends to emphasize:", choices: ["Salvation earned strictly through animal sacrifice", "Escape of the soul from the body/material world", "Total transformation of the whole person and community", "Only political liberation"], correctIndex: 1 },
              { text: "The biblical/Hebrew understanding of salvation is best described as:", choices: ["A concept absent from the Old Testament", "Concerned only with the afterlife", "Identical to the Greek philosophical view", "Total and holistic — covering body, community, and history, not just the soul"], correctIndex: 3 },
              { text: "'Total Salvation,' as presented in the module, is best understood as:", choices: ["A concept limited to the New Testament", "A reward given only after death", "Only a future event with no present relevance", "Both a present reality and a future hope"], correctIndex: 3 },
              { text: "According to the coursepack, what Greek word related to 'salvation' refers to a healing ointment used to treat wounds?", choices: ["Logos", "Ruah", "Malkuth", "Salve"], correctIndex: 3 },
              { text: "According to the coursepack, the 'common' understanding of salvation (soul's deliverance for heaven) was heavily shaped by which philosophical influence?", choices: ["Modern scientific materialism", "Confucian ethics", "Greco-Roman Neo-Platonic and Aristotelian philosophy", "Ancient Egyptian mythology"], correctIndex: 2 },
              { text: "According to the coursepack's comparison table, how does the biblical view of 'Salvation from Sin' differ from the common view?", choices: ["It denies that sin needs to be forgiven at all", "It focuses only on the forgiveness of personal sin", "It includes salvation from ALL human evils — disease, hunger, poverty, death, war, and oppression", "It applies only to the sins of Israel's ancestors"], correctIndex: 2 },
              { text: "For the Hebrews/Israelites (ca. 2000-586 BCE), how was salvation primarily experienced, according to the coursepack?", choices: ["As a purely mystical experience with no connection to daily life", "As a historical and tangible reality — land, food, freedom, and prosperity", "As irrelevant until after death", "As something achieved only through animal sacrifice"], correctIndex: 1 },
              { text: "Which prophet is cited in the coursepack as proclaiming a 'new Exodus' for the exiles in Babylon?", choices: ["Malachi", "Deutero-Isaiah", "Amos", "Jonah"], correctIndex: 1 },
              { text: "According to the coursepack, what vision of ultimate salvation do the Jewish Apocalyptic writers emphasize?", choices: ["A 'new heaven and a new earth' with no more death or suffering", "The abolition of the Ten Commandments", "The destruction of Jerusalem", "A return to slavery in Egypt"], correctIndex: 0 },
              { text: "According to 1 Corinthians 15:28, quoted in the coursepack, what is the ultimate goal of Total Salvation?", choices: ["That Israel alone will be saved", "That God will be 'all in all'", "That the soul will finally cease to exist", "That the earth will be destroyed permanently"], correctIndex: 1 }
            ]
          },
          {
            nodeId: 'fn1_n2', type: 'task', title: 'Salvation Through the Ages',
            prompt: 'Summarize how the understanding of salvation developed from the Israelites, to the Prophets, to Jewish Apocalyptic writers, to Jesus, to the Early Church.',
            ticketReward: 'task_ticket'
          },
          {
            nodeId: 'fn1_n3', type: 'journal', title: 'A Family Snapshot of Salvation',
            prompt: "Using the 'Family Photo Album' reflection from the module, describe a moment where you experienced God's saving action in your family, friends, or community.",
            ticketReward: 'journal_ticket'
          },
          {
            nodeId: 'fn1_n4', type: 'recitation', title: 'Total Salvation',
            prompt: "Explain the concept of 'Total Salvation' as both a present reality and a future hope.",
            ticketReward: 'recitation_ticket'
          }
        ]
      },
      {
        chapterId: 'final_ch2',
        chapterTitle: 'Out of Egypt',
        basedOn: 'The first three of the Five Great Events - Migration of Abraham to Canaan, Sojourn in Egypt, Escape from Slavery (Moses as guerilla fighter, teacher, and leader)',
        nodes: [
          {
            nodeId: 'fn2_n1', type: 'quiz', title: "Abraham's Migration",
            prompt: "What historical and theological factors are connected to Abraham's migration to Canaan?",
            ticketReward: 'quiz_ticket',
            questions: [
              { text: "Abraham's migration to Canaan is significant because it marks:", choices: ["The founding of the Roman Empire", "The construction of the Temple", "The beginning of God's covenant relationship with a particular people", "The end of the Exodus"], correctIndex: 2 },
              { text: "Which of the following best describes Moses' three roles as presented in the module?", choices: ["Scribe, judge, and tax collector", "Priest, king, and prophet only", "Farmer, merchant, and soldier", "Guerilla fighter/human rights defender, teacher/conscienticizer, and leader"], correctIndex: 3 },
              { text: "The Israelites' journey traced in this chapter moves from slavery in Egypt to:", choices: ["The covenant assembly at Sinai", "The Roman occupation", "The Babylonian exile", "The building of Solomon's Temple"], correctIndex: 0 },
              { text: "According to the coursepack, where did Abram's family originate before migrating toward Canaan?", choices: ["Damascus", "Jerusalem", "Ur of the Chaldeans", "Nineveh"], correctIndex: 2 },
              { text: "According to the coursepack, what three fundamental promises did God make in His covenant with Abraham?", choices: ["Wealth, military power, and a throne", "Eternal youth, victory in war, and fame", "A specific land, many descendants, and a unique nation", "A temple, a priesthood, and a written law"], correctIndex: 2 },
              { text: "What sign did Abraham receive to formally seal his covenant with Yahweh, according to the coursepack?", choices: ["A pilgrimage to Jerusalem", "A burnt offering only", "Baptism", "Circumcision"], correctIndex: 3 },
              { text: "According to the coursepack, how did Joseph end up saving his family from famine?", choices: ["He rose to become Pharaoh's trusted aide overseeing Egypt's grain supply", "He built the pyramids as a food storage system", "He married into Pharaoh's family", "He led a military conquest of Egypt"], correctIndex: 0 },
              { text: "According to the coursepack, what does the name 'Moses' mean, and what does it theologically represent?", choices: ["'Fire-bearer,' representing destruction", "'Chosen prince,' representing royal privilege", "'Wanderer,' representing a life without purpose", "'Drawn out from the water,' representing divine intervention to save the oppressed"], correctIndex: 3 },
              { text: "According to the coursepack, what act led Moses into exile in Midian as a 'guerilla fighter/human rights defender'?", choices: ["He was banished by his own family", "He killed an Egyptian overseer who was mistreating a Hebrew", "He refused to speak to Pharaoh", "He organized a peaceful protest"], correctIndex: 1 },
              { text: "According to the coursepack, what did Moses do as a 'teacher/conscienticizer' when he returned to Egypt?", choices: ["He avoided contact with the Hebrew slaves", "He helped the Hebrews become conscious of the injustice of their oppression", "He taught Pharaoh's court about Hebrew customs", "He wrote a new legal code for Egypt"], correctIndex: 1 }
            ]
          },
          {
            nodeId: 'fn2_n2', type: 'task', title: 'Three Faces of Moses',
            prompt: "Describe Moses' three roles — guerilla fighter/human rights defender, teacher/conscienticizer, and leader.",
            ticketReward: 'task_ticket'
          },
          {
            nodeId: 'fn2_n3', type: 'journal', title: 'Drawn Out of the Water',
            prompt: "Reflect on a time you felt 'drawn out' of a difficult situation by divine intervention or the help of others.",
            ticketReward: 'journal_ticket'
          },
          {
            nodeId: 'fn2_n4', type: 'recitation', title: 'From Slavery to Sinai',
            prompt: "Trace the Israelites' journey from slavery in Egypt to the covenant assembly at Sinai.",
            ticketReward: 'recitation_ticket'
          }
        ]
      },
      {
        chapterId: 'final_ch3',
        chapterTitle: 'The Promised Land and Beyond',
        basedOn: 'The final two Great Events - Occupation of Canaan and the later history (monarchy, division, exile, return, prophets) through Roman rule',
        nodes: [
          {
            nodeId: 'fn3_n1', type: 'quiz', title: 'The Five Great Events',
            prompt: 'List the Five Great Events of Israelite history in order, with an approximate date for each.',
            ticketReward: 'quiz_ticket',
            questions: [
              { text: "Which of these is one of the Five Great Events of Israelite history discussed in the module?", choices: ["The founding of Rome", "The migration of Abraham to Canaan", "The signing of the Magna Carta", "The Council of Nicaea"], correctIndex: 1 },
              { text: "According to the module, the Israelites came to know God primarily through:", choices: ["Isolation from all other nations", "Greek philosophical reasoning alone", "Their lived history as a people", "A single, one-time miraculous event"], correctIndex: 2 },
              { text: "A biblical prophet's three tasks, as described in the module, are to proclaim the Word, perform the Deed, and:", choices: ["Serve exclusively as a royal advisor", "Collect taxes for the Temple", "Endure the fate of a martyr (Death)", "Write only poetry"], correctIndex: 2 },
              { text: "According to the coursepack, what does the name 'Joshua' mean?", choices: ["'Keeper of the covenant scroll'", "'God is salvation' or 'great warrior'", "'Chosen one of the desert'", "'Servant of Pharaoh'"], correctIndex: 1 },
              { text: "According to the coursepack, in how many key ways did the Israelites benefit from the covenant once they occupied Canaan?", choices: ["Four — possessing the land, becoming a nation, affirming identity as Qahal Yahweh, and self-governance", "None; the covenant offered no tangible benefit", "Two — wealth and fame", "Only one — military victory"], correctIndex: 0 },
              { text: "According to the coursepack, what happened to Israel's united kingdom after the death of Solomon?", choices: ["It remained fully united for centuries afterward", "It divided into the northern kingdom of Israel and the southern kingdom of Judah", "It was immediately absorbed into the Roman Empire", "It expanded to conquer Egypt"], correctIndex: 1 },
              { text: "According to the coursepack, what happened to the Northern Kingdom in 722 BCE?", choices: ["It merged peacefully with Judah", "It became the capital of a new empire", "It was overrun by the Assyrian Empire, and many were exiled", "It successfully repelled all invaders"], correctIndex: 2 },
              { text: "According to the coursepack, what does the Hebrew word 'Nabi' (prophet) mean?", choices: ["A soldier who wages holy war", "A scribe who copies the Law", "Both foretelling the future and 'telling forth' God's word publicly", "A royal title with no religious meaning"], correctIndex: 2 },
              { text: "According to the coursepack, who conquered Judah and exiled its people to Babylon in 587 BCE?", choices: ["Alexander the Great", "Cyrus the Great", "Julius Caesar", "Nebuchadnezzar"], correctIndex: 3 },
              { text: "According to the coursepack, who did the prophets show particular concern for, known as the Anawim?", choices: ["Military commanders", "Wealthy merchants", "Foreign kings", "The poor and oppressed"], correctIndex: 3 }
            ]
          },
          {
            nodeId: 'fn3_n2', type: 'task', title: 'Scripture Digging',
            prompt: 'Using Jos. 11:15-23, 1 Sam. 8:1-22, and 1 Kgs. 11:26-31, answer: How did the Israelites come to know God through their history as a people?',
            ticketReward: 'task_ticket'
          },
          {
            nodeId: 'fn3_n3', type: 'journal', title: 'Exile and Return',
            prompt: "Reflect on a personal 'exile and return' experience — a season of loss followed by restoration — and how it shaped your faith.",
            ticketReward: 'journal_ticket'
          },
          {
            nodeId: 'fn3_n4', type: 'task', title: 'Retelling the Five Great Events',
            prompt: 'Write your own retelling of the Five Great Events of the Israelites, in your own words.',
            ticketReward: 'task_ticket'
          },
          {
            nodeId: 'fn3_n5', type: 'recitation', title: 'Word, Deed, Death',
            prompt: 'Explain the three tasks of a biblical prophet — to proclaim the Word, perform the Deed, and endure the fate of a martyr (Death).',
            ticketReward: 'recitation_ticket'
          }
        ]
      },
      {
        chapterId: 'final_ch4',
        chapterTitle: 'The Covenant at Sinai',
        basedOn: 'Fourth Great Event - the Religious Assembly at Sinai, the rise of Yahwism, the Ten Commandments, and the forming of the Qahal Yahweh',
        nodes: [
          {
            nodeId: 'fn4_n1', type: 'quiz', title: 'The Assembly of Yahweh',
            prompt: "Answer each question on the Religious Assembly at Sinai and the covenant that formed the Qahal Yahweh.",
            ticketReward: 'quiz_ticket',
            questions: [
              { text: "What is the Hebrew term for the assembly/community of Israel united under Yahweh?", choices: ["Malkuth", "Anawim", "Qahal Yahweh", "Dabar YHWH"], correctIndex: 2 },
              { text: "According to the coursepack, what two tenets supported the unity of the Israelite community at Sinai?", choices: ["A shared language and a shared army", "A single king and a single Temple", "Belief in one God and adherence to one religious tradition centered on Yahweh", "Loyalty to Egypt and loyalty to Canaan"], correctIndex: 2 },
              { text: "What religion emerged and became firmly established during Israel's forty years in the desert?", choices: ["Yahwism", "Zoroastrianism", "Hellenism", "Stoicism"], correctIndex: 0 },
              { text: "According to the coursepack, what document lies at the heart of the Religious Assembly at Sinai, laying out moral and spiritual guidelines?", choices: ["The Book of Judges", "The Book of Maccabees", "The Psalms of David", "The Ten Commandments"], correctIndex: 3 },
              { text: "According to the coursepack, what covenant promise does God make in Exodus 6:7 and 20:2?", choices: ["'I will make you ruler of Egypt'", "'You shall never again suffer hardship'", "'You shall build me a golden temple'", "'I will be your God, and you shall be my people'"], correctIndex: 3 },
              { text: "According to the coursepack, Israel's identity as 'Princes of God' replaced which earlier ancestral title?", choices: ["'People of the Desert'", "'Servants of Pharaoh'", "'Children of Babylon'", "'Wrestlers with God' (Israel)"], correctIndex: 3 },
              { text: "According to the coursepack, what role did kings and priests hold within Yahwism's understanding of authority?", choices: ["They held absolute, unquestionable divine authority", "They had no religious role at all", "They served only as representatives, since Yahweh alone possesses ultimate power", "They were appointed by neighboring nations"], correctIndex: 2 },
              { text: "According to the coursepack, the Israelites' time in the Sinai Desert served what dual purpose?", choices: ["It was purely a punishment with no protective value", "It was only a resting stop with no spiritual meaning", "It was both a place of refuge and a testing ground for the young nation", "It served only as a trade route"], correctIndex: 2 },
              { text: "According to the coursepack, what preserved the Israelites' memory of their deliverance over time?", choices: ["Silence, since it was considered too sacred to speak of", "Written contracts with Egypt", "Coins minted in their honor", "Songs, stories, rituals, dances, and worship passed down as oral tradition"], correctIndex: 3 },
              { text: "According to the coursepack, each member's devotion to the community was considered a gauge of what?", choices: ["Their military rank", "Their faithfulness to Yahweh", "Their wealth and status", "Their skill in trade"], correctIndex: 1 }
            ]
          },
          {
            nodeId: 'fn4_n2', type: 'task', title: 'The Qahal Yahweh',
            prompt: "Explain what the coursepack means by the 'Qahal Yahweh,' and describe the two tenets that gave the Israelite community its unity at Sinai.",
            ticketReward: 'task_ticket'
          },
          {
            nodeId: 'fn4_n3', type: 'journal', title: 'Bound Together',
            prompt: "Reflect on a time your own sense of identity or belonging came from being part of a community united around shared belief or purpose, similar to how the Ten Commandments bound Israel together as Qahal Yahweh.",
            ticketReward: 'journal_ticket'
          },
          {
            nodeId: 'fn4_n4', type: 'recitation', title: 'Servants, Not Sovereigns',
            prompt: "Discuss why the coursepack describes kings and priests in Israel as representatives of Yahweh rather than as ultimate authorities in their own right.",
            ticketReward: 'recitation_ticket'
          }
        ]
      },
      {
        chapterId: 'final_ch5',
        chapterTitle: 'Conquest and the Judges',
        basedOn: 'Fifth Great Event, part 1 - the conquest of Canaan under Joshua, the era of the Judges, and the fourfold fulfillment of the covenant',
        nodes: [
          {
            nodeId: 'fn5_n1', type: 'quiz', title: 'Possessing the Land',
            prompt: "Answer each question on the conquest of Canaan and the era of the Judges.",
            ticketReward: 'quiz_ticket',
            questions: [
              { text: "Who led the Israelites in their military conquest of Canaan after the death of Moses?", choices: ["Aaron", "Joshua", "Gideon", "Samuel"], correctIndex: 1 },
              { text: "According to the coursepack, who were the 'Judges' during this period of Israelite history?", choices: ["Foreign kings appointed by Egypt", "Charismatic tribal leaders and warriors who settled disputes and consolidated territory", "Priests who only performed Temple sacrifices", "Roman governors of the province"], correctIndex: 1 },
              { text: "According to Deuteronomy 28 and Joshua 24, in how many key ways did the Israelites benefit from the covenant during the conquest?", choices: ["Zero", "Ten", "Four", "One"], correctIndex: 2 },
              { text: "According to the coursepack, what did the conquest of Canaan reaffirm about the Israelites' relationship to the land?", choices: ["That they had no real claim to any land", "That the land actually belonged to Egypt", "That the land was cursed and unusable", "Their ancestral rights and the fertility/productivity of the land God promised them"], correctIndex: 3 },
              { text: "According to the coursepack, where did Moses die before the Israelites entered Canaan?", choices: ["Jerusalem", "Mount Sinai", "Mount Nebo, east of the Dead Sea", "The banks of the Nile"], correctIndex: 2 },
              { text: "According to the coursepack, how is the Israelites' conquest of Canaan theologically framed?", choices: ["As God fighting for them and giving them a land flowing with milk and honey", "As an accident of history unrelated to the covenant", "As a peaceful negotiation with no fighting", "As a purely secular military campaign with no divine involvement"], correctIndex: 0 },
              { text: "According to the coursepack, what was the political structure of Israel immediately after the conquest, before the monarchy?", choices: ["A colony under Egyptian administration", "A loose confederation of tribes led by Judges", "A centralized empire ruled by one emperor", "A republic with elected senators"], correctIndex: 1 },
              { text: "According to the coursepack, from which direction did the Israelites capture and infiltrate Canaan?", choices: ["From the north through Syria", "From the south through the Sinai Peninsula only", "From the Mediterranean Sea by ship", "Through the Jordan River, via Jericho"], correctIndex: 3 },
              { text: "According to the coursepack, what does the covenantal fulfillment during the conquest demonstrate about Yahweh?", choices: ["His indifference to Israel's fate", "His unwavering providence and faithfulness to His promises", "His unwillingness to keep His promises", "His preference for other nations over Israel"], correctIndex: 1 },
              { text: "According to the coursepack, what name is given to the twelve tribes' collective territorial and communal achievement in Canaan?", choices: ["The possession of the Promised Land", "The Roman Province of Judea", "The Kingdom of Babylon", "The Diaspora"], correctIndex: 0 }
            ]
          },
          {
            nodeId: 'fn5_n2', type: 'task', title: 'Four Covenant Benefits',
            prompt: "Describe how the Israelites' conquest and settlement of Canaan is presented in the coursepack as the fulfillment of God's covenant promises, referencing at least two of the four covenantal benefits.",
            ticketReward: 'task_ticket'
          },
          {
            nodeId: 'fn5_n3', type: 'journal', title: 'My Promised Land',
            prompt: "Reflect on a 'promised land' moment in your own life — a goal or hope you worked toward for a long time before finally reaching it — and what sustained your faith along the way.",
            ticketReward: 'journal_ticket'
          },
          {
            nodeId: 'fn5_n4', type: 'recitation', title: 'From Judges to Kings',
            prompt: "Discuss the role of the Judges in Israel's early life in Canaan, and why a loose confederation of tribes eventually gave way to the demand for a king.",
            ticketReward: 'recitation_ticket'
          }
        ]
      },
      {
        chapterId: 'final_ch6',
        chapterTitle: 'A Kingdom United',
        basedOn: 'Creation of the Monarchy - Saul, David, and Solomon, the building of the First Temple, and the covenantal responsibilities of kingship',
        nodes: [
          {
            nodeId: 'fn6_n1', type: 'quiz', title: 'Saul, David, and Solomon',
            prompt: "Answer each question on the rise of Israel's monarchy and its covenantal responsibilities.",
            ticketReward: 'quiz_ticket',
            questions: [
              { text: "According to the coursepack, why did the Israelites decide to institute a monarchy?", choices: ["They believed a single leader would strengthen their national identity in the Promised Land", "They were forced to by a foreign empire", "They had no reason at all", "They wanted to abolish their covenant with Yahweh"], correctIndex: 0 },
              { text: "Who was Israel's first king, according to the coursepack?", choices: ["Solomon", "David", "Saul", "Samuel"], correctIndex: 2 },
              { text: "According to the coursepack, how did David expand Israel's prosperity?", choices: ["Through territorial expansion, strategic alliances, and centralized government", "By returning to a nomadic lifestyle", "By surrendering to neighboring powers", "By abolishing all taxation"], correctIndex: 0 },
              { text: "What structure did Solomon build in Jerusalem that became the spiritual and cultural center of the kingdom?", choices: ["A city wall around Jericho", "The First Temple", "A second Qahal Yahweh", "A new royal palace only"], correctIndex: 1 },
              { text: "According to the coursepack, what were the two main duties of an Israelite king?", choices: ["Ruling as an absolute, unquestionable authority", "Upholding justice and preserving the covenant community (Qahal Yahweh)", "Collecting taxes and expanding the army only", "Building temples and nothing else"], correctIndex: 1 },
              { text: "According to the coursepack, what were the three main pillars of Israel's kingdom under the monarchy?", choices: ["The army, the priesthood, and foreign alliances", "Agriculture, trade, and the navy", "Political structure, economic might, and religious-cultural identity", "Law, art, and philosophy"], correctIndex: 2 },
              { text: "According to the coursepack, what ultimately demonstrated a king's devotion to God?", choices: ["The number of his wives", "The size of his personal wealth", "His success in warfare alone", "Faithful leadership and concern for his subjects"], correctIndex: 3 },
              { text: "Under whose leadership did Israel first secure its borders and consolidate political and military power?", choices: ["Solomon", "Saul", "Rehoboam", "Jeroboam"], correctIndex: 1 },
              { text: "According to the coursepack, what did the monarchy exemplify about the relationship between governance, faith, and culture in Israel?", choices: ["That they were inseparably intertwined, with the king as both ruler and covenantal steward", "That faith was a purely private matter with no bearing on politics", "That governance had nothing to do with faith", "That culture was irrelevant to kingship"], correctIndex: 0 },
              { text: "According to the coursepack, what era in Israel's monarchy is marked as its political and economic zenith?", choices: ["The Roman occupation", "The period immediately after the conquest", "The Babylonian exile", "The reigns of David and Solomon"], correctIndex: 3 }
            ]
          },
          {
            nodeId: 'fn6_n2', type: 'task', title: 'A King\'s Two Duties',
            prompt: "Explain the two main duties of an Israelite king according to the coursepack, and describe how Solomon's building of the Temple expressed his devotion to Yahweh.",
            ticketReward: 'task_ticket'
          },
          {
            nodeId: 'fn6_n3', type: 'journal', title: 'A Steward, Not Just a Ruler',
            prompt: "Reflect on someone in your own life who has held a position of leadership or responsibility with integrity. How did their example shape your understanding of what good leadership looks like?",
            ticketReward: 'journal_ticket'
          },
          {
            nodeId: 'fn6_n4', type: 'recitation', title: 'Kingship as Covenant',
            prompt: "Discuss why the coursepack presents Israel's monarchy as a covenantal responsibility rather than simply a political institution.",
            ticketReward: 'recitation_ticket'
          }
        ]
      },
      {
        chapterId: 'final_ch7',
        chapterTitle: 'A Kingdom Divided and Exiled',
        basedOn: 'The division of the kingdom after Solomon, the Assyrian conquest of the Northern Kingdom, and the Babylonian exile of the Southern Kingdom',
        nodes: [
          {
            nodeId: 'fn7_n1', type: 'quiz', title: 'Division and Exile',
            prompt: "Answer each question on the division of Israel's kingdom and the exiles that followed.",
            ticketReward: 'quiz_ticket',
            questions: [
              { text: "According to the coursepack, what burdens did Solomon impose on the northern regions of his kingdom that caused suffering among the people?", choices: ["Confiscation of all livestock", "Forced conversion to a foreign religion", "High taxes and forced labor", "A ban on all trade"], correctIndex: 2 },
              { text: "What happened to Israel's kingdom after Solomon's death, according to the coursepack?", choices: ["It became a republic", "It divided into the northern kingdom of Israel and the southern kingdom of Judah", "It remained fully united for another century", "It was immediately conquered by Egypt"], correctIndex: 1 },
              { text: "Which tribes remained loyal to the Davidic line and became the kingdom of Judah?", choices: ["The northern tribes", "The southern tribes", "None of the tribes", "All twelve tribes equally"], correctIndex: 1 },
              { text: "According to the coursepack, what empire conquered the Northern Kingdom in 722 BCE?", choices: ["The Babylonian Empire", "The Assyrian Empire", "The Persian Empire", "The Roman Empire"], correctIndex: 1 },
              { text: "According to the coursepack, what theological explanation did the prophets give for the political collapse and exile of Israel?", choices: ["A punishment unrelated to their actions", "Random bad luck with no deeper meaning", "Israel's failure to uphold its covenant with God", "The superior technology of their enemies alone"], correctIndex: 2 },
              { text: "What powerful empire, under Nebuchadnezzar, overran Judah in 587 BCE?", choices: ["Assyria", "Babylon", "Greece", "Persia"], correctIndex: 1 },
              { text: "According to the coursepack, roughly how long did the Israelites spend in captivity in Babylon?", choices: ["A single generation of ten years", "Almost fifty years", "One year", "Five hundred years"], correctIndex: 1 },
              { text: "According to the coursepack, why couldn't the exiled Israelites worship Yahweh in the fullness of covenantal rites while in Babylon?", choices: ["Babylon banned all religion entirely", "They had forgotten their traditions completely", "God had abandoned them permanently", "They were cut off from the Temple in Jerusalem"], correctIndex: 3 },
              { text: "According to the coursepack, how do the biblical authors interpret the experience of exile theologically?", choices: ["As a kind of spiritual discipline meant to renew covenantal faithfulness", "As proof that Yahweh was defeated by other gods", "As a permanent and final rejection by God", "As an event with no theological significance"], correctIndex: 0 },
              { text: "According to the coursepack, what happened to the displaced communities of the Northern Kingdom after the Assyrian conquest?", choices: ["They were all put to death", "They immediately returned home", "They founded a new independent nation", "They were relocated throughout Mesopotamia and mostly blended into their new surroundings"], correctIndex: 3 }
            ]
          },
          {
            nodeId: 'fn7_n2', type: 'task', title: 'One Kingdom, Two Fates',
            prompt: "Explain what led to the division of Solomon's kingdom into Israel and Judah, and describe what eventually happened to each kingdom according to the coursepack.",
            ticketReward: 'task_ticket'
          },
          {
            nodeId: 'fn7_n3', type: 'journal', title: 'My Own Exile',
            prompt: "Reflect on a time of personal 'exile' or displacement in your own life — a season when you felt cut off from something important — and how you found (or are still looking for) a way back.",
            ticketReward: 'journal_ticket'
          },
          {
            nodeId: 'fn7_n4', type: 'recitation', title: 'Exile as Discipline',
            prompt: "Discuss why the coursepack interprets the Babylonian exile as a form of spiritual discipline rather than simply a political disaster.",
            ticketReward: 'recitation_ticket'
          }
        ]
      },
      {
        chapterId: 'final_ch8',
        chapterTitle: 'Voices of the Prophets',
        basedOn: 'Who the prophets were, their stages of calling, and their threefold task of Word, Deed, and Death',
        nodes: [
          {
            nodeId: 'fn8_n1', type: 'quiz', title: 'Nabi: The Prophets of Israel',
            prompt: "Answer each question on who the biblical prophets were and what their calling required of them.",
            ticketReward: 'quiz_ticket',
            questions: [
              { text: "What Hebrew word is the English term 'prophet' derived from?", choices: ["Dabar", "Qahal", "Nabi", "Malkuth"], correctIndex: 2 },
              { text: "According to the coursepack, what are the two main aspects of the Hebrew word for prophet?", choices: ["Forecasting future events and 'telling forth' God's word publicly", "Leading armies and building temples", "Collecting taxes and enforcing the law", "Writing history and copying scrolls"], correctIndex: 0 },
              { text: "According to the coursepack, what phrase describes a prophet's public proclamation of God's message?", choices: ["Dabar YHWH (the Word of the Lord)", "Malkuth Elohim", "Qahal Yahweh", "Ruah Adonai"], correctIndex: 0 },
              { text: "According to the Catechism for Filipino Catholics, quoted in the coursepack, what are the three biblical tasks of a prophet?", choices: ["To predict weather, read omens, and write poetry", "To interpret dreams, build temples, and train priests", "To proclaim the Word, perform the Deed, and endure the fate of a martyr (Death)", "To judge disputes, collect taxes, and lead armies"], correctIndex: 2 },
              { text: "According to the coursepack, what were the 'twin corruptions' the prophets constantly called Israel to abandon?", choices: ["Farming and trade", "Idolatry and injustice", "Music and dance", "Poverty and wealth"], correctIndex: 1 },
              { text: "Which stage of a prophet's calling involves the individual accepting God's mission after negotiation?", choices: ["Bargain", "Mission", "Acceptance", "Protest"], correctIndex: 2 },
              { text: "According to the coursepack, who are the 'Anawim,' the group the prophets showed particular concern for?", choices: ["The poor and oppressed", "Wealthy merchants", "Foreign kings", "Military generals"], correctIndex: 0 },
              { text: "According to the coursepack, what dual command did the prophets teach was at the heart of moral and religious fidelity?", choices: ["Avoiding all contact with foreigners", "Paying taxes and observing the Sabbath only", "Loving God fully (Deut 6:5) and loving one's neighbor (Lev 19:18)", "Building temples and offering sacrifices only"], correctIndex: 2 },
              { text: "According to the coursepack, what source of authority did prophets rely on, as opposed to political or military leaders?", choices: ["Military conquest", "Wealth and land ownership", "Inherited royal bloodlines", "Divine charisma, a spiritual empowerment given by God"], correctIndex: 3 },
              { text: "According to the coursepack, during what kind of period did the prophetic vocation most visibly emerge?", choices: ["Periods of complete peace with no conflict", "Periods of social, political, or religious upheaval", "Only after a king's coronation", "Only during times of military victory"], correctIndex: 1 }
            ]
          },
          {
            nodeId: 'fn8_n2', type: 'task', title: 'Word, Deed, Death',
            prompt: "Explain the three biblical tasks of a prophet — Word, Deed, and Death — as described in the coursepack, with an example of how a prophet might carry out each.",
            ticketReward: 'task_ticket'
          },
          {
            nodeId: 'fn8_n3', type: 'journal', title: 'Speaking Uncomfortable Truth',
            prompt: "Reflect on a time you had to speak an uncomfortable truth to someone you cared about, similar to how the prophets proclaimed the Dabar YHWH even when it was unwelcome.",
            ticketReward: 'journal_ticket'
          },
          {
            nodeId: 'fn8_n4', type: 'recitation', title: 'Worship and Justice',
            prompt: "Discuss the twin corruptions of idolatry and injustice that the prophets constantly condemned, and explain why the prophets linked genuine worship of God to justice for the Anawim.",
            ticketReward: 'recitation_ticket'
          }
        ]
      },
      {
        chapterId: 'final_ch9',
        chapterTitle: 'Return and Rebuilding',
        basedOn: 'The Persian conquest of Babylon, the return from exile under Cyrus, and the rebuilding of the Temple under Zerubbabel, Ezra, and Nehemiah',
        nodes: [
          {
            nodeId: 'fn9_n1', type: 'quiz', title: 'Coming Home',
            prompt: "Answer each question on the Israelites' return from exile and the rebuilding of Jerusalem.",
            ticketReward: 'quiz_ticket',
            questions: [
              { text: "What empire overthrew Babylon in 538 BCE, according to the coursepack?", choices: ["Rome", "Greece", "Persia", "Assyria"], correctIndex: 2 },
              { text: "Which Persian king issued the edict permitting the exiled Israelites to return to their homeland?", choices: ["Xerxes", "Nebuchadnezzar", "Cyrus", "Darius"], correctIndex: 2 },
              { text: "According to the coursepack, what two duties did the Israelites take on by accepting the Persian arrangement?", choices: ["Building a new temple to Persian gods", "Converting to the Persian religion and abandoning Yahweh", "Serving in the Persian military and paying tribute to the empire", "Surrendering all their land permanently"], correctIndex: 2 },
              { text: "According to the coursepack, what name was given to those who chose to remain scattered across the empire rather than return?", choices: ["The Anawim", "The Qahal Yahweh", "The Diaspora", "The Hasmoneans"], correctIndex: 2 },
              { text: "According to the coursepack, what name was given to the Israelites who did return home, signifying continuity and hope?", choices: ["The Maccabees", "The Zealots", "The 'Rest' of Israel (Jews)", "The Samaritans"], correctIndex: 2 },
              { text: "Which two prophets encouraged the rebuilding of the Temple under Zerubbabel's leadership?", choices: ["Amos and Hosea", "Haggai and Zechariah", "Elijah and Elisha", "Isaiah and Jeremiah"], correctIndex: 1 },
              { text: "Along with Ezra, who led the effort to rebuild and restore the city of Jerusalem?", choices: ["Solomon", "David", "Cyrus", "Nehemiah"], correctIndex: 3 },
              { text: "According to the coursepack, what made the social and religious restoration of Jerusalem possible during this period?", choices: ["The total destruction of all Persian influence", "A new war against Assyria", "A violent uprising against Persia", "The relatively stable and tranquil atmosphere of Persian rule"], correctIndex: 3 },
              { text: "According to the coursepack, why did many Israelites choose to stay in Mesopotamia rather than return to their homeland?", choices: ["They preferred Persian religion over Yahwism", "Better agricultural opportunities along the fertile Tigris and Euphrates", "They had forgotten their identity entirely", "They were forbidden from returning"], correctIndex: 1 },
              { text: "According to the coursepack, what did the returning Israelites find when they arrived back in their homeland?", choices: ["A fully rebuilt and thriving city awaiting them", "A land now ruled by their own former kings", "Their homeland in ruins, desolate, and culturally changed by foreign occupation", "An empty land with no history of prior settlement"], correctIndex: 2 }
            ]
          },
          {
            nodeId: 'fn9_n2', type: 'task', title: 'Rebuilders of Jerusalem',
            prompt: "Explain how the coursepack describes the roles of Zerubbabel, Haggai, Zechariah, Ezra, and Nehemiah in the return and rebuilding of Jerusalem.",
            ticketReward: 'task_ticket'
          },
          {
            nodeId: 'fn9_n3', type: 'journal', title: 'Rebuilding After Loss',
            prompt: "Reflect on a time you had to rebuild something in your life — a relationship, a habit, or your own confidence — after a period of loss or hardship.",
            ticketReward: 'journal_ticket'
          },
          {
            nodeId: 'fn9_n4', type: 'recitation', title: 'Diaspora and Remnant',
            prompt: "Discuss the difference between the 'Diaspora' and the 'Rest' of Israel, and what each group's experience reveals about faith and identity under difficult circumstances.",
            ticketReward: 'recitation_ticket'
          }
        ]
      },
      {
        chapterId: 'final_ch10',
        chapterTitle: 'Between the Testaments',
        basedOn: 'Greek rule and the persecution under Antiochus IV Epiphanes, the Maccabean Revolt and Hasmonean rule, and Roman conquest leading into the time of Jesus',
        nodes: [
          {
            nodeId: 'fn10_n1', type: 'quiz', title: 'Greece, the Maccabees, and Rome',
            prompt: "Answer each question on the centuries of foreign rule between the return from exile and the birth of Jesus.",
            ticketReward: 'quiz_ticket',
            questions: [
              { text: "Under whose leadership did Palestine come under Greek control in 332 BCE, according to the coursepack?", choices: ["Alexander the Great", "Nebuchadnezzar", "Cyrus the Great", "Julius Caesar"], correctIndex: 0 },
              { text: "According to the coursepack, what cultural movement did Alexander's conquest bring to the Jewish people?", choices: ["Roman law and citizenship", "Persian imperial administration", "Egyptian religious practices", "Hellenistic culture, ideas, and governance"], correctIndex: 3 },
              { text: "Which Seleucid king is described in the coursepack as considering the Jews a religious and political danger and desecrating the Temple?", choices: ["Pompey", "Herod the Great", "Antiochus IV Epiphanes", "Ptolemy I"], correctIndex: 2 },
              { text: "According to the coursepack, which Jewish religious practices did Antiochus IV Epiphanes's decrees prohibit?", choices: ["Circumcision and Sabbath observance", "Reading and writing", "Marriage and burial rites", "Farming and trade"], correctIndex: 0 },
              { text: "Which family led the Jewish resistance that regained a degree of self-governance for Judea?", choices: ["The House of David", "The Maccabean family", "The Herodian family", "The Sadducees"], correctIndex: 1 },
              { text: "According to the coursepack, roughly how long did the Jewish community enjoy relative autonomy under Hasmonean leadership?", choices: ["A single decade", "Nearly a century", "Over a thousand years", "Only a few months"], correctIndex: 1 },
              { text: "Which Roman general captured Jerusalem in 63 BCE, ending Jewish self-government, according to the coursepack?", choices: ["Titus", "Augustus", "Julius Caesar", "Pompey"], correctIndex: 3 },
              { text: "According to the coursepack, what burdens did ordinary Jews bear under Roman rule?", choices: ["Forced conversion to Roman religion only", "Complete exile from Judea", "High taxes and mandatory military service", "A ban on the Hebrew language"], correctIndex: 2 },
              { text: "According to the coursepack, what environment did Jesus's birth take place within?", choices: ["A tense mix of religious fidelity, political cooperation, and oppression under Roman rule", "A time of complete peace and independence", "A period with no expectation of a Messiah", "A society with no connection to its covenant history"], correctIndex: 0 },
              { text: "According to the coursepack, what did the hardships of Roman Palestine intensify among the Jewish community?", choices: ["Indifference to their covenant history", "A desire to permanently assimilate into Roman culture", "The desire for both national and spiritual restoration, framing messianic expectation", "A total abandonment of belief in Yahweh"], correctIndex: 2 }
            ]
          },
          {
            nodeId: 'fn10_n2', type: 'task', title: 'Three Foreign Powers',
            prompt: "Summarize the sequence of foreign powers that ruled over Judea between the Persian period and the birth of Jesus — Greek, Hasmonean, and Roman — and describe one major event from each.",
            ticketReward: 'task_ticket'
          },
          {
            nodeId: 'fn10_n3', type: 'journal', title: 'Faith Under Pressure',
            prompt: "Reflect on a time your faith or values were tested by pressure to conform to something you didn't believe in, similar to how the Jewish people resisted pressure to abandon their covenant under Antiochus IV Epiphanes.",
            ticketReward: 'journal_ticket'
          },
          {
            nodeId: 'fn10_n4', type: 'recitation', title: 'Waiting for the Messiah',
            prompt: "Discuss why the coursepack presents the political and religious hardships of Roman-occupied Judea as the context that shaped Jewish hope for a Messiah.",
            ticketReward: 'recitation_ticket'
          }
        ]
      },
      // Capstone chapter, deliberately last so it's locked behind every
      // other Final chapter. Sourced from "Reed 101 Final.docx" —
      // questions 51-100 of that exam, quiz-only, no ticket reward,
      // worth one star like any other chapter. This is the final star
      // Apostle needs to reach 12/12 and unlock legendaryEligible.
      // Two of the original Q51-100 items (fn11_n5's 5th and 6th
      // questions) had no color-marked answer in the source document,
      // so they were swapped for two verified, clearly-answered
      // questions from earlier in the same exam (Q23 and Q34) instead.
      {
        chapterId: 'final_ch11',
        chapterTitle: 'The Comprehensive Final Exam',
        basedOn: 'Reed 101 Final Examination (Q51-100) — creation and stewardship, the Fall and human freedom, Abraham through the Exodus, covenant and kingdom, and exile through foreign rule',
        nodes: [
          {
            nodeId: 'fn11_n1', type: 'quiz', title: 'Creation, Exile, and the Divine Name',
            prompt: 'Answer each question on the creation traditions, the divine name, and the Babylonian exile.',
            questions: [
              { text: "According to Exodus 2:10, how did Moses get his name?", choices: ["Yahweh said his name would be Moses", "The daughter of Pharaoh gave him the name", "His mother assigned him the name", "The caretaker gave him the name"], correctIndex: 1 },
              { text: "The four oral traditions of the Old Testament differ according to their ____.", choices: ["image of God", "kind of followers", "style of writing", "number of Gods they believe in"], correctIndex: 0 },
              { text: "The text in Genesis 2:4b-25 portrays God as ______.", choices: ["an almighty", "a lawgiver", "a good father", "a potter"], correctIndex: 3 },
              { text: "The Jewish people felt that their exile in Babylon was a _______ from God.", choices: ["punishment", "commendation", "reward", "praise"], correctIndex: 0 },
              { text: "The image of God that originated during the exile in Babylon was ____.", choices: ["God is powerful", "God is a companion", "God is a judge", "God is divine, while man is sinful"], correctIndex: 3 },
              { text: "According to the Yahwist Tradition, a person lives a dignified life when he can ______.", choices: ["go along with science and technology", "excel in his career", "finish a course", "live harmoniously with God's creation"], correctIndex: 3 },
              { text: "According to the Yahwist tradition, the two components of human life are the _______.", choices: ["garden and the plants", "man and the woman", "soil and the breath of God", "land and water"], correctIndex: 2 },
              { text: "Which of the following is a synonym of Yahweh?", choices: ["Manama", "El", "Yehua", "Eloi"], correctIndex: 2 },
              { text: "The Hebrew term 'Ruah' is considered holy because it refers to _____.", choices: ["the breath of God", "the heaven", "God himself", "the paradise"], correctIndex: 0 },
              { text: "The human being is sacred because ________.", choices: ["he is the crown of reaction", "he is rational", "his life is from God", "he came from the Earth"], correctIndex: 2 }
            ]
          },
          {
            nodeId: 'fn11_n2', type: 'quiz', title: 'Stewardship, the Fall, and Human Freedom',
            prompt: 'Answer each question on humanity\'s call to steward creation and the consequences of the Fall.',
            questions: [
              { text: "I can help restore the Garden of Eden by ______.", choices: ["strengthening the law that protects mono-crop plantations", "living harmoniously with nature", "supporting mining operations to enrich the economy", "operating logging concessions"], correctIndex: 1 },
              { text: "The life-giving blessings of Yahweh to the human being comes in the form of ________.", choices: ["land", "justice", "freedom", "all options are correct"], correctIndex: 3 },
              { text: "As stewards of God's creation, Yahweh granted man freedom and commanded him to _______.", choices: ["exploit the Earth", "harvest whatever resources the Earth has", "do whatever he wills upon the Earth", "protect the Earth from destruction"], correctIndex: 3 },
              { text: "It is an address to God which means 'someone who makes others live.'", choices: ["Ruah", "Adamah", "Yehua", "Elohim"], correctIndex: 2 },
              { text: "To be the crown of creation means that the human being _________.", choices: ["owns the whole created universe", "is called to care for the Earth so that future generations may live", "is the head of the universe", "can do anything he likes on the Earth"], correctIndex: 1 },
              { text: "The name 'Eve' is from the Hebrew 'ish' or 'hawwah,' which means _______.", choices: ["breath", "soil", "life", "woman"], correctIndex: 2 },
              { text: "The text in Genesis 3:1-24 portrays ____.", choices: ["The first human disobeyed God", "God will come again at the end of time", "Humanity subdued God's creation", "God created the Earth"], correctIndex: 0 },
              { text: "It is the consequence that man faced when he sinned.", choices: ["Man has to die", "Man has to work for his survival", "all options are correct", "God banned the man from paradise"], correctIndex: 2 },
              { text: "Which of the following describes the dimension of human freedom?", choices: ["infinite", "limited", "absolute", "total"], correctIndex: 1 },
              { text: "Man becomes evil when ________.", choices: ["all options are correct", "he enters into the domain of God despite the limit", "he aspires to be God himself", "he uses his freedom beyond goodness"], correctIndex: 0 }
            ]
          },
          {
            nodeId: 'fn11_n3', type: 'quiz', title: 'From Abraham to the Exodus',
            prompt: 'Answer each question on the covenant with Abraham and the Israelites\' escape from Egypt.',
            questions: [
              { text: "The people in ancient Mesopotamia experienced the snake as the symbol of _______.", choices: ["dominance", "persecution", "fertility", "violence"], correctIndex: 2 },
              { text: "According to Genesis 17:1-5, one of God's conditions of his covenant with Abraham _______.", choices: ["Abraham will become the greatest king", "Abraham's tribe will live a life of persecution", "Abraham had 12 sons", "Abraham will become the Father of many nations"], correctIndex: 3 },
              { text: "Which of the following has merited Jacob to succeed the throne of Isaac?", choices: ["Jacob was industrious", "It was Jacob whom Isaac blessed to inherit the throne", "Jacob was the favorite son of Isaac", "all options are correct"], correctIndex: 1 },
              { text: "The 12 sons of Jacob marked the history of salvation significantly by ___.", choices: ["opening the doors of salvation to the Jews", "composing the 12 tribes of Israel", "becoming the most powerful", "all options are wrong"], correctIndex: 1 },
              { text: "Moses returned to Egypt after hiding in Midian because ________.", choices: ["God mandated him to liberate the Hebrews", "the Egyptian soldiers chased him", "he was given the mission to kill Pharaoh", "Jethro drove him out"], correctIndex: 0 },
              { text: "Which of the following did Moses perform?", choices: ["All options are correct", "waged war against Pharaoh", "killed all the male firstborns of the Egyptians", "led his clan to Mt. Sinai"], correctIndex: 3 },
              { text: "Pharaoh realized through the ten plagues that __________.", choices: ["he could not resist the God of the Hebrews", "his prayer was never heard", "All options are correct", "he was disabled to fight the Hebrews"], correctIndex: 2 },
              { text: "Which of the following has its origin in celebrating the Passover meal?", choices: ["prayer and fasting", "hunger strike", "victory party", "Holy Eucharist"], correctIndex: 3 },
              { text: "Which of the following describes Moses as a teacher?", choices: ["he killed an Egyptian soldier", "all options are correct", "he made the Hebrews aware of their rights", "he organized the Hebrews against Egypt"], correctIndex: 2 },
              { text: "What did Moses do that led to the birth of the country Israel?", choices: ["led the escape of the Hebrews from Egypt", "appointed Joshua to succeed his leadership", "organized the twelve tribes into a holy nation", "secured the two tablets of stone"], correctIndex: 2 }
            ]
          },
          {
            nodeId: 'fn11_n4', type: 'quiz', title: 'Covenant, Conquest, and Kingdom',
            prompt: 'Answer each question on the covenant at Sinai, the conquest of Canaan, and the united kingdom.',
            questions: [
              { text: "The text in Exodus 20:1-19 talks about __________.", choices: ["the Qahal Yahweh", "the tribal confederation", "the ten commandments", "life in Mt. Sinai"], correctIndex: 2 },
              { text: "It is the point of unity of the Qahal Yahweh.", choices: ["belief in one God", "adherence to one religion", "one set of laws", "all options are correct"], correctIndex: 3 },
              { text: "How did Genesis' authors interpret the sojourn of Jacob's family in Egypt?", choices: ["Yahweh submitted the Hebrews to the cruel Egyptians for sacrifice", "Yahweh saved the family from hunger by giving them fertile Land to use temporarily", "Yahweh showed how brilliant and how great the Israelites were", "Yahweh called Jacob to lead his people to the oppression of Egyptians"], correctIndex: 1 },
              { text: "The Hebrews evolved into one single community of Yahweh by _____.", choices: ["Responding to the covenantal offer of Yahweh", "All options are wrong", "Waging war against anyone who wishes to share the faith", "Requesting that Yahweh consider them among all nations"], correctIndex: 3 },
              { text: "Which of the following situations was predominant when Israel re-entered the promised Land?", choices: ["serene", "peaceful", "harmonious", "aggressive"], correctIndex: 3 },
              { text: "The Israelites became faithful to Yahweh, their God, when ____.", choices: ["They realized that Yahweh was the only One, True God", "They were convinced that Yahweh bestowed power to their leaders", "They noticed that Yahweh was the most powerful of all gods", "They believed that Yahweh helped them against their enemies"], correctIndex: 0 },
              { text: "How did the Israelites become the chosen people of God?", choices: ["The forefather of the Israelites wrestled with God to win his favor", "Israelites were the most despised among all tribes", "The Israelites responded to the call of Yahweh", "The Israelites demonstrated intelligence superior to other tribes"], correctIndex: 2 },
              { text: "Which of the following was a common practice of the leaders of Israel in deciding for the Kingdom?", choices: ["Consult Yahweh", "Validate his decisions with other gods and goddesses", "Secure advice from the council of elders", "Decide by himself alone"], correctIndex: 0 },
              { text: "What did the Israelites do while in Babylon?", choices: ["Worshipped the gods of the Babylonians", "Waged war against the Babylonians", "Offered sacrifices to Yahweh to atone for their sins", "Submitted to the culture and traditions of the Babylonians"], correctIndex: 2 },
              { text: "It is the factor that contributed to the division of the Kingdom of Israel.", choices: ["The king led the constituents to idolatry", "The tribal leaders claimed autonomy over each other", "The king secured wealth for himself alone", "The members resisted heavy taxation"], correctIndex: 3 }
            ]
          },
          {
            nodeId: 'fn11_n5', type: 'quiz', title: 'Exile, Return, and Foreign Rule',
            prompt: 'Answer each question on the return from exile, the Maccabees, the prophets, and Israel\'s later history.',
            questions: [
              { text: "The Jews were able to return to their homeland after their exile by swearing an oath to the Persian king as follows:", choices: ["Their men should enlist in the Persian army", "They should worship the gods of Persia", "all options are correct", "They should surrender all their wealth to Persia"], correctIndex: 0 },
              { text: "Which of the following was the contribution of the Maccabeans in liberating Israel?", choices: ["Led the Jewish army to surrender", "Established alliance with the Romans", "All options are wrong", "Led the war against the Greek invaders"], correctIndex: 3 },
              { text: "What did the Prophets contribute to the propagation of the Israelitic faith?", choices: ["All options are correct", "Reminded the people about the will of Yahweh", "denounced idolatry", "Condemned social injustices"], correctIndex: 0 },
              { text: "How can you be prophetic these days?", choices: ["Announce the Good News", "Denounce evil practices", "Stand always based on what is true", "All options are correct"], correctIndex: 3 },
              { text: "Which of the following belongs to the sin of pride?", choices: ["Jude consumed the food on the table as much as he could", "Linda stared at Peter lustfully", "Sonny snubbed someone who sought his forgiveness", "Thomas amassed the sugar supply to increase his sale"], correctIndex: 2 },
              { text: "Who among the following committed blasphemy?", choices: ["The Amorites transgressed the God of Israel", "The Romans asserted that Jesus was just human", "The tribe of Israel from the Northern Kingdom disowned Yahweh", "The Israelites worshipped idols while at Mt. Sinai"], correctIndex: 0 },
              { text: "The unified Kingdom of Israel split when _____.", choices: ["Constituents organized resistance against the king", "The Tribal leaders from the North declared independence", "The religious leaders resorted to idolatry", "Constituents lost their faith in Yahweh"], correctIndex: 1 },
              { text: "How did Joseph become Pharaoh's administrator of the agricultural sector?", choices: ["He finished a degree in agriculture", "He interpreted the dream of the Pharaoh concerning Egypt's economy", "He was the political adviser of the Pharaoh", "The tribal chieftains endorsed him"], correctIndex: 1 },
              { text: "The Pharaoh implemented the slavery of the Hebrews in Egypt except for _____.", choices: ["The Pharaoh killed all the male firstborn", "The Pharaoh confiscated their lands", "The Pharaoh blockaded the food supply of the Hebrews", "The Pharaoh recalled their privileges"], correctIndex: 2 },
              { text: "How did Antiochus IV oppress the Israelites during his reign?", choices: ["He demanded the Israelites worship him", "He burned the houses of the Israelites", "He looted the farm of the Israelites", "He organized an attack on a Sabbath day"], correctIndex: 3 }
            ]
          }
        ]
      }
    ]
  }
};

// Deep-merges an admin override doc (settings/seasonContent_{seasonId})
// over the JS defaults above, matching by chapterId/nodeId so a partial
// edit (e.g. just one node's prompt) doesn't require restating everything.
export function mergeSeasonContent(seasonId, override) {
  const defaults = SEASON_CONTENT[seasonId];
  if (!defaults) return null;
  if (!override) return defaults;

  const overrideChaptersById = {};
  (override.chapters || []).forEach((ch) => { overrideChaptersById[ch.chapterId] = ch; });

  const chapters = defaults.chapters.map((chapter) => {
    const chapterOverride = overrideChaptersById[chapter.chapterId];
    if (!chapterOverride) return chapter;

    const overrideNodesById = {};
    (chapterOverride.nodes || []).forEach((n) => { overrideNodesById[n.nodeId] = n; });

    const nodes = chapter.nodes.map((node) => {
      const nodeOverride = overrideNodesById[node.nodeId];
      return nodeOverride ? { ...node, ...nodeOverride } : node;
    });

    return { ...chapter, ...chapterOverride, nodes };
  });

  return { ...defaults, ...override, chapters };
}
