/* Question bank for pop quizzes and finals.
   d: difficulty 1-3. a: index of the correct choice. */
(function (SS) {
  'use strict';

  var Q = {
    math: [
      { d: 1, q: 'What is 7 x 8?', c: ['54', '56', '62', '48'], a: 1 },
      { d: 1, q: 'What is the square root of 144?', c: ['12', '14', '16', '24'], a: 0 },
      { d: 1, q: 'What is 3 cubed?', c: ['9', '18', '27', '81'], a: 2 },
      { d: 1, q: 'The interior angles of a triangle add up to:', c: ['90 degrees', '180 degrees', '270 degrees', '360 degrees'], a: 1 },
      { d: 1, q: 'Write 0.25 as a fraction in lowest terms.', c: ['1/2', '1/3', '1/4', '2/5'], a: 2 },
      { d: 2, q: 'Solve for x: 2x + 5 = 17', c: ['4', '6', '8', '11'], a: 1 },
      { d: 2, q: 'A triangle has base 10 and height 6. What is its area?', c: ['16', '30', '60', '32'], a: 1 },
      { d: 2, q: 'What is 15% of 240?', c: ['24', '30', '36', '45'], a: 2 },
      { d: 2, q: 'Simplify the fraction 12/18.', c: ['2/3', '3/4', '4/6', '6/9'], a: 0 },
      { d: 2, q: 'Find the median of 3, 7, 9, 15, 21.', c: ['7', '9', '11', '15'], a: 1 },
      { d: 2, q: 'A right triangle has legs of 3 and 4. How long is the hypotenuse?', c: ['5', '6', '7', '12'], a: 0 },
      { d: 2, q: 'The circumference of a circle equals:', c: ['pi r squared', '2 pi r', 'pi d squared', 'r squared over 2'], a: 1 },
      { d: 3, q: 'What is the slope of the line through (1, 2) and (3, 8)?', c: ['2', '3', '4', '6'], a: 1 },
      { d: 3, q: 'Factor completely: x squared minus 9', c: ['(x - 3)(x + 3)', '(x - 9)(x + 1)', '(x - 3) squared', 'x(x - 9)'], a: 0 },
      { d: 3, q: 'Rolling one fair six-sided die, what is P(6)?', c: ['1/3', '1/4', '1/6', '1/12'], a: 2 },
      { d: 3, q: 'If f(x) = 2x - 1, what is f(f(3))?', c: ['5', '9', '10', '11'], a: 1 }
    ],
    science: [
      { d: 1, q: 'What is the chemical formula for water?', c: ['CO2', 'H2O', 'O2', 'NaCl'], a: 1 },
      { d: 1, q: 'Which planet is called the Red Planet?', c: ['Venus', 'Mars', 'Jupiter', 'Mercury'], a: 1 },
      { d: 1, q: 'Which organelle is called the powerhouse of the cell?', c: ['Nucleus', 'Ribosome', 'Mitochondrion', 'Chloroplast'], a: 2 },
      { d: 1, q: 'What force pulls objects toward the Earth?', c: ['Friction', 'Magnetism', 'Gravity', 'Tension'], a: 2 },
      { d: 1, q: 'What is the largest organ of the human body?', c: ['Liver', 'Skin', 'Lungs', 'Heart'], a: 1 },
      { d: 2, q: 'Which gas do plants take in for photosynthesis?', c: ['Oxygen', 'Nitrogen', 'Carbon dioxide', 'Hydrogen'], a: 2 },
      { d: 2, q: 'What is the chemical symbol for gold?', c: ['Go', 'Gd', 'Ag', 'Au'], a: 3 },
      { d: 2, q: 'A neutral solution has a pH of:', c: ['0', '7', '10', '14'], a: 1 },
      { d: 2, q: 'Which particle carries a negative charge?', c: ['Proton', 'Neutron', 'Electron', 'Positron'], a: 2 },
      { d: 2, q: 'Which state of matter has a fixed volume but no fixed shape?', c: ['Solid', 'Liquid', 'Gas', 'Plasma'], a: 1 },
      { d: 2, q: 'Which blood cells carry oxygen around the body?', c: ['White blood cells', 'Red blood cells', 'Platelets', 'Plasma cells'], a: 1 },
      { d: 2, q: 'How many bones are in the adult human body?', c: ['186', '196', '206', '256'], a: 2 },
      { d: 3, q: 'What does DNA stand for?', c: ['Deoxyribonucleic acid', 'Dinucleic acid', 'Deoxyribose nuclear acid', 'Diribonucleic acid'], a: 0 },
      { d: 3, q: 'Roughly how fast does light travel in a vacuum?', c: ['3,000 km/s', '30,000 km/s', '300,000 km/s', '3,000,000 km/s'], a: 2 },
      { d: 3, q: "Newton's third law says that every action has:", c: ['a delayed reaction', 'an equal and opposite reaction', 'no reaction in a vacuum', 'a proportional acceleration'], a: 1 },
      { d: 3, q: 'What is the process of a liquid turning into a gas at its surface?', c: ['Condensation', 'Sublimation', 'Evaporation', 'Precipitation'], a: 2 }
    ],
    literature: [
      { d: 1, q: 'Who wrote "Romeo and Juliet"?', c: ['Charles Dickens', 'William Shakespeare', 'Jane Austen', 'Homer'], a: 1 },
      { d: 1, q: 'What do we call the main character of a story?', c: ['Antagonist', 'Narrator', 'Protagonist', 'Foil'], a: 2 },
      { d: 1, q: 'The time and place of a story is its:', c: ['Theme', 'Setting', 'Plot', 'Motif'], a: 1 },
      { d: 1, q: 'A comparison using "like" or "as" is a:', c: ['Metaphor', 'Simile', 'Symbol', 'Pun'], a: 1 },
      { d: 1, q: 'Who wrote "To Kill a Mockingbird"?', c: ['Harper Lee', 'Toni Morrison', 'Mark Twain', 'John Steinbeck'], a: 0 },
      { d: 2, q: 'A poem of fourteen lines is called a:', c: ['Haiku', 'Ballad', 'Sonnet', 'Ode'], a: 2 },
      { d: 2, q: 'Giving human qualities to something non-human is:', c: ['Alliteration', 'Personification', 'Irony', 'Allusion'], a: 1 },
      { d: 2, q: 'Who wrote the novel "1984"?', c: ['Aldous Huxley', 'Ray Bradbury', 'George Orwell', 'Kurt Vonnegut'], a: 2 },
      { d: 2, q: 'Repeating the same initial consonant sound is:', c: ['Assonance', 'Alliteration', 'Rhyme', 'Meter'], a: 1 },
      { d: 2, q: 'A narrator who says "I" is telling the story in:', c: ['First person', 'Second person', 'Third person limited', 'Third person omniscient'], a: 0 },
      { d: 2, q: 'The turning point of a plot is the:', c: ['Exposition', 'Rising action', 'Climax', 'Denouement'], a: 2 },
      { d: 2, q: 'Who wrote "Pride and Prejudice"?', c: ['Emily Bronte', 'Jane Austen', 'Virginia Woolf', 'Mary Shelley'], a: 1 },
      { d: 3, q: 'Which epic poem is attributed to Homer?', c: ['The Aeneid', 'Beowulf', 'The Odyssey', 'Paradise Lost'], a: 2 },
      { d: 3, q: 'Deliberate exaggeration for effect is called:', c: ['Understatement', 'Hyperbole', 'Paradox', 'Oxymoron'], a: 1 },
      { d: 3, q: 'A short tale with a moral, often starring animals, is a:', c: ['Myth', 'Fable', 'Legend', 'Parable'], a: 1 },
      { d: 3, q: 'The atmosphere a text creates in the reader is its:', c: ['Tone', 'Mood', 'Voice', 'Diction'], a: 1 }
    ],
    history: [
      { d: 1, q: 'In which year did the Second World War end?', c: ['1918', '1939', '1945', '1951'], a: 2 },
      { d: 1, q: 'Who was the first President of the United States?', c: ['Thomas Jefferson', 'George Washington', 'John Adams', 'Abraham Lincoln'], a: 1 },
      { d: 1, q: 'Which civilization built the pyramids at Giza?', c: ['The Sumerians', 'The Greeks', 'The Egyptians', 'The Persians'], a: 2 },
      { d: 1, q: 'Who was the first person to walk on the Moon?', c: ['Yuri Gagarin', 'Buzz Aldrin', 'Neil Armstrong', 'Michael Collins'], a: 2 },
      { d: 1, q: 'The Renaissance began in which country?', c: ['France', 'Italy', 'England', 'Spain'], a: 1 },
      { d: 2, q: 'In which year did the Berlin Wall fall?', c: ['1961', '1979', '1989', '1991'], a: 2 },
      { d: 2, q: 'Who was the principal author of the Declaration of Independence?', c: ['Thomas Jefferson', 'Benjamin Franklin', 'James Madison', 'Alexander Hamilton'], a: 0 },
      { d: 2, q: 'Which Greek city-state was famous for its military training?', c: ['Athens', 'Corinth', 'Sparta', 'Thebes'], a: 2 },
      { d: 2, q: 'The American Civil War was fought between:', c: ['Britain and the colonies', 'The North and the South', 'Spain and Mexico', 'France and Canada'], a: 1 },
      { d: 2, q: 'Who led the nonviolent movement for independence in India?', c: ['Jawaharlal Nehru', 'Mahatma Gandhi', 'Subhas Chandra Bose', 'B. R. Ambedkar'], a: 1 },
      { d: 2, q: 'In which year did the First World War begin?', c: ['1905', '1912', '1914', '1917'], a: 2 },
      { d: 2, q: 'Apollo 11 landed on the Moon in which year?', c: ['1961', '1966', '1969', '1972'], a: 2 },
      { d: 3, q: 'Who developed the movable-type printing press in Europe?', c: ['Leonardo da Vinci', 'Johannes Gutenberg', 'Galileo Galilei', 'William Caxton'], a: 1 },
      { d: 3, q: 'In which year was the Magna Carta sealed?', c: ['1066', '1215', '1348', '1492'], a: 1 },
      { d: 3, q: 'The Silk Road linked China with:', c: ['Scandinavia', 'the Mediterranean world', 'southern Africa', 'the Americas'], a: 1 },
      { d: 3, q: 'The Industrial Revolution began in which country?', c: ['Germany', 'Britain', 'the United States', 'Belgium'], a: 1 }
    ]
  };

  var SUBJECTS = [
    { id: 'math',       name: 'Mathematics', short: 'Math', room: 'math',       color: '#6aa9ff' },
    { id: 'science',    name: 'Science',     short: 'Sci',  room: 'science',    color: '#5fd3a6' },
    { id: 'literature', name: 'Literature',  short: 'Lit',  room: 'literature', color: '#f2a65a' },
    { id: 'history',    name: 'History',     short: 'Hist', room: 'history',    color: '#d98cc4' }
  ];

  SS.Questions = {
    bank: Q,
    SUBJECTS: SUBJECTS,
    subject: function (id) {
      for (var i = 0; i < SUBJECTS.length; i++) if (SUBJECTS[i].id === id) return SUBJECTS[i];
      return null;
    },
    /* Harder papers as the semester goes on, but never all-hard. */
    draw: function (rng, subjectId, count, maxDifficulty) {
      var pool = (Q[subjectId] || []).filter(function (item) { return item.d <= (maxDifficulty || 3); });
      if (!pool.length) pool = Q[subjectId] || [];
      var shuffled = rng.shuffle(pool);
      var out = [];
      for (var i = 0; i < count; i++) out.push(shuffled[i % shuffled.length]);
      return out;
    }
  };
})(window.SS = window.SS || {});
