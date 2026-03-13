use serde::{Deserialize, Serialize};
use tauri::{State, Manager};
use std::sync::Arc;
use tokio::sync::Mutex;

use crate::types::{AgentProfile, AgentInstance, SpawnConfig};
use crate::AppState;
use crate::discovery::{check_command_exists, DiscoveredCli, CommandValidationResult};

#[derive(Debug, Serialize, Deserialize)]
pub struct SpawnAgentRequest {
    pub agent_id: String,
    pub profile: AgentProfile,
    pub project_id: String,
    pub project_path: String,
    pub initial_prompt: Option<String>,
    #[serde(default)]
    pub spawn_config: Option<SpawnConfig>,
}

#[tauri::command]
pub async fn spawn_agent(
    state: State<'_, Arc<Mutex<AppState>>>,
    request: SpawnAgentRequest,
) -> Result<AgentInstance, String> {
    let mut state = state.lock().await;
    let spawn_config = request.spawn_config.unwrap_or_else(|| SpawnConfig {
        initial_prompt: request.initial_prompt,
        ..Default::default()
    });
    let instance = state.agent_manager.spawn(
        request.agent_id.clone(),
        &request.profile,
        &request.project_id,
        &request.project_path,
        Some(spawn_config),
    ).await?;

    Ok(instance)
}

#[tauri::command]
pub async fn kill_agent(
    state: State<'_, Arc<Mutex<AppState>>>,
    agent_id: String,
) -> Result<(), String> {
    let mut state = state.lock().await;
    state.agent_manager.kill(&agent_id).await
}

#[tauri::command]
pub async fn get_agent_status(
    state: State<'_, Arc<Mutex<AppState>>>,
    agent_id: String,
) -> Result<Option<AgentInstance>, String> {
    let state = state.lock().await;
    Ok(state.agent_manager.get_status(&agent_id))
}

#[tauri::command]
pub async fn list_agents(
    state: State<'_, Arc<Mutex<AppState>>>,
) -> Result<Vec<AgentInstance>, String> {
    let state = state.lock().await;
    Ok(state.agent_manager.list_agents())
}


// File System Commands
#[tauri::command]
pub async fn read_file(path: String) -> Result<String, String> {
    tokio::fs::read_to_string(&path)
        .await
        .map_err(|e| format!("Failed to read file: {}", e))
}

#[tauri::command]
pub async fn write_file(path: String, content: String) -> Result<(), String> {
    tokio::fs::write(&path, content)
        .await
        .map_err(|e| format!("Failed to write file: {}", e))
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub size: Option<u64>,
}

#[tauri::command]
pub async fn list_directory(path: String) -> Result<Vec<FileEntry>, String> {
    let mut entries = Vec::new();

    let mut dir = tokio::fs::read_dir(&path)
        .await
        .map_err(|e| format!("Failed to read directory: {}", e))?;

    while let Some(entry) = dir.next_entry().await.map_err(|e| e.to_string())? {
        let name = entry.file_name().to_string_lossy().to_string();
        let path = entry.path().to_string_lossy().to_string();
        let metadata = entry.metadata().await.ok();
        let is_dir = metadata.as_ref().map(|m| m.is_dir()).unwrap_or(false);
        let size = metadata.filter(|m| m.is_file()).map(|m| m.len());

        entries.push(FileEntry {
            name,
            path,
            is_dir,
            size,
        });
    }

    Ok(entries)
}

/// Send input text to an agent's stdin
#[tauri::command]
pub async fn send_to_agent_stdin(
    state: State<'_, Arc<Mutex<AppState>>>,
    agent_id: String,
    input: String,
) -> Result<(), String> {
    let state = state.lock().await;
    state.agent_manager.send_stdin(&agent_id, input).await
}

#[tauri::command]
pub async fn restart_agent(
    state: State<'_, Arc<Mutex<AppState>>>,
    agent_id: String,
) -> Result<(), String> {
    let mut state = state.lock().await;
    // Kill existing agent - the frontend handles respawning with the same profile
    state.agent_manager.kill(&agent_id).await
}

/// Start the Node.js sidecar process
/// In development: uses tsx to run TypeScript directly
/// In production: uses the bundled binary
#[tauri::command]
pub async fn start_sidecar(
    app: tauri::AppHandle,
) -> Result<u32, String> {
    // Check if we're in development mode (debug build)
    let is_dev = cfg!(debug_assertions);

    if is_dev {
        start_sidecar_dev(app).await
    } else {
        start_sidecar_production(app).await
    }
}

/// Start sidecar in development mode using tsx
async fn start_sidecar_dev(app: tauri::AppHandle) -> Result<u32, String> {
    use std::process::Stdio;
    use tokio::process::Command;

    // Try to find the sidecar directory
    // In dev mode, CWD is src-tauri/ so check ../sidecar first, then ./sidecar
    let sidecar_dir = {
        let candidates = [
            std::path::PathBuf::from("../sidecar"),   // from src-tauri/
            std::path::PathBuf::from("./sidecar"),     // from project root
            std::path::PathBuf::from("sidecar"),       // relative
        ];
        candidates.into_iter()
            .find(|p| p.exists() && p.join("src/index.ts").exists())
            .ok_or_else(|| "Sidecar directory not found. Checked: ../sidecar, ./sidecar".to_string())?
    };

    // Build the command to run tsx
    let tsx_bin = sidecar_dir.join("node_modules/.bin/tsx");
    let index_ts = sidecar_dir.join("src/index.ts");

    let mut cmd = if cfg!(target_os = "windows") {
        let mut c = Command::new("cmd.exe");
        c.arg("/C");
        c.arg(tsx_bin.with_extension("cmd").to_string_lossy().to_string());
        c.arg(index_ts.to_string_lossy().to_string());
        c
    } else {
        let mut c = Command::new(tsx_bin.to_string_lossy().to_string());
        c.arg(index_ts.to_string_lossy().to_string());
        c
    };

    cmd.current_dir(&sidecar_dir)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .stdin(Stdio::null());

    if let Ok(path) = std::env::var("PATH") {
        cmd.env("PATH", path);
    }

    #[cfg(target_os = "windows")]
    {
        #[allow(unused_imports)]
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }

    let child = cmd.spawn().map_err(|e| {
        format!("Failed to start sidecar: {}. Ensure Node.js deps are installed in sidecar/", e)
    })?;

    let pid = child.id().unwrap_or(0);
    spawn_output_handlers(child, app).await?;

    Ok(pid)
}

/// Start sidecar in production mode using bundled binary
async fn start_sidecar_production(app: tauri::AppHandle) -> Result<u32, String> {
    use std::process::Stdio;
    use tokio::process::Command;

    // Get the bundled sidecar binary path from Tauri's resource directory
    let sidecar_path = app.path()
        .resolve("sidecar", tauri::path::BaseDirectory::Resource)
        .map_err(|e| format!("Failed to resolve sidecar path: {}", e))?;

    // If resource path doesn't exist, try the bundled binary location
    let sidecar_bin = if sidecar_path.exists() {
        sidecar_path
    } else {
        // Fallback: look for binary in standard bundle locations
        let exe_dir = std::env::current_exe()
            .map_err(|e| format!("Failed to get executable directory: {}", e))?
            .parent()
            .ok_or("Failed to get parent directory")?
            .to_path_buf();

        let binary_name = if cfg!(target_os = "windows") {
            "sidecar.exe"
        } else {
            "sidecar"
        };

        let candidates = [
            exe_dir.join(binary_name),
            exe_dir.join("binaries").join(binary_name),
            exe_dir.join("../Resources/binaries").join(binary_name), // macOS
        ];

        let candidates_copy = candidates.clone();
        candidates.into_iter()
            .find(|p| p.exists())
            .ok_or_else(|| {
                format!("Sidecar binary not found. Checked: {:?}", candidates_copy)
            })?
    };

    println!("[Sidecar] Starting production binary: {:?}", sidecar_bin);

    let mut cmd = Command::new(&sidecar_bin);
    cmd.stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .stdin(Stdio::null());

    // Set environment variables for production
    cmd.env("NODE_ENV", "production");
    cmd.env("SIDECAR_PORT", "8765");

    #[cfg(target_os = "windows")]
    {
        #[allow(unused_imports)]
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }

    let child = cmd.spawn().map_err(|e| {
        format!("Failed to start sidecar binary: {}. Path: {:?}", e, sidecar_bin)
    })?;

    let pid = child.id().unwrap_or(0);
    println!("[Sidecar] Started with PID: {}", pid);

    spawn_output_handlers(child, app).await?;

    Ok(pid)
}

/// Spawn output handlers for sidecar process
async fn spawn_output_handlers(
    mut child: tokio::process::Child,
    app: tauri::AppHandle,
) -> Result<(), String> {
    use tauri::Emitter;

    // Read stdout/stderr in background for logging
    if let Some(stdout) = child.stdout.take() {
        let handle = app.clone();
        tokio::spawn(async move {
            use tokio::io::{AsyncBufReadExt, BufReader};
            let mut lines = BufReader::new(stdout).lines();
            while let Ok(Some(line)) = lines.next_line().await {
                let _ = handle.emit("agent-output", crate::agent::AgentOutputEvent {
                    agent_id: "_sidecar".to_string(),
                    stream: "stdout".to_string(),
                    line,
                });
            }
        });
    }

    if let Some(stderr) = child.stderr.take() {
        let handle = app.clone();
        tokio::spawn(async move {
            use tokio::io::{AsyncBufReadExt, BufReader};
            let mut lines = BufReader::new(stderr).lines();
            while let Ok(Some(line)) = lines.next_line().await {
                let _ = handle.emit("agent-output", crate::agent::AgentOutputEvent {
                    agent_id: "_sidecar".to_string(),
                    stream: "stderr".to_string(),
                    line,
                });
            }
        });
    }

    // Monitor process exit
    tokio::spawn(async move {
        let _ = child.wait().await;
        println!("[Sidecar] Process exited");
    });

    Ok(())
}

// CLI Discovery Commands
#[tauri::command]
pub fn discover_clis_cmd() -> Vec<DiscoveredCli> {
    crate::discovery::discover_clis()
}

#[tauri::command]
pub fn check_command_exists_tauri(cmd: String) -> CommandValidationResult {
    check_command_exists(&cmd)
}

#[tauri::command]
pub fn get_command_version_tauri(cmd: String) -> Result<String, String> {
    crate::discovery::get_command_version(&cmd)
}
