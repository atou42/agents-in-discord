#!/usr/bin/env node
import fs from 'node:fs';
import http from 'node:http';
import { parseArgs } from 'node:util';
import { normalizeTaskInput } from '../src/local-task-submission.js';

const usage = `提交：node scripts/submit-task.mjs --socket /private/path/tasks.sock --request-id ID --parent CHANNEL_ID --source-thread THREAD_ID --title TITLE --prompt-file FILE [--share-source] [--authorization-message MESSAGE_ID]
查询：node scripts/submit-task.mjs --socket /private/path/tasks.sock --request-id ID --status
已有 thread：使用 --target-thread THREAD_ID 代替 --parent 和 --title；不可加 --share-source。
接收方配置 agent-messages 策略后无需 --authorization-message。--kind notify 只通知已有 thread，不触发运行；默认 task。stdout 为 JSON。`;

try {
  const { values } = parseArgs({ options: {
    socket: { type: 'string' }, 'request-id': { type: 'string' }, parent: { type: 'string' },
    'source-thread': { type: 'string' }, 'authorization-message': { type: 'string' },
    title: { type: 'string' }, 'prompt-file': { type: 'string' }, 'target-thread': { type: 'string' },
    'share-source': { type: 'boolean' }, status: { type: 'boolean' }, help: { type: 'boolean' },
    'timeout-ms': { type: 'string', default: '10000' },
    kind: { type: 'string' },
  } });
  if (values.help) {
    console.log(usage);
  } else {
    if (!values.socket || !values['request-id']) throw new Error('--socket and --request-id are required');
    const timeout = Number(values['timeout-ms']);
    if (!Number.isInteger(timeout) || timeout < 1 || timeout > 120000) throw new Error('timeout-ms must be 1..120000');
    let body;
    if (!values.status) {
      if (!values['prompt-file']) throw new Error('--prompt-file is required');
      const buffer = fs.readFileSync(values['prompt-file']);
      const prompt = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(buffer);
      if (values['target-thread'] && (values.parent || values.title || values['share-source'])) throw new Error('--target-thread cannot be combined with --parent, --title or --share-source');
      body = JSON.stringify(normalizeTaskInput({ requestId: values['request-id'],
        sourceThreadId: values['source-thread'], authorizationMessageId: values['authorization-message'],
        prompt, ...(values.kind ? { kind: values.kind } : {}), ...(values['target-thread'] ? { targetThreadId: values['target-thread'], workspaceMode: 'target' }
          : { parentId: values.parent, title: values.title, workspaceMode: values['share-source'] ? 'share-source' : 'isolated' }) }));
    } else if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(values['request-id'])) {
      throw new Error('invalid request ID');
    }
    const result = await new Promise((resolve, reject) => {
      const req = http.request({ socketPath: values.socket, method: values.status ? 'GET' : 'POST',
        path: values.status ? `/tasks/${values['request-id']}` : '/tasks',
        headers: body ? { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) } : {},
      }, (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('error', reject);
        res.on('end', () => {
          clearTimeout(timer);
          try { resolve({ code: res.statusCode, body: JSON.parse(Buffer.concat(chunks).toString('utf8')) }); }
          catch (err) { reject(err); }
        });
      });
      const timer = setTimeout(() => req.destroy(new Error('request timeout; acceptance unknown, query or resubmit the SAME request ID')), timeout);
      req.on('error', (err) => { clearTimeout(timer); reject(err); });
      req.end(body);
    });
    console.log(JSON.stringify(result.body));
    if (result.code >= 400 || ['failed', 'cancelled', 'interrupted', 'rejected'].includes(result.body.status)) process.exitCode = 1;
  }
} catch (err) {
  console.error(JSON.stringify({ error: err.message, status: 'unknown', hint: '查询或重提同一请求 ID；不要用新 ID 绕过不确定状态。' }));
  process.exitCode = 1;
}
