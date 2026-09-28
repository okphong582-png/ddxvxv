const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const zlib = require("node:zlib");
const { DATA_DIR, readJson, writeJson } = require("../lib/storage");
const FILES = ["history.json", "ai.json", "telegram.json", "endpoints.json"];
function archive(
  mode,
  file = path.join(__dirname, "..", ".state", "runtime.enc"),
  keyHex = process.env.STATE_ENCRYPTION_KEY,
) {
  if (!/^[a-f0-9]{64}$/i.test(keyHex || ""))
    throw Error("STATE_ENCRYPTION_KEY must contain 64 hex characters");
  const key = Buffer.from(keyHex, "hex");
  if (mode === "save") {
    const data = {};
    for (const name of FILES) {
      const v = readJson(path.join(DATA_DIR, name), null);
      if (v !== null) data[name] = v;
    }
    const iv = crypto.randomBytes(12),
      cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    const encrypted = Buffer.concat([
      cipher.update(zlib.gzipSync(JSON.stringify(data))),
      cipher.final(),
    ]);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, Buffer.concat([iv, cipher.getAuthTag(), encrypted]));
  } else if (mode === "restore") {
    if (!fs.existsSync(file)) return;
    const raw = fs.readFileSync(file),
      decipher = crypto.createDecipheriv(
        "aes-256-gcm",
        key,
        raw.subarray(0, 12),
      );
    decipher.setAuthTag(raw.subarray(12, 28));
    const data = JSON.parse(
      zlib.gunzipSync(
        Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]),
        { maxOutputLength: 50 * 1024 * 1024 },
      ),
    );
    for (const name of FILES)
      if (data[name]) writeJson(path.join(DATA_DIR, name), data[name]);
  } else throw Error("Mode must be save or restore");
}
if (require.main === module) {
  try {
    archive(process.argv[2]);
  } catch (e) {
    console.error("[State]", e.message);
    process.exitCode = 1;
  }
}
module.exports = { archive };
