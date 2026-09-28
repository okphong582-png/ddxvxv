async function check() {
  if (!/^\d+:[\w-]+$/.test(process.env.TELEGRAM_BOT_TOKEN || ""))
    throw Error("Missing TELEGRAM_BOT_TOKEN in repository secrets");
  if (!/^[a-f0-9]{64}$/i.test(process.env.STATE_ENCRYPTION_KEY || ""))
    throw Error("Missing STATE_ENCRYPTION_KEY in repository secrets");
  const r = await fetch(
    "https://api.telegram.org/bot" + process.env.TELEGRAM_BOT_TOKEN + "/getMe",
    { signal: AbortSignal.timeout(15000) },
  );
  if (!r.ok)
    throw Error("Telegram rejected bot credentials (HTTP " + r.status + ")");
  const data = await r.json();
  if (!data.ok) throw Error("Telegram getMe failed");
  console.log("Telegram credentials verified");
}
check().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
