// ============================================================================
//  THE WORD PACKS — this is the file to edit for a new week's vocabulary.
// ============================================================================
//
// Everything the obby asks is generated from this file, so adding a word here
// immediately creates new stages. There are two tables:
//
//   YEARS  — one entry per school year (1, 2, 4). A year decides HOW a pupil is
//            asked: whether the word is written on the brick, how many bricks
//            there are, how the guide phrases things, and how long the course is.
//            `stages` is the length of an obby course; `hunts` is the number of
//            words to find in an island run. Both are the same dial: how much
//            English this class does before the finish screen.
//   PACKS  — one entry per unit of the textbook. A pack decides WHAT is taught,
//            and which years it is offered to.
//
// ---------------------------------------------------------------- a word ----
//
//   {
//     word: 'pencil',                  // the English word, spoken and shown
//     emoji: '✏️',                     // the picture on the answer brick
//     sentence: "It's a pencil.",      // the model sentence from the book
//     phrase: 'a pencil',              // OPTIONAL: how it reads inside a sentence
//   }
//
// Unlike the Minecraft game, a word needs nothing else. An obby brick can show
// any word as a picture and a label, so every word in both books is usable —
// nothing has to be dropped for want of a matching object in the world.
//
// Keep the emoji inside one pack visually DISTINCT. Three bricks showing three
// near-identical pictures is a guessing game, not a reading test.
//
// ---------------------------------------------------------------- a pack ----
//
//   {
//     id: 'toys', name: 'Toys', emoji: '🪁', blurb: 'kite, doll, train…',
//     years: [1, 2],                        // which classes are offered it
//     book: 'Super Minds 1 · Unit 2 (p.22)',// where it came from, shown to the teacher
//     ask: 'Which one is {word}?',          // OPTIONAL: override the obby's question
//     quiz: [ … ],                          // OPTIONAL: written questions (Year 4)
//     words: [ … ],
//   }
//
// ------------------------------------------------------------- a quiz item --
//
// `quiz` is how the Year 4 grammar gets drilled. Each item is a sentence with a
// gap, the right word, and the wrong words that go on the other bricks:
//
//   { q: 'She ___ to school by bus.', a: 'goes', w: ['go', 'going', 'went'] }
//
// A year's `lines` table carries `ask` (how the obby asks) and `hunt` (how the
// island asks). They are separate because the verb is different: you jump on an
// answer in one game and you go and find it in the other, and "Jump on the duck"
// read out on an island is a instruction to do something impossible.
//
// Year 1 and Year 2 packs do not need `quiz` — their stages are built from the
// pictures. A Year 4 pack without `quiz` still works; it just falls back to
// picture-and-word matching.
//
// The books these packs follow:
//   Year 1 & 2 — Super Minds 1 (Cambridge), Starter + Units 1–9
//   Year 4     — Get Smart Plus 4 (MM Publications / KPM), Modules 1–10
// Both PDFs sit in the project root. Page numbers in `book` are the printed
// page, which is also the PDF page.
//
// After editing this file run:  python build.py
// ============================================================================

// ---------------------------------------------------------------- the years
//
// A year is a difficulty setting written in English rather than in numbers.
// Year 1 hears the word and matches a picture. Year 2 hears a whole sentence.
// Year 4 reads a sentence with a hole in it. The guide is one of the Super
// Friends from the Super Minds books for Years 1–2, and a builder for Year 4.

export const YEARS = [
  {
    id: 1,
    label: 'Year 1',
    emoji: '🐣',
    book: 'Super Minds 1 · Starter–Unit 4',
    blurb: 'listen and jump to the picture',
    showWord: true,      // the word is printed under the picture as support
    speakPrompt: true,   // the question is always read aloud
    choices: 3,
    stages: 10,
    hunts: 8,              // Island mode: how many words to hunt down
    coinsPerStage: 5,
    checkpointEvery: 2,
    guide: { name: 'Whisper', emoji: '🦸', shirt: 'Bright blue', pants: 'Medium stone grey' },
    lines: {
      greet: ["Hi! I'm Whisper. Let's play!", 'Hello! Listen and jump. Good luck!'],
      ask: ['Jump on {word}.', 'Where is {word}? Jump on it!', 'Find {word}!'],
      hunt: ['Find {word}!', 'Go and find {word}.', 'Where is {word}? Go and look!'],
      right: ['Yes! {sentence}', 'Very good! {sentence}', 'Well done! {sentence}'],
      wrong: ['Oh no! Try again.', 'Not that one. Listen again.', "That's not right. Try again!"],
      finish: ['You did it! Well done!', 'Hurray! You are the winner!'],
    },
    praise: ['Well done!', 'Very good!', 'Good job!', 'Excellent!'],
  },
  {
    id: 2,
    label: 'Year 2',
    emoji: '🦉',
    book: 'Super Minds 1 · Units 5–9',
    blurb: 'listen to the sentence, then jump',
    showWord: true,
    speakPrompt: true,
    choices: 3,
    stages: 12,
    hunts: 10,              // Island mode: how many words to hunt down
    coinsPerStage: 8,
    checkpointEvery: 3,
    guide: { name: 'Misty', emoji: '🦸‍♀️', shirt: 'Bright violet', pants: 'Pastel blue' },
    lines: {
      greet: ["Hello! I'm Misty. Are you ready?", "Hi! Listen to me, then jump. Let's go!"],
      ask: ['{sentence} Which one is it?', 'Listen. {sentence} Jump on it!', 'Where is it? {sentence}'],
      hunt: ['{sentence} Go and find it!', 'Listen. {sentence} Where is it?', 'Find {word}. {sentence}'],
      right: ['Yes, that is right! {sentence}', 'Well done! {sentence}', 'Good work! {sentence}'],
      wrong: ['No, that is not right. Listen again.', 'Try again! Listen carefully.', 'Oh dear! Have another go.'],
      finish: ['Fantastic! You finished the course!', 'You are a star! Well done!'],
    },
    praise: ['Well done!', 'That was very good.', 'Great work!', 'You are doing well!'],
  },
  {
    id: 4,
    label: 'Year 4',
    emoji: '🚀',
    book: 'Get Smart Plus 4 · Modules 1–10',
    blurb: 'read the sentence, fill the gap',
    showWord: true,
    speakPrompt: false,   // Year 4 reads; the speaker is there if they want it
    choices: 4,
    stages: 15,
    hunts: 12,              // Island mode: how many words to hunt down
    coinsPerStage: 10,
    checkpointEvery: 3,
    guide: { name: 'Builderman', emoji: '👷', shirt: 'Deep orange', pants: 'Dark stone grey' },
    lines: {
      greet: ["Welcome to the course! I'm Builderman. Read each sign carefully.",
              'Read the sentence, then jump on the missing word. Good luck!'],
      ask: ['{prompt}', '{prompt}'],
      hunt: ['Find {word}.', 'Go and find {word} on the island.'],
      right: ['Correct! {sentence}', 'That’s it! {sentence}', 'Nice work! {sentence}'],
      wrong: ['Not quite — read it once more.', 'Wrong word. Look at the sentence again.',
              'Careful! Check the grammar.'],
      finish: ['Outstanding! You cleared every stage.', 'You finished the whole course. Brilliant!'],
    },
    praise: ['Well done!', 'Excellent work!', 'Keep going, you are doing well!', 'Very good indeed!'],
  },
];

// ---------------------------------------------------------------- the packs

export const PACKS = [
  // ======================================================= Year 1 · Super Minds
  {
    id: 'friends',
    name: 'Friends',
    emoji: '👋',
    blurb: 'hello, name, how old are you',
    years: [1],
    book: 'Super Minds 1 · Starter (p.4–5)',
    ask: 'Jump on {word}.',
    words: [
      { word: 'hello', emoji: '👋', sentence: 'Hello! My name is Whisper.' },
      { word: 'goodbye', emoji: '🙋', sentence: 'Goodbye! See you tomorrow.' },
      { word: 'boy', emoji: '👦', sentence: 'He is a boy. His name is Thunder.' },
      { word: 'girl', emoji: '👧', sentence: 'She is a girl. Her name is Misty.' },
      { word: 'friend', emoji: '🧑‍🤝‍🧑', sentence: 'Flash is my friend.' },
      { word: 'teacher', emoji: '🧑‍🏫', sentence: 'This is my teacher.' },
      { word: 'school', emoji: '🏫', sentence: 'I go to school.' },
      { word: 'name', emoji: '📛', sentence: "What's your name? I'm Misty." },
    ],
  },
  {
    id: 'numbers',
    name: 'Numbers',
    emoji: '🔢',
    blurb: 'one, two, three… ten',
    years: [1, 2],
    book: 'Super Minds 1 · Starter (p.5)',
    ask: 'Jump on the number {word}.',
    words: [
      { word: 'one', emoji: '1️⃣', sentence: 'I am one year old.' },
      { word: 'two', emoji: '2️⃣', sentence: 'I can see two cats.' },
      { word: 'three', emoji: '3️⃣', sentence: 'There are three balls.' },
      { word: 'four', emoji: '4️⃣', sentence: 'I have four pencils.' },
      { word: 'five', emoji: '5️⃣', sentence: 'Look! Five ducks.' },
      { word: 'six', emoji: '6️⃣', sentence: "I'm six years old." },
      { word: 'seven', emoji: '7️⃣', sentence: "I'm seven years old." },
      { word: 'eight', emoji: '8️⃣', sentence: 'There are eight apples.' },
      { word: 'nine', emoji: '9️⃣', sentence: 'I can count to nine.' },
      { word: 'ten', emoji: '🔟', sentence: 'Now I can count to ten!' },
    ],
  },
  {
    id: 'colours',
    name: 'Colours',
    emoji: '🎨',
    blurb: 'red, blue, yellow, green…',
    years: [1, 2],
    book: 'Super Minds 1 · Starter & Unit 7',
    ask: 'Jump on the colour {word}.',
    words: [
      { word: 'red', emoji: '🟥', sentence: 'The apple is red.' },
      { word: 'blue', emoji: '🟦', sentence: 'The sea is blue.' },
      { word: 'yellow', emoji: '🟨', sentence: 'The sun is yellow.' },
      { word: 'green', emoji: '🟩', sentence: 'The grass is green.' },
      { word: 'orange', emoji: '🟧', sentence: 'The carrot is orange.' },
      { word: 'purple', emoji: '🟪', sentence: 'My sweater is purple.' },
      { word: 'brown', emoji: '🟫', sentence: 'The bear is brown.' },
      { word: 'black', emoji: '⬛', sentence: 'My shoes are black.' },
      { word: 'white', emoji: '⬜', sentence: 'The duck is white.' },
      { word: 'pink', emoji: '🌸', sentence: 'The flower is pink.' },
    ],
  },
  {
    id: 'school',
    name: 'At School',
    emoji: '✏️',
    blurb: 'pen, pencil, book, bag, desk…',
    years: [1, 2],
    book: "Super Minds 1 · Unit 1 (p.10) — What's this? It's a pencil.",
    ask: "What's this? Jump on the {word}.",
    words: [
      { word: 'pen', emoji: '🖊️', sentence: "It's a pen." },
      { word: 'pencil', emoji: '✏️', sentence: "It's a pencil." },
      { word: 'rubber', emoji: '🧽', sentence: "It's a rubber." },
      { word: 'book', emoji: '📕', sentence: 'Open your book, please.' },
      { word: 'notebook', emoji: '📓', sentence: "It's a notebook." },
      { word: 'bag', emoji: '🎒', sentence: 'Close your bag!' },
      { word: 'desk', emoji: '🪑', sentence: 'My book is on the desk.' },
      { word: 'ruler', emoji: '📏', sentence: 'Is it a ruler? Yes, it is.' },
      { word: 'pencil case', emoji: '🖍️', sentence: 'My pens are in my pencil case.' },
    ],
  },
  {
    id: 'toys',
    name: 'Toys',
    emoji: '🪁',
    blurb: 'kite, doll, train, ball, bike…',
    years: [1, 2],
    book: "Super Minds 1 · Unit 2 (p.22) — What's his favourite toy?",
    ask: 'Jump on the {word}.',
    words: [
      { word: 'kite', emoji: '🪁', sentence: "It's a new kite." },
      { word: 'doll', emoji: '🪆', sentence: 'Her favourite toy is a doll.' },
      { word: 'monster', emoji: '👹', sentence: "It's an ugly monster." },
      { word: 'plane', emoji: '✈️', sentence: 'Look at the plane!' },
      { word: 'computer game', emoji: '🎮', sentence: 'I like my computer game.' },
      { word: 'train', emoji: '🚂', sentence: 'His favourite toy is a train.' },
      { word: 'car', emoji: '🚗', sentence: "It's a fast car." },
      { word: 'ball', emoji: '⚽', sentence: "Let's play with the ball." },
      { word: 'bike', emoji: '🚲', sentence: 'I have got a red bike.' },
      { word: 'go-kart', emoji: '🏎️', sentence: 'The go-kart race is today.' },
    ],
  },
  {
    id: 'pets',
    name: 'Pet Show',
    emoji: '🐶',
    blurb: 'dog, cat, duck, frog, spider…',
    years: [1, 2],
    book: 'Super Minds 1 · Unit 3 (p.34) — I like / I don’t like dogs.',
    ask: 'Jump on the {word}.',
    words: [
      { word: 'elephant', emoji: '🐘', sentence: 'The elephant is big.' },
      { word: 'rat', emoji: '🐀', sentence: 'The rat is under the bag.' },
      { word: 'lizard', emoji: '🦎', sentence: 'The lizard is in the bag.' },
      { word: 'frog', emoji: '🐸', sentence: 'The frog can jump.' },
      { word: 'spider', emoji: '🕷️', sentence: 'Look at the spider!' },
      { word: 'duck', emoji: '🦆', sentence: 'The duck is white.' },
      { word: 'dog', emoji: '🐶', sentence: 'I like dogs.' },
      { word: 'cat', emoji: '🐱', sentence: 'The cat is on the chair.' },
    ],
  },
  {
    id: 'lunch',
    name: 'Lunchtime',
    emoji: '🍕',
    blurb: 'pizza, cake, apple, banana…',
    years: [1, 2],
    book: 'Super Minds 1 · Unit 4 (p.46) — I’ve got / I haven’t got a sandwich.',
    ask: 'Jump on the {word}.',
    words: [
      { word: 'banana', emoji: '🍌', sentence: "I've got a banana." },
      { word: 'cake', emoji: '🍰', sentence: 'I like cake!' },
      { word: 'cheese sandwich', emoji: '🥪', sentence: "I've got a cheese sandwich." },
      { word: 'apple', emoji: '🍎', sentence: 'Oh, I like apples.' },
      { word: 'pizza', emoji: '🍕', sentence: "I don't like pizza." },
      { word: 'sausage', emoji: '🌭', sentence: 'Have we got any sausages?' },
      { word: 'chicken', emoji: '🍗', sentence: "I don't like chicken." },
      { word: 'steak', emoji: '🥩', sentence: 'I like steak.' },
      { word: 'peas', emoji: '🫛', sentence: "I don't like peas." },
      { word: 'carrots', emoji: '🥕', sentence: 'Oh, I like carrots.' },
    ],
  },

  // ======================================================= Year 2 · Super Minds
  {
    id: 'week',
    name: 'Free Time',
    emoji: '📅',
    blurb: 'Monday, Tuesday… Sunday',
    years: [2],
    book: 'Super Minds 1 · Unit 5 (p.58) — I watch TV on Sundays.',
    ask: 'Which day is it? {sentence}',
    words: [
      { word: 'Monday', emoji: '1️⃣', sentence: 'I go to school on Monday.' },
      { word: 'Tuesday', emoji: '2️⃣', sentence: 'I play football on Tuesday.' },
      { word: 'Wednesday', emoji: '3️⃣', sentence: 'We have Art on Wednesday.' },
      { word: 'Thursday', emoji: '4️⃣', sentence: 'I ride my bike on Thursday.' },
      { word: 'Friday', emoji: '5️⃣', sentence: 'School finishes on Friday.' },
      { word: 'Saturday', emoji: '⚽', sentence: 'There is a football match on Saturday.' },
      { word: 'Sunday', emoji: '🏞️', sentence: 'We go to the lake on Sunday.' },
      { word: 'the weekend', emoji: '🎉', sentence: 'Do you play football at the weekend?' },
    ],
  },
  {
    id: 'house',
    name: 'The Old House',
    emoji: '🏚️',
    blurb: 'kitchen, bedroom, stairs, cellar…',
    years: [2],
    book: "Super Minds 1 · Unit 6 (p.70) — There's a monster. How many cars are there?",
    ask: 'Listen! {sentence} Where is it?',
    words: [
      { word: 'bathroom', emoji: '🛁', sentence: "There's a bath in the bathroom." },
      { word: 'bedroom', emoji: '🛏️', sentence: 'There are two beds in the bedroom.' },
      { word: 'living room', emoji: '🛋️', sentence: "There's a sofa in the living room." },
      { word: 'hall', emoji: '🚪', sentence: "There's a door in the hall." },
      { word: 'dining room', emoji: '🍽️', sentence: 'We eat in the dining room.' },
      { word: 'kitchen', emoji: '🍳', sentence: "There's a cooker in the kitchen." },
      { word: 'stairs', emoji: '🪜', sentence: 'Go down the stairs!' },
      { word: 'cellar', emoji: '🕯️', sentence: 'Is there a monster in the cellar?' },
    ],
  },
  {
    id: 'clothes',
    name: 'Get Dressed',
    emoji: '👕',
    blurb: 'T-shirt, jeans, socks, cap…',
    years: [2],
    book: "Super Minds 1 · Unit 7 (p.82) — Olivia's wearing a red sweater.",
    ask: 'Listen! {sentence} Jump on it!',
    words: [
      { word: 'jeans', emoji: '👖', sentence: "He's wearing blue jeans." },
      { word: 'sweater', emoji: '🧥', sentence: "She's wearing a red sweater." },
      { word: 'jacket', emoji: '🧥', sentence: 'Put on your jacket.' },
      { word: 'skirt', emoji: '👗', sentence: "She's wearing a long skirt." },
      { word: 'shorts', emoji: '🩳', sentence: "He's wearing green shorts." },
      { word: 'cap', emoji: '🧢', sentence: 'Put on your cap!' },
      { word: 'shoes', emoji: '👟', sentence: 'Do you like these shoes?' },
      { word: 'socks', emoji: '🧦', sentence: 'Put on your socks.' },
      { word: 'T-shirt', emoji: '👕', sentence: 'Is he wearing a blue T-shirt?' },
      { word: 'trousers', emoji: '👖', sentence: 'Put on your trousers.' },
    ],
  },
  {
    id: 'body',
    name: 'The Robot',
    emoji: '🤖',
    blurb: 'head, arm, hand, knee, foot…',
    years: [2],
    book: "Super Minds 1 · Unit 8 (p.94) — I can/can't stand on one leg.",
    ask: "Let's make a robot! {sentence}",
    words: [
      { word: 'head', emoji: '🗣️', sentence: "Here's the head." },
      { word: 'arm', emoji: '💪', sentence: "Here's an arm." },
      { word: 'fingers', emoji: '🖐️', sentence: 'Here are the fingers.' },
      { word: 'hand', emoji: '✋', sentence: "Here's a hand." },
      { word: 'knee', emoji: '🦵', sentence: "Here's a knee." },
      { word: 'leg', emoji: '🦿', sentence: 'I can stand on one leg.' },
      { word: 'toes', emoji: '🦶', sentence: 'Here are the toes.' },
      { word: 'foot', emoji: '👣', sentence: "Here's a foot." },
    ],
  },
  {
    id: 'beach',
    name: 'At the Beach',
    emoji: '🏖️',
    blurb: 'swim, shells, ice cream, photos…',
    years: [2],
    book: "Super Minds 1 · Unit 9 (p.106) — Let's play the guitar. Where's the blue book?",
    ask: "Let's do it! {sentence}",
    words: [
      { word: 'catch a fish', emoji: '🎣', sentence: "Let's catch a fish!" },
      { word: 'paint a picture', emoji: '🎨', sentence: "Let's paint a picture!" },
      { word: 'eat ice cream', emoji: '🍦', sentence: "Let's eat ice cream. Yum, yum!" },
      { word: 'take a photo', emoji: '📷', sentence: "Let's take a photo. Click, click!" },
      { word: 'listen to music', emoji: '🎧', sentence: "Let's listen to music!" },
      { word: 'look for shells', emoji: '🐚', sentence: "Let's look for shells!" },
      { word: 'read a book', emoji: '📖', sentence: "Let's read a book." },
      { word: 'make a sandcastle', emoji: '🏰', sentence: "Let's make a sandcastle. Dig, dig!" },
    ],
  },

  // ==================================================== Year 4 · Get Smart Plus 4
  {
    id: 'countries',
    name: 'Where Are You From?',
    emoji: '🌏',
    blurb: 'countries, nationalities, routines',
    years: [4],
    book: 'Get Smart Plus 4 · Module 1 (p.5, PD p.168)',
    words: [
      { word: 'Malaysia', emoji: '🇲🇾', sentence: "I'm from Malaysia. I'm Malaysian." },
      { word: 'the US', emoji: '🇺🇸', sentence: "He's from the US. He's American." },
      { word: 'the UK', emoji: '🇬🇧', sentence: "She's from the UK. She's British." },
      { word: 'Mexico', emoji: '🇲🇽', sentence: "I'm from Mexico. I'm Mexican." },
      { word: 'Brazil', emoji: '🇧🇷', sentence: "They're from Brazil. They're Brazilian." },
      { word: 'Korea', emoji: '🇰🇷', sentence: "She's from Korea. She's Korean." },
      { word: 'China', emoji: '🇨🇳', sentence: "He's from China. He's Chinese." },
      { word: 'skate', emoji: '⛸️', sentence: 'I always skate before dinner.' },
      { word: 'play chess', emoji: '♟️', sentence: 'He sometimes plays chess.' },
      { word: 'play volleyball', emoji: '🏐', sentence: 'They never play volleyball.' },
      { word: 'play baseball', emoji: '⚾', sentence: 'You usually play baseball after school.' },
    ],
    quiz: [
      { q: "Where ___ you from? I'm from Malaysia.", a: 'are', w: ['is', 'am', 'be'] },
      { q: "She's from Korea. She's ___.", a: 'Korean', w: ['Korea', 'Koreans', 'Korish'] },
      { q: 'He ___ chess every Sunday.', a: 'plays', w: ['play', 'playing', 'is play'] },
      { q: 'They ___ play volleyball. They hate it.', a: 'never', w: ['always', 'usually', 'often'] },
      { q: 'What ___ he doing? He’s reading.', a: 'is', w: ['are', 'am', 'does'] },
      { q: "I'm from Mexico, so I'm ___.", a: 'Mexican', w: ['Mexico', 'Mexicans', 'Mexish'] },
      { q: 'I ___ skate before dinner.', a: 'always', w: ['am always', 'always am', 'to always'] },
    ],
  },
  {
    id: 'subjects',
    name: 'My Week',
    emoji: '📚',
    blurb: 'school subjects and housework',
    years: [4],
    book: 'Get Smart Plus 4 · Module 2 (p.15, PD p.169, p.171)',
    words: [
      { word: 'Art', emoji: '🎨', sentence: 'My favourite subject is Art.' },
      { word: 'Music', emoji: '🎵', sentence: 'We have Music twice a week.' },
      { word: 'Maths', emoji: '🧮', sentence: 'I have Maths every day.' },
      { word: 'Science', emoji: '🧪', sentence: 'Science is my favourite subject.' },
      { word: 'Social Studies', emoji: '🌍', sentence: 'We have Social Studies on Monday.' },
      { word: 'PE', emoji: '🤸', sentence: 'How often do you have PE?' },
      { word: 'writing', emoji: '✍️', sentence: 'We do writing three times a week.' },
      { word: 'set the table', emoji: '🍽️', sentence: 'I have to set the table.' },
      { word: 'take out the rubbish', emoji: '🗑️', sentence: 'He has to take out the rubbish.' },
      { word: 'go shopping', emoji: '🛍️', sentence: 'She has to go shopping.' },
      { word: 'rake leaves', emoji: '🍂', sentence: "They don't have to rake leaves." },
      { word: 'feed the fish', emoji: '🐟', sentence: 'I have to feed the fish every day.' },
      { word: 'wash the car', emoji: '🚗', sentence: 'What does he have to do? He has to wash the car.' },
    ],
    quiz: [
      { q: 'She ___ to set the table every evening.', a: 'has', w: ['have', 'having', 'is'] },
      { q: 'They ___ have to go shopping today.', a: "don't", w: ["doesn't", 'not', "isn't"] },
      { q: 'How ___ do you have PE? Twice a week.', a: 'often', w: ['many', 'much', 'long'] },
      { q: 'What ___ he have to do at home?', a: 'does', w: ['do', 'is', 'has'] },
      { q: 'We have Music ___ a week.', a: 'twice', w: ['two', 'second', 'twice times'] },
      { q: 'My favourite ___ is Science.', a: 'subject', w: ['object', 'lesson day', 'homework'] },
      { q: 'I have to ___ out the rubbish.', a: 'take', w: ['make', 'do', 'put'] },
    ],
  },
  {
    id: 'past',
    name: 'In the Past',
    emoji: '🏺',
    blurb: 'Egypt, the past simple, insects',
    years: [4],
    book: 'Get Smart Plus 4 · Module 3 (p.27, PD p.171, p.173, p.174)',
    words: [
      { word: 'mummy', emoji: '🧟', sentence: 'The Egyptians made a mummy.' },
      { word: 'pyramid', emoji: '🔺', sentence: 'They built a big pyramid.' },
      { word: 'treasure', emoji: '💎', sentence: 'There was treasure in the tomb.' },
      { word: 'gold', emoji: '🪙', sentence: 'The mask was made of gold.' },
      { word: 'tomb', emoji: '⚰️', sentence: 'They found the tomb in 1922.' },
      { word: 'desert', emoji: '🏜️', sentence: 'The pyramids are in the desert.' },
      { word: 'mosquito', emoji: '🦟', sentence: 'A mosquito bit him.' },
      { word: 'snail', emoji: '🐌', sentence: 'The snail is very slow.' },
      { word: 'brain', emoji: '🧠', sentence: 'They took out the brain first.' },
      { word: 'stomach', emoji: '🫃', sentence: 'They washed the stomach.' },
      { word: 'face', emoji: '😐', sentence: 'His face was on the mask.' },
    ],
    quiz: [
      { q: 'The Egyptians ___ the body first.', a: 'washed', w: ['wash', 'washes', 'washing'] },
      { q: 'A mosquito ___ him.', a: 'bit', w: ['bite', 'bited', 'bites'] },
      { q: '___ you wake up at 10:00? Yes, I did.', a: 'Did', w: ['Do', 'Was', 'Were'] },
      { q: 'How old ___ he? He was 18.', a: 'was', w: ['were', 'is', 'did'] },
      { q: 'What ___ his name? His name was Tutankhamun.', a: 'was', w: ['is', 'were', 'did'] },
      { q: 'They ___ a pyramid in the desert.', a: 'built', w: ['build', 'builded', 'builds'] },
      { q: 'I ___ not find any treasure.', a: 'did', w: ['do', 'was', 'am'] },
      { q: 'He ___ in the tomb for many years.', a: 'stayed', w: ['stay', 'staying', 'stays'] },
    ],
  },
  {
    id: 'celebrations',
    name: 'Celebrations',
    emoji: '🎆',
    blurb: 'dates, ordinals, going to',
    years: [4],
    book: 'Get Smart Plus 4 · Module 4 (p.37, PD p.170, p.173)',
    words: [
      { word: 'parade', emoji: '🎏', sentence: "She's going to go to the parade." },
      { word: 'costume', emoji: '🦸', sentence: 'I like your costume!' },
      { word: 'decorate', emoji: '🎀', sentence: "They're going to decorate the house." },
      { word: 'fireworks', emoji: '🎆', sentence: 'We watched the fireworks.' },
      { word: 'barbecue', emoji: '🍖', sentence: "We're going to have a barbecue." },
      { word: 'nurse', emoji: '👩‍⚕️', sentence: "She's going to dress up as a nurse." },
      { word: 'soldier', emoji: '🪖', sentence: "He's going to dress up as a soldier." },
      { word: 'police officer', emoji: '👮', sentence: 'He wants to be a police officer.' },
      { word: 'first', emoji: '🥇', sentence: "It's the first of May." },
      { word: 'second', emoji: '🥈', sentence: "It's on the second of June." },
      { word: 'third', emoji: '🥉', sentence: "My birthday is on the third of March." },
      { word: 'twentieth', emoji: '📅', sentence: "It's the twentieth of September." },
    ],
    quiz: [
      { q: "We ___ going to have a party.", a: 'are', w: ['is', 'am', 'be'] },
      { q: "He ___ going to watch TV tonight.", a: "isn't", w: ["aren't", "don't", 'not'] },
      { q: '___ they going to swim? Yes, they are.', a: 'Are', w: ['Is', 'Do', 'Does'] },
      { q: "What's the date today? It's 3 ___.", a: 'November', w: ['Monday', 'birthday', 'winter'] },
      { q: 'My birthday is ___ 13 September.', a: 'on', w: ['in', 'at', 'to'] },
      { q: '21st is written ___.', a: 'twenty-first', w: ['twenty-one', 'twentieth-one', 'two-first'] },
      { q: "I'm going to dress ___ as a soldier.", a: 'up', w: ['on', 'in', 'off'] },
    ],
  },
  {
    id: 'eating',
    name: 'Eating Right',
    emoji: '🥗',
    blurb: 'food, containers, some and any',
    years: [4],
    book: 'Get Smart Plus 4 · Module 5 (p.49, PD p.173, p.175)',
    words: [
      { word: 'pear', emoji: '🍐', sentence: 'I want a pear.' },
      { word: 'peach', emoji: '🍑', sentence: 'There are some peaches.' },
      { word: 'kiwi', emoji: '🥝', sentence: 'A kiwi is good for you.' },
      { word: 'butter', emoji: '🧈', sentence: 'We need some butter.' },
      { word: 'a bottle of water', emoji: '💧', sentence: 'I drink a bottle of water every day.' },
      { word: 'a carton of milk', emoji: '🥛', sentence: 'We need a carton of milk.' },
      { word: 'a bag of crisps', emoji: '🥔', sentence: "There's a bag of crisps on the table." },
      { word: 'a box of cereal', emoji: '🥣', sentence: 'Have you got any cereal? A box, please.' },
      { word: 'a bar of chocolate', emoji: '🍫', sentence: 'I ate a bar of chocolate.' },
      { word: 'a cup of tea', emoji: '☕', sentence: 'She wants a cup of tea.' },
      { word: 'bowl', emoji: '🥣', sentence: 'Put the soup in a bowl.' },
      { word: 'fork', emoji: '🍴', sentence: 'I need a fork, please.' },
      { word: 'spoon', emoji: '🥄', sentence: 'Eat it with a spoon.' },
      { word: 'knife', emoji: '🔪', sentence: 'Be careful with the knife.' },
    ],
    quiz: [
      { q: 'We need ___ eggs for the cake.', a: 'some', w: ['any', 'a', 'much'] },
      { q: "There isn't ___ juice left.", a: 'any', w: ['some', 'a', 'many'] },
      { q: '___ many meals do you eat every day?', a: 'How', w: ['What', 'Who', 'Where'] },
      { q: 'How ___ water do you drink every day?', a: 'much', w: ['many', 'lot', 'more'] },
      { q: 'Have you got ___ cereal?', a: 'any', w: ['some', 'a', 'much'] },
      { q: 'I want ___ apple, please.', a: 'an', w: ['a', 'any', 'some'] },
      { q: 'There ___ some biscuits in the tin.', a: 'are', w: ['is', 'be', 'am'] },
    ],
  },
  {
    id: 'transport',
    name: 'Getting Around',
    emoji: '🚌',
    blurb: 'transport, time, street safety',
    years: [4],
    book: 'Get Smart Plus 4 · Module 6 (p.59, PD p.174)',
    words: [
      { word: 'motorbike', emoji: '🏍️', sentence: 'He goes to work by motorbike.' },
      { word: 'taxi', emoji: '🚕', sentence: 'We took a taxi to the airport.' },
      { word: 'ticket', emoji: '🎫', sentence: 'How much is a bus ticket?' },
      { word: 'tourist', emoji: '🧳', sentence: 'The tourist has a big bag.' },
      { word: 'money', emoji: '💵', sentence: "It's two ringgit and fifty sen." },
      { word: 'pavement', emoji: '🚶', sentence: 'Always walk on the pavement.' },
      { word: 'zebra crossing', emoji: '🦓', sentence: 'Cross the road at the zebra crossing.' },
      { word: 'seat belt', emoji: '💺', sentence: 'Fasten your seat belt!' },
      { word: 'wheel', emoji: '🛞', sentence: 'The wheel is broken.' },
      { word: 'plane', emoji: '✈️', sentence: 'We are going by plane.' },
      { word: 'train', emoji: '🚆', sentence: 'The train leaves at 10:00.' },
      { word: 'on foot', emoji: '👣', sentence: 'I go to school on foot.' },
    ],
    quiz: [
      { q: 'How are we going to get ___?', a: 'there', w: ['their', 'they', 'here go'] },
      { q: 'We are going ___ bus.', a: 'by', w: ['on', 'in', 'with'] },
      { q: 'I go to school ___ foot.', a: 'on', w: ['by', 'in', 'at'] },
      { q: 'How ___ does it take? Twenty minutes.', a: 'long', w: ['much', 'many', 'far'] },
      { q: 'The bus ___ at 10:00.', a: 'arrives', w: ['arrive', 'arriving', 'arrived'] },
      { q: 'How ___ is the ticket? Five ringgit.', a: 'much', w: ['many', 'long', 'old'] },
      { q: 'Fasten your seat ___!', a: 'belt', w: ['built', 'bell', 'bolt'] },
    ],
  },
  {
    id: 'helping',
    name: 'Helping Out',
    emoji: '♻️',
    blurb: 'recycling, materials, whose is it?',
    years: [4],
    book: 'Get Smart Plus 4 · Module 7 (p.71, PD p.173, p.175)',
    words: [
      { word: 'recycling', emoji: '♻️', sentence: 'Everyone can recycle.' },
      { word: 'paper', emoji: '📄', sentence: 'We can recycle paper.' },
      { word: 'metal', emoji: '🥫', sentence: 'This can is made of metal.' },
      { word: 'glass', emoji: '🍾', sentence: 'Put the glass in the green bin.' },
      { word: 'plastic', emoji: '🧴', sentence: "We can't recycle everything, but we can recycle plastic." },
      { word: 'tent', emoji: '⛺', sentence: 'Whose tent is this?' },
      { word: 'sleeping bag', emoji: '🛌', sentence: 'Whose sleeping bags are these? They’re ours.' },
      { word: 'torch', emoji: '🔦', sentence: "It's my torch. It's mine." },
      { word: 'jar', emoji: '🫙', sentence: 'Put the jam in a jar.' },
      { word: 'oven', emoji: '🔥', sentence: "There's a cake in the oven." },
      { word: 'flowerpot', emoji: '🪴', sentence: 'Make a flowerpot from an old bottle.' },
      { word: 'rubbish', emoji: '🗑️', sentence: 'Help me take out the rubbish.' },
    ],
    quiz: [
      { q: '___ jacket is this? It’s mine.', a: 'Whose', w: ["Who's", 'Which', 'Whom'] },
      { q: 'These are our sleeping bags. They’re ___.', a: 'ours', w: ['our', 'us', 'ourses'] },
      { q: 'There is ___ at the door.', a: 'someone', w: ['anyone', 'no one', 'everyone'] },
      { q: "There isn't ___ in the fridge.", a: 'anything', w: ['something', 'nothing', 'everything'] },
      { q: 'There is ___ in the house. It is empty.', a: 'no one', w: ['someone', 'anyone', 'everyone'] },
      { q: 'This bottle is made ___ plastic.', a: 'of', w: ['from', 'by', 'with'] },
      { q: 'That is my torch. It is ___.', a: 'mine', w: ['my', 'me', 'mines'] },
    ],
  },
  {
    id: 'wildlife',
    name: 'Amazing Animals',
    emoji: '🦖',
    blurb: 'comparing animals, adjectives',
    years: [4],
    book: 'Get Smart Plus 4 · Module 8 (p.81, PD p.170, p.171)',
    words: [
      { word: 'camel', emoji: '🐫', sentence: 'A camel has got a hump.' },
      { word: 'squirrel', emoji: '🐿️', sentence: 'The squirrel is in the tree.' },
      { word: 'panda', emoji: '🐼', sentence: 'The panda is black and white.' },
      { word: 'ostrich', emoji: '🦤', sentence: 'An ostrich lays big eggs.' },
      { word: 'rhino', emoji: '🦏', sentence: 'Elephants are bigger than rhinos.' },
      { word: 'gorilla', emoji: '🦍', sentence: 'The gorilla is very strong.' },
      { word: 'jellyfish', emoji: '🪼', sentence: 'A jellyfish can be dangerous.' },
      { word: 'dinosaur', emoji: '🦕', sentence: 'Utahraptor was a dinosaur.' },
      { word: 'kitten', emoji: '🐈', sentence: 'The kitten is smaller than the cat.' },
      { word: 'dangerous', emoji: '⚠️', sentence: 'Utahraptor was more dangerous than T. rex.' },
      { word: 'intelligent', emoji: '🧠', sentence: 'Gorillas are very intelligent.' },
      { word: 'heavy', emoji: '🏋️', sentence: 'A rhino is heavier than a person.' },
    ],
    quiz: [
      { q: 'Elephants are ___ than rhinos.', a: 'bigger', w: ['big', 'biggest', 'more big'] },
      { q: 'Utahraptor was ___ dangerous than T. rex.', a: 'more', w: ['most', 'much', 'many'] },
      { q: 'Its head was as big ___ a small car.', a: 'as', w: ['than', 'like', 'so'] },
      { q: 'Why do you ___ giraffes? Because they’re tall.', a: 'like', w: ['likes', 'liking', 'liked'] },
      { q: 'A kitten is ___ than a gorilla.', a: 'smaller', w: ['small', 'smallest', 'more small'] },
      { q: 'The cheetah is the ___ animal of all.', a: 'fastest', w: ['faster', 'fast', 'most fast'] },
      { q: 'I like pandas ___ they are cute.', a: 'because', w: ['but', 'so', 'than'] },
    ],
  },
  {
    id: 'sports',
    name: 'Get Active!',
    emoji: '🏸',
    blurb: 'sports, equipment, the best',
    years: [4],
    book: 'Get Smart Plus 4 · Module 9 (p.93, PD p.168)',
    words: [
      { word: 'badminton', emoji: '🏸', sentence: 'Badminton is popular in Malaysia.' },
      { word: 'cricket', emoji: '🏏', sentence: 'They play cricket in the UK.' },
      { word: 'cycling', emoji: '🚴', sentence: 'Cycling is good exercise.' },
      { word: 'ice-skate', emoji: '⛸️', sentence: 'Can you ice-skate?' },
      { word: 'ice hockey', emoji: '🏒', sentence: 'Ice hockey is a fast sport.' },
      { word: 'high jump', emoji: '🤸', sentence: 'She is the best high jumper in the school.' },
      { word: 'javelin', emoji: '🎯', sentence: 'He throws the javelin very far.' },
      { word: 'football', emoji: '⚽', sentence: "He's good at football." },
      { word: 'table tennis', emoji: '🏓', sentence: 'Table tennis is popular in my country.' },
      { word: 'helmet', emoji: '⛑️', sentence: 'Wear a helmet when you cycle.' },
      { word: 'net', emoji: '🥅', sentence: 'The ball went over the net.' },
      { word: 'champion', emoji: '🏆', sentence: 'She is the champion!' },
    ],
    quiz: [
      { q: 'I like basketball ___ it’s fun.', a: 'because', w: ['but', 'so', 'than'] },
      { q: 'This is the ___ race of all.', a: 'easiest', w: ['easier', 'easy', 'most easy'] },
      { q: "She's the ___ high jumper in the school.", a: 'best', w: ['better', 'good', 'goodest'] },
      { q: "He's very good ___ basketball.", a: 'at', w: ['in', 'on', 'to'] },
      { q: "She's not good ___ tennis.", a: 'at', w: ['of', 'for', 'with'] },
      { q: 'Table tennis is one of the most ___ sports in my country.', a: 'popular', w: ['popularer', 'popularest', 'more popular'] },
      { q: 'Wear a ___ when you ride your bike.', a: 'helmet', w: ['net', 'bat', 'kneepad'] },
    ],
  },
  {
    id: 'health',
    name: "What's the Matter?",
    emoji: '🤒',
    blurb: 'illnesses, advice, should',
    years: [4],
    book: 'Get Smart Plus 4 · Module 10 (p.103, PD p.169)',
    words: [
      { word: 'headache', emoji: '🤕', sentence: "I've got a headache." },
      { word: 'stomach ache', emoji: '🤢', sentence: "He's got a stomach ache." },
      { word: 'toothache', emoji: '🦷', sentence: "She's got toothache." },
      { word: 'sore throat', emoji: '😷', sentence: "I've got a sore throat." },
      { word: 'cough', emoji: '🗣️', sentence: "You've got a bad cough." },
      { word: 'fever', emoji: '🌡️', sentence: "She's got a fever." },
      { word: 'medicine', emoji: '💊', sentence: 'You should take some medicine.' },
      { word: 'plaster', emoji: '🩹', sentence: 'Put a plaster on the cut.' },
      { word: 'sunburn', emoji: '☀️', sentence: 'Be careful — you can get sunburn.' },
      { word: 'sunscreen', emoji: '🧴', sentence: 'You should wear sunscreen.' },
      { word: 'cut', emoji: '🩸', sentence: 'I cut my finger and it bled.' },
      { word: 'burn', emoji: '🔥', sentence: "Don't touch the oven or you'll burn your hand." },
    ],
    quiz: [
      { q: "What's the ___? I've got a headache.", a: 'matter', w: ['matters', 'problem you', 'wrong of'] },
      { q: 'You ___ take some medicine.', a: 'should', w: ['shoulds', 'to should', 'should to'] },
      { q: 'She ___ run on the stairs.', a: "shouldn't", w: ["doesn't should", 'not should', "shouldn't to"] },
      { q: '___ they eat more sweets? No, they shouldn’t.', a: 'Should', w: ['Do', 'Are', 'Have'] },
      { q: "I've ___ a sore throat.", a: 'got', w: ['get', 'getting', 'gots'] },
      { q: 'Put a ___ on the cut.', a: 'plaster', w: ['medicine', 'fever', 'cough'] },
      { q: 'You should wear ___ at the beach.', a: 'sunscreen', w: ['sunburn', 'a fever', 'a cough'] },
    ],
  },
];

// ------------------------------------------------------------------ helpers

export const yearById = (id) => YEARS.find((y) => y.id === Number(id)) || YEARS[0];

export const packsForYear = (yearId) => PACKS.filter((p) => p.years.includes(Number(yearId)));

export function defaultPackForYear(yearId) {
  const list = packsForYear(yearId);
  return list.length ? list[0] : PACKS[0];
}

export const packById = (id) => PACKS.find((p) => p.id === id) || null;

export function pickLine(lines, key) {
  const arr = lines && lines[key];
  if (!arr || !arr.length) return '';
  return arr[Math.floor(Math.random() * arr.length)];
}

// Fill a template. Unknown placeholders are removed rather than left showing
// curly braces at a seven-year-old.
export function fillLine(tpl, vars = {}) {
  if (!tpl) return '';
  return tpl
    .replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined && vars[k] !== null ? String(vars[k]) : ''))
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// How the word reads inside a sentence, e.g. "a pencil" rather than "pencil".
export function phraseOf(word) {
  if (word.phrase) return word.phrase;
  return word.word;
}

// Warn the teacher, in the console, about a pack that cannot build a course.
// Called once at boot from main.js.
export function validateWords() {
  const problems = [];
  const seen = new Set();

  for (const p of PACKS) {
    if (seen.has(p.id)) problems.push(`duplicate pack id: ${p.id}`);
    seen.add(p.id);

    if (!p.years || !p.years.length) problems.push(`${p.id}: no years`);
    if (!p.book) problems.push(`${p.id}: no book reference`);

    const need = Math.max(...YEARS.filter((y) => p.years.includes(y.id)).map((y) => y.choices), 3);
    if (!p.words || p.words.length < need) {
      problems.push(`${p.id}: only ${p.words ? p.words.length : 0} words — needs at least ${need}`);
    }

    (p.words || []).forEach((w) => {
      if (!w.word) problems.push(`${p.id}: a word with no text`);
      if (!w.emoji) problems.push(`${p.id}: "${w.word}" has no emoji`);
      if (!w.sentence) problems.push(`${p.id}: "${w.word}" has no model sentence`);
    });

    (p.quiz || []).forEach((q, i) => {
      if (!q.q || !q.q.includes('___')) problems.push(`${p.id}: quiz ${i} has no ___ gap`);
      if (!q.a) problems.push(`${p.id}: quiz ${i} has no answer`);
      const wrong = q.w || [];
      if (wrong.length < 2) problems.push(`${p.id}: quiz ${i} needs at least 2 wrong answers`);
      if (wrong.includes(q.a)) problems.push(`${p.id}: quiz ${i} lists its own answer as wrong`);
    });

    // A Year 4 pack really wants written questions.
    if (p.years.includes(4) && (!p.quiz || p.quiz.length < 4)) {
      problems.push(`${p.id}: Year 4 pack has fewer than 4 quiz questions`);
    }
  }

  for (const y of YEARS) {
    if (!packsForYear(y.id).length) problems.push(`Year ${y.id} has no packs`);
  }

  if (problems.length) {
    console.warn(`[words.js] ${problems.length} problem(s):\n  ` + problems.join('\n  '));
  } else {
    console.log(`[words.js] ${PACKS.length} packs, ` +
      `${PACKS.reduce((n, p) => n + p.words.length, 0)} words, ` +
      `${PACKS.reduce((n, p) => n + (p.quiz ? p.quiz.length : 0), 0)} written questions — all valid.`);
  }
  return problems;
}
