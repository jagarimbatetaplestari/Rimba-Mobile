import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

// Mobile owns auth, game state, native bridges, types and UI. They must never
// be overwritten by the older Website implementation during a mobile build.
const mobileDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const websiteDir = path.resolve(mobileDir, '../Rimba-Website');
const args = process.argv.slice(2);
if (args.some(arg => arg !== '--apply-assets')) throw new Error('Only --apply-assets is supported; code synchronization is disabled.');
const apply = args.includes('--apply-assets');
const allowlist = ['public/models', 'public/music', 'public/Textures', 'public/kenney', 'public/logo-web.png', 'public/Logo.png'];
const changes = [];
const digest = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
function inspect(relative) {
  const source = path.join(websiteDir, relative);
  const target = path.join(mobileDir, relative);
  if (!fs.existsSync(source)) return;
  const info = fs.lstatSync(source);
  if (info.isSymbolicLink()) throw new Error(`Symlink is not an approved shared asset: ${relative}`);
  if (info.isDirectory()) {
    for (const name of fs.readdirSync(source)) inspect(path.join(relative, name));
  } else if (!fs.existsSync(target) || digest(source) !== digest(target)) {
    changes.push({ relative, source, target });
  }
}
for (const relative of allowlist) inspect(relative);
console.log(`Rimba shared assets: ${changes.length} changed/missing files. ${apply ? 'Applying asset copies.' : 'Preview only; no files written.'}`);
for (const change of changes) {
  console.log(change.relative);
  if (apply) {
    fs.mkdirSync(path.dirname(change.target), { recursive: true });
    fs.copyFileSync(change.source, change.target);
  }
}
console.log('Auth, game engine, native bridges, types, pages and UI stay under Mobile ownership.');
