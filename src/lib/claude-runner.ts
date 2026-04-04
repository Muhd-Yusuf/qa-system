import { spawn, type ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';

const SYSTEM_PROMPT_PATH = path.join(process.cwd(), 'src/prompts/qa-system-prompt.txt');

function createMcpConfig(): string {
  const config = {
    mcpServers: {
      playwright: {
        command: 'npx',
        args: ['@playwright/mcp@latest', '--headless'],
      },
    },
  };
  const configPath = path.join(os.tmpdir(), 'qa-mcp-config.json');
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  return configPath;
}

export function startClaudeRun({ url, requirements, auth, depth }: {
  url: string;
  requirements: string;
  auth?: { username: string; password: string };
  depth: string;
}): ChildProcess {
  const systemPrompt = fs.readFileSync(SYSTEM_PROMPT_PATH, 'utf-8');
  const mcpConfigPath = createMcpConfig();

  let userPrompt = `TARGET URL: ${url}\n\nTESTING REQUIREMENTS:\n${requirements}`;
  if (auth?.username) {
    userPrompt += `\n\nAUTH CREDENTIALS:\nUsername: ${auth.username}\nPassword: ${auth.password}`;
  }
  userPrompt += `\n\nTEST DEPTH: ${depth || 'standard'}`;

  return spawn('claude', [
    '--model', 'claude-sonnet-4-6',
    '--system-prompt', systemPrompt,
    '--allowedTools', 'mcp__playwright__*',
    '--mcp-config', mcpConfigPath,
    '--dangerously-skip-permissions',
    '-p', userPrompt,
    '--output-format', 'stream-json',
    '--verbose',
  ], {
    env: { ...process.env, CLAUDECODE: '' },
    // 'ignore' for stdin is critical — prevents claude from blocking waiting for input
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}
