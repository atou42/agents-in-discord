#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const DEFAULT_BASE_URL = "https://s-b11e944f-112e-4d80-9ba5-6180dd522f44-3000.cohub.run";
const DEFAULT_DELIVERY_DIR = path.resolve("delivery/krea_neta_diagonal_eval");
const DEFAULT_OUT_DIR = path.resolve("delivery/krea_neta_diagonal_eval/execution_runs");
const DEFAULT_STEPS = 8;
const DEFAULT_CFG = 1;
const DEFAULT_DENOISE = 1;
const DEFAULT_SAMPLER = "euler";
const DEFAULT_SCHEDULER = "simple";
const DEFAULT_CREATIVITY = 0.35;
const DEFAULT_LORA_ID = "none";
const DEFAULT_LORA_STRENGTH = 0;
const DEFAULT_POLL_MS = 2000;
const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000;
const SEED_SLOTS = {
  1: "110001",
  2: "220002",
  3: "330003",
  4: "440004",
  5: "550005",
  6: "660006",
  7: "770007",
  8: "880008",
};
const ASPECT_DIMENSIONS = {
  portrait_4x5: { width: 1024, height: 1280 },
  square_1x1: { width: 1024, height: 1024 },
  landscape_16x9: { width: 1280, height: 720 },
};

function usage() {
  console.log(`Usage:
  node tools/run_krea_neta_diagonal_eval.mjs inspect [options]
  node tools/run_krea_neta_diagonal_eval.mjs dry-run [options]
  node tools/run_krea_neta_diagonal_eval.mjs run [options]

Options:
  --delivery-dir <path>   Delivery package root. Default: ${DEFAULT_DELIVERY_DIR}
  --base-url <url>        Krea work base URL. Default: ${DEFAULT_BASE_URL}
  --out-dir <path>        Output folder for rendered requests and run evidence.
  --guest-viewer <id>     Explicit guest viewer id. Must match guest_<32hex>.
  --ready-only            Only include rows whose IP prompt pack exists.
  --ip-slugs <a,b,c>      Limit to one or more IP slugs.
  --limit <n>             Limit row count after filtering.
  --poll-ms <n>           Poll interval in milliseconds. Default: ${DEFAULT_POLL_MS}
  --timeout-ms <n>        Per-job timeout in milliseconds. Default: ${DEFAULT_TIMEOUT_MS}
  --steps <n>             Steps override. Default: ${DEFAULT_STEPS}
  --cfg <n>               CFG override. Default: ${DEFAULT_CFG}
  --denoise <n>           Denoise override. Default: ${DEFAULT_DENOISE}
  --sampler <name>        Sampler override. Default: ${DEFAULT_SAMPLER}
  --scheduler <name>      Scheduler override. Default: ${DEFAULT_SCHEDULER}
  --creativity <n>        Creativity override. Default: ${DEFAULT_CREATIVITY}
  --lora-id <name>        LoRA id override. Default: ${DEFAULT_LORA_ID}
  --lora-strength <n>     LoRA strength override. Default: ${DEFAULT_LORA_STRENGTH}

Examples:
  node tools/run_krea_neta_diagonal_eval.mjs inspect --ready-only
  node tools/run_krea_neta_diagonal_eval.mjs dry-run --ready-only --limit 2
  node tools/run_krea_neta_diagonal_eval.mjs run --ready-only --ip-slugs the_lord_of_the_rings --limit 1
`);
}

function parseArgs(argv) {
  const [command, ...rest] = argv;
  if (!command || command === "--help" || command === "-h") {
    usage();
    process.exit(0);
  }
  const options = {
    deliveryDir: DEFAULT_DELIVERY_DIR,
    baseUrl: DEFAULT_BASE_URL,
    outDir: DEFAULT_OUT_DIR,
    readyOnly: false,
    ipSlugs: null,
    limit: null,
    pollMs: DEFAULT_POLL_MS,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    steps: DEFAULT_STEPS,
    cfg: DEFAULT_CFG,
    denoise: DEFAULT_DENOISE,
    sampler: DEFAULT_SAMPLER,
    scheduler: DEFAULT_SCHEDULER,
    creativity: DEFAULT_CREATIVITY,
    loraId: DEFAULT_LORA_ID,
    loraStrength: DEFAULT_LORA_STRENGTH,
    guestViewer: null,
  };
  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index];
    const next = rest[index + 1];
    if (arg === "--ready-only") {
      options.readyOnly = true;
      continue;
    }
    if (arg === "--delivery-dir") {
      options.deliveryDir = path.resolve(next);
      index += 1;
      continue;
    }
    if (arg === "--base-url") {
      options.baseUrl = String(next).replace(/\/$/, "");
      index += 1;
      continue;
    }
    if (arg === "--out-dir") {
      options.outDir = path.resolve(next);
      index += 1;
      continue;
    }
    if (arg === "--guest-viewer") {
      options.guestViewer = String(next).trim().toLowerCase();
      index += 1;
      continue;
    }
    if (arg === "--ip-slugs") {
      options.ipSlugs = String(next).split(",").map((value) => value.trim()).filter(Boolean);
      index += 1;
      continue;
    }
    if (arg === "--limit") {
      options.limit = Number.parseInt(next, 10);
      index += 1;
      continue;
    }
    if (arg === "--poll-ms") {
      options.pollMs = Number.parseInt(next, 10);
      index += 1;
      continue;
    }
    if (arg === "--timeout-ms") {
      options.timeoutMs = Number.parseInt(next, 10);
      index += 1;
      continue;
    }
    if (arg === "--steps") {
      options.steps = Number.parseInt(next, 10);
      index += 1;
      continue;
    }
    if (arg === "--cfg") {
      options.cfg = Number(next);
      index += 1;
      continue;
    }
    if (arg === "--denoise") {
      options.denoise = Number(next);
      index += 1;
      continue;
    }
    if (arg === "--sampler") {
      options.sampler = String(next);
      index += 1;
      continue;
    }
    if (arg === "--scheduler") {
      options.scheduler = String(next);
      index += 1;
      continue;
    }
    if (arg === "--creativity") {
      options.creativity = Number(next);
      index += 1;
      continue;
    }
    if (arg === "--lora-id") {
      options.loraId = String(next);
      index += 1;
      continue;
    }
    if (arg === "--lora-strength") {
      options.loraStrength = Number(next);
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }
  if (!["inspect", "dry-run", "run"].includes(command)) {
    throw new Error(`Unsupported command: ${command}`);
  }
  if (options.guestViewer && !/^guest_[a-f0-9]{32}$/.test(options.guestViewer)) {
    throw new Error("guest viewer must match guest_<32hex>");
  }
  return { command, options };
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

function parseCsv(text) {
  const rows = [];
  let field = "";
  let row = [];
  let inQuotes = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === '"') {
      if (inQuotes && next === '"') {
        field += '"';
        index += 1;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }
    if (char === "," && !inQuotes) {
      row.push(field);
      field = "";
      continue;
    }
    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(field);
      field = "";
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
      continue;
    }
    field += char;
  }
  if (field !== "" || row.length) {
    row.push(field);
    if (row.some((value) => value !== "")) rows.push(row);
  }
  if (!rows.length) return [];
  const headers = rows[0];
  return rows.slice(1).map((cols) => {
    const output = {};
    headers.forEach((header, index) => {
      output[header] = cols[index] ?? "";
    });
    return output;
  });
}

async function loadDelivery(deliveryDir) {
  const [styles, ips, runMatrixText] = await Promise.all([
    readJson(path.join(deliveryDir, "style_pool_100.json")),
    readJson(path.join(deliveryDir, "ip_pool_100.json")),
    fs.readFile(path.join(deliveryDir, "run_matrix_800.csv"), "utf8"),
  ]);
  const runMatrix = parseCsv(runMatrixText);
  const promptDir = path.join(deliveryDir, "prompt_packs");
  const promptEntries = await fs.readdir(promptDir, { withFileTypes: true }).catch(() => []);
  const promptPacks = {};
  for (const entry of promptEntries) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
    const slug = entry.name.replace(/\.json$/, "");
    promptPacks[slug] = await readJson(path.join(promptDir, entry.name));
  }
  return { styles, ips, runMatrix, promptPacks };
}

function buildIndexes(delivery) {
  const styleById = new Map(delivery.styles.map((style) => [style.styleId, style]));
  const ipById = new Map(delivery.ips.map((ip) => [ip.ipId, ip]));
  return { styleById, ipById };
}

function filterRows(delivery, indexes, options) {
  const rows = [];
  const missingPromptPackSlugs = new Set();
  for (const row of delivery.runMatrix) {
    const ip = indexes.ipById.get(row.ipId);
    const style = indexes.styleById.get(row.styleId);
    if (!ip || !style) {
      throw new Error(`Broken matrix row ${row.runId}: missing ip or style`);
    }
    if (options.ipSlugs && !options.ipSlugs.includes(ip.slug)) continue;
    const promptPack = delivery.promptPacks[ip.slug] || null;
    if (options.readyOnly && !promptPack) continue;
    if (!promptPack) missingPromptPackSlugs.add(ip.slug);
    rows.push({ ...row, ip, style, promptPack });
  }
  if (!options.readyOnly && missingPromptPackSlugs.size) {
    const missing = Array.from(missingPromptPackSlugs).sort();
    throw new Error(
      `Missing prompt packs for ${missing.length} IPs. Re-run with --ready-only or add prompt packs first. Missing sample: ${missing.slice(0, 12).join(", ")}`
    );
  }
  if (options.limit !== null) {
    return rows.slice(0, options.limit);
  }
  return rows;
}

function guessPrimaryEntity(ipName) {
  const normalized = ipName
    .replace(/^The\s+/i, "")
    .replace(/^A\s+/i, "")
    .replace(/^An\s+/i, "")
    .trim();
  return normalized;
}

function buildPromptParts(row) {
  const pack = row.promptPack;
  if (!pack) {
    throw new Error(`No prompt pack available for ${row.ip.slug}`);
  }
  const subjectAnchor = row.subjectCenter === "character_led"
    ? pack.primaryCharacterAnchor
    : pack.primaryWorldAnchor;
  const sceneAnchor = row.sceneMode === "iconic_static"
    ? pack.iconicStaticMoment
    : pack.dynamicEventMoment;
  const shotAnchor = row.shotMode === "close"
    ? pack.closeFramingDescription
    : pack.wideFramingDescription;
  const lightAnchor = row.lightMode === "bright"
    ? pack.brightReadableLightDescription
    : pack.darkDramaticLightDescription;
  const entity = guessPrimaryEntity(row.ip.name);
  const prompt = [
    `${entity}.`,
    subjectAnchor,
    sceneAnchor,
    shotAnchor,
    lightAnchor,
    "Keep the world identity specific, not generic.",
    "Preserve clear silhouette logic, scene readability, and material coherence.",
    "One finished image, no text, no collage, no border.",
  ].join(" ");
  const styleTreatment = [
    row.style.name,
    row.style.styleDescription,
    `Keywords: ${row.style.styleKeywords.slice(0, 6).join(", ")}.`,
  ].join(" ");
  return { prompt, styleTreatment };
}

function requestPayloadForRow(row, options) {
  const dims = ASPECT_DIMENSIONS[row.aspectProfile];
  if (!dims) {
    throw new Error(`Unknown aspect profile: ${row.aspectProfile}`);
  }
  const rendered = buildPromptParts(row);
  return {
    mode: "text-to-image",
    prompt: rendered.prompt,
    style: rendered.styleTreatment,
    styleTreatment: rendered.styleTreatment,
    width: dims.width,
    height: dims.height,
    steps: options.steps,
    cfg: options.cfg,
    denoise: options.denoise,
    sampler: options.sampler,
    scheduler: options.scheduler,
    seed: SEED_SLOTS[Number(row.seedSlot)] || "random",
    batchSize: 1,
    loraId: options.loraId,
    loraStrength: options.loraStrength,
    creativity: options.creativity,
    referenceImageId: null,
    moodboardId: null,
    agentTaskId: `krea-diagonal:${row.runId}`,
  };
}

function createGuestViewerUuid() {
  return `guest_${crypto.randomBytes(16).toString("hex")}`;
}

async function apiRequest(baseUrl, guestViewer, pathname, init = {}) {
  const headers = {
    "X-Krea-Guest": guestViewer,
    ...(init.body ? { "Content-Type": "application/json" } : {}),
    ...(init.headers || {}),
  };
  const response = await fetch(`${baseUrl}${pathname}`, { ...init, headers });
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text };
  }
  if (!response.ok) {
    const message = body?.message || body?.error || `${response.status} ${response.statusText}`;
    const error = new Error(`API ${pathname} failed: ${message}`);
    error.status = response.status;
    error.body = body;
    throw error;
  }
  return body;
}

async function ensureBaseUrlReady(baseUrl, guestViewer) {
  const [health, capabilities] = await Promise.all([
    apiRequest(baseUrl, guestViewer, "/api/health"),
    apiRequest(baseUrl, guestViewer, "/api/capabilities"),
  ]);
  if (!health?.ok || !health?.gpu?.comfyOk) {
    throw new Error("Krea work health check is not ready");
  }
  if (!capabilities?.textToImage) {
    throw new Error("Krea work text-to-image capability is not available");
  }
  return { health, capabilities };
}

async function pollJob(baseUrl, guestViewer, jobId, options) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < options.timeoutMs) {
    const job = await apiRequest(baseUrl, guestViewer, `/api/jobs/${jobId}`);
    if (job.status === "completed") return job;
    if (job.status === "failed") {
      throw new Error(job?.error?.message || `job ${jobId} failed`);
    }
    await new Promise((resolve) => setTimeout(resolve, options.pollMs));
  }
  throw new Error(`Timed out waiting for job ${jobId}`);
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function writeJson(filePath, value) {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function extensionFromContentType(contentType) {
  const normalized = String(contentType || "").toLowerCase();
  if (normalized.includes("image/webp")) return ".webp";
  if (normalized.includes("image/png")) return ".png";
  if (normalized.includes("image/jpeg")) return ".jpg";
  if (normalized.includes("image/gif")) return ".gif";
  return "";
}

function extensionFromUrl(url) {
  const pathname = new URL(url).pathname.toLowerCase();
  for (const ext of [".webp", ".png", ".jpg", ".jpeg", ".gif"]) {
    if (pathname.endsWith(ext)) return ext === ".jpeg" ? ".jpg" : ext;
  }
  return "";
}

async function downloadImage(url, fileStem, outDir) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.status} ${response.statusText}`);
  }
  const ext = extensionFromContentType(response.headers.get("content-type")) || extensionFromUrl(url) || ".bin";
  const filePath = path.join(outDir, `${fileStem}${ext}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  await fs.writeFile(filePath, buffer);
  return { filePath, bytes: buffer.length };
}

async function executeRow(baseUrl, guestViewer, row, options, outDir) {
  const rowDir = path.join(outDir, row.runId);
  await ensureDir(rowDir);
  const payload = requestPayloadForRow(row, options);
  await writeJson(path.join(rowDir, "request.json"), payload);
  const created = await apiRequest(baseUrl, guestViewer, "/api/jobs", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  await writeJson(path.join(rowDir, "job_created.json"), created);
  const final = await pollJob(baseUrl, guestViewer, created.id, options);
  await writeJson(path.join(rowDir, "job_final.json"), final);
  const imageUrls = Array.isArray(final.result?.images)
    ? final.result.images.map((image) => ({
        outputId: image.outputId || image.filename || null,
        imageUrl: image.imageUrl || image.fullUrl || null,
        thumbnailUrl: image.thumbnailUrl || image.thumbUrl || null,
        origUrl: image.origUrl || null,
      }))
    : [];
  const downloadedImages = [];
  for (let index = 0; index < imageUrls.length; index += 1) {
    const image = imageUrls[index];
    const sourceUrl = image.imageUrl || image.origUrl || image.thumbnailUrl;
    if (!sourceUrl) continue;
    const downloaded = await downloadImage(sourceUrl, `image_${String(index + 1).padStart(2, "0")}`, rowDir);
    downloadedImages.push({
      ...image,
      localPath: downloaded.filePath,
      bytes: downloaded.bytes,
    });
  }
  const summary = {
    runId: row.runId,
    ipId: row.ipId,
    ipName: row.ip.name,
    styleId: row.styleId,
    styleName: row.style.name,
    jobId: final.id,
    status: final.status,
    createdAt: final.createdAt || created.createdAt || null,
    seed: final.params?.seed ?? payload.seed,
    imageCount: imageUrls.length,
    imageUrls,
    downloadedImages,
  };
  await writeJson(path.join(rowDir, "summary.json"), summary);
  return summary;
}

async function writeRenderedPlan(rows, options, outDir) {
  await ensureDir(outDir);
  const rendered = rows.map((row) => ({
    runId: row.runId,
    ipSlug: row.ip.slug,
    ipName: row.ip.name,
    styleRole: row.styleRole,
    styleName: row.style.name,
    styleFamily: row.style.familyId,
    subjectCenter: row.subjectCenter,
    sceneMode: row.sceneMode,
    shotMode: row.shotMode,
    lightMode: row.lightMode,
    aspectProfile: row.aspectProfile,
    payload: requestPayloadForRow(row, options),
  }));
  await writeJson(path.join(outDir, "rendered_requests.json"), rendered);
  return rendered;
}

function inspectSummary(rows, delivery, options) {
  const readyIpSlugs = new Set(Object.keys(delivery.promptPacks));
  const missingPromptPacks = delivery.ips
    .filter((ip) => !readyIpSlugs.has(ip.slug))
    .map((ip) => ip.slug)
    .sort();
  return {
    deliveryDir: options.deliveryDir,
    baseUrl: options.baseUrl,
    totalStyles: delivery.styles.length,
    totalIps: delivery.ips.length,
    totalMatrixRows: delivery.runMatrix.length,
    availablePromptPacks: readyIpSlugs.size,
    readyIpSlugs: Array.from(readyIpSlugs).sort(),
    missingPromptPackCount: missingPromptPacks.length,
    missingPromptPacks: missingPromptPacks.slice(0, 20),
    selectedRows: rows.length,
  };
}

async function main() {
  const { command, options } = parseArgs(process.argv.slice(2));
  const delivery = await loadDelivery(options.deliveryDir);
  const indexes = buildIndexes(delivery);
  const rows = filterRows(delivery, indexes, options);

  if (command === "inspect") {
    console.log(JSON.stringify(inspectSummary(rows, delivery, options), null, 2));
    return;
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const runRoot = path.join(options.outDir, `${command}-${stamp}`);
  await ensureDir(runRoot);
  const rendered = await writeRenderedPlan(rows, options, runRoot);
  if (command === "dry-run") {
    await writeJson(path.join(runRoot, "summary.json"), {
      mode: "dry-run",
      renderedRows: rendered.length,
      readyOnly: options.readyOnly,
      ipSlugs: options.ipSlugs || [],
    });
    console.log(JSON.stringify({ mode: "dry-run", runRoot, renderedRows: rendered.length }, null, 2));
    return;
  }

  const guestViewer = options.guestViewer || createGuestViewerUuid();
  const health = await ensureBaseUrlReady(options.baseUrl, guestViewer);
  await writeJson(path.join(runRoot, "health_check.json"), {
    guestViewer,
    health,
  });

  const results = [];
  for (const row of rows) {
    const summary = await executeRow(options.baseUrl, guestViewer, row, options, path.join(runRoot, "runs"));
    results.push(summary);
  }
  await writeJson(path.join(runRoot, "results_summary.json"), {
    guestViewer,
    totalRows: rows.length,
    completedRows: results.length,
    results,
  });
  console.log(JSON.stringify({ mode: "run", runRoot, guestViewer, completedRows: results.length }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
