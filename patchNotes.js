// ============================================
// PATCH NOTES — a Dota 2 "Gameplay Update"-style page of what changed
// (Jornie, 2026-10-05). Opens once per version on the dashboard (seen
// versions remembered per device) and any time from the footer's
// "Patch Notes" link.
//
// To publish a new update, add an entry at the TOP of PATCHES; the
// dropdown lists every version, newest first.
//   sections: [{ title, groups: [{ title, items }] }]
//   an item is a string, or [string, [sub-items]] for a nested list.
// ============================================

export const PATCHES = [
  {
    version: '2.2',
    date: 'October 7, 2026',
    sections: [
      {
        title: 'Final Season',
        groups: [
          {
            title: "New Chapter: Nehemiah's Night Ride",
            items: [
              'A sixth game chapter right after "Return and Rebuilding" (now Chapter 15 of 17)',
              ['Ride with Nehemiah around the ruined walls of Jerusalem by night. This is the hardest game in the portal', [
                'The mount never stops, and it runs faster the farther you go',
                'Jump (tap Jump, tap the road, Space or ↑) over rubble, fallen pillars and breaches in the road',
                'Hold Duck (or ↓) to pass under a broken arch. Duck in the air to drop quickly',
                'You see only what the lantern lights, and its oil burns down. Jump to catch jars of oil',
                'You have 3 chances. Passing the Dung Gate or the Fountain Gate gives one back',
                'After the Fountain Gate the way narrows: more arches, wider breaches, less room between them',
                'Ride 1,000 m, back to the Valley Gate'
              ]],
              'Tap "How to Play" anytime for the full guide',
              'No star is earned, and the Final Season still has the same 12 stars',
              'Rewards: +30 of every ticket type and +31 Ember Shards, plus a new Catechism Moment',
              'Three stumbles? Nothing is lost. Try again as many times as you need'
            ]
          }
        ]
      }
    ]
  },
  {
    version: '2.1',
    date: 'October 5, 2026',
    sections: [
      {
        title: 'Semifinal Season',
        groups: [
          {
            title: 'New Chapter: The Shadow of Sin',
            items: [
              'A boss battle now stands between Chapter 6 and the Semifinal Comprehensive Exam',
              ['Defeat the Shadow of Sin to unlock the exam', [
                'Strike: wound the Shadow and charge your Holy Light',
                'Guard: block most of the next blow. Use it when a Dark Surge is coming',
                'Prayer: restore your Faith (twice per battle)',
                'Holy Light: after 3 strikes, a mighty blow that also shatters the Veil of Shadow',
                'The Shadow always shows its next move. Read it and answer wisely'
              ]],
              'Below half health, the Shadow becomes enraged and strikes harder',
              'Tap "How to Play" anytime, even mid-battle, for the full guide',
              'No star is earned for the battle, and Semifinal still has the same 8 stars',
              'Victory rewards: +30 of every ticket type and +31 Ember Shards, plus a new Catechism Moment',
              'Falling in battle costs nothing. Rise again and try as many times as you need'
            ]
          },
          {
            title: 'Comprehensive Exam',
            items: [
              'The Semifinal Comprehensive Exam is now Chapter 8 of 8 and opens after the boss is defeated'
            ]
          }
        ]
      },
      {
        title: 'Final Season',
        groups: [
          {
            title: 'New Chapter: Crossing the Red Sea',
            items: [
              'A new game chapter right after "Out of Egypt" (now Chapter 3 of 16)',
              ['Lead Moses and the Israelites through the sea before Pharaoh\'s chariots catch up', [
                'Move between five lanes with ◀ ▶, the arrow keys, a swipe, or a tap on either side',
                'Rocks make the people stumble, and the chariots gain on you',
                'A flashing lane (!) means a wave is about to crash through. Get out of it!',
                'Seabirds swoop sideways across the path. Watch their shadows and time your moves',
                'The deeper into the sea you go, the more rocks block the way',
                'Rescue the glowing stragglers to rally the people and gain ground',
                'Reach the far shore (1,000 m) and the waters close over the chariots'
              ]],
              'Tap "How to Play" anytime for the full guide',
              'No star is earned, and the Final Season still has the same 12 stars',
              'Rewards: +30 of every ticket type and +31 Ember Shards, plus a new Catechism Moment',
              'Caught by the chariots? Nothing is lost. Try again as many times as you need'
            ]
          },
          {
            title: 'New Chapter: Ascent of Mount Sinai',
            items: [
              'A second game chapter right after "The Covenant at Sinai" (now Chapter 6 of 16)',
              ['Climb the mountain as Moses, through the storm, to receive the tablets of the covenant', [
                'Moses leaps by himself. Hold ◀ ▶, the arrow keys, or a side of the mountain to steer him',
                'Stone ledges are safe. Cracked ledges crumble after one step',
                'Higher up, some ledges drift from side to side',
                'A flashing column (!) means lightning is about to strike there. Get out of it!',
                'Rocks tumble down the slope. Step aside',
                'Manna restores one Strength',
                'You have 4 Strength. A fall, a bolt or a rock costs one. Reach the summit (400 m) before it runs out'
              ]],
              'Tap "How to Play" anytime for the full guide',
              'No star is earned, and the Final Season still has the same 12 stars',
              'Rewards: +30 of every ticket type and +31 Ember Shards, plus a new Catechism Moment',
              'Out of Strength? Nothing is lost. Try again as many times as you need'
            ]
          },
          {
            title: 'New Chapter: David and Goliath',
            items: [
              'A third game chapter right after "A Kingdom United" (now Chapter 9 of 16)',
              ['Face the giant in the Valley of Elah with a sling and five smooth stones', [
                'A marker slides along the bar. Tap Sling! (or Space) while it is inside the gold zone to strike Goliath',
                'Outside the gold zone the stone only rings off his armor, and he strides closer',
                'When Goliath raises his spear and DODGE! appears, tap Dodge (or ↓)',
                'While his shield-bearer holds the shield up, stones are blocked. Wait for it to drop',
                'Every strike drives Goliath back, but the gold zone gets smaller and the marker faster',
                'Land five stones before he reaches you or your 3 Courage run out'
              ]],
              'Tap "How to Play" anytime for the full guide',
              'No star is earned, and the Final Season still has the same 12 stars',
              'Rewards: +30 of every ticket type and +31 Ember Shards, plus a new Catechism Moment',
              'Defeated? Nothing is lost. Try again as many times as you need'
            ]
          },
          {
            title: "New Chapter: Building Solomon's Temple",
            items: [
              'A fourth game chapter right after "David and Goliath" (now Chapter 10 of 16)',
              ["Raise the wall of the First Temple with King Solomon's builders", [
                'A stone swings across on the hoist. Tap Set the Stone (or Space) when it is right above the wall',
                'Whatever hangs over the edge is cut away, so the wall and the next stone become narrower',
                'A perfect stone keeps its full size and widens the wall a little',
                'A stone that misses the wall cracks. You have 3 chances',
                'The higher the wall, the faster the stone swings',
                'From the seventh course, gusts of wind make the stone speed up and slow down',
                'Lay twelve courses to finish the wall'
              ]],
              'Tap "How to Play" anytime for the full guide',
              'No star is earned, and the Final Season still has the same 12 stars',
              'Rewards: +30 of every ticket type and +31 Ember Shards, plus a new Catechism Moment',
              'Three stones cracked? Nothing is lost. Try again as many times as you need'
            ]
          },
          {
            title: 'New Chapter: The Fall of Jerusalem',
            items: [
              'A fifth game chapter right after "A Kingdom Divided and Exiled" (now Chapter 12 of 16)',
              ["Babylon's army is at the walls in 587 BC. Hold the wall long enough for a remnant to escape", [
                'Tap one of the five sections of the wall (or press 1 to 5) to send defenders there',
                'You have only three bands of defenders, and each is busy for a moment after every order',
                'Fire arrows burn fastest, ladders next, battering rams slowest',
                'Later, iron-bound rams (×2) must be answered twice, and the assault comes in waves',
                'An enemy left unanswered breaches the wall. Four breaches and the city falls too soon',
                'Hold the wall for 70 seconds'
              ]],
              'Tap "How to Play" anytime for the full guide',
              'No star is earned, and the Final Season still has the same 12 stars',
              'Rewards: +30 of every ticket type and +31 Ember Shards, plus a new Catechism Moment',
              'The wall fell too soon? Nothing is lost. Try again as many times as you need'
            ]
          }
        ]
      },
      {
        title: 'Interface',
        groups: [
          {
            title: 'Catechism Moments',
            items: [
              'Every Catechism Moment, in the puzzles and in every season, now has the new dark fantasy design',
              'Catechism Moments now stay on screen until you tap Continue, so take your time to read and reflect (they used to close after 3 seconds)',
              'Long Catechism Moments keep the title on top while only the text scrolls, so Continue is always visible'
            ]
          },
          {
            title: 'Season Icons',
            items: [
              ['The Midterm, Semifinal and Final Seasons each have a new rune-stone icon on the dashboard', [
                'An open season glows in its own colour: Midterm cyan, Semifinal magenta, Final gold',
                'A locked season\'s stone sleeps, grey and without its glow',
                'A small badge shows when a season is completed or its reflection is due'
              ]],
              'The Achievements panel and the season certificates use the same rune stones'
            ]
          },
          {
            title: 'Games',
            items: [
              'Both new games fit laptops, small phones and phones held sideways'
            ]
          },
          {
            title: 'Honest Work',
            items: [
              'Text in the portal can no longer be copied, and pasting stays off in every written answer, on phones and computers',
              'A written answer must be typed: text dropped in all at once is removed',
              'Printing a portal page gives a blank sheet'
            ]
          }
        ]
      }
    ]
  },
  {
    version: '2.0',
    date: 'October 5, 2026',
    sections: [
      {
        title: 'General Updates',
        groups: [
          {
            title: 'Season Rewards',
            items: [
              ['Every task in every chapter now gives +10 of every ticket type, on top of its usual ticket', [
                'Midterm task: +13 of its ticket, +10 of every other ticket, +11 Ember Shards',
                'Semifinal and Final task: up to +15 of its ticket, +10 of every other ticket, +11 Ember Shards',
                'The Comprehensive Exam chapters now pay tickets on every task too'
              ]],
              'Finishing a chapter now gives +5 of every ticket type',
              ['Finishing a season now gives Unlock Tokens', [
                'Midterm: 5 (was none)',
                'Semifinal: 11 (was 1)',
                'Final: 26 (was 1)'
              ]],
              'Daily portal visit now gives 11 Ember Shards (was 1)',
              'Finishing the Final Season now grants the Final Gift: 10 of every ticket type'
            ]
          },
          {
            title: 'Ticket Trader',
            items: [
              'Same ticket type for 1 Unlock Token: 12 → 36',
              'Any mixed tickets for 1 Unlock Token: 24 → 72',
              'Ember Shards for 1 Unlock Token: 45 → 135'
            ]
          },
          {
            title: 'Artifacts',
            items: [
              ['Artifact prices increased', [
                'Tier I: 4 → 15 tokens',
                'Tier II: 7 → 25 tokens',
                'Tier III: 9 → 35 tokens',
                'Tier IV: 11 → 50 tokens',
                'Divine Regalia chain: 16 / 27 / 38 / 55 tokens'
              ]],
              'Tier III and IV chain artifacts bought at the old prices have been returned to the forge, with every token refunded plus a bonus'
            ]
          }
        ]
      },
      {
        title: 'Certificates',
        groups: [
          {
            title: 'My Certificates',
            items: [
              'New "My Certificates" on the dashboard: open any certificate you have earned and download it again anytime',
              ['New certificates', [
                'Prelim Season: for solving all three puzzles',
                'The Sanctuarium: for conquering all five Vault Games'
              ]],
              'Each puzzle certificate now shows its own puzzle (all used to say "Puzzle 1")',
              'Certificates now keep the date you earned them'
            ]
          }
        ]
      },
      {
        title: 'Interface',
        groups: [
          {
            title: 'Dashboard',
            items: [
              'Achievements are now grouped by season, Side Quests and Vault Games; tap a group to see its badges',
              'The "A Star Ignites!" popup now shows the tickets earned for the chapter',
              'Star, rank and Champion popups redesigned and now wait for Continue instead of closing by themselves',
              'Each task popup now lists the tickets it earned'
            ]
          }
        ]
      }
    ]
  }
];

const SEEN_KEY = 'seenPatchNotes';

const CSS = `
@keyframes pnFade { from { opacity: 0; } to { opacity: 1; } }
@keyframes pnRise { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
.pn-overlay {
  position: fixed; inset: 0; z-index: 10300;
  display: flex; align-items: flex-start; justify-content: center;
  padding: 24px 16px; box-sizing: border-box; overflow-y: auto;
  background: rgba(0,0,0,.88);
  animation: pnFade .3s ease;
  font-family: 'Segoe UI', system-ui, sans-serif;
}
.pn-page {
  position: relative; width: min(860px, 100%);
  background: #0B0D10; color: #C8CDD3;
  border: 1px solid #23272D; box-shadow: 0 30px 80px rgba(0,0,0,.8);
  animation: pnRise .4s cubic-bezier(.2,.9,.3,1);
}
.pn-head {
  display: flex; align-items: flex-start; justify-content: space-between; gap: 16px;
  padding: 18px 22px 20px;
  background: linear-gradient(180deg, #000 0%, #0B0D10 100%);
  border-bottom: 1px solid #1A1D22;
}
.pn-kicker { margin: 0; font-size: 20px; font-weight: 400; letter-spacing: .5px; color: #E2512A; }
.pn-version { margin: 2px 0 0; font-size: 64px; line-height: 1; font-weight: 300; letter-spacing: 1px; color: #E2512A; text-shadow: 0 0 24px rgba(226,81,42,.25); }
.pn-date { margin: 8px 0 0; font-size: 12px; letter-spacing: 1.5px; text-transform: uppercase; color: #6E7680; }
.pn-tools { display: flex; flex-direction: column; align-items: flex-end; gap: 10px; }
.pn-select,
.pn-select:hover {
  margin: 0; padding: 4px 26px 4px 8px; border-radius: 2px; cursor: pointer;
  font: 13px 'Segoe UI', system-ui, sans-serif; color: #111;
  background: #E8E8E8 url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23333'/%3E%3C/svg%3E") no-repeat right 8px center;
  border: 1px solid #999; -webkit-appearance: none; appearance: none;
}
.pn-close,
.pn-close:hover {
  margin: 0; padding: 7px 16px; border-radius: 2px; cursor: pointer;
  font: 700 12px 'Segoe UI', system-ui, sans-serif; letter-spacing: 1.5px; text-transform: uppercase;
  color: #C8CDD3; background: #1A1D22; border: 1px solid #3A3F46;
}
.pn-close:hover { color: #fff; background: #26292F; border-color: #E2512A; }
.pn-close:focus-visible, .pn-select:focus-visible { outline: 2px solid #E2512A; outline-offset: 2px; }
.pn-body { padding: 18px 16px 26px; }
.pn-section { margin: 0 0 22px; border: 1px solid #2A2E35; background: linear-gradient(180deg, #11151B 0%, #0E1217 100%); }
.pn-banner {
  position: relative; margin: 0; padding: 14px 18px;
  font-family: 'Cinzel', Georgia, serif; font-weight: 700; font-size: 26px; letter-spacing: 1px; text-transform: uppercase; color: #fff;
  background: linear-gradient(90deg, #8E2A0E 0%, #C2501F 22%, #6E200B 48%, #2A0E07 80%, #160806 100%);
  border-bottom: 1px solid #000;
  text-shadow: 0 2px 4px rgba(0,0,0,.8);
}
.pn-banner::after { content: ''; position: absolute; left: 0; right: 0; bottom: 0; height: 2px; background: linear-gradient(90deg, rgba(255,170,100,.6), transparent 70%); }
.pn-group { padding: 12px 18px 6px; background: linear-gradient(180deg, rgba(40,60,80,.25), rgba(20,30,40,.1)); }
.pn-group + .pn-group { border-top: 1px solid #1D232B; }
.pn-group h4 {
  margin: 0 0 8px; padding-bottom: 6px;
  font-family: 'Cinzel', Georgia, serif; font-weight: 700; font-size: 16px; letter-spacing: 1.5px; text-transform: uppercase; color: #E9EDF1;
  border-bottom: 1px solid #2A3240;
}
.pn-group ul { margin: 0 0 8px; padding-left: 22px; }
.pn-group li { margin: 3px 0; font-size: 14px; line-height: 1.5; color: #BFC6CE; }
.pn-group li::marker { color: #8B939C; }
.pn-group ul ul { margin: 2px 0 4px; padding-left: 20px; }
.pn-group ul ul li { font-size: 13.5px; color: #A9B1BA; list-style: square; }
.pn-foot { margin: 0; padding: 0 18px 20px; font-size: 12.5px; color: #6E7680; text-align: center; }
@media (max-width: 560px) {
  .pn-overlay { padding: 0; }
  .pn-page { min-height: 100%; border: none; }
  .pn-head { padding: 14px 14px 16px; }
  .pn-kicker { font-size: 16px; }
  .pn-version { font-size: 48px; }
  .pn-body { padding: 12px 8px 20px; }
  .pn-banner { font-size: 19px; padding: 11px 12px; }
  .pn-group { padding: 10px 12px 4px; }
  .pn-group h4 { font-size: 13.5px; }
  .pn-group li { font-size: 13.5px; }
  .pn-group ul { padding-left: 18px; }
}
@media (prefers-reduced-motion: reduce) { .pn-overlay, .pn-page { animation: none; } }
`;

function injectStyles() {
  if (document.getElementById('patchNotesStyles')) return;
  if (![...document.querySelectorAll('link[href*="fonts.googleapis.com"]')].some((l) => l.href.includes('Cinzel'))) {
    const font = document.createElement('link');
    font.rel = 'stylesheet';
    font.href = 'https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&display=swap';
    document.head.appendChild(font);
  }
  const style = document.createElement('style');
  style.id = 'patchNotesStyles';
  style.textContent = CSS;
  document.head.appendChild(style);
}

const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function itemsHtml(items) {
  return `<ul>${items.map((item) => Array.isArray(item)
    ? `<li>${escapeHtml(item[0])}${itemsHtml(item[1])}</li>`
    : `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
}

function bodyHtml(patch) {
  return patch.sections.map((section) => `
    <section class="pn-section">
      <h3 class="pn-banner">${escapeHtml(section.title)}</h3>
      ${section.groups.map((g) => `
        <div class="pn-group">
          <h4>${escapeHtml(g.title)}</h4>
          ${itemsHtml(g.items)}
        </div>`).join('')}
    </section>`).join('');
}

/** Opens the patch notes (newest version unless one is given). Resolves on close. */
export function showPatchNotes(version = PATCHES[0].version) {
  return new Promise((resolve) => {
    injectStyles();
    document.querySelector('.pn-overlay')?.remove();
    const overlay = document.createElement('div');
    overlay.className = 'pn-overlay';
    overlay.innerHTML = `
      <div class="pn-page" role="dialog" aria-modal="true" aria-labelledby="pnVersion">
        <header class="pn-head">
          <div>
            <p class="pn-kicker">Portal Update</p>
            <h2 class="pn-version" id="pnVersion"></h2>
            <p class="pn-date"></p>
          </div>
          <div class="pn-tools">
            <select class="pn-select" aria-label="Choose an update">
              ${PATCHES.map((p) => `<option value="${escapeHtml(p.version)}">${escapeHtml(p.version)}</option>`).join('')}
            </select>
            <button type="button" class="pn-close">Close ✕</button>
          </div>
        </header>
        <div class="pn-body"></div>
        <p class="pn-foot">HCDC Illumination Portal · Refresh your portal if you don't see these changes yet.</p>
      </div>`;
    const select = overlay.querySelector('.pn-select');
    const render = (v) => {
      const patch = PATCHES.find((p) => p.version === v) || PATCHES[0];
      select.value = patch.version;
      overlay.querySelector('.pn-version').textContent = patch.version;
      overlay.querySelector('.pn-date').textContent = patch.date;
      overlay.querySelector('.pn-body').innerHTML = bodyHtml(patch);
      overlay.scrollTop = 0;
    };
    render(version);
    select.addEventListener('change', () => render(select.value));

    const close = () => {
      overlay.remove();
      document.documentElement.style.overflow = '';
      document.removeEventListener('keydown', onKey);
      resolve();
    };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    overlay.querySelector('.pn-close').addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', onKey);

    document.body.appendChild(overlay);
    document.documentElement.style.overflow = 'hidden';
    overlay.querySelector('.pn-close').focus({ preventScroll: true });
  });
}

// Until this moment the newest notes open on EVERY dashboard visit
// (Jornie: "show it within this week" — through Sunday, Oct 11, PH time);
// after it, once per new version per device. Move it forward for a
// future update that should also be pushed every visit for a while.
const SHOW_EVERY_VISIT_UNTIL = Date.parse('2026-10-11T23:59:59+08:00');

/** Shows the newest patch notes (every visit until SHOW_EVERY_VISIT_UNTIL,
 *  then once per device per version); resolves when closed. */
export async function maybeShowPatchNotes() {
  const latest = PATCHES[0].version;
  let seen = null;
  try { seen = localStorage.getItem(SEEN_KEY); } catch (e) { /* storage blocked */ }
  if (seen === latest && Date.now() > SHOW_EVERY_VISIT_UNTIL) return;
  await showPatchNotes(latest);
  try { localStorage.setItem(SEEN_KEY, latest); } catch (e) { /* storage blocked */ }
}
