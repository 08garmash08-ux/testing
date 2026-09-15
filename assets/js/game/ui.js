/* All the screen furniture: the heads-up display, the modal stack, and the
   individual screens. The simulation never talks to the DOM directly; it
   raises events and this module decides what the player sees. */
(function (SS) {
  'use strict';

  var u = SS.util;
  var State = SS.State;

  var dom = {};
  var stack = [];
  var game = null;              /* set by main.js so screens can act on it */
  var focusGame = { active: false, pos: 0.5, dir: 1, speed: 0.55, zone: 0.4, width: 0.24, value: 1 };

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }

  function init(refs, gameRef) {
    dom = refs;
    game = gameRef;
    dom.btnInteract.addEventListener('click', function () { SS.Input.virtualPress('interact'); });
    dom.btnMenu.addEventListener('click', function () { SS.Input.virtualPress('menu'); });
    dom.btnFocus.addEventListener('click', function () { SS.Input.virtualPress('focus'); });
    dom.btnSpeed.addEventListener('click', function () { SS.Input.virtualPress('speed'); });
    dom.btnMap.addEventListener('click', function () { screens.map(); });
    dom.overlay.addEventListener('click', function (e) {
      if (e.target === dom.overlay) {
        var top = stack[stack.length - 1];
        if (top && top.dismissible) close();
      }
    });
  }

  /* ---------- modal stack ---------- */

  function isOpen() { return stack.length > 0; }

  function open(spec) {
    var card = el('div', 'card' + (spec.wide ? ' card-wide' : ''));
    if (spec.title) {
      var head = el('div', 'card-head');
      head.appendChild(el('h2', null, spec.title));
      if (spec.desc) head.appendChild(el('p', 'muted', spec.desc));
      card.appendChild(head);
    }
    var body = el('div', 'card-body');
    card.appendChild(body);
    if (spec.build) spec.build(body, card);
    if (spec.buttons && spec.buttons.length) {
      var foot = el('div', 'card-foot');
      spec.buttons.forEach(function (b) {
        var btn = el('button', 'btn' + (b.primary ? ' btn-primary' : ''), b.label);
        btn.addEventListener('click', function () {
          SS.Audio.sfx.blip();
          if (b.action) b.action();
        });
        foot.appendChild(btn);
      });
      card.appendChild(foot);
    }
    stack.push({ node: card, dismissible: spec.dismissible !== false, onClose: spec.onClose });
    clear(dom.overlay);
    dom.overlay.appendChild(card);
    dom.overlay.classList.remove('hidden');
    dom.app.classList.add('modal-open');
    var first = card.querySelector('button, input, select');
    if (first && !('ontouchstart' in window)) { try { first.focus(); } catch (e) { /* ignore */ } }
    return { card: card, body: body };
  }

  function close() {
    var top = stack.pop();
    if (top && top.onClose) top.onClose();
    clear(dom.overlay);
    if (stack.length) {
      dom.overlay.appendChild(stack[stack.length - 1].node);
    } else {
      dom.overlay.classList.add('hidden');
      dom.app.classList.remove('modal-open');
    }
  }

  function closeAll() { while (stack.length) close(); }

  /* Esc should back out of an ordinary panel but never out of an exam. */
  function tryClose() {
    var top = stack[stack.length - 1];
    if (!top || !top.dismissible) return false;
    close();
    return true;
  }

  /* ---------- toasts ---------- */

  function toast(text, kind) {
    var node = el('div', 'toast toast-' + (kind || 'info'), text);
    dom.toasts.appendChild(node);
    window.setTimeout(function () { node.classList.add('out'); }, 2600);
    window.setTimeout(function () {
      if (node.parentNode) node.parentNode.removeChild(node);
    }, 3200);
    while (dom.toasts.children.length > 4) dom.toasts.removeChild(dom.toasts.firstChild);
  }

  /* ---------- heads-up display ---------- */

  function bar(node, value, max) {
    node.style.width = u.clamp((value / max) * 100, 0, 100).toFixed(1) + '%';
  }

  function updateHud(state, period, roomName) {
    dom.clock.textContent = u.clockText(state.time);
    dom.day.textContent = 'Day ' + state.day + '  ' + SS.Schedule.dayName(state.dayOfWeek) +
                          '  (week ' + state.week + '/' + state.semesterWeeks + ')';
    var lessonText = period.type === 'class'
      ? period.label + (period.roomId ? '  in ' + SS.MapData.roomById(period.roomId).name : '')
      : period.label;
    dom.period.textContent = lessonText;
    dom.room.textContent = roomName;

    var late = period.type === 'class' && period.roomId && period.roomId !== game.currentRoomId();
    dom.period.classList.toggle('alert', !!late);

    bar(dom.barEnergy, state.energy, 100);
    bar(dom.barStress, state.stress, 100);
    bar(dom.barHunger, state.hunger, 100);
    bar(dom.barSocial, state.social, 100);
    dom.money.textContent = u.money(state.money);
    dom.speedLabel.textContent = game.speedLabel();

    dom.statEnergy.textContent = Math.round(state.energy);
    dom.statStress.textContent = Math.round(state.stress);
    dom.statHunger.textContent = Math.round(state.hunger);
    dom.statSocial.textContent = Math.round(state.social);

    dom.hudWarn.classList.toggle('hidden', !(state.energy < 20 || state.hunger < 20 || state.stress > 80));
    if (state.energy < 20) dom.hudWarn.textContent = 'Running on empty';
    else if (state.hunger < 20) dom.hudWarn.textContent = 'You need to eat';
    else if (state.stress > 80) dom.hudWarn.textContent = 'You are wound far too tight';
  }

  function setPrompt(target) {
    if (!target) { dom.prompt.classList.add('hidden'); return; }
    var text = target.type === 'npc' ? 'Talk to ' + target.npc.name : promptFor(target);
    if (!text) { dom.prompt.classList.add('hidden'); return; }
    dom.prompt.classList.remove('hidden');
    dom.prompt.textContent = text;
  }

  var USE_LABEL = {
    bed: 'Bed', desk: 'Desk', chair: 'Seat', board: 'Board', shelf: 'Bookshelves',
    counter: 'Canteen counter', vending: 'Vending machine', gear: 'Gym equipment',
    hoop: 'Basketball hoop', locker: 'Your locker', bench: 'Bench', fountain: 'Water fountain'
  };

  function promptFor(target) {
    var label = USE_LABEL[target.use];
    return label ? label : null;
  }

  /* ---------- in-class focus minigame ---------- */

  function focusReset() {
    focusGame.pos = 0.5; focusGame.dir = 1; focusGame.speed = 0.55;
    focusGame.zone = 0.38; focusGame.width = 0.26; focusGame.value = 1;
  }

  function focusUpdate(dt, active) {
    if (active !== focusGame.active) {
      focusGame.active = active;
      if (active) focusReset();
      dom.focusBar.classList.toggle('hidden', !active);
      dom.btnFocus.classList.toggle('hidden', !active);
    }
    if (!active) return;
    focusGame.pos += focusGame.dir * focusGame.speed * dt;
    if (focusGame.pos > 1) { focusGame.pos = 1; focusGame.dir = -1; }
    if (focusGame.pos < 0) { focusGame.pos = 0; focusGame.dir = 1; }
    focusGame.value = u.approach(focusGame.value, 1, dt * 0.06);
    dom.focusZone.style.left = (focusGame.zone * 100).toFixed(1) + '%';
    dom.focusZone.style.width = (focusGame.width * 100).toFixed(1) + '%';
    dom.focusMarker.style.left = (focusGame.pos * 100).toFixed(1) + '%';
    dom.focusValue.textContent = 'x' + focusGame.value.toFixed(2);
    dom.focusBar.classList.toggle('good', focusGame.value >= 1.25);
    dom.focusBar.classList.toggle('poor', focusGame.value < 0.9);
  }

  function focusTap() {
    if (!focusGame.active) return;
    var hit = focusGame.pos >= focusGame.zone && focusGame.pos <= focusGame.zone + focusGame.width;
    if (hit) {
      focusGame.value = Math.min(1.65, focusGame.value + 0.13);
      focusGame.speed = Math.min(1.4, focusGame.speed + 0.06);
      focusGame.width = Math.max(0.12, focusGame.width - 0.012);
      SS.Audio.sfx.blip();
    } else {
      focusGame.value = Math.max(0.55, focusGame.value - 0.16);
      focusGame.speed = Math.max(0.45, focusGame.speed - 0.04);
      focusGame.width = Math.min(0.3, focusGame.width + 0.02);
      SS.Audio.sfx.cancel();
    }
    focusGame.zone = Math.random() * (1 - focusGame.width);
  }

  function focusValue() { return focusGame.active ? focusGame.value : 1; }

  /* ---------- reusable pieces ---------- */

  function statRow(parent, label, value, max, color, displayValue) {
    var row = el('div', 'stat-row');
    row.appendChild(el('span', 'stat-name', label));
    var track = el('div', 'stat-track');
    var fill = el('div', 'stat-fill');
    fill.style.width = u.clamp((value / max) * 100, 0, 100) + '%';
    if (color) fill.style.background = color;
    track.appendChild(fill);
    row.appendChild(track);
    row.appendChild(el('span', 'stat-val', displayValue === undefined ? Math.round(value) : displayValue));
    parent.appendChild(row);
  }

  /* Green for a strong grade, amber for a pass, red for a fail. */
  function gradeClass(score) { return score >= 80 ? 'ok' : score >= 60 ? 'mid' : 'bad'; }

  function optionList(parent, menu, onPick) {
    menu.options.forEach(function (opt) {
      var state = game.state();
      var allowed = opt.enabled ? opt.enabled(state) : true;
      var btn = el('button', 'option' + (allowed === true ? '' : ' disabled'));
      var top = el('div', 'option-label', opt.label);
      if (opt.color) top.style.borderLeftColor = opt.color;
      btn.appendChild(top);
      var detail = allowed === true ? opt.detail : allowed;
      if (detail) btn.appendChild(el('div', 'option-detail', detail));
      if (allowed === true) {
        btn.addEventListener('click', function () { onPick(opt); });
      } else {
        btn.disabled = true;
      }
      parent.appendChild(btn);
    });
  }

  /* ---------- screens ---------- */

  var screens = {};

  screens.title = function (hasSave) {
    var draft = {
      name: 'Alex',
      look: Math.floor(Math.random() * SS.Render.LOOKS.length),
      difficulty: 'normal'
    };
    open({
      title: 'School Simulator',
      desc: 'One semester. Four subjects. Twenty-four hours in every day, and you need about thirty of them.',
      dismissible: false,
      build: function (body) {
        var intro = el('p', 'lede', 'Go to class or do not. Sleep or do not. The register, the exams and the people all notice.');
        body.appendChild(intro);

        var row = el('div', 'creator');
        var preview = el('canvas', 'preview');
        preview.width = 96; preview.height = 120;
        row.appendChild(preview);

        var fields = el('div', 'fields');
        var nameWrap = el('label', 'field');
        nameWrap.appendChild(el('span', null, 'Your name'));
        var input = el('input');
        input.type = 'text';
        input.maxLength = 16;
        input.value = draft.name;
        input.addEventListener('input', function () { draft.name = input.value || 'Alex'; });
        nameWrap.appendChild(input);
        fields.appendChild(nameWrap);

        var lookWrap = el('div', 'field');
        lookWrap.appendChild(el('span', null, 'Appearance'));
        var lookRow = el('div', 'look-row');
        var prev = el('button', 'btn btn-small', '<');
        var next = el('button', 'btn btn-small', '>');
        var lookLabel = el('span', 'look-label', '1 / ' + SS.Render.LOOKS.length);
        lookRow.appendChild(prev); lookRow.appendChild(lookLabel); lookRow.appendChild(next);
        lookWrap.appendChild(lookRow);
        fields.appendChild(lookWrap);

        var diffWrap = el('div', 'field');
        diffWrap.appendChild(el('span', null, 'Length of term'));
        var diffRow = el('div', 'diff-row');
        Object.keys(State.DIFFICULTY).forEach(function (key) {
          var d = State.DIFFICULTY[key];
          var b = el('button', 'diff' + (key === draft.difficulty ? ' active' : ''));
          b.appendChild(el('strong', null, d.label));
          b.appendChild(el('small', null, d.desc));
          b.addEventListener('click', function () {
            draft.difficulty = key;
            Array.prototype.forEach.call(diffRow.children, function (c) { c.classList.remove('active'); });
            b.classList.add('active');
            SS.Audio.sfx.blip();
          });
          diffRow.appendChild(b);
        });
        diffWrap.appendChild(diffRow);
        fields.appendChild(diffWrap);
        row.appendChild(fields);
        body.appendChild(row);

        function paint() {
          var c = preview.getContext('2d');
          c.clearRect(0, 0, preview.width, preview.height);
          c.save();
          c.translate(preview.width / 2, preview.height * 0.72);
          c.scale(2.4, 2.4);
          SS.Render.drawPerson(c, 0, 0, 'down', 0, SS.Render.LOOKS[draft.look], 1);
          c.restore();
          lookLabel.textContent = (draft.look + 1) + ' / ' + SS.Render.LOOKS.length;
        }
        prev.addEventListener('click', function () {
          draft.look = (draft.look + SS.Render.LOOKS.length - 1) % SS.Render.LOOKS.length; paint();
        });
        next.addEventListener('click', function () {
          draft.look = (draft.look + 1) % SS.Render.LOOKS.length; paint();
        });
        paint();

        var help = el('div', 'help');
        help.appendChild(el('p', null, 'Move with WASD, the arrow keys, a thumbstick on the left of the screen, or by tapping where you want to go.'));
        help.appendChild(el('p', null, 'Press E, Space or the round button to use whatever you are standing in front of.'));
        body.appendChild(help);
      },
      buttons: (hasSave ? [{
        label: 'Continue saved game', primary: true, action: function () {
          close();
          game.loadGame();
        }
      }] : []).concat([{
        label: hasSave ? 'Start a new semester' : 'Start the semester',
        primary: !hasSave,
        action: function () {
          var input = document.querySelector('.card input[type=text]');
          close();
          game.newGame({ name: (input && input.value) || draft.name, look: draft.look, difficulty: draft.difficulty });
        }
      }])
    });
  };

  screens.interaction = function (menu) {
    var ref = open({
      title: menu.title,
      desc: menu.desc,
      build: function (body) {
        optionList(body, menu, function (opt) {
          var state = game.state();
          var result = opt.perform(state) || {};
          if (result.sfx && SS.Audio.sfx[result.sfx]) SS.Audio.sfx[result.sfx]();
          game.afterAction();
          if (result.open === 'planner') { close(); screens.planner(); return; }
          clear(ref.body);
          if (result.speaker) ref.body.appendChild(el('div', 'speaker', result.speaker));
          ref.body.appendChild(el('p', 'result', result.text || ''));
          var summary = el('div', 'mini-stats');
          statRow(summary, 'Energy', state.energy, 100, '#69c07c');
          statRow(summary, 'Stress', state.stress, 100, '#e0705c');
          statRow(summary, 'Hunger', state.hunger, 100, '#e0b44c');
          ref.body.appendChild(summary);
          ref.body.appendChild(el('p', 'muted', 'It is now ' + u.clockText(state.time) + '.'));
          var foot = ref.card.querySelector('.card-foot');
          if (foot) clear(foot); else { foot = el('div', 'card-foot'); ref.card.appendChild(foot); }
          var done = el('button', 'btn btn-primary', 'Back');
          done.addEventListener('click', function () { SS.Audio.sfx.blip(); close(); });
          foot.appendChild(done);
        });
      },
      buttons: [{ label: 'Leave it', action: close }]
    });
  };

  screens.event = function (evt, onDone) {
    open({
      title: evt.title,
      desc: null,
      dismissible: false,
      build: function (body) {
        body.appendChild(el('p', 'lede', evt.text));
        var menu = {
          options: evt.choices.map(function (choice) {
            return {
              label: choice.label,
              detail: null,
              enabled: function () { return true; },
              perform: function (s) {
                State.apply(s, choice.effects, {});
                return { text: choice.result, sfx: 'page' };
              }
            };
          })
        };
        optionList(body, menu, function (opt) {
          var s = game.state();
          var res = opt.perform(s);
          SS.Audio.sfx.page();
          game.afterAction();
          clear(body);
          body.appendChild(el('p', 'result', res.text));
          var b = el('button', 'btn btn-primary', 'Carry on');
          b.addEventListener('click', function () { close(); if (onDone) onDone(); });
          body.appendChild(b);
        });
      },
      buttons: []
    });
  };

  screens.exam = function (paper, onFinished) {
    var answered = false;
    var ref = open({
      title: (paper.kind === 'final' ? 'FINAL EXAM: ' : 'Pop quiz: ') + paper.subjectName,
      desc: null,
      dismissible: false,
      build: function (body) { render(body); },
      buttons: []
    });

    function render(body) {
      clear(body);
      var q = paper.questions[paper.index];
      var progress = el('div', 'progress');
      var fill = el('div', 'progress-fill');
      fill.style.width = ((paper.index / paper.questions.length) * 100) + '%';
      progress.appendChild(fill);
      body.appendChild(progress);
      body.appendChild(el('p', 'muted', 'Question ' + (paper.index + 1) + ' of ' + paper.questions.length));
      body.appendChild(el('p', 'question', q.prompt));

      var list = el('div', 'choices');
      q.choices.forEach(function (text, i) {
        var btn = el('button', 'option choice');
        btn.appendChild(el('div', 'option-label', String.fromCharCode(65 + i) + '.  ' + text));
        if (i === q.eliminated) {
          btn.classList.add('struck');
          btn.appendChild(el('div', 'option-detail', 'You revised this. It is not this one.'));
          btn.disabled = true;
        } else {
          btn.addEventListener('click', function () {
            if (answered) return;
            answered = true;
            var res = SS.Exams.answer(paper, i);
            Array.prototype.forEach.call(list.children, function (c) { c.disabled = true; });
            btn.classList.add(res.right ? 'right' : 'wrong');
            if (!res.right) list.children[res.correct].classList.add('right');
            if (res.right) SS.Audio.sfx.good(); else SS.Audio.sfx.bad();
            var nextBtn = el('button', 'btn btn-primary',
              paper.index + 1 >= paper.questions.length ? 'Hand it in' : 'Next question');
            nextBtn.addEventListener('click', function () {
              answered = false;
              if (SS.Exams.next(paper)) render(body);
              else finish(body);
            });
            body.appendChild(nextBtn);
          });
        }
        list.appendChild(btn);
      });
      body.appendChild(list);
    }

    function finish(body) {
      var state = game.state();
      var res = SS.Exams.record(state, paper);
      clear(body);
      var head = el('h3', 'score', Math.round(res.percent) + '%');
      head.style.color = res.percent >= 70 ? '#69c07c' : res.percent >= 50 ? '#e0b44c' : '#e0705c';
      body.appendChild(head);
      body.appendChild(el('p', 'lede', res.correct + ' of ' + res.total + ' correct. ' + res.comment));
      var note = el('p', 'muted',
        'Your grade blends what you know with how you test. ' + res.subjectName +
        ' understanding is ' + Math.round(state.knowledge[paper.subject]) + '/100.');
      body.appendChild(note);
      var done = el('button', 'btn btn-primary', 'Leave the room');
      done.addEventListener('click', function () {
        close();
        game.afterAction();
        if (onFinished) onFinished(res);
      });
      body.appendChild(done);
      SS.Audio.sfx.bell();
    }
  };

  screens.planner = function () {
    var state = game.state();
    open({
      title: 'Timetable',
      desc: SS.Schedule.dayName(state.dayOfWeek) + ', day ' + state.day + ' of ' +
            (state.semesterWeeks * 7) + '  -  week ' + state.week,
      build: function (body) {
        var plan = SS.Schedule.dayPlan(state);
        if (!plan.length) {
          body.appendChild(el('p', 'lede', 'No lessons today. The campus is yours.'));
        }
        plan.forEach(function (row) {
          var line = el('div', 'plan-row' + (state.time >= row.start && state.time < row.end ? ' now' : ''));
          line.appendChild(el('span', 'plan-time', row.time));
          var mid = el('div', 'plan-mid');
          mid.appendChild(el('strong', null, row.lesson));
          mid.appendChild(el('small', null, row.roomId ? SS.MapData.roomById(row.roomId).name : ''));
          line.appendChild(mid);
          if (row.exam) line.appendChild(el('span', 'tag tag-exam', 'FINAL'));
          else if (row.quiz) line.appendChild(el('span', 'tag tag-quiz', 'QUIZ'));
          body.appendChild(line);
        });
        var tip = el('p', 'muted',
          'Be in the right room when a lesson runs. Attendance is checked, and lessons are where most of your understanding comes from.');
        body.appendChild(tip);
      },
      buttons: [{ label: 'Close', primary: true, action: close }]
    });
  };

  screens.report = function () {
    var state = game.state();
    var rep = State.report(state);
    open({
      title: 'Report card',
      desc: 'Grade = half what you understand, half how you test.',
      wide: true,
      build: function (body) {
        rep.rows.forEach(function (row) {
          var card = el('div', 'grade-row');
          var name = el('div', 'grade-name', row.name);
          name.style.borderLeftColor = row.color;
          card.appendChild(name);
          var bars = el('div', 'grade-bars');
          statRow(bars, 'Understanding', row.knowledge, 100, row.color);
          statRow(bars, 'Exams', row.exam === null ? 0 : row.exam, 100, '#9aa8ff',
                  row.exam === null ? '-' : Math.round(row.exam));
          card.appendChild(bars);
          var letter = el('div', 'grade-letter', row.letter);
          if (row.score >= 80) letter.classList.add('good');
          else if (row.score < 60) letter.classList.add('bad');
          card.appendChild(letter);
          body.appendChild(card);
        });
        var foot = el('div', 'summary');
        var gpaBox = el('div', 'summary-item');
        gpaBox.appendChild(el('strong', null, rep.gpa.toFixed(2)));
        gpaBox.appendChild(el('small', null, 'GPA'));
        foot.appendChild(gpaBox);
        var att = el('div', 'summary-item');
        att.appendChild(el('strong', null, Math.round(State.attendancePercent(state)) + '%'));
        att.appendChild(el('small', null, 'Attendance'));
        foot.appendChild(att);
        var disc = el('div', 'summary-item');
        disc.appendChild(el('strong', null, Math.round(state.discipline)));
        disc.appendChild(el('small', null, 'Standing'));
        foot.appendChild(disc);
        var missed = el('div', 'summary-item');
        missed.appendChild(el('strong', null, String(state.attendance.missed)));
        missed.appendChild(el('small', null, 'Classes missed'));
        foot.appendChild(missed);
        body.appendChild(foot);

        if (state.examLog.length) {
          body.appendChild(el('h3', 'section', 'Papers so far'));
          state.examLog.slice(-8).reverse().forEach(function (e) {
            var line = el('div', 'log-row');
            line.appendChild(el('span', null, 'Day ' + e.day + '  ' + SS.Questions.subject(e.subject).name +
              ' ' + (e.kind === 'final' ? 'final' : 'quiz')));
            var pct = el('strong', gradeClass(e.percent), e.missed ? 'missed' : Math.round(e.percent) + '%');
            line.appendChild(pct);
            body.appendChild(line);
          });
        }
      },
      buttons: [{ label: 'Close', primary: true, action: close }]
    });
  };

  screens.people = function () {
    var state = game.state();
    open({
      title: 'People',
      desc: 'Friendships open up things you cannot do alone.',
      wide: true,
      build: function (body) {
        State.bestFriends(state).forEach(function (f) {
          var npc = SS.NpcData.byId(f.id);
          var row = el('div', 'person-row');
          var swatch = el('div', 'swatch');
          swatch.style.background = npc.color;
          row.appendChild(swatch);
          var mid = el('div', 'person-mid');
          mid.appendChild(el('strong', null, npc.name));
          mid.appendChild(el('small', null, npc.role));
          var track = el('div', 'stat-track');
          var fill = el('div', 'stat-fill');
          fill.style.width = f.value + '%';
          fill.style.background = npc.color;
          track.appendChild(fill);
          mid.appendChild(track);
          if (npc.perk) {
            var unlocked = !!state.perks[npc.perk.id];
            var perk = el('small', 'perk' + (unlocked ? ' on' : ''),
              (unlocked ? 'Unlocked: ' : 'At ' + npc.perk.at + ': ') + npc.perk.label + '  -  ' + npc.perk.desc);
            mid.appendChild(perk);
          }
          row.appendChild(mid);
          row.appendChild(el('span', 'person-val', Math.round(f.value)));
          body.appendChild(row);
        });
      },
      buttons: [{ label: 'Close', primary: true, action: close }]
    });
  };

  screens.map = function () {
    var state = game.state();
    var ref = open({
      title: 'Campus map',
      desc: 'Tap a room to walk there.',
      wide: true,
      build: function (body) {
        var canvas = el('canvas', 'map-canvas');
        var wrap = el('div', 'map-wrap');
        wrap.appendChild(canvas);
        body.appendChild(wrap);
        var label = el('p', 'muted', 'You are in ' + SS.World.playerRoom().name + '.');
        body.appendChild(label);

        window.setTimeout(function () {
          var w = wrap.clientWidth || 480;
          var h = Math.round(w * (SS.MapData.HEIGHT / SS.MapData.WIDTH));
          var dpr = Math.min(window.devicePixelRatio || 1, 2);
          canvas.width = w * dpr; canvas.height = h * dpr;
          canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
          var c = canvas.getContext('2d');
          c.setTransform(dpr, 0, 0, dpr, 0, 0);
          SS.Render.drawMinimap(c, w, h, state);
        }, 0);

        canvas.addEventListener('click', function (e) {
          var rect = canvas.getBoundingClientRect();
          var tx = Math.floor(((e.clientX - rect.left) / rect.width) * SS.MapData.WIDTH);
          var ty = Math.floor(((e.clientY - rect.top) / rect.height) * SS.MapData.HEIGHT);
          var room = SS.MapData.roomAt(tx, ty);
          var spot = SS.MapData.solid(tx, ty) ? SS.MapData.anchor(room.id) : { x: tx, y: ty };
          if (SS.World.walkTo(spot.x, spot.y)) {
            SS.Audio.sfx.confirm();
            close();
            toast('Heading for ' + room.name, 'info');
          } else {
            SS.Audio.sfx.deny();
            label.textContent = 'You cannot get there from here.';
          }
        });
      },
      buttons: [{ label: 'Close', primary: true, action: close }]
    });
    return ref;
  };

  screens.pause = function () {
    var state = game.state();
    open({
      title: 'Paused',
      desc: SS.Schedule.dayName(state.dayOfWeek) + '  ' + u.clockText(state.time) + '  -  ' + SS.World.playerRoom().name,
      build: function (body) {
        var grid = el('div', 'menu-grid');
        function item(label, detail, fn) {
          var b = el('button', 'option');
          b.appendChild(el('div', 'option-label', label));
          if (detail) b.appendChild(el('div', 'option-detail', detail));
          b.addEventListener('click', function () { SS.Audio.sfx.blip(); fn(); });
          grid.appendChild(b);
        }
        item('Report card', 'Grades, attendance, papers', function () { close(); screens.report(); });
        item('Timetable', "Today's lessons", function () { close(); screens.planner(); });
        item('Campus map', 'Find your way, or walk there', function () { close(); screens.map(); });
        item('People', 'Friendships and what they unlock', function () { close(); screens.people(); });
        if (state.items.energyDrinks > 0) {
          item('Drink an energy drink', state.items.energyDrinks + ' left', function () {
            var res = SS.Actions.useEnergyDrink(state);
            SS.Audio.sfx[res.sfx] && SS.Audio.sfx[res.sfx]();
            toast(res.text, 'good');
            game.afterAction();
            close();
          });
        }
        item('Settings', 'Sound, speed, controls', function () { close(); screens.settings(); });
        item('Save game', 'Keeps your place in the semester', function () {
          var ok = game.save();
          toast(ok ? 'Saved' : 'This browser will not let the game save', ok ? 'good' : 'bad');
        });
        body.appendChild(grid);
      },
      buttons: [{ label: 'Back to the day', primary: true, action: close }]
    });
  };

  screens.settings = function () {
    var settings = game.settings();
    open({
      title: 'Settings',
      build: function (body) {
        function toggle(label, value, fn) {
          var row = el('button', 'option toggle' + (value ? ' on' : ''));
          row.appendChild(el('div', 'option-label', label));
          row.appendChild(el('div', 'option-detail', value ? 'On' : 'Off'));
          row.addEventListener('click', function () {
            var next = !row.classList.contains('on');
            row.classList.toggle('on', next);
            row.querySelector('.option-detail').textContent = next ? 'On' : 'Off';
            fn(next);
            SS.Audio.sfx.blip();
          });
          body.appendChild(row);
        }
        toggle('Sound effects', settings.sfx, function (v) { game.setSetting('sfx', v); });
        toggle('Background music', settings.music, function (v) { game.setSetting('music', v); });
        toggle('Show on-screen buttons', settings.touchControls, function (v) { game.setSetting('touchControls', v); });

        body.appendChild(el('h3', 'section', 'Controls'));
        var list = el('div', 'keys');
        [['Move', 'WASD / arrows / thumbstick / tap the ground'],
         ['Run', 'Hold Shift'],
         ['Use or talk', 'E, Space or the round button'],
         ['Focus in class', 'F or the FOCUS button'],
         ['Menu', 'Esc or M'],
         ['Change speed', 'T'],
         ['Campus map', 'The map button, top right']].forEach(function (pair) {
          var row = el('div', 'key-row');
          row.appendChild(el('strong', null, pair[0]));
          row.appendChild(el('span', null, pair[1]));
          list.appendChild(row);
        });
        body.appendChild(list);

        var danger = el('button', 'btn btn-danger', 'Delete saved game');
        danger.addEventListener('click', function () {
          game.clearSave();
          toast('Saved game deleted', 'warn');
        });
        body.appendChild(danger);
      },
      buttons: [{ label: 'Close', primary: true, action: close }]
    });
  };

  screens.ending = function (ending) {
    open({
      title: ending.title,
      desc: null,
      dismissible: false,
      wide: true,
      build: function (body) {
        body.appendChild(el('p', 'lede', ending.blurb));
        var gpa = el('div', 'big-gpa');
        gpa.appendChild(el('strong', null, ending.gpa.toFixed(2)));
        gpa.appendChild(el('small', null, 'final GPA'));
        body.appendChild(gpa);

        ending.rows.forEach(function (row) {
          var line = el('div', 'log-row');
          line.appendChild(el('span', null, row.name));
          var mark = el('strong', gradeClass(row.score), row.letter);
          mark.title = Math.round(row.score) + '/100';
          line.appendChild(mark);
          body.appendChild(line);
        });

        var sum = el('div', 'summary');
        [['Attendance', Math.round(ending.attendance) + '%'],
         ['Class hours', Math.round(ending.totals.classMinutes / 60) + 'h'],
         ['Study hours', Math.round(ending.totals.studyMinutes / 60) + 'h'],
         ['Workouts', String(ending.totals.workouts)],
         ['Conversations', String(ending.totals.chats)],
         ['Money left', u.money(ending.money)]].forEach(function (pair) {
          var d = el('div', 'summary-item');
          d.appendChild(el('strong', null, pair[1]));
          d.appendChild(el('small', null, pair[0]));
          sum.appendChild(d);
        });
        body.appendChild(sum);

        var known = ending.friends.filter(function (f) { return f.value > 0; });
        body.appendChild(el('h3', 'section', 'Who you leave with'));
        if (!known.length) {
          body.appendChild(el('p', 'muted', 'Nobody, really. You passed a lot of people in the corridor.'));
        }
        known.forEach(function (f) {
          var line = el('div', 'log-row');
          line.appendChild(el('span', null, f.name));
          line.appendChild(el('strong', f.value >= 50 ? 'ok' : 'mid', Math.round(f.value) + '/100'));
          body.appendChild(line);
        });
      },
      buttons: [{
        label: 'Start another semester', primary: true, action: function () {
          closeAll();
          game.clearSave();
          screens.title(false);
        }
      }]
    });
  };

  screens.collapse = function (onDone) {
    open({
      title: 'You do not make it to the end of the day',
      dismissible: false,
      build: function (body) {
        body.appendChild(el('p', 'lede',
          'You sit down for a second somewhere between the hallway and your room, and the next thing you know it is morning.'));
        body.appendChild(el('p', 'muted', 'Nothing about tomorrow is easier for it.'));
      },
      buttons: [{ label: 'Wake up', primary: true, action: function () { close(); onDone(); } }]
    });
  };

  SS.UI = {
    init: init,
    el: el,
    clear: clear,
    open: open,
    close: close,
    closeAll: closeAll,
    tryClose: tryClose,
    isOpen: isOpen,
    toast: toast,
    updateHud: updateHud,
    setPrompt: setPrompt,
    focusUpdate: focusUpdate,
    focusTap: focusTap,
    focusValue: focusValue,
    screens: screens
  };
})(window.SS = window.SS || {});
