/* The player's semester: every number that survives a save, plus the rules
   that move them. Nothing here touches the DOM or the canvas. */
(function (SS) {
  'use strict';

  var u = SS.util;
  var SUBJECT_IDS = ['math', 'science', 'literature', 'history'];
  var SAVE_VERSION = 1;

  var DIFFICULTY = {
    relaxed:  { weeks: 2, label: 'Short term', drain: 0.80, learn: 2.20,
                desc: '2 weeks of school. Lessons land fast and the days are kind. About 25 minutes.' },
    normal:   { weeks: 4, label: 'Full term',  drain: 1.00, learn: 1.00,
                desc: '4 weeks. Balanced, and the way the semester is meant to be played.' },
    marathon: { weeks: 8, label: 'Long haul',  drain: 1.18, learn: 0.62,
                desc: '8 weeks. Slower progress, harsher days, real burnout to manage.' }
  };

  function blankKnowledge() {
    var k = {};
    for (var i = 0; i < SUBJECT_IDS.length; i++) k[SUBJECT_IDS[i]] = 4;
    return k;
  }

  function create(opts) {
    opts = opts || {};
    var mode = DIFFICULTY[opts.difficulty] ? opts.difficulty : 'normal';
    var seed = opts.seed || (Date.now() % 2147483647);
    var friendship = {};
    for (var i = 0; i < SS.NpcData.list.length; i++) friendship[SS.NpcData.list[i].id] = 0;

    return {
      version: SAVE_VERSION,
      seed: seed,
      rngState: seed,
      name: (opts.name || 'Alex').slice(0, 16),
      look: opts.look || 0,
      difficulty: mode,
      semesterWeeks: DIFFICULTY[mode].weeks,

      day: 1,
      week: 1,
      dayOfWeek: 0,
      time: 7 * 60,
      awakeSince: 7 * 60,

      energy: 92,
      stress: 12,
      hunger: 70,
      social: 30,
      fitness: 20,
      discipline: 75,
      money: 30,

      knowledge: blankKnowledge(),
      grades: {},
      examLog: [],
      finals: {},
      attendance: { attended: 0, total: 0, missed: 0 },

      friendship: friendship,
      perks: {},
      flags: {},
      items: { textbook: false, energyDrinks: 0, notes: false },

      totals: { studyMinutes: 0, classMinutes: 0, workouts: 0, chats: 0, earned: 0, allNighters: 0 },

      periodKey: '',
      presentMinutes: 0,
      pendingExam: null,
      finished: false,
      ending: null,
      eventCooldown: 0
    };
  }

  function rngFor(state) {
    var rng = u.makeRng(state.rngState);
    return {
      next: rng,
      done: function () { state.rngState = rng.state(); }
    };
  }

  function clampAll(s) {
    s.energy = u.clamp(s.energy, 0, 100);
    s.stress = u.clamp(s.stress, 0, 100);
    s.hunger = u.clamp(s.hunger, 0, 100);
    s.social = u.clamp(s.social, 0, 100);
    s.fitness = u.clamp(s.fitness, 0, 100);
    s.discipline = u.clamp(s.discipline, 0, 100);
    s.money = Math.max(0, s.money);
    for (var i = 0; i < SUBJECT_IDS.length; i++) {
      var k = SUBJECT_IDS[i];
      s.knowledge[k] = u.clamp(s.knowledge[k], 0, 100);
    }
  }

  function toast(text, kind) { SS.bus.emit('toast', { text: text, kind: kind || 'info' }); }

  /* How well a lesson lands: tired, hungry and stressed students learn less. */
  function learnMultiplier(s) {
    var m = DIFFICULTY[s.difficulty].learn;
    if (s.energy < 25) m *= 0.6; else if (s.energy < 45) m *= 0.82;
    if (s.stress > 75) m *= 0.65; else if (s.stress > 55) m *= 0.85;
    if (s.hunger < 20) m *= 0.75;
    if (s.social < 15) m *= 0.9;
    return m;
  }

  function teacherPerk(s, subject) {
    if (subject === 'math' && s.perks.mathTutor) return 1.2;
    if (subject === 'science' && s.perks.labAssist) return 1.2;
    if (subject === 'history' && s.perks.sourcePack) return 1.2;
    if (subject === 'literature' && s.perks.readingList) return 1.15;
    return 1;
  }

  function addKnowledge(s, subject, amount) {
    if (!s.knowledge.hasOwnProperty(subject)) return;
    s.knowledge[subject] = u.clamp(s.knowledge[subject] + amount, 0, 100);
  }

  /* Spread a lump of revision across the subjects that need it most. */
  function spreadKnowledge(s, amount) {
    var ranked = SUBJECT_IDS.slice().sort(function (a, b) { return s.knowledge[a] - s.knowledge[b]; });
    var weights = [0.4, 0.3, 0.2, 0.1];
    for (var i = 0; i < ranked.length; i++) addKnowledge(s, ranked[i], amount * weights[i]);
  }

  function finalisePeriod(s) {
    if (!s.periodKey) return;
    var parts = s.periodKey.split('|');
    if (parts[2] !== 'class') { s.presentMinutes = 0; return; }
    var length = parseInt(parts[3], 10) || 50;
    s.attendance.total++;
    if (s.presentMinutes >= length * 0.6) {
      s.attendance.attended++;
      s.discipline = u.clamp(s.discipline + 0.6, 0, 100);
    } else if (s.presentMinutes > 0) {
      s.discipline = u.clamp(s.discipline - 2, 0, 100);
      toast('Marked late for ' + parts[4], 'warn');
    } else {
      s.attendance.missed++;
      s.discipline = u.clamp(s.discipline - 4, 0, 100);
      s.stress = u.clamp(s.stress + 4, 0, 100);
      toast('Missed ' + parts[4], 'bad');
    }
    s.presentMinutes = 0;
  }

  function startNewDay(s) {
    finalisePeriod(s);
    s.periodKey = '';
    s.day++;
    s.dayOfWeek = (s.dayOfWeek + 1) % 7;
    s.week = Math.floor((s.day - 1) / 7) + 1;
    s.flags.allowanceDay = false;
    if (s.dayOfWeek === 0) {
      s.money += 45;
      toast('Weekly allowance: ' + u.money(45), 'good');
    }
    /* Friendships fade a little if you never see anyone. */
    for (var id in s.friendship) {
      if (s.friendship.hasOwnProperty(id)) s.friendship[id] = Math.max(0, s.friendship[id] - 0.6);
    }
    SS.bus.emit('dayStart', { state: s });
  }

  /* Advance the clock. ctx tells us where the player is and how well they
     are concentrating, which is all the simulation needs from the world. */
  function advance(s, minutes, ctx) {
    if (s.finished || minutes <= 0) return;
    ctx = ctx || {};
    var drain = DIFFICULTY[s.difficulty].drain;
    var left = minutes;

    while (left > 0) {
      var step = Math.min(left, 10);
      left -= step;

      var period = SS.Schedule.periodAt(s, s.time);
      var key = [s.day, period.id, period.type, (period.end - period.start), period.label].join('|');
      if (key !== s.periodKey) {
        finalisePeriod(s);
        s.periodKey = key;
        SS.bus.emit('periodChanged', { state: s, period: period });
        if (period.type === 'class' && (period.quiz || period.exam)) {
          s.pendingExam = { subject: period.subject, kind: period.exam ? 'final' : 'quiz', roomId: period.roomId };
          SS.bus.emit('examDue', { state: s, period: period });
        }
      }

      var inRightRoom = period.roomId && ctx.roomId === period.roomId;
      if (period.type === 'class') {
        if (inRightRoom) {
          s.presentMinutes += step;
          var focus = ctx.focus === undefined ? 1 : ctx.focus;
          if (period.subject && s.knowledge.hasOwnProperty(period.subject)) {
            var gain = 0.075 * step * focus * learnMultiplier(s) * teacherPerk(s, period.subject);
            addKnowledge(s, period.subject, gain);
            s.totals.classMinutes += step;
          } else if (period.subject === 'study') {
            spreadKnowledge(s, 0.05 * step * focus * learnMultiplier(s));
            s.totals.classMinutes += step;
          } else if (period.subject === 'pe') {
            s.fitness = u.clamp(s.fitness + 0.06 * step, 0, 100);
            s.stress = u.clamp(s.stress - 0.05 * step, 0, 100);
            s.energy -= 0.03 * step;
          }
          s.stress += 0.014 * step * (period.subject === 'pe' ? 0 : 1);
        }
      }

      s.hunger -= 0.055 * step * drain;
      s.social -= 0.006 * step;

      var energyRate = 0.035 * drain;
      if (s.hunger < 25) energyRate += 0.02;
      if (s.stress > 70) energyRate += 0.015;
      if (ctx.running) energyRate += 0.02;
      s.energy -= energyRate * step;

      var stressRate = 0.010;
      if (s.hunger < 20) stressRate += 0.02;
      if (s.energy < 20) stressRate += 0.03;
      if (ctx.outdoors && s.time > 420 && s.time < 1140) stressRate -= 0.012;
      s.stress += stressRate * step;

      s.time += step;
      if (s.time >= 1440) { s.time -= 1440; startNewDay(s); }
      clampAll(s);

      /* Past two in the morning the body votes without you. */
      if (s.time >= 120 && s.time < 420 && s.energy <= 2) {
        SS.bus.emit('collapse', { state: s });
        break;
      }
    }
  }

  /* Apply a bundle of effects from an action, dialogue choice or event. */
  function apply(s, fx, ctx) {
    if (!fx) return;
    if (fx.time) advance(s, fx.time, ctx);
    if (fx.energy) s.energy += fx.energy;
    if (fx.stress) s.stress += fx.stress * (s.perks.easyGoing && fx.stress < 0 ? 1.4 : 1);
    if (fx.hunger) s.hunger += fx.hunger;
    if (fx.social) s.social += fx.social * (s.perks.socialCircle && fx.social > 0 ? 1.5 : 1);
    if (fx.fitness) s.fitness += fx.fitness;
    if (fx.discipline) {
      var d = fx.discipline;
      if (d > 0 && s.perks.goodStanding) d *= 1.5;
      s.discipline += d;
    }
    if (fx.money) {
      s.money += fx.money;
      if (fx.money > 0) s.totals.earned += fx.money;
    }
    if (fx.knowledgeFocus) spreadKnowledge(s, fx.knowledgeFocus);
    if (fx.knowledge) {
      for (var k in fx.knowledge) {
        if (!fx.knowledge.hasOwnProperty(k)) continue;
        if (k === 'any') spreadKnowledge(s, fx.knowledge[k]);
        else addKnowledge(s, k, fx.knowledge[k]);
      }
    }
    if (fx.friendship) {
      for (var id in fx.friendship) {
        if (fx.friendship.hasOwnProperty(id)) addFriendship(s, id, fx.friendship[id]);
      }
    }
    if (fx.flags) {
      for (var f in fx.flags) if (fx.flags.hasOwnProperty(f)) s.flags[f] = fx.flags[f];
    }
    if (fx.items) {
      for (var it in fx.items) {
        if (!fx.items.hasOwnProperty(it)) continue;
        if (typeof s.items[it] === 'number') s.items[it] += fx.items[it];
        else s.items[it] = fx.items[it];
      }
    }
    clampAll(s);
  }

  function addFriendship(s, id, amount) {
    if (s.friendship[id] === undefined) s.friendship[id] = 0;
    s.friendship[id] = u.clamp(s.friendship[id] + amount, 0, 100);
    var npc = SS.NpcData.byId(id);
    if (npc && npc.perk && !s.perks[npc.perk.id] && s.friendship[id] >= npc.perk.at) {
      s.perks[npc.perk.id] = true;
      SS.bus.emit('perk', { npc: npc, perk: npc.perk });
    }
  }

  /* Exams and coursework blend into one score per subject. */
  function examAverage(s, subject) {
    var total = 0, weight = 0;
    for (var i = 0; i < s.examLog.length; i++) {
      var e = s.examLog[i];
      if (e.subject !== subject) continue;
      var w = e.kind === 'final' ? 3 : 1;
      total += e.percent * w; weight += w;
    }
    if (!weight) return null;
    return total / weight;
  }

  function subjectScore(s, subject) {
    var know = s.knowledge[subject];
    var exam = examAverage(s, subject);
    if (exam === null) return know;
    return know * 0.5 + exam * 0.5;
  }

  /* The blended score is half coursework, so the bands sit a little below a
     raw exam scale: 90 earns an A, and anything under 57 is a fail. */
  var LETTERS = [
    [90, 'A', 4.0], [87, 'A-', 3.7], [83, 'B+', 3.3], [80, 'B', 3.0], [77, 'B-', 2.7],
    [73, 'C+', 2.3], [70, 'C', 2.0], [67, 'C-', 1.7], [63, 'D+', 1.3], [60, 'D', 1.0],
    [57, 'D-', 0.7], [0, 'F', 0.0]
  ];

  function letterFor(score) {
    for (var i = 0; i < LETTERS.length; i++) if (score >= LETTERS[i][0]) return LETTERS[i][1];
    return 'F';
  }

  function pointsFor(score) {
    for (var i = 0; i < LETTERS.length; i++) if (score >= LETTERS[i][0]) return LETTERS[i][2];
    return 0;
  }

  function report(s) {
    var rows = [];
    var total = 0;
    for (var i = 0; i < SUBJECT_IDS.length; i++) {
      var id = SUBJECT_IDS[i];
      var score = subjectScore(s, id);
      total += pointsFor(score);
      rows.push({
        id: id,
        name: SS.Questions.subject(id).name,
        color: SS.Questions.subject(id).color,
        knowledge: s.knowledge[id],
        exam: examAverage(s, id),
        score: score,
        letter: letterFor(score)
      });
    }
    return { rows: rows, gpa: total / SUBJECT_IDS.length };
  }

  function attendancePercent(s) {
    if (!s.attendance.total) return 100;
    return (s.attendance.attended / s.attendance.total) * 100;
  }

  function bestFriends(s) {
    var out = [];
    for (var id in s.friendship) {
      if (!s.friendship.hasOwnProperty(id)) continue;
      var npc = SS.NpcData.byId(id);
      if (npc) out.push({ id: id, name: npc.name, value: s.friendship[id] });
    }
    out.sort(function (a, b) { return b.value - a.value; });
    return out;
  }

  /* The closing card: a title earned by how the semester actually went. */
  function ending(s) {
    var rep = report(s);
    var att = attendancePercent(s);
    var friends = bestFriends(s);
    var close = friends.filter(function (f) { return f.value >= 50; }).length;
    var title, blurb;

    if (rep.gpa >= 3.7 && close >= 2 && s.stress < 60) {
      title = 'Top of the year, and still yourself';
      blurb = 'You finished with the grades and with people who would notice if you stopped showing up.';
    } else if (rep.gpa >= 3.7) {
      title = 'Academic honours';
      blurb = 'The transcript is immaculate. The rest of the semester is a bit of a blur.';
    } else if (rep.gpa >= 3.0 && close >= 3) {
      title = 'The one everybody liked';
      blurb = 'Solid marks, and a corridor where you cannot walk ten steps without being stopped.';
    } else if (rep.gpa >= 3.0) {
      title = 'Quietly competent';
      blurb = 'No drama, no distinctions, a real and unglamorous pass.';
    } else if (rep.gpa >= 2.0 && s.fitness > 60) {
      title = 'Carried by the team';
      blurb = 'The classroom was a negotiation. The court never was.';
    } else if (rep.gpa >= 2.0) {
      title = 'Scraped through';
      blurb = 'It was closer than it needed to be, and you know exactly which week did it.';
    } else if (att < 60) {
      title = 'Rarely seen';
      blurb = 'The register has more gaps than entries. Some of those mornings were survival, some were not.';
    } else {
      title = 'A hard semester';
      blurb = 'You were there for most of it. The marks did not follow, this time.';
    }

    return {
      title: title, blurb: blurb, gpa: rep.gpa, rows: rep.rows,
      attendance: att, friends: friends.slice(0, 4), stress: s.stress, fitness: s.fitness,
      money: s.money, totals: s.totals
    };
  }

  function finish(s) {
    if (s.finished) return s.ending;
    s.finished = true;
    s.ending = ending(s);
    SS.bus.emit('semesterEnd', { state: s, ending: s.ending });
    return s.ending;
  }

  SS.State = {
    SUBJECT_IDS: SUBJECT_IDS,
    DIFFICULTY: DIFFICULTY,
    SAVE_VERSION: SAVE_VERSION,
    create: create,
    advance: advance,
    apply: apply,
    addFriendship: addFriendship,
    addKnowledge: addKnowledge,
    spreadKnowledge: spreadKnowledge,
    learnMultiplier: learnMultiplier,
    report: report,
    letterFor: letterFor,
    attendancePercent: attendancePercent,
    bestFriends: bestFriends,
    examAverage: examAverage,
    ending: ending,
    finish: finish,
    rngFor: rngFor,
    toast: toast,
    startNewDay: startNewDay
  };
})(window.SS = window.SS || {});
