/* A* over the tile grid, used for tap-to-move and for NPC strolling. */
(function (SS) {
  'use strict';

  function key(x, y) { return y * 4096 + x; }

  /* isOpen(x, y) -> bool. Returns a list of {x, y} tile centres, or null. */
  function find(sx, sy, tx, ty, isOpen, limit) {
    limit = limit || 4000;
    if (!isOpen(tx, ty)) {
      var best = null, bestD = Infinity;
      for (var dy = -2; dy <= 2; dy++) {
        for (var dx = -2; dx <= 2; dx++) {
          var nx = tx + dx, ny = ty + dy;
          if (!isOpen(nx, ny)) continue;
          var d = dx * dx + dy * dy;
          if (d < bestD) { bestD = d; best = { x: nx, y: ny }; }
        }
      }
      if (!best) return null;
      tx = best.x; ty = best.y;
    }
    if (sx === tx && sy === ty) return [];

    var open = [{ x: sx, y: sy, g: 0, f: 0 }];
    var cameFrom = {};
    var gScore = {};
    gScore[key(sx, sy)] = 0;
    var closed = {};
    var visited = 0;

    while (open.length) {
      /* Linear scan for the cheapest node: the grid is small enough that a
         binary heap would cost more in code than it saves in time. */
      var bi = 0;
      for (var i = 1; i < open.length; i++) if (open[i].f < open[bi].f) bi = i;
      var cur = open.splice(bi, 1)[0];
      var ck = key(cur.x, cur.y);
      if (closed[ck]) continue;
      closed[ck] = 1;
      if (++visited > limit) return null;

      if (cur.x === tx && cur.y === ty) {
        var path = [];
        var k = ck;
        var cx = cur.x, cy = cur.y;
        while (!(cx === sx && cy === sy)) {
          path.push({ x: cx, y: cy });
          var prev = cameFrom[k];
          if (!prev) return null;
          cx = prev.x; cy = prev.y; k = key(cx, cy);
        }
        path.reverse();
        return path;
      }

      for (var d = 0; d < 4; d++) {
        var nx2 = cur.x + (d === 0 ? 1 : d === 1 ? -1 : 0);
        var ny2 = cur.y + (d === 2 ? 1 : d === 3 ? -1 : 0);
        if (!isOpen(nx2, ny2)) continue;
        var nk = key(nx2, ny2);
        if (closed[nk]) continue;
        var ng = cur.g + 1;
        if (gScore[nk] !== undefined && ng >= gScore[nk]) continue;
        gScore[nk] = ng;
        cameFrom[nk] = { x: cur.x, y: cur.y };
        var h = Math.abs(nx2 - tx) + Math.abs(ny2 - ty);
        open.push({ x: nx2, y: ny2, g: ng, f: ng + h });
      }
    }
    return null;
  }

  SS.Pathfind = { find: find };
})(window.SS = window.SS || {});
