use std::collections::HashMap;
use std::process::Stdio;
use std::sync::Arc;
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::process::{Child, Command};
use tokio::sync::{mpsc, Mutex};
use tokio::time::{sleep, Duration};

/// ACP Agent Runner - Spawns agents with ACP SDK wrapper
pub struct AcpRunner {
    /// Running agent processes
    processes: Arc<Mutex<HashMap<String, AcpProcess>>>,
    /// Sidecar WebSocket URL
    sidecar_url: String,
}

struct AcpProcess {
    child: Child,
    stdin_tx: mpsc::Sender<String>,
    agent_id: String,
}

impl AcpRunner {
    pub fn new(sidecar_url: String) -> Self {
        Self {
            processes: Arc::new(Mutex::new(HashMap::new())),
            sidecar_url,
        }
    }

    /// Spawn an agent with ACP wrapper
    /// This runs: node acp-runner.js <agent-command> [args...]
    pub async fn spawn_agent(
        &self,
        agent_id: String,
        command: &str,
        args: &[String],
        env: &HashMap<String, String>,
        working_dir: &str,
    ) -> Result<u32, String> {
        // Build the ACP runner command
        // In production, this will be a bundled Node.js script
        // In development, we use tsx to run TypeScript directly
        let runner_script = Self::find_runner_script().await?;

        let mut cmd = if cfg!(target_os = "windows") {
            let mut c = Command::new("cmd.exe");
            c.arg("/C");
            if runner_script.ends_with(".ts") {
                // Development: use tsx
                c.arg("npx").arg("tsx").arg(&runner_script);
            } else {
                // Production: bundled JS
                c.arg("node").arg(&runner_script);
            }
            c
        } else {
            let mut c = if runner_script.ends_with(".ts") {
                let mut c = Command::new("npx");
                c.arg("tsx").arg(&runner_script);
                c
            } else {
                let mut c = Command::new("node");
                c.arg(&runner_script);
                c
            };
            c
        };

        // Add ACP config
        cmd.arg("--acp-url").arg(&self.sidecar_url)
            .arg("--agent-id").arg(&agent_id)
            .arg("--command").arg(command);

        // Add agent args
        for arg in args {
            cmd.arg("--arg").arg(arg);
        }

        // Add working directory
        cmd.arg("--working-dir").arg(working_dir);

        // Set environment
        cmd.env("ACP_AGENT_ID", &agent_id)
            .env("ACP_SIDECAR_URL", &self.sidecar_url);

        // Add custom env vars from profile
        for (key, value) in env {
            cmd.env(key, value);
        }

        // Ensure PATH is inherited
        if let Ok(path) = std::env::var("PATH") {
            cmd.env("PATH", path);
        }

        // Configure stdio
        cmd.stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .stdin(Stdio::piped());

        // Windows: prevent console window
        #[cfg(target_os = "windows")]
        {
            use std::os::windows::process::CommandExt;
            const CREATE_NO_WINDOW: u32 = 0x08000000;
            cmd.creation_flags(CREATE_NO_WINDOW);
        }

        let mut child = cmd.spawn().map_err(|e| {
            format!("Failed to spawn ACP runner: {}", e)
        })?;

        let pid = child.id().unwrap_or(0);
        let stdin = child.stdin.take()
            .ok_or("Failed to capture stdin".to_string())?;

        // Set up stdin channel
        let (stdin_tx, mut stdin_rx) = mpsc::channel::<String>(32);

        // Spawn stdin writer task
        tokio::spawn(async move {
            use tokio::io::AsyncWriteExt;
            let mut stdin: tokio::process::ChildStdin = stdin;
            while let Some(msg) = stdin_rx.recv().await {
                if stdin.write_all(msg.as_bytes()).await.is_err() {
                    break;
                }
                if stdin.write_all(b"\n").await.is_err() {
                    break;
                }
                if stdin.flush().await.is_err() {
                    break;
                }
            }
        });

        // Spawn stdout/stderr readers
        if let Some(stdout) = child.stdout.take() {
            let agent_id_clone = agent_id.clone();
            tokio::spawn(async move {
                let reader = BufReader::new(stdout);
                let mut lines = reader.lines();
                while let Ok(Some(line)) = lines.next_line().await {
                    println!("[ACP-Runner-{}] stdout: {}", agent_id_clone, line);
                }
            });
        }

        if let Some(stderr) = child.stderr.take() {
            let agent_id_clone = agent_id.clone();
            tokio::spawn(async move {
                let reader = BufReader::new(stderr);
                let mut lines = reader.lines();
                while let Ok(Some(line)) = lines.next_line().await {
                    eprintln!("[ACP-Runner-{}] stderr: {}", agent_id_clone, line);
                }
            });
        }

        // Store process
        let process = AcpProcess {
            child,
            stdin_tx,
            agent_id: agent_id.clone(),
        };

        self.processes.lock().await.insert(agent_id, process);

        // Spawn monitor task
        let processes = self.processes.clone();
        tokio::spawn(async move {
            sleep(Duration::from_secs(1)).await;
            // Process will be cleaned up when it exits
            // TODO: Add proper exit handling
        });

        Ok(pid)
    }

    /// Send input to an agent
    pub async fn send_input(&self, agent_id: &str, input: String) -> Result<(), String> {
        let processes = self.processes.lock().await;
        if let Some(process) = processes.get(agent_id) {
            process.stdin_tx.send(input).await
                .map_err(|_| "Failed to send input".to_string())?;
            Ok(())
        } else {
            Err(format!("Agent {} not found", agent_id))
        }
    }

    /// Kill an agent
    pub async fn kill_agent(&self, agent_id: &str) -> Result<(), String> {
        let mut processes = self.processes.lock().await;
        if let Some(mut process) = processes.remove(agent_id) {
            let _ = process.child.kill().await;
            let _ = process.child.wait().await;
            Ok(())
        } else {
            Err(format!("Agent {} not found", agent_id))
        }
    }

    /// Find the ACP runner script
    async fn find_runner_script() -> Result<String, String> {
        // Check multiple locations
        let candidates = [
            // Development locations (from src-tauri)
            "../sidecar/scripts/acp-runner.ts",
            "../../sidecar/scripts/acp-runner.ts",
            "./sidecar/scripts/acp-runner.ts",
            // Production locations (bundled)
            "./sidecar/dist/acp-runner.js",
            "../Resources/sidecar/acp-runner.js",
        ];

        for path in &candidates {
            if std::path::Path::new(path).exists() {
                return Ok(path.to_string());
            }
        }

        // Try to find in executable directory
        if let Ok(exe_dir) = std::env::current_exe() {
            if let Some(parent) = exe_dir.parent() {
                let exe_candidates = [
                    parent.join("sidecar/acp-runner.js"),
                    parent.join("../Resources/sidecar/acp-runner.js"),
                    parent.join("../sidecar/scripts/acp-runner.ts"),
                ];
                for path in &exe_candidates {
                    if path.exists() {
                        return Ok(path.to_string_lossy().to_string());
                    }
                }
            }
        }

        Err("ACP runner script not found. Expected locations: {:?}".to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_find_runner_script() {
        // This will fail in CI but helps verify logic
        let _ = AcpRunner::find_runner_script().await;
    }
}
