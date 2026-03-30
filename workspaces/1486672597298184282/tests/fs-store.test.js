const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { createPaths } = require("../src/server/lib/paths");
const { ensureAppPaths, readJsonIfExists } = require("../src/server/lib/fs-store");

describe("fs-store", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates the exports directory when bootstrapping app paths", async () => {
    const baseDir = await fs.mkdtemp(path.join(os.tmpdir(), "autosprite-fs-store-"));
    const paths = createPaths(baseDir);

    await ensureAppPaths(paths);

    await expect(fs.access(paths.exportsDir)).resolves.toBeUndefined();
  });

  it("retries a transient ENOENT before treating a json file as missing", async () => {
    const filePath = "/tmp/autosprite-fs-store-transient.json";
    const missing = new Error("missing");
    missing.code = "ENOENT";
    const readFileSpy = vi
      .spyOn(fs, "readFile")
      .mockRejectedValueOnce(missing)
      .mockResolvedValueOnce('{"ok":true}\n');

    await expect(readJsonIfExists(filePath)).resolves.toEqual({ ok: true });
    expect(readFileSpy).toHaveBeenCalledTimes(2);
    expect(readFileSpy).toHaveBeenNthCalledWith(1, filePath, "utf8");
    expect(readFileSpy).toHaveBeenNthCalledWith(2, filePath, "utf8");
  });
});
