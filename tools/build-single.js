#!/usr/bin/env node
/* Bundle the whole game into one HTML file with no external references, so it
   can be downloaded and opened by double-clicking with nothing installed.

   Emits:
     dist/school-simulator.html   a complete standalone document
     dist/artifact.html           the same page without the outer document
                                  wrapper, for hosts that supply their own

   Run with: npm run build */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const html = read('index.html');

const title = html.match(/<title>([^<]+)<\/title>/)[1];
const scripts = (html.match(/<script src="([^"]+)"><\/script>/g) || [])
  .map((tag) => tag.match(/src="([^"]+)"/)[1]);
const css = read('assets/css/style.css');

/* The markup between <body> and the first script tag: everything the game
   draws into, minus the loaders we are about to inline. */
const bodyStart = html.indexOf('<body>') + '<body>'.length;
const markup = html.slice(bodyStart, html.indexOf('<script src=')).trim();

const inlined = scripts.map((rel) => {
  const source = read(rel);
  if (source.indexOf('</script') >= 0) {
    throw new Error(rel + ' contains a literal </script and cannot be inlined');
  }
  return '/* ' + rel + ' */\n' + source;
}).join('\n');

const favicon = 'data:image/png;base64,' +
  fs.readFileSync(path.join(ROOT, 'assets/icons/favicon.png')).toString('base64');

const style = '<style>\n' + css + '\n</style>';
const code = '<script>\n' + inlined + '\n</script>';

/* --- standalone document --- */
const standalone = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${title}</title>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
<meta name="description" content="A school life simulator: go to class, sit exams, make friends and try to get enough sleep.">
<meta name="theme-color" content="#161a22">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<link rel="icon" type="image/png" href="${favicon}">
${style}
</head>
<body>
${markup}
${code}
</body>
</html>
`;

/* --- fragment for a host that wraps the page itself --- */
const fragment = `<title>${title}</title>
${style}
${markup}
${code}
`;

fs.mkdirSync(DIST, { recursive: true });
fs.writeFileSync(path.join(DIST, 'school-simulator.html'), standalone);
fs.writeFileSync(path.join(DIST, 'artifact.html'), fragment);

const kb = (s) => (Buffer.byteLength(s) / 1024).toFixed(0) + ' KB';
console.log('dist/school-simulator.html  ' + kb(standalone) + '   (open this one by double-clicking)');
console.log('dist/artifact.html          ' + kb(fragment));
console.log('inlined ' + scripts.length + ' scripts and 1 stylesheet, 0 external requests');
