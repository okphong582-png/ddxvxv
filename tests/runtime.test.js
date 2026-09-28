const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const cp = require("node:child_process");
const { promisify } = require("node:util");
const root = path.join(__dirname, "..");
fs.mkdirSync(path.join(root, ".local"), { recursive: true });
process.env.DATA_DIR = fs.mkdtempSync(path.join(root, ".local/test-runtime-"));
process.env.BOT_AUTOSTART = "false";
const { archive } = require("../scripts/state-archive");
const { writeJson, readJson } = require("../lib/storage");
test("state archive encrypts private data and round-trips; wrong keys fail", () => {
  const key = "ab".repeat(32),
    file = path.join(process.env.DATA_DIR, "state.enc"),
    data = { users: { 123: { id: "123" } }, draft: "PRIVATE MESSAGE" };
  writeJson(path.join(process.env.DATA_DIR, "telegram.json"), data);
  archive("save", file, key);
  assert.ok(!fs.readFileSync(file).includes(Buffer.from("PRIVATE MESSAGE")));
  writeJson(path.join(process.env.DATA_DIR, "telegram.json"), {});
  archive("restore", file, key);
  assert.deepEqual(
    readJson(path.join(process.env.DATA_DIR, "telegram.json")),
    data,
  );
  assert.throws(() => archive("restore", file, "cd".repeat(32)));
});
test("supervisor restarts exited child and stops at configured duration", async () => {
  const file = path.join(process.env.DATA_DIR, "child.cjs"),
    runner = path.join(process.env.DATA_DIR, "runner.cjs");
  fs.writeFileSync(file, 'console.log("CHILD_STARTED");process.exit(1);');
  fs.writeFileSync(
    runner,
    "require(" +
      JSON.stringify(path.join(root, "runner-247.js")) +
      ").supervise({entry:" +
      JSON.stringify(file) +
      ",maxMs:6000,minDelay:20,maxDelay:50});",
  );
  const { stdout } = await promisify(cp.execFile)(process.execPath, [runner], {
    timeout: 15000,
    windowsHide: true,
  });
  assert.ok(stdout.split("CHILD_STARTED").length >= 3);
  assert.ok(stdout.includes("Đang dừng"));
});
