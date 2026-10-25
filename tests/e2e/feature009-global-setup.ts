import { execFile } from "node:child_process";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

function pnpmEntry(): string {
  const candidates = [
    process.env["npm_execpath"],
    ...(process.env["PATH"] ?? "")
      .split(path.delimiter)
      .flatMap((directory) => [
        path.join(directory, "node_modules/pnpm/bin/pnpm.cjs"),
        path.join(directory, "pnpm"),
      ]),
  ];
  for (const candidate of candidates) {
    if (candidate === undefined || !existsSync(candidate)) continue;
    const entry = realpathSync(candidate);
    const manifest = path.resolve(path.dirname(entry), "../package.json");
    if (!existsSync(manifest)) continue;
    const packageInfo = JSON.parse(readFileSync(manifest, "utf8")) as { name?: string };
    if (packageInfo.name === "pnpm") return entry;
  }
  throw new Error("Cannot locate the installed pnpm JavaScript entry on PATH.");
}

export default async function feature009GlobalSetup(): Promise<void> {
  await execFileAsync(process.execPath, [pnpmEntry(), "--filter", "@web3d/minimal-host", "build"], {
    cwd: path.resolve(import.meta.dirname, "../.."),
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
}
