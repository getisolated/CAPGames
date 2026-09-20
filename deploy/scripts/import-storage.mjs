// =============================================================================
// Envoie deploy/data/storage/<bucket>/... vers le Storage auto-hébergé, en
// conservant les mêmes chemins (photos.storage_path, image_path restent valides).
//
//   node deploy/scripts/import-storage.mjs
//
// Lit SUPABASE_PUBLIC_URL et SERVICE_ROLE_KEY dans deploy/.env.
// Les buckets doivent exister (créés par les migrations 0004 et 0009).
// =============================================================================
import { createClient } from "@supabase/supabase-js";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

const envText = await readFile(path.resolve("deploy/.env"), "utf8");
const env = Object.fromEntries(
  envText
    .split("\n")
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)])
);
const url = process.env.TARGET_SUPABASE_URL ?? env.SUPABASE_PUBLIC_URL;
const key = env.SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("SUPABASE_PUBLIC_URL / SERVICE_ROLE_KEY introuvables dans deploy/.env");
  process.exit(1);
}

const MIME = {
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif",
  webp: "image/webp", heic: "image/heic", heif: "image/heif", svg: "image/svg+xml",
  avif: "image/avif", mp4: "video/mp4", mov: "video/quicktime",
};

const root = path.resolve("deploy/data/storage");
const supabase = createClient(url, key, { auth: { persistSession: false } });

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir)) {
    const p = path.join(dir, entry);
    if ((await stat(p)).isDirectory()) out.push(...(await walk(p)));
    else if (!entry.startsWith(".")) out.push(p);
  }
  return out;
}

let ok = 0;
let ko = 0;
for (const bucket of await readdir(root)) {
  const bucketDir = path.join(root, bucket);
  if (!(await stat(bucketDir)).isDirectory()) continue;
  const files = await walk(bucketDir);
  console.log(`▶ ${bucket}: ${files.length} fichier(s)`);
  for (const file of files) {
    const objectPath = path.relative(bucketDir, file).split(path.sep).join("/");
    const ext = objectPath.split(".").pop()?.toLowerCase() ?? "";
    const { error } = await supabase.storage
      .from(bucket)
      .upload(objectPath, await readFile(file), {
        contentType: MIME[ext] ?? "application/octet-stream",
        upsert: true,
      });
    if (error) {
      ko++;
      console.error(`  ✗ ${objectPath}: ${error.message}`);
    } else ok++;
  }
}
console.log(`✅ ${ok} envoyé(s), ${ko} échec(s)`);
