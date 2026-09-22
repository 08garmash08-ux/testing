/**
 * Run scratch-cat-wave.sb3 in the real Scratch VM and check that it behaves.
 *
 *   npm install scratch-vm scratch-storage scratch-parser
 *   node scratch/check-sb3.js
 *
 * scratch-parser is the validator scratch.mit.edu runs on an uploaded project;
 * scratch-vm is the engine the editor runs. Headless there is no renderer, and
 * that changes two things worth knowing while reading the checks below:
 *   - `size` is only applied when a renderer is attached, so growing the cat is
 *     counted by watching the block run rather than by reading target.size;
 *   - nothing requests a redraw, so the sequencer runs a whole loop inside one
 *     step instead of one iteration per frame. Peaks are therefore measured from
 *     inside the motion blocks, not by sampling between frames.
 */

const fs = require('fs');
const path = require('path');
const VM = require('scratch-vm');
const { ScratchStorage } = require('scratch-storage');
const parse = require('scratch-parser');

const FILE = process.argv[2] || path.join(__dirname, 'scratch-cat-wave.sb3');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const fails = [];

function check(name, ok, detail = '') {
  console.log(`${ok ? ' ok ' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
  if (!ok) fails.push(name);
}

function validate(buffer) {
  return new Promise((resolve, reject) =>
    parse(buffer, false, (err, project) => (err ? reject(err) : resolve(project[0]))));
}

(async () => {
  const buffer = fs.readFileSync(FILE);

  // 1. the file is a project Scratch would accept
  let project;
  try {
    project = await validate(buffer);
    check('scratch-parser accepts the project', true,
          project.targets.map(t => t.name).join(', '));
  } catch (err) {
    check('scratch-parser accepts the project', false, JSON.stringify(err).slice(0, 200));
    process.exit(1);
  }

  // 2. it runs
  const errors = [];
  const realError = console.error;
  console.error = (...a) => errors.push(a.join(' '));

  const vm = new VM();
  vm.attachStorage(new ScratchStorage());
  await vm.loadProject(buffer);

  const stage = vm.runtime.getTargetForStage();
  const cat = vm.runtime.targets.find(t => t.getName() === 'Scratch Cat');
  const varOf = n => Number(Object.values(stage.variables).find(v => v.name === n).value);
  const costume = () => cat.getCostumes()[cat.currentCostume].name;
  const backdrop = () => stage.getCostumes()[stage.currentCostume].name;

  // what the cat itself does, recorded from inside the blocks
  let log = null;
  for (const opcode of ['looks_changesizeby', 'motion_changeyby', 'motion_turnright',
                        'sound_play', 'control_create_clone_of', 'pen_penDown']) {
    const original = vm.runtime._primitives[opcode];
    vm.runtime._primitives[opcode] = function (args, util, ...rest) {
      // the VM hands every block the same BlockUtility and re-points it, so note
      // whose block this is before running it
      const who = util && util.target;
      const result = original.call(this, args, util, ...rest);
      if (log && who === cat) {
        log.ran[opcode] = (log.ran[opcode] || 0) + 1;
        log.peakY = Math.max(log.peakY, cat.y);
      }
      return result;
    };
  }
  // and what it looks like, sampled once per frame
  const realStep = vm.runtime._step.bind(vm.runtime);
  vm.runtime._step = () => {
    realStep();
    if (!log) return;
    log.costumes.add(costume());
    log.clones = Math.max(log.clones, vm.runtime.targets.length - 3);
  };
  const watch = async (ms, act) => {
    log = { ran: {}, costumes: new Set(), clones: 0, peakY: -Infinity };
    if (act) await act();
    await sleep(ms);
    const done = log;
    log = null;
    return done;
  };
  const tap = async key => {
    vm.postIOData('keyboard', { key, isDown: true });
    await sleep(60);
    vm.postIOData('keyboard', { key, isDown: false });
  };

  check('the cat is the official sprite', cat.getCostumes()[0].name === 'costume1' &&
        cat.getCostumes()[0].asset.assetId === 'bcf454acf82e4504149f7ffe07081dbc',
        `${cat.getCostumes().length} costumes, ${cat.getSounds().length} sounds`);

  vm.start();
  vm.greenFlag();
  await sleep(4400);                                    // the intro "say" runs for 4 seconds

  const waving = await watch(2500);
  const frames = [...waving.costumes].filter(n => n.startsWith('wave-'));
  check('the wave plays every costume', frames.length === 5, frames.sort().join(' '));
  check('the My Block counts each wave', varOf('waves') > 0, `waves = ${varOf('waves')}`);
  check('sparkles come off the paw', waving.clones > 0, `${waving.clones} clones alive at once`);
  check('the stage starts on the night backdrop', backdrop() === 'night', backdrop());

  const before = varOf('waves');
  const clicked = await watch(1500, async () =>
    vm.runtime.startHats('event_whenthisspriteclicked', null, cat));
  // clones are counted as they are made: headless a sparkle lives and dies inside
  // one step, so they never pile up the way they do on screen
  check('clicking meows, pops and bursts sparkles',
        clicked.ran.sound_play === 1 && clicked.ran.looks_changesizeby === 12 &&
        clicked.ran.control_create_clone_of >= 10,
        `${clicked.ran.looks_changesizeby} size steps, ${clicked.ran.control_create_clone_of} sparkles`);
  check('clicking counts as a wave', varOf('waves') > before, `waves = ${varOf('waves')}`);

  const rest = cat.y;
  const jump = await watch(1500, () => tap(' '));
  check('space launches the cat into a double spin',
        jump.peakY > rest + 100 && jump.ran.motion_turnright === 24,
        `y ${rest} -> ${jump.peakY.toFixed(0)}, ${jump.ran.motion_turnright} turns`);
  check('the cat lands on its feet', Math.abs(cat.y - rest) < 1 && cat.direction === 90,
        `y = ${cat.y.toFixed(1)}, direction ${cat.direction}`);

  const party = await watch(2000, () => tap('p'));
  check('P starts the party', varOf('party') === 1 && backdrop() === 'rave',
        `party = ${varOf('party')}, backdrop ${backdrop()}`);
  check('the cat dances instead of waving', party.costumes.has('cheer'),
        [...party.costumes].sort().join(' '));

  await watch(400, () => tap('b'));
  check('B changes the backdrop', backdrop() !== 'rave', backdrop());

  const x = cat.x;
  const drag = await watch(900, async () =>
    vm.postIOData('mouse', { x: 430, y: 80, isDown: true, canvasWidth: 480, canvasHeight: 360 }));
  vm.postIOData('mouse', { x: 430, y: 80, isDown: false, canvasWidth: 480, canvasHeight: 360 });
  check('holding the mouse drags the cat and draws with it',
        cat.x > x + 40 && drag.ran.pen_penDown > 0,
        `x ${x.toFixed(0)} -> ${cat.x.toFixed(0)}, pen down ${drag.ran.pen_penDown} times`);

  await sleep(6500);                                    // the party lasts 8 seconds
  check('the party ends by itself', varOf('party') === 0 && backdrop() === 'night',
        `party = ${varOf('party')}, backdrop ${backdrop()}`);
  const after = await watch(1200);
  check('the cat goes back to waving',
        [...after.costumes].some(n => n.startsWith('wave-')), [...after.costumes].sort().join(' '));

  vm.stopAll();
  vm.quit();
  console.error = realError;
  const real = errors.filter(e => !/rendering module|audio engine|Translation for/i.test(e));
  check('no runtime errors', real.length === 0, real.slice(0, 2).join(' | '));

  console.log(fails.length ? `\n${fails.length} failed: ${fails.join(', ')}` : '\nall checks passed');
  process.exit(fails.length ? 1 : 0);
})().catch(err => { console.error('crashed:', err); process.exit(1); });
