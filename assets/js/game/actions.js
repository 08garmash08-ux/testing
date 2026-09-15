/* Every verb in the game. An interaction resolves to a list of options;
   each option knows what it costs, whether it is allowed right now, and
   what it does to the state. The UI never needs to know the rules. */
(function (SS) {
  'use strict';

  var u = SS.util;
  var State = SS.State;

  function hours(state, from, to) {
    var t = state.time;
    return from <= to ? (t >= from && t < to) : (t >= from || t < to);
  }

  function subjectOptions(state, minutes, rate, where) {
    return SS.Questions.SUBJECTS.map(function (sub) {
      return {
        id: 'study_' + sub.id,
        label: 'Study ' + sub.name,
        detail: u.durationText(minutes) + '  -  currently ' + Math.round(state.knowledge[sub.id]) + '/100',
        color: sub.color,
        enabled: function (s) {
          return s.energy > 8 ? true : 'Too tired to take anything in';
        },
        perform: function (s) {
          var mult = 1;
          if (s.items.textbook) mult *= 1.2;
          if (s.perks.studyBuddy) mult *= 1.25;
          if (where === 'library') mult *= 1.15;
          mult *= State.learnMultiplier(s);
          var gain = rate * minutes * mult;
          var stress = (s.perks.studyBuddy ? 5 : 8) * (minutes / 45);
          State.apply(s, {
            time: minutes,
            energy: -minutes * 0.22,
            stress: stress,
            knowledge: (function () { var k = {}; k[sub.id] = gain; return k; })()
          }, { roomId: where });
          s.totals.studyMinutes += minutes;
          return {
            text: 'You work through ' + sub.name.toLowerCase() + ' for ' + u.durationText(minutes) +
                  '. Understanding up by ' + gain.toFixed(1) + ' points.',
            sfx: 'page'
          };
        }
      };
    });
  }

  function sleepQuality(s, hoursSlept) {
    var per = 11;
    if (s.perks.goodRoommate) per *= 1.2;
    if (s.stress > 70) per *= 0.8;
    return Math.min(100, hoursSlept * per);
  }

  function doSleep(s, untilMinutes, label) {
    var minutes = untilMinutes - s.time;
    if (minutes <= 0) minutes += 1440;
    var slept = minutes / 60;
    State.advance(s, minutes, { roomId: 'dorm', asleep: true });
    s.energy = u.clamp(s.energy + sleepQuality(s, slept), 0, 100);
    s.stress = u.clamp(s.stress - slept * 4.5, 0, 100);
    s.awakeSince = s.time;
    return {
      text: label + ' You slept ' + u.durationText(minutes) + ' and woke at ' + u.clockText(s.time) + '.',
      sfx: 'confirm'
    };
  }

  /* --- interaction handlers, keyed by the tile's `use` --- */

  var HANDLERS = {
    bed: function (state) {
      var opts = [];
      var lateEnough = hours(state, 19 * 60, 4 * 60);
      opts.push({
        id: 'sleep_night',
        label: 'Sleep until morning',
        detail: lateEnough ? 'Wake at 07:00' : 'It is the middle of the day',
        enabled: function (s) { return lateEnough ? true : 'Try again after 19:00'; },
        perform: function (s) { return doSleep(s, 7 * 60, 'Lights out.'); }
      });
      opts.push({
        id: 'nap',
        label: 'Nap for an hour',
        detail: '1h  -  a blunt instrument, but it works',
        enabled: function (s) { return s.energy < 95 ? true : 'You are not remotely tired'; },
        perform: function (s) {
          State.advance(s, 60, { roomId: 'dorm', asleep: true });
          s.energy = u.clamp(s.energy + 17, 0, 100);
          s.stress = u.clamp(s.stress - 6, 0, 100);
          return { text: 'An hour gone, and you feel meaningfully less terrible.', sfx: 'confirm' };
        }
      });
      opts.push({
        id: 'liein',
        label: 'Sleep in until noon',
        detail: 'Weekend luxury. Costs you the morning',
        enabled: function (s) {
          if (!SS.Schedule.isWeekend(s.dayOfWeek)) return 'There is school today';
          return hours(s, 19 * 60, 11 * 60) ? true : 'Too late in the day for that';
        },
        perform: function (s) { return doSleep(s, 12 * 60, 'You sleep like the dead.'); }
      });
      return { title: 'Your bed', desc: 'Narrow, squeaky, and the best thing in the building.', options: opts };
    },

    desk: function (state, target) {
      var roomId = target.room.id;
      if (roomId === 'dorm') {
        return {
          title: 'Your desk',
          desc: 'A lamp, a mug ring, and whatever you last gave up on.',
          options: subjectOptions(state, 45, 0.085, 'dorm')
        };
      }
      if (roomId === 'library') {
        return {
          title: 'Study table',
          desc: 'Quiet, warm, and nobody will talk to you unless you let them.',
          options: subjectOptions(state, 60, 0.09, 'library')
        };
      }
      if (roomId === 'office') {
        return {
          title: 'The front desk',
          desc: 'A pile of forms and a bowl of very old mints.',
          options: [{
            id: 'records', label: 'Ask about your record',
            detail: 'See attendance and standing',
            enabled: function () { return true; },
            perform: function (s) {
              return {
                text: 'Attendance ' + Math.round(State.attendancePercent(s)) + '%, ' +
                      s.attendance.missed + ' classes missed, standing ' + Math.round(s.discipline) + '/100.',
                sfx: 'page'
              };
            }
          }]
        };
      }
      if (roomId === 'cafeteria') {
        return HANDLERS.counter(state, target);
      }
      return {
        title: 'A desk',
        desc: 'Someone has carved a very small, very rude cartoon into the corner.',
        options: [{
          id: 'sit', label: 'Take a seat',
          detail: 'Settle in for the lesson',
          enabled: function () { return true; },
          perform: function (s) {
            s.flags.seated = true;
            return { text: 'You sit down and get your things out.', sfx: 'blip' };
          }
        }]
      };
    },

    chair: function (state, target) {
      return {
        title: 'A chair',
        desc: target.room.subject ? 'Third row, by the window.' : 'Just a chair.',
        options: [{
          id: 'sit', label: 'Sit down and focus',
          detail: 'Concentrating in class learns faster',
          enabled: function () { return true; },
          perform: function (s) {
            s.flags.seated = true;
            return { text: 'You settle in. Being in your seat makes the lesson go in properly.', sfx: 'blip' };
          }
        }]
      };
    },

    board: function (state) {
      return {
        title: 'The board',
        desc: 'Half-erased working from the last class.',
        options: [{
          id: 'timetable', label: "Check today's timetable",
          detail: 'Open the planner',
          enabled: function () { return true; },
          perform: function () { return { open: 'planner', text: '', sfx: 'page' }; }
        }]
      };
    },

    shelf: function (state, target) {
      if (target.room.id === 'office') {
        return { title: 'Filing shelves', desc: 'Rows of folders with your name somewhere in them.', options: [] };
      }
      return {
        title: 'The stacks',
        desc: 'Dewey decimal, loosely interpreted by several generations of students.',
        options: [{
          id: 'browse', label: 'Browse for an hour',
          detail: '1h  -  a little of everything, and calming',
          enabled: function (s) { return s.energy > 6 ? true : 'You would fall asleep standing up'; },
          perform: function (s) {
            var gain = 2.4 * State.learnMultiplier(s) * (s.perks.readingList ? 1.4 : 1);
            State.apply(s, { time: 60, energy: -9, stress: -5, knowledgeFocus: gain }, { roomId: 'library' });
            if (s.perks.readingList) State.addKnowledge(s, 'literature', 1.5);
            return { text: 'You read widely and without much of a plan. It helps more than it feels like it does.', sfx: 'page' };
          }
        }]
      };
    },

    counter: function (state) {
      var opts = [
        {
          id: 'meal', label: 'Buy a proper meal', detail: u.money(6) + '  -  25 min',
          enabled: function (s) { return s.money >= 6 ? true : 'Not enough money'; },
          perform: function (s) {
            State.apply(s, { time: 25, money: -6, hunger: 55, stress: -4, social: 2 }, { roomId: 'cafeteria' });
            return { text: 'Hot food, a tray, ten minutes of not thinking about anything.', sfx: 'coin' };
          }
        },
        {
          id: 'coffee', label: 'Grab a coffee', detail: u.money(3) + '  -  10 min',
          enabled: function (s) { return s.money >= 3 ? true : 'Not enough money'; },
          perform: function (s) {
            State.apply(s, { time: 10, money: -3, energy: 14, stress: 3, hunger: 6 }, { roomId: 'cafeteria' });
            return { text: 'It is not good coffee. It is, however, coffee.', sfx: 'coin' };
          }
        },
        {
          id: 'shift', label: 'Work a shift behind the counter', detail: '2h  -  earns ' + u.money(26),
          enabled: function (s) {
            if (!hours(s, 14 * 60, 20 * 60)) return 'Shifts run from 14:00 to 20:00';
            return s.energy > 20 ? true : 'You are far too tired to work';
          },
          perform: function (s) {
            State.apply(s, { time: 120, money: 26, energy: -24, stress: 5, social: 4 }, { roomId: 'cafeteria' });
            return { text: 'Two hours of trays and till. ' + u.money(26) + ' for it.', sfx: 'coin' };
          }
        }
      ];
      return { title: 'Canteen counter', desc: 'Steam, trays, and a queue that never quite ends.', options: opts };
    },

    vending: function (state) {
      return {
        title: 'Vending machine',
        desc: 'Row E has been stuck since the start of term.',
        options: [
          {
            id: 'snack', label: 'Buy a snack', detail: u.money(3) + '  -  5 min',
            enabled: function (s) { return s.money >= 3 ? true : 'Not enough money'; },
            perform: function (s) {
              State.apply(s, { time: 5, money: -3, hunger: 20, energy: 4 }, {});
              return { text: 'Sugar, salt, and a wrapper that will live in your pocket for a week.', sfx: 'coin' };
            }
          },
          {
            id: 'drink', label: 'Buy an energy drink', detail: u.money(4) + '  -  keeps for later',
            enabled: function (s) { return s.money >= 4 ? true : 'Not enough money'; },
            perform: function (s) {
              State.apply(s, { time: 5, money: -4, items: { energyDrinks: 1 } }, {});
              return { text: 'One cold can, saved for a worse moment.', sfx: 'coin' };
            }
          }
        ]
      };
    },

    gear: function (state) {
      return {
        title: 'Gym equipment',
        desc: 'Mats, a rack, and a rowing machine with a mind of its own.',
        options: [{
          id: 'workout', label: 'Train for 45 minutes',
          detail: 'Clears your head, costs energy',
          enabled: function (s) { return s.energy > 18 ? true : 'You would hurt yourself'; },
          perform: function (s) {
            var cost = s.perks.trainingPlan ? 13 : 19;
            var relief = s.perks.gymPartner ? 22 : 14;
            State.apply(s, { time: 45, energy: -cost, stress: -relief, fitness: 5, hunger: -8 }, { roomId: 'gym' });
            s.totals.workouts++;
            return { text: 'Forty-five minutes of moving. Whatever was circling in your head has stopped.', sfx: 'good' };
          }
        }]
      };
    },

    hoop: function (state) {
      return {
        title: 'The hoop',
        desc: 'Chain net, bent rim, permanently in use.',
        options: [{
          id: 'ball', label: 'Shoot around for a while',
          detail: '40 min  -  better with people about',
          enabled: function (s) { return s.energy > 14 ? true : 'Not with legs like that'; },
          perform: function (s) {
            var friends = SS.World.npcNear(6) ? 1 : 0;
            var relief = (s.perks.gymPartner ? 24 : 16) + friends * 4;
            State.apply(s, {
              time: 40, energy: -14, stress: -relief, fitness: 3,
              social: 4 + friends * 3, hunger: -6
            }, { roomId: 'court', outdoors: true });
            if (friends) State.addFriendship(s, 'deshawn', 2);
            return { text: friends ? 'Someone rebounds for you and it turns into a game.' : 'Just you, the ball and the sound of the chain.', sfx: 'good' };
          }
        }]
      };
    },

    locker: function (state) {
      return {
        title: 'Your locker',
        desc: 'A door that only closes if you lift it slightly.',
        options: [
          {
            id: 'textbook', label: 'Take your textbook',
            detail: 'Study is 20% more effective while you carry it',
            enabled: function (s) { return s.items.textbook ? 'Already in your bag' : true; },
            perform: function (s) {
              s.items.textbook = true;
              return { text: 'Heavy. Worth it.', sfx: 'confirm' };
            }
          },
          {
            id: 'dump', label: 'Dump everything you are carrying',
            detail: 'Lighter bag, clearer head',
            enabled: function (s) { return s.items.textbook ? true : 'Your bag is already empty'; },
            perform: function (s) {
              s.items.textbook = false;
              State.apply(s, { time: 5, stress: -3, energy: 2 }, {});
              return { text: 'Your shoulders say thank you. Your grades reserve judgement.', sfx: 'blip' };
            }
          },
          {
            id: 'tidy', label: 'Sort out the mess in there',
            detail: '15 min  -  oddly satisfying',
            enabled: function () { return true; },
            perform: function (s) {
              State.apply(s, { time: 15, stress: -5 }, {});
              var found = s.rngState % 5 === 0;
              if (found) State.apply(s, { money: 4 }, {});
              return {
                text: found ? 'Three old worksheets, a hoodie you forgot about, and four dollars.'
                            : 'Three old worksheets and a hoodie you forgot about.',
                sfx: 'page'
              };
            }
          }
        ]
      };
    },

    bench: function (state) {
      return {
        title: 'A bench',
        desc: 'Wooden, weathered, carved with the initials of people long gone.',
        options: [{
          id: 'rest', label: 'Sit for twenty minutes',
          detail: 'Do nothing on purpose',
          enabled: function () { return true; },
          perform: function (s) {
            var relief = s.perks.easyGoing ? 13 : 8;
            State.apply(s, { time: 20, stress: -relief, energy: 4 }, { outdoors: true });
            return { text: 'Twenty minutes of sitting still. The day gets a bit smaller.', sfx: 'blip' };
          }
        }, {
          id: 'wait', label: 'Wait until the next period',
          detail: 'Skip ahead',
          enabled: function (s) { return SS.Schedule.nextPeriodStart(s.time) > s.time ? true : 'Nothing left today'; },
          perform: function (s) {
            var target = SS.Schedule.nextPeriodStart(s.time);
            State.apply(s, { time: Math.max(5, target - s.time), stress: -3 }, { outdoors: true });
            return { text: 'You let the time go by. It is ' + u.clockText(s.time) + '.', sfx: 'blip' };
          }
        }]
      };
    },

    fountain: function (state) {
      return {
        title: 'Water fountain',
        desc: 'Runs cold, aims badly.',
        options: [{
          id: 'drink', label: 'Splash your face',
          detail: '5 min',
          enabled: function () { return true; },
          perform: function (s) {
            State.apply(s, { time: 5, stress: -3, energy: 3, hunger: 3 }, { outdoors: true });
            return { text: 'Cold water, and a brief return to your own body.', sfx: 'blip' };
          }
        }]
      };
    }
  };

  /* --- talking to people --- */

  function friendTier(value) { return value >= 55 ? 2 : value >= 25 ? 1 : 0; }

  function talkOptions(state, npc) {
    var data = npc.data;
    var value = state.friendship[npc.id] || 0;
    var opts = [{
      id: 'chat', label: 'Talk for a bit', detail: '15 min',
      enabled: function (s) { return s.energy > 4 ? true : 'You have nothing left to say to anyone'; },
      perform: function (s) {
        var tier = friendTier(s.friendship[npc.id] || 0);
        var lines = data.lines[tier] || data.lines[0];
        var line = lines[Math.floor(Math.random() * lines.length)];
        var gain = 5 + (s.social > 60 ? 2 : 0);
        State.apply(s, { time: 15, social: 5, stress: -3, energy: -2 }, {});
        State.addFriendship(s, npc.id, gain);
        s.totals.chats++;
        return { text: line, speaker: data.name, sfx: 'blip' };
      }
    }];

    if (data.id === 'mina') {
      opts.push({
        id: 'studyTogether', label: 'Study together', detail: '1h  -  strong revision, low stress',
        enabled: function (s) {
          if ((s.friendship.mina || 0) < 25) return 'You do not know Mina well enough yet';
          return s.energy > 15 ? true : 'Too tired to keep up';
        },
        perform: function (s) {
          State.apply(s, {
            time: 60, energy: -14, stress: -2, social: 5,
            knowledgeFocus: 5.5 * State.learnMultiplier(s)
          }, { roomId: 'library' });
          State.addFriendship(s, 'mina', 6);
          s.totals.studyMinutes += 60;
          return { text: 'Mina explains it twice, differently the second time. The second one lands.', speaker: 'Mina Abara', sfx: 'good' };
        }
      });
    }
    if (data.id === 'deshawn') {
      opts.push({
        id: 'train', label: 'Train together', detail: '45 min  -  big stress relief',
        enabled: function (s) {
          if ((s.friendship.deshawn || 0) < 20) return 'Not yet. You have barely spoken';
          return s.energy > 18 ? true : 'You would be a liability';
        },
        perform: function (s) {
          State.apply(s, { time: 45, energy: -16, stress: -24, fitness: 6, social: 7 }, { outdoors: true });
          State.addFriendship(s, 'deshawn', 7);
          s.totals.workouts++;
          return { text: 'You lose 11-6 and feel enormously better about everything.', speaker: 'Deshawn Price', sfx: 'good' };
        }
      });
    }
    if (data.id === 'priya' || data.id === 'tobias') {
      opts.push({
        id: 'hang', label: 'Hang out properly', detail: '1h 30  -  mood, at a price',
        enabled: function (s) {
          if ((s.friendship[data.id] || 0) < 20) return 'You are not there yet';
          return true;
        },
        perform: function (s) {
          State.apply(s, { time: 90, energy: -8, stress: -18, social: 16 }, {});
          State.addFriendship(s, data.id, 9);
          return {
            text: data.id === 'priya'
              ? 'An hour and a half of other people\'s business. Restorative.'
              : 'You do almost nothing for ninety minutes. It is exactly right.',
            speaker: data.name, sfx: 'good'
          };
        }
      });
    }
    if (data.id === 'kenji') {
      opts.push({
        id: 'revise', label: 'Ask to see the notes', detail: '1h  -  serious revision',
        enabled: function (s) {
          if ((s.friendship.kenji || 0) < 30) return 'Kenji is not lending you anything yet';
          return s.energy > 12 ? true : 'You would read the same page six times';
        },
        perform: function (s) {
          State.apply(s, { time: 60, energy: -13, stress: 3, knowledgeFocus: 6 * State.learnMultiplier(s) }, { roomId: 'library' });
          State.addFriendship(s, 'kenji', 4);
          s.totals.studyMinutes += 60;
          return { text: 'The notes are colour-coded. Of course they are.', speaker: 'Kenji Sato', sfx: 'page' };
        }
      });
    }
    if (data.id === 'reyes') {
      opts.push({
        id: 'apologise', label: 'Explain yourself', detail: '30 min  -  recover standing',
        enabled: function (s) { return s.discipline < 70 ? true : 'You are in perfectly good standing'; },
        perform: function (s) {
          State.apply(s, { time: 30, discipline: 12, stress: 4, social: 1 }, { roomId: 'office' });
          State.addFriendship(s, 'reyes', 3);
          return { text: 'It is not a comfortable half hour, but it goes on the record the right way.', speaker: 'Principal Reyes', sfx: 'confirm' };
        }
      });
    }
    if (!data.student && data.spots.class && SS.Questions.subject(data.spots.class)) {
      opts.push({
        id: 'extraHelp', label: 'Ask for extra help', detail: '30 min  -  targeted teaching',
        enabled: function (s) { return s.energy > 8 ? true : 'You would not take it in'; },
        perform: function (s) {
          var subject = data.spots.class;
          var gain = 3.2 * State.learnMultiplier(s);
          var fx = { time: 30, energy: -7, stress: -2, knowledge: {} };
          fx.knowledge[subject] = gain;
          State.apply(s, fx, { roomId: subject });
          State.addFriendship(s, data.id, 5);
          return {
            text: 'Thirty minutes, one topic, properly explained. ' +
                  SS.Questions.subject(subject).name + ' up ' + gain.toFixed(1) + '.',
            speaker: data.name, sfx: 'good'
          };
        }
      });
    }
    return {
      title: data.name,
      desc: data.role + '  -  friendship ' + Math.round(value) + '/100',
      npc: npc,
      options: opts
    };
  }

  function forTarget(state, target) {
    if (!target) return null;
    if (target.type === 'npc') return talkOptions(state, target.npc);
    var handler = HANDLERS[target.use];
    if (!handler) return null;
    var menu = handler(state, target);
    if (!menu || !menu.options.length) return null;
    return menu;
  }

  /* Items usable straight from the pause menu. */
  function useEnergyDrink(state) {
    if (state.items.energyDrinks <= 0) return { text: 'You do not have one.', sfx: 'deny' };
    state.items.energyDrinks--;
    State.apply(state, { time: 5, energy: 26, stress: 6, hunger: 5 }, {});
    return { text: 'Cold, loud and effective. You will pay for it later.', sfx: 'good' };
  }

  SS.Actions = {
    forTarget: forTarget,
    talkOptions: talkOptions,
    useEnergyDrink: useEnergyDrink,
    doSleep: doSleep
  };
})(window.SS = window.SS || {});
