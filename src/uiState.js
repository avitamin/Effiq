import { validateBranchForm, validateReviewForm } from "./validation.js";

export function reviewControls(form) {
  const validation = validateReviewForm(form);
  return {
    baseEnabled: form.scopeMode === "base",
    commitEnabled: form.scopeMode === "commit",
    previewEnabled: validation.ok,
    runEnabled: validation.ok && !form.dryRun,
    blockedReason: validation.reason,
  };
}

export function branchControls(form) {
  const validation = validateBranchForm(form);
  return {
    queryEnabled: form.selectorMode === "query",
    branchEnabled: form.selectorMode === "branch",
    searchEnabled: validation.ok,
    checkoutEnabled: validation.ok && form.checkout,
    blockedReason: validation.reason,
  };
}

export function defaultBaseForRepo(repo) {
  return repo === "effiq" ? "main" : "develop";
}
