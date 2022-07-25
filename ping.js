/*

  A simple utility that lets me run a script locally to publish
  one cast after a 24 hour timer expires.
  
  Eventually this should be moved to ~~the cloud~~.

*/

import {existsSync, readFileSync, writeFileSync} from 'fs';
import path from 'path';
import publish from './publish.js';

const tmp = path.resolve('.ping.json');

if (!process.env.BOT_ENDPOINT) throw new Error('Must specify BOT_ENDPOINT env variable');

const INTERVAL = 86400;

let lastPing;
if (existsSync(tmp)) {
  try { lastPing = JSON.parse(readFileSync(tmp, 'utf8')) }
  catch (err) { console.error(err); }
}

const now = Date.now();
let shouldPing = false;
if (lastPing == null) {
  shouldPing = true;
} else {
  const timeBetween = (now - lastPing)/1000;
  console.log('Time since last publish in seconds: ', timeBetween);
  if (timeBetween > INTERVAL) {
    shouldPing = true;
  } else {
    console.log('Not yet 24 hours, try again later.');
  }
}

if (shouldPing) {
  console.log('Publishing...')
  publish();
  writeFileSync(tmp, JSON.stringify(now));
}