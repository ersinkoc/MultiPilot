use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentProfile {
    pub id: String,
    pub name: String,
    pub icon: String,
    pub color: String,
    pub description: Option<String>,
    pub provider: Option<String>,
    pub acp_command: String,
    pub acp_args: Vec<String>,
    pub extra_args: Vec<String>,
    pub env: std::collections::HashMap<String, String>,
    pub default_cwd: Option<String>,
    #[serde(default)]
    pub modes: Vec<AgentMode>,
    #[serde(default)]
    pub supports_settings_file: bool,
    #[serde(default)]
    pub settings_file_path: Option<String>,
    #[serde(default)]
    pub supports_prompt_input: bool,
    #[serde(default)]
    pub prompt_flag: Option<String>,
    #[serde(default)]
    pub is_auto_discovered: bool,
    #[serde(default)]
    pub detected_path: Option<String>,
    #[serde(default)]
    pub version: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentMode {
    pub id: String,
    pub name: String,
    pub description: String,
    pub icon: String,
    pub args: Vec<String>,
    pub security_level: String,
    pub requires_approval: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct SpawnConfig {
    #[serde(default)]
    pub mode_id: Option<String>,
    #[serde(default)]
    pub initial_prompt: Option<String>,
    #[serde(default)]
    pub settings_file: Option<String>,
    #[serde(default)]
    pub spawn_env: Option<std::collections::HashMap<String, String>>,
    #[serde(default)]
    pub isolated: bool,
    #[serde(default)]
    pub extra_spawn_args: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentInstance {
    pub id: String,
    pub profile_id: String,
    pub project_id: String,
    pub project_path: String,
    pub status: AgentStatus,
    pub session_id: Option<String>,
    pub spawned_at: u64,
    pub updated_at: u64,
    #[serde(default)]
    pub updates: Vec<SessionUpdate>,
    #[serde(default)]
    pub pending_permission: Option<PermissionRequest>,
    #[serde(default)]
    pub output: Vec<String>,
    #[serde(default)]
    pub output_line_count: u32,
    #[serde(default)]
    pub errors: Vec<AgentError>,
    #[serde(default)]
    pub spawn_config: Option<SpawnConfig>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentError {
    pub id: String,
    pub timestamp: u64,
    pub message: String,
    pub stack: Option<String>,
    pub code: Option<String>,
    pub fatal: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum AgentStatus {
    Starting,
    Running,
    WaitingInput,
    Idle,
    Exited,
    Error,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionUpdate {
    pub id: String,
    pub r#type: String,
    pub timestamp: u64,
    pub content: Option<String>,
    pub tool_name: Option<String>,
    #[serde(default)]
    pub tool_params: Option<serde_json::Value>,
    #[serde(default)]
    pub plan: Vec<PlanStep>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PlanStep {
    pub id: String,
    pub description: String,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PermissionRequest {
    pub id: String,
    pub agent_id: String,
    pub tool_name: String,
    pub tool_params: serde_json::Value,
    pub description: String,
    pub timestamp: u64,
}
