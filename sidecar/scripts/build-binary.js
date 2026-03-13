/**
 * Build binary script for MultiPilot sidecar
 * Handles cross-platform binary building with pkg
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const platform = process.platform;
const arch = process.arch;

// Map platform/arch to pkg target format
const targetMap = {
  win32: {
    x64: 'node18-win-x64',
    arm64: 'node18-win-arm64'
  },
  darwin: {
    x64: 'node18-macos-x64',
    arm64: 'node18-macos-arm64'
  },
  linux: {
    x64: 'node18-linux-x64',
    arm64: 'node18-linux-arm64'
  }
};

const target = targetMap[platform]?.[arch];
if (!target) {
  console.error(`Unsupported platform/arch: ${platform}/${arch}`);
  process.exit(1);
}

const ext = platform === 'win32' ? '.exe' : '';
const outputName = `sidecar-${target}${ext}`;
const outputPath = path.join('dist', outputName);

console.log(`Building sidecar binary for ${target}...`);
console.log(`Output: ${outputPath}`);

// Ensure dist directory exists
if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist', { recursive: true });
}

// Check if bundled file exists
const bundlePath = 'dist/index.cjs';
if (!fs.existsSync(bundlePath)) {
  console.error('Bundle not found. Run "npm run build:bundle" first.');
  process.exit(1);
}

// Build binary with pkg
try {
  // Find pkg executable
  const pkgBin = platform === 'win32'
    ? 'node_modules/.bin/pkg.cmd'
    : 'node_modules/.bin/pkg';

  const pkgCmd = `"${pkgBin}" ${bundlePath} --targets ${target} --output ${outputPath} --no-bytecode --public-packages "*" --public`;
  console.log(`Running: ${pkgCmd}`);
  execSync(pkgCmd, { stdio: 'inherit', shell: true });
  console.log(`\n✅ Binary built successfully: ${outputPath}`);

  // Create symlinks for Tauri externalBin naming convention
  const tauriBinDir = path.join('..', 'src-tauri', 'binaries');
  if (!fs.existsSync(tauriBinDir)) {
    fs.mkdirSync(tauriBinDir, { recursive: true });
  }

  // Copy to Tauri binaries directory with correct naming
  const tauriTargetName = `sidecar-${getTauriTargetTriple()}${ext}`;
  const tauriPath = path.join(tauriBinDir, tauriTargetName);

  fs.copyFileSync(outputPath, tauriPath);
  console.log(`✅ Copied to Tauri binaries: ${tauriPath}`);

} catch (error) {
  console.error('Failed to build binary:', error.message);
  process.exit(1);
}

function getTauriTargetTriple() {
  const map = {
    'win32-x64': 'x86_64-pc-windows-msvc',
    'darwin-x64': 'x86_64-apple-darwin',
    'darwin-arm64': 'aarch64-apple-darwin',
    'linux-x64': 'x86_64-unknown-linux-gnu',
    'linux-arm64': 'aarch64-unknown-linux-gnu'
  };
  return map[`${platform}-${arch}`] || `${arch}-unknown-${platform}-gnu`;
}
