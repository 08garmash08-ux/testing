#!/usr/bin/env node
/* Project self-check: parses every script, loads the game modules outside a
   browser, and verifies the map, the question bank and the offline manifest.
   Run with: npm run check */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
let failures = 0;

function ok(label, detail) { console.log('  PASS  ' + label + (detail ? '  -  ' + detail : '')); }
function bad(label, detail) { failures++; console.log('  FAIL  ' + label + (detail ? '  -  ' + detail : '')); }
function section(name) { console.log('\n' + name); }

const SCRIPTS = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8')
  .match(/<script src="([^"]+)"><\/script>/g)
  .map((tag) => tag.match(/src="([^"]+)"/)[1]);

section('Scripts referenced by index.html');
SCRIPTS.forEach((rel) => {
  const file = path.join(ROOT, rel);
  if (!fs.existsSync(file)) { bad(rel, 'missing'); return; }
  try {
    new vm.Script(fs.readFileSync(file, 'utf8'), { filename: rel });
    ok(rel);
  } catch (e) {
    bad(rel, e.message);
  }
});

section('Game modules load headlessly');
const sandbox = {
  window: {}, document: { createElement: () => ({ getContext: () => null }) },
  performance: { now: () => 0 }, navigator: {}, console,
  setTimeout, clearTimeout, setInterval, clearInterval, Math, Date, JSON
};
sandbox.window.addEventListener = () => {};
sandbox.self = sandbox.window;
vm.createContext(sandbox);
const LOGIC = SCRIPTS.filter((s) => !/render\.js|\bui\.js|main\.js|input\.js|audio\.js/.test(s));
LOGIC.forEach((rel) => {
  try {
    vm.runInContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), sandbox, { filename: rel });
  } catch (e) {
    bad(rel, e.message);
  }
});
const SS = sandbox.window.SS;
if (!SS) { bad('module namespace', 'window.SS never appeared'); process.exit(1); }
ok('module namespace', Object.keys(SS).length + ' modules');

section('Map');
const M = SS.MapData;
const widths = new Set(M.ROWS.map((r) => r.length));
if (widths.size === 1) ok('rows are rectangular', M.WIDTH + ' x ' + M.HEIGHT);
else bad('rows are rectangular', 'mixed widths: ' + [...widths].join(','));

const unknown = new Set();
M.ROWS.forEach((row) => row.split('').forEach((ch) => { if (!M.TILES[ch]) unknown.add(ch); }));
if (unknown.size) bad('every tile is defined', 'unknown: ' + [...unknown].join(' '));
else ok('every tile is defined');

if (!M.solid(M.spawn.x, M.spawn.y)) ok('spawn is walkable', M.roomAt(M.spawn.x, M.spawn.y).name);
else bad('spawn is walkable');

/* flood fill from the spawn */
const seen = new Set();
const queue = [[M.spawn.x, M.spawn.y]];
seen.add(M.spawn.x + ',' + M.spawn.y);
while (queue.length) {
  const [x, y] = queue.pop();
  [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => {
    const nx = x + dx, ny = y + dy, key = nx + ',' + ny;
    if (nx < 0 || ny < 0 || nx >= M.WIDTH || ny >= M.HEIGHT) return;
    if (seen.has(key) || M.solid(nx, ny)) return;
    seen.add(key); queue.push([nx, ny]);
  });
}
const unreachable = M.ROOMS.filter((r) => {
  const a = M.anchor(r.id);
  return !seen.has(a.x + ',' + a.y);
});
if (unreachable.length) bad('every room is reachable', unreachable.map((r) => r.id).join(', '));
else ok('every room is reachable', M.ROOMS.length + ' rooms, ' + seen.size + ' walkable tiles');

section('Questions');
let count = 0;
const qProblems = [];
Object.keys(SS.Questions.bank).forEach((subject) => {
  SS.Questions.bank[subject].forEach((q) => {
    count++;
    if (q.c.length !== 4) qProblems.push(subject + ': not four choices');
    if (q.a < 0 || q.a >= q.c.length) qProblems.push(subject + ': bad answer index');
    if (new Set(q.c).size !== q.c.length) qProblems.push(subject + ': duplicate choice');
    if (!q.d || q.d < 1 || q.d > 3) qProblems.push(subject + ': bad difficulty');
  });
});
if (qProblems.length) bad('question bank', qProblems.slice(0, 5).join('; '));
else ok('question bank', count + ' questions over 4 subjects');

section('People and events');
const npcProblems = SS.NpcData.list.filter((n) =>
  ['class', 'lunch', 'free', 'night'].some((k) => n.spots[k] && !M.roomById(n.spots[k])));
if (npcProblems.length) bad('npc rooms exist', npcProblems.map((n) => n.id).join(', '));
else ok('npc rooms exist', SS.NpcData.list.length + ' characters');

const evtProblems = SS.EventData.list.filter((e) =>
  !e.title || !e.text || !e.choices.length || e.choices.some((c) => !c.label || !c.result));
if (evtProblems.length) bad('events are complete', evtProblems.map((e) => e.id).join(', '));
else ok('events are complete', SS.EventData.list.length + ' events');

section('Simulation');
/* A diligent-but-ordinary player: turns up to every lesson, eats when hungry,
   and goes to bed at a reasonable hour. That run should earn a good report. */
const state = SS.State.create({ difficulty: 'normal', seed: 1 });
const lastDay = SS.Schedule.lastSchoolDay(state.semesterWeeks);
let guard = 0;
while (state.day <= lastDay && guard++ < 200000) {
  if (state.time >= 22 * 60 || state.time < 7 * 60) {
    SS.Actions.doSleep(state, 7 * 60, '');
    continue;
  }
  if (state.hunger < 40 && state.money >= 6) {
    SS.State.apply(state, { time: 25, money: -6, hunger: 55, stress: -4 }, { roomId: 'cafeteria' });
    continue;
  }
  const p = SS.Schedule.periodAt(state, state.time);
  SS.State.advance(state, 10, { roomId: p.roomId || 'hallway', focus: 1 });
  if (state.pendingExam) {
    const paper = SS.Exams.build(state, state.pendingExam.subject, state.pendingExam.kind);
    paper.questions.forEach((q) => { SS.Exams.answer(paper, q.answer); SS.Exams.next(paper); });
    SS.Exams.record(state, paper);
  }
}
const report = SS.State.report(state);
if (guard >= 200000) bad('full semester terminates');
else ok('full semester terminates', guard + ' simulated steps');
if (state.examLog.length >= 4) ok('exams were triggered', state.examLog.length + ' papers sat');
else bad('exams were triggered', 'only ' + state.examLog.length);
const att = Math.round(SS.State.attendancePercent(state));
if (att >= 90) ok('attendance is tracked', att + '%');
else bad('attendance is tracked', att + '%');
if (report.gpa >= 3.3) ok('turning up and passing papers earns a solid GPA', report.gpa.toFixed(2) + '  ' + report.rows.map((r) => r.letter).join(' '));
else bad('turning up and passing papers earns a solid GPA', report.gpa.toFixed(2) + '  knowledge ' + report.rows.map((r) => Math.round(r.knowledge)).join('/'));
if (state.stress < 85) ok('sleep keeps stress survivable', Math.round(state.stress) + '/100');
else bad('sleep keeps stress survivable', Math.round(state.stress));

/* Same again, but revising after school as well: that is what earns an A. */
const scholar = SS.State.create({ difficulty: 'normal', seed: 3 });
const libraryDesk = { type: 'tile', use: 'desk', room: SS.MapData.roomById('library'), x: 13, y: 17 };
let guard3 = 0;
while (scholar.day <= lastDay && guard3++ < 200000) {
  if (scholar.time >= 22 * 60 || scholar.time < 7 * 60) { SS.Actions.doSleep(scholar, 7 * 60, ''); continue; }
  if (scholar.hunger < 40 && scholar.money >= 6) {
    SS.State.apply(scholar, { time: 25, money: -6, hunger: 55, stress: -4 }, { roomId: 'cafeteria' });
    continue;
  }
  if (scholar.time > 14 * 60 && scholar.time < 21 * 60 && scholar.energy > 35) {
    const weakest = SS.State.SUBJECT_IDS.slice().sort((a, b) => scholar.knowledge[a] - scholar.knowledge[b])[0];
    const menu = SS.Actions.forTarget(scholar, libraryDesk);
    const option = menu.options.filter((o) => o.id === 'study_' + weakest)[0];
    if (option && option.enabled(scholar) === true) { option.perform(scholar); continue; }
  }
  const sp = SS.Schedule.periodAt(scholar, scholar.time);
  SS.State.advance(scholar, 10, { roomId: sp.roomId || 'hallway', focus: 1.2 });
  if (scholar.pendingExam) {
    const paper = SS.Exams.build(scholar, scholar.pendingExam.subject, scholar.pendingExam.kind);
    paper.questions.forEach((q) => { SS.Exams.answer(paper, q.answer); SS.Exams.next(paper); });
    SS.Exams.record(scholar, paper);
  }
}
const scholarReport = SS.State.report(scholar);
if (scholarReport.gpa >= 3.6) ok('revising as well earns top marks', scholarReport.gpa.toFixed(2) + '  ' + scholarReport.rows.map((r) => r.letter).join(' '));
else bad('revising as well earns top marks', scholarReport.gpa.toFixed(2) + '  knowledge ' + scholarReport.rows.map((r) => Math.round(r.knowledge)).join('/'));

/* A player who never turns up should not pass. */
const slacker = SS.State.create({ difficulty: 'normal', seed: 2 });
let guard2 = 0;
while (slacker.day <= lastDay && guard2++ < 200000) {
  if (slacker.time >= 22 * 60 || slacker.time < 7 * 60) { SS.Actions.doSleep(slacker, 7 * 60, ''); continue; }
  if (slacker.hunger < 40 && slacker.money >= 6) {
    SS.State.apply(slacker, { time: 25, money: -6, hunger: 55 }, { roomId: 'cafeteria' });
    continue;
  }
  SS.State.advance(slacker, 20, { roomId: 'yard', outdoors: true });
  if (slacker.pendingExam) SS.Exams.miss(slacker, slacker.pendingExam);
}
const slackReport = SS.State.report(slacker);
if (slackReport.gpa < 1.0) ok('skipping everything fails you', slackReport.gpa.toFixed(2));
else bad('skipping everything fails you', slackReport.gpa.toFixed(2));
const ending = SS.State.ending(state);
if (ending.title) ok('ending resolves', ending.title);
else bad('ending resolves');

section('Offline cache list');
const sw = fs.readFileSync(path.join(ROOT, 'service-worker.js'), 'utf8');
const listed = sw.slice(sw.indexOf('var ASSETS'), sw.indexOf('];', sw.indexOf('var ASSETS')))
  .match(/'([^']+)'/g).map((s) => s.slice(1, -1)).filter((s) => s !== './');
const missing = listed.filter((rel) => !fs.existsSync(path.join(ROOT, rel)));
if (missing.length) bad('cached files exist', missing.join(', '));
else ok('cached files exist', listed.length + ' entries');
const uncached = SCRIPTS.filter((s) => listed.indexOf(s) < 0);
if (uncached.length) bad('every script is cached', uncached.join(', '));
else ok('every script is cached');

console.log('\n' + (failures ? failures + ' CHECK(S) FAILED' : 'All checks passed.'));
process.exit(failures ? 1 : 0);
