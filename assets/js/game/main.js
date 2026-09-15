/* Boot, the frame loop, and the wiring between simulation and screens. */
(function (SS) {
  'use strict';

  var u = SS.util;
  var State = SS.State;

  var canvas, ctx;
  var state = null;
  var settings = { sfx: true, music: false, touchControls: true, speed: 1 };
  var SPEEDS = [1, 2, 4];
  var MINUTES_PER_SECOND = 2.2;

  var running = false;
  var lastFrame = 0;
  var lastRoomId = null;
  var autosaveAt = 0;
  var pendingExamPrompted = false;
  var dom = {};

  /* ---------- helpers exposed to the UI ---------- */

  var api = {
    state: function () { return state; },
    settings: function () { return settings; },
    speedLabel: function () { return settings.speed + 'x'; },
    currentRoomId: function () { return SS.World.playerRoom().id; },
    newGame: newGame,
    loadGame: loadGame,
    save: save,
    clearSave: clearSave,
    setSetting: setSetting,
    afterAction: afterAction
  };

  function setSetting(key, value) {
    settings[key] = value;
    if (key === 'sfx') SS.Audio.setSfx(value);
    if (key === 'music') SS.Audio.setMusic(value);
    if (key === 'touchControls') dom.touch.classList.toggle('hidden', !value);
    SS.Storage.saveSettings(settings);
  }

  /* ---------- lifecycle ---------- */

  function newGame(opts) {
    state = State.create(opts);
    SS.World.init(state, null);
    lastRoomId = SS.World.playerRoom().id;
    autosaveAt = state.time;
    running = true;
    SS.UI.toast('Welcome to your first day, ' + state.name, 'good');
    SS.UI.screens.planner();
    save();
  }

  function loadGame() {
    var data = SS.Storage.load();
    if (!data || !data.state || data.state.version !== State.SAVE_VERSION) {
      SS.UI.toast('That save could not be read', 'bad');
      SS.UI.screens.title(false);
      return;
    }
    state = data.state;
    /* Fill in anything a future field might be missing. */
    var fresh = State.create({ difficulty: state.difficulty, name: state.name });
    for (var k in fresh) {
      if (fresh.hasOwnProperty(k) && state[k] === undefined) state[k] = fresh[k];
    }
    SS.World.init(state, data.world);
    lastRoomId = SS.World.playerRoom().id;
    running = true;
    SS.UI.toast('Loaded: day ' + state.day + ', ' + u.clockText(state.time), 'info');
    if (state.finished && state.ending) SS.UI.screens.ending(state.ending);
  }

  function save() {
    if (!state) return false;
    var copy = JSON.parse(JSON.stringify(state));
    delete copy.period;
    return SS.Storage.save({ state: copy, world: SS.World.snapshot(), savedAt: Date.now() });
  }

  function clearSave() { SS.Storage.clear(); }

  /* Re-sync everything that a time jump inside an action may have changed. */
  function afterAction() {
    SS.World.retargetAll(state);
    checkSemesterEnd();
    maybeAutosave(true);
  }

  function maybeAutosave(force) {
    if (!state) return;
    var minutesSince = state.time - autosaveAt;
    if (minutesSince < 0) minutesSince += 1440;
    if (force || minutesSince >= 120) {
      autosaveAt = state.time;
      save();
    }
  }

  function checkSemesterEnd() {
    if (!state || state.finished) return;
    var last = SS.Schedule.lastSchoolDay(state.semesterWeeks);
    var finalsDone = SS.Schedule.FINALS_ORDER.every(function (s) {
      return state.finals[s] !== undefined;
    });
    if (state.day > last || (state.day === last && finalsDone && state.time >= 13 * 60)) {
      var ending = State.finish(state);
      running = false;
      save();
      SS.UI.closeAll();
      SS.UI.screens.ending(ending);
    }
  }

  /* ---------- random events ---------- */

  function rollEvent(trigger) {
    if (!state || state.finished || SS.UI.isOpen()) return;
    if (state.eventCooldown > 0) return;
    var room = SS.World.playerRoom();
    var r = State.rngFor(state);
    var rng = r.next;
    var chance = trigger === 'period' ? 0.3 : 0.22;
    if (rng() > chance) { r.done(); state.eventCooldown = 25; return; }

    var pool = SS.EventData.list.filter(function (e) {
      var placeOk = e.where.indexOf('any') >= 0 || e.where.indexOf(room.id) >= 0;
      if (!placeOk) return false;
      if (e.cond && !e.cond(state)) return false;
      if (state.flags['event_' + e.id] && e.id === 'clubSheet') return false;
      return true;
    });
    if (!pool.length) { r.done(); state.eventCooldown = 40; return; }

    var total = pool.reduce(function (n, e) { return n + e.weight; }, 0);
    var pick = rng() * total;
    var chosen = pool[0];
    for (var i = 0; i < pool.length; i++) {
      pick -= pool[i].weight;
      if (pick <= 0) { chosen = pool[i]; break; }
    }
    r.done();
    state.eventCooldown = 240;
    state.flags['event_' + chosen.id] = true;
    SS.Audio.sfx.page();
    SS.UI.screens.event(chosen, function () { afterAction(); });
  }

  /* ---------- exams ---------- */

  function handleExam(period) {
    if (!state.pendingExam) { pendingExamPrompted = false; return; }
    var pending = state.pendingExam;
    /* The window has closed: the paper goes down as a zero. */
    if (!(period.type === 'class' && (period.quiz || period.exam) && period.subject === pending.subject)) {
      SS.Exams.miss(state, pending);
      pendingExamPrompted = false;
      return;
    }
    if (SS.UI.isOpen()) return;
    if (SS.World.playerRoom().id !== pending.roomId) {
      if (!pendingExamPrompted) {
        pendingExamPrompted = true;
        SS.UI.toast((pending.kind === 'final' ? 'FINAL' : 'Quiz') + ' in ' +
                    SS.MapData.roomById(pending.roomId).name + ' right now', 'warn');
        SS.Audio.sfx.bell();
      }
      return;
    }
    pendingExamPrompted = false;
    var paper = SS.Exams.build(state, pending.subject, pending.kind);
    SS.UI.screens.exam(paper, function () { checkSemesterEnd(); });
  }

  /* ---------- the frame ---------- */

  function frame(now) {
    window.requestAnimationFrame(frame);
    var dt = Math.min(0.05, (now - lastFrame) / 1000);
    lastFrame = now;
    if (!state) return;

    SS.Input.update();

    var modal = SS.UI.isOpen();
    if (SS.Input.pressed('menu')) {
      if (modal) { SS.UI.tryClose(); }
      else if (running) { SS.Audio.sfx.blip(); SS.UI.screens.pause(); }
    }

    var period = SS.Schedule.periodAt(state, state.time);
    state.period = period;
    var room = SS.World.playerRoom();

    if (!modal && running) {
      var control = { axis: SS.Input.axis(), run: SS.Input.held('run') };
      SS.World.update(dt, state, control);

      var tap = SS.Input.takeTap();
      if (tap) {
        var world = SS.Render.screenToWorld(tap.x, tap.y);
        var tx = Math.floor(world.x), ty = Math.floor(world.y);
        var npc = null;
        for (var i = 0; i < SS.World.npcs.length; i++) {
          var n2 = SS.World.npcs[i];
          if (n2.visible && Math.abs(n2.x - world.x) < 0.7 && Math.abs(n2.y - world.y) < 1) { npc = n2; break; }
        }
        if (npc) {
          SS.World.walkTo(Math.floor(npc.x), Math.floor(npc.y));
        } else if (!SS.World.walkTo(tx, ty)) {
          SS.Audio.sfx.deny();
        }
      }

      /* Focus only counts for lessons you can actually revise for. */
      var academic = period.type === 'class' && period.subject &&
                     state.knowledge.hasOwnProperty(period.subject) &&
                     !period.quiz && !period.exam;
      var focusActive = academic && room.id === period.roomId;
      SS.UI.focusUpdate(dt, focusActive);
      if (SS.Input.pressed('focus')) SS.UI.focusTap();

      if (SS.Input.pressed('speed')) {
        var idx = SPEEDS.indexOf(settings.speed);
        setSetting('speed', SPEEDS[(idx + 1) % SPEEDS.length]);
        SS.Audio.sfx.blip();
      }

      var target = SS.World.interactTarget();
      SS.UI.setPrompt(target);
      dom.btnInteract.textContent = target
        ? (target.type === 'npc' ? 'TALK' : 'USE')
        : 'USE';
      dom.btnInteract.classList.toggle('dim', !target);

      if (SS.Input.pressed('interact')) {
        if (target) {
          var menu = SS.Actions.forTarget(state, target);
          if (menu) { SS.Audio.sfx.blip(); SS.UI.screens.interaction(menu); }
          else SS.Audio.sfx.deny();
        } else if (focusActive) {
          SS.UI.focusTap();
        } else {
          SS.Audio.sfx.deny();
        }
      }

      /* advance the clock */
      var minutes = dt * MINUTES_PER_SECOND * settings.speed;
      var before = state.day;
      State.advance(state, minutes, {
        roomId: room.id,
        outdoors: !room.indoor,
        running: SS.World.player.running,
        focus: SS.UI.focusValue()
      });
      state.eventCooldown = Math.max(0, state.eventCooldown - minutes);

      if (room.id !== lastRoomId) {
        lastRoomId = room.id;
        state.flags.seated = false;
        rollEvent('room');
      }
      if (state.day !== before) afterAction();

      handleExam(SS.Schedule.periodAt(state, state.time));
      maybeAutosave(false);
      checkSemesterEnd();
    } else {
      SS.UI.focusUpdate(dt, false);
    }

    SS.Render.frame(ctx, state, { target: running && !modal ? SS.World.interactTarget() : null });
    SS.UI.updateHud(state, period, room.name);
  }

  /* ---------- boot ---------- */

  function boot() {
    canvas = document.getElementById('game');
    ctx = canvas.getContext('2d');

    dom = {
      app: document.getElementById('app'),
      overlay: document.getElementById('overlay'),
      toasts: document.getElementById('toasts'),
      touch: document.getElementById('touch'),
      clock: document.getElementById('clock'),
      day: document.getElementById('day'),
      period: document.getElementById('period'),
      room: document.getElementById('room'),
      money: document.getElementById('money'),
      prompt: document.getElementById('prompt'),
      hudWarn: document.getElementById('hud-warn'),
      speedLabel: document.getElementById('speed-label'),
      barEnergy: document.getElementById('bar-energy'),
      barStress: document.getElementById('bar-stress'),
      barHunger: document.getElementById('bar-hunger'),
      barSocial: document.getElementById('bar-social'),
      statEnergy: document.getElementById('stat-energy'),
      statStress: document.getElementById('stat-stress'),
      statHunger: document.getElementById('stat-hunger'),
      statSocial: document.getElementById('stat-social'),
      focusBar: document.getElementById('focus-bar'),
      focusZone: document.getElementById('focus-zone'),
      focusMarker: document.getElementById('focus-marker'),
      focusValue: document.getElementById('focus-value'),
      btnInteract: document.getElementById('btn-interact'),
      btnMenu: document.getElementById('btn-menu'),
      btnFocus: document.getElementById('btn-focus'),
      btnSpeed: document.getElementById('btn-speed'),
      btnMap: document.getElementById('btn-map')
    };

    var stored = SS.Storage.loadSettings();
    for (var k in stored) if (stored.hasOwnProperty(k)) settings[k] = stored[k];
    if (SPEEDS.indexOf(settings.speed) < 0) settings.speed = 1;
    SS.Audio.setSfx(settings.sfx);
    if (settings.music) SS.Audio.setMusic(true);
    dom.touch.classList.toggle('hidden', !settings.touchControls);

    SS.UI.init(dom, api);
    SS.Input.attach(canvas);
    SS.Render.resize(canvas);

    window.addEventListener('resize', function () { SS.Render.resize(canvas); });
    window.addEventListener('orientationchange', function () {
      window.setTimeout(function () { SS.Render.resize(canvas); }, 250);
    });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { save(); lastFrame = performance.now(); }
      else lastFrame = performance.now();
    });

    SS.bus.on('toast', function (p) { SS.UI.toast(p.text, p.kind); });
    SS.bus.on('periodChanged', function (p) {
      if (p.period.type === 'class') SS.Audio.sfx.bell();
      if (p.period.type === 'class' && p.period.roomId) {
        SS.UI.toast(p.period.label + ' in ' + SS.MapData.roomById(p.period.roomId).name, 'info');
      } else if (p.period.type === 'lunch') {
        SS.UI.toast('Lunch', 'info');
      }
      rollEvent('period');
    });
    SS.bus.on('perk', function (p) {
      SS.UI.toast(p.npc.name + ': ' + p.perk.label + ' unlocked', 'good');
      SS.Audio.sfx.good();
    });
    SS.bus.on('collapse', function () {
      if (SS.UI.isOpen()) SS.UI.closeAll();
      SS.UI.screens.collapse(function () {
        state.totals.allNighters++;
        SS.Actions.doSleep(state, 7 * 60, '');
        state.energy = Math.min(state.energy, 62);
        state.stress = Math.min(100, state.stress + 10);
        afterAction();
      });
    });

    lastFrame = performance.now();
    window.requestAnimationFrame(frame);

    /* Something has to be on screen before the first state exists. */
    state = State.create({ difficulty: 'normal' });
    SS.World.init(state, null);
    running = false;
    SS.UI.screens.title(SS.Storage.hasSave());
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  SS.Game = api;
})(window.SS = window.SS || {});
