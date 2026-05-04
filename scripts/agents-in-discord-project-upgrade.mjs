#!/usr/bin/env node

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadRuntimeEnv } from '../src/env-loader.js';
import {
  createProjectUpgradeManager,
  formatProjectUpgradeReport,
  parseProjectUpgradeTextInput,
} from '../src/project-upgrade.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const envState = loadRuntimeEnv({ rootDir: ROOT, env: process.env });
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run') || process.env.AGENTS_IN_DISCORD_UPGRADE_DRY_RUN === '1';
const restart = args.includes('--restart') || process.env.AGENTS_IN_DISCORD_UPGRADE_RESTART === '1';
const actionText = args.filter((arg) => !arg.startsWith('--')).join(' ') || 'status';
const action = parseProjectUpgradeTextInput(actionText);
const manager = createProjectUpgradeManager({
  projectRoot: ROOT,
  env: process.env,
  envFilePath: envState.writableEnvFile,
});

try {
  if (action.type === 'set_mode') {
    console.log(formatProjectUpgradeReport(null, 'zh', { changedMode: manager.setMode(action.mode) }));
  } else if (action.type === 'apply') {
    const result = await manager.apply({ dryRun, restart });
    console.log(formatProjectUpgradeReport(null, 'zh', { applyResult: result }));
    if (!result.ok) process.exit(1);
  } else if (action.type === 'help') {
    console.log('用法：node scripts/agents-in-discord-project-upgrade.mjs <status|apply|off|notify|auto> [--dry-run] [--restart]');
  } else {
    console.log(formatProjectUpgradeReport(await manager.check({ fetch: true }), 'zh'));
  }
} catch (err) {
  console.error(String(err?.message || err));
  process.exit(1);
}
