#!/usr/bin/env node
/*
 * Offline loader: renders index.html frame by frame in headless Chromium at
 * 1920x1080 and encodes an H.264 (High profile) MP4 of the requested length.
 * Frames are stepped by exactly 1/fps of simulated time, so the output length
 * is exact and does not depend on how fast this machine renders.
 *
 * Setup (once):   npm install            (installs playwright)
 *                 npx playwright install chromium
 *                 ffmpeg must be on PATH   (Windows: winget install ffmpeg)
 *
 * Usage:
 *   node render_video.mjs --seconds 12
 *   node render_video.mjs --seconds 30 --fps 30 --out dial.mp4
 *   node render_video.mjs --seconds 8 --query "explode=1&spread=0.6"
 *
 * Options:
 *   --seconds N      length of the video in seconds (required)
 *   --fps N          frame rate, default 60
 *   --out FILE       output file, default unitas-6497-1_1920x1080.mp4
 *   --html FILE      page to render, default index.html next to this script
 *   --query STR      page query string, e.g. "explode=1&cam=40,-30,60"
 *   --crf N          x264 quality (lower is better), default 18
 *   --chromium PATH  browser binary, default Playwright's bundled Chromium
 *                    (or the CHROMIUM_PATH environment variable)
 */
import { chromium } from 'playwright';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

const W = 1920;
const H = 1080;

const { values: opt } = parseArgs({
  options: {
    seconds: { type: 'string' },
    fps: { type: 'string', default: '60' },
    out: { type: 'string', default: 'unitas-6497-1_1920x1080.mp4' },
    html: { type: 'string' },
    query: { type: 'string', default: '' },
    crf: { type: 'string', default: '18' },
    chromium: { type: 'string' },
  },
});

const seconds = Number(opt.seconds);
const fps = Number(opt.fps);
if (!(seconds > 0) || !(fps > 0)) {
  console.error('usage: node render_video.mjs --seconds <n> [--fps 60] [--out file.mp4]');
  process.exit(2);
}

if (spawnSync('ffmpeg', ['-version']).error) {
  console.error('ffmpeg was not found on PATH. Install it and try again.');
  process.exit(1);
}

const here = path.dirname(fileURLToPath(import.meta.url));
const htmlPath = path.resolve(opt.html ?? path.join(here, 'index.html'));
const frames = Math.round(seconds * fps);
const dt = 1 / fps;

const browser = await chromium.launch({
  executablePath: opt.chromium || process.env.CHROMIUM_PATH || undefined,
  args: ['--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'],
});

const pageErrors = [];
let ffmpeg = null;

try {
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  page.on('pageerror', e => pageErrors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') pageErrors.push(m.text()); });

  const url = pathToFileURL(htmlPath).href + (opt.query ? `?${opt.query}` : '');
  await page.goto(url);
  // keep only the 3D canvas in the picture: hide the HUD, GUI and vignette overlays
  await page.addStyleTag({
    content: '.hud,#labels,.vignette,#gui-host,#loading{display:none!important}',
  });
  await page.waitForFunction(() => window.__UNITAS_READY__ === true, null, { timeout: 180_000 });

  await page.evaluate(() => window.__UNITAS_CAPTURE__.begin());

  ffmpeg = spawn('ffmpeg', [
    '-y', '-loglevel', 'error',
    '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', '-',
    '-frames:v', String(frames),
    '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', opt.crf,
    '-profile:v', 'high', '-level:v', '4.2', '-pix_fmt', 'yuv420p',
    '-r', String(fps), '-movflags', '+faststart',
    opt.out,
  ], { stdio: ['pipe', 'inherit', 'inherit'] });
  const ffmpegDone = once(ffmpeg, 'close');

  const t0 = Date.now();
  for (let i = 0; i < frames; i++) {
    const dataUrl = await page.evaluate(step => window.__UNITAS_CAPTURE__.frame(step), dt);
    const png = Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64');
    if (!ffmpeg.stdin.write(png)) await once(ffmpeg.stdin, 'drain');
    if (i % fps === 0 || i === frames - 1) {
      console.log(`frame ${i + 1}/${frames}  (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
    }
  }

  ffmpeg.stdin.end();
  const [code] = await ffmpegDone;
  if (code !== 0) throw new Error(`ffmpeg exited with code ${code}`);
  await page.evaluate(() => window.__UNITAS_CAPTURE__.end());
  console.log(`saved ${path.resolve(opt.out)}: ${frames} frames, ${(frames / fps).toFixed(2)} s, ${W}x${H} H.264`);
} catch (err) {
  if (ffmpeg && ffmpeg.exitCode === null) ffmpeg.kill();
  console.error('render failed:', err.message);
  for (const msg of pageErrors.slice(0, 10)) console.error('  page:', msg);
  process.exitCode = 1;
} finally {
  await browser.close();
}
