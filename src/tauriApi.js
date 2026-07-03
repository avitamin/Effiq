async function invoke(command, payload = {}) {
  const tauriInvoke = globalThis.__TAURI__?.core?.invoke;
  if (!tauriInvoke) {
    throw new Error("Tauri invoke API is unavailable. Start the app with npm run tauri dev.");
  }
  return tauriInvoke(command, payload);
}

export function previewReview(request) {
  return invoke("preview_review", { request });
}

export function runReview(request) {
  return invoke("run_review", { request });
}

export function previewBranch(request) {
  return invoke("preview_branch", { request });
}

export function runBranch(request) {
  return invoke("run_branch", { request });
}

export function listReports() {
  return invoke("list_reports");
}
