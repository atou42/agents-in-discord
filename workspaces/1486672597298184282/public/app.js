const STAGE_ORDER = ["character", "animate", "preview", "spritesheets"];
const STAGE_LABELS = {
  character: "Character",
  animate: "Animate",
  preview: "Preview",
  spritesheets: "Spritesheets",
};
const ACTION_COPY = {
  idle: "Ambient loop with soft breathing and a stable silhouette.",
  walk: "Readable travel cycle for side-scrolling movement.",
  run: "Higher-energy cycle with stronger stretch and lift.",
  jump: "Single arc with takeoff, apex, and landing.",
  attack: "One-shot impact move with a clean finish frame.",
};
const TOKEN_STORAGE_KEY = "autosprite.netaToken";

const state = {
  generationBackend: "unknown",
  netaToken: "",
  netaUser: null,
  characters: [],
  selectedCharacterId: null,
  selectedCharacter: null,
  supportedActions: [],
  poses: [],
  customAnimations: [],
  spritesheets: [],
  jobs: [],
  currentStage: "character",
  currentAnimatePanel: "select",
  selectedStandardActionIds: [],
  selectedCustomActionIds: [],
  pendingPreview: null,
  activePreview: null,
  previewSheetImage: null,
  previewAtlas: null,
  previewLoopStart: 0,
  previewLoopEnd: 0,
  previewFps: 12,
  previewFrameIndex: 0,
  previewLastTick: 0,
  pollTimer: null,
  previewTimer: null,
};

const elements = {
  backendBadge: document.querySelector("#backend-badge"),
  authForm: document.querySelector("#auth-form"),
  authToken: document.querySelector("#auth-token"),
  authMessage: document.querySelector("#auth-message"),
  authSummary: document.querySelector("#auth-summary"),
  createForm: document.querySelector("#create-character-form"),
  createMessage: document.querySelector("#create-message"),
  characterList: document.querySelector("#character-list"),
  workspaceTitle: document.querySelector("#workspace-title"),
  workspaceSubtitle: document.querySelector("#workspace-subtitle"),
  currentStageLabel: document.querySelector("#current-stage-label"),
  currentQueueLabel: document.querySelector("#current-queue-label"),
  nextStepLabel: document.querySelector("#next-step-label"),
  analysisCard: document.querySelector("#analysis-card"),
  stageTabs: Array.from(document.querySelectorAll(".stage-tab[data-stage]")),
  stagePanels: Array.from(document.querySelectorAll("[data-stage-panel]")),
  animateTabs: Array.from(document.querySelectorAll(".animate-subtab[data-animate-panel]")),
  animatePanels: Array.from(document.querySelectorAll(".animate-panel")),
  newCharacterButton: document.querySelector("#new-character-button"),
  poseForm: document.querySelector("#pose-form"),
  poseMessage: document.querySelector("#pose-message"),
  poseList: document.querySelector("#pose-list"),
  customForm: document.querySelector("#custom-animation-form"),
  customMessage: document.querySelector("#custom-message"),
  customMode: document.querySelector("#custom-mode"),
  customLoop: document.querySelector("#custom-loop"),
  customFirstPose: document.querySelector("#custom-first-pose"),
  customLastPose: document.querySelector("#custom-last-pose"),
  customList: document.querySelector("#custom-animation-list"),
  generateForm: document.querySelector("#generate-form"),
  actionList: document.querySelector("#action-list"),
  generateButton: document.querySelector("#generate-button"),
  generateMessage: document.querySelector("#generate-message"),
  generateSummaryTitle: document.querySelector("#generate-summary-title"),
  generateSummaryCopy: document.querySelector("#generate-summary-copy"),
  jobList: document.querySelector("#job-list"),
  previewJobList: document.querySelector("#preview-job-list"),
  exportsJobList: document.querySelector("#exports-job-list"),
  previewResultList: document.querySelector("#preview-result-list"),
  spritesheetList: document.querySelector("#spritesheet-list"),
  characterThumbnail: document.querySelector("#character-thumbnail"),
  characterPlaceholder: document.querySelector("#character-placeholder"),
  statPoses: document.querySelector("#stat-poses"),
  statCustom: document.querySelector("#stat-custom"),
  statExports: document.querySelector("#stat-exports"),
  previewCanvas: document.querySelector("#preview-canvas"),
  previewMeta: document.querySelector("#preview-meta"),
  previewToExports: document.querySelector("#preview-to-exports"),
  previewRangeStart: document.querySelector("#preview-range-start"),
  previewRangeEnd: document.querySelector("#preview-range-end"),
  previewFps: document.querySelector("#preview-fps"),
  previewLoopReadout: document.querySelector("#preview-loop-readout"),
  previewFpsReadout: document.querySelector("#preview-fps-readout"),
};

const previewContext = elements.previewCanvas.getContext("2d");

function statusClass(status) {
  return `status status--${status}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function pluralize(count, word) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

function selectedActionCount() {
  return state.selectedStandardActionIds.length + state.selectedCustomActionIds.length;
}

function activeJobCount() {
  return state.jobs.filter((job) => job.status === "queued" || job.status === "running").length;
}

function pruneSelections() {
  const standardIds = new Set(state.supportedActions.map((action) => action.id));
  const customIds = new Set(state.customAnimations.map((animation) => animation.id));
  state.selectedStandardActionIds = state.selectedStandardActionIds.filter((actionId) => standardIds.has(actionId));
  state.selectedCustomActionIds = state.selectedCustomActionIds.filter((actionId) => customIds.has(actionId));
}

function stageIsAccessible(stage) {
  if (stage === "character") {
    return true;
  }

  if (stage === "animate") {
    return Boolean(state.selectedCharacter);
  }

  if (stage === "preview") {
    return Boolean(state.selectedCharacter) && (state.jobs.length > 0 || state.spritesheets.length > 0);
  }

  if (stage === "spritesheets") {
    return state.spritesheets.length > 0;
  }

  return false;
}

function getQueueLabel() {
  if (!state.selectedCharacter) {
    return "No character";
  }

  const queued = state.jobs.filter((job) => job.status === "queued").length;
  const running = state.jobs.filter((job) => job.status === "running").length;
  const ready = state.jobs.filter((job) => job.status === "succeeded").length;

  if (queued === 0 && running === 0 && ready === 0) {
    return "Idle";
  }

  if (queued === 0 && running === 0) {
    return `${ready} ready`;
  }

  return `${running} running · ${queued} queued`;
}

function getNextStepLabel() {
  if (!state.selectedCharacter) {
    return "Upload a base character";
  }

  if (state.currentStage === "character") {
    return "Open Animate";
  }

  if (state.currentStage === "animate") {
    return selectedActionCount() > 0 ? "Generate preview" : "Choose motions";
  }

  if (state.currentStage === "preview") {
    return state.spritesheets.length > 0 ? "Open exports" : "Wait for render";
  }

  return "Download files";
}

function getStageSubtitle() {
  if (!state.selectedCharacter) {
    return "Upload one character, choose the motions, preview the result, and export production-ready sheets.";
  }

  if (state.currentStage === "character") {
    return state.selectedCharacter.characterDescription || "Base character ready. Continue when the silhouette looks stable.";
  }

  if (state.currentStage === "animate") {
    return "Select the standard pack first, then branch into pose or custom action setup only when needed.";
  }

  if (state.currentStage === "preview") {
    return state.spritesheets.length > 0
      ? "Inspect the motion, tighten the loop range, and check playback speed before export."
      : "Preview will unlock automatically as soon as the first spritesheet finishes.";
  }

  return "Download the PNG spritesheet and JSON atlas for each finished motion.";
}

function ensureAccessibleStage() {
  if (stageIsAccessible(state.currentStage)) {
    return;
  }

  if (stageIsAccessible("animate")) {
    state.currentStage = "animate";
    return;
  }

  state.currentStage = "character";
}

function setStage(stage, { force = false } = {}) {
  if (!force && !stageIsAccessible(stage)) {
    return;
  }

  state.currentStage = stage;
  renderStageShell();

  if (stage === "preview" && state.spritesheets.length > 0 && !state.activePreview) {
    void loadPreview(state.spritesheets[0].id);
  }
}

function setAnimatePanel(panel) {
  state.currentAnimatePanel = panel;

  for (const tab of elements.animateTabs) {
    const isActive = tab.dataset.animatePanel === panel;
    tab.classList.toggle("is-active", isActive);
  }

  for (const panelElement of elements.animatePanels) {
    const isActive = panelElement.id === `animate-panel-${panel}`;
    panelElement.classList.toggle("hidden", !isActive);
    panelElement.hidden = !isActive;
  }
}

async function fetchJson(url, options = {}) {
  const headers = new Headers(options.headers || {});
  if (state.netaToken) {
    headers.set("x-neta-token", state.netaToken);
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  let body;
  try {
    body = await response.json();
  } catch (_error) {
    throw new Error(`Invalid JSON response from ${url}`);
  }

  if (!response.ok) {
    const message = body?.error?.message || `Request failed with ${response.status}`;
    throw new Error(message);
  }

  return body;
}

function setMessage(element, message, isError = false) {
  element.textContent = message;
  element.style.color = isError ? "var(--color-danger)" : "var(--color-muted)";
}

function clearBuildMessages() {
  setMessage(elements.poseMessage, "");
  setMessage(elements.customMessage, "");
  setMessage(elements.generateMessage, "");
}

function renderAuthState() {
  const backendLabel = state.generationBackend === "neta" ? "Neta" : state.generationBackend;
  elements.backendBadge.textContent = `${backendLabel} backend`;
  elements.backendBadge.dataset.backend = state.generationBackend;

  if (state.generationBackend !== "neta") {
    elements.authSummary.innerHTML = `<p class="muted">Current backend: ${escapeHtml(backendLabel)}. Token is not required.</p>`;
    return;
  }

  if (state.netaUser) {
    elements.authSummary.innerHTML = `
      <div class="auth-user">
        <p><strong>${escapeHtml(state.netaUser.nickName || "Connected account")}</strong></p>
        <p class="muted">${escapeHtml(state.netaUser.email || state.netaUser.uuid)}</p>
      </div>
    `;
    return;
  }

  if (state.netaToken) {
    elements.authSummary.innerHTML = `<p class="muted">Token saved locally. Click connect to verify it before generating.</p>`;
    return;
  }

  elements.authSummary.innerHTML = `<p class="muted">Generation runs through Neta. Paste your token here before using prompt pose or spritesheet generation.</p>`;
}

function renderWorkspaceHeader() {
  elements.workspaceTitle.textContent = state.selectedCharacter ? state.selectedCharacter.name : "Create a character to begin.";
  elements.workspaceSubtitle.textContent = getStageSubtitle();

  if (elements.currentStageLabel) {
    elements.currentStageLabel.textContent = STAGE_LABELS[state.currentStage];
  }
  if (elements.currentQueueLabel) {
    elements.currentQueueLabel.textContent = getQueueLabel();
  }
  if (elements.nextStepLabel) {
    elements.nextStepLabel.textContent = getNextStepLabel();
  }
}

function renderWorkspaceSummary() {
  elements.statPoses.textContent = String(state.poses.length);
  elements.statCustom.textContent = String(state.customAnimations.length);
  elements.statExports.textContent = String(state.spritesheets.length);

  const imageUrl = state.selectedCharacter?.thumbnailUrl || state.selectedCharacter?.baseImageUrl || "";
  if (imageUrl) {
    elements.characterThumbnail.src = imageUrl;
    elements.characterThumbnail.alt = `${state.selectedCharacter.name} thumbnail`;
    elements.characterThumbnail.classList.remove("hidden");
    elements.characterPlaceholder.classList.add("hidden");
  } else {
    elements.characterThumbnail.removeAttribute("src");
    elements.characterThumbnail.alt = "";
    elements.characterThumbnail.classList.add("hidden");
    elements.characterPlaceholder.classList.remove("hidden");
  }

  renderWorkspaceHeader();
}

function renderCharacters() {
  if (state.characters.length === 0) {
    elements.characterList.innerHTML = `<p class="muted">No characters yet. Upload one on the Character stage.</p>`;
    return;
  }

  elements.characterList.innerHTML = state.characters
    .map((character) => {
      const notes = character.analysis?.notes?.length ? `<p class="muted">${escapeHtml(character.analysis.notes[0])}</p>` : "";
      return `
        <article class="character-card ${character.id === state.selectedCharacterId ? "is-selected" : ""}" data-character-id="${escapeHtml(character.id)}">
          <div class="character-card__top">
            <img class="character-card__thumbnail" src="${escapeHtml(character.thumbnailUrl || character.baseImageUrl)}" alt="${escapeHtml(character.name)}" />
            <span class="${statusClass("succeeded")}">ready</span>
          </div>
          <div class="character-card__row">
            <div>
              <h3>${escapeHtml(character.name)}</h3>
              <p class="muted">${character.isHumanoid ? "Humanoid motion" : "Wide-body motion"}</p>
            </div>
          </div>
          ${notes}
        </article>
      `;
    })
    .join("");
}

function renderAnalysisCard(character) {
  if (state.currentStage !== "character" || !character?.analysis) {
    elements.analysisCard.classList.add("hidden");
    if (state.currentStage !== "character") {
      elements.analysisCard.innerHTML = "";
    }
    return;
  }

  const notes = character.analysis.notes.length
    ? `<ul>${character.analysis.notes.map((note) => `<li>${escapeHtml(note)}</li>`).join("")}</ul>`
    : `<p class="muted">Input looks stable enough for standard motion generation.</p>`;

  elements.analysisCard.classList.remove("hidden");
  elements.analysisCard.innerHTML = `
    <p class="eyebrow">Input analysis</p>
    <h3>${character.analysis.isHumanoidGuess ? "Humanoid silhouette" : "Wide silhouette"}</h3>
    <p class="muted">Coverage ${Math.round(character.analysis.silhouetteCoverage * 100)}% · Aspect ${character.analysis.aspectRatio}</p>
    ${notes}
  `;
}

function renderPoses() {
  if (!state.selectedCharacter) {
    elements.poseList.innerHTML = `<p class="muted">Select a character first.</p>`;
    return;
  }

  if (state.poses.length === 0) {
    elements.poseList.innerHTML = `<p class="muted">No poses yet.</p>`;
    return;
  }

  elements.poseList.innerHTML = state.poses
    .map(
      (pose) => `
        <article class="mini-card">
          <img src="${escapeHtml(pose.imageUrl)}" alt="${escapeHtml(pose.name)}" />
          <div>
            <p><strong>${escapeHtml(pose.name)}</strong></p>
            <p class="muted">${escapeHtml(pose.sourceType)}${pose.prompt ? ` · ${escapeHtml(pose.prompt)}` : ""}</p>
          </div>
        </article>
      `,
    )
    .join("");
}

function renderCustomAnimations() {
  if (!state.selectedCharacter) {
    elements.customList.innerHTML = `<p class="muted">Select a character first.</p>`;
    return;
  }

  if (state.customAnimations.length === 0) {
    elements.customList.innerHTML = `<p class="muted">No custom actions yet.</p>`;
    return;
  }

  elements.customList.innerHTML = state.customAnimations
    .map((item) => {
      const modeLabel = item.mode.replaceAll("_", " ");
      return `
        <article class="mini-card mini-card--no-image">
          <div>
            <p><strong>${escapeHtml(item.name)}</strong></p>
            <p class="muted">${escapeHtml(modeLabel)} · ${item.loop ? "loop" : "one-shot"}</p>
            <p class="muted">${escapeHtml(item.prompt)}</p>
          </div>
        </article>
      `;
    })
    .join("");
}

function updateCustomPoseOptions() {
  const currentFirst = elements.customFirstPose.value;
  const currentLast = elements.customLastPose.value;
  const options = [`<option value="">None</option>`]
    .concat(state.poses.map((pose) => `<option value="${escapeHtml(pose.id)}">${escapeHtml(pose.name)}</option>`))
    .join("");

  elements.customFirstPose.innerHTML = options;
  elements.customLastPose.innerHTML = options;

  if (currentFirst) {
    elements.customFirstPose.value = currentFirst;
  }
  if (currentLast) {
    elements.customLastPose.value = currentLast;
  }
}

function renderGenerateSummary() {
  const count = selectedActionCount();
  const missingToken = state.generationBackend === "neta" && !state.netaToken;
  const hasCharacter = Boolean(state.selectedCharacter);

  if (!hasCharacter) {
    elements.generateSummaryTitle.textContent = "Select a character";
    elements.generateSummaryCopy.textContent = "Upload or choose a character to unlock motion selection.";
  } else if (count === 0) {
    elements.generateSummaryTitle.textContent = "Nothing selected";
    elements.generateSummaryCopy.textContent = "Choose one or more motions to unlock generation.";
  } else {
    elements.generateSummaryTitle.textContent = `${pluralize(count, "motion")} selected`;
    elements.generateSummaryCopy.textContent = `${pluralize(count, "job")} will enter the queue when you generate.`;
  }

  elements.generateButton.disabled = !hasCharacter || missingToken || count === 0;
  elements.generateButton.textContent = count > 0 ? `Generate ${pluralize(count, "spritesheet")}` : "Generate spritesheets";
}

function updateCustomFormState() {
  const hasCharacter = Boolean(state.selectedCharacter);
  const mode = elements.customMode.value;
  const loop = elements.customLoop.checked;

  elements.customForm.querySelector("button[type='submit']").disabled = !hasCharacter;
  elements.poseForm.querySelector("button[type='submit']").disabled = !hasCharacter;

  const firstRequired = mode !== "auto";
  const lastEnabled = mode === "first_and_last_frame";
  const lastRequired = mode === "first_and_last_frame" && !loop;

  elements.customFirstPose.disabled = !firstRequired;
  elements.customLastPose.disabled = !lastEnabled || loop;
  elements.customFirstPose.required = firstRequired;
  elements.customLastPose.required = lastRequired;

  renderGenerateSummary();
}

function renderActionList() {
  pruneSelections();

  if (!state.selectedCharacter) {
    state.selectedStandardActionIds = [];
    state.selectedCustomActionIds = [];
    elements.actionList.innerHTML = `<p class="muted">Select a character first.</p>`;
    renderGenerateSummary();
    return;
  }

  const standardItems = state.supportedActions
    .map((action) => {
      const checked = state.selectedStandardActionIds.includes(action.id) ? "checked" : "";
      const copy = ACTION_COPY[action.id] || action.motionPrompt;
      return `
        <label class="action-card">
          <input type="checkbox" name="action-standard" value="${escapeHtml(action.id)}" ${checked} />
          <span class="action-card__kind">${action.loop ? "Loop" : "One shot"}</span>
          <strong>${escapeHtml(action.label)}</strong>
          <p class="muted">${escapeHtml(copy)}</p>
          <p class="muted">${action.defaultFrameCount} frames</p>
        </label>
      `;
    })
    .join("");

  const customItems = state.customAnimations.length
    ? state.customAnimations
        .map((item) => {
          const checked = state.selectedCustomActionIds.includes(item.id) ? "checked" : "";
          return `
            <label class="action-card action-card--custom">
              <input type="checkbox" name="action-custom" value="${escapeHtml(item.id)}" ${checked} />
              <span class="action-card__kind">Custom</span>
              <strong>${escapeHtml(item.name)}</strong>
              <p class="muted">${escapeHtml(item.prompt)}</p>
              <p class="muted">${item.mode.replaceAll("_", " ")} · ${item.loop ? "loop" : "one-shot"}</p>
            </label>
          `;
        })
        .join("")
    : `<p class="muted">No saved custom actions yet.</p>`;

  elements.actionList.innerHTML = `
    <div class="action-group">
      <p class="eyebrow">Standard actions</p>
      <div class="action-group__tiles">${standardItems}</div>
    </div>
    <div class="action-group">
      <p class="eyebrow">Custom actions</p>
      <div class="action-group__tiles">${customItems}</div>
    </div>
  `;

  renderGenerateSummary();
}

function buildJobListMarkup(emptyMessage) {
  if (!state.selectedCharacter) {
    return `<p class="muted">Select a character first.</p>`;
  }

  if (state.jobs.length === 0) {
    return `<p class="muted">${escapeHtml(emptyMessage)}</p>`;
  }

  return state.jobs
    .map((job) => {
      const steps = job.steps
        .map((step) => `<span class="${statusClass(step.status)}">${escapeHtml(step.label)}</span>`)
        .join(" ");
      const title =
        job.request.requestKind === "custom"
          ? job.request.label
          : state.supportedActions.find((action) => action.id === job.request.action)?.label || job.request.action;

      return `
        <article class="job-card">
          <div class="character-card__row">
            <div>
              <h3>${escapeHtml(title)}</h3>
              <p class="muted">${escapeHtml(job.error || "Tracking motion build and sheet export.")}</p>
            </div>
            <span class="${statusClass(job.status)}">${escapeHtml(job.status)}</span>
          </div>
          <div class="result-card__links">${steps}</div>
        </article>
      `;
    })
    .join("");
}

function renderAllJobLists() {
  const sidebarMarkup = buildJobListMarkup("No generation jobs yet.");
  const previewMarkup = buildJobListMarkup("No preview jobs yet.");
  const exportsMarkup = buildJobListMarkup("No export jobs yet.");

  if (elements.jobList) {
    elements.jobList.innerHTML = sidebarMarkup;
  }
  if (elements.previewJobList) {
    elements.previewJobList.innerHTML = previewMarkup;
  }
  if (elements.exportsJobList) {
    elements.exportsJobList.innerHTML = exportsMarkup;
  }
}

function renderPreviewPickers() {
  if (!state.selectedCharacter) {
    elements.previewResultList.innerHTML = `<p class="muted">Select a character first.</p>`;
    return;
  }

  if (state.spritesheets.length === 0) {
    const message =
      activeJobCount() > 0
        ? "The first completed render will appear here automatically."
        : "No completed renders yet. Generate a batch on the Animate stage.";
    elements.previewResultList.innerHTML = `<p class="muted">${message}</p>`;
    return;
  }

  elements.previewResultList.innerHTML = state.spritesheets
    .map((sheet) => {
      const isActive = state.activePreview?.id === sheet.id;
      return `
        <button class="preview-picker ${isActive ? "is-active" : ""}" type="button" data-preview-id="${escapeHtml(sheet.id)}">
          <strong>${escapeHtml(sheet.name)}</strong>
          <p class="muted">${sheet.frameCount} frames · ${sheet.frameWidth}px</p>
          <div class="preview-picker__meta">
            <span class="${statusClass(sheet.status)}">${escapeHtml(sheet.status)}</span>
          </div>
        </button>
      `;
    })
    .join("");
}

function renderSpritesheets() {
  if (!state.selectedCharacter) {
    elements.spritesheetList.innerHTML = `<p class="muted">Create or select a character to see results.</p>`;
    return;
  }

  if (state.spritesheets.length === 0) {
    elements.spritesheetList.innerHTML = `<p class="muted">No generated spritesheets yet.</p>`;
    return;
  }

  elements.spritesheetList.innerHTML = state.spritesheets
    .map(
      (sheet) => `
        <article class="result-card" data-spritesheet-id="${escapeHtml(sheet.id)}">
          <div class="result-card__header">
            <div>
              <h3>${escapeHtml(sheet.name)}</h3>
              <p class="muted">${sheet.frameCount} frames · ${sheet.frameWidth}px · ${sheet.columns} columns</p>
            </div>
            <span class="${statusClass(sheet.status)}">${escapeHtml(sheet.status)}</span>
          </div>
          <img src="${escapeHtml(sheet.sheetUrl)}" alt="${escapeHtml(sheet.name)} spritesheet preview" />
          <div class="result-card__links">
            <button class="button button--primary" type="button" data-preview-id="${escapeHtml(sheet.id)}">Preview</button>
            <a class="link-chip" href="${escapeHtml(sheet.sheetUrl)}" download>PNG spritesheet</a>
            <a class="link-chip" href="${escapeHtml(sheet.atlasUrl)}" download>JSON atlas</a>
          </div>
        </article>
      `,
    )
    .join("");
}

function renderPreviewControls() {
  const hasPreview = Boolean(state.activePreview && state.previewAtlas);
  const frameCount = hasPreview ? state.previewAtlas.frames.length : 0;
  const maxIndex = Math.max(frameCount - 1, 0);

  elements.previewRangeStart.max = String(maxIndex);
  elements.previewRangeEnd.max = String(maxIndex);
  elements.previewRangeStart.disabled = !hasPreview;
  elements.previewRangeEnd.disabled = !hasPreview;
  elements.previewFps.disabled = !hasPreview;
  elements.previewToExports.disabled = !stageIsAccessible("spritesheets");

  if (!hasPreview) {
    elements.previewRangeStart.value = "0";
    elements.previewRangeEnd.value = "0";
    elements.previewLoopReadout.textContent = "Frames 0 to 0";
    elements.previewFpsReadout.textContent = `${state.previewFps} FPS`;
    return;
  }

  const loopStart = Math.min(state.previewLoopStart, state.previewLoopEnd);
  const loopEnd = Math.max(state.previewLoopStart, state.previewLoopEnd);

  elements.previewRangeStart.value = String(loopStart);
  elements.previewRangeEnd.value = String(loopEnd);
  elements.previewFps.value = String(state.previewFps);
  elements.previewLoopReadout.textContent = `Frames ${loopStart} to ${loopEnd}`;
  elements.previewFpsReadout.textContent = `${state.previewFps} FPS`;
}

function renderStageShell() {
  ensureAccessibleStage();
  renderWorkspaceHeader();
  renderAnalysisCard(state.selectedCharacter);

  for (const tab of elements.stageTabs) {
    const stage = tab.dataset.stage;
    const isActive = stage === state.currentStage;
    const isAccessible = stageIsAccessible(stage);

    tab.classList.toggle("is-active", isActive);
    tab.classList.toggle("is-locked", !isAccessible);
    tab.disabled = !isAccessible;
  }

  for (const panel of elements.stagePanels) {
    const isActive = panel.dataset.stagePanel === state.currentStage;
    panel.classList.toggle("hidden", !isActive);
    panel.hidden = !isActive;
  }

  renderPreviewControls();

  if (state.currentStage === "preview" && state.spritesheets.length > 0 && !state.activePreview) {
    void loadPreview(state.spritesheets[0].id);
  }
}

function stopPolling() {
  if (state.pollTimer) {
    window.clearInterval(state.pollTimer);
    state.pollTimer = null;
  }
}

async function refreshPollingState() {
  if (!state.selectedCharacterId) {
    return;
  }

  await Promise.all([loadJobs(state.selectedCharacterId), loadSpritesheets(state.selectedCharacterId)]);
  if (activeJobCount() === 0) {
    stopPolling();
  }
}

function startPolling() {
  stopPolling();
  state.pollTimer = window.setInterval(() => {
    void refreshPollingState().catch((error) => {
      stopPolling();
      setMessage(elements.generateMessage, error.message, true);
    });
  }, 1200);
}

async function loadHealth() {
  const payload = await fetchJson("/api/health");
  state.generationBackend = payload.generationBackend || "unknown";
  renderAuthState();
  updateCustomFormState();
}

async function verifyNetaToken() {
  if (state.generationBackend !== "neta") {
    state.netaUser = null;
    renderAuthState();
    setMessage(elements.authMessage, "Token is not required with the current backend.");
    return;
  }

  if (!state.netaToken) {
    state.netaUser = null;
    renderAuthState();
    setMessage(elements.authMessage, "Paste a token first.", true);
    return;
  }

  setMessage(elements.authMessage, "Checking token...");
  try {
    const payload = await fetchJson("/api/neta/me");
    state.netaUser = payload.user || null;
    renderAuthState();
    updateCustomFormState();
    setMessage(elements.authMessage, "Token connected.");
  } catch (error) {
    state.netaUser = null;
    renderAuthState();
    updateCustomFormState();
    setMessage(elements.authMessage, error.message, true);
  }
}

async function loadCharacters() {
  const payload = await fetchJson("/api/characters");
  state.characters = payload.characters;
  renderCharacters();
  renderWorkspaceSummary();

  if (!state.selectedCharacterId && state.characters.length > 0) {
    await selectCharacter(state.characters[0].id);
  }
}

async function loadSupportedActions() {
  const payload = await fetchJson("/api/supported-actions");
  state.supportedActions = payload.actions;
  renderActionList();
}

async function selectCharacter(characterId) {
  state.selectedCharacterId = characterId;
  state.selectedCharacter = await fetchJson(`/api/characters/${characterId}`);
  state.poses = [];
  state.customAnimations = [];
  state.spritesheets = [];
  state.jobs = [];
  state.selectedStandardActionIds = [];
  state.selectedCustomActionIds = [];
  state.pendingPreview = null;
  resetPreview("Loading current character results...");
  clearBuildMessages();

  renderAnalysisCard(state.selectedCharacter);
  renderWorkspaceSummary();
  renderCharacters();
  renderPoses();
  renderCustomAnimations();
  renderAllJobLists();
  renderPreviewPickers();
  renderSpritesheets();
  renderActionList();

  await Promise.all([
    loadPoses(characterId),
    loadCustomAnimations(characterId),
    loadSpritesheets(characterId),
    loadJobs(characterId),
  ]);

  renderActionList();
  setAnimatePanel("select");
  setStage("animate", { force: true });

  if (activeJobCount() > 0) {
    startPolling();
  } else {
    stopPolling();
  }
}

async function loadPoses(characterId) {
  const payload = await fetchJson(`/api/characters/${characterId}/poses`);
  state.poses = payload.poses;
  renderPoses();
  renderWorkspaceSummary();
  updateCustomPoseOptions();
  updateCustomFormState();
}

async function loadCustomAnimations(characterId) {
  const payload = await fetchJson(`/api/characters/${characterId}/custom-animations`);
  state.customAnimations = payload.customAnimations;
  renderCustomAnimations();
  renderWorkspaceSummary();
  renderActionList();
}

async function loadSpritesheets(characterId) {
  const payload = await fetchJson(`/api/characters/${characterId}/spritesheets`);
  state.spritesheets = payload.spritesheets;
  renderPreviewPickers();
  renderSpritesheets();
  renderWorkspaceSummary();
  renderStageShell();

  if (state.spritesheets.length === 0) {
    resetPreview(activeJobCount() > 0 ? "Waiting for the first generated result." : "No generated result yet.");
    return;
  }

  if (state.pendingPreview) {
    const pendingSheet = state.pendingPreview.sheetId
      ? state.spritesheets.find((sheet) => sheet.id === state.pendingPreview.sheetId)
      : null;

    if (pendingSheet) {
      state.pendingPreview = null;
      await loadPreview(pendingSheet.id);
      return;
    }
  }

  if (!state.activePreview || !state.spritesheets.some((sheet) => sheet.id === state.activePreview.id)) {
    await loadPreview(state.spritesheets[0].id);
  }
}

async function loadJobs(characterId) {
  const payload = await fetchJson(`/api/jobs?characterId=${encodeURIComponent(characterId)}`);
  state.jobs = payload.jobs;

  if (state.pendingPreview?.jobId) {
    const matchedJob = state.jobs.find((job) => job.id === state.pendingPreview.jobId || job.jobId === state.pendingPreview.jobId);
    if (matchedJob?.resultIds?.[0]) {
      state.pendingPreview.sheetId = matchedJob.resultIds[0];
    }
  }

  renderAllJobLists();
  renderWorkspaceHeader();
  renderPreviewPickers();
  renderStageShell();
}

function stopPreviewLoop() {
  if (state.previewTimer) {
    cancelAnimationFrame(state.previewTimer);
    state.previewTimer = null;
  }
}

function drawCurrentPreviewFrame() {
  if (!state.previewSheetImage || !state.previewAtlas || !state.activePreview) {
    previewContext.clearRect(0, 0, elements.previewCanvas.width, elements.previewCanvas.height);
    return;
  }

  const frame = state.previewAtlas.frames[state.previewFrameIndex];
  if (!frame) {
    return;
  }

  const { frame: source } = frame;
  previewContext.clearRect(0, 0, elements.previewCanvas.width, elements.previewCanvas.height);
  previewContext.drawImage(
    state.previewSheetImage,
    source.x,
    source.y,
    source.w,
    source.h,
    0,
    0,
    elements.previewCanvas.width,
    elements.previewCanvas.height,
  );
}

function resetPreview(message = "No generated result yet.") {
  stopPreviewLoop();
  state.activePreview = null;
  state.previewSheetImage = null;
  state.previewAtlas = null;
  state.previewLoopStart = 0;
  state.previewLoopEnd = 0;
  state.previewFrameIndex = 0;
  state.previewLastTick = 0;
  previewContext.clearRect(0, 0, elements.previewCanvas.width, elements.previewCanvas.height);
  elements.previewMeta.innerHTML = `<p class="muted">${escapeHtml(message)}</p>`;
  renderPreviewControls();
  renderPreviewPickers();
}

function drawPreviewFrame(timestamp) {
  if (!state.previewSheetImage || !state.previewAtlas || !state.activePreview) {
    return;
  }

  const loopStart = Math.min(state.previewLoopStart, state.previewLoopEnd);
  const loopEnd = Math.max(state.previewLoopStart, state.previewLoopEnd);
  const stepMs = 1000 / state.previewFps;

  if (state.previewLastTick === 0) {
    state.previewLastTick = timestamp;
    state.previewFrameIndex = loopStart;
  } else if (timestamp - state.previewLastTick >= stepMs) {
    state.previewLastTick = timestamp;
    state.previewFrameIndex = state.previewFrameIndex >= loopEnd ? loopStart : state.previewFrameIndex + 1;
  }

  drawCurrentPreviewFrame();
  state.previewTimer = requestAnimationFrame(drawPreviewFrame);
}

async function loadPreview(spritesheetId) {
  const detail = await fetchJson(`/api/spritesheets/${spritesheetId}`);
  const atlas = await fetchJson(detail.atlasUrl);
  const image = new Image();

  await new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = () => reject(new Error("Could not load spritesheet image."));
    image.src = detail.sheetUrl;
  });

  state.activePreview = detail;
  state.previewSheetImage = image;
  state.previewAtlas = atlas;
  state.previewLoopStart = 0;
  state.previewLoopEnd = Math.max(atlas.frames.length - 1, 0);
  state.previewFrameIndex = 0;
  state.previewLastTick = 0;

  elements.previewMeta.innerHTML = `
    <h3>${escapeHtml(detail.name)}</h3>
    <p class="muted">${detail.frameCount} frames · ${detail.frameWidth}px · ${atlas.meta.loop ? "loop" : "one-shot"}</p>
    <p class="muted">${detail.columns} columns · ${detail.rows} rows</p>
  `;

  renderPreviewPickers();
  renderPreviewControls();
  stopPreviewLoop();
  state.previewTimer = requestAnimationFrame(drawPreviewFrame);
}

function syncActionSelectionsFromForm() {
  state.selectedStandardActionIds = Array.from(
    elements.generateForm.querySelectorAll("input[name='action-standard']:checked"),
  ).map((input) => input.value);
  state.selectedCustomActionIds = Array.from(
    elements.generateForm.querySelectorAll("input[name='action-custom']:checked"),
  ).map((input) => input.value);
  renderGenerateSummary();
  renderWorkspaceHeader();
}

function updatePreviewLoopFromInputs(changedEdge) {
  if (!state.activePreview || !state.previewAtlas) {
    return;
  }

  const start = Number(elements.previewRangeStart.value);
  const end = Number(elements.previewRangeEnd.value);

  if (changedEdge === "start" && start > end) {
    elements.previewRangeEnd.value = String(start);
  }

  if (changedEdge === "end" && end < start) {
    elements.previewRangeStart.value = String(end);
  }

  state.previewLoopStart = Number(elements.previewRangeStart.value);
  state.previewLoopEnd = Number(elements.previewRangeEnd.value);
  state.previewFrameIndex = Math.min(state.previewLoopStart, state.previewLoopEnd);
  state.previewLastTick = 0;
  renderPreviewControls();
  drawCurrentPreviewFrame();
}

document.addEventListener("click", (event) => {
  const stageButton = event.target.closest(".stage-tab[data-stage]");
  if (stageButton) {
    setStage(stageButton.dataset.stage);
    return;
  }

  const animateButton = event.target.closest(".animate-subtab[data-animate-panel]");
  if (animateButton) {
    setAnimatePanel(animateButton.dataset.animatePanel);
    return;
  }

  const previewButton = event.target.closest("[data-preview-id]");
  if (previewButton) {
    setStage("preview");
    void loadPreview(previewButton.dataset.previewId);
    return;
  }

  const characterCard = event.target.closest(".character-card[data-character-id]");
  if (characterCard) {
    void selectCharacter(characterCard.dataset.characterId);
    return;
  }

  if (elements.newCharacterButton && event.target.closest("#new-character-button")) {
    setStage("character", { force: true });
    return;
  }

  if (elements.previewToExports && event.target.closest("#preview-to-exports")) {
    setStage("spritesheets");
  }
});

elements.generateForm.addEventListener("change", (event) => {
  const input = event.target;
  if (!(input instanceof HTMLInputElement)) {
    return;
  }

  if (input.name === "action-standard" || input.name === "action-custom") {
    syncActionSelectionsFromForm();
  }
});

elements.previewRangeStart.addEventListener("input", () => {
  updatePreviewLoopFromInputs("start");
});

elements.previewRangeEnd.addEventListener("input", () => {
  updatePreviewLoopFromInputs("end");
});

elements.previewFps.addEventListener("input", () => {
  state.previewFps = Number(elements.previewFps.value);
  renderPreviewControls();
});

elements.createForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(elements.createForm);
  formData.set("isHumanoid", String(document.querySelector("#is-humanoid").checked));
  setMessage(elements.createMessage, "Creating character...");

  try {
    const created = await fetchJson("/api/characters", {
      method: "POST",
      body: formData,
    });
    elements.createForm.reset();
    document.querySelector("#is-humanoid").checked = true;
    setMessage(elements.createMessage, `Created ${created.name}.`);
    await loadCharacters();
    await selectCharacter(created.id);
  } catch (error) {
    setMessage(elements.createMessage, error.message, true);
  }
});

elements.authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  state.netaToken = elements.authToken.value.trim();
  state.netaUser = null;

  if (state.netaToken) {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, state.netaToken);
  } else {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  }

  renderAuthState();
  updateCustomFormState();
  await verifyNetaToken();
});

elements.poseForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!state.selectedCharacterId) {
    return;
  }

  const payload = new FormData(elements.poseForm);
  setMessage(elements.poseMessage, "Creating pose...");

  try {
    const pose = await fetchJson(`/api/characters/${state.selectedCharacterId}/poses`, {
      method: "POST",
      body: payload,
    });
    elements.poseForm.reset();
    setMessage(elements.poseMessage, "Pose created.");
    await loadPoses(state.selectedCharacterId);
    if (elements.customMode.value !== "auto" && !elements.customFirstPose.value) {
      elements.customFirstPose.value = pose.id;
    }
    await loadCustomAnimations(state.selectedCharacterId);
  } catch (error) {
    setMessage(elements.poseMessage, error.message, true);
  }
});

elements.customMode.addEventListener("change", () => {
  updateCustomFormState();
});

elements.customLoop.addEventListener("change", () => {
  updateCustomFormState();
});

elements.customForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!state.selectedCharacterId) {
    return;
  }

  const payload = {
    name: elements.customForm.querySelector("#custom-name").value.trim(),
    prompt: elements.customForm.querySelector("#custom-prompt").value.trim(),
    mode: elements.customMode.value,
    loop: elements.customLoop.checked,
  };

  const firstPoseId = elements.customFirstPose.value.trim();
  const lastPoseId = elements.customLastPose.value.trim();
  if (!elements.customFirstPose.disabled && firstPoseId) {
    payload.poseId = firstPoseId;
  }
  if (!elements.customLastPose.disabled && lastPoseId) {
    payload.lastFramePoseId = lastPoseId;
  }

  setMessage(elements.customMessage, "Saving custom action...");

  try {
    const created = await fetchJson(`/api/characters/${state.selectedCharacterId}/custom-animations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    elements.customForm.reset();
    elements.customMode.value = "auto";
    elements.customLoop.checked = false;
    setMessage(elements.customMessage, "Custom action saved.");
    await loadCustomAnimations(state.selectedCharacterId);
    state.selectedCustomActionIds = [created.id];
    renderActionList();
    updateCustomFormState();
    setAnimatePanel("select");
  } catch (error) {
    setMessage(elements.customMessage, error.message, true);
  }
});

elements.generateForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!state.selectedCharacterId) {
    return;
  }

  const animations = [
    ...state.selectedStandardActionIds,
    ...state.selectedCustomActionIds.map((customAnimationId) => ({
      kind: "custom",
      customAnimationId,
    })),
  ];

  if (animations.length === 0) {
    setMessage(elements.generateMessage, "Pick at least one standard or custom action.", true);
    return;
  }

  setMessage(elements.generateMessage, "Submitting generation jobs...");
  try {
    const response = await fetchJson(`/api/characters/${state.selectedCharacterId}/spritesheets`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        animations,
      }),
    });
    state.pendingPreview = response.workflows[0]
      ? {
          jobId: response.workflows[0].jobId,
          sheetId: null,
        }
      : null;
    setMessage(elements.generateMessage, `Generation started for ${pluralize(response.workflows.length, "motion")}.`);
    await loadJobs(state.selectedCharacterId);
    setStage("preview", { force: true });
    startPolling();
  } catch (error) {
    setMessage(elements.generateMessage, error.message, true);
  }
});

async function boot() {
  state.netaToken = window.localStorage.getItem(TOKEN_STORAGE_KEY) || "";
  elements.authToken.value = state.netaToken;
  updateCustomPoseOptions();
  renderAuthState();
  renderWorkspaceSummary();
  renderAllJobLists();
  renderPreviewPickers();
  renderSpritesheets();
  renderActionList();
  renderStageShell();
  setAnimatePanel("select");
  updateCustomFormState();

  await Promise.all([loadHealth(), loadSupportedActions(), loadCharacters()]);

  if (state.generationBackend === "neta" && state.netaToken) {
    await verifyNetaToken();
  }
}

void boot();
