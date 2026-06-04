const MAX_AUX = 3;
const MAX_PACK = 10;
const SPACE_ID = "6b9e799d-3711-4143-8a03-0b082a46c261";

const state = {
  round: 1,
  intent: "",
  referenceName: "",
  primary: null,
  auxiliary: [],
  rejected: [],
  firstFrame: null,
  firstFrameRejected: [],
  pack: [],
  packRejected: [],
  candidates: [],
  generationIndex: 0,
  simulateFailure: false,
};

const refs = {
  roundEyebrow: document.querySelector("#roundEyebrow"),
  roundTitle: document.querySelector("#roundTitle"),
  startPanel: document.querySelector("#startPanel"),
  intentInput: document.querySelector("#intentInput"),
  referenceInput: document.querySelector("#referenceInput"),
  referenceName: document.querySelector("#referenceName"),
  startButton: document.querySelector("#startButton"),
  resetButton: document.querySelector("#resetButton"),
  failToggleButton: document.querySelector("#failToggleButton"),
  notice: document.querySelector("#notice"),
  candidateToolbar: document.querySelector("#candidateToolbar"),
  candidateCount: document.querySelector("#candidateCount"),
  generationMeta: document.querySelector("#generationMeta"),
  candidateGrid: document.querySelector("#candidateGrid"),
  continueButton: document.querySelector("#continueButton"),
  exportButton: document.querySelector("#exportButton"),
  backToRoundOneButton: document.querySelector("#backToRoundOneButton"),
  template: document.querySelector("#candidateTemplate"),
  contextIntent: document.querySelector("#contextIntent"),
  contextPrimary: document.querySelector("#contextPrimary"),
  contextFirstFrame: document.querySelector("#contextFirstFrame"),
  contextPackCount: document.querySelector("#contextPackCount"),
  auxList: document.querySelector("#auxList"),
  rejectList: document.querySelector("#rejectList"),
  tabs: Array.from(document.querySelectorAll("[data-round-tab]")),
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

function getRoundCopy() {
  if (state.round === 1) {
    return ["第一轮 / 主方向", "从二十七张图里选一个主方向"];
  }
  if (state.round === 2) {
    return ["第二轮 / 首帧", "找到那张像是从世界里拍出来的照片"];
  }
  return ["第三轮 / 世界照片包", "保留最多十张来自同一世界的照片"];
}

function setRound(round) {
  try {
    state.round = round;
    generateCandidates(round);
    clearNotice();
  } catch (error) {
    showNotice(error.message);
    render();
  }
}

function assertCanGenerate() {
  if (!state.intent.trim()) {
    throw new Error("先输入一个短意图。一个词也可以。");
  }
  if (state.simulateFailure) {
    throw new Error("生成服务当前失败。系统没有继续假装成功，请关闭模拟失败后重试。");
  }
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
  const title = round === 3
    ? `照片 ${index + 1}`
    : `入口 ${index + 1}`;
  const image = makeImageSvg({
    title,
    intent: state.intent,
    direction,
    subject,
    detail,
    palette,
    round,
    index,
    random,
  });

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
    image,
  };
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
  const label = [intent, direction, subject].join(" · ");
  const roundName = round === 1 ? "方向" : round === 2 ? "首帧" : "照片";

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
          <feComponentTransfer>
            <feFuncA type="table" tableValues="0 0.19"/>
          </feComponentTransfer>
        </filter>
      </defs>
      <rect width="300" height="300" fill="url(#g${index})"/>
      <circle cx="${sunX}" cy="${sunY}" r="${34 * scale}" fill="${c}" opacity="0.22"/>
      <path d="M0 ${horizon} C70 ${horizon - 28} 122 ${horizon + 28} 185 ${horizon - 2} S262 ${horizon - 16} 300 ${horizon + 8} L300 300 L0 300 Z" fill="${d}" opacity="0.72"/>
      <g transform="rotate(${rot} 150 170)">
        ${strips}
        <path d="M42 238 C88 176 119 173 154 226 S239 214 262 151" fill="none" stroke="${c}" stroke-width="7" stroke-linecap="round" opacity="0.34"/>
        <rect x="76" y="126" width="148" height="84" fill="${b}" opacity="0.18"/>
      </g>
      ${marks}
      <rect y="236" width="300" height="64" fill="${b}" opacity="0.62"/>
      <text x="18" y="259" fill="${c}" font-family="Georgia, serif" font-size="16" font-weight="700">${escapeXml(title)} · ${escapeXml(roundName)}</text>
      <text x="18" y="278" fill="${c}" font-family="Arial, sans-serif" font-size="10">${escapeXml(label.slice(0, 42))}</text>
      <text x="18" y="292" fill="${c}" font-family="Arial, sans-serif" font-size="9" opacity="0.78">${escapeXml(detail)}</text>
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

function generateCandidates(round) {
  assertCanGenerate();
  state.generationIndex += 1;
  const total = round === 3 ? 10 : 27;
  state.candidates = Array.from({ length: total }, (_, index) => {
    const gridIndex = round === 3 ? 0 : Math.floor(index / 9);
    const cellIndex = round === 3 ? index : index % 9;
    return buildCandidate(round, index, total, gridIndex, cellIndex);
  });
  if (round === 2) {
    state.firstFrame = null;
  }
  render();
}

function startFlow() {
  const intent = refs.intentInput.value.trim();
  state.intent = intent;
  try {
    state.round = 1;
    state.primary = null;
    state.auxiliary = [];
    state.rejected = [];
    state.firstFrame = null;
    state.firstFrameRejected = [];
    state.pack = [];
    state.packRejected = [];
    generateCandidates(1);
    clearNotice();
  } catch (error) {
    showNotice(error.message);
    render();
  }
}

function choosePrimary(candidate) {
  state.primary = candidate;
  state.auxiliary = state.auxiliary.filter((item) => item.id !== candidate.id);
  state.rejected = state.rejected.filter((item) => item.id !== candidate.id);
  showNotice("主方向已更新。后续轮次会以它为锚点。", "ok");
  render();
}

function toggleAuxiliary(candidate) {
  if (state.primary?.id === candidate.id) {
    showNotice("主方向已经是锚点，不能再作为辅助元素。");
    return;
  }
  const exists = state.auxiliary.some((item) => item.id === candidate.id);
  if (exists) {
    state.auxiliary = state.auxiliary.filter((item) => item.id !== candidate.id);
  } else {
    if (state.auxiliary.length >= MAX_AUX) {
      showNotice(`辅助元素最多 ${MAX_AUX} 个，避免主方向被稀释。`);
      return;
    }
    state.auxiliary.push(candidate);
    state.rejected = state.rejected.filter((item) => item.id !== candidate.id);
  }
  render();
}

function toggleRejected(candidate) {
  const collection = state.round === 3 ? state.packRejected : state.round === 2 ? state.firstFrameRejected : state.rejected;
  const exists = collection.some((item) => item.id === candidate.id);
  if (exists) {
    const next = collection.filter((item) => item.id !== candidate.id);
    assignRejectedCollection(next);
  } else {
    assignRejectedCollection([...collection, candidate]);
    if (state.primary?.id === candidate.id) {
      state.primary = null;
    }
    if (state.firstFrame?.id === candidate.id) {
      state.firstFrame = null;
    }
    state.auxiliary = state.auxiliary.filter((item) => item.id !== candidate.id);
    state.pack = state.pack.filter((item) => item.id !== candidate.id);
  }
  render();
}

function assignRejectedCollection(next) {
  if (state.round === 3) {
    state.packRejected = next;
  } else if (state.round === 2) {
    state.firstFrameRejected = next;
  } else {
    state.rejected = next;
  }
}

function chooseFirstFrame(candidate) {
  state.firstFrame = candidate;
  state.firstFrameRejected = state.firstFrameRejected.filter((item) => item.id !== candidate.id);
  showNotice("首帧已选定，可以进入第三轮扩展世界照片包。", "ok");
  render();
}

function togglePack(candidate) {
  const exists = state.pack.some((item) => item.id === candidate.id);
  if (exists) {
    state.pack = state.pack.filter((item) => item.id !== candidate.id);
  } else {
    if (state.pack.length >= MAX_PACK) {
      showNotice("世界照片包最多保留十张。先移除一张，再加入新的。");
      return;
    }
    state.pack.push(candidate);
    state.packRejected = state.packRejected.filter((item) => item.id !== candidate.id);
  }
  render();
}

function handleContinue() {
  try {
    if (state.round === 1) {
      if (!state.primary) {
        showNotice("第一轮必须选出一个主方向。");
        return;
      }
      state.round = 2;
      generateCandidates(2);
      return;
    }
    if (state.round === 2) {
      if (!state.firstFrame) {
        showNotice("第二轮必须选定一张首帧。");
        return;
      }
      state.round = 3;
      generateCandidates(3);
      return;
    }
    generateCandidates(3);
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
  state.firstFrameRejected = [];
  state.pack = [];
  state.packRejected = [];
  state.candidates = [];
  state.generationIndex = 0;
  refs.intentInput.value = "";
  refs.referenceInput.value = "";
  refs.referenceName.textContent = "未上传";
  clearNotice();
  render();
}

function render() {
  const [eyebrow, title] = getRoundCopy();
  refs.roundEyebrow.textContent = eyebrow;
  refs.roundTitle.textContent = title;
  refs.startPanel.hidden = state.candidates.length > 0;
  refs.candidateToolbar.hidden = state.candidates.length === 0;
  refs.contextIntent.textContent = state.intent || "未开始";
  refs.contextPrimary.textContent = state.primary ? state.primary.label : "未选择";
  refs.contextFirstFrame.textContent = state.firstFrame ? state.firstFrame.label : "未选择";
  refs.contextPackCount.textContent = `${state.pack.length} / ${MAX_PACK}`;
  refs.failToggleButton.textContent = state.simulateFailure ? "关闭生成失败" : "模拟生成失败";
  refs.failToggleButton.classList.toggle("active", state.simulateFailure);
  renderTabs();
  renderTokens();
  renderToolbar();
  renderCandidates();
}

function renderTabs() {
  refs.tabs.forEach((tab) => {
    const tabRound = Number(tab.dataset.roundTab);
    tab.classList.toggle("active", tabRound === state.round);
    tab.disabled = tabRound === 2 ? !state.primary : tabRound === 3 ? !state.firstFrame : false;
  });
}

function renderTokens() {
  refs.auxList.innerHTML = "";
  refs.rejectList.innerHTML = "";
  const auxItems = state.auxiliary.length ? state.auxiliary : [{ label: "辅助元素未选择" }];
  const rejectedPool = [...state.rejected, ...state.firstFrameRejected, ...state.packRejected];
  const rejectItems = rejectedPool.length ? rejectedPool : [{ label: "拒绝方向未记录" }];
  auxItems.forEach((item) => refs.auxList.append(makeToken(item.label || item.detail)));
  rejectItems.forEach((item) => refs.rejectList.append(makeToken(item.label || item.detail)));
}

function makeToken(label) {
  const token = document.createElement("span");
  token.className = "token";
  token.textContent = label;
  return token;
}

function renderToolbar() {
  const count = state.candidates.length;
  refs.candidateCount.textContent = `${count} 张候选`;
  refs.generationMeta.textContent = state.round === 3
    ? `第 ${state.generationIndex} 次生成，世界照片包最多保留十张`
    : `第 ${state.generationIndex} 次生成，三张九宫格已切成二十七张`;
  refs.backToRoundOneButton.hidden = state.round !== 2;
  refs.exportButton.hidden = state.round !== 3;
  refs.exportButton.disabled = state.pack.length === 0;
  refs.continueButton.hidden = false;
  if (state.round === 1) {
    refs.continueButton.textContent = "进入第二轮";
    refs.continueButton.disabled = !state.primary;
  } else if (state.round === 2) {
    refs.continueButton.textContent = "进入第三轮";
    refs.continueButton.disabled = !state.firstFrame;
  } else {
    refs.continueButton.textContent = "再生成十张";
    refs.continueButton.disabled = false;
  }
}

function renderCandidates() {
  refs.candidateGrid.innerHTML = "";
  state.candidates.forEach((candidate) => {
    const node = refs.template.content.firstElementChild.cloneNode(true);
    const imageButton = node.querySelector(".image-button");
    const img = node.querySelector("img");
    const metaTitle = node.querySelector(".candidate-meta strong");
    const metaDetail = node.querySelector(".candidate-meta span");
    const actions = node.querySelector(".candidate-actions");

    node.classList.toggle("primary", state.primary?.id === candidate.id || state.firstFrame?.id === candidate.id);
    node.classList.toggle("kept", state.pack.some((item) => item.id === candidate.id));
    node.classList.toggle("rejected-card", isRejected(candidate));
    img.src = candidate.image;
    img.alt = `${candidate.label}，${candidate.detail}`;
    metaTitle.textContent = candidate.label;
    metaDetail.textContent = state.round === 3
      ? candidate.detail
      : `九宫格 ${candidate.gridIndex + 1} / 切片 ${candidate.cellIndex + 1} · ${candidate.detail}`;
    imageButton.addEventListener("click", () => quickSelect(candidate));
    renderCandidateActions(actions, candidate);
    refs.candidateGrid.append(node);
  });
}

function renderCandidateActions(actions, candidate) {
  actions.innerHTML = "";
  if (state.round === 1) {
    actions.append(
      makeAction("主方向", () => choosePrimary(candidate), state.primary?.id === candidate.id),
      makeAction("辅助", () => toggleAuxiliary(candidate), state.auxiliary.some((item) => item.id === candidate.id), "keep-active"),
      makeAction("不要", () => toggleRejected(candidate), isRejected(candidate)),
    );
    return;
  }
  if (state.round === 2) {
    actions.append(
      makeAction("首帧", () => chooseFirstFrame(candidate), state.firstFrame?.id === candidate.id),
      makeAction("不要", () => toggleRejected(candidate), isRejected(candidate)),
    );
    return;
  }
  actions.append(
    makeAction("加入", () => togglePack(candidate), state.pack.some((item) => item.id === candidate.id), "keep-active"),
    makeAction("不要", () => toggleRejected(candidate), isRejected(candidate)),
  );
}

function makeAction(label, onClick, active = false, activeClass = "active") {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.classList.toggle(activeClass, active);
  button.addEventListener("click", onClick);
  return button;
}

function quickSelect(candidate) {
  if (state.round === 1) {
    choosePrimary(candidate);
  } else if (state.round === 2) {
    chooseFirstFrame(candidate);
  } else {
    togglePack(candidate);
  }
}

function isRejected(candidate) {
  return [...state.rejected, ...state.firstFrameRejected, ...state.packRejected].some((item) => item.id === candidate.id);
}

async function exportPack() {
  if (state.pack.length === 0) {
    showNotice("照片包里还没有图片。");
    return;
  }
  const files = state.pack.map((candidate, index) => ({
    name: `get-the-10-${String(index + 1).padStart(2, "0")}.svg`,
    bytes: svgDataUrlToBytes(candidate.image),
  }));
  files.push({
    name: "summary.txt",
    bytes: new TextEncoder().encode(buildSummary()),
  });
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
  showNotice("压缩包已生成。浏览器会开始下载。", "ok");
}

function buildSummary() {
  const lines = [
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
    "拒绝方向：",
    ...[...state.rejected, ...state.firstFrameRejected, ...state.packRejected].map((item) => `- ${item.label} / ${item.detail}`),
    "",
    "照片包：",
    ...state.pack.map((item, index) => `${index + 1}. ${item.label} / ${item.detail}`),
  ];
  return lines.join("\n");
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
  const bytes = new Uint8Array(2);
  bytes[0] = value & 0xff;
  bytes[1] = (value >>> 8) & 0xff;
  return bytes;
}

function u32(value) {
  const bytes = new Uint8Array(4);
  bytes[0] = value & 0xff;
  bytes[1] = (value >>> 8) & 0xff;
  bytes[2] = (value >>> 16) & 0xff;
  bytes[3] = (value >>> 24) & 0xff;
  return bytes;
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

refs.startButton.addEventListener("click", startFlow);
refs.intentInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    startFlow();
  }
});
refs.referenceInput.addEventListener("change", () => {
  const file = refs.referenceInput.files?.[0];
  state.referenceName = file?.name || "";
  refs.referenceName.textContent = state.referenceName || "未上传";
});
refs.resetButton.addEventListener("click", resetFlow);
refs.failToggleButton.addEventListener("click", () => {
  state.simulateFailure = !state.simulateFailure;
  showNotice(state.simulateFailure ? "已开启生成失败模拟。下一次生成会明确失败。" : "已关闭生成失败模拟。", "ok");
  render();
});
refs.continueButton.addEventListener("click", handleContinue);
refs.exportButton.addEventListener("click", exportPack);
refs.backToRoundOneButton.addEventListener("click", () => {
  try {
    state.round = 1;
    state.firstFrame = null;
    generateCandidates(1);
  } catch (error) {
    showNotice(error.message);
    render();
  }
});
refs.tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    const round = Number(tab.dataset.roundTab);
    if (round === 1 || (round === 2 && state.primary) || (round === 3 && state.firstFrame)) {
      setRound(round);
    }
  });
});

window.__get10State = state;
window.__get10ExportPack = exportPack;

render();
