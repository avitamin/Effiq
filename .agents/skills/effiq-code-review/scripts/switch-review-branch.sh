#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage: switch-review-branch.sh [--repo effiq|backend|frontend|all] [--backend-path PATH] [--frontend-path PATH] (--query TEXT | --branch NAME) [--fetch] [--checkout] [--dry-run]

Finds review branches across Effiq and AG CMS repositories, and optionally switches to one safely.

Defaults:
  --repo all
  Search-only mode; no checkout unless --checkout is set.
  --repo all targets backend, then frontend only.

Options:
  --repo REPO          Target repository: effiq, backend, frontend, or all.
  --backend-path PATH  Backend AG CMS repository path. Relative paths resolve from Effiq root.
  --frontend-path PATH Frontend AG CMS repository path. Relative paths resolve from Effiq root.
  --query TEXT         Case-insensitive substring search over local branches and origin/*.
  --branch NAME        Exact branch selection. origin/foo is normalized to foo.
  --fetch              Run git fetch --prune origin before searching.
  --checkout           Switch to the selected branch after safety checks.
  --dry-run            Print planned git commands without fetch or checkout side effects.
  --help               Show this help.

Environment:
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
  echo "error: switch-review-branch.sh must be run inside a Git repository" >&2
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

repo_selection="all"
ag_cms_backend_path="$(resolve_repo_path "${EFFIQ_AG_CMS_BACKEND_PATH:-../agcms-laravel}")"
ag_cms_frontend_path="$(resolve_repo_path "${EFFIQ_AG_CMS_FRONTEND_PATH:-../ag-cms-ng}")"
query=""
branch=""
fetch_first=false
checkout=false
dry_run=false

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
    --query)
      [[ $# -ge 2 ]] || { echo "error: --query requires a value" >&2; exit 2; }
      query="$2"
      shift 2
      ;;
    --branch)
      [[ $# -ge 2 ]] || { echo "error: --branch requires a value" >&2; exit 2; }
      branch="${2#origin/}"
      shift 2
      ;;
    --fetch)
      fetch_first=true
      shift
      ;;
    --checkout)
      checkout=true
      shift
      ;;
    --dry-run)
      dry_run=true
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

if [[ -n "$query" && -n "$branch" ]]; then
  echo "error: choose only one branch selector: --query or --branch" >&2
  exit 2
fi

if [[ -z "$query" && -z "$branch" ]]; then
  echo "error: one branch selector is required: --query or --branch" >&2
  exit 2
fi

targets=()
case "$repo_selection" in
  all)
    targets=("backend|$ag_cms_backend_path" "frontend|$ag_cms_frontend_path")
    ;;
  backend)
    targets=("backend|$ag_cms_backend_path")
    ;;
  frontend)
    targets=("frontend|$ag_cms_frontend_path")
    ;;
  effiq)
    targets=("effiq|$repo_root")
    ;;
esac

validate_git_repo() {
  local label="$1"
  local path="$2"

  if [[ ! -d "$path" ]]; then
    echo "error: $label repository path is missing: $path" >&2
    exit 2
  fi

  if ! git -C "$path" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    echo "error: $label path is not a Git repository: $path" >&2
    exit 2
  fi
}

current_branch() {
  local path="$1"
  local current
  current="$(git -C "$path" branch --show-current)"
  if [[ -n "$current" ]]; then
    printf '%s\n' "$current"
  else
    git -C "$path" rev-parse --short HEAD
  fi
}

collect_candidates() {
  local path="$1"
  local selector="$2"
  local selector_mode="$3"
  local selector_lower="${selector,,}"
  local ref
  local short
  local -A local_refs=()
  local -A remote_refs=()
  local -A candidate_refs=()

  while IFS= read -r ref; do
    [[ -n "$ref" ]] || continue
    local_refs["$ref"]=1
  done < <(git -C "$path" for-each-ref --format='%(refname:short)' refs/heads)

  while IFS= read -r ref; do
    [[ -n "$ref" && "$ref" != "origin/HEAD" ]] || continue
    short="${ref#origin/}"
    remote_refs["$short"]=1
  done < <(git -C "$path" for-each-ref --format='%(refname:short)' refs/remotes/origin)

  for ref in "${!local_refs[@]}"; do
    case "$selector_mode" in
      branch)
        [[ "$ref" == "$selector" ]] && candidate_refs["$ref"]=1
        ;;
      query)
        [[ "${ref,,}" == *"$selector_lower"* ]] && candidate_refs["$ref"]=1
        ;;
    esac
  done

  for ref in "${!remote_refs[@]}"; do
    case "$selector_mode" in
      branch)
        [[ "$ref" == "$selector" ]] && candidate_refs["$ref"]=1
        ;;
      query)
        [[ "${ref,,}" == *"$selector_lower"* ]] && candidate_refs["$ref"]=1
        ;;
    esac
  done

  for ref in "${!candidate_refs[@]}"; do
    printf '%s|%s|%s\n' "$ref" "${local_refs[$ref]:-0}" "${remote_refs[$ref]:-0}"
  done | sort
}

print_candidates() {
  local -n candidate_lines_ref="$1"
  local line
  local name
  local is_local
  local is_remote
  local sources

  if [[ "${#candidate_lines_ref[@]}" -eq 0 ]]; then
    echo "Candidates: none"
    return
  fi

  echo "Candidates:"
  for line in "${candidate_lines_ref[@]}"; do
    IFS='|' read -r name is_local is_remote <<<"$line"
    if [[ "$is_local" == "1" && "$is_remote" == "1" ]]; then
      sources="local, remote"
    elif [[ "$is_local" == "1" ]]; then
      sources="local"
    else
      sources="remote"
    fi
    printf '  - %s [%s]\n' "$name" "$sources"
  done
}

selector_mode="query"
selector="$query"
if [[ -n "$branch" ]]; then
  selector_mode="branch"
  selector="$branch"
fi

labels=()
paths=()
currents=()
dirty_states=()
selected_branches=()
action_kinds=()
action_commands=()
repo_candidate_counts=()

has_checkout_blocker=false
has_dirty_blocker=false
index=0

for target in "${targets[@]}"; do
  IFS='|' read -r label target_path <<<"$target"
  validate_git_repo "$label" "$target_path"

  if [[ "$fetch_first" == true ]]; then
    if [[ "$dry_run" == true ]]; then
      printf 'Planned fetch for %s: ' "$label"
      quote_command git -C "$target_path" fetch --prune origin
    else
      git -C "$target_path" fetch --prune origin
    fi
  fi

  mapfile -t candidates < <(collect_candidates "$target_path" "$selector" "$selector_mode")
  current="$(current_branch "$target_path")"
  dirty_output="$(git -C "$target_path" status --porcelain)"
  dirty_state="clean"
  if [[ -n "$dirty_output" ]]; then
    dirty_state="dirty"
    has_dirty_blocker=true
  fi

  candidate_count="${#candidates[@]}"
  selected_branch=""
  action_kind="search-only"
  action_command=""

  if [[ "$candidate_count" -eq 1 ]]; then
    IFS='|' read -r selected_branch selected_local selected_remote <<<"${candidates[0]}"
    if [[ "$current" == "$selected_branch" ]]; then
      action_kind="already-current"
    elif [[ "$selected_local" == "1" ]]; then
      action_kind="switch-local"
      action_command="$(quote_command git -C "$target_path" switch "$selected_branch")"
    elif [[ "$selected_remote" == "1" ]]; then
      action_kind="track-remote"
      action_command="$(quote_command git -C "$target_path" switch --track -c "$selected_branch" "origin/$selected_branch")"
    fi
  else
    has_checkout_blocker=true
  fi

  labels[$index]="$label"
  paths[$index]="$target_path"
  currents[$index]="$current"
  dirty_states[$index]="$dirty_state"
  selected_branches[$index]="$selected_branch"
  action_kinds[$index]="$action_kind"
  action_commands[$index]="$action_command"
  repo_candidate_counts[$index]="$candidate_count"

  echo
  echo "Repository: $label"
  echo "Path: $target_path"
  echo "Current branch: $current"
  echo "State: $dirty_state"
  print_candidates candidates
  if [[ -n "$selected_branch" ]]; then
    echo "Selected branch: $selected_branch"
  else
    echo "Selected branch: none"
  fi

  case "$action_kind" in
    search-only)
      if [[ "$checkout" == true ]]; then
        echo "Action: checkout blocked; expected exactly one candidate"
      else
        echo "Action: search only; no checkout requested"
      fi
      ;;
    already-current)
      echo "Action: no-op; selected branch is already current"
      ;;
    switch-local|track-remote)
      if [[ "$checkout" == true ]]; then
        if [[ "$dry_run" == true ]]; then
          echo "Action: would run: $action_command"
        else
          echo "Action: will run: $action_command"
        fi
      else
        echo "Action: checkout available with --checkout: $action_command"
      fi
      ;;
  esac

  index=$((index + 1))
done

if [[ "$checkout" != true ]]; then
  exit 0
fi

if [[ "$has_checkout_blocker" == true ]]; then
  echo
  echo "error: checkout requires exactly one candidate in every selected repository" >&2
  for i in "${!labels[@]}"; do
    count="${repo_candidate_counts[$i]}"
    if [[ "$count" -eq 0 ]]; then
      echo "error: ${labels[$i]} has no matching branch" >&2
    elif [[ "$count" -gt 1 ]]; then
      echo "error: ${labels[$i]} has multiple matching branches" >&2
    fi
  done
  exit 1
fi

if [[ "$has_dirty_blocker" == true && "$dry_run" != true ]]; then
  echo
  echo "error: checkout blocked because at least one selected repository is dirty" >&2
  for i in "${!labels[@]}"; do
    if [[ "${dirty_states[$i]}" == "dirty" ]]; then
      echo "error: ${labels[$i]} is dirty: ${paths[$i]}" >&2
    fi
  done
  exit 1
fi

if [[ "$dry_run" == true ]]; then
  exit 0
fi

for i in "${!labels[@]}"; do
  case "${action_kinds[$i]}" in
    already-current)
      ;;
    switch-local)
      git -C "${paths[$i]}" switch "${selected_branches[$i]}"
      ;;
    track-remote)
      git -C "${paths[$i]}" switch --track -c "${selected_branches[$i]}" "origin/${selected_branches[$i]}"
      ;;
  esac
done
