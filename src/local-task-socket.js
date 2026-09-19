import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import net from 'node:net';

export const MAX_REQUEST_BYTES = 800 * 1024;

function protectedDirectory(directory) {
  if (!path.isAbsolute(directory)) throw new Error('local task socket directory must be absolute');
  if (!fs.existsSync(directory)) fs.mkdirSync(directory, { mode: 0o700 });
  const stat = fs.lstatSync(directory);
  if (!stat.isDirectory() || stat.isSymbolicLink() || stat.uid !== process.getuid()
    || (stat.mode & 0o077) !== 0) throw new Error('local task directory must be owned by this UID with mode 0700');
  if (fs.realpathSync(directory) !== path.resolve(directory)) throw new Error('local task directory must not traverse symlinks');
}

async function removeStaleSocket(socketPath) {
  let stat;
  try { stat = fs.lstatSync(socketPath); } catch (err) { if (err.code === 'ENOENT') return; throw err; }
  if (!stat.isSocket() || stat.uid !== process.getuid()) throw new Error('refusing to replace non-owned/non-socket endpoint');
  await new Promise((resolve, reject) => {
    const probe = net.createConnection(socketPath);
    probe.once('connect', () => { probe.destroy(); reject(new Error('local task socket is already active')); });
    probe.once('error', (err) => {
      if (err.code === 'ECONNREFUSED') resolve();
      else reject(err);
    });
    probe.setTimeout(1000, () => { probe.destroy(); reject(new Error('existing socket probe timed out')); });
  });
  fs.unlinkSync(socketPath);
}

export async function startLocalTaskSocket({ directory, service, logger = console }) {
  protectedDirectory(directory);
  const socketPath = path.join(directory, 'tasks.sock');
  if (Buffer.byteLength(socketPath) > 100) throw new Error('Unix socket path is too long; use a shorter private directory');
  await removeStaleSocket(socketPath);
  const server = http.createServer(async (req, res) => {
    const reply = (code, body) => {
      res.writeHead(code, { 'content-type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(body));
    };
    try {
      if (req.method === 'GET' && /^\/tasks\/[a-zA-Z0-9_-]+$/.test(req.url)) {
        reply(200, service.get(req.url.slice('/tasks/'.length)));
        return;
      }
      if (req.method !== 'POST' || req.url !== '/tasks') { reply(404, { error: 'unknown endpoint' }); return; }
      const chunks = [];
      let bytes = 0;
      for await (const chunk of req) {
        bytes += chunk.length;
        if (bytes > MAX_REQUEST_BYTES) { reply(413, { error: 'request too large; not accepted' }); return; }
        chunks.push(chunk);
      }
      const result = service.submit(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      reply(202, result);
    } catch (err) {
      logger.error('local task request failed:', err);
      reply(String(err.message).includes('content differs') ? 409 : 400, { error: err.message });
    }
  });
  server.requestTimeout = 15_000;
  server.headersTimeout = 10_000;
  server.setTimeout(15_000, (socket) => socket.destroy());
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(socketPath, resolve);
  });
  try {
    fs.chmodSync(socketPath, 0o600);
    server.on('error', (err) => logger.error('local task socket error:', err));
    service.recover();
  } catch (err) {
    server.close();
    throw err;
  }
  return { socketPath, close: () => new Promise((resolve, reject) => server.close((err) => err ? reject(err) : resolve())) };
}
