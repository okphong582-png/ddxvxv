const { spawn } = require("node:child_process");
const path = require("node:path");
function supervise({
  entry = path.join(__dirname, "server.js"),
  maxMs = Number(process.env.RUNNER_MAX_MS) || 290 * 60000,
  minDelay = 1000,
  maxDelay = 30000,
  healthUrl = process.env.RUNNER_HEALTH_URL || "http://127.0.0.1:3000/healthz",
} = {}) {
  let child = null,
    stopping = false,
    restartTimer,
    healthTimer,
    failures = 0,
    healthFailures = 0,
    probeActive = false,
    killTimer;
  const log = (message) => console.log("[Runner] " + message);
  const launch = () => {
    if (stopping) return;
    const started = Date.now();
    log("Khởi động server");
    child = spawn(process.execPath, [entry], {
      stdio: "inherit",
      env: process.env,
      windowsHide: true,
    });
    let exited = false;
    const restart = () => {
      if (exited) return;
      exited = true;
      clearTimeout(killTimer);
      if (stopping) return;
      failures = Date.now() - started > 60000 ? 0 : failures + 1;
      const delay = Math.min(
        maxDelay,
        minDelay * 2 ** Math.max(0, Math.min(failures - 1, 8)),
      );
      log("Chạy lại sau " + delay + "ms");
      restartTimer = setTimeout(launch, delay);
    };
    child.once("error", (e) => {
      log("Lỗi tiến trình: " + e.message);
      restart();
    });
    child.once("exit", restart);
  };
  const stop = () => {
    if (stopping) return;
    stopping = true;
    clearTimeout(restartTimer);
    clearInterval(healthTimer);
    clearTimeout(rotation);
    log("Đang dừng và lưu trạng thái");
    if (child && child.exitCode === null) {
      const c = child;
      c.kill("SIGTERM");
      killTimer = setTimeout(() => c.kill("SIGKILL"), 8000);
      c.once("exit", () => {
        clearTimeout(killTimer);
      });
    }
  };
  const rotation = setTimeout(stop, maxMs);
  healthTimer = setInterval(async () => {
    if (stopping || probeActive || !child || child.exitCode !== null) return;
    probeActive = true;
    try {
      const r = await fetch(healthUrl, { signal: AbortSignal.timeout(5000) });
      if (!r.ok) throw Error("Healthcheck failed");
      healthFailures = 0;
    } catch {
      if (++healthFailures >= 3) {
        healthFailures = 0;
        log("Healthcheck lỗi 3 lần; khởi động lại");
        const c = child;
        c.kill("SIGTERM");
        killTimer = setTimeout(() => c.kill("SIGKILL"), 8000);
      }
    } finally {
      probeActive = false;
    }
  }, 30000);
  process.once("SIGTERM", stop);
  process.once("SIGINT", stop);
  launch();
  return { stop };
}
if (require.main === module) supervise();
module.exports = { supervise };
