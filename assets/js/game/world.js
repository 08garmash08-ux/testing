/* Bodies in space: the player, the cast, collision against the tile grid,
   and working out what the player is currently standing in front of. */
(function (SS) {
  'use strict';

  var M = SS.MapData;
  var u = SS.util;

  var RADIUS = 0.34;          /* player collision radius, in tiles */
  var WALK = 4.3;             /* tiles per second */
  var RUN = 6.6;
  var NPC_SPEED = 2.5;

  var player = null;
  var npcs = [];
  var rng = u.makeRng(1234);

  function isOpen(x, y) { return !M.solid(x, y); }

  function blocked(x, y) {
    /* Sample the four corners of the player's box against the grid. */
    var minX = Math.floor(x - RADIUS), maxX = Math.floor(x + RADIUS);
    var minY = Math.floor(y - RADIUS), maxY = Math.floor(y + RADIUS);
    for (var ty = minY; ty <= maxY; ty++) {
      for (var tx = minX; tx <= maxX; tx++) {
        if (M.solid(tx, ty)) return true;
      }
    }
    return false;
  }

  function moveBody(body, dx, dy) {
    /* Axis-separated so walls slide instead of sticking. */
    if (dx) {
      var nx = body.x + dx;
      if (!blocked(nx, body.y)) body.x = nx;
      else {
        var slid = false;
        for (var s = 0.25; s <= 0.5 && !slid; s += 0.25) {
          if (!blocked(nx, body.y - s) && !blocked(body.x, body.y - s)) { body.x = nx; body.y -= s * 0.35; slid = true; }
          else if (!blocked(nx, body.y + s) && !blocked(body.x, body.y + s)) { body.x = nx; body.y += s * 0.35; slid = true; }
        }
      }
    }
    if (dy) {
      var ny = body.y + dy;
      if (!blocked(body.x, ny)) body.y = ny;
      else {
        var slid2 = false;
        for (var s2 = 0.25; s2 <= 0.5 && !slid2; s2 += 0.25) {
          if (!blocked(body.x - s2, ny) && !blocked(body.x - s2, body.y)) { body.y = ny; body.x -= s2 * 0.35; slid2 = true; }
          else if (!blocked(body.x + s2, ny) && !blocked(body.x + s2, body.y)) { body.y = ny; body.x += s2 * 0.35; slid2 = true; }
        }
      }
    }
    body.x = u.clamp(body.x, RADIUS, M.WIDTH - RADIUS);
    body.y = u.clamp(body.y, RADIUS, M.HEIGHT - RADIUS);
  }

  function facingFrom(dx, dy) {
    if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left';
    return dy > 0 ? 'down' : 'up';
  }

  function dirVector(dir) {
    if (dir === 'up') return { x: 0, y: -1 };
    if (dir === 'down') return { x: 0, y: 1 };
    if (dir === 'left') return { x: -1, y: 0 };
    return { x: 1, y: 0 };
  }

  /* Which room a character should be heading for right now. */
  function npcTargetRoom(npc, state) {
    var period = SS.Schedule.periodAt(state, state.time);
    var t = state.time;
    if (t < 7 * 60 || t >= 22 * 60) return npc.spots.night;
    if (SS.Schedule.isWeekend(state.dayOfWeek)) return npc.spots.free || npc.spots.night;
    if (period.type === 'class') return npc.spots.class;
    if (period.type === 'lunch') return npc.spots.lunch;
    if (period.type === 'break') return npc.spots.lunch || npc.spots.free;
    if (t >= 8 * 60 && t < 14 * 60) return npc.spots.class;
    return npc.spots.free;
  }

  function randomSpotIn(roomId) {
    var room = M.roomById(roomId);
    if (!room) return null;
    for (var tries = 0; tries < 60; tries++) {
      var x = room.x0 + rng.int(room.x1 - room.x0 + 1);
      var y = room.y0 + rng.int(room.y1 - room.y0 + 1);
      if (!M.solid(x, y)) return { x: x, y: y };
    }
    return M.anchor(roomId);
  }

  function initNpcs() {
    npcs = SS.NpcData.list.map(function (data) {
      var spot = M.anchor(data.spots.free || data.spots.class || 'hallway');
      return {
        data: data, id: data.id, name: data.name,
        x: spot.x + 0.5, y: spot.y + 0.5,
        dir: 'down', visible: true, roomId: null,
        path: null, pathIndex: 0, wait: rng.range(0, 3), moving: false, bob: rng.range(0, 6)
      };
    });
  }

  function init(state, saved) {
    var spot = saved && saved.player ? saved.player : { x: M.spawn.x + 0.5, y: M.spawn.y + 0.5 };
    player = {
      x: spot.x, y: spot.y, dir: (saved && saved.player && saved.player.dir) || 'down',
      moving: false, bob: 0, speed: 0, running: false
    };
    rng = u.makeRng(state.seed || 1234);
    initNpcs();
    retargetAll(state);
  }

  function retargetAll(state) {
    for (var i = 0; i < npcs.length; i++) retarget(npcs[i], state, true);
  }

  function retarget(npc, state, teleport) {
    var roomId = npcTargetRoom(npc.data, state);
    npc.roomId = roomId;
    if (!roomId) { npc.visible = false; npc.path = null; return; }
    npc.visible = true;
    var spot = randomSpotIn(roomId);
    if (!spot) return;
    if (teleport) {
      npc.x = spot.x + 0.5; npc.y = spot.y + 0.5; npc.path = null;
      return;
    }
    var path = SS.Pathfind.find(Math.floor(npc.x), Math.floor(npc.y), spot.x, spot.y, isOpen, 2500);
    if (!path) { npc.x = spot.x + 0.5; npc.y = spot.y + 0.5; }
    npc.path = path; npc.pathIndex = 0;
  }

  function updateNpc(npc, dt, state) {
    var want = npcTargetRoom(npc.data, state);
    if (want !== npc.roomId) { retarget(npc, state, false); }
    if (!npc.visible) return;

    if (npc.path && npc.pathIndex < npc.path.length) {
      var node = npc.path[npc.pathIndex];
      var tx = node.x + 0.5, ty = node.y + 0.5;
      var dx = tx - npc.x, dy = ty - npc.y;
      var dist = Math.hypot(dx, dy);
      if (dist < 0.08) { npc.pathIndex++; return; }
      var step = Math.min(dist, NPC_SPEED * dt);
      npc.x += (dx / dist) * step;
      npc.y += (dy / dist) * step;
      npc.dir = facingFrom(dx, dy);
      npc.moving = true;
      npc.bob += dt * 8;
    } else {
      npc.moving = false;
      npc.wait -= dt;
      if (npc.wait <= 0) {
        npc.wait = rng.range(3, 9);
        retarget(npc, state, false);
      }
    }
  }

  function update(dt, state, control) {
    var axis = control.axis;
    var speed = control.run ? RUN : WALK;
    player.running = false;

    if (axis.x || axis.y) {
      player.path = null;
      var mag = Math.hypot(axis.x, axis.y);
      var v = speed * (mag > 0.98 && control.run ? 1 : Math.min(1, mag));
      moveBody(player, axis.x / mag * v * dt, axis.y / mag * v * dt);
      player.dir = facingFrom(axis.x, axis.y);
      player.moving = true;
      player.running = control.run && mag > 0.9;
      player.bob += dt * (player.running ? 13 : 9);
    } else if (player.path && player.pathIndex < player.path.length) {
      var node = player.path[player.pathIndex];
      var tx = node.x + 0.5, ty = node.y + 0.5;
      var dx = tx - player.x, dy = ty - player.y;
      var dist = Math.hypot(dx, dy);
      if (dist < 0.12) {
        player.pathIndex++;
      } else {
        var step = Math.min(dist, WALK * dt);
        moveBody(player, (dx / dist) * step, (dy / dist) * step);
        player.dir = facingFrom(dx, dy);
        player.moving = true;
        player.bob += dt * 9;
      }
    } else {
      player.moving = false;
      player.path = null;
    }

    for (var i = 0; i < npcs.length; i++) updateNpc(npcs[i], dt, state);
  }

  function walkTo(tx, ty) {
    var path = SS.Pathfind.find(Math.floor(player.x), Math.floor(player.y), tx, ty, isOpen, 4000);
    if (!path || !path.length) return false;
    player.path = path; player.pathIndex = 0;
    return true;
  }

  function stop() { player.path = null; player.moving = false; }

  function playerRoom() { return M.roomAt(Math.floor(player.x), Math.floor(player.y)); }

  function npcNear(maxDist) {
    var best = null, bestD = maxDist === undefined ? 1.5 : maxDist;
    for (var i = 0; i < npcs.length; i++) {
      var n = npcs[i];
      if (!n.visible) continue;
      var d = Math.hypot(n.x - player.x, n.y - player.y);
      if (d < bestD) { bestD = d; best = n; }
    }
    return best;
  }

  /* What pressing the action button would do right now. */
  function interactTarget() {
    var npc = npcNear(1.6);
    if (npc) return { type: 'npc', npc: npc, label: 'Talk to ' + npc.name };

    var v = dirVector(player.dir);
    var px = Math.floor(player.x), py = Math.floor(player.y);
    var candidates = [
      { x: px + v.x, y: py + v.y },
      { x: px + v.x * 2, y: py + v.y * 2 },
      { x: px, y: py }
    ];
    for (var i = 0; i < candidates.length; i++) {
      var c = candidates[i];
      var info = M.info(c.x, c.y);
      if (info.use) {
        return { type: 'tile', use: info.use, x: c.x, y: c.y, room: M.roomAt(c.x, c.y), tile: M.at(c.x, c.y) };
      }
    }
    return null;
  }

  SS.World = {
    init: init,
    update: update,
    walkTo: walkTo,
    stop: stop,
    isOpen: isOpen,
    interactTarget: interactTarget,
    playerRoom: playerRoom,
    npcNear: npcNear,
    retargetAll: retargetAll,
    get player() { return player; },
    get npcs() { return npcs; },
    snapshot: function () { return { player: { x: player.x, y: player.y, dir: player.dir } }; },
    teleport: function (tx, ty) { player.x = tx + 0.5; player.y = ty + 0.5; player.path = null; }
  };
})(window.SS = window.SS || {});
