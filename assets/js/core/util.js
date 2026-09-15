/* Small helpers shared by every other module. */
(function (SS) {
  'use strict';

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function approach(v, target, step) {
    if (v < target) return Math.min(target, v + step);
    return Math.max(target, v - step);
  }

  /* Mulberry32: tiny deterministic PRNG so a save can replay the same luck. */
  function makeRng(seed) {
    var s = seed >>> 0;
    function next() {
      s = (s + 0x6d2b79f5) >>> 0;
      var t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    next.int = function (n) { return Math.floor(next() * n); };
    next.range = function (a, b) { return a + next() * (b - a); };
    next.pick = function (arr) { return arr[Math.floor(next() * arr.length)]; };
    next.chance = function (p) { return next() < p; };
    next.shuffle = function (arr) {
      var a = arr.slice();
      for (var i = a.length - 1; i > 0; i--) {
        var j = Math.floor(next() * (i + 1));
        var t = a[i]; a[i] = a[j]; a[j] = t;
      }
      return a;
    };
    next.state = function () { return s; };
    next.setState = function (v) { s = v >>> 0; };
    return next;
  }

  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  /* Minutes since midnight -> "08:05". */
  function clockText(minutes) {
    var m = ((minutes % 1440) + 1440) % 1440;
    return pad2(Math.floor(m / 60)) + ':' + pad2(Math.floor(m % 60));
  }

  function durationText(minutes) {
    if (minutes < 60) return Math.round(minutes) + ' min';
    var h = Math.floor(minutes / 60), m = Math.round(minutes % 60);
    return h + 'h' + (m ? ' ' + m + 'm' : '');
  }

  function money(n) { return '$' + Math.round(n); }

  function titleCase(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  /* Minimal pub/sub used to keep UI and simulation loosely coupled. */
  function makeBus() {
    var map = {};
    var self = {
      on: function (name, fn) {
        (map[name] || (map[name] = [])).push(fn);
        return function () { self.off(name, fn); };
      },
      off: function (name, fn) {
        var list = map[name];
        if (!list) return;
        var i = list.indexOf(fn);
        if (i >= 0) list.splice(i, 1);
      },
      emit: function (name, payload) {
        var list = map[name];
        if (!list) return;
        list = list.slice();
        for (var i = 0; i < list.length; i++) list[i](payload);
      }
    };
    return self;
  }
  var bus = makeBus();

  SS.util = {
    clamp: clamp,
    lerp: lerp,
    approach: approach,
    makeRng: makeRng,
    pad2: pad2,
    clockText: clockText,
    durationText: durationText,
    money: money,
    titleCase: titleCase,
    makeBus: makeBus
  };
  SS.bus = bus;
})(window.SS = window.SS || {});
