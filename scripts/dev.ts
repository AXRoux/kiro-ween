// API on :8787 and Vite on :5173 together, with prefixed logs. Ctrl-C stops both.
import { spawn } from "bun";

const procs = [
  { name: "api", color: "\x1b[35m", cmd: ["bun", "--watch", "run", "server/index.ts"], env: { NODE_ENV: "development" } },
  { name: "web", color: "\x1b[33m", cmd: ["bunx", "vite"], env: {} },
].map(({ name, color, cmd, env }) => {
  const p = spawn({ cmd, env: { ...process.env, ...env }, stdout: "pipe", stderr: "pipe" });
  const pipe = async (stream: ReadableStream<Uint8Array>) => {
    const decoder = new TextDecoder();
    for await (const chunk of stream) for (const line of decoder.decode(chunk).split("\n")) if (line.trim()) console.log(`${color}[${name}]\x1b[0m ${line}`);
  };
  void pipe(p.stdout);
  void pipe(p.stderr);
  return p;
});

const stop = () => {
  for (const p of procs) p.kill();
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
await Promise.race(procs.map((p) => p.exited));
stop();
