// ============================================
// THE LEGENDARY FORGE — how a student's Legendary (Tier 5) Artifact is
// made, designed by Jornie (2026-10-03). Replaces the old silent grant
// in crafting.js: the Legendary is only added to ownedArtifacts when the
// student claims it at the very end.
//
// Stages, read from the student record by forgeState():
//   ritual  -- eligible (all stars, legendaryEligible, all 4 chain
//              artifacts owned) but not started. Full-screen, no close:
//              7 strikes on the anvil. After strikes 2, 4, 5 and 7 the
//              Tier I, II, III and IV artifacts of their chain rise and
//              sink into the fire; after the 7th, all four rise again,
//              circle, spiral in and fuse. Then legendaryForgeStartedAt
//              (+ legendaryForgeChain) is saved.
//   forging -- for FORGE_DAYS (5) after that: the whole portal shows only
//              the forge at work (the four artifacts orbiting and melting
//              into the molten core) with a countdown. Unskippable, no
//              close; Sign Out only, which doesn't pause it.
//   reveal  -- once the days are up: "The <Legendary> Is Forged" ->
//              Claim, which adds it to ownedArtifacts and sets
//              legendaryForgeSeen.
//
// Runs on every student page through legendaryCountdown.js (which
// already loads the student record, so no extra read) and on the
// dashboard after the "Pilgrimage Complete" screen (journeyFinale.js).
// While that pilgrimage screen is still due, the forge waits for it.
//
// Previews (no Firestore writes) on any student page:
//   ?previewForge=1      the 7-strike ritual, then a 20-second forge
//   ?previewForging=1    the 5-day forging screen
//   ?previewForgeDone=1  the reveal
// ============================================

import { db, doc, runTransaction, arrayUnion } from './firebase.js';
import { ARTIFACTS, CRAFTING_CHAINS, chainForTier5, artifactIconPath } from './artifacts.js';
import { getRankProgress } from './rank.js';
import { logActivity } from './activity.js';
import { drawLegendaryCard, saveCanvas, legendaryCardFilename, forgedDateFor, legendaryArtPath } from './legendaryCard.js';

export const FORGE_DAYS = 5;
const FORGE_MS = FORGE_DAYS * 24 * 60 * 60 * 1000;
const STRIKES = 7;
const OFFER_AFTER = { 2: 0, 4: 1, 5: 2, 7: 3 }; // strike number -> chain index (Tier I..IV)
const FORGE_IMAGE = 'assets/legendary-forge.webp';
const TIER_NAMES = ['Tier I', 'Tier II', 'Tier III', 'Tier IV'];

const ARTIFACT_NAMES = Object.fromEntries(Object.values(ARTIFACTS).flat().map((a) => [a.id, a.name]));
const artifactName = (id) => ARTIFACT_NAMES[id] || id;

// ---------- state ----------

/** Which forge stage this student is in. Exported for testing. */
export function forgeState(data, now = Date.now()) {
  if (!data) return { kind: 'none' };
  const chosen = data.legendaryForgeChain || data.chosenLegendaryChain;
  const chain = chosen ? chainForTier5(chosen) : null;
  if (!chain) return { kind: 'none' };
  if (data.legendaryForgeSeen) return { kind: 'done', chain };

  const owned = data.ownedArtifacts || [];
  // Granted by the old silent auto-unlock before this existed: just
  // celebrate it, nothing left to forge.
  if (owned.includes(chain.tier5Id)) return { kind: 'reveal', chain, alreadyOwned: true };

  if (data.legendaryForgeStartedAt) {
    const endAt = Date.parse(data.legendaryForgeStartedAt) + FORGE_MS;
    if (Number.isFinite(endAt) && now < endAt) return { kind: 'forging', chain, endAt };
    return { kind: 'reveal', chain };
  }

  const chainOwned = chain.chain.every((id) => owned.includes(id));
  if (chainOwned && getRankProgress(data).legendaryEligible) return { kind: 'ritual', chain };
  return { kind: 'none' };
}

// ---------- styles ----------

const CSS = `
@keyframes lfFadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes lfRise { from { opacity: 0; transform: translateY(18px) scale(.96); } to { opacity: 1; transform: none; } }
@keyframes lfEmber { 0% { transform: translate(0,0) scale(1); opacity: 0; } 10% { opacity: 1; } 100% { transform: translate(var(--drift), -110vh) scale(.4); opacity: 0; } }
@keyframes lfShine { 0%, 60% { background-position: -150% 0; } 100% { background-position: 250% 0; } }
@keyframes lfFlame { 0%, 100% { opacity: .5; transform: scaleY(1); } 50% { opacity: .95; transform: scaleY(1.08); } }
@keyframes lfShake { 0%, 100% { transform: translate(0,0); } 20% { transform: translate(-6px,3px); } 40% { transform: translate(6px,-3px); } 60% { transform: translate(-4px,-2px); } 80% { transform: translate(3px,2px); } }
@keyframes lfStrike { 0% { opacity: 0; } 12% { opacity: 1; } 100% { opacity: 0; } }
@keyframes lfSpark { 0% { opacity: 1; transform: translate(0,0) scale(1); } 100% { opacity: 0; transform: translate(var(--dx), var(--dy)) scale(.3); } }
@keyframes lfPulse { 0%, 100% { box-shadow: 0 0 0 1px #000, 0 8px 24px rgba(255,150,50,.25); } 50% { box-shadow: 0 0 0 1px #000, 0 8px 34px rgba(255,150,50,.55); } }
/* An artifact rises above the anvil, hangs, then sinks into the fire. */
@keyframes lfOffer {
  0% { opacity: 0; transform: translate(-50%, 30px) scale(.4); filter: brightness(3) blur(4px); }
  22% { opacity: 1; transform: translate(-50%, -18px) scale(1); filter: brightness(1.3) drop-shadow(0 0 18px rgba(255,190,80,.9)); }
  60% { opacity: 1; transform: translate(-50%, -24px) scale(1); filter: brightness(1.3) drop-shadow(0 0 18px rgba(255,190,80,.9)); }
  100% { opacity: 0; transform: translate(-50%, 70px) scale(.25); filter: brightness(4) blur(3px); }
}
@keyframes lfFlare { 0% { opacity: 0; transform: translate(-50%, -50%) scale(.3); } 30% { opacity: 1; } 100% { opacity: 0; transform: translate(-50%, -50%) scale(2.4); } }
/* The four fly out to their places on a ring, then spiral in and fuse. */
@keyframes lfFuseSpin { from { transform: rotate(0deg); } to { transform: rotate(720deg); } }
@keyframes lfFuseIn { 0% { --r: 66px; } 100% { --r: 0px; } }
@keyframes lfShock { 0% { opacity: .95; transform: translate(-50%, -50%) scale(.1); } 100% { opacity: 0; transform: translate(-50%, -50%) scale(4); } }
@keyframes lfWhite { 0% { opacity: 0; } 25% { opacity: 1; } 100% { opacity: 0; } }
@keyframes lfOrbit { to { transform: rotate(360deg); } }
@keyframes lfCounter { to { transform: rotate(-360deg); } }
@keyframes lfBreathe { 0%, 100% { transform: translateY(calc(-1 * var(--r))); } 50% { transform: translateY(calc(-.62 * var(--r))); } }
@keyframes lfCore { 0%, 100% { transform: translate(-50%, -50%) scale(.85); opacity: .85; } 50% { transform: translate(-50%, -50%) scale(1.12); opacity: 1; } }
@keyframes lfMelt { 0%, 100% { filter: brightness(1.1) saturate(1); } 50% { filter: brightness(1.6) saturate(1.3) drop-shadow(0 0 12px rgba(255,150,40,.9)); } }
@keyframes lfArtifactRise { 0% { opacity: 0; transform: translateY(40px) scale(.6); filter: brightness(3) blur(6px); } 60% { opacity: 1; filter: brightness(1.8) blur(0); } 100% { opacity: 1; transform: none; filter: brightness(1.1) drop-shadow(0 0 22px rgba(255,190,80,.7)); } }
@keyframes lfPop { 0% { opacity: 0; transform: scale(.7); } 70% { opacity: 1; transform: scale(1.06); } 100% { transform: scale(1); } }
@keyframes lfRays { to { transform: rotate(360deg); } }
@keyframes lfRunePulse { 0%, 100% { box-shadow: inset 0 0 12px rgba(0,0,0,.8), 0 0 0 rgba(255,120,40,0); } 50% { box-shadow: inset 0 0 12px rgba(0,0,0,.8), 0 0 14px rgba(255,120,40,.35); } }
@property --r { syntax: '<length>'; inherits: true; initial-value: 66px; }

.lf-overlay {
  position: fixed; inset: 0; z-index: 20500;
  display: flex; align-items: center; justify-content: center;
  padding: 16px; box-sizing: border-box; overflow: hidden;
  background: radial-gradient(ellipse at 50% 110%, rgba(160,50,10,.5), transparent 55%), radial-gradient(ellipse at center, #140d0a 0%, #000 85%);
  animation: lfFadeIn .45s ease;
  font-family: 'Segoe UI', system-ui, sans-serif;
}
.lf-embers { position: absolute; inset: 0; pointer-events: none; }
.lf-embers span { position: absolute; bottom: -10px; left: var(--x); width: var(--s); height: var(--s); border-radius: 50%; background: radial-gradient(circle, #FFD08A 0%, #FF7A1A 45%, rgba(255,80,0,0) 70%); animation: lfEmber var(--d) linear var(--delay) infinite; opacity: 0; }
.lf-white { position: absolute; inset: 0; z-index: 5; pointer-events: none; opacity: 0; background: radial-gradient(circle at center, #fff 0%, rgba(255,240,200,.95) 40%, rgba(255,200,90,.6) 75%); }
.lf-overlay.fusing .lf-white { animation: lfWhite 1.6s ease-out 2.6s forwards; }

.lf-card {
  position: relative; width: min(600px, 100%);
  max-height: calc(100vh - 32px); max-height: calc(100dvh - 32px);
  display: flex; flex-direction: column; overflow: hidden; box-sizing: border-box;
  color: #E8DCC4; text-align: center;
  background: radial-gradient(ellipse at 50% 0%, rgba(201,146,58,.18), transparent 60%), radial-gradient(circle at 20% 85%, rgba(90,20,10,.25), transparent 50%), linear-gradient(170deg, #1B1512 0%, #0E0A09 55%, #070505 100%);
  border: 1px solid #6B4E1F; border-radius: 6px;
  box-shadow: inset 0 0 0 4px #0E0A09, inset 0 0 0 5px rgba(201,146,58,.55), inset 0 0 60px rgba(0,0,0,.7), 0 0 0 1px #000, 0 30px 80px rgba(0,0,0,.85), 0 0 90px rgba(255,120,30,.18);
  animation: lfRise .55s cubic-bezier(.2,.9,.3,1.1);
}
.lf-corner { position: absolute; width: 46px; height: 46px; pointer-events: none; z-index: 4; }
.lf-corner svg { display: block; width: 100%; height: 100%; }
.lf-corner.tl { top: 2px; left: 2px; } .lf-corner.tr { top: 2px; right: 2px; transform: scaleX(-1); }
.lf-corner.bl { bottom: 2px; left: 2px; transform: scaleY(-1); } .lf-corner.br { bottom: 2px; right: 2px; transform: scale(-1,-1); }
.lf-scroll { flex: 1 1 auto; min-height: 0; overflow-y: auto; overflow-x: hidden; margin: 6px 6px 0; padding: 0 0 14px; scrollbar-width: thin; scrollbar-color: #6B4E1F transparent; }
.lf-scroll::-webkit-scrollbar { width: 8px; }
.lf-scroll::-webkit-scrollbar-thumb { background: #6B4E1F; border-radius: 4px; }
.lf-pad { padding: 0 24px; }
.lf-foot { position: relative; flex-shrink: 0; padding: 4px 26px 22px; }
.lf-foot::before { content: ''; position: absolute; left: 6px; right: 6px; top: -18px; height: 18px; pointer-events: none; background: linear-gradient(180deg, rgba(9,6,5,0), rgba(9,6,5,.95)); }

/* ---- the forge stage (image + everything that happens over it) ---- */
.lf-stage { position: relative; height: 250px; overflow: hidden; border-radius: 2px 2px 0 0; }
.lf-stage > img.lf-art { display: block; width: 100%; height: 100%; object-fit: cover; object-position: 50% 30%; -webkit-mask-image: linear-gradient(180deg, #000 62%, transparent 100%); mask-image: linear-gradient(180deg, #000 62%, transparent 100%); transition: filter .8s ease; }
.lf-stage::after { content: ''; position: absolute; left: 28%; right: 28%; top: 0; height: 52%; pointer-events: none; background: radial-gradient(ellipse at 50% 100%, rgba(255,150,40,.6), transparent 70%); transform-origin: 50% 100%; animation: lfFlame 1.5s ease-in-out infinite; mix-blend-mode: screen; }
.lf-stage.shake { animation: lfShake .35s ease; }
.lf-flash { position: absolute; inset: 0; pointer-events: none; opacity: 0; background: radial-gradient(circle at 50% 36%, rgba(255,247,214,.95), rgba(255,180,60,.45) 35%, transparent 65%); }
.lf-stage.struck .lf-flash { animation: lfStrike .5s ease-out; }
.lf-sparks { position: absolute; left: 50%; top: 34%; width: 0; height: 0; pointer-events: none; z-index: 3; }
.lf-sparks span { position: absolute; width: 4px; height: 4px; border-radius: 50%; background: #FFE29A; box-shadow: 0 0 6px 2px rgba(255,170,60,.9); animation: lfSpark .7s ease-out forwards; }
.lf-offer { position: absolute; left: 50%; top: 18%; width: 112px; height: auto; aspect-ratio: 546 / 424; object-fit: cover; border-radius: 6px; border: 2px solid #FFE7A8; opacity: 0; z-index: 2; animation: lfOffer 2.1s cubic-bezier(.4,.1,.3,1) forwards; }
.lf-flare { position: absolute; left: 50%; top: 50%; width: 120px; height: 120px; border-radius: 50%; pointer-events: none; opacity: 0; z-index: 2; background: radial-gradient(circle, rgba(255,240,190,.95), rgba(255,140,30,.5) 40%, transparent 70%); }
.lf-flare.go { animation: lfFlare .9s ease-out forwards; }

/* Fusion: four relics on a ring that spins and tightens to the centre. */
.lf-fuse { position: absolute; left: 50%; top: 50%; width: 0; height: 0; z-index: 3; --r: 66px; }
.lf-fuse.go { animation: lfFuseSpin 3s cubic-bezier(.5,0,.6,1) forwards, lfFuseIn 3s cubic-bezier(.6,0,.9,.6) forwards; }
.lf-fuse img { position: absolute; left: 0; top: 0; width: 56px; height: auto; aspect-ratio: 546 / 424; object-fit: cover; border-radius: 4px; border: 1px solid #FFE7A8; box-shadow: 0 0 16px rgba(255,180,60,.8); transform: translate(-50%, -50%) rotate(var(--a)) translateY(calc(-1 * var(--r))) rotate(calc(-1 * var(--a))); }
.lf-shock { position: absolute; left: 50%; top: 50%; width: 80px; height: 80px; border-radius: 50%; border: 3px solid rgba(255,230,160,.95); box-shadow: 0 0 30px rgba(255,200,90,.9); opacity: 0; pointer-events: none; z-index: 4; }
.lf-overlay.fusing .lf-shock { animation: lfShock 1.1s ease-out 2.8s forwards; }

/* Forging: the four orbit the molten core, breathing in and out. */
.lf-stage.forging > img.lf-art { filter: brightness(.45) saturate(.8); }
.lf-crucible { position: absolute; left: 50%; top: 50%; width: 0; height: 0; z-index: 2; --r: 64px; }
.lf-core { position: absolute; left: 0; top: 0; width: 80px; height: 80px; border-radius: 50%; background: radial-gradient(circle, #fff6d6 0%, #ffcf5a 30%, #ff7a1a 60%, rgba(255,80,0,0) 72%); filter: blur(1px); animation: lfCore 2.2s ease-in-out infinite; }
.lf-ring { position: absolute; left: 0; top: 0; width: 0; height: 0; animation: lfOrbit 9s linear infinite; }
.lf-orb { position: absolute; left: 0; top: 0; width: 0; height: 0; transform: rotate(var(--a)); }
.lf-orb > div { position: absolute; left: 0; top: 0; animation: lfBreathe 3.2s ease-in-out infinite; animation-delay: var(--bd); }
.lf-orb img { position: absolute; left: 0; top: 0; display: block; width: 52px; height: auto; aspect-ratio: 546 / 424; object-fit: cover; border-radius: 4px; border: 1px solid #FFE7A8; transform: translate(-50%, -50%) rotate(calc(-1 * var(--a))); animation: lfMelt 2.4s ease-in-out infinite; animation-delay: var(--bd); }
/* Zero-size wrappers so every rotation pivots on the orbit point itself:
   ring spins, span counter-spins, img undoes its slot angle -> upright. */
.lf-ring .lf-orb > div > span { position: absolute; left: 0; top: 0; width: 0; height: 0; animation: lfCounter 9s linear infinite; }

/* Reveal */
.lf-stage.forged > img.lf-art { filter: brightness(.35) saturate(.7); }
.lf-relic { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; z-index: 2; }
.lf-relic::before { content: ''; position: absolute; inset: 0; background: repeating-conic-gradient(from 0deg at 50% 50%, rgba(255,210,110,.2) 0deg 7deg, transparent 7deg 18deg); -webkit-mask-image: radial-gradient(ellipse closest-side, #000 30%, transparent 100%); mask-image: radial-gradient(ellipse closest-side, #000 30%, transparent 100%); animation: lfRays 40s linear infinite; }
.lf-relic img { position: relative; width: 190px; height: auto; aspect-ratio: 546 / 424; object-fit: cover; border-radius: 8px; border: 2px solid #FFE7A8; box-shadow: 0 0 0 1px #000, 0 0 30px rgba(255,190,80,.6), 0 10px 26px rgba(0,0,0,.7); animation: lfArtifactRise 1.4s cubic-bezier(.2,.9,.3,1) forwards; }

/* ---- text ---- */
.lf-kicker { margin: 16px 0 8px; font-family: 'Cinzel', Georgia, serif; font-weight: 700; font-size: 11.5px; letter-spacing: 3px; text-transform: uppercase; color: #C9923A; }
.lf-heading { margin: 0; font-family: 'Cinzel', Georgia, serif; font-weight: 700; font-size: 26px; line-height: 1.2; text-wrap: balance; background: linear-gradient(100deg, #E9B85A 0%, #FFF6D8 45%, #E9B85A 55%, #9C6A22 100%); background-size: 250% 100%; -webkit-background-clip: text; background-clip: text; color: transparent; filter: drop-shadow(0 2px 0 rgba(0,0,0,.8)) drop-shadow(0 0 14px rgba(233,184,90,.25)); animation: lfShine 6s ease-in-out infinite; }
.lf-divider { display: flex; align-items: center; gap: 10px; margin: 12px 0; }
.lf-divider::before, .lf-divider::after { content: ''; flex: 1; height: 1px; background: linear-gradient(90deg, transparent, #C9923A 40%, #C9923A 60%, transparent); }
.lf-divider i { width: 8px; height: 8px; transform: rotate(45deg); background: #E9B85A; box-shadow: 0 0 8px rgba(233,184,90,.7); }
.lf-text { margin: 0 0 14px; font-size: 14.5px; line-height: 1.6; color: #D6C8AE; min-height: 46px; }
.lf-text strong { color: #FFE2A8; }

/* Strike counter + the four chain sockets */
.lf-pips { display: flex; justify-content: center; gap: 8px; margin: 0 0 14px; }
.lf-pips i { width: 11px; height: 11px; transform: rotate(45deg); border: 1px solid #C9923A; transition: background .2s, box-shadow .2s; }
.lf-pips i.on { background: #FFD45A; box-shadow: 0 0 10px rgba(255,200,90,.8); }
.lf-sockets { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; margin: 0 0 4px; }
.lf-socket { position: relative; min-width: 0; padding: 6px 4px 7px; border-radius: 4px; background: linear-gradient(180deg, #2A221D 0%, #15100D 100%); border: 1px solid #4A3820; box-shadow: inset 0 0 12px rgba(0,0,0,.8); }
.lf-socket img { display: block; width: 100%; height: auto; aspect-ratio: 546 / 424; object-fit: cover; border-radius: 3px; filter: grayscale(1) brightness(.35); transition: filter .6s ease; }
.lf-socket b { display: block; margin-top: 5px; font-family: 'Cinzel', Georgia, serif; font-size: 9.5px; letter-spacing: 1px; color: #A89272; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.lf-socket.lit { border-color: #FFE7A8; box-shadow: 0 0 14px rgba(255,190,80,.45), inset 0 0 12px rgba(0,0,0,.5); animation: lfRunePulse 2.4s ease-in-out infinite; }
.lf-socket.lit img { filter: brightness(1.15) saturate(1.1); }
.lf-socket.lit b { color: #FFE2A8; }

/* Countdown tablets (forging) */
.lf-label { margin: 0 0 8px; font-family: 'Cinzel', Georgia, serif; font-weight: 700; font-size: 11.5px; letter-spacing: 2px; text-transform: uppercase; color: #D98A4A; }
.lf-timer { display: flex; gap: 7px; justify-content: center; margin: 0 0 12px; }
.lf-unit { flex: 1 1 0; max-width: 92px; padding: 9px 4px 7px; border-radius: 4px; background: linear-gradient(180deg, #2A221D 0%, #15100D 100%); border: 1px solid #4A3820; box-shadow: inset 0 0 12px rgba(0,0,0,.8); animation: lfRunePulse 3s ease-in-out infinite; }
.lf-unit span { display: block; font-family: 'Cinzel', Georgia, serif; font-size: 28px; font-weight: 700; line-height: 1; color: #FFD9A0; text-shadow: 0 0 10px rgba(255,130,40,.6), 0 2px 0 #000; font-variant-numeric: tabular-nums; }
.lf-unit label { display: block; margin-top: 6px; font-family: 'Cinzel', Georgia, serif; font-size: 9.5px; letter-spacing: 1.5px; text-transform: uppercase; color: #A89272; }
.lf-note { margin: 0 0 4px; font-size: 12.5px; font-style: italic; color: #A89272; }
.lf-tier { display: inline-block; margin: 0 0 10px; padding: 3px 12px; border-radius: 999px; font-family: 'Cinzel', Georgia, serif; font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #2A1A05; background: linear-gradient(180deg, #FDE68A, #E9B85A); box-shadow: 0 0 14px rgba(255,200,90,.5); }
.lf-relic img.lf-relic-art { width: 200px; aspect-ratio: 1 / 1; }
.lf-reveal { animation: lfPop .6s cubic-bezier(.2,1.4,.4,1); }
.lf-cardview { display: flex; align-items: center; justify-content: center; min-height: 120px; margin: 4px 0 14px; }
.lf-cardview img { display: block; width: auto; max-width: 100%; max-height: min(56vh, 520px); height: auto; border-radius: 12px; box-shadow: 0 0 0 1px #000, 0 0 40px rgba(255,170,60,.35), 0 14px 34px rgba(0,0,0,.8); animation: lfCardIn 1.1s cubic-bezier(.2,.9,.3,1); }
/* Starts visible (no opacity 0), so a slow phone can never leave it blank. */
@keyframes lfCardIn { 0% { transform: translateY(24px) scale(.92); filter: brightness(2.2); } 100% { transform: none; filter: none; } }
.lf-foot-row { display: grid; grid-template-columns: 2fr 1fr; gap: 10px; }

/* Buttons: restate everything on :hover too (style.css's global
   button / button:hover rules would otherwise win). */
.lf-btn, .lf-btn:hover {
  display: block; width: 100%; margin: 0; cursor: pointer;
  font-family: 'Cinzel', Georgia, serif; font-weight: 700; font-size: 15px; letter-spacing: 1.5px; text-transform: uppercase;
  color: #2A1A05; padding: 14px 16px; border-radius: 4px; border: 1px solid #FFE7A8;
  background: linear-gradient(180deg, #F6D98A 0%, #D9A441 50%, #A8731F 100%);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.5), inset 0 -2px 0 rgba(0,0,0,.25), 0 0 0 1px #000, 0 8px 24px rgba(255,150,50,.25);
  text-shadow: 0 1px 0 rgba(255,240,200,.6);
}
.lf-btn:hover { filter: brightness(1.1); }
.lf-btn.pulse { animation: lfPulse 1.8s ease-in-out infinite; }
.lf-btn:disabled, .lf-btn:disabled:hover { opacity: .55; cursor: default; animation: none; filter: none; }
.lf-btn.ghost, .lf-btn.ghost:hover { color: #D6C8AE; text-shadow: none; font-size: 13px; letter-spacing: 2px; background: rgba(255,255,255,.04); border-color: #4A3820; box-shadow: none; }
.lf-btn.ghost:hover { color: #FFE2A8; background: rgba(233,184,90,.08); border-color: #8A6626; filter: none; }
.lf-btn:focus-visible { outline: 2px solid #FFE7A8; outline-offset: 3px; }

@media (max-height: 760px), (max-width: 480px) {
  .lf-stage { height: 200px; }
  .lf-heading { font-size: 22px; }
  .lf-kicker { margin-top: 12px; }
  .lf-text { font-size: 13.5px; line-height: 1.5; margin-bottom: 10px; }
  .lf-pips { margin-bottom: 10px; }
  .lf-unit span { font-size: 24px; }
  .lf-relic img { width: 150px; }
  .lf-relic img.lf-relic-art { width: 160px; }
  .lf-cardview img { max-height: 50vh; }
  .lf-foot { padding: 4px 26px 18px; }
  .lf-btn, .lf-btn:hover { padding: 12px 14px; font-size: 14px; }
}
@media (max-width: 480px) {
  .lf-pad { padding: 0 12px; }
  .lf-foot { padding: 4px 16px 16px; }
  .lf-corner { width: 34px; height: 34px; }
  .lf-stage { height: 180px; }
  .lf-heading { font-size: 20px; }
  .lf-kicker { font-size: 10.5px; letter-spacing: 2px; }
  .lf-offer { width: 90px; }
  .lf-fuse img, .lf-orb img { width: 44px; }
  .lf-crucible { --r: 54px; }
  .lf-fuse { --r: 56px; }
  .lf-sockets { gap: 5px; }
  .lf-socket b { font-size: 8.5px; letter-spacing: 0; }
  .lf-unit span { font-size: 20px; }
  .lf-unit label { font-size: 8.5px; letter-spacing: .5px; }
  .lf-foot-row { grid-template-columns: 1fr; gap: 8px; }
  .lf-cardview img { max-height: 48vh; }
}
@media (prefers-reduced-motion: reduce) {
  .lf-overlay, .lf-card, .lf-heading, .lf-stage::after, .lf-ring, .lf-ring span, .lf-orb > div, .lf-orb img, .lf-core, .lf-relic::before, .lf-btn.pulse, .lf-unit, .lf-socket.lit { animation: none; }
  .lf-embers { display: none; }
}
`;

function injectStyles() {
  if (document.getElementById('legendaryForgeStyles')) return;
  if (![...document.querySelectorAll('link[href*="fonts.googleapis.com"]')].some((l) => l.href.includes('Cinzel'))) {
    const font = document.createElement('link');
    font.rel = 'stylesheet';
    font.href = 'https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&display=swap';
    document.head.appendChild(font);
  }
  const style = document.createElement('style');
  style.id = 'legendaryForgeStyles';
  style.textContent = CSS;
  document.head.appendChild(style);
}

const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = (n, len = 2) => String(n).padStart(len, '0');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const CORNER_SVG = `<svg viewBox="0 0 46 46" fill="none" aria-hidden="true"><path d="M2 30 V8 Q2 2 8 2 H30" stroke="#C9923A" stroke-width="1.6"/><path d="M7 22 V11 Q7 7 11 7 H22" stroke="#E9B85A" stroke-width="1" opacity=".7"/><path d="M2 8 Q14 10 16 16 Q10 14 8 2" fill="#C9923A" opacity=".85"/><circle cx="16" cy="16" r="2.4" fill="#FFD9A0"/></svg>`;
const cornersHtml = () => ['tl', 'tr', 'bl', 'br'].map((c) => `<span class="lf-corner ${c}">${CORNER_SVG}</span>`).join('');
function embersHtml() {
  let out = '';
  for (let i = 0; i < 26; i++) out += `<span style="--x:${Math.random() * 100}%;--s:${3 + Math.random() * 5}px;--d:${7 + Math.random() * 7}s;--delay:${-Math.random() * 12}s;--drift:${(Math.random() - 0.5) * 120}px"></span>`;
  return out;
}

// One overlay for the whole forge; each stage re-fills its card.
function getOverlay() {
  injectStyles();
  let overlay = document.querySelector('.lf-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'lf-overlay';
    overlay.innerHTML = `<div class="lf-embers">${embersHtml()}</div><div class="lf-card" role="dialog" aria-modal="true" aria-labelledby="lfHeading"></div><div class="lf-white" aria-hidden="true"></div>`;
    document.body.appendChild(overlay);
    document.documentElement.style.overflow = 'hidden';
  }
  return overlay;
}
function closeOverlay() {
  document.querySelector('.lf-overlay')?.remove();
  document.documentElement.style.overflow = '';
}

function stageHtml(inner, extraClass = '') {
  return `<div class="lf-stage ${extraClass}"><img class="lf-art" src="${FORGE_IMAGE}" alt=""><div class="lf-flash"></div><div class="lf-sparks"></div>${inner}</div>`;
}

function burstSparks(stage) {
  const wrap = stage.querySelector('.lf-sparks');
  for (let i = 0; i < 20; i++) {
    const sp = document.createElement('span');
    const angle = Math.random() * Math.PI * 2;
    const dist = 40 + Math.random() * 100;
    sp.style.setProperty('--dx', `${Math.cos(angle) * dist}px`);
    sp.style.setProperty('--dy', `${Math.sin(angle) * dist - 30}px`);
    wrap.appendChild(sp);
    setTimeout(() => sp.remove(), 750);
  }
}

// ---------- stage 1: the 7-strike ritual ----------

/** Resolves once all 7 strikes and the fusion are done. */
function showRitual(chain) {
  return new Promise((resolve) => {
    const overlay = getOverlay();
    const card = overlay.querySelector('.lf-card');
    const name = chain.tier5Name;
    card.innerHTML = `
      ${cornersHtml()}
      <div class="lf-scroll">
        ${stageHtml('<div class="lf-flare"></div><div class="lf-fuse"></div><div class="lf-shock"></div>')}
        <div class="lf-pad">
          <p class="lf-kicker">✦ The Legendary Forge ✦</p>
          <h2 class="lf-heading" id="lfHeading">Forge the ${escapeHtml(name)}</h2>
          <div class="lf-divider"><i></i></div>
          <p class="lf-text" role="status">Your four chain artifacts must be given to the fire, one by one. <strong>Strike the anvil seven times.</strong></p>
          <div class="lf-pips" aria-hidden="true">${'<i></i>'.repeat(STRIKES)}</div>
          <div class="lf-sockets">
            ${chain.chain.map((id, i) => `<div class="lf-socket" data-i="${i}"><img src="${artifactIconPath(id)}" alt=""><b>${TIER_NAMES[i]} · ${escapeHtml(artifactName(id))}</b></div>`).join('')}
          </div>
        </div>
      </div>
      <div class="lf-foot"><button type="button" class="lf-btn pulse" id="lfStrike">⚒️ Strike the Anvil</button></div>`;

    const stage = card.querySelector('.lf-stage');
    const text = card.querySelector('.lf-text');
    const pips = [...card.querySelectorAll('.lf-pips i')];
    const btn = card.querySelector('#lfStrike');
    let strikes = 0;
    let busy = false;

    const offer = async (index) => {
      const id = chain.chain[index];
      const img = document.createElement('img');
      img.className = 'lf-offer';
      img.src = artifactIconPath(id);
      img.alt = '';
      stage.appendChild(img);
      text.innerHTML = `The <strong>${escapeHtml(artifactName(id))}</strong> rises from your collection… and is given to the fire.`;
      await wait(1300);
      const flare = stage.querySelector('.lf-flare');
      flare.classList.remove('go'); void flare.offsetWidth; flare.classList.add('go');
      card.querySelector(`.lf-socket[data-i="${index}"]`).classList.add('lit');
      await wait(800);
      img.remove();
    };

    const fuse = async () => {
      text.innerHTML = 'The fire takes all four. <strong>The relics are becoming one…</strong>';
      const ring = stage.querySelector('.lf-fuse');
      ring.innerHTML = chain.chain.map((id, i) => `<img src="${artifactIconPath(id)}" alt="" style="--a:${i * 90}deg">`).join('');
      overlay.classList.add('fusing');
      void ring.offsetWidth;
      ring.classList.add('go');
      await wait(4300);
    };

    btn.addEventListener('click', async () => {
      if (busy || strikes >= STRIKES) return;
      busy = true;
      btn.disabled = true;
      strikes += 1;
      pips[strikes - 1].classList.add('on');
      stage.classList.remove('struck', 'shake'); void stage.offsetWidth; stage.classList.add('struck', 'shake');
      burstSparks(stage);

      if (strikes in OFFER_AFTER) await offer(OFFER_AFTER[strikes]);
      else {
        text.innerHTML = `<strong>Clang!</strong> The anvil rings. ${STRIKES - strikes === 1 ? '1 strike remains' : `${STRIKES - strikes} strikes remain`}.`;
        await wait(450);
      }

      if (strikes === STRIKES) {
        btn.textContent = 'The forge roars…';
        await fuse();
        resolve();
        return;
      }
      btn.textContent = `⚒️ Strike Again (${STRIKES - strikes} left)`;
      btn.disabled = false;
      busy = false;
      btn.focus();
    });
  });
}

// ---------- stage 2: forging (blocks the portal) ----------

function showForging(chain, endAt, { onDone } = {}) {
  const overlay = getOverlay();
  overlay.classList.remove('fusing');
  const card = overlay.querySelector('.lf-card');
  const name = chain.tier5Name;
  card.innerHTML = `
    ${cornersHtml()}
    <div class="lf-scroll">
      ${stageHtml(`
        <div class="lf-crucible">
          <div class="lf-core"></div>
          <div class="lf-ring">${chain.chain.map((id, i) => `<div class="lf-orb" style="--a:${i * 90}deg;--bd:${-i * 0.8}s"><div><span><img src="${artifactIconPath(id)}" alt=""></span></div></div>`).join('')}</div>
        </div>`, 'forging')}
      <div class="lf-pad">
        <p class="lf-kicker">✦ The Forge Is at Work ✦</p>
        <h2 class="lf-heading" id="lfHeading">The ${escapeHtml(name)} Is Being Forged</h2>
        <div class="lf-divider"><i></i></div>
        <p class="lf-text">Your four relics are melting into one in the heart of the fire. <strong>A Legendary cannot be rushed.</strong> Return when the forge has finished its work.</p>
        <p class="lf-label">The forge will be finished in</p>
        <div class="lf-timer" role="timer" aria-label="Time left until the Legendary is forged">
          <div class="lf-unit"><span data-t="d">--</span><label>Days</label></div>
          <div class="lf-unit"><span data-t="h">--</span><label>Hours</label></div>
          <div class="lf-unit"><span data-t="m">--</span><label>Mins</label></div>
          <div class="lf-unit"><span data-t="s">--</span><label>Secs</label></div>
        </div>
        <p class="lf-note">Signing out won't cool the forge. It keeps burning either way.</p>
      </div>
    </div>
    <div class="lf-foot"><button type="button" class="lf-btn ghost" id="lfSignOut">Sign Out</button></div>`;

  card.querySelector('#lfSignOut').addEventListener('click', () => {
    if (onDone && onDone.preview) { card.querySelector('#lfSignOut').textContent = 'Signed out (preview)'; return; }
    localStorage.clear();
    window.location.href = 'login.html';
  });

  const els = Object.fromEntries([...card.querySelectorAll('[data-t]')].map((el) => [el.dataset.t, el]));
  const tick = () => {
    if (!card.isConnected || !card.querySelector('.lf-stage.forging')) return;
    const left = endAt - Date.now();
    if (left <= 0) { if (onDone) onDone(); return; }
    els.d.textContent = Math.floor(left / 86400000);
    els.h.textContent = pad(Math.floor((left % 86400000) / 3600000));
    els.m.textContent = pad(Math.floor((left % 3600000) / 60000));
    els.s.textContent = pad(Math.floor((left % 60000) / 1000));
    setTimeout(tick, 250);
  };
  tick();
}

// ---------- stage 3: the reveal ----------

function showReveal(chain, { onClaim, cardInfo } = {}) {
  return new Promise((resolve) => {
    const overlay = getOverlay();
    overlay.classList.remove('fusing');
    const card = overlay.querySelector('.lf-card');
    const name = chain.tier5Name;
    card.innerHTML = `
      ${cornersHtml()}
      <div class="lf-scroll">
        ${stageHtml(`<div class="lf-relic"><img class="lf-relic-art" src="${legendaryArtPath(chain.tier5Id)}" alt="${escapeHtml(name)}" onerror="this.onerror=null;this.classList.remove('lf-relic-art');this.src='${artifactIconPath(chain.tier5Id)}'"></div>`, 'forged')}
        <div class="lf-pad lf-reveal">
          <p class="lf-kicker">✦ Legendary Artifact ✦</p>
          <h2 class="lf-heading" id="lfHeading">The ${escapeHtml(name)} Is Forged</h2>
          <div class="lf-divider"><i></i></div>
          <span class="lf-tier">Tier V · Legendary</span>
          <p class="lf-text">Four relics, every star of your pilgrimage, and ${FORGE_DAYS} days in the heart of the forge now live in this one artifact. <strong>Few ever hold a Legendary.</strong> Carry it with honor.</p>
        </div>
      </div>
      <div class="lf-foot"><button type="button" class="lf-btn pulse" id="lfClaim">Claim the Legendary</button></div>`;
    const btn = card.querySelector('#lfClaim');
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      btn.textContent = 'Claiming…';
      const ok = onClaim ? await onClaim() : true;
      if (!ok) { btn.disabled = false; btn.textContent = 'Could not save — tap to try again'; return; }
      if (cardInfo) await showCardStage(chain, cardInfo);
      closeOverlay();
      resolve();
    });
  });
}

// ---------- stage 4: the Legendary Card ----------

/** Shows the student's card with a Download button; resolves on Continue. */
function showCardStage(chain, cardInfo) {
  return new Promise((resolve) => {
    const card = getOverlay().querySelector('.lf-card');
    card.innerHTML = `
      ${cornersHtml()}
      <div class="lf-scroll">
        <div class="lf-pad lf-reveal">
          <p class="lf-kicker">✦ Your Legendary Card ✦</p>
          <h2 class="lf-heading" id="lfHeading">A Card Worthy of a Legend</h2>
          <div class="lf-divider"><i></i></div>
          <div class="lf-cardview"><p class="lf-note">Engraving your card…</p></div>
          <p class="lf-text">Keep it, share it, show it to the ones who walked beside you. You can download it again any time from the Legendary on your crafting page.</p>
        </div>
      </div>
      <div class="lf-foot lf-foot-row">
        <button type="button" class="lf-btn pulse" id="lfDownload" disabled>⬇ Download Card</button>
        <button type="button" class="lf-btn ghost" id="lfContinue">Continue</button>
      </div>`;
    const view = card.querySelector('.lf-cardview');
    const dl = card.querySelector('#lfDownload');
    let canvas = null;
    drawLegendaryCard({ chain, ...cardInfo }).then((c) => {
      canvas = c;
      const img = document.createElement('img');
      img.src = c.toDataURL('image/png');
      img.alt = `Legendary card: ${chain.tier5Name}, forged by ${cardInfo.studentName || ''}`;
      view.replaceChildren(img);
      dl.disabled = false;
    }).catch((err) => {
      console.error('Legendary card: failed to draw:', err);
      view.innerHTML = '<p class="lf-note">The card could not be drawn right now. Try again from your crafting page.</p>';
    });
    dl.addEventListener('click', async () => {
      if (!canvas) return;
      dl.disabled = true;
      const saved = await saveCanvas(canvas, legendaryCardFilename(chain, cardInfo.studentName));
      dl.textContent = saved ? '✓ Card Downloaded' : 'Download failed — tap to retry';
      dl.classList.remove('pulse');
      dl.disabled = false;
    });
    card.querySelector('#lfContinue').addEventListener('click', () => resolve());
  });
}

// ---------- writes ----------

async function startForging(email, chain) {
  const ref = doc(db, 'students', email);
  let startedAt = new Date().toISOString();
  await runTransaction(db, async (tx) => {
    const live = (await tx.get(ref)).data() || {};
    if (live.legendaryForgeStartedAt) { startedAt = live.legendaryForgeStartedAt; return; }
    tx.update(ref, { legendaryForgeStartedAt: startedAt, legendaryForgeChain: chain.tier5Id });
  });
  return startedAt;
}

async function claimLegendary(email, name, chain, alreadyOwned) {
  const ref = doc(db, 'students', email);
  try {
    let granted = false;
    await runTransaction(db, async (tx) => {
      granted = false;
      const live = (await tx.get(ref)).data() || {};
      if (live.legendaryForgeSeen) return;
      const updates = { legendaryForgeSeen: true };
      if (!(live.ownedArtifacts || []).includes(chain.tier5Id)) updates.ownedArtifacts = arrayUnion(chain.tier5Id);
      tx.update(ref, updates);
      granted = !alreadyOwned;
    });
    if (granted) logActivity({ email, name, type: 'artifact', title: `Forged the Legendary ${chain.tier5Name}!`, icon: '🏆' });
    return true;
  } catch (err) {
    console.error('Legendary forge: failed to claim:', err);
    return false;
  }
}

// ---------- entry points ----------

let running = false;

/** Shows whatever forge stage this student is in. Safe to call more than
 *  once (from legendaryCountdown.js and from the dashboard finale). */
export async function runForgeGate({ email, name, data }) {
  if (running || !email || !data) return;
  // The Pilgrimage Complete screen (dashboard) always comes first.
  if (data.apostleUnlocked && !data.journeyCompleteSeen) return;
  const state = forgeState(data);
  if (state.kind === 'none' || state.kind === 'done') return;
  running = true;
  try {
    let current = state;
    if (current.kind === 'ritual') {
      await showRitual(current.chain);
      try {
        const startedAt = await startForging(email, current.chain);
        data.legendaryForgeStartedAt = startedAt;
        data.legendaryForgeChain = current.chain.tier5Id;
      } catch (err) {
        console.error('Legendary forge: failed to start forging:', err);
        data.legendaryForgeStartedAt = new Date().toISOString(); // shown now; the ritual returns next visit
      }
      current = forgeState(data);
    }
    if (current.kind === 'forging') {
      await new Promise((resolve) => showForging(current.chain, current.endAt, { onDone: resolve }));
      current = forgeState(data);
    }
    if (current.kind === 'reveal') {
      const studentName = data.name || name || '';
      await showReveal(current.chain, {
        onClaim: () => claimLegendary(email, name || data.name || '', current.chain, !!current.alreadyOwned),
        cardInfo: { studentName, email, forgedAt: forgedDateFor(data, FORGE_MS) || new Date() }
      });
      data.legendaryForgeSeen = true;
    }
  } finally {
    running = false;
  }
}

/** URL-param previews; true if one was shown (then skip the real gate). */
export async function maybePreviewForge() {
  const params = new URLSearchParams(window.location.search);
  const chain = chainForTier5(params.get('chain') || '') || CRAFTING_CHAINS[0];
  const cardInfo = { studentName: localStorage.getItem('studentName') || 'Juan Dela Cruz', email: localStorage.getItem('studentEmail') || 'preview', forgedAt: new Date() };
  if (params.get('previewForge')) {
    await showRitual(chain);
    await new Promise((resolve) => showForging(chain, Date.now() + 20000, { onDone: Object.assign(resolve, { preview: true }) }));
    await showReveal(chain, { cardInfo });
    return true;
  }
  if (params.get('previewForging')) {
    showForging(chain, Date.now() + FORGE_MS, { onDone: Object.assign(() => {}, { preview: true }) });
    return true;
  }
  if (params.get('previewForgeDone')) {
    await showReveal(chain, { cardInfo });
    return true;
  }
  return false;
}
