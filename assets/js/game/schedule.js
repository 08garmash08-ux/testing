/* The school week. Everything in the game asks this module what is supposed
   to be happening at a given minute of a given day. */
(function (SS) {
  'use strict';

  var DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  var PERIODS = [
    { id: 'morning', type: 'free',  start: 0,    end: 480,  label: 'Before school' },
    { id: 'p1',      type: 'class', start: 480,  end: 530,  slot: 0, label: 'Period 1' },
    { id: 'gap1',    type: 'free',  start: 530,  end: 540,  label: 'Changeover' },
    { id: 'p2',      type: 'class', start: 540,  end: 590,  slot: 1, label: 'Period 2' },
    { id: 'break',   type: 'break', start: 590,  end: 610,  label: 'Morning break' },
    { id: 'p3',      type: 'class', start: 610,  end: 660,  slot: 2, label: 'Period 3' },
    { id: 'lunch',   type: 'lunch', start: 660,  end: 720,  label: 'Lunch' },
    { id: 'p4',      type: 'class', start: 720,  end: 770,  slot: 3, label: 'Period 4' },
    { id: 'gap2',    type: 'free',  start: 770,  end: 780,  label: 'Changeover' },
    { id: 'p5',      type: 'class', start: 780,  end: 830,  slot: 4, label: 'Period 5' },
    { id: 'after',   type: 'free',  start: 830,  end: 1440, label: 'After school' }
  ];

  /* Five teaching slots a day, Monday to Friday. */
  var TIMETABLE = [
    ['math', 'science', 'literature', 'history', 'pe'],
    ['science', 'math', 'history', 'literature', 'study'],
    ['literature', 'history', 'math', 'science', 'pe'],
    ['history', 'literature', 'science', 'math', 'study'],
    ['math', 'science', 'literature', 'history', 'quiz']
  ];

  /* Finals take over the whole morning of the last school day. */
  var FINALS_ORDER = ['math', 'science', 'literature', 'history'];

  var ROOM_FOR = {
    math: 'math', science: 'science', literature: 'literature', history: 'history',
    pe: 'gym', study: 'library', quiz: 'literature'
  };

  function isWeekend(dayOfWeek) { return dayOfWeek >= 5; }

  function lastSchoolDay(weeks) { return (weeks - 1) * 7 + 5; }

  function isFinalsDay(state) { return state.day === lastSchoolDay(state.semesterWeeks); }

  /* What class fills a given slot, taking finals week into account. */
  function slotSubject(state, slot) {
    if (isFinalsDay(state)) {
      return slot < FINALS_ORDER.length ? FINALS_ORDER[slot] : null;
    }
    if (isWeekend(state.dayOfWeek)) return null;
    var row = TIMETABLE[state.dayOfWeek];
    return row ? row[slot] : null;
  }

  function quizSubjectForWeek(week) {
    var order = ['math', 'science', 'literature', 'history'];
    return order[(week - 1) % order.length];
  }

  /* The period covering a minute of the day, with its lesson resolved. */
  function periodAt(state, minutes) {
    var m = ((minutes % 1440) + 1440) % 1440;
    var base = null;
    for (var i = 0; i < PERIODS.length; i++) {
      if (m >= PERIODS[i].start && m < PERIODS[i].end) { base = PERIODS[i]; break; }
    }
    if (!base) base = PERIODS[PERIODS.length - 1];

    var out = {
      id: base.id, type: base.type, start: base.start, end: base.end,
      label: base.label, slot: base.slot, subject: null, roomId: null,
      exam: false, quiz: false
    };

    if (isWeekend(state.dayOfWeek)) {
      out.type = base.type === 'class' ? 'free' : base.type;
      out.label = base.type === 'class' ? 'Weekend' : base.label;
      return out;
    }

    if (base.type !== 'class') return out;

    var subject = slotSubject(state, base.slot);
    if (!subject) { out.type = 'free'; out.label = 'Free period'; return out; }

    if (isFinalsDay(state)) {
      out.exam = true;
      out.subject = subject;
      out.roomId = ROOM_FOR[subject];
      out.label = 'FINAL: ' + SS.Questions.subject(subject).name;
      return out;
    }

    if (subject === 'quiz') {
      out.quiz = true;
      out.subject = quizSubjectForWeek(state.week);
      out.roomId = ROOM_FOR[out.subject];
      out.label = 'Pop quiz: ' + SS.Questions.subject(out.subject).name;
      return out;
    }

    if (subject === 'pe') {
      out.subject = 'pe'; out.roomId = 'gym'; out.label = 'Physical education';
      return out;
    }
    if (subject === 'study') {
      out.subject = 'study'; out.roomId = 'library'; out.label = 'Study hall';
      return out;
    }

    out.subject = subject;
    out.roomId = ROOM_FOR[subject];
    out.label = SS.Questions.subject(subject).name;
    return out;
  }

  /* The remaining teaching periods of the day, for the planner screen. */
  function dayPlan(state) {
    var plan = [];
    for (var i = 0; i < PERIODS.length; i++) {
      var p = PERIODS[i];
      if (p.type !== 'class') continue;
      var resolved = periodAt(state, p.start);
      if (resolved.type !== 'class') continue;
      plan.push({
        label: p.label,
        time: SS.util.clockText(p.start) + ' - ' + SS.util.clockText(p.end),
        start: p.start, end: p.end,
        lesson: resolved.label,
        roomId: resolved.roomId,
        subject: resolved.subject,
        exam: resolved.exam, quiz: resolved.quiz
      });
    }
    return plan;
  }

  function nextPeriodStart(minutes) {
    for (var i = 0; i < PERIODS.length; i++) {
      if (PERIODS[i].start > minutes) return PERIODS[i].start;
    }
    return 1440;
  }

  SS.Schedule = {
    DAY_NAMES: DAY_NAMES,
    PERIODS: PERIODS,
    TIMETABLE: TIMETABLE,
    FINALS_ORDER: FINALS_ORDER,
    ROOM_FOR: ROOM_FOR,
    isWeekend: isWeekend,
    isFinalsDay: isFinalsDay,
    lastSchoolDay: lastSchoolDay,
    quizSubjectForWeek: quizSubjectForWeek,
    periodAt: periodAt,
    dayPlan: dayPlan,
    nextPeriodStart: nextPeriodStart,
    dayName: function (dow) { return DAY_NAMES[dow % 7]; }
  };
})(window.SS = window.SS || {});
