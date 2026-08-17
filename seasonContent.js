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
              { text: "The Priestly account of creation in Genesis 1:1-2:4a uses two organizing patterns. What are they commonly called?", choices: ["The Literary Format and the Fixed Format", "The Poetic Format and the Historical Format", "The Covenant Format and the Exodus Format", "The Wisdom Format and the Prophetic Format"], correctIndex: 0 },
              { text: "How many days does the Priestly creation account use to structure God's creative work?", choices: ["Three", "Six, with a seventh day of rest", "Forty", "Twelve"], correctIndex: 1 },
              { text: "What refrain repeats throughout Genesis 1 after each act of creation?", choices: ["“And God saw that it was good”", "“And the people rejoiced”", "“And it was very difficult”", "“And the angels sang”"], correctIndex: 0 }
            ]
          },
          {
            nodeId: 'mt1_n2', type: 'task', title: 'Order Out of Chaos',
            prompt: 'Diagram the seven days of creation and identify the recurring pattern the biblical authors used.',
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
              { text: "What does it mean that humanity is made in the 'image and likeness' of God, according to Genesis 1:26-27?", choices: ["Humans share in God's dignity, reason, and capacity to love and create", "Humans physically resemble God in appearance", "Only kings and priests carry God's image", "It refers only to Adam, not to all humanity"], correctIndex: 0 },
              { text: "Which creation account (Yahwist tradition) describes God forming humanity from clay and breathing life into it?", choices: ["Genesis 1:1-2:4a", "Genesis 2:4b-25", "Genesis 3:1-24", "Genesis 11:1-9"], correctIndex: 1 },
              { text: "According to the module, humanity's dignity as bearers of God's image calls us to be:", choices: ["Owners who may exploit creation freely", "Stewards responsible for creation", "Passive observers of creation", "Judges over other people's worth"], correctIndex: 1 }
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
              { text: "In the biblical tradition, justice (tsedaqah/mishpat) is best understood as:", choices: ["An attribute of God and a corresponding attribute of the human person", "A purely legal concept unrelated to God", "A punishment reserved for sinners only", "A concept that appears only in the New Testament"], correctIndex: 0 },
              { text: "Which of these is NOT one of the biblical contexts where justice appears, per the module?", choices: ["Creation", "The Exodus", "The Prophets", "Greek philosophy"], correctIndex: 3 },
              { text: "The module contrasts two views of justice found in Scripture. These are:", choices: ["Loyalty to the covenant vs. legal correctness", "Roman law vs. Jewish law", "Justice for the rich vs. justice for the poor", "Justice in this life vs. justice in the afterlife"], correctIndex: 0 }
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
              { text: "In the ancient Near East, the serpent commonly symbolized health, fertility, and wisdom. How does Genesis 3 reinterpret this symbol?", choices: ["As a symbol of the tempter/deceiver", "As a symbol of royal power", "As a minor, unimportant animal", "As a symbol of God's presence"], correctIndex: 0 },
              { text: "What does 'the Tree in the middle of the Garden' represent in Genesis 3?", choices: ["A boundary between divine power and human accountability", "A source of physical food only", "A punishment already given before the fall", "A symbol with no theological meaning"], correctIndex: 0 }
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
              { text: "According to Genesis 3-11, sin results in alienation in how many key relationships?", choices: ["Two", "Three", "Four — self, God, nature, and other people", "Five"], correctIndex: 2 },
              { text: "The story of Cain and Abel (Gen 4:1-16) illustrates which principle about evil?", choices: ["Evil is never isolated — it spreads and affects others", "Evil only affects the person who commits it", "Evil is impossible among family members", "Evil is always immediately punished by exile"], correctIndex: 0 },
              { text: "Which of these is one of the 'three kinds of sin' discussed in the module (alongside Lust of the Flesh and Life's Pride)?", choices: ["Lust of the Eyes", "Fear of the Lord", "Gift of Wisdom", "Zeal for the Law"], correctIndex: 0 }
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
              { text: "'Social sin' refers to:", choices: ["Sin that is embedded in unjust structures and shared societal patterns, not just individual acts", "Sin committed only at social gatherings", "A sin that has no real spiritual effect", "A term used only in the Old Testament"], correctIndex: 0 },
              { text: "Which of these is an example of idolatry in the biblical sense, as discussed in the module?", choices: ["Placing ultimate trust in wealth, power, or self above God", "Attending religious services regularly", "Reading Scripture daily", "Practicing personal prayer"], correctIndex: 0 },
              { text: "Which term describes outwardly religious behavior that masks an inward lack of true faith or integrity?", choices: ["Hypocrisy", "Charity", "Discernment", "Covenant"], correctIndex: 0 }
            ]
          },
          {
            nodeId: 'sf3_n2', type: 'task', title: 'Group Presentation: Consequences of Evil',
            prompt: 'Create a short video/drama presentation depicting the consequences of evil in society, with each member sharing a reflection.',
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
              { text: "What building project is at the center of Genesis 11:1-9?", choices: ["The Temple of Solomon", "The Tower of Babel", "The Ark of the Covenant", "The walls of Jericho"], correctIndex: 1 },
              { text: "What ancient architectural structure likely inspired the biblical author's image of the tower?", choices: ["The pyramid", "The aqueduct", "The ziggurat", "The amphitheater"], correctIndex: 2 },
              { text: "In Babylonian culture, ziggurats were believed to represent:", choices: ["Marketplaces for trade", "The meeting point of heaven and earth", "Military fortresses", "Tombs for kings"], correctIndex: 1 },
              { text: "Theologically, the tower in Genesis 11 symbolizes:", choices: ["A simple engineering achievement", "God's command to build a temple", "Humanity's restless desire to rise above creaturehood and establish power independent of God", "A punishment already inflicted on humanity"], correctIndex: 2 },
              { text: "According to Genesis 11:4, what did the builders of Babel specifically want to do?", choices: ["Build a home for the poor", "'Make a name' for themselves", "Establish a new system of laws", "Create a new language"], correctIndex: 1 },
              { text: "In the biblical sense, having a 'name' denotes:", choices: ["Simply an identification tag", "A curse", "Identity, honor, and destiny", "A tax record"], correctIndex: 2 },
              { text: "How does God's later promise to Abram (Gen 12:2) contrast with the builders' pursuit of a 'name'?", choices: ["There is no connection between the two accounts", "God offers to elevate Abram's name, while the builders sought to make their own name apart from God", "God condemns Abram for the same sin as the builders", "Abram builds a second tower"], correctIndex: 1 },
              { text: "The mindset of the Babel builders is compared in the module to which other biblical moment?", choices: ["Cain's murder of Abel", "The flood of Noah", "The serpent's promise to Eve that she would 'be like God' (Gen 3:4-5)", "The exile in Babylon"], correctIndex: 2 },
              { text: "According to the module, the true conflict in the Tower of Babel narrative is between:", choices: ["Human pride and divine sovereignty", "Two competing nations", "Rich and poor city-dwellers", "Farmers and shepherds"], correctIndex: 0 },
              { text: "Ultimately, the module presents the Babel story as a critique of:", choices: ["The invention of language", "Human arrogance that pursues greatness and unity independent of God", "Physical labor", "Nomadic life"], correctIndex: 1 }
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
              { text: "What realization is described in Genesis 3:7 immediately after Adam and Eve's disobedience?", choices: ["They realized they were hungry", "They realized they were naked", "They realized they were alone", "They realized they were immortal"], correctIndex: 1 },
              { text: "In the ancient world, depictions of captured soldiers made to appear naked symbolized:", choices: ["Wealth and status", "Religious devotion", "Vulnerability and humiliation", "Athletic skill"], correctIndex: 2 },
              { text: "What did Adam and Eve do in response to their shame, according to Genesis 3:7?", choices: ["Sewed fig leaves together as coverings", "Built a wall around the garden", "Fled to another country", "Offered an animal sacrifice"], correctIndex: 0 },
              { text: "When God questions Adam in Genesis 3:12, how does Adam respond?", choices: ["He confesses immediately without excuse", "He shifts blame to Eve (and implicitly to God, who gave her to him)", "He blames the serpent directly", "He remains silent"], correctIndex: 1 },
              { text: "Who does Eve blame for her disobedience in Genesis 3:13?", choices: ["Adam", "God", "The serpent", "Herself"], correctIndex: 2 },
              { text: "According to biblical scholar Gerhard von Rad, sin causes estrangement in which two directions?", choices: ["Vertically from God and horizontally from others", "Only within a person's own mind", "Only among nations", "Only in the afterlife"], correctIndex: 0 },
              { text: "According to Genesis 3:23-24, what happens after Adam and Eve's disobedience?", choices: ["They are struck mute", "They are exiled from the garden, with cherubim guarding the Tree of Life", "They are transformed into animals", "They die immediately"], correctIndex: 1 },
              { text: "The CBCP's 1988 pastoral letter 'What is Happening to Our Beautiful Land' describes the destruction of forests, rivers, and seas as:", choices: ["A necessary economic cost", "'The rape of Mother Earth'", "An exaggeration by activists", "Unrelated to sin"], correctIndex: 1 },
              { text: "In Laudato Si' §220, Pope Francis emphasizes that humanity is:", choices: ["Superior to and separate from all creation", "Exempt from ecological concerns", "'Not disconnected from the rest of creatures, but joined in a splendid universal communion'", "Responsible only for its own wellbeing"], correctIndex: 2 },
              { text: "According to the module, sin as a broken relationship with God is ultimately healed through:", choices: ["Human willpower alone", "Avoiding all social contact", "The sacrament of Penance and Reconciliation, restoring communion with God and the Church", "Political reform only"], correctIndex: 2 }
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
              { text: "What is described as the 'first murder' in the biblical narrative?", choices: ["Cain killing Abel (Gen 4:8)", "Cain killing his father", "Abel killing Cain", "Noah's son killing his brother"], correctIndex: 0 },
              { text: "What does Cain's refusal to be 'his brother's keeper' (Gen 4:9) reveal about sin?", choices: ["That sin has no lasting effect", "That sin spreads and corrupts relationships between people, not just with God", "That sin only affects nations, not individuals", "That sin isolates individuals into private conscience only"], correctIndex: 1 },
              { text: "Augustine describes the 'city of man' (City of God, XIV.28) as characterized by:", choices: ["Humility and self-sacrifice", "Perfect justice", "Pride and self-love, even to the point of disdain for others", "Communal harmony"], correctIndex: 2 },
              { text: "According to the module, what does the story of the Great Flood (Gen 7:1-22) illustrate?", choices: ["A punishment with no connection to sin", "God's intervention to save humanity amid human corruption", "The beginning of language diversity", "The origin of agriculture"], correctIndex: 1 },
              { text: "What do the genealogies in Genesis (5:1-22; 11:10-32) demonstrate, according to the module?", choices: ["Only royal bloodlines", "A list with no theological significance", "Both the spread of sin and the continuity of life across generations", "The end of human history"], correctIndex: 2 },
              { text: "The confusion of language at Babel (Gen 11:3-4) is presented in Scripture as:", choices: ["An accident with no meaning", "A sign of humanity's growing alienation from God", "A blessing for diversity", "A punishment unrelated to pride"], correctIndex: 1 },
              { text: "According to the module, the stories of the murder, the flood, Babel, and the genealogies are best understood as:", choices: ["Merely historical records with no deeper meaning", "Isolated legends unconnected to Genesis 3", "Theological depictions of the progressive spread of sin", "Proof that evil is limited to one family"], correctIndex: 2 },
              { text: "What pattern do the sacred writers use, according to the module, to illustrate humanity's growing alienation from God?", choices: ["Strict historical dating only", "A wealth of imagery, including colors, shapes, and symbols", "Numerical codes", "Silence and omission"], correctIndex: 1 },
              { text: "What does John Paul II say in Evangelium Vitae (no. 7) about the Cain and Abel story?", choices: ["Cain was innocent of any wrongdoing", "'Life is always at the center of a great struggle between good and evil, between light and darkness'", "The story has no relevance to modern life", "Abel was equally guilty"], correctIndex: 1 },
              { text: "According to the module, what is the only way to end the 'cycle of violence' begun with Cain and Abel?", choices: ["Strict human law enforcement alone", "Ignoring the past", "A return to God's mercy (Rom 5:20-21)", "Isolation from society"], correctIndex: 2 }
            ]
          },
          {
            nodeId: 'sf6_n2', type: 'identification', title: 'Name That Sin',
            prompt: "For each definition below, identify the correct term from the module's vocabulary of sin.",
            ticketReward: 'quiz_ticket',
            questions: [
              { text: "This sin is defined as elevating created realities to the level of divinity and focusing worship on something other than God.", choices: ["Idolatry", "Heresy", "Apostasy", "Blasphemy"], correctIndex: 0 },
              { text: "This sin occurs when a belief system reworks doctrine to fit cultural or personal preference, accepting some parts of the Christian message while rejecting others.", choices: ["Hypocrisy", "Heresy", "Apostasy", "Blasphemy"], correctIndex: 1 },
              { text: "This sin is committed by those who appear morally upright outwardly but are corrupt inwardly, prioritizing reputation over truthful living.", choices: ["Idolatry", "Heresy", "Hypocrisy", "Apostasy"], correctIndex: 2 },
              { text: "This sin is a willful, complete departure from a professed faith in God.", choices: ["Heresy", "Hypocrisy", "Apostasy", "Blasphemy"], correctIndex: 2 },
              { text: "This sin involves using God's name to maintain social standing or defend structures rather than out of true reverence, violating the Second Commandment.", choices: ["Idolatry", "Heresy", "Apostasy", "Blasphemy"], correctIndex: 3 },
              { text: "This kind of sin refers to the disordered desire for material belongings or anything placed before God.", choices: ["Lust of the Eyes", "Lust of the Flesh", "Pride of Life", "Idolatry"], correctIndex: 0 },
              { text: "This kind of sin covers disordered bodily desires — sensuality, selfishness, and enslaving addictions.", choices: ["Pride of Life", "Lust of the Eyes", "Lust of the Flesh", "Heresy"], correctIndex: 2 },
              { text: "This kind of sin is arrogance, self-exaltation, and the desire for dominance or recognition — the sin that caused Satan's fall.", choices: ["Lust of the Flesh", "Lust of the Eyes", "Pride of Life", "Blasphemy"], correctIndex: 2 },
              { text: "This category of sin is described as an 'illness of the soul' that weakens but does not completely sever one's relationship with God.", choices: ["Mortal sin", "Venial sin", "Social sin", "Original sin"], correctIndex: 1 },
              { text: "This category of sin involves the willful breaking of God's law in a grave matter, with full knowledge and consent, and it 'kills' the life of God within a person.", choices: ["Venial sin", "Mortal sin", "Social sin", "Original sin"], correctIndex: 1 }
            ]
          },
          {
            nodeId: 'sf6_n3', type: 'task', title: 'Chart the Spread of Sin',
            prompt: "Create a simple timeline or chart tracing the spread of sin from the first murder (Gen 4:8) through the flood (Gen 7:1-22) to the Tower of Babel (Gen 11:1-9), showing what each story adds to the picture.",
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
      // Sourced from the REED 101 Semi-Final Exam form — quiz-only, no
      // ticket reward, worth one star like any other chapter. Every
      // correctIndex below is a PLACEHOLDER (0) — the real answer key
      // isn't visible from a public form response, so these must be set
      // per-question in the Season Path Editor (Dungeon Master console)
      // before this chapter goes live for students.
      {
        chapterId: 'semifinal_ch7',
        chapterTitle: 'The Comprehensive Exam',
        basedOn: 'REED 101 Semi-Final Exam — proofs of God\'s existence, faith and reason, the vocabulary of sin, symbols of the Fall, and the history of salvation',
        nodes: [
          {
            nodeId: 'sf7_n1', type: 'quiz', title: 'Faith, Reason, and the Proofs of God',
            prompt: 'Answer each question on faith, reason, and the classical arguments for God\'s existence.',
            questions: [
              { text: "The principle 'to see is to believe' becoming a guiding philosophy is an example of:", choices: ["The scientific reduction of religion", "Dogmatic relativism", "Secularism", "None of the choices"], correctIndex: 0 },
              { text: "Which proof concerns contingent beings requiring an efficient cause?", choices: ["The Proof from Motion", "The Proof from Degrees of Perfection", "The Proof from Efficient Cause", "The Proof from Necessary vs. Possible Being"], correctIndex: 0 },
              { text: "What is the key difference between Atheism and Agnosticism?", choices: ["Atheism lacks belief in God; agnosticism doesn't take a position on God's existence", "Atheism denies God; agnosticism believes and follows religious practices", "Atheism recognizes God as supreme; agnosticism adores God as prime mover", "None of the choices"], correctIndex: 0 },
              { text: "Which proof concerns the Most Perfect Being causing all perfection and goodness?", choices: ["The Proof from Motion", "The Proof from Degrees of Perfection", "The Proof from Efficient Cause", "The Proof from Necessary vs. Possible Being"], correctIndex: 0 },
              { text: "Does society need religion to regulate behavior?", choices: ["True only", "False only", "True — religion inculcates virtues, solidarity, and purpose", "False — people's actions matter more than religion"], correctIndex: 0 },
              { text: "Who developed the concept of the 'Totem' in relation to religion?", choices: ["Sigmund Freud", "St. Paul", "Émile Durkheim", "René Descartes"], correctIndex: 0 },
              { text: "Without language, humans cannot fully open themselves to the world — this describes humanity as:", choices: ["True", "False", "Partially true", "Partially false"], correctIndex: 0 },
              { text: "Who is associated with 'Faith and reason are like two wings on which the human spirit rises to the contemplation of truth'?", choices: ["St. John Paul II", "St. Thomas Aquinas", "Sigmund Freud", "Jeanne Knoelle"], correctIndex: 0 },
              { text: "The classic 'coffee table' example — an infinite series of makers still requiring a First Maker — illustrates which proof?", choices: ["The Proof from Motion", "The Proof from Degrees of Perfection", "The Proof from Efficient Cause", "The Proof from Necessary vs. Possible Being"], correctIndex: 0 },
              { text: "'Nothing can be both actual and potential in the same respect at the same time,' requiring a First Mover, describes which proof?", choices: ["The Proof from Motion", "The Proof from Degrees of Perfection", "The Proof from Efficient Cause", "The Proof from Necessary vs. Possible Being"], correctIndex: 0 }
            ]
          },
          {
            nodeId: 'sf7_n2', type: 'quiz', title: 'Sin, Symbols, and the Fall',
            prompt: 'Answer each question on the vocabulary of sin and the symbols of the Fall.',
            questions: [
              { text: "The name 'Adam' derives from a Hebrew word meaning:", choices: ["Soil", "Life", "Water", "Partner"], correctIndex: 0 },
              { text: "A complete abandonment of one's profession of faith is called:", choices: ["Sin of Heresy", "Sin of Idolatry", "Sin of Hypocrisy", "Sin of Apostasy", "Sin of Blasphemy"], correctIndex: 0 },
              { text: "Nakedness as a sign of disgrace takes on deeper meaning after the fall in Genesis 3:", choices: ["True", "False", "Partially true", "Partially false"], correctIndex: 0 },
              { text: "A Christian doctrine that selects and rejects parts of the faith, creating distortion, is called:", choices: ["Sin of Heresy", "Sin of Idolatry", "Sin of Hypocrisy", "Sin of Apostasy", "Sin of Blasphemy"], correctIndex: 0 },
              { text: "Breaking faith with God leading to breaking faith with others is shown especially in:", choices: ["The story of creation", "The story of Cain and Abel", "The story of the tower of Babel", "None of the choices"], correctIndex: 0 },
              { text: "Situations or structures that cause or support evil are called:", choices: ["Personal Sin", "Global sin", "Social sin", "None of the choices"], correctIndex: 0 },
              { text: "Evil flowing from human goodness used as an absolute, symbolized by the snake, describes:", choices: ["True", "False", "Partially true", "Partially false"], correctIndex: 0 },
              { text: "Scandal committed against 'You shall not use God's name in vain' is called:", choices: ["Sin of Heresy", "Sin of Idolatry", "Sin of Hypocrisy", "Sin of Apostasy", "Sin of Blasphemy"], correctIndex: 0 },
              { text: "The name 'Eve' derives from a Hebrew word meaning:", choices: ["Soil", "Life", "Water", "Partner"], correctIndex: 0 }
            ]
          },
          {
            nodeId: 'sf7_n3', type: 'quiz', title: 'Voices of Faith and Salvation History',
            prompt: 'Answer each question on the history of salvation and the theologians who shaped its understanding.',
            questions: [
              { text: "The Greek word for salvation, also linked to 'Reign of God,' is:", choices: ["salus", "salve", "Malkuth", "None of the choices"], correctIndex: 0 },
              { text: "The Jewish apocalyptic writers' futuristic understanding of salvation dates to approximately:", choices: ["200 BCE-200 CE", "750-400 BCE", "4 BCE-30 CE", "30-100 CE"], correctIndex: 0 },
              { text: "In ancient times, the snake was used for medicine especially in:", choices: ["Mesopotamia", "Egypt", "Persia", "Israel"], correctIndex: 0 },
              { text: "Early Christian salvation, understood as both present and future, was recorded in the period:", choices: ["200 BCE-200 CE", "750-400 BCE", "4 BCE-30 CE", "30-100 CE"], correctIndex: 0 },
              { text: "Who is the proponent of 'loving learning and desire for God'?", choices: ["St. John Paul II", "St. Thomas Aquinas", "Sigmund Freud", "Jeanne Knoelle"], correctIndex: 0 },
              { text: "Who said, 'Our heart is restless until it rests in you'?", choices: ["St. Augustine", "St. Paul", "St. Thomas Aquinas", "St. John Paul II"], correctIndex: 0 },
              { text: "God's Creation reflects Divine Goodness, and humans should not overstep into that domain:", choices: ["True", "False", "Partially true", "Partially false"], correctIndex: 0 },
              { text: "Who explained why Genesis used the snake for evil and described the two dangers of goodness?", choices: ["St. Paul", "St. John Paul II", "St. Thomas Aquinas", "St. Augustine"], correctIndex: 0 },
              { text: "The word 'Salvation' comes from the Latin word meaning 'sound or safe':", choices: ["salus", "salve", "Malkuth", "None of the choices"], correctIndex: 0 }
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
              { text: "The 'common' (Greek-influenced) understanding of salvation tends to emphasize:", choices: ["Escape of the soul from the body/material world", "Total transformation of the whole person and community", "Only political liberation", "Salvation earned strictly through animal sacrifice"], correctIndex: 0 },
              { text: "The biblical/Hebrew understanding of salvation is best described as:", choices: ["Total and holistic — covering body, community, and history, not just the soul", "Concerned only with the afterlife", "Identical to the Greek philosophical view", "A concept absent from the Old Testament"], correctIndex: 0 },
              { text: "'Total Salvation,' as presented in the module, is best understood as:", choices: ["Both a present reality and a future hope", "Only a future event with no present relevance", "A reward given only after death", "A concept limited to the New Testament"], correctIndex: 0 }
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
              { text: "Abraham's migration to Canaan is significant because it marks:", choices: ["The beginning of God's covenant relationship with a particular people", "The founding of the Roman Empire", "The end of the Exodus", "The construction of the Temple"], correctIndex: 0 },
              { text: "Which of the following best describes Moses' three roles as presented in the module?", choices: ["Guerilla fighter/human rights defender, teacher/conscienticizer, and leader", "Priest, king, and prophet only", "Farmer, merchant, and soldier", "Scribe, judge, and tax collector"], correctIndex: 0 },
              { text: "The Israelites' journey traced in this chapter moves from slavery in Egypt to:", choices: ["The covenant assembly at Sinai", "The building of Solomon's Temple", "The Babylonian exile", "The Roman occupation"], correctIndex: 0 }
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
              { text: "Which of these is one of the Five Great Events of Israelite history discussed in the module?", choices: ["The migration of Abraham to Canaan", "The signing of the Magna Carta", "The founding of Rome", "The Council of Nicaea"], correctIndex: 0 },
              { text: "According to the module, the Israelites came to know God primarily through:", choices: ["Their lived history as a people", "Greek philosophical reasoning alone", "Isolation from all other nations", "A single, one-time miraculous event"], correctIndex: 0 },
              { text: "A biblical prophet's three tasks, as described in the module, are to proclaim the Word, perform the Deed, and:", choices: ["Endure the fate of a martyr (Death)", "Collect taxes for the Temple", "Serve exclusively as a royal advisor", "Write only poetry"], correctIndex: 0 }
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
            nodeId: 'fn3_n4', type: 'task', title: 'Bible Sharing: Five Great Events',
            prompt: 'Form a Bible-sharing group and portray the Five Great Events of the Israelites (skit, retelling, or presentation).',
            ticketReward: 'task_ticket'
          },
          {
            nodeId: 'fn3_n5', type: 'recitation', title: 'Word, Deed, Death',
            prompt: 'Explain the three tasks of a biblical prophet — to proclaim the Word, perform the Deed, and endure the fate of a martyr (Death).',
            ticketReward: 'recitation_ticket'
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
