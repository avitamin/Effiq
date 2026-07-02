#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage: run-codex-review.sh [--repo effiq|backend|frontend|all] [--backend-path PATH] [--frontend-path PATH] [--base BRANCH | --uncommitted | --commit SHA] [--out PATH] [--title TITLE] [--with-context] [--dry-run]

Runs a read-only Codex code review and writes the final Markdown report.

Defaults:
  --repo all
  AG CMS repos use --base develop
  Effiq uses --base main
  --out .local/code-reviews

Options:
  --repo REPO          Codex cwd target: effiq, backend, frontend, or all.
  --backend-path PATH  Backend AG CMS repository path. Relative paths resolve from Effiq root.
  --frontend-path PATH Frontend AG CMS repository path. Relative paths resolve from Effiq root.
  --base BRANCH        Review branch changes against BRANCH.
  --uncommitted        Review staged, unstaged, and untracked changes.
  --commit SHA         Review changes introduced by one commit.
  --out PATH           Write report file for a single repo, or report directory for --repo all.
  --title TITLE        Display title for the review summary.
  --with-context       Add Effiq, backend, and frontend as extra read-only roots.
  --dry-run            Print the command without running Codex.
  --help               Show this help.

Environment:
  CODEX_REVIEW_MODEL              Optional model override passed as --model.
  EFFIQ_AG_CMS_BACKEND_PATH       Backend AG CMS repository path.
  EFFIQ_AG_CMS_FRONTEND_PATH      Frontend AG CMS repository path.
USAGE
}

quote_command() {
  printf '%q' "$1"
  shift
  for arg in "$@"; do
    printf ' %q' "$arg"
  done
  printf '\n'
}

repo_root="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -z "$repo_root" ]]; then
  echo "error: run-codex-review.sh must be run inside a Git repository" >&2
  exit 2
fi

if ! command -v codex >/dev/null 2>&1; then
  echo "error: codex CLI is not available on PATH" >&2
  exit 2
fi

resolve_repo_path() {
  local path="$1"
  if [[ "$path" = /* ]]; then
    printf '%s\n' "$path"
  else
    printf '%s/%s\n' "$repo_root" "$path"
  fi
}

scope_count=0
scope_mode="base"
scope_value=""
repo_selection="all"
ag_cms_backend_path="$(resolve_repo_path "${EFFIQ_AG_CMS_BACKEND_PATH:-../agcms-laravel}")"
ag_cms_frontend_path="$(resolve_repo_path "${EFFIQ_AG_CMS_FRONTEND_PATH:-../ag-cms-ng}")"
out_path=".local/code-reviews"
out_path_set=false
title=""
dry_run=false
with_context=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo)
      [[ $# -ge 2 ]] || { echo "error: --repo requires a value" >&2; exit 2; }
      case "$2" in
        effiq|backend|frontend|all) repo_selection="$2" ;;
        *) echo "error: --repo must be one of: effiq, backend, frontend, all" >&2; exit 2 ;;
      esac
      shift 2
      ;;
    --backend-path)
      [[ $# -ge 2 ]] || { echo "error: --backend-path requires a path" >&2; exit 2; }
      ag_cms_backend_path="$(resolve_repo_path "$2")"
      shift 2
      ;;
    --frontend-path)
      [[ $# -ge 2 ]] || { echo "error: --frontend-path requires a path" >&2; exit 2; }
      ag_cms_frontend_path="$(resolve_repo_path "$2")"
      shift 2
      ;;
    --base)
      [[ $# -ge 2 ]] || { echo "error: --base requires a branch" >&2; exit 2; }
      ((scope_count += 1))
      scope_mode="base"
      scope_value="$2"
      shift 2
      ;;
    --uncommitted)
      ((scope_count += 1))
      scope_mode="uncommitted"
      scope_value=""
      shift
      ;;
    --commit)
      [[ $# -ge 2 ]] || { echo "error: --commit requires a SHA" >&2; exit 2; }
      ((scope_count += 1))
      scope_mode="commit"
      scope_value="$2"
      shift 2
      ;;
    --out)
      [[ $# -ge 2 ]] || { echo "error: --out requires a path" >&2; exit 2; }
      out_path="$2"
      out_path_set=true
      shift 2
      ;;
    --title)
      [[ $# -ge 2 ]] || { echo "error: --title requires a value" >&2; exit 2; }
      title="$2"
      shift 2
      ;;
    --dry-run)
      dry_run=true
      shift
      ;;
    --with-context)
      with_context=true
      shift
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "error: unknown argument: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

if [[ "$scope_count" -gt 1 ]]; then
  echo "error: choose only one review scope: --base, --uncommitted, or --commit" >&2
  exit 2
fi

resolve_path() {
  local path="$1"
  if [[ "$path" = /* ]]; then
    printf '%s\n' "$path"
  else
    printf '%s/%s\n' "$repo_root" "$path"
  fi
}

scope_args_for_repo() {
  local default_base="$1"
  case "$scope_mode" in
    base)
      printf '%s\n' "--base"
      printf '%s\n' "${scope_value:-$default_base}"
      ;;
    uncommitted)
      printf '%s\n' "--uncommitted"
      ;;
    commit)
      printf '%s\n' "--commit"
      printf '%s\n' "$scope_value"
      ;;
  esac
}

targets=()
case "$repo_selection" in
  all)
    targets=("backend|$ag_cms_backend_path|develop" "frontend|$ag_cms_frontend_path|develop")
    ;;
  backend)
    targets=("backend|$ag_cms_backend_path|develop")
    ;;
  frontend)
    targets=("frontend|$ag_cms_frontend_path|develop")
    ;;
  effiq)
    targets=("effiq|$repo_root|main")
    ;;
esac

required_ag_cms_paths=()
case "$repo_selection" in
  all)
    required_ag_cms_paths=("$ag_cms_backend_path" "$ag_cms_frontend_path")
    ;;
  backend)
    required_ag_cms_paths=("$ag_cms_backend_path")
    ;;
  frontend)
    required_ag_cms_paths=("$ag_cms_frontend_path")
    ;;
esac

if [[ "$with_context" == true ]]; then
  required_ag_cms_paths=("$ag_cms_backend_path" "$ag_cms_frontend_path")
fi

for context_path in "${required_ag_cms_paths[@]}"; do
  if [[ ! -d "$context_path" ]]; then
    echo "error: AG CMS context path is missing: $context_path" >&2
    exit 2
  fi
done

run_for_target() {
  local label="$1"
  local target_path="$2"
  local default_base="$3"
  local resolved_out_path
  local scope_args=()
  mapfile -t scope_args < <(scope_args_for_repo "$default_base")

  if [[ "$repo_selection" == "all" ]]; then
    resolved_out_path="$(resolve_path "$out_path")/$label.md"
  elif [[ "$out_path_set" == true ]]; then
    resolved_out_path="$(resolve_path "$out_path")"
  else
    resolved_out_path="$(resolve_path "$out_path")/$label.md"
  fi

  local cmd=(
    codex
    --cd "$target_path"
    --sandbox read-only
    --ask-for-approval never
    -c model_reasoning_effort=high
    -c model_verbosity=low
  )

  if [[ "$with_context" == true ]]; then
    cmd+=(
      --add-dir "$repo_root"
      --add-dir "$ag_cms_backend_path"
      --add-dir "$ag_cms_frontend_path"
    )
  fi

  if [[ -n "${CODEX_REVIEW_MODEL:-}" ]]; then
    cmd+=(--model "$CODEX_REVIEW_MODEL")
  fi

  cmd+=(
    exec
    review
    "${scope_args[@]}"
    --ephemeral
    -o "$resolved_out_path"
  )

  if [[ -n "$title" ]]; then
    cmd+=(--title "$title")
  fi

  if [[ "$dry_run" == true ]]; then
    quote_command "${cmd[@]}"
    return 0
  fi

  mkdir -p "$(dirname "$resolved_out_path")"
  "${cmd[@]}"
}

for target in "${targets[@]}"; do
  IFS='|' read -r label target_path default_base <<<"$target"
  run_for_target "$label" "$target_path" "$default_base"
done
