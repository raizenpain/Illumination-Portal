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
