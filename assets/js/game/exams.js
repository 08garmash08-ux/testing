/* Pop quizzes and finals. Knowledge earned in class does not answer the
   paper for you, but it does quietly cross off the obvious wrong answers. */
(function (SS) {
  'use strict';

  var State = SS.State;

  function build(state, subject, kind) {
    var r = State.rngFor(state);
    var rng = r.next;
    var count = kind === 'final' ? 8 : 5;
    var maxDifficulty = kind === 'final' ? 3 : (state.week >= 3 ? 3 : 2);
    var drawn = SS.Questions.draw(rng, subject, count, maxDifficulty);
    var know = state.knowledge[subject] || 0;

    var questions = drawn.map(function (q) {
      /* Revision shows up as one fewer wrong answer to fall for. */
      var eliminate = null;
      var odds = know >= 75 ? 0.9 : know >= 55 ? 0.6 : know >= 35 ? 0.3 : 0.05;
      if (rng() < odds) {
        var wrong = [];
        for (var i = 0; i < q.c.length; i++) if (i !== q.a) wrong.push(i);
        eliminate = wrong[rng.int(wrong.length)];
      }
      var order = rng.shuffle([0, 1, 2, 3]);
      return {
        prompt: q.q,
        choices: order.map(function (i) { return q.c[i]; }),
        answer: order.indexOf(q.a),
        eliminated: eliminate === null ? -1 : order.indexOf(eliminate),
        picked: -1
      };
    });

    r.done();
    return {
      subject: subject,
      subjectName: SS.Questions.subject(subject).name,
      kind: kind,
      questions: questions,
      index: 0,
      correct: 0,
      finished: false
    };
  }

  function answer(paper, choice) {
    var q = paper.questions[paper.index];
    if (!q || q.picked >= 0) return null;
    q.picked = choice;
    var right = choice === q.answer;
    if (right) paper.correct++;
    return { right: right, correct: q.answer };
  }

  function next(paper) {
    paper.index++;
    if (paper.index >= paper.questions.length) { paper.finished = true; return false; }
    return true;
  }

  function record(state, paper) {
    var total = paper.questions.length;
    var percent = total ? (paper.correct / total) * 100 : 0;
    state.examLog.push({
      subject: paper.subject, kind: paper.kind, percent: percent,
      correct: paper.correct, total: total, day: state.day, week: state.week
    });
    if (paper.kind === 'final') state.finals[paper.subject] = percent;
    state.pendingExam = null;

    var stressHit = percent >= 70 ? -4 : percent >= 50 ? 4 : 10;
    State.apply(state, { stress: stressHit, energy: -6 }, {});

    var comment;
    if (percent >= 90) comment = 'You knew that cold.';
    else if (percent >= 70) comment = 'Solid. A couple of careless ones.';
    else if (percent >= 50) comment = 'A pass, and a list of things to go back over.';
    else if (percent >= 25) comment = 'That did not go well, and you knew it halfway through.';
    else comment = 'You were guessing by question three.';

    return {
      percent: percent, correct: paper.correct, total: total,
      comment: comment,
      subjectName: paper.subjectName,
      kind: paper.kind
    };
  }

  /* Walking out, or never turning up, is recorded as a zero. */
  function miss(state, pending) {
    if (!pending) return;
    state.examLog.push({
      subject: pending.subject, kind: pending.kind, percent: 0,
      correct: 0, total: 0, day: state.day, week: state.week, missed: true
    });
    if (pending.kind === 'final') state.finals[pending.subject] = 0;
    state.pendingExam = null;
    State.apply(state, { stress: 14, discipline: -6 }, {});
    State.toast('You missed the ' + SS.Questions.subject(pending.subject).name + ' ' + pending.kind, 'bad');
  }

  SS.Exams = { build: build, answer: answer, next: next, record: record, miss: miss };
})(window.SS = window.SS || {});
