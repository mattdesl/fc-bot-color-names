/*

  A simple version of this bot would be to host it on a server
  with a hidden endpoint, and set up an uptime robot that will
  ping this endpoint once per day to publish casts.

*/

import 'dotenv/config';
import express from "express";
import publish from './publish';

if (!process.env.BOT_ENDPOINT) throw new Error('Must specify BOT_ENDPOINT env variable');

const app = express();
app.get(process.env.BOT_ENDPOINT, async (req, res) => {
  try {
    const p = publish();
    p.then(() => console.log("publish success")).catch((err) =>
      console.error(err)
    );
  } catch (err) {
    console.error(err);
  }
  res.json({ ok: true, publish: true });
});

app.get("/", (req, res) => {
  res.json({ ok: true });
});

const listener = app.listen(process.env.PORT || 9966, function () {
  console.log("Your bot is running on port " + listener.address().port);
});
