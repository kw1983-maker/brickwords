// ============================================================================
//  quests.js — a set of packs plus a year becomes a run of word hunts.
// ============================================================================
//
// The island's equivalent of questions.js, and written to the same rule: this
// file knows nothing about districts, stands or beams. It hands island.js a
// plain hunt object and island.js turns it into somewhere to run.
//
// The three hunt shapes track the same books the obby does:
//
//   find     (Year 1) — hear the word, run and find the sign.
//   listen   (Year 2) — hear the model sentence with the word missing, then find
//                       the thing it is about.
//   grammar  (Year 4) — read a sentence with a gap; four answer flags are planted
//                       across the island and you run to the right one.
//
// Hunts are drawn without replacement and, wherever it is possible, no two in a
// row live in the same district. That is deliberate: if consecutive words sat in
// the same square the pupil would stop running, and the running is the mode.

import { shuffle } from './rbx.js';
import { blankSentence } from './questions.js';
import { pickLine, fillLine } from './words.js';

// How many of the drawn words come from the pack the teacher actually chose.
// The other districts are there to be met in passing, not to take over the lesson.
const HOME_SHARE = 0.55;

export class QuestSet {
  // `packs` is the four districts, home first.
  constructor(packs, home, year) {
    this.packs = packs;
    this.home = home;
    this.year = year;
    this.total = year.hunts || 8;
    this.index = 0;
    this.current = null;
    this.buildPool();
  }

  // ------------------------------------------------------------------- pool
  buildPool() {
    const entry = (w, pack) => ({ word: w, pack, packId: pack.id, packName: pack.name });

    const homeWords = shuffle(this.home.words.map((w) => entry(w, this.home)));
    const away = shuffle(
      this.packs
        .filter((p) => p.id !== this.home.id)
        .flatMap((p) => p.words.map((w) => entry(w, p))),
    );

    const wantHome = Math.round(this.total * HOME_SHARE);
    const picked = [
      ...homeWords.slice(0, wantHome),
      ...away.slice(0, Math.max(0, this.total - wantHome)),
    ];
    // Top up from whatever is left if a pack was too small to fill its share.
    const rest = shuffle([...homeWords.slice(wantHome), ...away.slice(this.total - wantHome)]);
    while (picked.length < this.total && rest.length) picked.push(rest.pop());

    this.pool = spreadDistricts(shuffle(picked));

    // Year 4's written grammar comes from every district's quiz, not just the
    // home pack's — one unit does not carry six grammar questions on its own.
    this.quizPool = shuffle(
      this.packs.flatMap((p) => (p.quiz || []).map((q) => ({ item: q, packId: p.id }))),
    );
  }

  // ----------------------------------------------------------------- shapes

  findHunt(entry) {
    const w = entry.word;
    // The island has its own phrasing. A pack's `ask` override is deliberately
    // NOT used here: it is written for the obby ("Jump on the {word}"), which is
    // not something you can do to a sign forty studs away.
    const ask = pickLine(this.year.lines, 'hunt') || 'Find {word}!';
    return {
      kind: 'find',
      target: w,
      packId: entry.packId,
      board: `${w.emoji} ${w.word}`,
      subtitle: 'Find it on the island!',
      speak: fillLine(ask, { word: w.word, sentence: w.sentence }),
      reward: w.sentence,
    };
  }

  listenHunt(entry) {
    const w = entry.word;
    const blanked = blankSentence(w.sentence, w.word);
    if (!blanked) return this.findHunt(entry);
    return {
      kind: 'listen',
      target: w,
      packId: entry.packId,
      board: blanked,
      subtitle: 'Which word is missing? Go and find it!',
      speak: `${blanked.replace(/___/g, '…')} Find it!`,
      reward: w.sentence,
    };
  }

  grammarHunt() {
    if (!this.quizPool.length) return null;
    const { item, packId } = this.quizPool.pop();
    const wrong = shuffle(item.w).slice(0, Math.max(2, this.year.choices - 1));
    return {
      kind: 'grammar',
      target: { word: item.a, emoji: '', sentence: item.q.replace(/___/g, item.a) },
      packId,
      board: item.q,
      subtitle: 'Run to the flag with the missing word.',
      speak: item.q.replace(/___/g, '…'),
      reward: item.q.replace(/___/g, item.a),
      // The flags island.js plants for this one question.
      options: shuffle([
        { label: item.a, correct: true },
        ...wrong.map((x) => ({ label: x, correct: false })),
      ]),
    };
  }

  // ------------------------------------------------------------------- next
  next() {
    if (this.index >= this.total) { this.current = null; return null; }
    const i = this.index++;
    const entry = this.pool[i % this.pool.length];
    const y = this.year.id;

    let hunt = null;
    if (y === 1) hunt = this.findHunt(entry);
    else if (y === 2) hunt = i < 2 ? this.findHunt(entry) : this.listenHunt(entry);
    else hunt = (i % 2 === 1 ? this.grammarHunt() : null) || this.listenHunt(entry);

    hunt.number = i + 1;
    hunt.of = this.total;
    this.current = hunt;
    return hunt;
  }

  get done() { return this.current === null && this.index >= this.total; }
}

// Reorder so consecutive hunts are in different districts where the list allows
// it. A simple pass is enough — this is eight to twelve items, not a schedule.
function spreadDistricts(list) {
  const out = [];
  const rest = list.slice();
  let last = null;
  while (rest.length) {
    let k = rest.findIndex((e) => e.packId !== last);
    if (k < 0) k = 0;
    const [e] = rest.splice(k, 1);
    out.push(e);
    last = e.packId;
  }
  return out;
}

// What a stand says when it is not the one being hunted for. The wrong sign
// teaching its own word is the island's whole contract: in the obby a mistake
// costs a fall, here it buys you another English sentence.
export function missLine(word, hunt) {
  const said = word.sentence || `This is a ${word.word}.`;
  // During a grammar hunt the answer is on a flag, not on a stand, so there is
  // nothing to send them back to — the sentence they just earned is the whole
  // reward for wandering off.
  if (!hunt || hunt.kind === 'grammar') return said;
  return `${said} Now find ${hunt.target.word}!`;
}

// The line the guide says when a hunt is answered.
export function hitLine(year, hunt) {
  return fillLine(pickLine(year.lines, 'right'), { sentence: hunt.reward });
}
