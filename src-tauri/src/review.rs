use serde::{Deserialize, Serialize};
use std::{
    env, fs, io,
    path::{Path, PathBuf},
    process::Command,
};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum ReviewError {
    #[error("{0}")]
    Validation(String),
    #[error("io error: {0}")]
    Io(#[from] io::Error),
}

#[derive(Debug, Clone, Copy, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum RepoTarget {
    All,
    Backend,
    Frontend,
    Effiq,
}

#[derive(Debug, Clone, Copy, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum ScopeMode {
    Base,
    Uncommitted,
    Commit,
}

#[derive(Debug, Clone, Copy, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum BranchSelectorMode {
    Query,
    Branch,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReviewRequest {
    pub repo: RepoTarget,
    pub scope_mode: ScopeMode,
    pub base: String,
    pub commit: String,
    pub out: String,
    pub title: String,
    pub backend_path: String,
    pub frontend_path: String,
    pub with_context: bool,
    pub dry_run: bool,
    pub model_override: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BranchRequest {
    pub repo: RepoTarget,
    pub selector_mode: BranchSelectorMode,
    pub query: String,
    pub branch: String,
    pub backend_path: String,
    pub frontend_path: String,
    pub fetch: bool,
    pub checkout: bool,
    pub dry_run: bool,
}

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct CommandResult {
    pub command: String,
    pub status: CommandStatus,
    pub exit_code: Option<i32>,
    pub stdout: String,
    pub stderr: String,
    pub report_paths: Vec<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum CommandStatus {
    Success,
    Failed,
    Blocked,
    Canceled,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct BuiltCommand {
    pub program: PathBuf,
    pub args: Vec<String>,
    pub envs: Vec<(String, String)>,
    pub report_paths: Vec<PathBuf>,
}

const REVIEW_SCRIPT: &str = ".agents/skills/effiq-code-review/scripts/run-codex-review.sh";
const BRANCH_SCRIPT: &str = ".agents/skills/effiq-code-review/scripts/switch-review-branch.sh";

pub fn preview_review_command(request: ReviewRequest) -> Result<CommandResult, ReviewError> {
    let mut request = request;
    request.dry_run = true;
    let command = build_review_command(&request)?;
    Ok(blocked_preview(
        command,
        "Preview only; no review process was spawned.",
    ))
}

pub fn run_review_command(request: ReviewRequest) -> Result<CommandResult, ReviewError> {
    let command = build_review_command(&request)?;
    execute_command(command)
}

pub fn preview_branch_command(request: BranchRequest) -> Result<CommandResult, ReviewError> {
    let mut request = request;
    request.dry_run = true;
    let command = build_branch_command(&request)?;
    Ok(blocked_preview(
        command,
        "Preview only; no branch process was spawned.",
    ))
}

pub fn run_branch_command(request: BranchRequest) -> Result<CommandResult, ReviewError> {
    let command = build_branch_command(&request)?;
    execute_command(command)
}

pub fn list_report_paths() -> Result<Vec<String>, ReviewError> {
    let root = effiq_root()?;
    let report_dir = root.join(".local/code-reviews");
    if !report_dir.exists() {
        return Ok(Vec::new());
    }

    let mut paths = Vec::new();
    for entry in fs::read_dir(report_dir)? {
        let entry = entry?;
        let path = entry.path();
        if path.extension().and_then(|ext| ext.to_str()) == Some("md") {
            paths.push(path.display().to_string());
        }
    }
    paths.sort();
    Ok(paths)
}

pub fn build_review_command(request: &ReviewRequest) -> Result<BuiltCommand, ReviewError> {
    validate_review_request(request)?;
    let root = effiq_root()?;
    let script = root.join(REVIEW_SCRIPT);
    let backend_path = normalize_optional_path(&root, &request.backend_path);
    let frontend_path = normalize_optional_path(&root, &request.frontend_path);
    let out_path = normalize_optional_path(&root, &request.out);

    let mut args = vec!["--repo".to_string(), repo_arg(request.repo).to_string()];

    if let Some(path) = backend_path {
        args.extend(["--backend-path".to_string(), path.display().to_string()]);
    }
    if let Some(path) = frontend_path {
        args.extend(["--frontend-path".to_string(), path.display().to_string()]);
    }

    match request.scope_mode {
        ScopeMode::Base => args.extend(["--base".to_string(), request.base.trim().to_string()]),
        ScopeMode::Uncommitted => args.push("--uncommitted".to_string()),
        ScopeMode::Commit => {
            args.extend(["--commit".to_string(), request.commit.trim().to_string()])
        }
    }

    if let Some(path) = out_path {
        args.extend(["--out".to_string(), path.display().to_string()]);
    }
    if !request.title.trim().is_empty() {
        args.extend(["--title".to_string(), request.title.trim().to_string()]);
    }
    if request.with_context {
        args.push("--with-context".to_string());
    }
    if request.dry_run {
        args.push("--dry-run".to_string());
    }

    let envs = if request.model_override.trim().is_empty() {
        Vec::new()
    } else {
        vec![(
            "CODEX_REVIEW_MODEL".to_string(),
            request.model_override.trim().to_string(),
        )]
    };

    Ok(BuiltCommand {
        program: script,
        args,
        envs,
        report_paths: expected_report_paths(&root, request)?,
    })
}

pub fn build_branch_command(request: &BranchRequest) -> Result<BuiltCommand, ReviewError> {
    validate_branch_request(request)?;
    let root = effiq_root()?;
    let script = root.join(BRANCH_SCRIPT);
    let backend_path = normalize_optional_path(&root, &request.backend_path);
    let frontend_path = normalize_optional_path(&root, &request.frontend_path);
    let mut args = vec!["--repo".to_string(), repo_arg(request.repo).to_string()];

    if let Some(path) = backend_path {
        args.extend(["--backend-path".to_string(), path.display().to_string()]);
    }
    if let Some(path) = frontend_path {
        args.extend(["--frontend-path".to_string(), path.display().to_string()]);
    }

    match request.selector_mode {
        BranchSelectorMode::Query => {
            args.extend(["--query".to_string(), request.query.trim().to_string()])
        }
        BranchSelectorMode::Branch => {
            args.extend(["--branch".to_string(), request.branch.trim().to_string()])
        }
    }

    if request.fetch {
        args.push("--fetch".to_string());
    }
    if request.checkout {
        args.push("--checkout".to_string());
    }
    if request.dry_run {
        args.push("--dry-run".to_string());
    }

    Ok(BuiltCommand {
        program: script,
        args,
        envs: Vec::new(),
        report_paths: Vec::new(),
    })
}

fn execute_command(command: BuiltCommand) -> Result<CommandResult, ReviewError> {
    let preview = quote_command(&command);
    let mut process = Command::new(&command.program);
    process.args(&command.args);
    for (key, value) in &command.envs {
        process.env(key, value);
    }
    let output = process.output()?;
    let status = if output.status.success() {
        CommandStatus::Success
    } else {
        CommandStatus::Failed
    };

    Ok(CommandResult {
        command: preview,
        status,
        exit_code: output.status.code(),
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
        report_paths: command
            .report_paths
            .iter()
            .map(|path| path.display().to_string())
            .collect(),
    })
}

fn blocked_preview(command: BuiltCommand, message: &str) -> CommandResult {
    CommandResult {
        command: quote_command(&command),
        status: CommandStatus::Blocked,
        exit_code: None,
        stdout: message.to_string(),
        stderr: String::new(),
        report_paths: command
            .report_paths
            .iter()
            .map(|path| path.display().to_string())
            .collect(),
    }
}

fn validate_review_request(request: &ReviewRequest) -> Result<(), ReviewError> {
    let base = !request.base.trim().is_empty();
    let commit = !request.commit.trim().is_empty();
    let uncommitted = request.scope_mode == ScopeMode::Uncommitted;
    let explicit_scope_count = usize::from(base && request.scope_mode == ScopeMode::Base)
        + usize::from(commit && request.scope_mode == ScopeMode::Commit)
        + usize::from(uncommitted);

    if explicit_scope_count != 1 {
        return Err(ReviewError::Validation(
            "choose exactly one review scope: base, uncommitted, or commit".to_string(),
        ));
    }

    match request.scope_mode {
        ScopeMode::Base if !base => Err(ReviewError::Validation(
            "base branch is required for branch scope".to_string(),
        )),
        ScopeMode::Commit if !commit => Err(ReviewError::Validation(
            "commit SHA is required for commit scope".to_string(),
        )),
        _ => Ok(()),
    }?;

    validate_path_text("backend path", &request.backend_path)?;
    validate_path_text("frontend path", &request.frontend_path)?;
    validate_path_text("output path", &request.out)?;

    if request.model_override.contains(['\n', '\0']) {
        return Err(ReviewError::Validation(
            "model override must be a single value".to_string(),
        ));
    }

    Ok(())
}

fn validate_branch_request(request: &BranchRequest) -> Result<(), ReviewError> {
    let has_query = !request.query.trim().is_empty();
    let has_branch = !request.branch.trim().is_empty();

    match request.selector_mode {
        BranchSelectorMode::Query if !has_query || has_branch => {
            return Err(ReviewError::Validation(
                "choose exactly one branch selector: query or branch".to_string(),
            ));
        }
        BranchSelectorMode::Branch if !has_branch || has_query => {
            return Err(ReviewError::Validation(
                "choose exactly one branch selector: query or branch".to_string(),
            ));
        }
        _ => {}
    }

    validate_path_text("backend path", &request.backend_path)?;
    validate_path_text("frontend path", &request.frontend_path)?;
    Ok(())
}

fn validate_path_text(label: &str, value: &str) -> Result<(), ReviewError> {
    if value.contains('\0') || value.contains('\n') {
        return Err(ReviewError::Validation(format!(
            "{label} must be a single filesystem path"
        )));
    }
    Ok(())
}

fn expected_report_paths(
    root: &Path,
    request: &ReviewRequest,
) -> Result<Vec<PathBuf>, ReviewError> {
    if request.dry_run {
        return Ok(Vec::new());
    }

    let out = normalize_optional_path(root, &request.out)
        .unwrap_or_else(|| root.join(".local/code-reviews"));
    let labels: Vec<&str> = match request.repo {
        RepoTarget::All => vec!["backend", "frontend"],
        RepoTarget::Backend => vec!["backend"],
        RepoTarget::Frontend => vec!["frontend"],
        RepoTarget::Effiq => vec!["effiq"],
    };

    if request.repo == RepoTarget::All {
        return Ok(labels
            .iter()
            .map(|label| out.join(format!("{label}.md")))
            .collect());
    }

    if request.out.trim().is_empty() {
        return Ok(vec![out.join(format!("{}.md", labels[0]))]);
    }

    Ok(vec![out])
}

fn repo_arg(repo: RepoTarget) -> &'static str {
    match repo {
        RepoTarget::All => "all",
        RepoTarget::Backend => "backend",
        RepoTarget::Frontend => "frontend",
        RepoTarget::Effiq => "effiq",
    }
}

fn normalize_optional_path(root: &Path, value: &str) -> Option<PathBuf> {
    let value = value.trim();
    if value.is_empty() {
        return None;
    }
    let path = PathBuf::from(value);
    if path.is_absolute() {
        Some(path)
    } else {
        Some(root.join(path))
    }
}

fn effiq_root() -> Result<PathBuf, ReviewError> {
    if let Ok(root) = env::var("EFFIQ_APP_ROOT") {
        return Ok(PathBuf::from(root));
    }

    let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    manifest_dir.parent().map(Path::to_path_buf).ok_or_else(|| {
        ReviewError::Validation("could not resolve Effiq repository root".to_string())
    })
}

fn quote_command(command: &BuiltCommand) -> String {
    let mut parts = Vec::new();
    for (key, value) in &command.envs {
        parts.push(format!("{key}={}", shell_quote(value)));
    }
    parts.push(shell_quote(&command.program.display().to_string()));
    parts.extend(command.args.iter().map(|arg| shell_quote(arg)));
    parts.join(" ")
}

fn shell_quote(value: &str) -> String {
    if value
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || matches!(c, '/' | '.' | '_' | '-' | ':' | '='))
    {
        value.to_string()
    } else {
        format!("'{}'", value.replace('\'', "'\\''"))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::{Mutex, OnceLock};
    use tempfile::TempDir;

    static ENV_LOCK: OnceLock<Mutex<()>> = OnceLock::new();

    fn with_root<T>(test: impl FnOnce(&TempDir) -> T) -> T {
        let lock = ENV_LOCK.get_or_init(|| Mutex::new(()));
        let _guard = lock.lock().unwrap();
        let root = TempDir::new().unwrap();
        fs::create_dir_all(root.path().join(".agents/skills/effiq-code-review/scripts")).unwrap();
        fs::write(
            root.path()
                .join(".agents/skills/effiq-code-review/scripts/run-codex-review.sh"),
            "#!/usr/bin/env bash\n",
        )
        .unwrap();
        fs::write(
            root.path()
                .join(".agents/skills/effiq-code-review/scripts/switch-review-branch.sh"),
            "#!/usr/bin/env bash\n",
        )
        .unwrap();
        env::set_var("EFFIQ_APP_ROOT", root.path());
        let result = test(&root);
        env::remove_var("EFFIQ_APP_ROOT");
        result
    }

    fn review_request(repo: RepoTarget) -> ReviewRequest {
        ReviewRequest {
            repo,
            scope_mode: ScopeMode::Base,
            base: "develop".to_string(),
            commit: String::new(),
            out: String::new(),
            title: String::new(),
            backend_path: String::new(),
            frontend_path: String::new(),
            with_context: false,
            dry_run: true,
            model_override: String::new(),
        }
    }

    fn branch_request(repo: RepoTarget) -> BranchRequest {
        BranchRequest {
            repo,
            selector_mode: BranchSelectorMode::Query,
            query: "AG-00000".to_string(),
            branch: String::new(),
            backend_path: String::new(),
            frontend_path: String::new(),
            fetch: false,
            checkout: false,
            dry_run: true,
        }
    }

    #[test]
    fn builds_review_commands_for_every_repo_target() {
        with_root(|_| {
            for repo in [
                RepoTarget::All,
                RepoTarget::Backend,
                RepoTarget::Frontend,
                RepoTarget::Effiq,
            ] {
                let command = build_review_command(&review_request(repo)).unwrap();
                assert!(command
                    .args
                    .windows(2)
                    .any(|pair| pair[0] == "--repo" && pair[1] == repo_arg(repo)));
            }
        });
    }

    #[test]
    fn rejects_missing_scope_values_before_process_spawn() {
        with_root(|_| {
            let mut request = review_request(RepoTarget::Effiq);
            request.base.clear();
            assert!(build_review_command(&request).is_err());

            request.scope_mode = ScopeMode::Commit;
            request.commit.clear();
            assert!(build_review_command(&request).is_err());
        });
    }

    #[test]
    fn builds_uncommitted_and_commit_scope_args_exclusively() {
        with_root(|_| {
            let mut request = review_request(RepoTarget::Effiq);
            request.scope_mode = ScopeMode::Uncommitted;
            let command = build_review_command(&request).unwrap();
            assert!(command.args.contains(&"--uncommitted".to_string()));
            assert!(!command.args.contains(&"--base".to_string()));

            request.scope_mode = ScopeMode::Commit;
            request.commit = "abc123".to_string();
            let command = build_review_command(&request).unwrap();
            assert!(command
                .args
                .windows(2)
                .any(|pair| pair[0] == "--commit" && pair[1] == "abc123"));
            assert!(!command.args.contains(&"--base".to_string()));
        });
    }

    #[test]
    fn branch_selector_must_be_query_or_exact_branch() {
        with_root(|_| {
            let mut request = branch_request(RepoTarget::Effiq);
            request.branch = "feature/test".to_string();
            assert!(build_branch_command(&request).is_err());

            request.selector_mode = BranchSelectorMode::Branch;
            request.query.clear();
            let command = build_branch_command(&request).unwrap();
            assert!(command
                .args
                .windows(2)
                .any(|pair| pair[0] == "--branch" && pair[1] == "feature/test"));
        });
    }

    #[test]
    fn dry_run_preview_preserves_safety_flags() {
        with_root(|_| {
            let result = preview_review_command(review_request(RepoTarget::Effiq)).unwrap();
            assert_eq!(result.status, CommandStatus::Blocked);
            assert!(result.command.contains("--dry-run"));
            assert!(result.command.contains("--repo effiq"));
        });
    }

    #[test]
    fn with_context_delegates_all_three_read_only_roots_to_script() {
        with_root(|root| {
            let mut request = review_request(RepoTarget::Backend);
            request.with_context = true;
            request.backend_path = "../agcms-laravel".to_string();
            request.frontend_path = "../ag-cms-ng".to_string();
            let command = build_review_command(&request).unwrap();
            assert!(command.args.contains(&"--with-context".to_string()));
            assert!(command.args.windows(2).any(|pair| {
                pair[0] == "--backend-path"
                    && pair[1] == root.path().join("../agcms-laravel").display().to_string()
            }));
            assert!(command.args.windows(2).any(|pair| {
                pair[0] == "--frontend-path"
                    && pair[1] == root.path().join("../ag-cms-ng").display().to_string()
            }));
        });
    }

    #[test]
    fn invalid_path_text_is_rejected_before_process_spawn() {
        with_root(|_| {
            let mut request = review_request(RepoTarget::Effiq);
            request.out = "bad\npath".to_string();
            assert!(build_review_command(&request).is_err());

            let mut branch = branch_request(RepoTarget::Effiq);
            branch.backend_path = "bad\npath".to_string();
            assert!(build_branch_command(&branch).is_err());
        });
    }

    #[test]
    fn all_target_reports_backend_and_frontend_only() {
        with_root(|root| {
            let mut request = review_request(RepoTarget::All);
            request.dry_run = false;
            let command = build_review_command(&request).unwrap();
            assert_eq!(
                command.report_paths,
                vec![
                    root.path().join(".local/code-reviews/backend.md"),
                    root.path().join(".local/code-reviews/frontend.md")
                ]
            );
        });
    }

    #[test]
    fn model_override_is_passed_as_environment_not_cli_text() {
        with_root(|_| {
            let mut request = review_request(RepoTarget::Effiq);
            request.model_override = "gpt-5-codex".to_string();
            let command = build_review_command(&request).unwrap();
            assert_eq!(
                command.envs,
                vec![("CODEX_REVIEW_MODEL".to_string(), "gpt-5-codex".to_string())]
            );
        });
    }
}
