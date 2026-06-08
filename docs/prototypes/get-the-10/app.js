const MAX_AUX = 4;
const MAX_PACK = 10;
const SPACE_ID = "6b9e799d-3711-4143-8a03-0b082a46c261";
const REAL_ANGER_MANIFEST = "assets/real-anger-mixed/slices/manifest.json";
const LIVE_RUNS_ENDPOINT = "/api/runs";
const LIVE_LOADING_COUNT = 9;

const state = {
  round: 1,
  intent: "",
  referenceName: "",
  primary: null,
  auxiliary: [],
  rejected: [],
  firstFrame: null,
  pack: [],
  packRejected: [],
  candidates: [],
  isGenerating: false,
  liveRun: null,
  generationIndex: 0,
  simulateFailure: false,
  lightboxIndex: 0,
};

const refs = {
  stageLabel: document.querySelector("#stageLabel"),
  intentForm: document.querySelector("#intentForm"),
  intentInput: document.querySelector("#intentInput"),
  referenceInput: document.querySelector("#referenceInput"),
  referenceName: document.querySelector("#referenceName"),
  resetButton: document.querySelector("#resetButton"),
  failToggleButton: document.querySelector("#failToggleButton"),
  zoomButton: document.querySelector("#zoomButton"),
  notice: document.querySelector("#notice"),
  runPanel: document.querySelector("#runPanel"),
  runKicker: document.querySelector("#runKicker"),
  runTitle: document.querySelector("#runTitle"),
  runMeterFill: document.querySelector("#runMeterFill"),
  runPercent: document.querySelector("#runPercent"),
  roundSummary: document.querySelector("#roundSummary"),
  selectionSummary: document.querySelector("#selectionSummary"),
  packSummary: document.querySelector("#packSummary"),
  nextButton: document.querySelector("#nextButton"),
  exportButton: document.querySelector("#exportButton"),
  candidateGrid: document.querySelector("#candidateGrid"),
  template: document.querySelector("#candidateTemplate"),
  lightbox: document.querySelector("#lightbox"),
  lightboxTrack: document.querySelector("#lightboxTrack"),
  lightboxCounter: document.querySelector("#lightboxCounter"),
  closeLightboxButton: document.querySelector("#closeLightboxButton"),
  prevButton: document.querySelector("#prevButton"),
  nextImageButton: document.querySelector("#nextImageButton"),
};

const directionWords = [
  "灼烧", "坍塌", "潮湿", "失控", "静默", "仪式", "逃离", "残响", "旧日",
  "异乡", "垂直", "荒寒", "红尘", "裂隙", "密林", "地下", "黎明", "废墟",
  "温热", "压抑", "边境", "迷雾", "低空", "锈蚀", "镜面", "旷野", "回声",
];

const subjectWords = [
  "孤塔", "人群", "列车", "温室", "楼梯", "港口", "巨像", "餐桌", "集市",
  "桥洞", "祷厅", "水渠", "车站", "院落", "机械", "旗帜", "石碑", "裂谷",
  "屋顶", "档案室", "边防线", "夜市", "骨架", "空房间", "祭台", "灯塔", "棚屋",
];

const detailWords = [
  "低饱和红光", "旧胶片颗粒", "潮湿反光", "远处烟尘", "压低的天空", "手工痕迹",
  "密集竖线", "破损布料", "冷暖冲突", "不完整对称", "微弱金属感", "生活残留",
  "被遮挡的脸", "极窄通道", "高处俯视", "空旷前景", "边缘发光", "粗糙墙面",
  "薄雾分层", "低角度镜头", "长焦压缩", "逆光轮廓", "湿冷蓝灰", "尘土金色",
  "黑色剪影", "微小人物", "倾斜地平线",
];

const palettes = [
  ["#b23a2f", "#2d2822", "#e7d2a7", "#526b5b"],
  ["#6f3329", "#e0b662", "#253f4e", "#f1eadb"],
  ["#293e4f", "#bfc7bd", "#5b6b41", "#c96d3c"],
  ["#2e2a25", "#9b8b6b", "#d8c9ad", "#8e3f32"],
  ["#5b211f", "#c7bbb0", "#31464a", "#d09251"],
  ["#404a37", "#dfd1af", "#8e4d39", "#26323c"],
];

function hashString(input) {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed) {
  return function next() {
    let value = seed += 0x6D2B79F5;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(list, random, offset = 0) {
  return list[(Math.floor(random() * list.length) + offset) % list.length];
}

function showNotice(message, tone = "error") {
  refs.notice.hidden = false;
  refs.notice.textContent = message;
  refs.notice.dataset.tone = tone;
}

function clearNotice() {
  refs.notice.hidden = true;
  refs.notice.textContent = "";
}

function assertCanGenerate() {
  if (!state.intent.trim()) {
    throw new Error("先输入一个短意图。");
  }
  if (state.simulateFailure) {
    throw new Error("生成失败已模拟：没有继续伪装成功。");
  }
}

async function startFlow() {
  state.intent = refs.intentInput.value.trim();
  state.round = 1;
  state.primary = null;
  state.auxiliary = [];
  state.rejected = [];
  state.firstFrame = null;
  state.pack = [];
  state.packRejected = [];
  state.isGenerating = false;
  state.liveRun = null;
  try {
    await generateCandidates(1);
    clearNotice();
  } catch (error) {
    state.candidates = [];
    state.isGenerating = false;
    showNotice(error.message);
    render();
  }
}

async function generateCandidates(round) {
  assertCanGenerate();
  state.generationIndex += 1;
  const manifestCandidates = round === 1 ? await loadManifestCandidates() : null;
  if (manifestCandidates) {
    state.candidates = manifestCandidates;
    render();
    return;
  }
  if (round === 1) {
    await generateLiveRoundOne();
    return;
  }
  const total = round === 3 ? 10 : 27;
  state.candidates = Array.from({ length: total }, (_, index) => {
    const gridIndex = round === 3 ? 0 : Math.floor(index / 9);
    const cellIndex = round === 3 ? index : index % 9;
    return buildCandidate(round, index, total, gridIndex, cellIndex);
  });
  if (round === 2) state.firstFrame = null;
  render();
}

async function generateLiveRoundOne() {
  state.isGenerating = true;
  state.liveRun = {
    status: "queued",
    progress: 0,
    step: "连接生成环境",
  };
  state.candidates = buildLoadingCandidates();
  render();

  const response = await fetch(LIVE_RUNS_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      intent: state.intent,
      referenceName: state.referenceName,
    }),
  });
  const created = await readJsonResponse(response);
  if (!response.ok) {
    throw new Error(created.message || "生成任务创建失败。");
  }
  state.liveRun = created;
  render();
  await pollLiveRun(created.id);
}

async function pollLiveRun(runId) {
  while (true) {
    await wait(1600);
    const response = await fetch(`${LIVE_RUNS_ENDPOINT}/${encodeURIComponent(runId)}`, { cache: "no-store" });
    const job = await readJsonResponse(response);
    if (!response.ok) {
      throw new Error(job.message || "生成任务读取失败。");
    }
    state.liveRun = job;
    render();
    if (job.status === "complete") {
      state.candidates = mapManifestItems(job.manifest);
      state.isGenerating = false;
      state.liveRun = job;
      render();
      return;
    }
    if (job.status === "failed") {
      throw new Error(job.error || "生成失败。");
    }
  }
}

function buildLoadingCandidates() {
  return Array.from({ length: LIVE_LOADING_COUNT }, (_, index) => ({
    id: `loading-${state.generationIndex}-${index}`,
    round: 1,
    index,
    total: LIVE_LOADING_COUNT,
    gridIndex: Math.floor(index / 9),
    cellIndex: index % 9,
    title: `候选 ${index + 1}`,
    direction: "生成中",
    subject: "等待真实图像",
    detail: "真实生成任务还在进行",
    label: "生成中",
    image: "",
    loading: true,
    width: 512,
    height: 341,
  }));
}

function mapManifestItems(manifest) {
  const items = Array.isArray(manifest?.items) ? manifest.items : [];
  if (items.length < 9) {
    throw new Error("生成结果不足 9 张。");
  }
  const total = items.length;
  return items.map((item, index) => {
    const gridIndex = Number(item.grid_index || Math.floor(index / 9) + 1);
    const cellIndex = Number(item.cell_index || index % 9 + 1);
    const label = item.prompt || `真实候选 ${index + 1}`;
    return {
      id: `live-${state.liveRun?.id || state.generationIndex}-${index}`,
      round: 1,
      index,
      total,
      gridIndex: gridIndex - 1,
      cellIndex: cellIndex - 1,
      title: `真实候选 ${index + 1}`,
      direction: label.split("/")[0]?.trim() || "真实生成",
      subject: label.split("/")[1]?.trim() || `切片 ${cellIndex}`,
      detail: `九宫格 ${gridIndex} / 切片 ${cellIndex}`,
      label,
      image: item.path,
      crop: item.crop || null,
      width: Number(item.width) || undefined,
      height: Number(item.height) || undefined,
    };
  });
}

async function readJsonResponse(response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`服务返回不是 JSON：${response.status}`);
  }
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildCandidate(round, index, total, gridIndex, cellIndex) {
  const seedInput = [
    state.intent,
    state.referenceName,
    state.primary?.id || "no-primary",
    state.firstFrame?.id || "no-first-frame",
    round,
    state.generationIndex,
    index,
  ].join("|");
  const random = mulberry32(hashString(seedInput));
  const palette = palettes[(gridIndex + Math.floor(random() * palettes.length)) % palettes.length];
  const direction = round === 1
    ? pick(directionWords, random, index)
    : state.primary?.direction || pick(directionWords, random, index);
  const subject = round === 3
    ? pick(subjectWords, random, index + 9)
    : pick(subjectWords, random, index);
  const detail = round === 2
    ? state.auxiliary[0]?.detail || pick(detailWords, random, index)
    : pick(detailWords, random, index);
  const title = round === 3 ? `照片 ${index + 1}` : `入口 ${index + 1}`;
  return {
    id: `r${round}-g${state.generationIndex}-${index}`,
    round,
    index,
    total,
    gridIndex,
    cellIndex,
    title,
    direction,
    subject,
    detail,
    label: `${direction} / ${subject}`,
    image: makeImageSvg({ title, intent: state.intent, direction, subject, detail, palette, round, index, random }),
    width: 420,
    height: 420,
  };
}

async function loadManifestCandidates() {
  const manifestPath = resolveManifestPath();
  if (!manifestPath) return null;
  const response = await fetch(manifestPath, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`素材 manifest 读取失败：${response.status}`);
  }
  const manifest = await response.json();
  const items = Array.isArray(manifest.items) ? manifest.items : [];
  if (items.length < 9) {
    throw new Error("素材 manifest 不足 9 张。");
  }
  return items.map((item, index) => {
    const gridIndex = Number(item.grid_index || Math.floor(index / 9) + 1);
    const cellIndex = Number(item.cell_index || index % 9 + 1);
    const label = item.prompt || `真实素材 ${index + 1}`;
    return {
      id: `manifest-${index}`,
      round: 1,
      index,
      total: items.length,
      gridIndex: gridIndex - 1,
      cellIndex: cellIndex - 1,
      title: `真实素材 ${index + 1}`,
      direction: label.split("/")[0]?.trim() || "真实素材",
      subject: label.split("/")[1]?.trim() || `切片 ${cellIndex}`,
      detail: `九宫格 ${gridIndex} / 切片 ${cellIndex}`,
      label,
      image: item.path,
      crop: item.crop || null,
      width: Number(item.width) || undefined,
      height: Number(item.height) || undefined,
    };
  });
}

function resolveManifestPath() {
  const explicitPath = new URLSearchParams(window.location.search).get("manifest");
  if (explicitPath) return explicitPath;
  if (state.intent.includes("生气") || state.intent.includes("愤怒")) return REAL_ANGER_MANIFEST;
  return null;
}

function makeImageSvg({ title, intent, direction, subject, detail, palette, round, index, random }) {
  const [a, b, c, d] = palette;
  const rot = Math.floor(random() * 26) - 13;
  const horizon = 84 + Math.floor(random() * 52);
  const sunX = 60 + Math.floor(random() * 180);
  const sunY = 32 + Math.floor(random() * 110);
  const scale = 0.72 + random() * 0.48;
  const density = 5 + Math.floor(random() * 8);
  const strips = Array.from({ length: density }, (_, stripIndex) => {
    const x = Math.floor(random() * 280);
    const h = 35 + Math.floor(random() * 150);
    const w = 5 + Math.floor(random() * 24);
    return `<rect x="${x}" y="${210 - h}" width="${w}" height="${h}" fill="${stripIndex % 2 ? b : d}" opacity="${0.22 + random() * 0.38}"/>`;
  }).join("");
  const marks = Array.from({ length: 14 }, (_, markIndex) => {
    const x = Math.floor(random() * 300);
    const y = 38 + Math.floor(random() * 210);
    const r = 1 + Math.floor(random() * 4);
    return `<circle cx="${x}" cy="${y}" r="${r}" fill="${markIndex % 2 ? c : a}" opacity="${0.22 + random() * 0.42}"/>`;
  }).join("");
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="420" height="420" viewBox="0 0 300 300">
      <defs>
        <linearGradient id="g${index}" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="${c}"/>
          <stop offset="0.58" stop-color="${a}"/>
          <stop offset="1" stop-color="${b}"/>
        </linearGradient>
        <filter id="grain${index}">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/>
          <feColorMatrix type="saturate" values="0"/>
          <feComponentTransfer><feFuncA type="table" tableValues="0 0.19"/></feComponentTransfer>
        </filter>
      </defs>
      <rect width="300" height="300" fill="url(#g${index})"/>
      <circle cx="${sunX}" cy="${sunY}" r="${34 * scale}" fill="${c}" opacity="0.22"/>
      <path d="M0 ${horizon} C70 ${horizon - 28} 122 ${horizon + 28} 185 ${horizon - 2} S262 ${horizon - 16} 300 ${horizon + 8} L300 300 L0 300 Z" fill="${d}" opacity="0.72"/>
      <g transform="rotate(${rot} 150 170)">${strips}<path d="M42 238 C88 176 119 173 154 226 S239 214 262 151" fill="none" stroke="${c}" stroke-width="7" stroke-linecap="round" opacity="0.34"/><rect x="76" y="126" width="148" height="84" fill="${b}" opacity="0.18"/></g>
      ${marks}
      <rect width="300" height="300" filter="url(#grain${index})"/>
    </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function handleTileClick(candidate, event) {
  if (event.altKey || event.metaKey) {
    toggleRejected(candidate);
    return;
  }
  if (state.round === 1) {
    if (!state.primary) {
      state.primary = candidate;
      clearNotice();
    } else if (state.primary.id === candidate.id) {
      state.primary = null;
      clearNotice();
    } else if (state.auxiliary.some((item) => item.id === candidate.id)) {
      state.auxiliary = state.auxiliary.filter((item) => item.id !== candidate.id);
    } else if (state.auxiliary.length < MAX_AUX) {
      state.auxiliary.push(candidate);
    } else {
      showNotice("辅助最多选四张。先取消一个，再选新的。");
    }
  } else if (state.round === 2) {
    state.firstFrame = candidate;
    clearNotice();
  } else {
    togglePack(candidate);
  }
  renderPreservingScroll();
}

function toggleRejected(candidate) {
  const list = state.round === 3 ? state.packRejected : state.rejected;
  const exists = list.some((item) => item.id === candidate.id);
  const next = exists ? list.filter((item) => item.id !== candidate.id) : [...list, candidate];
  if (state.round === 3) state.packRejected = next;
  else state.rejected = next;
  if (!exists) {
    if (state.primary?.id === candidate.id) state.primary = null;
    if (state.firstFrame?.id === candidate.id) state.firstFrame = null;
    state.auxiliary = state.auxiliary.filter((item) => item.id !== candidate.id);
    state.pack = state.pack.filter((item) => item.id !== candidate.id);
  }
  renderPreservingScroll();
}

function renderPreservingScroll() {
  const x = window.scrollX;
  const y = window.scrollY;
  render();
  window.scrollTo(x, y);
  requestAnimationFrame(() => window.scrollTo(x, y));
}

function togglePack(candidate) {
  const exists = state.pack.some((item) => item.id === candidate.id);
  if (exists) {
    state.pack = state.pack.filter((item) => item.id !== candidate.id);
  } else {
    if (state.pack.length >= MAX_PACK) {
      showNotice("最多 pick 十张。");
      return;
    }
    state.pack.push(candidate);
    state.packRejected = state.packRejected.filter((item) => item.id !== candidate.id);
  }
}

async function goNext() {
  try {
    if (state.round === 1) {
      if (!state.primary) return showNotice("先选主视觉。");
      state.round = 2;
      await generateCandidates(2);
      return;
    }
    if (state.round === 2) {
      if (!state.firstFrame) return showNotice("先选首帧。");
      state.round = 3;
      await generateCandidates(3);
      return;
    }
    await generateCandidates(3);
  } catch (error) {
    showNotice(error.message);
    render();
  }
}

function resetFlow() {
  state.round = 1;
  state.intent = "";
  state.referenceName = "";
  state.primary = null;
  state.auxiliary = [];
  state.rejected = [];
  state.firstFrame = null;
  state.pack = [];
  state.packRejected = [];
  state.candidates = [];
  state.isGenerating = false;
  state.liveRun = null;
  state.generationIndex = 0;
  refs.intentInput.value = "";
  refs.referenceInput.value = "";
  refs.referenceName.textContent = "参考图";
  clearNotice();
  render();
}

function render() {
  refs.stageLabel.textContent = state.round === 1 ? "第一轮 · 主方向" : state.round === 2 ? "第二轮 · 首帧" : "第三轮 · 照片包";
  refs.roundSummary.textContent = state.candidates.length
    ? state.isGenerating
      ? `${state.liveRun?.step || "生成中"} · 第 ${state.generationIndex} 次`
      : `${state.candidates.length} 张 · 第 ${state.generationIndex} 次`
    : "输入一个短意图开始";
  refs.selectionSummary.textContent = buildSelectionText();
  refs.packSummary.textContent = `${state.pack.length} / ${MAX_PACK}`;
  refs.failToggleButton.textContent = state.simulateFailure ? "关闭失败" : "模拟失败";
  refs.nextButton.textContent = state.round === 1 ? "第二轮" : state.round === 2 ? "第三轮" : "再生成";
  refs.nextButton.disabled = state.round === 1 ? !state.primary : state.round === 2 ? !state.firstFrame : state.candidates.length === 0;
  refs.nextButton.disabled = refs.nextButton.disabled || state.isGenerating;
  refs.exportButton.hidden = state.round !== 3;
  refs.exportButton.disabled = state.pack.length === 0;
  refs.zoomButton.disabled = state.candidates.length === 0 || state.isGenerating;
  refs.intentForm.querySelector("button[type='submit']").disabled = state.isGenerating;
  renderRunPanel();
  renderGrid();
}

function renderRunPanel() {
  refs.runPanel.hidden = !state.isGenerating && state.liveRun?.status !== "complete";
  if (refs.runPanel.hidden) return;
  const progress = Math.max(0, Math.min(100, Number(state.liveRun?.progress || 0)));
  refs.runKicker.textContent = state.liveRun?.status === "complete" ? "真实生成完成" : "真实生成";
  refs.runTitle.textContent = state.liveRun?.step || "正在连接生成环境";
  refs.runMeterFill.style.width = `${progress}%`;
  refs.runPercent.textContent = `${Math.round(progress)}%`;
}

function buildSelectionText() {
  if (state.round === 1) {
    const primary = state.primary ? `主 ${state.primary.index + 1}` : "主未选";
    return `${primary} · 辅 ${state.auxiliary.length}/${MAX_AUX}`;
  }
  if (state.round === 2) {
    return state.firstFrame ? `首帧 ${state.firstFrame.index + 1}` : "首帧未选";
  }
  return state.pack.length ? `pick ${state.pack.length}` : "未 pick";
}

function renderGrid() {
  refs.candidateGrid.innerHTML = "";
  refs.candidateGrid.dataset.round = String(state.round);
  state.candidates.forEach((candidate, index) => {
    const tile = refs.template.content.firstElementChild.cloneNode(true);
    const img = tile.querySelector("img");
    const loader = tile.querySelector(".tile-loader");
    const tileIndex = tile.querySelector(".tile-index");
    const tileMark = tile.querySelector(".tile-mark");
    tile.classList.toggle("loading", Boolean(candidate.loading));
    tile.classList.toggle("cropped", Boolean(candidate.crop));
    loader.textContent = candidate.loading ? buildLoadingLabel(index) : "";
    if (candidate.image) img.src = candidate.image;
    if (candidate.crop) {
      img.style.setProperty("--crop-x", String(candidate.crop.col || 0));
      img.style.setProperty("--crop-y", String(candidate.crop.row || 0));
    }
    img.alt = `${candidate.label}，${candidate.detail}`;
    if (candidate.width && candidate.height) {
      img.width = candidate.width;
      img.height = candidate.height;
    }
    tileIndex.textContent = index + 1;
    const mark = getMark(candidate);
    tileMark.textContent = mark;
    tile.classList.toggle("primary", mark === "MAIN" || mark === "FRAME");
    tile.classList.toggle("aux", mark === "AUX");
    tile.classList.toggle("pick", mark === "PICK");
    tile.classList.toggle("rejected", mark === "NO");
    tile.disabled = Boolean(candidate.loading);
    tile.addEventListener("click", (event) => {
      if (!candidate.loading) handleTileClick(candidate, event);
    });
    tile.addEventListener("dblclick", () => {
      if (!candidate.loading) openLightbox(index);
    });
    refs.candidateGrid.append(tile);
  });
}

function buildLoadingLabel(index) {
  const phase = state.liveRun?.step || "排队";
  const cell = `${Math.floor(index / 9) + 1}-${(index % 9) + 1}`;
  return `${phase} · ${cell}`;
}

function getMark(candidate) {
  if (state.round === 1 && state.primary?.id === candidate.id) return "MAIN";
  if (state.round === 1 && state.auxiliary.some((item) => item.id === candidate.id)) return "AUX";
  if (state.round === 2 && state.firstFrame?.id === candidate.id) return "FRAME";
  if (state.round === 3 && state.pack.some((item) => item.id === candidate.id)) return "PICK";
  if ([...state.rejected, ...state.packRejected].some((item) => item.id === candidate.id)) return "NO";
  return "";
}

function openLightbox(index = 0) {
  if (!state.candidates.length) return;
  state.lightboxIndex = index;
  refs.lightbox.hidden = false;
  refs.lightboxTrack.innerHTML = "";
  state.candidates.forEach((candidate) => {
    const slide = document.createElement("figure");
    slide.className = "lightbox-slide";
    slide.classList.toggle("cropped", Boolean(candidate.crop));
    const image = document.createElement("img");
    image.src = candidate.image;
    image.alt = candidate.label;
    if (candidate.crop) {
      image.style.setProperty("--crop-x", String(candidate.crop.col || 0));
      image.style.setProperty("--crop-y", String(candidate.crop.row || 0));
    }
    slide.append(image);
    refs.lightboxTrack.append(slide);
  });
  scrollLightboxTo(index);
}

function closeLightbox() {
  refs.lightbox.hidden = true;
}

function scrollLightboxTo(index) {
  const clamped = Math.max(0, Math.min(index, state.candidates.length - 1));
  state.lightboxIndex = clamped;
  refs.lightboxCounter.textContent = `${clamped + 1} / ${state.candidates.length}`;
  refs.lightboxTrack.scrollTo({ left: clamped * window.innerWidth, behavior: "smooth" });
}

async function exportPack() {
  if (state.pack.length === 0) return showNotice("还没有 pick。");
  const files = state.pack.map((candidate, index) => ({
    name: `get-the-10-${String(index + 1).padStart(2, "0")}.svg`,
    bytes: svgDataUrlToBytes(candidate.image),
  }));
  files.push({ name: "summary.txt", bytes: new TextEncoder().encode(buildSummary()) });
  const zipBytes = createZip(files);
  const blob = new Blob([zipBytes], { type: "application/zip" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `get-the-10-${safeName(state.intent)}.zip`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showNotice("压缩包已生成。", "ok");
}

function buildSummary() {
  return [
    "get the 10 世界照片包",
    "",
    `空间 ID：${SPACE_ID}`,
    `原始意图：${state.intent}`,
    `参考图：${state.referenceName || "未上传"}`,
    `主方向：${state.primary?.label || "未选择"}`,
    `首帧：${state.firstFrame?.label || "未选择"}`,
    "",
    "辅助元素：",
    ...state.auxiliary.map((item) => `- ${item.label} / ${item.detail}`),
    "",
    "照片包：",
    ...state.pack.map((item, index) => `${index + 1}. ${item.label} / ${item.detail}`),
  ].join("\n");
}

function safeName(value) {
  const cleaned = value.trim().replace(/[^\p{Letter}\p{Number}]+/gu, "-").replace(/^-|-$/g, "");
  return cleaned || "pack";
}

function svgDataUrlToBytes(dataUrl) {
  const [, payload] = dataUrl.split(",", 2);
  return new TextEncoder().encode(decodeURIComponent(payload));
}

function createZip(files) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  files.forEach((file) => {
    const nameBytes = new TextEncoder().encode(file.name);
    const crc = crc32(file.bytes);
    const localHeader = concatBytes([
      u32(0x04034b50), u16(20), u16(0), u16(0), u16(0), u16(0),
      u32(crc), u32(file.bytes.length), u32(file.bytes.length),
      u16(nameBytes.length), u16(0), nameBytes,
    ]);
    localParts.push(localHeader, file.bytes);
    const centralHeader = concatBytes([
      u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(0), u16(0),
      u32(crc), u32(file.bytes.length), u32(file.bytes.length),
      u16(nameBytes.length), u16(0), u16(0), u16(0), u16(0), u32(0),
      u32(offset), nameBytes,
    ]);
    centralParts.push(centralHeader);
    offset += localHeader.length + file.bytes.length;
  });
  const centralStart = offset;
  const central = concatBytes(centralParts);
  const end = concatBytes([
    u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length),
    u32(central.length), u32(centralStart), u16(0),
  ]);
  return concatBytes([...localParts, central, end]);
}

function concatBytes(parts) {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(total);
  let cursor = 0;
  parts.forEach((part) => {
    output.set(part, cursor);
    cursor += part.length;
  });
  return output;
}

function u16(value) {
  return new Uint8Array([value & 0xff, (value >>> 8) & 0xff]);
}

function u32(value) {
  return new Uint8Array([value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff]);
}

const crcTable = Array.from({ length: 256 }, (_, tableIndex) => {
  let value = tableIndex;
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

function crc32(bytes) {
  let crc = 0xffffffff;
  for (let index = 0; index < bytes.length; index += 1) {
    crc = crcTable[(crc ^ bytes[index]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

refs.intentForm.addEventListener("submit", (event) => {
  event.preventDefault();
  void startFlow();
});
refs.referenceInput.addEventListener("change", () => {
  const file = refs.referenceInput.files?.[0];
  state.referenceName = file?.name || "";
  refs.referenceName.textContent = state.referenceName || "参考图";
});
refs.resetButton.addEventListener("click", resetFlow);
refs.failToggleButton.addEventListener("click", () => {
  state.simulateFailure = !state.simulateFailure;
  showNotice(state.simulateFailure ? "已开启失败模拟。" : "已关闭失败模拟。", "ok");
  render();
});
refs.nextButton.addEventListener("click", () => void goNext());
refs.exportButton.addEventListener("click", exportPack);
refs.zoomButton.addEventListener("click", () => openLightbox(0));
refs.closeLightboxButton.addEventListener("click", closeLightbox);
refs.prevButton.addEventListener("click", () => scrollLightboxTo(state.lightboxIndex - 1));
refs.nextImageButton.addEventListener("click", () => scrollLightboxTo(state.lightboxIndex + 1));
document.addEventListener("keydown", (event) => {
  if (refs.lightbox.hidden) return;
  if (event.key === "Escape") closeLightbox();
  if (event.key === "ArrowLeft") scrollLightboxTo(state.lightboxIndex - 1);
  if (event.key === "ArrowRight") scrollLightboxTo(state.lightboxIndex + 1);
});

window.__get10State = state;
window.__get10ExportPack = exportPack;

render();
