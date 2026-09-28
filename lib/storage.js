const fs = require("node:fs");
const path = require("node:path");
const DATA_DIR = path.resolve(
  process.env.DATA_DIR || path.join(__dirname, "..", "data", "runtime"),
);
function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT")
      console.error("[Storage]", path.basename(file), error.message);
    return fallback;
  }
}
function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = file + ".tmp";
  fs.writeFileSync(temp, JSON.stringify(value, null, 2), { mode: 0o600 });
  fs.renameSync(temp, file);
}
module.exports = { DATA_DIR, readJson, writeJson };
