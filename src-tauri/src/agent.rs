use std::collections::HashMap;
use std::process::Stdio;
use tokio::process::Command;
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::sync::mpsc;
use tauri::{AppHandle, Emitter};
use serde::Serialize;
use crate::types::{AgentInstance, AgentStatus, AgentProfile, SpawnConfig};

/// Event payload sent to frontend when agent produces output
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentOutputEvent {
    pub agent_id: String,
    pub stream: String, // "stdout" or "stderr"
    pub line: String,
}

/// Event payload sent to frontend when agent exits
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentExitEvent {
    pub agent_id: String,
    pub exit_code: Option<i32>,
}

/// Get current time as millis since UNIX epoch, safely (no panic)
fn now_millis() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}

/// Check if a command name refers to Claude Code (case-insensitive)
fn is_claude_command(cmd: &str) -> bool {
    let lower = cmd.to_lowercase();
    lower == "claude" || lower == "claude.cmd" || lower == "claude.exe"
        || lower.ends_with("/claude") || lower.ends_with("\\claude")
        || lower.ends_with("\\claude.exe") || lower.ends_with("\\claude.cmd")
}

/// Check if a command name refers to Codex CLI (case-insensitive)
fn is_codex_command(cmd: &str) -> bool {
    let lower = cmd.to_lowercase();
    lower == "codex" || lower == "codex.cmd" || lower == "codex.exe"
        || lower.ends_with("/codex") || lower.ends_with("\\codex")
        || lower.ends_with("\\codex.exe") || lower.ends_with("\\codex.cmd")
}

/// Check if a command name refers to Gemini CLI (case-insensitive)
fn is_gemini_command(cmd: &str) -> bool {
    let lower = cmd.to_lowercase();
    lower == "gemini" || lower == "gemini.cmd" || lower == "gemini.exe"
        || lower.ends_with("/gemini") || lower.ends_with("\\gemini")
        || lower.ends_with("\\gemini.exe") || lower.ends_with("\\gemini.cmd")
}

/// Check if a command name refers to Aider (case-insensitive)
fn is_aider_command(cmd: &str) -> bool {
    let lower = cmd.to_lowercase();
    lower == "aider" || lower == "aider.cmd" || lower == "aider.exe"
        || lower.ends_with("/aider") || lower.ends_with("\\aider")
        || lower.ends_with("\\aider.exe") || lower.ends_with("\\aider.cmd")
}

/// Check if a command name refers to Goose (case-insensitive)
fn is_goose_command(cmd: &str) -> bool {
    let lower = cmd.to_lowercase();
    lower == "goose" || lower == "goose.cmd" || lower == "goose.exe"
        || lower.ends_with("/goose") || lower.ends_with("\\goose")
        || lower.ends_with("\\goose.exe") || lower.ends_with("\\goose.cmd")
}

/// Check if a command name refers to Augment Code (case-insensitive)
fn is_augment_command(cmd: &str) -> bool {
    let lower = cmd.to_lowercase();
    lower == "augment" || lower == "augment.cmd" || lower == "augment.exe"
        || lower.ends_with("/augment") || lower.ends_with("\\augment")
        || lower.ends_with("\\augment.exe") || lower.ends_with("\\augment.cmd")
}

/// Check if a command name refers to Kiro CLI (case-insensitive)
fn is_kiro_command(cmd: &str) -> bool {
    let lower = cmd.to_lowercase();
    lower == "kiro" || lower == "kiro.cmd" || lower == "kiro.exe"
        || lower.ends_with("/kiro") || lower.ends_with("\\kiro")
        || lower.ends_with("\\kiro.exe") || lower.ends_with("\\kiro.cmd")
}

/// Check if a command name refers to Mistral Vibe (case-insensitive)
fn is_mistral_command(cmd: &str) -> bool {
    let lower = cmd.to_lowercase();
    lower == "mistral" || lower == "mistral.cmd" || lower == "mistral.exe"
        || lower == "vibe" || lower == "vibe.cmd"
        || lower.ends_with("/mistral") || lower.ends_with("\\mistral")
        || lower.ends_with("/vibe") || lower.ends_with("\\vibe")
}

/// Check if a command name refers to OpenCode (case-insensitive)
fn is_opencode_command(cmd: &str) -> bool {
    let lower = cmd.to_lowercase();
    lower == "opencode" || lower == "opencode.cmd" || lower == "opencode.exe"
        || lower.ends_with("/opencode") || lower.ends_with("\\opencode")
        || lower.ends_with("\\opencode.exe") || lower.ends_with("\\opencode.cmd")
}

/// Check if a command name refers to Qwen Code (case-insensitive)
fn is_qwen_command(cmd: &str) -> bool {
    let lower = cmd.to_lowercase();
    lower == "qwen" || lower == "qwen.cmd" || lower == "qwen.exe"
        || lower.ends_with("/qwen") || lower.ends_with("\\qwen")
        || lower.ends_with("\\qwen.exe") || lower.ends_with("\\qwen.cmd")
}

pub struct AgentManager {
    /// PIDs of running agent processes (for OS-level kill when needed)
    process_pids: HashMap<String, u32>,
    stdin_senders: HashMap<String, mpsc::Sender<String>>,
    instances: HashMap<String, AgentInstance>,
    app_handle: Option<AppHandle>,
}

impl AgentManager {
    pub fn new() -> Self {
        Self {
            process_pids: HashMap::new(),
            stdin_senders: HashMap::new(),
            instances: HashMap::new(),
            app_handle: None,
        }
    }

    pub fn set_app_handle(&mut self, handle: AppHandle) {
        self.app_handle = Some(handle);
    }

    /// Emit an output line to the frontend immediately
    fn emit_output(&self, agent_id: &str, stream: &str, line: &str) {
        if let Some(ref handle) = self.app_handle {
            let _ = handle.emit("agent-output", AgentOutputEvent {
                agent_id: agent_id.to_string(),
                stream: stream.to_string(),
                line: line.to_string(),
            });
        }
    }

    pub async fn spawn(
        &mut self,
        agent_id: String,
        profile: &AgentProfile,
        project_id: &str,
        project_path: &str,
        spawn_config: Option<SpawnConfig>,
    ) -> Result<AgentInstance, String> {
        let config = spawn_config.unwrap_or_default();

        // Resolve the actual command to execute
        let resolved_command = self.resolve_command(&profile.acp_command);

        // Detect agent type (case-insensitive, works with full paths too)
        let is_claude = is_claude_command(&profile.acp_command) || is_claude_command(&resolved_command);
        let is_codex = is_codex_command(&profile.acp_command) || is_codex_command(&resolved_command);
        let is_gemini = is_gemini_command(&profile.acp_command) || is_gemini_command(&resolved_command);
        let is_aider = is_aider_command(&profile.acp_command) || is_aider_command(&resolved_command);
        let is_goose = is_goose_command(&profile.acp_command) || is_goose_command(&resolved_command);
        let is_augment = is_augment_command(&profile.acp_command) || is_augment_command(&resolved_command);
        let _is_kiro = is_kiro_command(&profile.acp_command) || is_kiro_command(&resolved_command);
        let _is_mistral = is_mistral_command(&profile.acp_command) || is_mistral_command(&resolved_command);
        let _is_opencode = is_opencode_command(&profile.acp_command) || is_opencode_command(&resolved_command);
        let _is_qwen = is_qwen_command(&profile.acp_command) || is_qwen_command(&resolved_command);

        // Emit debug info to frontend
        self.emit_output(&agent_id, "stderr", &format!("[MultiPilot] Spawning: {}", &resolved_command));

        // Build the command - on Windows, use cmd.exe /C to properly resolve .cmd/.bat files
        let mut cmd = if cfg!(target_os = "windows") {
            let mut c = Command::new("cmd.exe");
            c.arg("/C");
            c.arg(&resolved_command);
            c
        } else {
            Command::new(&resolved_command)
        };

        cmd.args(&profile.acp_args)
            .current_dir(project_path)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .stdin(Stdio::piped());

        // On Windows, prevent the child process from creating a console window
        #[cfg(target_os = "windows")]
        {
            #[allow(unused_imports)]
            use std::os::windows::process::CommandExt;
            const CREATE_NO_WINDOW: u32 = 0x08000000;
            cmd.creation_flags(CREATE_NO_WINDOW);
        }

        // Add mode arguments if a mode is selected
        if let Some(ref mode_id) = config.mode_id {
            if let Some(mode) = profile.modes.iter().find(|m| m.id == *mode_id) {
                for arg in &mode.args {
                    cmd.arg(arg);
                }
            }
        }

        // Add settings file if provided and profile supports it
        let settings_file = config.settings_file.as_ref()
            .or(profile.settings_file_path.as_ref());

        if let Some(file_path) = settings_file {
            if profile.supports_settings_file {
                cmd.arg("--settings").arg(file_path);
            }
        }

        // Add extra arguments from profile (e.g., -q for Codex)
        for arg in &profile.extra_args {
            cmd.arg(arg);
        }

        // Add spawn-time extra arguments BEFORE prompt (model selection etc.)
        if let Some(extra_args) = &config.extra_spawn_args {
            for arg in extra_args {
                cmd.arg(arg);
            }
        }

        // Add output format flags for Claude Code (machine-readable streaming JSON)
        // Claude requires -p/--print for non-interactive mode with --output-format
        let has_output_format = profile.extra_args.iter().any(|a| a == "--output-format")
            || config.extra_spawn_args.as_ref().map_or(false, |args| args.iter().any(|a| a == "--output-format"));

        let has_print_flag = profile.extra_args.iter().any(|a| a == "-p" || a == "--print")
            || config.extra_spawn_args.as_ref().map_or(false, |args| args.iter().any(|a| a == "-p" || a == "--print"));

        // Agent-specific non-interactive mode configuration
        if is_claude {
            if !has_print_flag {
                // -p is REQUIRED for non-interactive mode
                cmd.arg("-p");
            }
            if !has_output_format {
                cmd.arg("--output-format").arg("stream-json");
            }
        }

        // Codex CLI - use 'exec' subcommand for non-interactive mode
        if is_codex {
            // For non-interactive mode, use 'exec' subcommand
            cmd.arg("exec");
        }

        // Aider - runs in non-interactive mode automatically with --no-pretty
        if is_aider {
            // Aider outputs clean text by default, no special flags needed for non-interactive
            // User can add --no-pretty to extra_args if needed
        }

        // Goose - use 'run' subcommand with -t for task mode
        if is_goose {
            // Goose needs 'run' subcommand and -t for task
            cmd.arg("run").arg("-t");
        }

        // Augment Code - check if it has special requirements
        if is_augment {
            // Augment handles non-interactive mode differently, no automatic flags
        }

        // Gemini - will handle -p flag in prompt section below
        // Kiro, Mistral, OpenCode, Qwen - rely on profile.extra_args for now

        // Add initial prompt if provided
        if let Some(ref prompt) = config.initial_prompt {
            if profile.supports_prompt_input {
                let flag = profile.prompt_flag.as_deref().unwrap_or("");

                if is_gemini && !profile.extra_args.iter().any(|a| a == "-p" || a == "--prompt") {
                    // Gemini needs -p flag for non-interactive
                    cmd.arg("-p").arg(prompt);
                } else if is_goose {
                    // Goose takes prompt as positional after 'run -t'
                    cmd.arg(prompt);
                } else if flag.is_empty() {
                    // Positional prompt (Codex exec takes prompt as positional)
                    cmd.arg(prompt);
                } else {
                    cmd.arg(flag).arg(prompt);
                }
            }
        }

        // Set environment variables from profile
        for (key, value) in &profile.env {
            cmd.env(key, value);
        }

        // Set spawn-time environment variables
        if let Some(ref spawn_env) = config.spawn_env {
            for (key, value) in spawn_env {
                cmd.env(key, value);
            }
        }

        // Set isolation environment variable if enabled
        if config.isolated {
            cmd.env("MULTIPILOT_ISOLATED", "1");
            cmd.env("MULTIPILOT_PROJECT_ID", project_id);
        }

        // Ensure the process inherits PATH so commands are found
        if let Ok(path) = std::env::var("PATH") {
            cmd.env("PATH", path);
        }

        // Log the full command for debugging
        self.emit_output(&agent_id, "stderr", &format!("[MultiPilot] is_claude={}, is_codex={}", is_claude, is_codex));

        let mut child = cmd.spawn().map_err(|e| {
            let err_msg = format!("Failed to spawn '{}': {}. Make sure the command is installed and in PATH.", resolved_command, e);
            self.emit_output(&agent_id, "stderr", &format!("[MultiPilot] ERROR: {}", err_msg));
            err_msg
        })?;

        let pid = child.id().unwrap_or(0);
        self.emit_output(&agent_id, "stderr", &format!("[MultiPilot] Process started (PID: {})", pid));

        // Capture stdout and emit events to frontend
        // Use take() which returns Option - if None, we must kill the child to prevent orphan
        let stdout = match child.stdout.take() {
            Some(s) => s,
            None => {
                // Kill the child process to prevent orphan
                let _ = child.kill().await;
                let _ = child.wait().await;
                return Err("Failed to capture stdout".to_string());
            }
        };

        let stderr = match child.stderr.take() {
            Some(s) => s,
            None => {
                // Kill the child process to prevent orphan
                let _ = child.kill().await;
                let _ = child.wait().await;
                return Err("Failed to capture stderr".to_string());
            }
        };

        let stdin = match child.stdin.take() {
            Some(s) => s,
            None => {
                // Kill the child process to prevent orphan
                let _ = child.kill().await;
                let _ = child.wait().await;
                return Err("Failed to capture stdin".to_string());
            }
        };

        // Stdout reader
        let app_handle = self.app_handle.clone();
        let agent_id_out = agent_id.clone();
        tokio::spawn(async move {
            let reader = BufReader::new(stdout);
            let mut lines = reader.lines();
            while let Ok(Some(line)) = lines.next_line().await {
                if let Some(ref handle) = app_handle {
                    let _ = handle.emit("agent-output", AgentOutputEvent {
                        agent_id: agent_id_out.clone(),
                        stream: "stdout".to_string(),
                        line,
                    });
                }
            }
        });

        // Stderr reader
        let app_handle = self.app_handle.clone();
        let agent_id_err = agent_id.clone();
        tokio::spawn(async move {
            let reader = BufReader::new(stderr);
            let mut lines = reader.lines();
            while let Ok(Some(line)) = lines.next_line().await {
                if let Some(ref handle) = app_handle {
                    let _ = handle.emit("agent-output", AgentOutputEvent {
                        agent_id: agent_id_err.clone(),
                        stream: "stderr".to_string(),
                        line,
                    });
                }
            }
        });

        // Set up stdin channel so frontend can send input
        // stdin was already captured above to prevent orphan process
        let (stdin_tx, mut stdin_rx) = mpsc::channel::<String>(32);
        tokio::spawn(async move {
            let mut stdin = stdin;
            while let Some(msg) = stdin_rx.recv().await {
                if stdin.write_all(msg.as_bytes()).await.is_err() {
                    break;
                }
                if stdin.write_all(b"\n").await.is_err() {
                    break;
                }
                let _ = stdin.flush().await;
            }
        });

        // Monitor the process for exit in background.
        // The child is moved into this task — kill uses PID-based termination.
        let app_handle = self.app_handle.clone();
        let agent_id_exit = agent_id.clone();
        tokio::spawn(async move {
            let status = child.wait().await;
            let exit_code = status.ok().and_then(|s| s.code());
            if let Some(ref handle) = app_handle {
                let _ = handle.emit("agent-exit", AgentExitEvent {
                    agent_id: agent_id_exit,
                    exit_code,
                });
            }
        });

        let ts = now_millis();

        let instance = AgentInstance {
            id: agent_id.clone(),
            profile_id: profile.id.clone(),
            project_id: project_id.to_string(),
            project_path: project_path.to_string(),
            status: AgentStatus::Running,
            session_id: Some(format!("session_{}", agent_id)),
            spawned_at: ts,
            updated_at: ts,
            updates: Vec::new(),
            pending_permission: None,
            output: Vec::new(),
            output_line_count: 0,
            errors: Vec::new(),
            spawn_config: Some(config),
        };

        self.stdin_senders.insert(agent_id.clone(), stdin_tx);
        self.process_pids.insert(agent_id.clone(), pid);
        self.instances.insert(agent_id, instance.clone());

        Ok(instance)
    }

    /// Resolve command path, especially for Windows .cmd files
    fn resolve_command(&self, command: &str) -> String {
        #[cfg(target_os = "windows")]
        {
            if let Ok(output) = std::process::Command::new("where")
                .arg(command)
                .output()
            {
                if output.status.success() {
                    let paths = String::from_utf8_lossy(&output.stdout);
                    if let Some(first_path) = paths.lines().next() {
                        return first_path.trim().to_string();
                    }
                }
            }
            let cmd_variant = format!("{}.cmd", command);
            if let Ok(output) = std::process::Command::new("where")
                .arg(&cmd_variant)
                .output()
            {
                if output.status.success() {
                    let paths = String::from_utf8_lossy(&output.stdout);
                    if let Some(first_path) = paths.lines().next() {
                        return first_path.trim().to_string();
                    }
                }
            }
        }
        command.to_string()
    }

    /// Send a line of text to the agent's stdin
    pub async fn send_stdin(&self, agent_id: &str, input: String) -> Result<(), String> {
        let sender = self.stdin_senders.get(agent_id)
            .ok_or_else(|| format!("Agent '{}' not found or has no stdin", agent_id))?;
        sender.send(input).await
            .map_err(|e| format!("Failed to send to agent stdin: {}", e))
    }

    pub async fn kill(&mut self, agent_id: &str) -> Result<(), String> {
        // First check if agent exists and is not already exited
        let instance = self.instances.get_mut(agent_id)
            .ok_or_else(|| format!("Agent '{}' not found", agent_id))?;

        // If already exited, return early (idempotent)
        if instance.status == AgentStatus::Exited {
            return Ok(());
        }

        // Set status to Exited immediately to prevent double-kill race
        instance.status = AgentStatus::Exited;
        instance.updated_at = now_millis();

        // Remove stdin sender to close the channel
        self.stdin_senders.remove(agent_id);

        // Kill the process via OS-level PID.
        // The child is owned by the monitor task, so we use taskkill/kill signal.
        // The monitor task will detect the exit and emit the "agent-exit" event.
        if let Some(pid) = self.process_pids.remove(agent_id) {
            if pid > 0 {
                #[cfg(target_os = "windows")]
                {
                    use std::os::windows::process::CommandExt;
                    // /F = force, /T = kill child processes too
                    let _ = std::process::Command::new("taskkill")
                        .args(["/PID", &pid.to_string(), "/F", "/T"])
                        .creation_flags(0x08000000) // CREATE_NO_WINDOW
                        .output();
                }
                #[cfg(not(target_os = "windows"))]
                {
                    let _ = std::process::Command::new("kill")
                        .args(["-9", &pid.to_string()])
                        .output();
                }
            }
        }

        Ok(())
    }

    pub fn get_status(&self, agent_id: &str) -> Option<AgentInstance> {
        self.instances.get(agent_id).cloned()
    }

    pub fn list_agents(&self) -> Vec<AgentInstance> {
        self.instances.values().cloned().collect()
    }
}

impl Default for AgentManager {
    fn default() -> Self {
        Self::new()
    }
}
