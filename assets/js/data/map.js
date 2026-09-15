/* The whole campus as one tile grid. Rows are read once at boot into a
   typed lookup; rooms are rectangles used for "where am I" and for deciding
   whether the player is actually sitting in the right class. */
(function (SS) {
  'use strict';

  var ROWS = [
    '###||###||###||###||###||###||###||###||###||###||###||#####',
    '#.WWWWWWWWWWW.#.WWWWWWWWWWW.#.WWWWWWWWWWW.#.WWWWWWWWWWWWWW.#',
    '#........TT...#........TT...#........TT...#........TT......#',
    '#........c....#........c....#........c....#........c.......#',
    '|.TT.TT.TT.TT.#.TT.TT.TT.TT.#.TT.TT.TT.TT.#.TT.TT.TT.TT.TT.|',
    '|.cc.cc.cc.cc.#.cc.cc.cc.cc.#.cc.cc.cc.cc.#.cc.cc.cc.cc.cc.|',
    '#.TT.TT.TT.TT.#.TT.TT.TT.TT.#.TT.TT.TT.TT.#.TT.TT.TT.TT.TT.#',
    '#.cc.cc.cc.cc.#.cc.cc.cc.cc.#.cc.cc.cc.cc.#.cc.cc.cc.cc.cc.#',
    '|.TT.TT.TT.TT.#.TT.TT.TT.TT.#.TT.TT.TT.TT.#.TT.TT.TT.TT.TT.|',
    '|.cc.cc.cc.cc.#.cc.cc.cc.cc.#.cc.cc.cc.cc.#.cc.cc.cc.cc.cc.|',
    '#.............#.............#.............#................#',
    '#######D#############D#############D#############D##########',
    '#.LLLL...LLLL...LLLL....LLLL..V......LLLL....LLLL...LLLL.P.#',
    '#..........................................................#',
    '#P.LLLL....LLLL...LLLL.....LLLL......LLLL.....LLLL......V..#',
    '########D##############D########....#######D##########D#####',
    '#..............P#.P..........P.#....#.GGG.o..GGG.#.........#',
    '#.SS..SS..SScTT.#..ccc..ccc....#L...#.G........G.#.SSS.SSS.#',
    '|.SS..SS..SS....#..TTT..TTT....#L..V#............#.........|',
    '|.SS..SS..SScTT.#..TTT..TTT....#L...#............#..cTT....|',
    '#...............#..ccc..ccc....#L...#............#...cc....#',
    '#.SS..SS..SScTT.#..TTT..TTT....#L..P#............#.........#',
    '|.SS..SS..SS....#..TTT..TTT....#L...#............#.........|',
    '|.SS..SS..SScTT.#..ccc..ccc....#....#............#.........|',
    '#...............#..............#....#............#.........#',
    '#.P.............#.FFFFFFFFFF.V.#....#.....o......#.P.....P.#',
    '#####||#####||#######||#####||###DD#########||######||######',
    'f,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,____,~~,,,,,,,,,,,,,,,,,,,,f',
    'f,,,,,t,,,t,,,t,,,,,t,,,t,,,,,=,____,~~,=,,,t,,,t,,,t,,,t,,f',
    'f__________________________________________________________f',
    'f,########D########,=,,,,,,,,,,=,__,=,,,,,,,,,,,,,,,,,,,,,,f',
    'f,#..............P#,,,t,,,,,,,,,,__,,,,,________o________,,f',
    'f,#.BBT........TT.#,,,,,,,t,,,,,,__,,,,,_________________,,f',
    'f,#.BB.........cc.#,=,,,,,,,,,,=,__,=,,,_________________,,f',
    'f,|...............|,,,t,,,,,,,,,,__,,,,,_________________,,f',
    'f,|...............|,,,,,,,,,,,,,,__,,,,,_________________,,f',
    'f,#.BBT........SS.#,,,,,,,t,,,,,,__,,,,,_________________,,f',
    'f,#.BB.........SS.#,,,t,,,,,,,,,,__,,,,,_________________,,f',
    'f,#...............#,,,,,,,,,,,,,,__,,,,,_________________,,f',
    'f,#P.............V#,,,,,,,,,,t,,,__,,,,,________o________,,f',
    'f,#################,t,,,t,,,t,,,,__,,t,,,,,,,,,,,,,,,,,,,,,f',
    'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
  ];

  /* use: the verb offered when the player faces this tile. */
  var TILES = {
    '#': { name: 'wall',     solid: true },
    '|': { name: 'window',   solid: true },
    '.': { name: 'floor',    solid: false },
    ',': { name: 'grass',    solid: false },
    '_': { name: 'path',     solid: false },
    'D': { name: 'door',     solid: false },
    'T': { name: 'desk',     solid: true,  use: 'desk' },
    'c': { name: 'chair',    solid: false, use: 'chair' },
    'W': { name: 'board',    solid: true,  use: 'board' },
    'S': { name: 'shelf',    solid: true,  use: 'shelf' },
    'F': { name: 'counter',  solid: true,  use: 'counter' },
    'G': { name: 'gear',     solid: true,  use: 'gear' },
    'B': { name: 'bed',      solid: true,  use: 'bed' },
    'L': { name: 'locker',   solid: true,  use: 'locker' },
    'V': { name: 'vending',  solid: true,  use: 'vending' },
    '=': { name: 'bench',    solid: true,  use: 'bench' },
    't': { name: 'tree',     solid: true },
    'f': { name: 'fence',    solid: true },
    '~': { name: 'fountain', solid: true,  use: 'fountain' },
    'o': { name: 'hoop',     solid: true,  use: 'hoop' },
    'P': { name: 'plant',    solid: true }
  };

  /* subject is set on the four teaching rooms so class attendance can be
     checked by room rather than by hunting for a desk. */
  var ROOMS = [
    { id: 'math',       name: 'Math Room',       x0: 1,  y0: 1,  x1: 13, y1: 10, indoor: true, subject: 'math' },
    { id: 'science',    name: 'Science Lab',     x0: 15, y0: 1,  x1: 27, y1: 10, indoor: true, subject: 'science' },
    { id: 'literature', name: 'Literature Room', x0: 29, y0: 1,  x1: 41, y1: 10, indoor: true, subject: 'literature' },
    { id: 'history',    name: 'History Room',    x0: 43, y0: 1,  x1: 58, y1: 10, indoor: true, subject: 'history' },
    { id: 'hallway',    name: 'Main Hallway',    x0: 1,  y0: 11, x1: 58, y1: 15, indoor: true },
    { id: 'library',    name: 'Library',         x0: 1,  y0: 16, x1: 15, y1: 25, indoor: true },
    { id: 'cafeteria',  name: 'Cafeteria',       x0: 17, y0: 16, x1: 30, y1: 25, indoor: true },
    { id: 'lobby',      name: 'Lobby',           x0: 32, y0: 15, x1: 35, y1: 26, indoor: true },
    { id: 'gym',        name: 'Gymnasium',       x0: 37, y0: 16, x1: 48, y1: 25, indoor: true, subject: 'pe' },
    { id: 'office',     name: 'Front Office',    x0: 50, y0: 16, x1: 58, y1: 25, indoor: true },
    { id: 'dorm',       name: 'Your Room',       x0: 3,  y0: 31, x1: 17, y1: 39, indoor: true },
    { id: 'court',      name: 'Basketball Court',x0: 40, y0: 31, x1: 56, y1: 39, indoor: false },
    { id: 'yard',       name: 'Schoolyard',      x0: 0,  y0: 27, x1: 59, y1: 41, indoor: false }
  ];

  var WIDTH = ROWS[0].length;
  var HEIGHT = ROWS.length;

  function at(x, y) {
    if (x < 0 || y < 0 || x >= WIDTH || y >= HEIGHT) return '#';
    return ROWS[y].charAt(x);
  }

  function info(x, y) { return TILES[at(x, y)] || TILES['#']; }
  function solid(x, y) { return info(x, y).solid; }

  function roomAt(x, y) {
    for (var i = 0; i < ROOMS.length; i++) {
      var r = ROOMS[i];
      if (x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1) return r;
    }
    return { id: 'outside', name: 'Campus Grounds', indoor: false };
  }

  function roomById(id) {
    for (var i = 0; i < ROOMS.length; i++) if (ROOMS[i].id === id) return ROOMS[i];
    return null;
  }

  /* A sensible standing spot inside a room, used to place people and to
     send the player somewhere with the "go to" shortcuts. */
  function anchor(id) {
    var r = roomById(id);
    if (!r) return { x: 33, y: 35 };
    var cx = Math.round((r.x0 + r.x1) / 2), cy = Math.round((r.y0 + r.y1) / 2);
    for (var radius = 0; radius < 8; radius++) {
      for (var dy = -radius; dy <= radius; dy++) {
        for (var dx = -radius; dx <= radius; dx++) {
          var x = cx + dx, y = cy + dy;
          if (x < r.x0 || x > r.x1 || y < r.y0 || y > r.y1) continue;
          if (!solid(x, y)) return { x: x, y: y };
        }
      }
    }
    return { x: cx, y: cy };
  }

  SS.MapData = {
    TILE: 32,
    WIDTH: WIDTH,
    HEIGHT: HEIGHT,
    ROWS: ROWS,
    TILES: TILES,
    ROOMS: ROOMS,
    at: at,
    info: info,
    solid: solid,
    roomAt: roomAt,
    roomById: roomById,
    anchor: anchor,
    spawn: { x: 10, y: 34 }
  };
})(window.SS = window.SS || {});
