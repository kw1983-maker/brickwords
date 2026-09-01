// ============================================================================
//  questions.js — a pack plus a year becomes a run of obby stages.
// ============================================================================
//
// This is the teaching brain. It knows nothing about bricks or lava; it hands
// course.js a plain question object and course.js builds a jump out of it.
//
// The three question shapes track what each book actually drills:
//
//   picture  (Year 1) — hear the word, jump on the picture.
//                       Super Minds "Listen and say the words".
//   cloze    (Year 2) — hear a whole sentence with one word missing, jump on
//                       the word that fills it. Units 5–9 grammar, spoken.
//   gap      (Year 4) — read a sentence with a gap and choose the right word.
//                       Get Smart Plus 4 grammar: some/any, has to, past
//                       simple, going to, comparatives, should.
//
// Every question is drawn without replacement until the pool runs dry, so a
// twelve-stage course never asks the same thing twice.

import { pickLine, fillLine } from './words.js';
import { shuffle } from './rbx.js';

// Blank the target word out of its model sentence: "The cat is on the chair."
// with word "cat" becomes "The ___ is on the chair.". Returns null when the
// word does not appear, so the caller can fall back to a plain prompt.
export function blankSentence(sentence, word) {
  if (!sentence || !word) return null;
  // Longest form first, so "a cup of tea" is blanked before "tea" would be.
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(^|[^A-Za-z])(${escaped})(s?)(?![A-Za-z])`, 'i');
  if (!re.test(sentence)) return null;
  return sentence.replace(re, (m, pre, hit, plural) => `${pre}___${plural}`);
}

export class QuestionSet {
  constructor(pack, year) {
    this.pack = pack;
    this.year = year;
    this.wordPool = [];
    this.quizPool = [];
    this.refill();
  }

  refill() {
    this.wordPool = shuffle(this.pack.words);
    this.quizPool = shuffle(this.pack.quiz || []);
  }

  // Pick `n` distractors from the pack that are not the answer.
  distractors(answer, n) {
    const others = this.pack.words.filter((w) => w.word !== answer.word);
    return shuffle(others).slice(0, n);
  }

  // ---------------------------------------------------------------- shapes

  pictureQuestion() {
    if (!this.wordPool.length) this.wordPool = shuffle(this.pack.words);
    const answer = this.wordPool.pop();
    const wrong = this.distractors(answer, this.year.choices - 1);

    const ask = this.pack.ask || pickLine(this.year.lines, 'ask') || 'Jump on {word}.';
    const spoken = fillLine(ask, { word: answer.word, sentence: answer.sentence });

    return {
      kind: 'picture',
      answer,
      // The board shows the word big, because Year 1 is learning to recognise
      // it in print at the same time as hearing it.
      board: answer.word,
      subtitle: 'Jump on the right one!',
      speak: spoken,
      choices: shuffle([answer, ...wrong]).map((w) => ({
        emoji: w.emoji,
        label: w.word,
        correct: w.word === answer.word,
      })),
      reward: answer.sentence,
    };
  }

  clozeQuestion() {
    // Prefer a word whose model sentence actually contains it.
    let answer = null;
    let blanked = null;
    for (let tries = 0; tries < this.pack.words.length; tries++) {
      if (!this.wordPool.length) this.wordPool = shuffle(this.pack.words);
      const candidate = this.wordPool.pop();
      const b = blankSentence(candidate.sentence, candidate.word);
      if (b) { answer = candidate; blanked = b; break; }
    }
    if (!answer) return this.pictureQuestion();

    const wrong = this.distractors(answer, this.year.choices - 1);
    return {
      kind: 'cloze',
      answer,
      board: blanked,
      subtitle: 'Which word is missing?',
      // Read aloud with the gap said as a pause, then the question.
      speak: `${blanked.replace(/___/g, '…')} Which word is missing?`,
      choices: shuffle([answer, ...wrong]).map((w) => ({
        emoji: w.emoji,
        label: w.word,
        correct: w.word === answer.word,
      })),
      reward: answer.sentence,
    };
  }

  gapQuestion() {
    if (!this.quizPool.length) this.quizPool = shuffle(this.pack.quiz || []);
    if (!this.quizPool.length) return this.clozeQuestion();

    const item = this.quizPool.pop();
    const wrong = shuffle(item.w).slice(0, this.year.choices - 1);
    const full = item.q.replace(/___/g, item.a);

    return {
      kind: 'gap',
      answer: { word: item.a, sentence: full, emoji: '' },
      board: item.q,
      subtitle: 'Jump on the missing word.',
      speak: `${item.q.replace(/___/g, '…')}`,
      choices: shuffle([{ label: item.a, correct: true }, ...wrong.map((w) => ({ label: w, correct: false }))])
        .map((c) => ({ emoji: '', label: c.label, correct: c.correct })),
      reward: full,
    };
  }

  // ------------------------------------------------------------------ next
  // Which shape a stage gets is the year's decision, with a little variety so
  // a fifteen-stage Year 4 course is not fifteen identical gap-fills.
  next(stageIndex = 0) {
    const y = this.year.id;
    if (y === 1) return this.pictureQuestion();
    if (y === 2) {
      // Ease pupils in: the first two stages are plain picture matching.
      return stageIndex < 2 ? this.pictureQuestion() : this.clozeQuestion();
    }
    // Year 4: mostly written grammar, with a vocabulary stage every fourth.
    return (stageIndex % 4 === 3) ? this.clozeQuestion() : this.gapQuestion();
  }

  // The whole course, built up front so course.js can look ahead one stage.
  buildCourse() {
    const out = [];
    for (let i = 0; i < this.year.stages; i++) out.push(this.next(i));
    return out;
  }
}

// The word wall shown on the finish podium — everything the pack teaches.
export function wordWall(pack) {
  return pack.words.map((w) => ({ emoji: w.emoji, word: w.word, sentence: w.sentence }));
}
