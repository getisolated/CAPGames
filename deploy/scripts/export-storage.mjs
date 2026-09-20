// =============================================================================
// Télécharge tous les fichiers des buckets Supabase cloud vers deploy/data/storage/.
//
//   CLOUD_SUPABASE_URL=https://xxxx.supabase.co \
//   CLOUD_SERVICE_ROLE_KEY=eyJ... \
//     node deploy/scripts/export-storage.mjs
//
// À lancer depuis la racine du repo (utilise node_modules/@supabase/supabase-js).
// =============================================================================
import { createClient } from "@supabase/supabase-js";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const url = process.env.CLOUD_SUPABASE_URL;
const key = process.env.CLOUD_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("CLOUD_SUPABASE_URL et CLOUD_SERVICE_ROLE_KEY requis");
  process.exit(1);
}

const BUCKETS = ["team-logos", "photos", "poll-choices", "quiz-media"];
const outRoot = path.resolve("deploy/data/storage");
const supabase = createClient(url, key, { auth: { persistSession: false } });

async function listAll(bucket, prefix = "") {
  const files = [];
  let offset = 0;
  const limit = 1000;
  for (;;) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(prefix, { limit, offset, sortBy: { column: "name", order: "asc" } });
    if (error) throw new Error(`${bucket}/${prefix}: ${error.message}`);
    for (const entry of data) {
      const full = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.id === null) {
        files.push(...(await listAll(bucket, full))); // dossier
      } else if (entry.name !== ".emptyFolderPlaceholder") {
        files.push(full);
      }
    }
    if (data.length < limit) break;
    offset += limit;
  }
  return files;
}

let total = 0;
for (const bucket of BUCKETS) {
  const files = await listAll(bucket);
  console.log(`▶ ${bucket}: ${files.length} fichier(s)`);
  for (const f of files) {
    const { data, error } = await supabase.storage.from(bucket).download(f);
    if (error) {
      console.error(`  ✗ ${f}: ${error.message}`);
      continue;
    }
    const dest = path.join(outRoot, bucket, f);
    await mkdir(path.dirname(dest), { recursive: true });
    await writeFile(dest, Buffer.from(await data.arrayBuffer()));
    total++;
  }
}
console.log(`✅ ${total} fichier(s) dans ${outRoot}`);
