// ============================================
// THE MUSTARD SEED — content/config. Single source of truth for the
// growth-stage schedule; firestore.rules mirrors the SAME day
// thresholds/order (rules can't import JS, same accepted tradeoff
// already used for ADMIN_EMAILS) — if a stage's minDays ever changes
// here, the matching constants in firestore.rules must change too, or
// the client and the server-enforced gate will disagree.
//
// "Every great tree begins with a seed. Growth takes patience. What
// you nurture today may bear fruit tomorrow." -- the game's own
// opening line, kept here so it's easy to find/edit alongside
// everything else rather than buried in a page's markup.
// ============================================

export const INTRO_TEXT = {
  heading: 'Every great tree begins with a seed.',
  body: 'Growth takes patience. What you nurture today may bear fruit tomorrow.',
  instructions: [
    'Plant your mustard seed.',
    'Return regularly.',
    'Water it.',
    'Apply fertilizer when available.',
    'Complete daily reflections.',
    'Watch it grow week by week.',
    'Eventually, the plant will bear the Forbidden Fruit of Knowledge.'
  ]
};

// order must strictly increase with minDays -- both this file's own
// checkAndAdvanceStage() and firestore.rules' mustardSeedStageOrder()/
// mustardSeedStageDays() depend on that monotonic relationship holding.
export const GROWTH_STAGES = [
  {
    id: 'seed', order: 0, minDays: 0, title: 'Seed', icon: '🌰',
    hint: 'Your seed rests beneath the soil.',
    unlockMessage: 'Your mustard seed has been planted.'
  },
  {
    id: 'sprout', order: 1, minDays: 7, title: 'Sprout', icon: '🌱',
    hint: 'A small green shoot has broken the surface.',
    unlockMessage: 'Something has changed... your seed has sprouted.'
  },
  {
    id: 'youngPlant', order: 2, minDays: 14, title: 'Young Plant', icon: '🌿',
    hint: 'New leaves are unfurling in the light.',
    unlockMessage: 'Something has changed... your plant is growing stronger.'
  },
  {
    id: 'growingPlant', order: 3, minDays: 21, title: 'Growing Plant', icon: '🪴',
    hint: 'The stem has thickened; more leaves have taken shape.',
    unlockMessage: 'Something has changed... your plant reaches higher now.'
  },
  {
    id: 'maturePlant', order: 4, minDays: 28, title: 'Mature Plant', icon: '🌳',
    hint: 'A real tree stands where a seed once lay.',
    unlockMessage: 'Something has changed... your mustard tree has matured.'
  },
  {
    id: 'flowering', order: 5, minDays: 35, title: 'Flowering', icon: '🌸',
    hint: 'Small blossoms have opened along its branches.',
    unlockMessage: 'Something has changed... your tree is flowering.'
  },
  {
    id: 'fruitFormation', order: 6, minDays: 42, title: 'Fruit Formation', icon: '✨',
    hint: 'Something is beginning to form...',
    unlockMessage: 'Your plant is preparing to bear fruit.'
  },
  {
    id: 'forbiddenFruit', order: 7, minDays: 49, title: 'The Forbidden Fruit', icon: '🍎',
    hint: 'The Forbidden Fruit of Knowledge hangs ready, glowing faintly.',
    unlockMessage: 'The Forbidden Fruit of Knowledge has fully formed.'
  }
];

export const STAGE_BY_ID = Object.fromEntries(GROWTH_STAGES.map((s) => [s.id, s]));
export function stageAfter(stageId) {
  const i = GROWTH_STAGES.findIndex((s) => s.id === stageId);
  return i >= 0 && i < GROWTH_STAGES.length - 1 ? GROWTH_STAGES[i + 1] : null;
}

// Deterministic per-date pick (same hash-by-date-string technique
// already used by dailyGreeting.js's messageForDate) so a student
// re-opening the page the same day sees the SAME prompt, not a fresh
// random one each reload -- and every student sees the same prompt on
// a given day, rather than it being per-account-random.
export const REFLECTION_PROMPTS = [
  'What is one thing in your life that needs patient growth?',
  'What small action can you consistently do to become better?',
  'Why does meaningful growth take time?',
  'What responsibilities have been entrusted to you?',
  'How can knowledge be used responsibly?',
  'What does patience teach you?',
  'Who has patiently cared for your own growth?',
  'What does it look like to keep showing up, even on a quiet day?',
  'What have you learned recently that changed how you see something?',
  'When has waiting turned out to matter more than the outcome itself?'
];

export function reflectionPromptForDate(dateStr) {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) hash = (hash * 31 + dateStr.charCodeAt(i)) >>> 0;
  return REFLECTION_PROMPTS[hash % REFLECTION_PROMPTS.length];
}

export const MESSAGES = {
  watered: 'Your seed has received today\'s water.',
  fertilized: 'The soil has been nourished.',
  reflected: 'Your reflection has been recorded.',
  missedCare: 'Your plant is thirsty. Give it some care today.',
  welcomeBack: 'Welcome back. Growth takes patience, and there is always time to begin caring again.',
  todayComplete: 'Your plant has received today\'s care. Come back tomorrow.',
  fertilizeCooldown: (days) => `Fertilizer is available again in ${days}.`,
  completionHeading: 'Your mustard seed has grown.',
  completionBody: 'The fruit has appeared because you cared for what was entrusted to you.'
};

export const FERTILIZE_COOLDOWN_DAYS = 2;
export const WATER_HEALTH_GAIN = 10;
export const FERTILIZE_HEALTH_GAIN = 5;
export const MAX_HEALTH = 100;

export const ACHIEVEMENTS = [
  { id: 'first_plant', title: 'First Plant', sub: 'Planted the mustard seed', icon: '🌰' },
  { id: 'faithful_gardener', title: 'Faithful Gardener', sub: '7-day care streak', icon: '🔥' },
  { id: 'patient_cultivator', title: 'Patient Cultivator', sub: 'Reached a later growth stage', icon: '🌿' },
  { id: 'dedicated_nurturer', title: 'Dedicated Nurturer', sub: 'Maintained consistent care', icon: '💧' },
  { id: 'fruitful', title: 'Fruitful', sub: 'Reached fruit formation', icon: '✨' },
  { id: 'bearer_of_knowledge', title: 'Bearer of Knowledge', sub: 'Claimed the Forbidden Fruit', icon: '🍎' }
];

// Badge id convention (stored in the student's achievements array),
// matching task_/sidequest_/vault_ from the other badge registries.
export function mustardSeedBadgeId(achievementId) { return `mustardseed_${achievementId}`; }

export function resolveMustardSeedBadge(id) {
  if (!id.startsWith('mustardseed_')) return null;
  const achievement = ACHIEVEMENTS.find((a) => a.id === id.replace(/^mustardseed_/, ''));
  if (!achievement) return null;
  return { icon: achievement.icon, title: achievement.title, sub: achievement.sub };
}
