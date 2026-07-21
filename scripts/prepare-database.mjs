import { spawnSync } from "node:child_process";

if (process.env.VERCEL && (process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL)) {
  const executable = process.platform === "win32" ? "prisma.cmd" : "prisma";
  const result = spawnSync(executable, ["db", "push", "--accept-data-loss"], {
    cwd: process.cwd(),
    env: process.env,
    shell: process.platform === "win32",
    stdio: "inherit",
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
