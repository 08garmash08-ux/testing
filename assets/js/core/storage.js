/* localStorage wrapper. Every read is defensive: private mode and cleared
   site data both show up as a throw or as null, and the game must still boot. */
(function (SS) {
  'use strict';

  var KEY = 'school-sim/save/v1';
  var SETTINGS_KEY = 'school-sim/settings/v1';

  function available() {
    try {
      var k = '__ss_probe__';
      window.localStorage.setItem(k, '1');
      window.localStorage.removeItem(k);
      return true;
    } catch (e) { return false; }
  }

  function readJson(key) {
    try {
      var raw = window.localStorage.getItem(key);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) { return null; }
  }

  function writeJson(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) { return false; }
  }

  function remove(key) {
    try { window.localStorage.removeItem(key); } catch (e) { /* ignore */ }
  }

  SS.Storage = {
    ok: available(),
    hasSave: function () { return !!readJson(KEY); },
    load: function () { return readJson(KEY); },
    save: function (data) { return writeJson(KEY, data); },
    clear: function () { remove(KEY); },
    loadSettings: function () { return readJson(SETTINGS_KEY) || {}; },
    saveSettings: function (s) { return writeJson(SETTINGS_KEY, s); }
  };
})(window.SS = window.SS || {});
