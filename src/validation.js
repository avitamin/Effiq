export function validateReviewForm(form) {
  if (form.scopeMode === "base" && !form.base.trim()) {
    return { ok: false, reason: "Base branch is required for branch scope." };
  }

  if (form.scopeMode === "commit" && !form.commit.trim()) {
    return { ok: false, reason: "Commit SHA is required for commit scope." };
  }

  if (form.modelOverride.trim().includes("\n")) {
    return { ok: false, reason: "Model override must be a single value." };
  }

  return { ok: true, reason: null };
}

export function validateBranchForm(form) {
  if (form.selectorMode === "query" && !form.query.trim()) {
    return { ok: false, reason: "Query is required for branch search." };
  }

  if (form.selectorMode === "branch" && !form.branch.trim()) {
    return { ok: false, reason: "Exact branch is required for branch selection." };
  }

  return { ok: true, reason: null };
}

export function checkoutConfirmationText(form) {
  const selector = form.selectorMode === "query" ? form.query : form.branch;
  return `Checkout ${selector.trim()} in ${form.repo}`;
}
