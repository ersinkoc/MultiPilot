# MultiPilot Troubleshooting Guide

## Installation Issues

### Error: Cannot find module '@tauri-apps/cli'
```bash
npm install -g @tauri-apps/cli
# or
npm install --save-dev @tauri-apps/cli
```

### Error: Rust toolchain not found
Install Rust from https://rustup.rs/
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

## Development Issues

### Port 1420 already in use
```bash
# Find and kill process using port 1420
lsof -ti:1420 | xargs kill -9
```

### Sidecar server won't start
Check if port 8765 is available:
```bash
lsof -ti:8765 | xargs kill -9
```

### Build fails with TypeScript errors
```bash
# Clean and reinstall
rm -rf node_modules package-lock.json
npm install
```

## Runtime Issues

### Agents won't spawn
1. Check if the command is in PATH
2. Verify the profile configuration
3. Check Tauri console for errors

### File operations fail
1. Verify file permissions
2. Check if path exists
3. Ensure proper capabilities in tauri.conf.json

### Git operations don't work
1. Verify git is installed
2. Check if directory is a git repository
3. Ensure sidecar is running

## Common Errors

### "Failed to spawn agent"
- Check agent profile command is correct
- Verify the CLI tool is installed (claude, codex, etc.)
- Check environment variables

### "Permission denied"
- Check file system permissions
- Verify Tauri capabilities are configured correctly

### "Git repository not found"
- Ensure the project path contains a .git directory
- Initialize git if needed: `git init`

## Debug Mode

Enable debug logging:
```bash
# Frontend
DEBUG=* npm run dev

# Tauri
RUST_LOG=debug cargo tauri dev

# Sidecar
DEBUG=* npm run sidecar:dev
```

## Getting Help

1. Check the logs in the developer console (Ctrl+Shift+I)
2. Review Tauri logs in the terminal
3. Check sidecar output for file/git operations
4. File an issue with logs and reproduction steps
