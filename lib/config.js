const fs = require("fs");
const path = require("path");

const { DATA_DIR, readJson, writeJson } = require("./storage");
const ENDPOINTS_FILE = path.join(DATA_DIR, "endpoints.json");

const DEFAULT_CHANNELS = [
  {
    id: "gb68_tx",
    platform: "68GB",
    icon: "🟢",
    gameName: "Bàn Xanh · Tài Xỉu",
    gameType: "taixiu",
    url: "https://winds-fonts-seq-jaguar.trycloudflare.com/api/68/thuong",
    active: true,
  },
  {
    id: "gb68_txmd5",
    platform: "68GB",
    icon: "🔴",
    gameName: "Bàn Đỏ · MD5",
    gameType: "taixiu",
    url: "https://objectives-scanning-list-reliance.trycloudflare.com/api/68/md5",
    active: true,
  },
  // --- Sunwin ---
  {
    id: "sunwin_tx",
    platform: "Sunwin",
    icon: "☀️",
    gameName: "Tài Xỉu Thường",
    gameType: "taixiu",
    url: "https://amongst-plots-called-dining.trycloudflare.com/api/tx",
    active: true,
  },
  {
    id: "sunwin_xdlive",
    platform: "Sunwin",
    icon: "☀️",
    gameName: "Xóc Đĩa Live",
    gameType: "xocdia",
    url: "https://genetic-feet-national-rivers.trycloudflare.com/api/xdlive/latest",
    active: true,
  },
  {
    id: "sunwin_sicbo",
    platform: "Sunwin",
    icon: "☀️",
    gameName: "Sicbo",
    gameType: "sicbo",
    url: "https://ent-glenn-terrain-project.trycloudflare.com/sicbo/sunwin",
    active: true,
  },

  // --- Hitclub / Go88 / Yo88 ---
  {
    id: "hitclub_tx",
    platform: "Hitclub / Go88",
    icon: "🔥",
    gameName: "Tài Xỉu Thường",
    gameType: "taixiu",
    url: "https://gossip-marriage-anime-variance.trycloudflare.com/api/tx",
    active: true,
  },
  {
    id: "hitclub_txmd5",
    platform: "Hitclub / Go88",
    icon: "🔥",
    gameName: "Tài Xỉu MD5",
    gameType: "taixiu",
    url: "https://gossip-marriage-anime-variance.trycloudflare.com/api/txmd5",
    active: true,
  },
  {
    id: "hitclub_sicbo",
    platform: "Hitclub / Go88",
    icon: "🔥",
    gameName: "Sicbo",
    gameType: "sicbo",
    url: "https://ent-glenn-terrain-project.trycloudflare.com/sicbo/hitclub",
    active: true,
  },

  // --- 789Club ---
  {
    id: "club789_tx",
    platform: "789Club",
    icon: "👑",
    gameName: "Tài Xỉu Thường",
    gameType: "taixiu",
    url: "https://scout-respect-metal-law.trycloudflare.com/api/tx",
    active: true,
  },
  {
    id: "club789_xdlive",
    platform: "789Club",
    icon: "👑",
    gameName: "Xóc Đĩa Live",
    gameType: "xocdia",
    url: "https://weekends-kingdom-throughout-adaptation.trycloudflare.com/api/xdlive/latest",
    active: true,
  },
  {
    id: "club789_sicbo",
    platform: "789Club",
    icon: "👑",
    gameName: "Sicbo",
    gameType: "sicbo",
    url: "https://ent-glenn-terrain-project.trycloudflare.com/sicbo/789club",
    active: true,
  },

  // --- B52 ---
  {
    id: "b52_tx",
    platform: "B52",
    icon: "✈️",
    gameName: "Tài Xỉu Thường",
    gameType: "taixiu",
    url: "https://volunteers-executives-granted-liz.trycloudflare.com/taixiu",
    active: true,
  },
  {
    id: "b52_txmd5",
    platform: "B52",
    icon: "✈️",
    gameName: "Tài Xỉu MD5",
    gameType: "taixiu",
    url: "https://volunteers-executives-granted-liz.trycloudflare.com/txmd5",
    active: true,
  },
  {
    id: "b52_sicbo",
    platform: "B52",
    icon: "✈️",
    gameName: "Sicbo",
    gameType: "sicbo",
    url: "https://ent-glenn-terrain-project.trycloudflare.com/sicbo/b52",
    active: true,
  },

  // --- Rikvip ---
  {
    id: "rikvip_tx",
    platform: "Rikvip",
    icon: "💎",
    gameName: "Tài Xỉu Thường",
    gameType: "taixiu",
    url: "https://adapter-suggesting-enormous-celebration.trycloudflare.com/api/tx",
    active: true,
  },
  {
    id: "rikvip_txmd5",
    platform: "Rikvip",
    icon: "💎",
    gameName: "Tài Xỉu MD5",
    gameType: "taixiu",
    url: "https://adapter-suggesting-enormous-celebration.trycloudflare.com/api/txmd5",
    active: true,
  },

  // --- LC79 ---
  {
    id: "lc79_tx",
    platform: "LC79",
    icon: "🔟",
    gameName: "Tài Xỉu Thường",
    gameType: "taixiu",
    url: "https://reported-prot-prefers-cattle.trycloudflare.com/api/tx",
    active: true,
  },
  {
    id: "lc79_txmd5",
    platform: "LC79",
    icon: "🔟",
    gameName: "Tài Xỉu MD5",
    gameType: "taixiu",
    url: "https://reported-prot-prefers-cattle.trycloudflare.com/api/txmd5",
    active: true,
  },
  {
    id: "lc79_xocdia",
    platform: "LC79",
    icon: "🔟",
    gameName: "Xóc Đĩa MD5",
    gameType: "xocdia",
    url: "https://reported-prot-prefers-cattle.trycloudflare.com/api/xocdia",
    active: true,
  },

  // --- Betvip ---
  {
    id: "betvip_tx",
    platform: "Betvip",
    icon: "🐧",
    gameName: "Tài Xỉu Thường",
    gameType: "taixiu",
    url: "https://paying-hon-bullet-sms.trycloudflare.com/api/tx",
    active: true,
  },
  {
    id: "betvip_txmd5",
    platform: "Betvip",
    icon: "🐧",
    gameName: "Tài Xỉu MD5",
    gameType: "taixiu",
    url: "https://paying-hon-bullet-sms.trycloudflare.com/api/txmd5",
    active: true,
  },

  // --- Son789 ---
  {
    id: "son789_tx",
    platform: "Son789",
    icon: "🎯",
    gameName: "Tài Xỉu Thường",
    gameType: "taixiu",
    url: "https://pregnancy-blake-debut-hybrid.trycloudflare.com/api/tx",
    active: true,
  },
  {
    id: "son789_txmd5",
    platform: "Son789",
    icon: "🎯",
    gameName: "Tài Xỉu MD5",
    gameType: "taixiu",
    url: "https://pregnancy-blake-debut-hybrid.trycloudflare.com/api/txmd5",
    active: true,
  },

  // --- Ta28 ---
  {
    id: "ta28_tx",
    platform: "Ta28",
    icon: "⚡",
    gameName: "Tài Xỉu Thường",
    gameType: "taixiu",
    url: "https://inform-england-organization-sample.trycloudflare.com/api/tx",
    active: true,
  },
  {
    id: "ta28_txmd5",
    platform: "Ta28",
    icon: "⚡",
    gameName: "Tài Xỉu MD5",
    gameType: "taixiu",
    url: "https://inform-england-organization-sample.trycloudflare.com/api/txmd5",
    active: true,
  },

  // --- Luck8 ---
  {
    id: "luck8_txmd5",
    platform: "Luck8",
    icon: "🍀",
    gameName: "Tài Xỉu MD5",
    gameType: "taixiu",
    url: "https://leslie-messaging-definitions-marble.trycloudflare.com/api/txmd5",
    active: true,
  },
  {
    id: "luck8_sicbo40",
    platform: "Luck8",
    icon: "🍀",
    gameName: "Sicbo 40 Giây",
    gameType: "sicbo",
    url: "https://leslie-messaging-definitions-marble.trycloudflare.com/api/sicbo40",
    active: true,
  },

  // --- Xocdia88 ---
  {
    id: "xocdia88_txmd5",
    platform: "Xocdia88",
    icon: "🎲",
    gameName: "Tài Xỉu MD5",
    gameType: "taixiu",
    url: "https://undo-possession-burke-checked.trycloudflare.com/api/txmd5",
    active: true,
  },

  // --- OGKFAN ---
  {
    id: "ogkfan_txmd5",
    platform: "OGKFAN",
    icon: "📎",
    gameName: "Tài Xỉu MD5",
    gameType: "taixiu",
    url: "https://writers-recommend-explicit-optimize.trycloudflare.com/api/txmd5/latest",
    active: true,
  },

  // --- Iwin ---
  {
    id: "iwin_tx",
    platform: "Iwin",
    icon: "💴",
    gameName: "Tài Xỉu Thường",
    gameType: "taixiu",
    url: "https://flu-prospect-coleman-subscriptions.trycloudflare.com/api/tx",
    active: true,
  },
  {
    id: "iwin_txmd5",
    platform: "Iwin",
    icon: "💴",
    gameName: "Tài Xỉu MD5",
    gameType: "taixiu",
    url: "https://flu-prospect-coleman-subscriptions.trycloudflare.com/api/txmd5",
    active: true,
  },

  // --- Max789 ---
  {
    id: "max789_tx",
    platform: "Max789",
    icon: "🐶",
    gameName: "Tài Xỉu Thường",
    gameType: "taixiu",
    url: "https://person-talent-mission-opening.trycloudflare.com/api/tx",
    active: true,
  },
  {
    id: "max789_txmd5",
    platform: "Max789",
    icon: "🐶",
    gameName: "Tài Xỉu MD5",
    gameType: "taixiu",
    url: "https://person-talent-mission-opening.trycloudflare.com/api/txmd5",
    active: true,
  },

  // --- Volta Sunwin & 789Club ---
  {
    id: "volta_general",
    platform: "Volta Sunwin & 789Club",
    icon: "🐧",
    gameName: "Volta bóng đá · không phải TX",
    gameType: "external",
    url: "https://exploration-channels-note-headline.trycloudflare.com/api/volta",
    active: false,
  },
];

function loadEndpoints() {
  const saved =
    readJson(ENDPOINTS_FILE, null) ||
    readJson(path.join(__dirname, "..", "data", "endpoints.json"), []);
  const overrides = new Map(saved.map((c) => [c.id, c]));
  return DEFAULT_CHANNELS.map((c) =>
    c.gameType === "external"
      ? c
      : { ...c, ...overrides.get(c.id), gameType: c.gameType },
  );
}
function saveEndpoints(channels) {
  writeJson(ENDPOINTS_FILE, channels);
}
function validateUrl(value) {
  try {
    const u = new URL(value);
    return (
      u.protocol === "https:" &&
      !u.username &&
      !u.password &&
      !u.port &&
      u.hostname.endsWith(".trycloudflare.com")
    );
  } catch {
    return false;
  }
}
function updateEndpointUrl(id, newUrl) {
  if (!validateUrl(newUrl)) return false;
  const channels = loadEndpoints(),
    target = channels.find((c) => c.id === id);
  if (!target) return false;
  target.url = newUrl.trim();
  saveEndpoints(channels);
  return true;
}
module.exports = {
  loadEndpoints,
  saveEndpoints,
  updateEndpointUrl,
  DEFAULT_CHANNELS,
  validateUrl,
};
