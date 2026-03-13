use serde::{Deserialize, Serialize};
use std::process::Command;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DiscoveredCli {
    pub command: String,
    pub name: String,
    pub detected_path: String,
    pub version: Option<String>,
    pub is_available: bool,
    pub suggested_profile: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CommandValidationResult {
    pub is_valid: bool,
    pub path: Option<String>,
    pub version: Option<String>,
    pub error: Option<String>,
}

/// All known ACP-compatible CLI agents to scan for
const CLI_TOOLS: &[&str] = &[
    "claude",       // Claude Code - Anthropic
    "codex",        // Codex CLI - OpenAI
    "gemini",       // Gemini CLI - Google
    "agent",        // Cursor Agent CLI
    "goose",        // Goose - Block
    "auggie",       // Augment Code
    "kiro-cli",     // Kiro CLI - AWS
    "vibe",         // Mistral Vibe
    "opencode",     // OpenCode - SST
    "aider",        // Aider
    "qwen",         // Qwen Code - Alibaba
    "blackbox",     // Blackbox AI
    "cline",        // Cline
    "fast-agent-acp", // fast-agent
];

/// Discover all available CLI tools in PATH
pub fn discover_clis() -> Vec<DiscoveredCli> {
    let mut discovered = Vec::new();
    let mut seen_commands = std::collections::HashSet::new();

    for tool in CLI_TOOLS {
        // On Windows, try both with and without .cmd extension
        let variants: Vec<String> = if cfg!(target_os = "windows") {
            vec![tool.to_string(), format!("{}.cmd", tool)]
        } else {
            vec![tool.to_string()]
        };

        for variant in &variants {
            if let Some(cli) = check_cli(variant) {
                let base = variant.strip_suffix(".cmd").unwrap_or(variant);
                if cli.is_available && !seen_commands.contains(base) {
                    seen_commands.insert(base.to_string());
                    discovered.push(cli);
                }
            }
        }

        // If no variant was found available, report as unavailable once
        let base = tool.to_string();
        if !seen_commands.contains(&base) {
            seen_commands.insert(base.clone());
            discovered.push(DiscoveredCli {
                command: base.clone(),
                name: get_display_name(tool),
                detected_path: String::new(),
                version: None,
                is_available: false,
                suggested_profile: None,
            });
        }
    }

    discovered
}

/// Check if a specific CLI tool is available
pub fn check_cli(command: &str) -> Option<DiscoveredCli> {
    let path_result = find_command_path(command);

    match path_result {
        Ok(path) => {
            let version = get_command_version(command).ok();
            let suggested = generate_suggested_profile(command, version.as_deref());

            Some(DiscoveredCli {
                command: command.to_string(),
                name: get_display_name(command),
                detected_path: path,
                version,
                is_available: true,
                suggested_profile: Some(suggested),
            })
        }
        Err(_e) => {
            Some(DiscoveredCli {
                command: command.to_string(),
                name: get_display_name(command),
                detected_path: String::new(),
                version: None,
                is_available: false,
                suggested_profile: None,
            })
        }
    }
}

/// Check if a command exists in PATH
pub fn check_command_exists(command: &str) -> CommandValidationResult {
    match find_command_path(command) {
        Ok(path) => {
            let version = get_command_version(command).ok();
            CommandValidationResult {
                is_valid: true,
                path: Some(path),
                version,
                error: None,
            }
        }
        Err(e) => CommandValidationResult {
            is_valid: false,
            path: None,
            version: None,
            error: Some(e),
        },
    }
}

/// Get the version of a command
pub fn get_command_version(command: &str) -> Result<String, String> {
    let output = Command::new(command)
        .arg("--version")
        .output()
        .map_err(|e| format!("Failed to run {} --version: {}", command, e))?;

    if !output.status.success() {
        return Err(format!("{} --version returned non-zero exit code", command));
    }

    let version_str = String::from_utf8_lossy(&output.stdout);
    Ok(version_str.trim().to_string())
}

/// Find the full path of a command
fn find_command_path(command: &str) -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        let output = Command::new("where")
            .arg(command)
            .output()
            .map_err(|e| format!("Failed to run where {}: {}", command, e))?;

        if !output.status.success() {
            return Err(format!("Command '{}' not found in PATH", command));
        }

        let paths = String::from_utf8_lossy(&output.stdout);
        paths
            .lines()
            .next()
            .map(|s| s.trim().to_string())
            .ok_or_else(|| format!("No path found for '{}'", command))
    }

    #[cfg(not(target_os = "windows"))]
    {
        let output = Command::new("which")
            .arg(command)
            .output()
            .map_err(|e| format!("Failed to run which {}: {}", command, e))?;

        if !output.status.success() {
            return Err(format!("Command '{}' not found in PATH", command));
        }

        let path = String::from_utf8_lossy(&output.stdout);
        Ok(path.trim().to_string())
    }
}

/// Get display name for a CLI tool
fn get_display_name(command: &str) -> String {
    let base_cmd = command.strip_suffix(".cmd").unwrap_or(command);
    match base_cmd {
        "claude" => "Claude Code".to_string(),
        "codex" => "Codex CLI".to_string(),
        "gemini" => "Gemini CLI".to_string(),
        "agent" => "Cursor Agent".to_string(),
        "goose" => "Goose".to_string(),
        "auggie" => "Augment Code".to_string(),
        "kiro-cli" => "Kiro CLI".to_string(),
        "vibe" => "Mistral Vibe".to_string(),
        "opencode" => "OpenCode".to_string(),
        "aider" => "Aider".to_string(),
        "qwen" => "Qwen Code".to_string(),
        "blackbox" => "Blackbox AI".to_string(),
        "cline" => "Cline".to_string(),
        "fast-agent-acp" => "fast-agent".to_string(),
        _ => command.to_string(),
    }
}

/// Generate a suggested profile for a discovered CLI
fn generate_suggested_profile(command: &str, version: Option<&str>) -> serde_json::Value {
    let base_cmd = command.strip_suffix(".cmd").unwrap_or(command);
    let base_profile = match base_cmd {
        "claude" => serde_json::json!({
            "acpCommand": "claude",
            "acpArgs": [],
            "extraArgs": [],
            "env": {},
            "supportsSettingsFile": true,
            "supportsPromptInput": true,
            "promptFlag": "-p",
        }),
        "codex" => serde_json::json!({
            "acpCommand": "codex",
            "acpArgs": [],
            "extraArgs": [],
            "env": {},
            "supportsSettingsFile": false,
            "supportsPromptInput": true,
            "promptFlag": "-p",
        }),
        "gemini" => serde_json::json!({
            "acpCommand": "gemini",
            "acpArgs": [],
            "extraArgs": [],
            "env": {},
            "supportsSettingsFile": false,
            "supportsPromptInput": true,
            "promptFlag": "-p",
        }),
        "agent" => serde_json::json!({
            "acpCommand": "agent",
            "acpArgs": ["acp"],
            "extraArgs": [],
            "env": {},
            "supportsSettingsFile": false,
            "supportsPromptInput": false,
        }),
        "goose" => serde_json::json!({
            "acpCommand": "goose",
            "acpArgs": ["acp"],
            "extraArgs": [],
            "env": {},
            "supportsSettingsFile": false,
            "supportsPromptInput": false,
        }),
        "auggie" => serde_json::json!({
            "acpCommand": "auggie",
            "acpArgs": ["--acp"],
            "extraArgs": [],
            "env": {},
            "supportsSettingsFile": false,
            "supportsPromptInput": false,
        }),
        "kiro-cli" => serde_json::json!({
            "acpCommand": "kiro-cli",
            "acpArgs": ["acp"],
            "extraArgs": [],
            "env": {},
            "supportsSettingsFile": false,
            "supportsPromptInput": false,
        }),
        "vibe" => serde_json::json!({
            "acpCommand": "vibe",
            "acpArgs": [],
            "extraArgs": [],
            "env": {},
            "supportsSettingsFile": false,
            "supportsPromptInput": true,
            "promptFlag": "--prompt",
        }),
        "opencode" => serde_json::json!({
            "acpCommand": "opencode",
            "acpArgs": [],
            "extraArgs": [],
            "env": {},
            "supportsSettingsFile": false,
            "supportsPromptInput": true,
            "promptFlag": "-p",
        }),
        "aider" => serde_json::json!({
            "acpCommand": "aider",
            "acpArgs": [],
            "extraArgs": [],
            "env": {},
            "supportsSettingsFile": true,
            "settingsFilePath": ".aider.conf.yml",
            "supportsPromptInput": true,
            "promptFlag": "--message",
        }),
        "qwen" => serde_json::json!({
            "acpCommand": "qwen",
            "acpArgs": [],
            "extraArgs": [],
            "env": {},
            "supportsSettingsFile": false,
            "supportsPromptInput": true,
            "promptFlag": "-p",
        }),
        "blackbox" => serde_json::json!({
            "acpCommand": "blackbox",
            "acpArgs": [],
            "extraArgs": [],
            "env": {},
            "supportsSettingsFile": false,
            "supportsPromptInput": false,
        }),
        "cline" => serde_json::json!({
            "acpCommand": "cline",
            "acpArgs": [],
            "extraArgs": [],
            "env": {},
            "supportsSettingsFile": false,
            "supportsPromptInput": true,
            "promptFlag": "-p",
        }),
        "fast-agent-acp" => serde_json::json!({
            "acpCommand": "fast-agent-acp",
            "acpArgs": [],
            "extraArgs": ["-x"],
            "env": {},
            "supportsSettingsFile": false,
            "supportsPromptInput": false,
        }),
        _ => serde_json::json!({
            "acpCommand": base_cmd,
            "acpArgs": [],
            "extraArgs": [],
            "env": {},
            "supportsSettingsFile": false,
            "supportsPromptInput": true,
            "promptFlag": "-p",
        }),
    };

    let mut profile = base_profile;
    if let Some(v) = version {
        profile["version"] = serde_json::json!(v);
    }

    profile
}
