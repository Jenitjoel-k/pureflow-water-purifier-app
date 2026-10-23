// Generates a clean studio product photo for every catalog item with FLUX
// and saves it to admin/public/products/<id>.jpg (served by Vercel).
//
// Pick ONE free provider by setting its env vars:
//   Cloudflare Workers AI : CF_ACCOUNT_ID + CF_API_TOKEN       (free daily quota)
//   Hugging Face          : HF_TOKEN                           (free monthly credits)
//   Pollinations          : POLLINATIONS_TOKEN                 (free account at auth.pollinations.ai)
//
// Options:
//   --only=id1,id2   regenerate just these products
//   --force          overwrite existing images
//   --cloudinary     also upload to Cloudinary (needs CLOUDINARY_CLOUD_NAME +
//                    CLOUDINARY_UPLOAD_PRESET, an unsigned preset) and write
//                    scripts/image-urls.json for the seed script
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { catalog } from './catalog.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '..', 'public', 'products');
fs.mkdirSync(outDir, { recursive: true });

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')).map(([k, v]) => [k, v ?? true]));
const only = args.only ? new Set(String(args.only).split(',')) : null;

const prompt = (p) =>
  `Professional e-commerce product photograph of a ${p.look}. Single product, centered, full product visible, ` +
  'isolated on a pure white seamless background, soft diffused studio lighting, subtle natural shadow, ' +
  'sharp focus, photorealistic, high detail, commercial catalog style, no text, no logo, no watermark, no people.';

async function viaCloudflare(text) {
  const { CF_ACCOUNT_ID, CF_API_TOKEN } = process.env;
  const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/ai/run/@cf/black-forest-labs/flux-1-schnell`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${CF_API_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: text, steps: 8 }),
  });
  const j = await r.json();
  if (!r.ok || !j.result?.image) throw new Error(`Cloudflare ${r.status}: ${JSON.stringify(j.errors || j).slice(0, 200)}`);
  return Buffer.from(j.result.image, 'base64');
}

// Hugging Face routes FLUX.1-schnell to partner providers (needs a token with
// "Make calls to Inference Providers"). Try nscale first, then fal-ai.
async function viaHuggingFace(text, seed) {
  const headers = { Authorization: `Bearer ${process.env.HF_TOKEN}`, 'Content-Type': 'application/json' };
  const errors = [];

  const ns = await fetch('https://router.huggingface.co/nscale/v1/images/generations', {
    method: 'POST',
    headers,
    body: JSON.stringify({ model: 'black-forest-labs/FLUX.1-schnell', prompt: text, size: '1024x1024', response_format: 'b64_json', seed }),
  });
  if (ns.ok) {
    const j = await ns.json();
    if (j.data?.[0]?.b64_json) return Buffer.from(j.data[0].b64_json, 'base64');
    errors.push('nscale: empty response');
  } else errors.push(`nscale ${ns.status}: ${(await ns.text()).slice(0, 150)}`);

  const fal = await fetch('https://router.huggingface.co/fal-ai/fal-ai/flux/schnell', {
    method: 'POST',
    headers,
    body: JSON.stringify({ prompt: text, image_size: 'square_hd', num_inference_steps: 4, seed, enable_safety_checker: true }),
  });
  if (fal.ok) {
    const j = await fal.json();
    const url = j.images?.[0]?.url;
    if (url) return Buffer.from(await (await fetch(url)).arrayBuffer());
    errors.push('fal-ai: empty response');
  } else errors.push(`fal-ai ${fal.status}: ${(await fal.text()).slice(0, 150)}`);

  throw new Error(`Hugging Face providers failed – ${errors.join(' | ')}`);
}

async function viaPollinations(text, seed) {
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(text)}?model=flux&width=768&height=768&nologo=true&enhance=false&seed=${seed}`;
  const r = await fetch(url, { headers: { Authorization: `Bearer ${process.env.POLLINATIONS_TOKEN}` } });
  if (!r.ok) throw new Error(`Pollinations ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return Buffer.from(await r.arrayBuffer());
}

const provider = process.env.CF_API_TOKEN ? ['Cloudflare', viaCloudflare]
  : process.env.HF_TOKEN ? ['Hugging Face', viaHuggingFace]
    : process.env.POLLINATIONS_TOKEN ? ['Pollinations', viaPollinations]
      : null;
if (!provider) {
  console.error('Set CF_ACCOUNT_ID+CF_API_TOKEN, HF_TOKEN or POLLINATIONS_TOKEN. See the header of this file.');
  process.exit(1);
}

async function uploadCloudinary(file, id) {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET } = process.env;
  const form = new FormData();
  form.append('file', `data:image/jpeg;base64,${fs.readFileSync(file).toString('base64')}`);
  form.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  form.append('public_id', `pureflow/${id}`);
  const r = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, { method: 'POST', body: form });
  const j = await r.json();
  if (!r.ok) throw new Error(`Cloudinary: ${j.error?.message}`);
  // f_auto,q_auto serves WebP/AVIF at the right quality automatically.
  return j.secure_url.replace('/upload/', '/upload/f_auto,q_auto,w_800/');
}

const [name, generate] = provider;
console.log(`Generating with ${name} → ${outDir}`);
const urlMapPath = path.join(here, 'image-urls.json');
const urlMap = fs.existsSync(urlMapPath) ? JSON.parse(fs.readFileSync(urlMapPath, 'utf8')) : {};
let made = 0;
const failed = [];

for (const [i, p] of catalog.entries()) {
  if (only && !only.has(p.id)) continue;
  const file = path.join(outDir, `${p.id}.jpg`);
  if (fs.existsSync(file) && !args.force) {
    console.log(`  skip  ${p.id} (exists)`);
  } else {
    let ok = false;
    for (let attempt = 1; attempt <= 3 && !ok; attempt++) {
      try {
        const raw = await generate(prompt(p), 1000 + i);
        await sharp(raw)
          .resize(800, 800, { fit: 'contain', background: '#ffffff' })
          .flatten({ background: '#ffffff' })
          .jpeg({ quality: 84, mozjpeg: true })
          .toFile(file);
        ok = true;
        made++;
        console.log(`  ✓     ${p.id}`);
      } catch (e) {
        console.log(`  retry ${p.id} (${attempt}/3): ${e.message}`);
        await new Promise((r) => setTimeout(r, 4000 * attempt));
      }
    }
    if (!ok) {
      failed.push(p.id);
      continue;
    }
  }
  if (args.cloudinary && (!urlMap[p.id] || args.force)) {
    urlMap[p.id] = await uploadCloudinary(file, p.id);
    fs.writeFileSync(urlMapPath, JSON.stringify(urlMap, null, 2));
  }
}

console.log(`\nGenerated ${made} image(s).${failed.length ? ` Failed: ${failed.join(', ')} (re-run to retry)` : ''}`);
if (args.cloudinary) console.log(`Cloudinary URLs written to ${urlMapPath}`);
