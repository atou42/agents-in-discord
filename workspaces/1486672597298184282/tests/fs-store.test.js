const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { createPaths } = require("../src/server/lib/paths");
const { ensureAppPaths, readJsonIfExists } = require("../src/server/lib/fs-store");

describe("fs-store", () => {
  it("creates the exports directory when bootstrapping app paths", async () => {
    const baseDir = await fs.mkdtemp(path.join(os.tmpdir(), "autosprite-fs-store-"));
    const paths = createPaths(baseDir);

    await ensureAppPaths(paths);

    await expect(fs.access(paths.exportsDir)).resolves.toBeUndefined();
  });

  it("retries a transient ENOENT before treating a json file as missing", async () => {
    const baseDir = await fs.mkdtemp(path.join(os.tmpdir(), "autosprite-fs-store-"));
    const filePath = path.join(baseDir, "transient.json");
    const writer = setTimeout(() => {
      fs.writeFile(filePath, '{"ok":true}\n', "utf8").catch(() => {});
    }, 1);

    await expect(readJsonIfExists(filePath)).resolves.toEqual({ ok: true });
    clearTimeout(writer);
  });
});
