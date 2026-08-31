// Dev helper: synthesizes short placeholder WAV narration for every tour_stop,
// uploads it to the private `duxiter-audio` bucket and sets audio_url.
// Run with: node scripts/gen-test-audio.mjs   (reads .env.local)
// Safe to re-run (upserts).
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n").filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }),
);
const URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = "duxiter-audio";
const H = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` };

/** Build a short mono 16-bit PCM WAV: a soft two-note chime + gentle sine bed. */
function makeWav(seconds, baseHz) {
  const rate = 16000;
  const n = seconds * rate;
  const data = Buffer.alloc(n * 2);
  for (let i = 0; i < n; i++) {
    const t = i / rate;
    const env = Math.min(1, t * 3) * Math.max(0, 1 - (t - (seconds - 1.5)) / 1.5);
    const bed = 0.12 * Math.sin(2 * Math.PI * baseHz * t);
    const chimeT = t % 2.5;
    const chime =
      0.22 *
      Math.exp(-chimeT * 3) *
      Math.sin(2 * Math.PI * (baseHz * 2 + (chimeT < 0.15 ? 0 : baseHz)) * t);
    let s = (bed + chime) * env;
    s = Math.max(-1, Math.min(1, s));
    data.writeInt16LE((s * 32767) | 0, i * 2);
  }
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(rate, 24);
  header.writeUInt32LE(rate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

const stops = await fetch(
  `${URL}/rest/v1/tour_stops?select=id,tour_id,order_index&order=tour_id,order_index`,
  { headers: H },
).then((r) => r.json());
console.log(`${stops.length} stops`);

for (const s of stops) {
  const seconds = 10 + (s.order_index % 4) * 3; // 10..19s
  const baseHz = 180 + ((s.order_index * 40) % 220); // vary pitch per stop
  const wav = makeWav(seconds, baseHz);
  const path = `tours/${s.tour_id}/stops/${s.id}.wav`;

  const up = await fetch(`${URL}/storage/v1/object/${BUCKET}/${path}`, {
    method: "POST",
    headers: { ...H, "Content-Type": "audio/wav", "x-upsert": "true" },
    body: wav,
  });
  const upBody = await up.text();

  const patch = await fetch(`${URL}/rest/v1/tour_stops?id=eq.${s.id}`, {
    method: "PATCH",
    headers: { ...H, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({ audio_url: path, audio_duration_seconds: seconds }),
  });

  console.log(
    `${path.slice(0, 46)}…  upload ${up.status}${up.ok ? "" : " " + upBody}  patch ${patch.status}`,
  );
}
