import { spawn } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = __dirname;
const ASSETS_DIR = path.join(ROOT, "assets", "live-runs");
const IMAGE2_SCRIPT = process.env.IMAGE2_SCRIPT || "/Users/atou/.codex/skills/image2/scripts/image2.py";
const CUT_TOOL = path.join(ROOT, "tools", "nine_grid_tool.py");
const PORT = parsePort(process.env.PORT || "3000");
const LIVE_GRID_COUNT = parseLiveGridCount(process.env.LIVE_GRID_COUNT || "1");
const PYTHON_BIN = process.env.PYTHON_BIN || "python3";
const IMAGE_MODEL = process.env.IMAGE_MODEL || "gpt-image-2";
const COHUB_SPACE_ID = process.env.COHUB_SPACE_ID || "6b9e799d-3711-4143-8a03-0b082a46c261";

const jobs = new Map();

const MIME = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".webp", "image/webp"],
  [".zip", "application/zip"],
]);

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    if (req.method === "POST" && url.pathname === "/api/runs") {
      return await handleCreateRun(req, res);
    }
    if (req.method === "GET" && url.pathname.startsWith("/api/runs/")) {
      return handleGetRun(url.pathname.split("/").at(-1), res);
    }
    if (req.method === "GET" || req.method === "HEAD") {
      return serveStatic(url.pathname, req, res);
    }
    sendJson(res, 405, { error: "method_not_allowed" });
  } catch (error) {
    sendJson(res, 500, { error: "internal_error", message: error?.message || String(error) });
  }
});

server.listen(PORT, () => {
  console.log(`get the 10 live server: http://localhost:${PORT}`);
});

function parsePort(raw) {
  const port = Number(raw);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(`Invalid PORT: ${raw}`);
  }
  return port;
}

function parseLiveGridCount(raw) {
  const count = Number(raw);
  if (!Number.isInteger(count) || count < 1 || count > 3) {
    throw new Error(`Invalid LIVE_GRID_COUNT: ${raw}`);
  }
  return count;
}

async function handleCreateRun(req, res) {
  const body = await readJson(req);
  const intent = String(body.intent || "").trim();
  if (!intent) {
    return sendJson(res, 400, { error: "missing_intent", message: "先输入一个短意图。" });
  }

  const runId = `${Date.now().toString(36)}-${crypto.randomBytes(4).toString("hex")}`;
  const job = {
    id: runId,
    intent,
    status: "queued",
    progress: 0,
    step: "排队",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    manifest: null,
    manifestPath: null,
    error: null,
  };
  jobs.set(runId, job);
  runRoundOne(job).catch((error) => failJob(job, error));
  sendJson(res, 202, serializeJob(job));
}

function handleGetRun(runId, res) {
  const job = jobs.get(runId);
  if (!job) {
    return sendJson(res, 404, { error: "run_not_found", message: "生成任务不存在。" });
  }
  sendJson(res, 200, serializeJob(job));
}

async function runRoundOne(job) {
  const runDir = path.join(ASSETS_DIR, job.id);
  const gridsDir = path.join(runDir, "grids");
  const slicesDir = path.join(runDir, "slices");
  fs.mkdirSync(gridsDir, { recursive: true });
  fs.mkdirSync(slicesDir, { recursive: true });

  updateJob(job, { status: "running", step: "准备生成", progress: 4 });
  for (let index = 1; index <= LIVE_GRID_COUNT; index += 1) {
    updateJob(job, {
      step: `生成九宫格 ${index}/${LIVE_GRID_COUNT}`,
      progress: 8 + Math.round((index - 1) * (72 / LIVE_GRID_COUNT)),
    });
    await runImage2WithRetry(job, {
      prompt: buildRoundOnePrompt(job.intent, index),
      outputDir: gridsDir,
      baseName: `grid-${String(index).padStart(2, "0")}`,
      gridIndex: index,
      gridCount: LIVE_GRID_COUNT,
    });
  }

  updateJob(job, { step: "切割候选", progress: 82 });
  const manifest = await buildManifestFromGrids(job, gridsDir, slicesDir);
  if (!Array.isArray(manifest.items) || manifest.items.length < LIVE_GRID_COUNT * 9) {
    throw new Error(`切片结果不足 ${LIVE_GRID_COUNT * 9} 张。`);
  }
  const manifestPath = path.join(slicesDir, "manifest.json");
  fs.mkdirSync(slicesDir, { recursive: true });
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  updateJob(job, {
    status: "complete",
    step: "完成",
    progress: 100,
    manifestPath: path.relative(ROOT, manifestPath).split(path.sep).join("/"),
    manifest,
  });
}

async function buildManifestFromGrids(job, gridsDir, slicesDir) {
  const remoteManifest = buildRemoteCropManifest(job, gridsDir);
  if (remoteManifest) return remoteManifest;

  await ensurePillow();
  await runProcess(PYTHON_BIN, [
    CUT_TOOL,
    "batch-cut",
    "--input-dir",
    gridsDir,
    "--output-dir",
    slicesDir,
    "--pattern",
    "*.png",
    "--web-root",
    ROOT,
  ], { timeoutMs: 120_000 });

  const manifestPath = path.join(slicesDir, "manifest.json");
  return JSON.parse(fs.readFileSync(manifestPath, "utf8"));
}

function buildRemoteCropManifest(job, gridsDir) {
  const remoteFiles = fs.readdirSync(gridsDir)
    .filter((name) => name.endsWith(".remote.json"))
    .sort();
  if (!remoteFiles.length) return null;

  const items = [];
  remoteFiles.forEach((name, gridOffset) => {
    const source = JSON.parse(fs.readFileSync(path.join(gridsDir, name), "utf8"));
    const gridIndex = gridOffset + 1;
    for (let row = 0; row < 3; row += 1) {
      for (let col = 0; col < 3; col += 1) {
        const cellIndex = row * 3 + col + 1;
        items.push({
          path: source.url,
          prompt: `真实候选 ${items.length + 1} / ${job.intent}`,
          grid_index: gridIndex,
          cell_index: cellIndex,
          crop: { rows: 3, cols: 3, row, col },
          width: 1024,
          height: 682,
        });
      }
    }
  });
  return { items };
}

function buildRoundOnePrompt(intent, gridIndex) {
  const angle = [
    "离开熟悉世界的第一刻，强调门槛、回头、出发点和未知目的地。",
    "旅途已经开始很久以后，强调疲惫、路途压力、临时停靠和方向感。",
    "远行作为世界规则，强调交通制度、边境秩序、迁徙仪式和空间等级。",
  ][gridIndex - 1];

  return [
    "想象你去参加了下一届世界渲染大赛。这一届的主题在最后告诉你。",
    "请你带回来 9 张横向画幅的参赛作品截图，把它们拼到一张大图上。",
    "九张图来自九个不同创作者，对同一个主题做出完全不同的想象。",
    "每一张都必须像真实参赛作品的最终渲染截图，不是概念草图，不是 moodboard，不是插画拼贴。",
    "不要文字，不要标题，不要编号，不要 UI，不要水印。",
    "九宫格之间用很细的黑色间隔分开，方便后续切割。",
    "每一格都要可以单独切出来作为一个世界首帧候选，不能互相连成同一张大场景。",
    "对于每一个 idea，都不要选择最开始想到的那个，而是选择第二个想到的。",
    `这一版的探索角度是：${angle}`,
    `这一届的主题是：${intent}`,
  ].join("\n\n");
}

async function runImage2({ prompt, outputDir, baseName }) {
  if (fs.existsSync(IMAGE2_SCRIPT)) {
    await runProcess(PYTHON_BIN, [
      IMAGE2_SCRIPT,
      "--size",
      "2k-landscape",
      "--timeout",
      "240",
      "--output-dir",
      outputDir,
      "--base-name",
      baseName,
      "--prompt",
      prompt,
    ], { timeoutMs: 300_000 });
    return;
  }

  const stdout = await runProcess("cohub", [
    "-s",
    COHUB_SPACE_ID,
    "generate",
    prompt,
    "--model",
    IMAGE_MODEL,
    "--param",
    "size=2k-landscape",
    "--timeout-ms",
    "300000",
    "--json",
  ], { timeoutMs: 330_000 });
  const url = extractGeneratedImageUrl(stdout);
  if (!url) {
    throw new Error(`真实生成没有返回图片 URL。${stdout.trim()}`);
  }
  fs.writeFileSync(path.join(outputDir, `${baseName}.remote.json`), JSON.stringify({ url }, null, 2));
}

function extractGeneratedImageUrl(stdout) {
  const parsed = JSON.parse(stdout);
  const output = parsed?.result?.output || parsed?.output || parsed?.run?.result?.output;
  if (!Array.isArray(output)) return null;
  const image = output.find((item) => item?.type === "image" && item?.source?.url);
  return image?.source?.url || null;
}

async function ensurePillow() {
  try {
    await runProcess(PYTHON_BIN, ["-c", "import PIL"], { timeoutMs: 30_000 });
    return;
  } catch {
    await runProcess(PYTHON_BIN, ["-m", "pip", "install", "--user", "pillow"], { timeoutMs: 180_000 });
  }
}

async function runImage2WithRetry(job, { prompt, outputDir, baseName, gridIndex, gridCount }) {
  let lastError = null;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    cleanupPartialOutputs(outputDir, baseName);
    if (attempt > 1) {
      updateJob(job, {
        step: `重试九宫格 ${gridIndex}/${gridCount}`,
        progress: Math.max(8, job.progress - 2),
      });
      await sleep(2500);
    }
    try {
      await runImage2({ prompt, outputDir, baseName });
      return;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error(`九宫格 ${gridIndex} 生成失败。`);
}

function cleanupPartialOutputs(outputDir, baseName) {
  if (!fs.existsSync(outputDir)) return;
  for (const name of fs.readdirSync(outputDir)) {
    if (name.startsWith(`${baseName}_`) || name.startsWith(`${baseName}.`)) {
      fs.rmSync(path.join(outputDir, name), { force: true });
    }
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function runProcess(command, args, { timeoutMs }) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: ROOT,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error(`${command} timed out after ${Math.round(timeoutMs / 1000)}s`));
    }, timeoutMs);
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) return resolve(stdout);
      reject(new Error(stderr.trim() || stdout.trim() || `${command} exited with ${code}`));
    });
  });
}

function updateJob(job, patch) {
  Object.assign(job, patch, { updatedAt: new Date().toISOString() });
}

function failJob(job, error) {
  updateJob(job, {
    status: "failed",
    step: "失败",
    error: error?.message || String(error),
  });
}

function serializeJob(job) {
  return {
    id: job.id,
    intent: job.intent,
    status: job.status,
    progress: job.progress,
    step: job.step,
    error: job.error,
    manifestPath: job.manifestPath,
    manifest: job.manifest,
  };
}

function serveStatic(urlPath, req, res) {
  const decoded = decodeURIComponent(urlPath === "/" ? "/index.html" : urlPath);
  const filePath = path.resolve(ROOT, `.${decoded}`);
  if (!filePath.startsWith(ROOT)) {
    return sendText(res, 403, "Forbidden");
  }
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    return sendText(res, 404, "Not found");
  }
  const type = MIME.get(path.extname(filePath).toLowerCase()) || "application/octet-stream";
  res.writeHead(200, { "content-type": type });
  if (req.method === "HEAD") return res.end();
  fs.createReadStream(filePath).pipe(res);
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 64_000) {
        reject(new Error("request_too_large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function sendJson(res, status, payload) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function sendText(res, status, text) {
  res.writeHead(status, { "content-type": "text/plain; charset=utf-8" });
  res.end(text);
}
