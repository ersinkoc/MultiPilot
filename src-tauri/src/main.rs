// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::Arc;
use tokio::sync::Mutex;
use tauri::Manager;

mod agent;
mod commands;
mod discovery;
mod types;
mod acp_runner;

use agent::AgentManager;
use acp_runner::AcpRunner;

#[derive(Default)]
pub struct AppState {
    agent_manager: AgentManager,
    acp_runner: Option<AcpRunner>,
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::default().build())
        .setup(|app| {
            // Pass AppHandle to AgentManager so it can emit events to frontend
            let state: tauri::State<Arc<Mutex<AppState>>> = app.state();
            let handle = app.handle().clone();
            let state_clone = state.inner().clone();

            // Initialize ACP runner
            let acp_runner = AcpRunner::new("ws://127.0.0.1:8765/ws".to_string());

            tauri::async_runtime::spawn(async move {
                let mut state = state_clone.lock().await;
                state.agent_manager.set_app_handle(handle);
                state.agent_manager.set_acp_runner(acp_runner);
            });
            Ok(())
        })
        .manage(Arc::new(Mutex::new(AppState::default())))
        .invoke_handler(tauri::generate_handler![
            commands::spawn_agent,
            commands::kill_agent,
            commands::restart_agent,
            commands::get_agent_status,
            commands::list_agents,
            commands::send_to_agent_stdin,
            commands::read_file,
            commands::write_file,
            commands::list_directory,
            commands::start_sidecar,
            commands::discover_clis_cmd,
            commands::check_command_exists_tauri,
            commands::get_command_version_tauri,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
