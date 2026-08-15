const fs = require('fs');

let content = fs.readFileSync('server.ts', 'utf8');

const replacement = `
// --- JSON Database Persistence ---
const DB_FILE = path.join(process.cwd(), "database.json");

function saveDatabase() {
  const data = {
    validLicenseKeys: Array.from(validLicenseKeys.entries()),
    userAccounts: Array.from(userAccounts.entries()),
    userDevicesMap: Array.from(userDevicesMap.entries()),
    screenRecordAlertsMap: Array.from(screenRecordAlertsMap.entries()),
    videos: videos
  };
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf8");
}

function loadDatabase() {
  if (fs.existsSync(DB_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
      if (data.validLicenseKeys) {
        validLicenseKeys.clear();
        data.validLicenseKeys.forEach(([k, v]) => validLicenseKeys.set(k, v));
      }
      if (data.userAccounts) {
        userAccounts.clear();
        data.userAccounts.forEach(([k, v]) => userAccounts.set(k, v));
      }
      if (data.userDevicesMap) {
        userDevicesMap.clear();
        data.userDevicesMap.forEach(([k, v]) => userDevicesMap.set(k, v));
      }
      if (data.screenRecordAlertsMap) {
        screenRecordAlertsMap.clear();
        data.screenRecordAlertsMap.forEach(([k, v]) => screenRecordAlertsMap.set(k, v));
      }
      if (data.videos) {
        videos.length = 0;
        videos.push(...data.videos);
      }
      console.log("Database loaded from JSON.");
    } catch (e) {
      console.error("Error loading database.json:", e);
    }
  } else {
    console.log("No database.json found, starting fresh.");
  }
}

// Initial Load
loadDatabase();

// Auto-save every 10 seconds
setInterval(saveDatabase, 10000);
// ---------------------------------
`;

content = content.replace("const screenRecordAlertsMap = new Map<string, { count: number; lastAlert: number; details: string }>();", "const screenRecordAlertsMap = new Map<string, { count: number; lastAlert: number; details: string }>();\n" + replacement);

content = content.replace('import { createServer as createViteServer } from "vite";', 'import { createServer as createViteServer } from "vite";\nimport fs from "fs";');

fs.writeFileSync('server.ts', content, 'utf8');
