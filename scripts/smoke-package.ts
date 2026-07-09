import { execFile, spawn } from "node:child_process";
import { mkdir, mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";

const exec = promisify(execFile);
const root = resolve(import.meta.dirname, "..");
const temporary = await mkdtemp(join(tmpdir(), "onshape-cadscript-smoke-"));

try {
  const tarballs = join(temporary, "tarballs");
  const install = join(temporary, "install");
  await mkdir(tarballs, { recursive: true });
  await mkdir(install, { recursive: true });
  await exec("npm", ["pack", "--ignore-scripts", "--pack-destination", tarballs], {
    cwd: resolve(root, "packages/cadscript"),
  });
  const tarballName = (await readdir(tarballs)).find((name) => name.endsWith(".tgz"));
  if (!tarballName) throw new Error("npm pack did not create a tarball");
  await exec("npm", ["install", "--prefix", install, join(tarballs, tarballName)]);

  const bin = join(install, "node_modules", ".bin");
  const cli = await exec(join(bin, "cadscript"), ["--version"]);
  if (cli.stdout.trim() !== "0.1.0") throw new Error(`Unexpected CLI version: ${cli.stdout}`);

  await new Promise<void>((resolvePromise, reject) => {
    const child = spawn(join(bin, "onshape-cadscript-mcp"), [], {
      stdio: ["pipe", "pipe", "pipe"],
    });
    let output = "";
    let errors = "";
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(`MCP initialize timed out. stdout=${output} stderr=${errors}`));
    }, 5_000);
    child.stdout.on("data", (chunk) => {
      output += chunk.toString();
      if (output.includes('"serverInfo":{"name":"onshape-cadscript"')) {
        clearTimeout(timer);
        child.kill();
        resolvePromise();
      }
    });
    child.stderr.on("data", (chunk) => {
      errors += chunk.toString();
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.stdin.write(
      `${JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-06-18",
          capabilities: {},
          clientInfo: { name: "package-smoke", version: "1" },
        },
      })}\n`,
    );
  });
  process.stdout.write("Clean package install, CLI, and MCP initialize smoke passed.\n");
} finally {
  await rm(temporary, { recursive: true, force: true });
}
