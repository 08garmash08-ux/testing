/* Everything you see is drawn with shapes at runtime: no sprite sheets, no
   downloads, and it scales cleanly from a phone to a desktop monitor.
   The static map is painted once into an offscreen canvas and then blitted
   a screen at a time, which is what keeps this smooth on cheap hardware. */
(function (SS) {
  'use strict';

  var M = SS.MapData;
  var T = M.TILE;
  var u = SS.util;

  var base = null;        /* offscreen canvas holding the whole campus */
  var baseCtx = null;
  var camera = { x: 0, y: 0, scale: 2 };
  var view = { w: 0, h: 0, scale: 1 };
  var noise = [];

  var PALETTE = {
    floor: ['#e6dfd2', '#dfd7c8'],
    floorLine: 'rgba(120,106,88,0.22)',
    grass: ['#6f9e56', '#679650', '#74a55b'],
    path: ['#bdb6a7', '#b6af9f'],
    wall: '#5b4f43',
    wallTop: '#7d6e5d',
    wallEdge: '#453b31',
    door: '#a5714a',
    doorPanel: '#c98d5e',
    glass: '#a9cfe0',
    wood: '#a9794d',
    woodDark: '#8a6039',
    metal: '#9aa3ab',
    metalDark: '#6f7880',
    book: ['#c0504d', '#4f81bd', '#9bbb59', '#8064a2', '#f79646', '#4bacc6']
  };

  function initNoise() {
    var rng = u.makeRng(99);
    noise = [];
    for (var y = 0; y < M.HEIGHT; y++) {
      var row = [];
      for (var x = 0; x < M.WIDTH; x++) row.push(rng());
      noise.push(row);
    }
  }

  function n(x, y) { return noise[y] ? (noise[y][x] || 0) : 0; }

  /* ---------- static tile painting ---------- */

  function paintFloor(c, x, y, px, py) {
    var alt = (x + y) % 2;
    c.fillStyle = PALETTE.floor[alt];
    c.fillRect(px, py, T, T);
    c.strokeStyle = PALETTE.floorLine;
    c.lineWidth = 1;
    c.strokeRect(px + 0.5, py + 0.5, T - 1, T - 1);
  }

  function paintGrass(c, x, y, px, py) {
    var v = n(x, y);
    c.fillStyle = PALETTE.grass[Math.floor(v * 3) % 3];
    c.fillRect(px, py, T, T);
    c.fillStyle = 'rgba(40,80,35,0.25)';
    for (var i = 0; i < 3; i++) {
      var gx = px + ((v * 971 * (i + 3)) % (T - 4)) + 2;
      var gy = py + ((v * 617 * (i + 5)) % (T - 6)) + 3;
      c.fillRect(gx, gy, 2, 4);
    }
  }

  function paintPath(c, x, y, px, py) {
    c.fillStyle = PALETTE.path[(x * 3 + y) % 2];
    c.fillRect(px, py, T, T);
    c.strokeStyle = 'rgba(90,85,75,0.25)';
    c.strokeRect(px + 0.5, py + 0.5, T - 1, T - 1);
  }

  function paintWall(c, x, y, px, py, glass) {
    var openBelow = !M.solid(x, y + 1);
    c.fillStyle = PALETTE.wall;
    c.fillRect(px, py, T, T);
    c.fillStyle = PALETTE.wallTop;
    c.fillRect(px, py, T, Math.floor(T * 0.42));
    c.fillStyle = PALETTE.wallEdge;
    c.fillRect(px, py + T - 3, T, 3);
    if (glass) {
      c.fillStyle = PALETTE.glass;
      c.fillRect(px + 4, py + 6, T - 8, T - 14);
      c.fillStyle = 'rgba(255,255,255,0.45)';
      c.fillRect(px + 6, py + 8, 5, T - 18);
      c.strokeStyle = PALETTE.wallEdge;
      c.lineWidth = 2;
      c.strokeRect(px + 4, py + 6, T - 8, T - 14);
    }
    if (openBelow) {
      c.fillStyle = 'rgba(0,0,0,0.18)';
      c.fillRect(px, py + T, T, 5);
    }
  }

  function paintDoor(c, x, y, px, py) {
    paintFloor(c, x, y, px, py);
    c.fillStyle = PALETTE.door;
    c.fillRect(px, py, T, T);
    c.fillStyle = PALETTE.doorPanel;
    c.fillRect(px + 3, py + 3, T - 6, T - 6);
    c.fillStyle = PALETTE.wallEdge;
    c.fillRect(px + T - 9, py + T / 2 - 2, 4, 4);
  }

  function paintDesk(c, x, y, px, py) {
    paintFloor(c, x, y, px, py);
    c.fillStyle = 'rgba(0,0,0,0.16)';
    c.fillRect(px + 2, py + 8, T - 2, T - 6);
    c.fillStyle = PALETTE.wood;
    c.fillRect(px, py + 4, T, T - 10);
    c.fillStyle = PALETTE.woodDark;
    c.fillRect(px, py + T - 8, T, 4);
    c.fillStyle = 'rgba(255,255,255,0.18)';
    c.fillRect(px + 2, py + 6, T - 4, 3);
  }

  function paintChair(c, x, y, px, py) {
    paintFloor(c, x, y, px, py);
    c.fillStyle = 'rgba(0,0,0,0.12)';
    c.beginPath();
    c.ellipse(px + T / 2, py + T - 7, T * 0.3, T * 0.14, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#5f6b7a';
    c.fillRect(px + 8, py + 10, T - 16, T - 18);
    c.fillStyle = '#48525f';
    c.fillRect(px + 8, py + 6, T - 16, 5);
  }

  function paintBoard(c, x, y, px, py) {
    paintWall(c, x, y, px, py, false);
    c.fillStyle = '#2f5d4a';
    c.fillRect(px, py + 5, T, T - 12);
    c.strokeStyle = '#d8c9a8';
    c.lineWidth = 2;
    c.strokeRect(px + 1, py + 6, T - 2, T - 14);
    c.strokeStyle = 'rgba(255,255,255,0.35)';
    c.lineWidth = 1;
    c.beginPath();
    var v = n(x, y);
    c.moveTo(px + 5, py + 12 + v * 6);
    c.lineTo(px + T - 6, py + 11 + v * 8);
    c.moveTo(px + 5, py + 19 + v * 4);
    c.lineTo(px + T - 10, py + 20 + v * 3);
    c.stroke();
  }

  function paintShelf(c, x, y, px, py) {
    paintFloor(c, x, y, px, py);
    c.fillStyle = PALETTE.woodDark;
    c.fillRect(px, py, T, T);
    for (var row = 0; row < 3; row++) {
      var sy = py + 2 + row * 10;
      c.fillStyle = '#6b4a2c';
      c.fillRect(px + 1, sy + 8, T - 2, 2);
      for (var i = 0; i < 6; i++) {
        var v = n(x, y) * 1000 + row * 37 + i * 13;
        var h = 5 + (v % 4);
        c.fillStyle = PALETTE.book[Math.floor(v) % PALETTE.book.length];
        c.fillRect(px + 2 + i * 5, sy + 8 - h, 4, h);
      }
    }
  }

  function paintCounter(c, x, y, px, py) {
    paintFloor(c, x, y, px, py);
    c.fillStyle = PALETTE.metalDark;
    c.fillRect(px, py + 6, T, T - 6);
    c.fillStyle = PALETTE.metal;
    c.fillRect(px, py + 4, T, 8);
    c.fillStyle = 'rgba(255,255,255,0.3)';
    c.fillRect(px + 2, py + 5, T - 4, 2);
    var v = n(x, y);
    if (v > 0.5) {
      c.fillStyle = '#e0b24a';
      c.fillRect(px + 7, py + 14, T - 14, 7);
      c.fillStyle = '#c98f2f';
      c.fillRect(px + 7, py + 19, T - 14, 2);
    }
  }

  function paintGear(c, x, y, px, py) {
    paintFloor(c, x, y, px, py);
    c.fillStyle = '#3f4650';
    c.fillRect(px + 3, py + 12, T - 6, T - 16);
    c.fillStyle = '#20252c';
    c.fillRect(px + 1, py + 15, 6, 8);
    c.fillRect(px + T - 7, py + 15, 6, 8);
    c.fillStyle = '#6c7683';
    c.fillRect(px + 6, py + 17, T - 12, 4);
  }

  function paintBed(c, x, y, px, py) {
    paintFloor(c, x, y, px, py);
    var top = !M.solid(x, y - 1) || M.at(x, y - 1) !== 'B';
    c.fillStyle = '#7f5a3c';
    c.fillRect(px, py, T, T);
    c.fillStyle = '#c9d6e3';
    c.fillRect(px + 2, py + (top ? 6 : 0), T - 4, T - (top ? 8 : 2));
    if (top) {
      c.fillStyle = '#f2f5f8';
      c.fillRect(px + 4, py + 3, T - 8, 9);
    } else {
      c.fillStyle = '#7a9ec4';
      c.fillRect(px + 2, py, T - 4, T - 6);
      c.fillStyle = 'rgba(255,255,255,0.25)';
      c.fillRect(px + 2, py + 4, T - 4, 2);
    }
  }

  function paintLocker(c, x, y, px, py) {
    paintFloor(c, x, y, px, py);
    c.fillStyle = '#4b6b78';
    c.fillRect(px, py, T, T);
    c.fillStyle = '#5d8090';
    c.fillRect(px + 1, py + 1, T - 2, T - 3);
    c.fillStyle = 'rgba(0,0,0,0.3)';
    for (var i = 0; i < 3; i++) c.fillRect(px + 6, py + 5 + i * 3, T - 12, 2);
    c.fillStyle = '#d8dee2';
    c.fillRect(px + T - 9, py + T / 2, 3, 7);
    c.fillStyle = 'rgba(0,0,0,0.25)';
    c.fillRect(px, py + T - 3, T, 3);
  }

  function paintVending(c, x, y, px, py) {
    paintFloor(c, x, y, px, py);
    c.fillStyle = '#b8392f';
    c.fillRect(px, py, T, T);
    c.fillStyle = '#2b2f36';
    c.fillRect(px + 3, py + 3, T - 12, T - 9);
    for (var r = 0; r < 3; r++) {
      for (var i = 0; i < 3; i++) {
        c.fillStyle = PALETTE.book[(r * 3 + i + Math.floor(n(x, y) * 6)) % PALETTE.book.length];
        c.fillRect(px + 5 + i * 6, py + 5 + r * 7, 4, 5);
      }
    }
    c.fillStyle = '#d8dee2';
    c.fillRect(px + T - 8, py + 6, 4, 10);
  }

  function paintBench(c, x, y, px, py) {
    paintGrass(c, x, y, px, py);
    c.fillStyle = 'rgba(0,0,0,0.18)';
    c.fillRect(px + 2, py + T - 8, T - 4, 5);
    c.fillStyle = PALETTE.wood;
    c.fillRect(px + 1, py + 10, T - 2, 6);
    c.fillRect(px + 1, py + 18, T - 2, 5);
    c.fillStyle = PALETTE.woodDark;
    c.fillRect(px + 3, py + 16, 4, 9);
    c.fillRect(px + T - 7, py + 16, 4, 9);
  }

  function paintTree(c, x, y, px, py) {
    paintGrass(c, x, y, px, py);
    c.fillStyle = 'rgba(0,0,0,0.2)';
    c.beginPath();
    c.ellipse(px + T / 2, py + T - 5, T * 0.34, T * 0.15, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#6b4a2c';
    c.fillRect(px + T / 2 - 3, py + T - 14, 6, 12);
    var v = n(x, y);
    c.fillStyle = v > 0.6 ? '#3f7a3a' : '#468545';
    c.beginPath();
    c.arc(px + T / 2, py + T / 2 - 4, T * 0.42, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = 'rgba(255,255,255,0.12)';
    c.beginPath();
    c.arc(px + T / 2 - 4, py + T / 2 - 9, T * 0.2, 0, Math.PI * 2);
    c.fill();
  }

  function paintFence(c, x, y, px, py) {
    paintGrass(c, x, y, px, py);
    c.fillStyle = '#7b6a55';
    c.fillRect(px, py + 8, T, 4);
    c.fillRect(px, py + 18, T, 4);
    c.fillStyle = '#5f5142';
    c.fillRect(px + 4, py + 2, 5, T - 4);
    c.fillRect(px + T - 9, py + 2, 5, T - 4);
  }

  function paintFountain(c, x, y, px, py) {
    paintGrass(c, x, y, px, py);
    c.fillStyle = '#9aa3ab';
    c.fillRect(px, py, T, T);
    c.fillStyle = '#5da3c4';
    c.fillRect(px + 3, py + 3, T - 6, T - 6);
    c.fillStyle = 'rgba(255,255,255,0.35)';
    c.fillRect(px + 5, py + 5, T - 20, 4);
  }

  function paintHoop(c, x, y, px, py) {
    paintPath(c, x, y, px, py);
    c.fillStyle = '#4a4f57';
    c.fillRect(px + T / 2 - 2, py + 10, 4, T - 12);
    c.fillStyle = '#e8e4da';
    c.fillRect(px + 5, py + 2, T - 10, 12);
    c.strokeStyle = '#c0504d';
    c.lineWidth = 2;
    c.strokeRect(px + 10, py + 8, T - 20, 6);
  }

  function paintPlant(c, x, y, px, py) {
    var outdoors = !M.roomAt(x, y).indoor;
    if (outdoors) paintGrass(c, x, y, px, py); else paintFloor(c, x, y, px, py);
    c.fillStyle = '#a5643c';
    c.fillRect(px + 9, py + T - 12, T - 18, 10);
    c.fillStyle = '#4f8f4a';
    c.beginPath();
    c.arc(px + T / 2, py + T / 2 - 2, T * 0.3, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#5da157';
    c.beginPath();
    c.arc(px + T / 2 - 5, py + T / 2 - 7, T * 0.18, 0, Math.PI * 2);
    c.fill();
  }

  var PAINTERS = {
    '.': paintFloor, ',': paintGrass, '_': paintPath, 'D': paintDoor,
    'T': paintDesk, 'c': paintChair, 'W': paintBoard, 'S': paintShelf,
    'F': paintCounter, 'G': paintGear, 'B': paintBed, 'L': paintLocker,
    'V': paintVending, '=': paintBench, 't': paintTree, 'f': paintFence,
    '~': paintFountain, 'o': paintHoop, 'P': paintPlant
  };

  function buildBase() {
    base = document.createElement('canvas');
    base.width = M.WIDTH * T;
    base.height = M.HEIGHT * T;
    baseCtx = base.getContext('2d');
    var c = baseCtx;
    c.fillStyle = '#4c7040';
    c.fillRect(0, 0, base.width, base.height);

    for (var y = 0; y < M.HEIGHT; y++) {
      for (var x = 0; x < M.WIDTH; x++) {
        var ch = M.at(x, y);
        var px = x * T, py = y * T;
        if (ch === '#' || ch === '|') { paintWall(c, x, y, px, py, ch === '|'); continue; }
        var fn = PAINTERS[ch];
        if (fn) fn(c, x, y, px, py); else paintFloor(c, x, y, px, py);
      }
    }

    /* Court markings, painted over the finished pavement. */
    var court = M.roomById('court');
    c.save();
    c.strokeStyle = 'rgba(255,255,255,0.55)';
    c.lineWidth = 3;
    c.strokeRect(court.x0 * T + 6, court.y0 * T + 6, (court.x1 - court.x0 + 1) * T - 12, (court.y1 - court.y0 + 1) * T - 12);
    c.beginPath();
    c.moveTo(court.x0 * T + 6, (court.y0 + court.y1) / 2 * T + T / 2);
    c.lineTo((court.x1 + 1) * T - 6, (court.y0 + court.y1) / 2 * T + T / 2);
    c.stroke();
    c.beginPath();
    c.arc(((court.x0 + court.x1) / 2 + 0.5) * T, ((court.y0 + court.y1) / 2 + 0.5) * T, T * 1.8, 0, Math.PI * 2);
    c.stroke();
    c.restore();

    /* Room names, faint, so a new player can orient without a legend. */
    c.save();
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    for (var i = 0; i < M.ROOMS.length; i++) {
      var r = M.ROOMS[i];
      if (r.id === 'yard') continue;
      var cx = ((r.x0 + r.x1) / 2 + 0.5) * T;
      var cy = (r.y0 + 0.9) * T;
      c.font = 'bold 13px system-ui, sans-serif';
      c.fillStyle = 'rgba(30,24,18,0.30)';
      c.fillText(r.name.toUpperCase(), cx, cy + 1);
      c.fillStyle = 'rgba(255,255,255,0.35)';
      c.fillText(r.name.toUpperCase(), cx, cy);
    }
    c.restore();
  }

  /* ---------- people ---------- */

  var LOOKS = [
    { skin: '#e8b98f', shirt: '#4f7fd6', trousers: '#37415a', hair: '#3a2a1c' },
    { skin: '#8d5a3b', shirt: '#d95f7a', trousers: '#2e3550', hair: '#1d1410' },
    { skin: '#f0cdaa', shirt: '#57b487', trousers: '#414a5c', hair: '#8a5a2b' },
    { skin: '#5d3a26', shirt: '#e8b545', trousers: '#2b3346', hair: '#120c08' },
    { skin: '#d8a273', shirt: '#9b6fd4', trousers: '#333b4e', hair: '#5a3418' },
    { skin: '#f6ddc3', shirt: '#e2714a', trousers: '#3d4457', hair: '#c9903f' }
  ];

  function drawPerson(c, px, py, dir, bob, look, scale) {
    var s = scale || 1;
    var step = Math.sin(bob) * 2 * s;
    c.save();
    c.translate(px, py);

    c.fillStyle = 'rgba(0,0,0,0.25)';
    c.beginPath();
    c.ellipse(0, 12 * s, 9 * s, 4 * s, 0, 0, Math.PI * 2);
    c.fill();

    /* legs */
    c.fillStyle = look.trousers;
    c.fillRect(-6 * s, 4 * s + step * 0.4, 5 * s, 9 * s - step * 0.4);
    c.fillRect(1 * s, 4 * s - step * 0.4, 5 * s, 9 * s + step * 0.4);

    /* body */
    c.fillStyle = look.shirt;
    c.beginPath();
    var r = 3 * s;
    var bx = -8 * s, by = -6 * s, bw = 16 * s, bh = 12 * s;
    c.moveTo(bx + r, by);
    c.arcTo(bx + bw, by, bx + bw, by + bh, r);
    c.arcTo(bx + bw, by + bh, bx, by + bh, r);
    c.arcTo(bx, by + bh, bx, by, r);
    c.arcTo(bx, by, bx + bw, by, r);
    c.fill();

    /* arms */
    c.fillStyle = look.skin;
    c.fillRect(-10 * s, -4 * s - step * 0.3, 3 * s, 9 * s);
    c.fillRect(7 * s, -4 * s + step * 0.3, 3 * s, 9 * s);

    /* head */
    c.fillStyle = look.skin;
    c.beginPath();
    c.arc(0, -13 * s, 7 * s, 0, Math.PI * 2);
    c.fill();

    /* hair, shaped by facing */
    c.fillStyle = look.hair;
    c.beginPath();
    if (dir === 'up') {
      c.arc(0, -13 * s, 7.2 * s, 0, Math.PI * 2);
    } else {
      c.arc(0, -14 * s, 7.2 * s, Math.PI * 1.05, Math.PI * 1.95);
      c.lineTo(6 * s, -12 * s);
      c.lineTo(-6 * s, -12 * s);
    }
    c.fill();

    if (dir !== 'up') {
      c.fillStyle = '#231a14';
      var ex = dir === 'left' ? -2.5 : dir === 'right' ? 2.5 : 0;
      c.fillRect((ex - 3) * s, -13.5 * s, 1.8 * s, 2.2 * s);
      c.fillRect((ex + 1.4) * s, -13.5 * s, 1.8 * s, 2.2 * s);
    }
    c.restore();
  }

  function npcLook(npc) {
    return { skin: '#e2b18a', shirt: npc.data.color, trousers: '#3b4252', hair: npc.data.hair || '#2a2018' };
  }

  /* ---------- lighting ---------- */

  function skyTint(minutes) {
    var m = minutes;
    if (m < 300) return { c: '20,28,58', a: 0.55 };
    if (m < 420) return { c: '70,60,90', a: u.lerp(0.55, 0.18, (m - 300) / 120) };
    if (m < 540) return { c: '255,190,120', a: u.lerp(0.18, 0.0, (m - 420) / 120) };
    if (m < 1020) return { c: '255,255,255', a: 0 };
    if (m < 1140) return { c: '255,150,80', a: u.lerp(0, 0.2, (m - 1020) / 120) };
    if (m < 1260) return { c: '60,55,95', a: u.lerp(0.2, 0.5, (m - 1140) / 120) };
    return { c: '20,28,58', a: 0.55 };
  }

  /* ---------- frame ---------- */

  function resize(canvas) {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var rect = canvas.getBoundingClientRect();
    var w = Math.max(320, Math.round(rect.width));
    var h = Math.max(240, Math.round(rect.height));
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    view.w = w; view.h = h; view.dpr = dpr;
    /* Narrow screens zoom in so the character stays readable under a thumb;
       wide ones pull back so you can see more of the corridor ahead. */
    var minTilesX = w < 520 ? 9 : 13;
    var minTilesY = h < 520 ? 8 : 12;
    view.scale = u.clamp(Math.min(w / (minTilesX * T), h / (minTilesY * T)), 0.85, 3.0);
  }

  function worldToScreen(wx, wy) {
    return {
      x: (wx * T - camera.x) * view.scale,
      y: (wy * T - camera.y) * view.scale
    };
  }

  function screenToWorld(sx, sy) {
    return {
      x: (sx / view.scale + camera.x) / T,
      y: (sy / view.scale + camera.y) / T
    };
  }

  function frame(ctx, state, opts) {
    opts = opts || {};
    if (!base) { initNoise(); buildBase(); }
    var player = SS.World.player;
    var scale = view.scale;
    var viewW = view.w / scale, viewH = view.h / scale;

    var targetX = player.x * T - viewW / 2;
    var targetY = player.y * T - viewH / 2;
    camera.x = u.clamp(targetX, 0, Math.max(0, base.width - viewW));
    camera.y = u.clamp(targetY, 0, Math.max(0, base.height - viewH));
    if (base.width < viewW) camera.x = (base.width - viewW) / 2;
    if (base.height < viewH) camera.y = (base.height - viewH) / 2;

    ctx.save();
    ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#3d5c36';
    ctx.fillRect(0, 0, view.w, view.h);

    ctx.save();
    ctx.scale(scale, scale);
    ctx.translate(-camera.x, -camera.y);

    var sx = Math.max(0, Math.floor(camera.x));
    var sy = Math.max(0, Math.floor(camera.y));
    var sw = Math.min(base.width - sx, Math.ceil(viewW) + 2);
    var sh = Math.min(base.height - sy, Math.ceil(viewH) + 2);
    if (sw > 0 && sh > 0) ctx.drawImage(base, sx, sy, sw, sh, sx, sy, sw, sh);

    /* walk target marker */
    if (player.path && player.pathIndex < player.path.length) {
      var dest = player.path[player.path.length - 1];
      var pulse = 0.5 + Math.sin(performance.now() / 180) * 0.25;
      ctx.strokeStyle = 'rgba(255,255,255,' + pulse.toFixed(2) + ')';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc((dest.x + 0.5) * T, (dest.y + 0.5) * T, 9, 0, Math.PI * 2);
      ctx.stroke();
    }

    /* highlight whatever the action button would hit */
    if (opts.target && opts.target.type === 'tile') {
      ctx.strokeStyle = 'rgba(255,229,140,0.9)';
      ctx.lineWidth = 2;
      ctx.strokeRect(opts.target.x * T + 2, opts.target.y * T + 2, T - 4, T - 4);
    }

    /* people, sorted so the ones lower on screen draw in front */
    var actors = [];
    for (var i = 0; i < SS.World.npcs.length; i++) {
      var npc = SS.World.npcs[i];
      if (!npc.visible) continue;
      if (npc.x * T < camera.x - T * 2 || npc.x * T > camera.x + viewW + T * 2) continue;
      if (npc.y * T < camera.y - T * 3 || npc.y * T > camera.y + viewH + T * 3) continue;
      actors.push({ y: npc.y, npc: npc });
    }
    actors.push({ y: player.y, player: true });
    actors.sort(function (a, b) { return a.y - b.y; });

    for (var j = 0; j < actors.length; j++) {
      var a = actors[j];
      if (a.player) {
        drawPerson(ctx, player.x * T, player.y * T + 6, player.dir,
                   player.moving ? player.bob : 0, LOOKS[state.look % LOOKS.length], 1);
      } else {
        drawPerson(ctx, a.npc.x * T, a.npc.y * T + 6, a.npc.dir,
                   a.npc.moving ? a.npc.bob : 0, npcLook(a.npc), 0.95);
      }
    }

    /* name tag and prompt above the current interaction target */
    if (opts.target && opts.target.type === 'npc') {
      var t = opts.target.npc;
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      var label = t.name;
      var w = ctx.measureText(label).width + 10;
      ctx.fillStyle = 'rgba(20,18,26,0.78)';
      ctx.fillRect(t.x * T - w / 2, t.y * T - 40, w, 15);
      ctx.fillStyle = '#ffe58c';
      ctx.fillText(label, t.x * T, t.y * T - 29);
    }

    ctx.restore();

    /* time of day */
    var tint = skyTint(state.time);
    if (tint.a > 0.001) {
      ctx.fillStyle = 'rgba(' + tint.c + ',' + tint.a.toFixed(3) + ')';
      ctx.fillRect(0, 0, view.w, view.h);
      if (tint.a > 0.25) {
        /* a pool of light so you can still see yourself at night */
        var p = worldToScreen(player.x, player.y);
        var grad = ctx.createRadialGradient(p.x, p.y, 10, p.x, p.y, 150 * scale * 0.6);
        grad.addColorStop(0, 'rgba(255,225,170,0.30)');
        grad.addColorStop(1, 'rgba(255,225,170,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, view.w, view.h);
      }
    }

    /* touch stick */
    var stick = SS.Input.stickState();
    if (stick) {
      ctx.beginPath();
      ctx.arc(stick.ox, stick.oy, stick.radius, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.10)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(stick.ox + stick.x * stick.radius, stick.oy + stick.y * stick.radius, stick.radius * 0.42, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.fill();
    }

    ctx.restore();
  }

  /* A schematic of the campus for the map screen. */
  function drawMinimap(ctx, w, h, state) {
    var sx = w / M.WIDTH, sy = h / M.HEIGHT;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#41633a';
    ctx.fillRect(0, 0, w, h);
    for (var y = 0; y < M.HEIGHT; y++) {
      for (var x = 0; x < M.WIDTH; x++) {
        var ch = M.at(x, y);
        var col = null;
        if (ch === '#' || ch === '|') col = '#5b4f43';
        else if (ch === '.') col = '#ded6c7';
        else if (ch === '_') col = '#b6af9f';
        else if (ch === 'D') col = '#c98d5e';
        else if (ch === ',') col = null;
        else if (M.solid(x, y)) col = '#8a7d6c';
        else col = '#ded6c7';
        if (!col) continue;
        ctx.fillStyle = col;
        ctx.fillRect(x * sx, y * sy, Math.ceil(sx), Math.ceil(sy));
      }
    }
    ctx.font = 'bold 9px system-ui, sans-serif';
    ctx.textAlign = 'center';
    for (var i = 0; i < M.ROOMS.length; i++) {
      var r = M.ROOMS[i];
      if (r.id === 'yard' || r.id === 'hallway') continue;
      var cx = ((r.x0 + r.x1) / 2 + 0.5) * sx;
      var cy = ((r.y0 + r.y1) / 2 + 0.5) * sy;
      ctx.fillStyle = 'rgba(25,20,15,0.75)';
      ctx.fillText(r.name, cx, cy);
    }
    var p = SS.World.player;
    ctx.fillStyle = '#ffe14d';
    ctx.strokeStyle = '#2b2118';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(p.x * sx, p.y * sy, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  SS.Render = {
    LOOKS: LOOKS,
    resize: resize,
    frame: frame,
    drawPerson: drawPerson,
    drawMinimap: drawMinimap,
    screenToWorld: screenToWorld,
    worldToScreen: worldToScreen,
    view: view,
    invalidate: function () { base = null; }
  };
})(window.SS = window.SS || {});
