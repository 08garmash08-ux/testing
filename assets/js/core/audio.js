/* All sound is synthesised at runtime, so the game ships with no audio files
   and still works offline. Browsers block audio until a gesture, so the
   context is created lazily on the first unlock() call. */
(function (SS) {
  'use strict';

  var ctx = null;
  var master = null;
  var musicGain = null;
  var musicTimer = null;
  var state = { sfx: true, music: false, ready: false };

  function ensure() {
    if (ctx) return ctx;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try {
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      musicGain = ctx.createGain();
      musicGain.gain.value = 0.0;
      musicGain.connect(master);
      state.ready = true;
    } catch (e) { ctx = null; }
    return ctx;
  }

  function unlock() {
    var c = ensure();
    if (!c) return;
    if (c.state === 'suspended') c.resume().catch(function () {});
    if (state.music && !musicTimer) startMusic();
  }

  function tone(opts) {
    if (!state.sfx) return;
    var c = ensure();
    if (!c || c.state === 'suspended') return;
    var now = c.currentTime;
    var osc = c.createOscillator();
    var gain = c.createGain();
    osc.type = opts.type || 'square';
    osc.frequency.setValueAtTime(opts.from, now);
    if (opts.to && opts.to !== opts.from) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, opts.to), now + opts.dur);
    }
    var vol = (opts.vol === undefined ? 0.14 : opts.vol);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(vol, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + opts.dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(now);
    osc.stop(now + opts.dur + 0.02);
  }

  var SFX = {
    blip:    function () { tone({ from: 520, to: 660, dur: 0.07, type: 'square', vol: 0.08 }); },
    confirm: function () { tone({ from: 440, to: 880, dur: 0.14, type: 'triangle', vol: 0.12 }); },
    cancel:  function () { tone({ from: 380, to: 200, dur: 0.12, type: 'square', vol: 0.09 }); },
    deny:    function () { tone({ from: 200, to: 120, dur: 0.22, type: 'sawtooth', vol: 0.1 }); },
    coin:    function () { tone({ from: 880, to: 1320, dur: 0.12, type: 'triangle', vol: 0.12 }); },
    bell:    function () { tone({ from: 990, to: 660, dur: 0.5, type: 'sine', vol: 0.16 }); },
    good:    function () { tone({ from: 660, to: 990, dur: 0.18, type: 'triangle', vol: 0.14 }); },
    bad:     function () { tone({ from: 300, to: 150, dur: 0.3, type: 'sawtooth', vol: 0.11 }); },
    page:    function () { tone({ from: 300, to: 420, dur: 0.05, type: 'sine', vol: 0.07 }); },
    step:    function () { tone({ from: 150, to: 110, dur: 0.04, type: 'sine', vol: 0.03 }); }
  };

  /* A slow four-chord loop. Quiet, and off unless the player turns it on. */
  var CHORDS = [
    [220.00, 277.18, 329.63],
    [196.00, 246.94, 293.66],
    [174.61, 220.00, 261.63],
    [164.81, 207.65, 246.94]
  ];
  var chordIndex = 0;

  function playChord() {
    var c = ensure();
    if (!c || !state.music) return;
    var notes = CHORDS[chordIndex % CHORDS.length];
    chordIndex++;
    var now = c.currentTime;
    for (var i = 0; i < notes.length; i++) {
      var osc = c.createOscillator();
      var g = c.createGain();
      osc.type = 'sine';
      osc.frequency.value = notes[i] * (i === 2 ? 2 : 1);
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.05, now + 0.6);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 3.6);
      osc.connect(g); g.connect(musicGain);
      osc.start(now); osc.stop(now + 3.7);
    }
  }

  function startMusic() {
    var c = ensure();
    if (!c) return;
    musicGain.gain.setTargetAtTime(0.7, c.currentTime, 0.5);
    playChord();
    musicTimer = window.setInterval(playChord, 3600);
  }

  function stopMusic() {
    if (musicTimer) { window.clearInterval(musicTimer); musicTimer = null; }
    if (ctx && musicGain) musicGain.gain.setTargetAtTime(0, ctx.currentTime, 0.3);
  }

  SS.Audio = {
    sfx: SFX,
    unlock: unlock,
    setSfx: function (on) { state.sfx = !!on; },
    setMusic: function (on) {
      state.music = !!on;
      if (state.music) { unlock(); startMusic(); } else { stopMusic(); }
    },
    get: function () { return { sfx: state.sfx, music: state.music }; }
  };
})(window.SS = window.SS || {});
