/* The cast. Everyone moves between a handful of rooms depending on the
   time of day, and everyone has something the player can unlock by
   spending time with them. Characters are written with they/them. */
(function (SS) {
  'use strict';

  var NPCS = [
    {
      id: 'vega', name: 'Ms. Vega', role: 'Mathematics teacher', color: '#6aa9ff', hair: '#2b3d63',
      spots: { class: 'math', lunch: 'cafeteria', free: 'math', night: null },
      perk: { at: 40, id: 'mathTutor', label: 'Extra problem sets', desc: 'Math study is 25% more effective.' },
      lines: {
        0: ['"Sit anywhere. The seats do not affect your grade, whatever the rumour says."',
            '"A wrong answer you can explain is worth more than a right one you guessed."'],
        1: ['"You are showing up. That is most of it, honestly."',
            '"If the algebra stops making sense, come and find me before the quiz, not after."'],
        2: ['"I kept a set of practice problems aside for you. Harder than the quiz. On purpose."',
            '"You have gotten quick at this. Do not let that make you sloppy."']
      }
    },
    {
      id: 'okonkwo', name: 'Mr. Okonkwo', role: 'Science teacher', color: '#5fd3a6', hair: '#22392f',
      spots: { class: 'science', lunch: 'cafeteria', free: 'science', night: null },
      perk: { at: 40, id: 'labAssist', label: 'Lab assistant', desc: 'Science class gives a steady bonus.' },
      lines: {
        0: ['"Goggles on before the burner, not after. That is the whole safety talk."',
            '"Everything in this room was once somebody guessing, then checking."'],
        1: ['"Your notes are getting better. Draw the diagram, it sticks."',
            '"Ask me the awkward question. Those are the good ones."'],
        2: ['"Come in at lunch and help me set up. You will see the experiment twice."',
            '"You think like an experimenter now. That is not a small thing."']
      }
    },
    {
      id: 'lindqvist', name: 'Mrs. Lindqvist', role: 'Literature teacher', color: '#f2a65a', hair: '#5a3a22',
      spots: { class: 'literature', lunch: 'library', free: 'literature', night: null },
      perk: { at: 40, id: 'readingList', label: 'Reading list', desc: 'Library shelves give more Literature.' },
      lines: {
        0: ['"Read it once for the story. Read it twice for how the story was built."',
            '"Nobody was ever ruined by underlining too much."'],
        1: ['"You noticed the shift in the narrator. Most people do not."',
            '"Say what you actually think about the ending. Marks are not for agreeing with me."'],
        2: ['"I wrote you a list. Three books, none of them on the syllabus."',
            '"You argue with texts properly now. Keep doing it."']
      }
    },
    {
      id: 'bartos', name: 'Mr. Bartos', role: 'History teacher', color: '#d98cc4', hair: '#4a2b3f',
      spots: { class: 'history', lunch: 'cafeteria', free: 'history', night: null },
      perk: { at: 40, id: 'sourcePack', label: 'Primary sources', desc: 'History class gives a steady bonus.' },
      lines: {
        0: ['"Dates are the skeleton. We are here for the muscle."',
            '"Who wrote the source, and who were they writing for? Always those two."'],
        1: ['"Good question in class. It had a follow-up hiding inside it."',
            '"The exam will ask why, not when. Mostly."'],
        2: ['"Borrow this. It is a copy of the original, and it contradicts the textbook."',
            '"You are reading against the grain now. That is the job."']
      }
    },
    {
      id: 'ruiz', name: 'Coach Ruiz', role: 'Physical education', color: '#e8705a', hair: '#3b2018',
      spots: { class: 'gym', lunch: 'gym', free: 'gym', night: null },
      perk: { at: 35, id: 'trainingPlan', label: 'Training plan', desc: 'Workouts cost less energy.' },
      lines: {
        0: ['"Warm up first. I am not filling in another injury form."',
            '"Slow and finishing beats fast and quitting."'],
        1: ['"You are moving better than week one. Sleep is doing half of that."',
            '"Come down after school. The court is free and so am I."'],
        2: ['"I wrote you a programme. Follow it and you will not burn out in exam week."',
            '"You show up even on the bad days. That is the whole sport."']
      }
    },
    {
      id: 'reyes', name: 'Principal Reyes', role: 'Principal', color: '#c8b45f', hair: '#3a3322',
      spots: { class: 'office', lunch: 'office', free: 'office', night: null },
      perk: { at: 45, id: 'goodStanding', label: 'Good standing', desc: 'Discipline recovers faster.' },
      lines: {
        0: ['"My door is open, which is both an invitation and a warning."',
            '"Attendance is not a trap. It is just the easiest thing to get right."'],
        1: ['"You have been steady lately. That gets noticed in here."',
            '"If something is going wrong, tell me early. Late is harder to fix."'],
        2: ['"I will vouch for you where it counts. Do not make me regret the sentence."',
            '"You have had a better semester than your first week suggested."']
      }
    },
    {
      id: 'mina', name: 'Mina Abara', role: 'Classmate, reads everything', color: '#7fd1e8', hair: '#1f2f3a',
      student: true,
      spots: { class: 'science', lunch: 'library', free: 'library', night: 'dorm' },
      perk: { at: 50, id: 'studyBuddy', label: 'Study buddy', desc: 'Studying gains 25% more and adds less stress.' },
      lines: {
        0: ['"You can sit here. I have spread out, but I can un-spread."',
            '"The library is warmer than the hallway and nobody shouts. That is the whole pitch."'],
        1: ['"I make the summary sheets anyway. Copying one out is not cheating."',
            '"Do not read for four hours. Read for forty minutes and then go outside, I am serious."'],
        2: ['"I saved you the good table. The one by the window with the wobbly leg."',
            '"We test each other after this. You will hate it and then you will pass."']
      }
    },
    {
      id: 'deshawn', name: 'Deshawn Price', role: 'Classmate, on every team', color: '#f0c05a', hair: '#2a1d10',
      student: true,
      spots: { class: 'history', lunch: 'cafeteria', free: 'court', night: 'dorm' },
      perk: { at: 50, id: 'gymPartner', label: 'Training partner', desc: 'Court and gym sessions clear far more stress.' },
      lines: {
        0: ['"You want the ball or you want to watch? Either is fine."',
            '"Court is open after last period. It is always open, that is the point."'],
        1: ['"You have got a decent shot when you stop thinking about it."',
            '"Bad day? Come play badly with me for an hour. It works."'],
        2: ['"Two on two Saturday. I already told them you were in."',
            '"You quit less than you used to. That is the only skill that matters."']
      }
    },
    {
      id: 'priya', name: 'Priya Rao', role: 'Classmate, knows everyone', color: '#ef7fa8', hair: '#3a1b2a',
      student: true,
      spots: { class: 'literature', lunch: 'cafeteria', free: 'cafeteria', night: 'dorm' },
      perk: { at: 50, id: 'socialCircle', label: 'Social circle', desc: 'Time with people lifts your mood much faster.' },
      lines: {
        0: ['"New here? Everyone is, in the ways that count."',
            '"Sit with us. The table is loud but the food is the same."'],
        1: ['"You went quiet this week. Noted, not judged."',
            '"There is a thing on Friday. You do not have to stay long."'],
        2: ['"I told them you were coming, so now you have to."',
            '"You are easier to talk to than you were in week one. Do not lose that."']
      }
    },
    {
      id: 'kenji', name: 'Kenji Sato', role: 'Classmate, top of the year', color: '#9aa8ff', hair: '#1b1f38',
      student: true,
      spots: { class: 'math', lunch: 'library', free: 'library', night: 'dorm' },
      perk: { at: 55, id: 'sharedNotes', label: 'Shared notes', desc: 'A revision boost in every subject before finals.' },
      lines: {
        0: ['"You are behind. That is not an insult, it is week one for everybody."',
            '"I am not competing with you. I am competing with last term."'],
        1: ['"Your working is fine. Your handwriting is going to cost you marks."',
            '"I do not sleep enough either. We are both wrong about that."'],
        2: ['"Take my notes for the finals. All four subjects. Return them, though."',
            '"If you beat me I will be annoyed and then pleased, in that order."']
      }
    },
    {
      id: 'tobias', name: 'Tobias Lang', role: 'Classmate, allergic to homework', color: '#8fbf6a', hair: '#33401f',
      student: true,
      spots: { class: 'math', lunch: 'yard', free: 'yard', night: 'dorm' },
      perk: { at: 45, id: 'easyGoing', label: 'Nothing matters much', desc: 'Resting outdoors clears a lot more stress.' },
      lines: {
        0: ['"The bell is a suggestion. A strongly worded one."',
            '"Best bench on campus, and nobody fights me for it."'],
        1: ['"You look wound up. Sit down for ten minutes, the school will survive."',
            '"I did the reading. Once. In my head. Roughly."'],
        2: ['"I am going to pass by exactly one mark and I want you there to see it."',
            '"You are the only person here who does not tell me to try harder. Thanks."']
      }
    },
    {
      id: 'robin', name: 'Robin Oyelaran', role: 'Your roommate', color: '#b58cf0', hair: '#2b2038',
      student: true,
      spots: { class: 'literature', lunch: 'cafeteria', free: 'dorm', night: 'dorm' },
      perk: { at: 45, id: 'goodRoommate', label: 'Quiet hours', desc: 'Sleep restores noticeably more energy.' },
      lines: {
        0: ['"I moved your stuff off my side. Gently."',
            '"Lights out around eleven? I am not strict, I am just tired."'],
        1: ['"I grabbed you something from the canteen. It is on the desk."',
            '"You came in at one in the morning. I am not your parent, but wow."'],
        2: ['"I will keep it quiet tonight. You have got the exam, I have got headphones."',
            '"Best roommate I have had, and I have had three."']
      }
    }
  ];

  SS.NpcData = {
    list: NPCS,
    byId: function (id) {
      for (var i = 0; i < NPCS.length; i++) if (NPCS[i].id === id) return NPCS[i];
      return null;
    }
  };
})(window.SS = window.SS || {});
