/* Random campus moments. One is rolled when the player changes room or a
   period turns over, at most a few times a day. Conditions are plain
   functions because events are never serialised into the save file. */
(function (SS) {
  'use strict';

  var EVENTS = [
    {
      id: 'lostPhone', weight: 10, where: ['hallway', 'lobby'],
      title: 'A phone on the floor',
      text: 'Someone has dropped a phone by the lockers. It is still buzzing.',
      choices: [
        { label: 'Hand it in at the office', effects: { time: 20, discipline: 6, social: 2 },
          result: 'You detour to the office. The secretary writes your name down in the good column.' },
        { label: 'Find the owner yourself', effects: { time: 35, social: 6, energy: -4 },
          result: 'It takes three corridors and two wrong guesses, but you find them. They are extremely relieved.' },
        { label: 'Leave it, you are late', effects: { stress: 3 },
          result: 'You walk on. It buzzes behind you the whole length of the hallway.' }
      ]
    },
    {
      id: 'fireDrill', weight: 6, where: ['any'],
      cond: function (s) { return s.period && s.period.type === 'class' && s.time > 8 * 60; },
      title: 'Fire drill',
      text: 'Three long bells. Everyone files out onto the field and stands about in the cold.',
      choices: [
        { label: 'Line up and wait', effects: { time: 30, stress: -3, knowledge: { any: -0.5 } },
          result: 'Twenty-five minutes of standing around. The lesson does not really recover afterwards.' },
        { label: 'Quiz a friend while you wait', effects: { time: 30, social: 3, knowledgeFocus: 2 },
          result: 'You turn the wait into flashcards. Not everyone is impressed. You do not mind.' }
      ]
    },
    {
      id: 'spill', weight: 8, where: ['cafeteria'],
      title: 'A tray goes over',
      text: 'A first-year drops an entire tray and goes bright red. Everyone is looking at their food very hard.',
      choices: [
        { label: 'Help clean it up', effects: { time: 15, discipline: 5, social: 5, energy: -3 },
          result: 'You grab napkins. They mumble thanks about four times.' },
        { label: 'Buy them a replacement', effects: { time: 15, money: -5, social: 8 },
          result: 'Five dollars, and the whole table saw you do it.' },
        { label: 'Stay out of it', effects: {},
          result: 'A staff member arrives with a mop eventually.' }
      ]
    },
    {
      id: 'boxes', weight: 8, where: ['hallway', 'library', 'office'],
      title: 'A stack of boxes',
      text: 'A teacher is failing to carry four boxes of textbooks and one coffee.',
      choices: [
        { label: 'Take two boxes', effects: { time: 20, energy: -8, discipline: 7, social: 3 },
          result: 'Two flights of stairs. Your arms report the incident to your brain.' },
        { label: 'Hold the doors at least', effects: { time: 8, discipline: 2 },
          result: 'A small kindness, efficiently delivered.' },
        { label: 'Keep moving', effects: {},
          result: 'They manage. Mostly.' }
      ]
    },
    {
      id: 'freePizza', weight: 6, where: ['cafeteria'],
      cond: function (s) { return s.time > 11 * 60 && s.time < 14 * 60; },
      title: 'Leftover pizza',
      text: 'A club meeting over-ordered and the leftovers are on the end table, free to anyone.',
      choices: [
        { label: 'Take a slice', effects: { time: 10, hunger: 28, social: 3, stress: -3 },
          result: 'Lukewarm, slightly sad, completely free. Excellent.' },
        { label: 'Take two and sit with the club', effects: { time: 30, hunger: 45, social: 9, stress: -6 },
          result: 'You end up in a long argument about whether the club should have a mascot.' }
      ]
    },
    {
      id: 'tenner', weight: 5, where: ['yard', 'court'],
      title: 'A folded note on the ground',
      text: 'Ten dollars, half under a bench, nobody nearby.',
      choices: [
        { label: 'Hand it in', effects: { time: 15, discipline: 8 },
          result: 'Unclaimed after a week, they say. You suspect you will forget to go back.' },
        { label: 'Pocket it', effects: { money: 10, stress: 2 },
          result: 'Ten dollars richer and mildly haunted.' }
      ]
    },
    {
      id: 'studyGroup', weight: 9, where: ['library'],
      cond: function (s) { return s.time > 13 * 60; },
      title: 'A study group, one chair spare',
      text: 'Four people, one whiteboard, a genuinely good argument about a past paper.',
      choices: [
        { label: 'Pull up the chair', effects: { time: 60, energy: -12, social: 6, knowledgeFocus: 5 },
          result: 'An hour of being slightly behind the conversation, which is exactly how you learn.' },
        { label: 'Work alone nearby', effects: { time: 45, energy: -9, knowledgeFocus: 3, stress: 2 },
          result: 'Quieter. Slower. Still worth it.' },
        { label: 'Not tonight', effects: {}, result: 'You find a table on the far side.' }
      ]
    },
    {
      id: 'lockerNotes', weight: 5, where: ['hallway'],
      cond: function (s) { return s.week >= 2; },
      title: 'Notes through the locker vent',
      text: 'Someone has pushed a folded summary sheet through the slots. No name on it.',
      choices: [
        { label: 'Read it properly', effects: { time: 20, knowledgeFocus: 4, social: 2 },
          result: 'Whoever wrote this is better at headings than you are.' },
        { label: 'Find out who left it', effects: { time: 30, social: 7 },
          result: 'Nobody admits to it. Two people admit to it who obviously did not.' }
      ]
    },
    {
      id: 'runDown', weight: 14, where: ['any'],
      cond: function (s) { return s.energy < 25; },
      title: 'You are running on nothing',
      text: 'The hallway lights are doing that flat, too-bright thing they do when you have not slept.',
      choices: [
        { label: 'Sit down for a bit', effects: { time: 40, energy: 14, stress: -8 },
          result: 'Forty minutes on a windowsill. The lights go back to normal.' },
        { label: 'Push through it', effects: { time: 5, stress: 10, energy: -3 },
          result: 'You push through it. It pushes back later.' }
      ]
    },
    {
      id: 'rivalTest', weight: 6, where: ['library', 'hallway'],
      cond: function (s) { return s.week >= 2 && s.friendship.kenji >= 20; },
      title: 'Kenji has a past paper',
      text: '"Timed. Forty minutes. No notes. I want to see where you actually are."',
      choices: [
        { label: 'Take the mock test', effects: { time: 45, energy: -10, stress: 4, knowledgeFocus: 6, friendship: { kenji: 8 } },
          result: 'You get about two thirds. Kenji circles the gaps without saying anything unkind.' },
        { label: 'Another time', effects: { friendship: { kenji: -2 } },
          result: '"Fine. But the paper does not get easier in a week."' }
      ]
    },
    {
      id: 'clubSheet', weight: 6, where: ['hallway', 'lobby'],
      cond: function (s) { return s.week <= 3 && !s.flags.clubJoined; },
      title: 'Sign-up sheets',
      text: 'Chess club, track, and a drama group that has already crossed out its own name twice.',
      choices: [
        { label: 'Sign up for chess', effects: { time: 15, flags: { clubJoined: 'chess' }, social: 4, knowledgeFocus: 2 },
          result: 'Tuesdays, apparently. You write your name in the fourth slot.' },
        { label: 'Sign up for track', effects: { time: 15, flags: { clubJoined: 'track' }, social: 4, energy: -2 },
          result: 'Coach Ruiz reads your name over your shoulder and nods once.' },
        { label: 'Sign up for drama', effects: { time: 15, flags: { clubJoined: 'drama' }, social: 7, stress: -4 },
          result: 'They cheer. It is a very small group and they need everyone.' },
        { label: 'Walk past', effects: {}, result: 'The sheets are still there on Thursday. Emptier.' }
      ]
    },
    {
      id: 'rain', weight: 7, where: ['yard', 'court'],
      title: 'The sky opens',
      text: 'Rain, immediately and without negotiation. The court empties in about nine seconds.',
      choices: [
        { label: 'Run for the lobby', effects: { time: 10, energy: -3, stress: 2 },
          result: 'You arrive damp and slightly triumphant.' },
        { label: 'Stand in it a minute', effects: { time: 15, stress: -10, energy: -5 },
          result: 'Nobody else is out here. It is strangely excellent.' }
      ]
    }
  ];

  SS.EventData = { list: EVENTS };
})(window.SS = window.SS || {});
