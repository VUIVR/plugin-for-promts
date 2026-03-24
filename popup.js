const MAX_SAVED_PROMPTS = 5;

const stateKey = "promptBuilderState";
const savedKey = "savedPrompts";

const els = {
  tabEditorBtn: document.getElementById("tabEditorBtn"),
  tabSavedBtn: document.getElementById("tabSavedBtn"),
  tabEditor: document.getElementById("tabEditor"),
  tabSaved: document.getElementById("tabSaved"),
  title: document.getElementById("title"),
  role: document.getElementById("role"),
  task: document.getElementById("task"),
  context: document.getElementById("context"),
  successCriteria: document.getElementById("successCriteria"),
  example: document.getElementById("example"),
  audience: document.getElementById("audience"),
  priority: document.getElementById("priority"),
  validation: document.getElementById("validation"),
  constrains: document.getElementById("constrains"),
  output: document.getElementById("output"),
  copyBtn: document.getElementById("copyBtn"),
  saveBtn: document.getElementById("saveBtn"),
  editorStatus: document.getElementById("editorStatus"),
  savedList: document.getElementById("savedList"),
  savedStatus: document.getElementById("savedStatus"),
  previewModal: document.getElementById("previewModal"),
  previewContent: document.getElementById("previewContent"),
  previewCopyBtn: document.getElementById("previewCopyBtn"),
  previewEditBtn: document.getElementById("previewEditBtn"),
  previewCloseBtn: document.getElementById("previewCloseBtn"),
};

let activeTab = "editor";
let savedPrompts = [];
const statusTimers = new Map();
let currentPreviewText = "";
let currentPreviewPrompt = null;

function getCurrentFormState() {
  return {
    activeTab,
    title: els.title.value.trim(),
    role: els.role.value,
    task: els.task.value,
    context: els.context.value,
    successCriteria: els.successCriteria.value,
    example: els.example.value,
    audience: els.audience.value,
    priority: els.priority.value,
    validation: els.validation.checked,
    constrains: els.constrains.value,
    output: els.output.value,
  };
}

function buildPromptText(state, options = {}) {
  const { includeTitle = true } = options;
  const blocks = [];

  if (includeTitle && state.title) {
    blocks.push(`Тема запроса: ${state.title}`);
  }

  const sections = [
    { tag: "role", value: state.role },
    { tag: "task", value: state.task },
    { tag: "context", value: state.context },
    { tag: "success_criteria", value: state.successCriteria },
    { tag: "example", value: state.example },
    { tag: "audience", value: state.audience },
    { tag: "priority", value: state.priority },
    { tag: "constrains", value: state.constrains },
    { tag: "output", value: state.output },
  ];

  sections.forEach((section) => {
    const trimmed = (section.value || "").trim();
    if (!trimmed) return;
    blocks.push(`<${section.tag}>\n${trimmed}\n</${section.tag}>`);
  });

  if (state.validation === true) {
    blocks.push("<validation>\ntrue\n</validation>");
  }

  return blocks.join("\n\n");
}

function showPromptPreview(prompt) {
  currentPreviewPrompt = prompt;
  currentPreviewText = buildPromptText(prompt);
  els.previewContent.textContent = currentPreviewText || "Промт пустой.";
  els.previewModal.classList.add("active");
}

function closePromptPreview() {
  els.previewModal.classList.remove("active");
}

async function copyPreviewPrompt() {
  try {
    const textToCopy = currentPreviewPrompt
      ? buildPromptText(currentPreviewPrompt, { includeTitle: false })
      : "";
    await navigator.clipboard.writeText(textToCopy);
    setStatus(els.savedStatus, "Промт сохранен в память.", "success", 10000);
    closePromptPreview();
  } catch (error) {
    setStatus(els.savedStatus, "Не удалось сохранить промт в память.", "error", 10000);
  }
}

function loadPromptIntoEditor(prompt) {
  els.title.value = prompt.title || "";
  els.role.value = prompt.role || "";
  els.task.value = prompt.task || "";
  els.context.value = prompt.context || "";
  els.successCriteria.value = prompt.successCriteria || "";
  els.example.value = prompt.example || "";
  els.audience.value = prompt.audience || "";
  els.priority.value = prompt.priority || "";
  els.validation.checked = Boolean(prompt.validation);
  els.constrains.value = prompt.constrains || "";
  els.output.value = prompt.output || "";

  openTab("editor");
  saveFormState();
  setStatus(els.editorStatus, "Промт открыт для редактирования.", "success", 10000);
}

function editPreviewPrompt() {
  if (!currentPreviewPrompt) return;
  loadPromptIntoEditor(currentPreviewPrompt);
  closePromptPreview();
}

async function saveFormState() {
  await chrome.storage.local.set({
    [stateKey]: getCurrentFormState(),
  });
}

function setStatus(el, text, type = "", autoHideMs = 0) {
  if (statusTimers.has(el)) {
    clearTimeout(statusTimers.get(el));
    statusTimers.delete(el);
  }

  el.textContent = text;
  el.className = `status ${type}`.trim();

  if (autoHideMs > 0 && text) {
    const timer = setTimeout(() => {
      el.textContent = "";
      el.className = "status";
      statusTimers.delete(el);
    }, autoHideMs);
    statusTimers.set(el, timer);
  }
}

function openTab(tabName) {
  activeTab = tabName;
  const isEditor = tabName === "editor";

  els.tabEditor.classList.toggle("active", isEditor);
  els.tabSaved.classList.toggle("active", !isEditor);
  els.tabEditorBtn.classList.toggle("active", isEditor);
  els.tabSavedBtn.classList.toggle("active", !isEditor);

  saveFormState();
}

function renderSavedPrompts() {
  els.savedList.innerHTML = "";

  if (savedPrompts.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "Сохраненных промтов пока нет.";
    els.savedList.appendChild(empty);
  } else {
    savedPrompts.forEach((item) => {
      const row = document.createElement("div");
      row.className = "saved-item";

      const info = document.createElement("div");
      const title = document.createElement("h4");
      title.className = "saved-title";
      title.textContent = item.title;
      const meta = document.createElement("p");
      meta.className = "saved-meta";
      meta.textContent = new Date(item.savedAt).toLocaleString("ru-RU");
      info.appendChild(title);
      info.appendChild(meta);

      const actions = document.createElement("div");
      actions.className = "saved-actions";

      const viewBtn = document.createElement("button");
      viewBtn.className = "icon-btn";
      viewBtn.type = "button";
      viewBtn.title = "Просмотреть";
      viewBtn.textContent = "👁";
      viewBtn.addEventListener("click", () => {
        showPromptPreview(item);
      });

      const editBtn = document.createElement("button");
      editBtn.className = "icon-btn";
      editBtn.type = "button";
      editBtn.title = "Редактировать";
      editBtn.textContent = "✏";
      editBtn.addEventListener("click", () => {
        loadPromptIntoEditor(item);
      });

      const deleteBtn = document.createElement("button");
      deleteBtn.className = "icon-btn delete";
      deleteBtn.type = "button";
      deleteBtn.title = "Удалить";
      deleteBtn.textContent = "🗑";
      deleteBtn.addEventListener("click", async () => {
        savedPrompts = savedPrompts.filter((p) => p.id !== item.id);
        await chrome.storage.local.set({ [savedKey]: savedPrompts });
        renderSavedPrompts();
        updateSaveLimitStatus();
      });

      actions.appendChild(viewBtn);
      actions.appendChild(editBtn);
      actions.appendChild(deleteBtn);
      row.appendChild(info);
      row.appendChild(actions);
      els.savedList.appendChild(row);
    });
  }

  updateSaveLimitStatus();
}

function updateSaveLimitStatus() {
  const hasLimit = savedPrompts.length >= MAX_SAVED_PROMPTS;
  els.saveBtn.disabled = hasLimit;

  if (hasLimit) {
    setStatus(
      els.editorStatus,
      `Сохранение недоступно: достигнут лимит ${MAX_SAVED_PROMPTS} промтов.`,
      "error",
      10000
    );
  } else if (els.editorStatus.textContent.includes("достигнут лимит")) {
    setStatus(els.editorStatus, "");
  }

  setStatus(
    els.savedStatus,
    `Сохранено промтов: ${savedPrompts.length}/${MAX_SAVED_PROMPTS}`
  );
}

async function init() {
  const data = await chrome.storage.local.get([stateKey, savedKey]);
  const savedState = data[stateKey] || {};

  savedPrompts = Array.isArray(data[savedKey]) ? data[savedKey] : [];

  els.title.value = savedState.title || "";
  els.role.value = savedState.role || "";
  els.task.value = savedState.task || "";
  els.context.value = savedState.context || "";
  els.successCriteria.value = savedState.successCriteria || "";
  els.example.value = savedState.example || "";
  els.audience.value = savedState.audience || "";
  els.priority.value = savedState.priority || "";
  els.validation.checked = Boolean(savedState.validation);
  els.constrains.value = savedState.constrains || "";
  els.output.value = savedState.output || "";

  openTab(savedState.activeTab === "saved" ? "saved" : "editor");
  renderSavedPrompts();
}

async function copyPrompt() {
  const text = buildPromptText(getCurrentFormState(), { includeTitle: false });
  try {
    await navigator.clipboard.writeText(text);
    setStatus(els.editorStatus, "Промт скопирован в буфер обмена.", "success", 10000);
  } catch (error) {
    setStatus(els.editorStatus, "Не удалось скопировать промт.", "error", 10000);
  }
}

async function savePrompt() {
  const title = els.title.value.trim();
  if (!title) {
    setStatus(
      els.editorStatus,
      "Для сохранения обязательно укажите тему запроса (название).",
      "error",
      10000
    );
    return;
  }

  const current = getCurrentFormState();
  const normalizedTitle = title.toLowerCase();
  const existingIndex = savedPrompts.findIndex(
    (item) => (item.title || "").trim().toLowerCase() === normalizedTitle
  );

  if (existingIndex !== -1) {
    const existingPrompt = savedPrompts[existingIndex];
    const updatedPrompt = {
      ...existingPrompt,
      savedAt: Date.now(),
      title,
      role: current.role,
      task: current.task,
      context: current.context,
      successCriteria: current.successCriteria,
      example: current.example,
      audience: current.audience,
      priority: current.priority,
      validation: current.validation,
      constrains: current.constrains,
      output: current.output,
    };

    savedPrompts.splice(existingIndex, 1);
    savedPrompts.unshift(updatedPrompt);
    await chrome.storage.local.set({ [savedKey]: savedPrompts });
    await saveFormState();
    renderSavedPrompts();
    setStatus(els.editorStatus, "Промт с таким названием перезаписан.", "success", 10000);
    return;
  }

  if (savedPrompts.length >= MAX_SAVED_PROMPTS) {
    updateSaveLimitStatus();
    return;
  }

  const prompt = {
    id: crypto.randomUUID(),
    savedAt: Date.now(),
    title,
    role: current.role,
    task: current.task,
    context: current.context,
    successCriteria: current.successCriteria,
    example: current.example,
    audience: current.audience,
    priority: current.priority,
    validation: current.validation,
    constrains: current.constrains,
    output: current.output,
  };

  savedPrompts = [prompt, ...savedPrompts];
  await chrome.storage.local.set({ [savedKey]: savedPrompts });
  await saveFormState();

  renderSavedPrompts();
  setStatus(els.editorStatus, "Промт успешно сохранен.", "success", 10000);
}

const textFieldsToPersist = [
  els.title,
  els.role,
  els.task,
  els.context,
  els.successCriteria,
  els.example,
  els.audience,
  els.constrains,
  els.output,
];

textFieldsToPersist.forEach((el) => {
  el.addEventListener("input", () => {
    saveFormState();
  });
});

[els.priority, els.validation].forEach((el) => {
  el.addEventListener("change", () => {
    saveFormState();
  });
});

els.tabEditorBtn.addEventListener("click", () => openTab("editor"));
els.tabSavedBtn.addEventListener("click", () => openTab("saved"));

els.copyBtn.addEventListener("click", copyPrompt);
els.saveBtn.addEventListener("click", savePrompt);
els.previewCloseBtn.addEventListener("click", closePromptPreview);
els.previewCopyBtn.addEventListener("click", copyPreviewPrompt);
els.previewEditBtn.addEventListener("click", editPreviewPrompt);
els.previewModal.addEventListener("click", (event) => {
  if (event.target === els.previewModal) {
    closePromptPreview();
  }
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && els.previewModal.classList.contains("active")) {
    closePromptPreview();
  }
});

init();
