import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { branchControls, defaultBaseForRepo, reviewControls } from "./uiState.js";
import { validateBranchForm, validateReviewForm } from "./validation.js";

const reviewForm = () => ({
  repo: "effiq",
  scopeMode: "base",
  base: "main",
  commit: "",
  out: "",
  title: "",
  backendPath: "",
  frontendPath: "",
  withContext: false,
  dryRun: true,
  modelOverride: "",
});

const branchForm = () => ({
  repo: "effiq",
  selectorMode: "query",
  query: "AG-00000",
  branch: "",
  backendPath: "",
  frontendPath: "",
  fetch: false,
  checkout: false,
  dryRun: true,
});

describe("review form validation", () => {
  it("allows the default dry-run review state", () => {
    assert.deepEqual(validateReviewForm(reviewForm()), { ok: true, reason: null });
  });

  it("blocks branch scope without a base branch", () => {
    const form = reviewForm();
    form.base = "";
    assert.deepEqual(validateReviewForm(form), {
      ok: false,
      reason: "Base branch is required for branch scope.",
    });
  });

  it("blocks commit scope without a commit SHA", () => {
    const form = reviewForm();
    form.scopeMode = "commit";
    assert.deepEqual(validateReviewForm(form), {
      ok: false,
      reason: "Commit SHA is required for commit scope.",
    });
  });
});

describe("branch form validation", () => {
  it("allows search-only dry-run branch lookup", () => {
    assert.deepEqual(validateBranchForm(branchForm()), { ok: true, reason: null });
  });

  it("blocks query mode without a query", () => {
    const form = branchForm();
    form.query = "";
    assert.deepEqual(validateBranchForm(form), {
      ok: false,
      reason: "Query is required for branch search.",
    });
  });

  it("blocks branch mode without an exact branch", () => {
    const form = branchForm();
    form.selectorMode = "branch";
    assert.deepEqual(validateBranchForm(form), {
      ok: false,
      reason: "Exact branch is required for branch selection.",
    });
  });
});

describe("main control states", () => {
  it("keeps dry-run preview separate from actual review execution", () => {
    const form = reviewForm();
    assert.deepEqual(reviewControls(form), {
      previewEnabled: true,
      runEnabled: false,
      baseEnabled: true,
      commitEnabled: false,
      blockedReason: null,
    });

    form.dryRun = false;
    assert.equal(reviewControls(form).runEnabled, true);
  });

  it("blocks invalid review combinations before execution", () => {
    const form = reviewForm();
    form.base = "";
    assert.deepEqual(reviewControls(form), {
      previewEnabled: false,
      runEnabled: false,
      baseEnabled: true,
      commitEnabled: false,
      blockedReason: "Base branch is required for branch scope.",
    });
  });

  it("requires a deliberate checkout action for branch execution", () => {
    const form = branchForm();
    assert.deepEqual(branchControls(form), {
      queryEnabled: true,
      branchEnabled: false,
      searchEnabled: true,
      checkoutEnabled: false,
      blockedReason: null,
    });

    form.checkout = true;
    assert.equal(branchControls(form).checkoutEnabled, true);
  });

  it("keeps Effiq base branch default distinct from AG CMS defaults", () => {
    assert.equal(defaultBaseForRepo("effiq"), "main");
    assert.equal(defaultBaseForRepo("all"), "develop");
    assert.equal(defaultBaseForRepo("backend"), "develop");
    assert.equal(defaultBaseForRepo("frontend"), "develop");
  });
});
