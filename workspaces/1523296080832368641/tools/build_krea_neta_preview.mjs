#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve("delivery/krea_neta_diagonal_eval");
const RUN_ROOT = path.join(ROOT, "execution_runs", "full-run-2026-07-06");
const OUT_DIR = path.join(ROOT, "preview");
const OUT_FILE = path.join(OUT_DIR, "index.html");

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildIndexMaps(ips, styles) {
  return {
    ipById: new Map(ips.map((ip) => [ip.ipId, ip])),
    styleById: new Map(styles.map((style) => [style.styleId, style])),
  };
}

const NON_IP_DIRECTIVES = [
  "Keep the world identity specific, not generic.",
  "Preserve clear silhouette logic, scene readability, and material coherence.",
  "One finished image, no text, no collage, no border.",
];

function splitPrompt(prompt) {
  let ipPrompt = String(prompt || "");
  const nonIp = [];
  for (const directive of NON_IP_DIRECTIVES) {
    if (ipPrompt.includes(directive)) {
      nonIp.push(directive);
      ipPrompt = ipPrompt.replace(directive, "");
    }
  }
  return {
    ipPrompt: ipPrompt.replace(/\s+/g, " ").trim(),
    nonIpPrompt: nonIp.join(" "),
  };
}

function normalizeResult(result, maps, request) {
  const ip = maps.ipById.get(result.ipId) || {};
  const style = maps.styleById.get(result.styleId) || {};
  const image = result.downloadedImages?.[0] || result.imageUrls?.[0] || {};
  const runParts = result.runId.match(/_r(\d+)$/);
  const promptParts = splitPrompt(request?.prompt || "");
  const stylePrompt = request?.styleTreatment || request?.style || "";
  return {
    runId: result.runId,
    runIndex: runParts ? Number(runParts[1]) : null,
    ipName: result.ipName,
    ipFamily: ip.primaryFamilyLabel || ip.primaryFamily || "",
    ipSlug: ip.slug || "",
    styleName: result.styleName,
    styleFamily: style.familyLabel || style.familyId || "",
    jobId: result.jobId,
    seed: result.seed,
    imageUrl: image.imageUrl || image.origUrl || image.thumbnailUrl || "",
    thumbUrl: image.thumbnailUrl || image.imageUrl || image.origUrl || "",
    origUrl: image.origUrl || image.imageUrl || "",
    bytes: image.bytes || 0,
    ipPrompt: promptParts.ipPrompt,
    nonIpPrompt: promptParts.nonIpPrompt,
    stylePrompt,
    fullPrompt: [
      "IP prompt:",
      promptParts.ipPrompt,
      "",
      "Non-IP directives:",
      promptParts.nonIpPrompt,
      "",
      "Style treatment:",
      stylePrompt,
    ].join("\n"),
  };
}

function optionList(values) {
  return [...new Set(values.filter(Boolean))].sort();
}

function html({ summary, rows, ipFamilies, styleFamilies }) {
  const embedded = JSON.stringify({ rows, ipFamilies, styleFamilies });
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="icon" href="data:,">
  <title>Krea Neta Studio 800 Run Preview</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f7f4ec;
      --ink: #171717;
      --muted: #67635b;
      --line: #ddd4c2;
      --panel: #fffdf7;
      --accent: #1f7662;
      --accent-ink: #f4fff9;
      --warn: #9a4d19;
      --shadow: 0 14px 38px rgb(36 28 18 / 12%);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--ink);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    header {
      position: sticky;
      top: 0;
      z-index: 10;
      background: color-mix(in srgb, var(--bg) 92%, white);
      border-bottom: 1px solid var(--line);
      backdrop-filter: blur(14px);
    }
    .bar {
      max-width: 1480px;
      margin: 0 auto;
      padding: 18px 18px 14px;
      display: grid;
      gap: 14px;
    }
    .title-row {
      display: flex;
      justify-content: space-between;
      gap: 18px;
      align-items: end;
    }
    h1 {
      margin: 0;
      font-size: 24px;
      line-height: 1.05;
      letter-spacing: 0;
    }
    .subtitle {
      margin-top: 6px;
      color: var(--muted);
      font-size: 13px;
      line-height: 1.35;
    }
    .stats {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      justify-content: flex-end;
    }
    .stat {
      border: 1px solid var(--line);
      background: var(--panel);
      border-radius: 8px;
      padding: 8px 10px;
      min-width: 86px;
    }
    .stat strong {
      display: block;
      font-size: 18px;
      line-height: 1;
    }
    .stat span {
      color: var(--muted);
      font-size: 11px;
    }
    .controls {
      display: grid;
      grid-template-columns: minmax(220px, 1.3fr) repeat(3, minmax(160px, 1fr)) auto;
      gap: 10px;
      align-items: end;
    }
    label {
      display: grid;
      gap: 5px;
      color: var(--muted);
      font-size: 11px;
      font-weight: 720;
    }
    input, select, button {
      min-height: 38px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--panel);
      color: var(--ink);
      font: inherit;
      padding: 0 10px;
    }
    button {
      background: var(--accent);
      color: var(--accent-ink);
      border-color: color-mix(in srgb, var(--accent) 86%, black);
      font-weight: 760;
      cursor: pointer;
    }
    main {
      max-width: 1480px;
      margin: 0 auto;
      padding: 18px;
    }
    .count {
      margin: 0 0 12px;
      color: var(--muted);
      font-size: 13px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
      gap: 12px;
    }
    .card {
      overflow: hidden;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--panel);
      box-shadow: 0 4px 18px rgb(36 28 18 / 6%);
      cursor: zoom-in;
    }
    .thumb {
      width: 100%;
      aspect-ratio: 1;
      display: block;
      object-fit: cover;
      background: #eee7d8;
    }
    .meta {
      padding: 9px 10px 10px;
      display: grid;
      gap: 5px;
      min-height: 112px;
    }
    .ip {
      font-size: 13px;
      font-weight: 800;
      line-height: 1.2;
    }
    .style {
      color: var(--muted);
      font-size: 12px;
      line-height: 1.25;
    }
    .tags {
      display: flex;
      gap: 5px;
      flex-wrap: wrap;
      margin-top: 3px;
    }
    .tag {
      border: 1px solid var(--line);
      color: var(--muted);
      border-radius: 999px;
      padding: 4px 7px;
      font-size: 10px;
      line-height: 1;
      font-weight: 760;
      background: #fbf8ef;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .tag small {
      font-size: 9px;
      font-weight: 850;
      text-transform: uppercase;
      letter-spacing: .04em;
      opacity: .72;
      margin-right: 3px;
    }
    .tag-run {
      color: #5f5b53;
      border-color: #d8cfbd;
      background: #f7f1e4;
    }
    .tag-ip {
      color: #16436b;
      border-color: #a9cbe9;
      background: #eaf5ff;
    }
    .tag-style {
      color: #18553f;
      border-color: #acd7c1;
      background: #e9f8ef;
    }
    .tag-class {
      color: #75440d;
      border-color: #e2c084;
      background: #fff4d9;
    }
    .tag-style-class {
      color: #67316a;
      border-color: #d8b3dd;
      background: #fbebff;
    }
    dialog {
      width: min(1120px, calc(100vw - 24px));
      border: 0;
      border-radius: 8px;
      padding: 0;
      box-shadow: var(--shadow);
      background: var(--panel);
    }
    dialog::backdrop { background: rgb(0 0 0 / 58%); }
    .modal {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 430px;
      max-height: min(92vh, 980px);
    }
    .modal-img {
      width: 100%;
      height: 100%;
      min-height: 520px;
      object-fit: contain;
      background: #111;
    }
    .modal-side {
      padding: 14px;
      border-left: 1px solid var(--line);
      display: grid;
      align-content: start;
      gap: 10px;
      max-height: min(92vh, 980px);
      overflow: auto;
    }
    .modal-side h2 {
      margin: 0;
      font-size: 18px;
      line-height: 1.12;
    }
    .modal-side p {
      margin: 0;
      color: var(--muted);
      font-size: 12px;
      line-height: 1.4;
      overflow-wrap: anywhere;
    }
    .link {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 36px;
      border-radius: 8px;
      background: var(--accent);
      color: var(--accent-ink);
      text-decoration: none;
      font-weight: 760;
      font-size: 13px;
    }
    .prompt-section {
      display: grid;
      gap: 6px;
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 9px;
      background: #fbf8ef;
    }
    .prompt-section strong {
      font-size: 11px;
      line-height: 1;
      text-transform: uppercase;
      letter-spacing: .06em;
    }
    .prompt-section pre {
      margin: 0;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      color: var(--ink);
      font: 12px/1.45 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    }
    .prompt-ip {
      border-color: #a9cbe9;
      background: #f1f8ff;
    }
    .prompt-style {
      border-color: #acd7c1;
      background: #effaf3;
    }
    .prompt-non-ip {
      border-color: #e2c084;
      background: #fff8e6;
    }
    .empty {
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--panel);
      padding: 26px;
      color: var(--muted);
      text-align: center;
    }
    @media (max-width: 860px) {
      .title-row, .controls { grid-template-columns: 1fr; display: grid; }
      .stats { justify-content: start; }
      .modal { grid-template-columns: 1fr; }
      .modal-side { border-left: 0; border-top: 1px solid var(--line); }
      .modal-img { min-height: 320px; }
    }
  </style>
</head>
<body>
  <header>
    <div class="bar">
      <div class="title-row">
        <div>
          <h1>Krea Neta Studio 800 Run Preview</h1>
          <div class="subtitle">OSS-backed thumbnail grid with filters for IP, style, family, and run index.</div>
        </div>
        <div class="stats" aria-label="run stats">
          <div class="stat"><strong>${esc(summary.totalRows)}</strong><span>total</span></div>
          <div class="stat"><strong>${esc(summary.completedRows)}</strong><span>completed</span></div>
          <div class="stat"><strong>${esc(summary.failedRows)}</strong><span>failed</span></div>
          <div class="stat"><strong>${esc(summary.pendingRows)}</strong><span>pending</span></div>
        </div>
      </div>
      <div class="controls">
        <label>Search
          <input id="search" type="search" placeholder="IP, style, run id...">
        </label>
        <label>IP Family
          <select id="ipFamily"></select>
        </label>
        <label>Style Family
          <select id="styleFamily"></select>
        </label>
        <label>Run
          <select id="runIndex"></select>
        </label>
        <button id="reset" type="button">Reset</button>
      </div>
    </div>
  </header>
  <main>
    <p class="count" id="count"></p>
    <div class="grid" id="grid"></div>
  </main>
  <dialog id="viewer">
    <div class="modal">
      <img class="modal-img" id="modalImg" alt="">
      <aside class="modal-side">
        <h2 id="modalTitle"></h2>
        <p id="modalStyle"></p>
        <p id="modalRun"></p>
        <p id="modalJob"></p>
        <a class="link" id="modalOpen" target="_blank" rel="noreferrer">Open full image</a>
        <button id="modalCopy" type="button">Copy full prompt</button>
        <section class="prompt-section prompt-ip">
          <strong>IP prompt</strong>
          <pre id="modalIpPrompt"></pre>
        </section>
        <section class="prompt-section prompt-non-ip">
          <strong>Non-IP directives</strong>
          <pre id="modalNonIpPrompt"></pre>
        </section>
        <section class="prompt-section prompt-style">
          <strong>Style treatment</strong>
          <pre id="modalStylePrompt"></pre>
        </section>
        <button id="modalClose" type="button">Close</button>
      </aside>
    </div>
  </dialog>
  <script id="payload" type="application/json">${embedded.replace(/</g, "\\u003c")}</script>
  <script>
    const data = JSON.parse(document.getElementById("payload").textContent);
    const state = { q: "", ipFamily: "", styleFamily: "", runIndex: "" };
    const els = {
      search: document.getElementById("search"),
      ipFamily: document.getElementById("ipFamily"),
      styleFamily: document.getElementById("styleFamily"),
      runIndex: document.getElementById("runIndex"),
      reset: document.getElementById("reset"),
      count: document.getElementById("count"),
      grid: document.getElementById("grid"),
      viewer: document.getElementById("viewer"),
      modalImg: document.getElementById("modalImg"),
      modalTitle: document.getElementById("modalTitle"),
      modalStyle: document.getElementById("modalStyle"),
      modalRun: document.getElementById("modalRun"),
      modalJob: document.getElementById("modalJob"),
      modalOpen: document.getElementById("modalOpen"),
      modalCopy: document.getElementById("modalCopy"),
      modalIpPrompt: document.getElementById("modalIpPrompt"),
      modalNonIpPrompt: document.getElementById("modalNonIpPrompt"),
      modalStylePrompt: document.getElementById("modalStylePrompt"),
      modalClose: document.getElementById("modalClose"),
    };

    function fillSelect(select, values, label) {
      select.innerHTML = "";
      select.append(new Option(label, ""));
      values.forEach((value) => select.append(new Option(value, value)));
    }

    function matches(row) {
      const q = state.q.trim().toLowerCase();
      if (state.ipFamily && row.ipFamily !== state.ipFamily) return false;
      if (state.styleFamily && row.styleFamily !== state.styleFamily) return false;
      if (state.runIndex && String(row.runIndex) !== state.runIndex) return false;
      if (!q) return true;
      return [row.runId, row.ipName, row.ipFamily, row.styleName, row.styleFamily, row.jobId]
        .join(" ")
        .toLowerCase()
        .includes(q);
    }

    function card(row) {
      const node = document.createElement("article");
      node.className = "card";
      node.tabIndex = 0;
      node.innerHTML = \`
        <img class="thumb" src="\${row.thumbUrl}" alt="\${row.ipName}" loading="lazy" decoding="async">
        <div class="meta">
          <div class="ip">\${row.ipName}</div>
          <div class="style">\${row.styleName}</div>
          <div class="tags">
            <span class="tag tag-run"><small>Run</small>\${row.runIndex}</span>
            <span class="tag tag-ip"><small>IP</small>\${row.ipName}</span>
            <span class="tag tag-style"><small>Style</small>\${row.styleName}</span>
            <span class="tag tag-class"><small>IP Cat</small>\${row.ipFamily}</span>
            <span class="tag tag-style-class"><small>Style Cat</small>\${row.styleFamily}</span>
          </div>
        </div>\`;
      node.addEventListener("click", () => openViewer(row));
      node.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") openViewer(row);
      });
      return node;
    }

    function render() {
      const rows = data.rows.filter(matches);
      els.count.textContent = \`\${rows.length} / \${data.rows.length} images\`;
      els.grid.innerHTML = "";
      if (!rows.length) {
        const empty = document.createElement("div");
        empty.className = "empty";
        empty.textContent = "No matching images.";
        els.grid.append(empty);
        return;
      }
      const fragment = document.createDocumentFragment();
      rows.forEach((row) => fragment.append(card(row)));
      els.grid.append(fragment);
    }

    function openViewer(row) {
      els.modalImg.src = row.imageUrl || row.thumbUrl;
      els.modalImg.alt = row.ipName;
      els.modalTitle.textContent = row.ipName;
      els.modalStyle.textContent = row.styleName + " · " + row.styleFamily;
      els.modalRun.textContent = row.runId + " · seed " + row.seed;
      els.modalJob.textContent = "job " + row.jobId;
      els.modalOpen.href = row.origUrl || row.imageUrl || row.thumbUrl;
      els.modalCopy.dataset.prompt = row.fullPrompt;
      els.modalCopy.textContent = "Copy full prompt";
      els.modalIpPrompt.textContent = row.ipPrompt || "";
      els.modalNonIpPrompt.textContent = row.nonIpPrompt || "";
      els.modalStylePrompt.textContent = row.stylePrompt || "";
      els.viewer.showModal();
    }

    fillSelect(els.ipFamily, data.ipFamilies, "All IP families");
    fillSelect(els.styleFamily, data.styleFamilies, "All style families");
    fillSelect(els.runIndex, ["1", "2", "3", "4", "5", "6", "7", "8"], "All runs");
    els.search.addEventListener("input", () => { state.q = els.search.value; render(); });
    els.ipFamily.addEventListener("change", () => { state.ipFamily = els.ipFamily.value; render(); });
    els.styleFamily.addEventListener("change", () => { state.styleFamily = els.styleFamily.value; render(); });
    els.runIndex.addEventListener("change", () => { state.runIndex = els.runIndex.value; render(); });
    els.reset.addEventListener("click", () => {
      state.q = "";
      state.ipFamily = "";
      state.styleFamily = "";
      state.runIndex = "";
      els.search.value = "";
      els.ipFamily.value = "";
      els.styleFamily.value = "";
      els.runIndex.value = "";
      render();
    });
    els.modalClose.addEventListener("click", () => els.viewer.close());
    els.modalCopy.addEventListener("click", async () => {
      const text = els.modalCopy.dataset.prompt || "";
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        const area = document.createElement("textarea");
        area.value = text;
        document.body.append(area);
        area.select();
        document.execCommand("copy");
        area.remove();
      }
      els.modalCopy.textContent = "Copied";
      window.setTimeout(() => { els.modalCopy.textContent = "Copy full prompt"; }, 1200);
    });
    render();
  </script>
</body>
</html>`;
}

async function main() {
  const [summary, ips, styles] = await Promise.all([
    readJson(path.join(RUN_ROOT, "results_summary.json")),
    readJson(path.join(ROOT, "ip_pool_100.json")),
    readJson(path.join(ROOT, "style_pool_100.json")),
  ]);
  if (summary.completedRows !== 800 || summary.failedRows !== 0 || summary.pendingRows !== 0) {
    throw new Error("Preview requires a fully completed 800-run result summary.");
  }
  const maps = buildIndexMaps(ips, styles);
  const rows = await Promise.all(summary.results.map(async (result) => {
    const requestPath = path.join(RUN_ROOT, "runs", result.runId, "request.json");
    const request = await readJson(requestPath);
    return normalizeResult(result, maps, request);
  }));
  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(
    OUT_FILE,
    html({
      summary,
      rows,
      ipFamilies: optionList(rows.map((row) => row.ipFamily)),
      styleFamilies: optionList(rows.map((row) => row.styleFamily)),
    })
  );
  console.log(JSON.stringify({ outFile: OUT_FILE, rows: rows.length }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
