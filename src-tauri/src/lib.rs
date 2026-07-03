mod review;

use review::{
    list_report_paths, preview_branch_command, preview_review_command, run_branch_command,
    run_review_command, BranchRequest, CommandResult, ReviewRequest,
};

#[tauri::command]
fn preview_review(request: ReviewRequest) -> Result<CommandResult, String> {
    preview_review_command(request).map_err(|error| error.to_string())
}

#[tauri::command]
fn run_review(request: ReviewRequest) -> Result<CommandResult, String> {
    run_review_command(request).map_err(|error| error.to_string())
}

#[tauri::command]
fn preview_branch(request: BranchRequest) -> Result<CommandResult, String> {
    preview_branch_command(request).map_err(|error| error.to_string())
}

#[tauri::command]
fn run_branch(request: BranchRequest) -> Result<CommandResult, String> {
    run_branch_command(request).map_err(|error| error.to_string())
}

#[tauri::command]
fn list_reports() -> Result<Vec<String>, String> {
    list_report_paths().map_err(|error| error.to_string())
}

pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            preview_review,
            run_review,
            preview_branch,
            run_branch,
            list_reports
        ])
        .run(tauri::generate_context!())
        .expect("error while running Effiq Review Runner");
}
