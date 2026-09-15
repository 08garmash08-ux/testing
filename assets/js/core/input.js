/* One input layer for three very different machines:
   - desktop: keyboard, mouse click-to-walk, optional gamepad
   - phone/tablet: a floating thumbstick on the left, tap-to-walk anywhere
   - anything with a controller: left stick plus face buttons
   Everything funnels into the same axis vector and the same action edges. */
(function (SS) {
  'use strict';

  var KEYMAP = {
    ArrowUp: 'up', KeyW: 'up',
    ArrowDown: 'down', KeyS: 'down',
    ArrowLeft: 'left', KeyA: 'left',
    ArrowRight: 'right', KeyD: 'right',
    Space: 'interact', Enter: 'interact', KeyE: 'interact',
    Escape: 'menu', KeyM: 'menu',
    Tab: 'stats', KeyC: 'stats',
    KeyJ: 'journal',
    KeyF: 'focus',
    KeyT: 'speed',
    KeyP: 'pause',
    ShiftLeft: 'run', ShiftRight: 'run',
    Digit1: 'slot1', Digit2: 'slot2', Digit3: 'slot3'
  };

  var down = {};          /* logical name -> true while held */
  var pressedThisFrame = {};
  var queued = {};        /* edges recorded between frames */

  var stick = { active: false, id: null, ox: 0, oy: 0, x: 0, y: 0, moved: false, start: 0, touch: false };
  var tap = null;         /* {x, y} in CSS pixels relative to the canvas */
  var enabled = true;
  var canvas = null;
  var padAxis = { x: 0, y: 0 };
  var padPrev = {};

  var STICK_RADIUS = 52;
  var TAP_SLOP = 14;
  var TAP_MS = 320;

  function press(action) {
    if (!down[action]) queued[action] = true;
    down[action] = true;
  }
  function release(action) { down[action] = false; }

  function onKeyDown(e) {
    var action = KEYMAP[e.code];
    if (!action) return;
    if (e.repeat) { e.preventDefault(); return; }
    press(action);
    if (e.code === 'Space' || e.code === 'Tab' || e.code.indexOf('Arrow') === 0) e.preventDefault();
    SS.Audio.unlock();
  }

  function onKeyUp(e) {
    var action = KEYMAP[e.code];
    if (!action) return;
    release(action);
  }

  function localPoint(e) {
    var r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function onPointerDown(e) {
    if (!enabled) return;
    SS.Audio.unlock();
    var p = localPoint(e);
    var isTouch = e.pointerType !== 'mouse';
    if (isTouch && !stick.active) {
      stick.active = true; stick.id = e.pointerId;
      stick.ox = p.x; stick.oy = p.y; stick.x = 0; stick.y = 0;
      stick.moved = false; stick.start = performance.now(); stick.touch = true;
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    } else if (!isTouch) {
      stick.active = true; stick.id = e.pointerId;
      stick.ox = p.x; stick.oy = p.y; stick.moved = false;
      stick.start = performance.now(); stick.touch = false;
    }
    e.preventDefault();
  }

  function onPointerMove(e) {
    if (!stick.active || e.pointerId !== stick.id) return;
    var p = localPoint(e);
    var dx = p.x - stick.ox, dy = p.y - stick.oy;
    if (Math.abs(dx) > TAP_SLOP || Math.abs(dy) > TAP_SLOP) stick.moved = true;
    if (!stick.touch) return;             /* mouse drag never steers */
    var len = Math.hypot(dx, dy);
    if (len > STICK_RADIUS) { dx *= STICK_RADIUS / len; dy *= STICK_RADIUS / len; }
    stick.x = dx / STICK_RADIUS;
    stick.y = dy / STICK_RADIUS;
  }

  function onPointerUp(e) {
    if (!stick.active || e.pointerId !== stick.id) return;
    var p = localPoint(e);
    var quick = performance.now() - stick.start < TAP_MS;
    if (!stick.moved && quick) tap = { x: p.x, y: p.y };
    stick.active = false; stick.id = null; stick.x = 0; stick.y = 0; stick.touch = false;
    try { canvas.releasePointerCapture(e.pointerId); } catch (err) { /* ignore */ }
  }

  function pollGamepad() {
    padAxis.x = 0; padAxis.y = 0;
    if (!navigator.getGamepads) return;
    var pads;
    try { pads = navigator.getGamepads(); } catch (e) { return; }
    for (var i = 0; i < pads.length; i++) {
      var gp = pads[i];
      if (!gp || !gp.connected) continue;
      var ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
      if (Math.abs(ax) > 0.22) padAxis.x = ax;
      if (Math.abs(ay) > 0.22) padAxis.y = ay;
      if (gp.axes.length > 9) {          /* d-pad reported as a hat on some pads */
        var hat = gp.axes[9];
        if (hat >= -1.1 && hat <= 1.1) {
          if (Math.abs(hat + 0.71) < 0.1) padAxis.y = -1;
          if (Math.abs(hat - 0.14) < 0.1) padAxis.y = 1;
        }
      }
      var buttons = { 0: 'interact', 1: 'menu', 9: 'menu', 2: 'stats', 3: 'focus', 10: 'run',
                      12: 'up', 13: 'down', 14: 'left', 15: 'right' };
      for (var b in buttons) {
        if (!Object.prototype.hasOwnProperty.call(buttons, b)) continue;
        var btn = gp.buttons[b];
        var hit = !!(btn && (btn.pressed || btn.value > 0.5));
        var pk = i + ':' + b;
        if (hit && !padPrev[pk]) press(buttons[b]);
        if (!hit && padPrev[pk]) release(buttons[b]);
        padPrev[pk] = hit;
      }
      break;
    }
  }

  var Input = {
    attach: function (canvasEl) {
      canvas = canvasEl;
      window.addEventListener('keydown', onKeyDown);
      window.addEventListener('keyup', onKeyUp);
      window.addEventListener('blur', function () { down = {}; stick.active = false; stick.x = stick.y = 0; });
      canvas.addEventListener('pointerdown', onPointerDown);
      canvas.addEventListener('pointermove', onPointerMove);
      canvas.addEventListener('pointerup', onPointerUp);
      canvas.addEventListener('pointercancel', onPointerUp);
      canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    },

    /* Called once per frame, before anything reads the input state. */
    update: function () {
      pollGamepad();
      pressedThisFrame = queued;
      queued = {};
    },

    setEnabled: function (on) {
      enabled = !!on;
      if (!enabled) { stick.active = false; stick.x = stick.y = 0; tap = null; }
    },

    /* Normalised movement vector from whichever device is being used. */
    axis: function () {
      var x = 0, y = 0;
      if (down.left) x -= 1;
      if (down.right) x += 1;
      if (down.up) y -= 1;
      if (down.down) y += 1;
      if (stick.touch && (stick.x || stick.y)) {
        var dead = 0.22;
        var len = Math.hypot(stick.x, stick.y);
        if (len > dead) {
          var scale = Math.min(1, (len - dead) / (1 - dead)) / len;
          x = stick.x * scale; y = stick.y * scale;
        }
      }
      if (!x && !y && (padAxis.x || padAxis.y)) { x = padAxis.x; y = padAxis.y; }
      var l = Math.hypot(x, y);
      if (l > 1) { x /= l; y /= l; }
      return { x: x, y: y };
    },

    pressed: function (action) { return !!pressedThisFrame[action]; },
    held: function (action) { return !!down[action]; },

    /* Software button presses coming from the on-screen HUD. */
    virtualPress: function (action) { press(action); window.setTimeout(function () { release(action); }, 40); },

    takeTap: function () { var t = tap; tap = null; return t; },

    stickState: function () {
      if (!stick.active || !stick.touch) return null;
      return { ox: stick.ox, oy: stick.oy, x: stick.x, y: stick.y, radius: STICK_RADIUS };
    }
  };

  SS.Input = Input;
})(window.SS = window.SS || {});
