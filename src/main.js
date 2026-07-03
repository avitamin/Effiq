import { listReports, previewBranch, previewReview, runBranch, runReview } from "./tauriApi.js";
import { branchControls, defaultBaseForRepo, reviewControls } from "./uiState.js";
import { checkoutConfirmationText, validateBranchForm, validateReviewForm } from "./validation.js";

const repoOptions = ["all", "backend", "frontend", "effiq"];
const scopeOptions = ["base", "uncommitted", "commit"];

const reviewState = {
  repo: "all",
  scopeMode: "base",
  base: "develop",
  commit: "",
  out: "",
  title: "",
  backendPath: "",
  frontendPath: "",
  withContext: false,
  dryRun: true,
  modelOverride: "",
};

const branchState = {
  repo: "all",
  selectorMode: "query",
  query: "",
  branch: "",
  backendPath: "",
  frontendPath: "",
  fetch: false,
  checkout: false,
  dryRun: true,
};

let activeTab = "review";
let reviewResult = null;
let branchResult = null;
let statusMessage = "Ready";
let reports = [];

const app = document.querySelector("#app");
if (!app) {
  throw new Error("Missing #app root");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function selectOptions(options, selected) {
  return options.map((value) => `<option value="${value}" ${value === selected ? "selected" : ""}>${value}</option>`).join("");
}

function checked(value) {
  return value ? "checked" : "";
}

function resultPanel(result) {
  if (!result) {
    return `<section class="output-panel"><h2>Output</h2><p class="muted">No command has run yet.</p></section>`;
  }

  const reportsHtml = result.reportPaths.length
    ? `<div class="field-row"><span>Reports</span><code>${escapeHtml(result.reportPaths.join("\n"))}</code></div>`
    : "";

  return `
    <section class="output-panel">
      <h2>Output</h2>
      <div class="result-grid">
        <div><span>Status</span><strong>${escapeHtml(result.status)}</strong></div>
        <div><span>Exit code</span><strong>${escapeHtml(result.exitCode ?? "n/a")}</strong></div>
      </div>
      <label>Command preview<textarea readonly>${escapeHtml(result.command)}</textarea></label>
      ${reportsHtml}
      <label>stdout<textarea readonly>${escapeHtml(result.stdout)}</textarea></label>
      <label>stderr<textarea readonly>${escapeHtml(result.stderr)}</textarea></label>
    </section>
  `;
}

function reviewView() {
  const validation = validateReviewForm(reviewState);
  const controls = reviewControls(reviewState);
  return `
    <section class="workflow">
      <div class="section-header">
        <h1>Codex Review Runner</h1>
        <span class="status">${escapeHtml(statusMessage)}</span>
      </div>
      <div class="control-grid">
        <label>Repository<select data-review="repo">${selectOptions(repoOptions, reviewState.repo)}</select></label>
        <label>Scope<select data-review="scopeMode">${selectOptions(scopeOptions, reviewState.scopeMode)}</select></label>
        <label>Base branch<input data-review="base" value="${escapeHtml(reviewState.base)}" ${!controls.baseEnabled ? "disabled" : ""} /></label>
        <label>Commit SHA<input data-review="commit" value="${escapeHtml(reviewState.commit)}" ${!controls.commitEnabled ? "disabled" : ""} /></label>
        <label>Output path<input data-review="out" value="${escapeHtml(reviewState.out)}" placeholder=".local/code-reviews" /></label>
        <label>Title<input data-review="title" value="${escapeHtml(reviewState.title)}" /></label>
        <label>Backend path<input data-review="backendPath" value="${escapeHtml(reviewState.backendPath)}" placeholder="../agcms-laravel" /></label>
        <label>Frontend path<input data-review="frontendPath" value="${escapeHtml(reviewState.frontendPath)}" placeholder="../ag-cms-ng" /></label>
        <label>Model override<input data-review="modelOverride" value="${escapeHtml(reviewState.modelOverride)}" placeholder="CODEX_REVIEW_MODEL" /></label>
      </div>
      <div class="toggles">
        <label><input type="checkbox" data-review="withContext" ${checked(reviewState.withContext)} /> with-context</label>
        <label><input type="checkbox" data-review="dryRun" ${checked(reviewState.dryRun)} /> dry-run</label>
      </div>
      ${validation.ok ? "" : `<p class="blocked">${escapeHtml(validation.reason)}</p>`}
      <div class="actions">
        <button data-action="preview-review" ${controls.previewEnabled ? "" : "disabled"}>Preview</button>
        <button data-action="run-review" ${controls.runEnabled ? "" : "disabled"}>Run review</button>
      </div>
    </section>
    ${resultPanel(reviewResult)}
  `;
}

function branchView() {
  const validation = validateBranchForm(branchState);
  const controls = branchControls(branchState);
  return `
    <section class="workflow">
      <div class="section-header">
        <h1>Branch Helper</h1>
        <span class="status">${escapeHtml(statusMessage)}</span>
      </div>
      <div class="control-grid">
        <label>Repository<select data-branch="repo">${selectOptions(repoOptions, branchState.repo)}</select></label>
        <label>Selector<select data-branch="selectorMode"><option value="query" ${branchState.selectorMode === "query" ? "selected" : ""}>query</option><option value="branch" ${branchState.selectorMode === "branch" ? "selected" : ""}>branch</option></select></label>
        <label>Query<input data-branch="query" value="${escapeHtml(branchState.query)}" ${!controls.queryEnabled ? "disabled" : ""} /></label>
        <label>Exact branch<input data-branch="branch" value="${escapeHtml(branchState.branch)}" ${!controls.branchEnabled ? "disabled" : ""} /></label>
        <label>Backend path<input data-branch="backendPath" value="${escapeHtml(branchState.backendPath)}" placeholder="../agcms-laravel" /></label>
        <label>Frontend path<input data-branch="frontendPath" value="${escapeHtml(branchState.frontendPath)}" placeholder="../ag-cms-ng" /></label>
      </div>
      <div class="toggles">
        <label><input type="checkbox" data-branch="fetch" ${checked(branchState.fetch)} /> fetch</label>
        <label><input type="checkbox" data-branch="dryRun" ${checked(branchState.dryRun)} /> dry-run</label>
        <label><input type="checkbox" data-branch="checkout" ${checked(branchState.checkout)} /> checkout</label>
      </div>
      ${validation.ok ? "" : `<p class="blocked">${escapeHtml(validation.reason)}</p>`}
      <div class="actions">
        <button data-action="preview-branch" ${controls.searchEnabled ? "" : "disabled"}>Search</button>
        <button data-action="run-branch" ${controls.checkoutEnabled ? "" : "disabled"}>${escapeHtml(checkoutConfirmationText(branchState))}</button>
      </div>
    </section>
    ${resultPanel(branchResult)}
  `;
}

function reportsView() {
  return `
    <section class="workflow">
      <div class="section-header">
        <h1>Reports</h1>
        <span class="status">${escapeHtml(statusMessage)}</span>
      </div>
      <div class="actions"><button data-action="refresh-reports">Refresh</button></div>
      <div class="report-list">
        ${reports.length ? reports.map((path) => `<code>${escapeHtml(path)}</code>`).join("") : `<p class="muted">No reports found under .local/code-reviews.</p>`}
      </div>
    </section>
  `;
}

function render() {
  app.innerHTML = `
    <nav class="tabs">
      <button data-tab="review" class="${activeTab === "review" ? "active" : ""}">Review</button>
      <button data-tab="branch" class="${activeTab === "branch" ? "active" : ""}">Branch</button>
      <button data-tab="reports" class="${activeTab === "reports" ? "active" : ""}">Reports</button>
    </nav>
    <main>${activeTab === "review" ? reviewView() : activeTab === "branch" ? branchView() : reportsView()}</main>
  `;
  bindEvents();
}

function bindEvents() {
  document.querySelectorAll("[data-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      activeTab = button.dataset.tab;
      render();
    });
  });

  document.querySelectorAll("[data-review]").forEach((input) => {
    input.addEventListener("input", () => {
      const value = input instanceof HTMLInputElement && input.type === "checkbox" ? input.checked : input.value;
      updateReviewState(input.dataset.review, value);
      render();
    });
  });

  document.querySelectorAll("[data-branch]").forEach((input) => {
    input.addEventListener("input", () => {
      const value = input instanceof HTMLInputElement && input.type === "checkbox" ? input.checked : input.value;
      updateBranchState(input.dataset.branch, value);
      render();
    });
  });

  document.querySelector('[data-action="preview-review"]')?.addEventListener("click", async () => execute("Previewing review", () => previewReview(reviewState), (result) => reviewResult = result));
  document.querySelector('[data-action="run-review"]')?.addEventListener("click", async () => execute("Running review", () => runReview(reviewState), (result) => reviewResult = result));
  document.querySelector('[data-action="preview-branch"]')?.addEventListener("click", async () => execute("Searching branches", () => previewBranch(branchState), (result) => branchResult = result));
  document.querySelector('[data-action="run-branch"]')?.addEventListener("click", async () => execute("Running branch action", () => runBranch(branchState), (result) => branchResult = result));
  document.querySelector('[data-action="refresh-reports"]')?.addEventListener("click", async () => {
    statusMessage = "Loading reports";
    render();
    reports = await listReports();
    statusMessage = "Ready";
    render();
  });
}

function updateReviewState(key, value) {
  if (["withContext", "dryRun"].includes(key)) {
    reviewState[key] = Boolean(value);
  } else if (key in reviewState) {
    reviewState[key] = String(value);
  }

  if (key === "repo" && reviewState.scopeMode === "base") {
    reviewState.base = defaultBaseForRepo(reviewState.repo);
  }
}

function updateBranchState(key, value) {
  if (["fetch", "checkout", "dryRun"].includes(key)) {
    branchState[key] = Boolean(value);
  } else if (key in branchState) {
    branchState[key] = String(value);
  }

  if (key === "selectorMode" && value === "query") {
    branchState.branch = "";
  }
  if (key === "selectorMode" && value === "branch") {
    branchState.query = "";
  }
}

async function execute(message, run, assign) {
  let elapsedSeconds = 0;
  statusMessage = `${message} (0s)`;
  render();
  const progressTimer = setInterval(() => {
    elapsedSeconds += 1;
    statusMessage = `${message} (${elapsedSeconds}s)`;
    render();
  }, 1000);
  try {
    assign(await run());
    statusMessage = "Ready";
  } catch (error) {
    statusMessage = error instanceof Error ? error.message : String(error);
  } finally {
    clearInterval(progressTimer);
  }
  render();
}

render();
