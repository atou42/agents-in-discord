const fs = require("node:fs/promises");
const path = require("node:path");

const pendingWrites = new Map();

async function ensureAppPaths(paths) {
  const directories = [
    paths.runtimeDir,
    paths.storageDir,
    paths.dataDir,
    paths.uploadsDir,
    paths.posesDir,
    paths.sequencesDir,
    paths.videosDir,
    paths.sheetsDir,
    paths.atlasesDir,
    ...Object.values(paths.entityDirs),
  ];

  await Promise.all(directories.map((directory) => fs.mkdir(directory, { recursive: true })));
}

function entityFilePath(directory, id) {
  return path.join(directory, `${id}.json`);
}

function makeTempPath(filePath) {
  return `${filePath}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}.tmp`;
}

function queueFileWrite(filePath, writer) {
  const previous = pendingWrites.get(filePath) || Promise.resolve();
  const next = previous.catch(() => {}).then(writer);
  const tracked = next.finally(() => {
    if (pendingWrites.get(filePath) === tracked) {
      pendingWrites.delete(filePath);
    }
  });
  pendingWrites.set(filePath, tracked);
  return tracked;
}

async function waitForPendingWrite(filePath) {
  const pending = pendingWrites.get(filePath);
  if (pending) {
    await pending.catch(() => {});
  }
}

async function waitForPendingWritesInDirectory(directory) {
  const writes = [];
  for (const [filePath, pending] of pendingWrites.entries()) {
    if (path.dirname(filePath) === directory) {
      writes.push(pending.catch(() => {}));
    }
  }
  if (writes.length > 0) {
    await Promise.all(writes);
  }
}

async function writeJsonAtomic(filePath, value) {
  await queueFileWrite(filePath, async () => {
    const tempPath = makeTempPath(filePath);
    const payload = `${JSON.stringify(value, null, 2)}\n`;
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(tempPath, payload, "utf8");
    await fs.rename(tempPath, filePath);
  });
}

async function readJson(filePath) {
  await waitForPendingWrite(filePath);
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw);
}

async function readJsonIfExists(filePath) {
  try {
    return await readJson(filePath);
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return undefined;
    }
    throw error;
  }
}

async function listJson(directory) {
  await waitForPendingWritesInDirectory(directory);
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const jsonFiles = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));

  const values = [];
  for (const fileName of jsonFiles) {
    values.push(await readJson(path.join(directory, fileName)));
  }
  return values;
}

async function writeBufferAtomic(filePath, buffer) {
  await queueFileWrite(filePath, async () => {
    const tempPath = makeTempPath(filePath);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(tempPath, buffer);
    await fs.rename(tempPath, filePath);
  });
}

module.exports = {
  ensureAppPaths,
  entityFilePath,
  writeJsonAtomic,
  readJson,
  readJsonIfExists,
  listJson,
  writeBufferAtomic,
};
