import express from "express";
import path from "path";
import cors from "cors";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import multer from "multer";
import ffmpeg from "fluent-ffmpeg";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: "500gb" }));
app.use(express.urlencoded({ limit: "500gb", extended: true }));


// In-memory Database for Demo
const validLicenseKeys = new Map<string, { expiresAt: number, deviceIds: string[] }>();
const ADMIN_KEY = "ADMIN-XMR-9999"; // Hardcoded admin key that never expires
const ADMIN_VLASSIS_KEY = "ADMIN-VLASSIS-2026"; // Read-only admin key with 3 devices limit

function isAdminKey(keyOrUser: string = ""): boolean {
  if (!keyOrUser) return false;
  const k = keyOrUser.trim();
  return k === ADMIN_KEY || k === ADMIN_VLASSIS_KEY || k.toLowerCase() === "admingctoons" || k.toLowerCase() === "admin" || k.toLowerCase() === "adminvlassis";
}

function isReadOnlyAdminKey(keyOrUser: string = ""): boolean {
  if (!keyOrUser) return false;
  const k = keyOrUser.trim();
  return k === ADMIN_VLASSIS_KEY || k.toLowerCase() === "adminvlassis";
}
const DEFAULT_EXPIRY = Date.now() + 365 * 24 * 60 * 60 * 1000;

const now = Date.now();
const DAY = 24 * 60 * 60 * 1000;

validLicenseKeys.set(ADMIN_KEY, { expiresAt: 9999999999999, deviceIds: ["dev-admin-pc"] });
validLicenseKeys.set(ADMIN_VLASSIS_KEY, { expiresAt: 9999999999999, deviceIds: ["dev_vlassis_pc_01", "dev_vlassis_phone_02"] });
validLicenseKeys.set("GC-DEMO-30DAYS", { expiresAt: now + 30 * DAY, deviceIds: ["dev-mobile-android", "dev-smart-tv"] });
validLicenseKeys.set("GC-GREEK-90DAYS", { expiresAt: now + 90 * DAY, deviceIds: ["dev-tablet-ipad"] });
validLicenseKeys.set("GC-PREMIUM-1YEAR", { expiresAt: now + 365 * DAY, deviceIds: ["dev-livingroom-tv"] });
validLicenseKeys.set("GC-VIP-2YEARS", { expiresAt: now + 730 * DAY, deviceIds: [] });
validLicenseKeys.set("GC-EXPIRED-KEY", { expiresAt: now - 5 * DAY, deviceIds: ["dev-old-phone"] });

// Anonymous Chat System Data Structure (RAM only, no logs)
export interface ChatMessage {
  id: string;
  sender: "user" | "admin";
  text: string;
  timestamp: number;
}

export interface ChatSession {
  sessionId: string;
  licenseKey: string;
  deviceId: string;
  status: "pending" | "active";
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
}

const chatSessions = new Map<string, ChatSession>();

function getClientIdentifier(req: express.Request, deviceId?: string): string {
  const ip = ((req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || '127.0.0.1').trim();
  return deviceId ? `${ip}_${deviceId}` : ip;
}

export interface Episode {
  id: string;
  episodeNumber: number;
  title: string;
  description: string;
  thumbnail: string;
  url: string;
}

interface Video {
  id: string;
  title: string;
  description: string;
  url: string; // The offshore object storage URL
  thumbnail: string;
  type: "movie" | "series";
  year?: string;
  episodes?: Episode[];
}

let videos: Video[] = [];

// Simple In-memory User Database (Username + Password)
export interface UserAccount {
  username: string;
  passwordHash: string;
  licenseKey: string;
  status: "pending" | "active";
  createdAt: number;
  expiresAt: number;
  deviceId?: string;
  renewalsCount?: number;
}

export interface ConnectedDevice {
  deviceId: string;
  deviceName: string;
  ip: string;
  lastActive: number;
}

const userAccounts = new Map<string, UserAccount>();
const userDevicesMap = new Map<string, ConnectedDevice[]>();
const screenRecordAlertsMap = new Map<string, { count: number; lastAlert: number; details: string }>();

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


function parseDeviceName(userAgent: string = "", customName?: string): string {
  if (customName && customName !== "dev-default" && !customName.startsWith("dev_")) {
    return customName;
  }
  if (/android/i.test(userAgent)) return "Android Συσκευή";
  if (/iphone|ipad|ipod/i.test(userAgent)) return "iPhone / iPad";
  if (/macintosh|mac os x/i.test(userAgent)) return "Mac Computer";
  if (/windows/i.test(userAgent)) return "Windows PC";
  if (/linux/i.test(userAgent)) return "Linux PC";
  return "Περιηγητής Web";
}

function registerUserDevice(userOrKey: string, deviceId: string, req: express.Request) {
  if (!userOrKey || !deviceId) return;
  const userAgent = (req.headers["user-agent"] as string) || "";
  const ip = ((req.headers["x-forwarded-for"] as string)?.split(",")[0] || req.socket.remoteAddress || "127.0.0.1").trim();
  const deviceName = parseDeviceName(userAgent, deviceId);

  const cleanKey = userOrKey.toLowerCase();
  let devices = userDevicesMap.get(cleanKey) || [];

  const existingIdx = devices.findIndex(d => d.deviceId === deviceId);
  if (existingIdx !== -1) {
    devices[existingIdx].lastActive = Date.now();
    devices[existingIdx].ip = ip;
    if (deviceName) devices[existingIdx].deviceName = deviceName;
  } else {
    devices.push({
      deviceId,
      deviceName,
      ip,
      lastActive: Date.now()
    });
  }

  userDevicesMap.set(cleanKey, devices);
}

// Default Admin users
userAccounts.set("admingctoons", {
  username: "admingctoons",
  passwordHash: "g6975767770",
  licenseKey: ADMIN_KEY,
  status: "active",
  createdAt: Date.now(),
  expiresAt: 9999999999999,
});

userAccounts.set("admin", {
  username: "admin",
  passwordHash: "admin",
  licenseKey: ADMIN_KEY,
  status: "active",
  createdAt: Date.now(),
  expiresAt: 9999999999999,
});

userAccounts.set("adminvlassis", {
  username: "adminvlassis",
  passwordHash: "adminVlassis132",
  licenseKey: ADMIN_VLASSIS_KEY,
  status: "active",
  createdAt: Date.now(),
  expiresAt: 9999999999999,
});

userDevicesMap.set("adminvlassis", [
  {
    deviceId: "dev_vlassis_pc_01",
    deviceName: "Windows PC (Vlassis Admin)",
    ip: "192.168.1.100",
    lastActive: Date.now() - 1000 * 60 * 5
  },
  {
    deviceId: "dev_vlassis_phone_02",
    deviceName: "iPhone / iPad (Vlassis)",
    ip: "192.168.1.101",
    lastActive: Date.now() - 1000 * 60 * 30
  }
]);
userDevicesMap.set(ADMIN_VLASSIS_KEY.toLowerCase(), userDevicesMap.get("adminvlassis")!);

// Default Non-Admin Active Test User
const DEMO_USER_KEY = "USER-DEMO-2026";
userAccounts.set("user", {
  username: "user",
  passwordHash: "user123",
  licenseKey: DEMO_USER_KEY,
  status: "active",
  createdAt: Date.now(),
  expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
  renewalsCount: 1,
});
validLicenseKeys.set(DEMO_USER_KEY, {
  expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
  deviceIds: ["dev_windows_pc_01", "dev_android_phone_02"]
});
userDevicesMap.set("user", [
  {
    deviceId: "dev_windows_pc_01",
    deviceName: "Windows PC (Home)",
    ip: "192.168.1.45",
    lastActive: Date.now() - 1000 * 60 * 15
  },
  {
    deviceId: "dev_android_phone_02",
    deviceName: "Android Συσκευή (Mobile)",
    ip: "192.168.1.88",
    lastActive: Date.now() - 1000 * 60 * 60 * 2
  }
]);
userDevicesMap.set(DEMO_USER_KEY.toLowerCase(), userDevicesMap.get("user")!);

// Helper to get or create chat session for a user/key
function getOrCreateSession(keyOrUsername: string, deviceId: string = "dev-default"): ChatSession {
  let session = chatSessions.get(keyOrUsername);
  if (!session) {
    const user = userAccounts.get(keyOrUsername);
    const keyData = validLicenseKeys.get(keyOrUsername);
    const isActive = keyOrUsername === "admin" || keyOrUsername === ADMIN_KEY || (user && user.status === "active") || (keyData && keyData.expiresAt > Date.now());
    const now = Date.now();

    session = {
      sessionId: `CHAT-${uuidv4().substring(0, 8).toUpperCase()}`,
      licenseKey: user ? user.licenseKey : keyOrUsername,
      deviceId,
      status: isActive ? "active" : "pending",
      createdAt: now,
      updatedAt: now,
      messages: [
        {
          id: `msg-${Date.now()}-welcome`,
          sender: "admin",
          text: "👋 Γεια σας! Ο λογαριασμός σας δημιουργήθηκε και βρίσκεται σε αναμονή ενεργοποίησης.\n\nΚατεβάστε την εφαρμογή Conversations ή στείλτε μας μήνυμα εδώ για να σας αποστείλουμε τις οδηγίες ενεργοποίησης. Μόλις παραλάβουμε την επιβεβαίωση, η πρόσβασή σας ενεργοποιείται αμέσως!",
          timestamp: now
        }
      ]
    };
    chatSessions.set(keyOrUsername, session);
    chatSessions.set(session.sessionId, session);
    chatSessions.set(session.licenseKey, session);
  }
  return session;
}

// --- API ROUTES ---

// 0. Sign Up Endpoint (Username + Password)
app.post("/api/signup", (req, res) => {
  const { username = "", password = "", deviceId = "dev-default" } = req.body;
  const cleanUsername = username.trim().toLowerCase();
  const cleanPassword = password.trim();

  if (!cleanUsername || cleanUsername.length < 3) {
    return res.status(400).json({ error: "Το όνομα χρήστη πρέπει να έχει τουλάχιστον 3 χαρακτήρες." });
  }

  if (!cleanPassword || cleanPassword.length < 3) {
    return res.status(400).json({ error: "Ο κωδικός πρόσβασης πρέπει να έχει τουλάχιστον 3 χαρακτήρες." });
  }

  if (userAccounts.has(cleanUsername)) {
    return res.status(400).json({ error: "Το όνομα χρήστη χρησιμοποιείται ήδη. Επιλέξτε άλλο." });
  }

  const generatedKey = `GC-${cleanUsername.toUpperCase()}-${uuidv4().substring(0, 4).toUpperCase()}`;
  const now = Date.now();

  const newUser: UserAccount = {
    username: cleanUsername,
    passwordHash: cleanPassword,
    licenseKey: generatedKey,
    status: "pending",
    createdAt: now,
    expiresAt: 0,
    deviceId,
    renewalsCount: 0
  };

  userAccounts.set(cleanUsername, newUser);
  validLicenseKeys.set(generatedKey, { expiresAt: 0, deviceIds: [deviceId] });

  registerUserDevice(cleanUsername, deviceId, req);
  registerUserDevice(generatedKey, deviceId, req);

  // Initialize Chat Session for this user
  getOrCreateSession(cleanUsername, deviceId);
  getOrCreateSession(generatedKey, deviceId);

  res.json({
    success: true,
    username: newUser.username,
    licenseKey: newUser.licenseKey,
    status: "pending",
    isAdmin: false,
    expiresAt: 0
  });
});

// 0.1 Login Endpoint (Username + Password OR License Key)
app.post("/api/login", (req, res) => {
  const { username = "", password = "", licenseKey = "", deviceId = "dev-default" } = req.body;
  const cleanUsername = (username || "").trim().toLowerCase();
  const cleanPassword = (password || "").trim();
  const trimmedKey = (licenseKey || "").trim().toUpperCase();

  // Admin instant login via key or admingctoons / admin credentials
  if (
    trimmedKey === ADMIN_KEY ||
    (cleanUsername === "admingctoons" && (cleanPassword === "g6975767770" || cleanPassword === "")) ||
    (cleanUsername === "admin" && (cleanPassword === "admin" || cleanPassword === "g6975767770" || cleanPassword === ""))
  ) {
    return res.json({
      success: true,
      username: cleanUsername || "admingctoons",
      isAdmin: true,
      isReadOnlyAdmin: false,
      status: "active",
      key: ADMIN_KEY,
      expiresAt: 9999999999999
    });
  }

  // Read-Only Limited Admin login (adminvlassis with max 3 devices)
  if (
    trimmedKey === ADMIN_VLASSIS_KEY ||
    (cleanUsername === "adminvlassis" && (cleanPassword === "adminVlassis132" || cleanPassword === ""))
  ) {
    const keyData = validLicenseKeys.get(ADMIN_VLASSIS_KEY) || { expiresAt: 9999999999999, deviceIds: [] };
    if (!keyData.deviceIds.includes(deviceId)) {
      if (keyData.deviceIds.length >= 3) {
        return res.status(403).json({
          error: "Ο λογαριασμός adminvlassis έχει φτάσει το μέγιστο όριο συσκευών (3 συσκευές)."
        });
      }
      keyData.deviceIds.push(deviceId);
      validLicenseKeys.set(ADMIN_VLASSIS_KEY, keyData);
    }
    registerUserDevice("adminvlassis", deviceId, req);
    registerUserDevice(ADMIN_VLASSIS_KEY, deviceId, req);

    return res.json({
      success: true,
      username: "adminvlassis",
      isAdmin: true,
      isReadOnlyAdmin: true,
      status: "active",
      key: ADMIN_VLASSIS_KEY,
      expiresAt: 9999999999999,
      deviceCount: keyData.deviceIds.length,
      maxDevices: 3
    });
  }

  // 1. Username + Password Auth Mode
  if (cleanUsername) {
    const user = userAccounts.get(cleanUsername);
    if (!user) {
      return res.status(400).json({ error: "Δεν βρέθηκε λογαριασμός με αυτό το όνομα χρήστη." });
    }

    if (user.passwordHash !== cleanPassword) {
      return res.status(400).json({ error: "Λανθασμένος κωδικός πρόσβασης." });
    }

    // Check expiration / pending status
    const keyData = validLicenseKeys.get(user.licenseKey);
    const now = Date.now();
    const isActive = (keyData && keyData.expiresAt > now) || user.status === "active";

    getOrCreateSession(user.username, deviceId);
    registerUserDevice(user.username, deviceId, req);
    registerUserDevice(user.licenseKey, deviceId, req);

    return res.json({
      success: true,
      username: user.username,
      key: user.licenseKey,
      isAdmin: false,
      status: isActive ? "active" : "pending",
      expiresAt: keyData?.expiresAt || user.expiresAt || 0
    });
  }

  // 2. License Key Auth Fallback
  if (trimmedKey) {
    // Check if matching username account exists
    let matchedUser: UserAccount | undefined;
    for (const u of userAccounts.values()) {
      if (u.licenseKey === trimmedKey) {
        matchedUser = u;
        break;
      }
    }

    if (!validLicenseKeys.has(trimmedKey) && !matchedUser) {
      // Auto-provision pending license key
      validLicenseKeys.set(trimmedKey, { expiresAt: 0, deviceIds: [deviceId] });
    }

    const keyData = validLicenseKeys.get(trimmedKey);
    const now = Date.now();
    const isActive = (keyData && keyData.expiresAt > now) || (matchedUser && matchedUser.status === "active");

    getOrCreateSession(trimmedKey, deviceId);

    return res.json({
      success: true,
      username: matchedUser ? matchedUser.username : trimmedKey,
      key: trimmedKey,
      isAdmin: false,
      status: isActive ? "active" : "pending",
      expiresAt: keyData?.expiresAt || 0
    });
  }

  return res.status(400).json({ error: "Παρακαλώ συμπληρώστε όνομα χρήστη και κωδικό πρόσβασης." });
});

// 0.2 Check User Status Endpoint
app.post("/api/user-status", (req, res) => {
  const { username = "", licenseKey = "" } = req.body;
  const cleanUsername = (username || "").trim().toLowerCase();
  const trimmedKey = (licenseKey || "").trim().toUpperCase();

  if (cleanUsername === "admin" || cleanUsername === "admingctoons" || trimmedKey === ADMIN_KEY) {
    return res.json({ status: "active", isAdmin: true, isReadOnlyAdmin: false });
  }

  if (cleanUsername === "adminvlassis" || trimmedKey === ADMIN_VLASSIS_KEY) {
    return res.json({ status: "active", isAdmin: true, isReadOnlyAdmin: true });
  }

  if (cleanUsername) {
    const user = userAccounts.get(cleanUsername);
    if (user) {
      const keyData = validLicenseKeys.get(user.licenseKey);
      const now = Date.now();
      const isActive = (keyData && keyData.expiresAt > now) || user.status === "active";
      return res.json({ status: isActive ? "active" : "pending", isAdmin: false });
    }
  }

  if (trimmedKey) {
    const keyData = validLicenseKeys.get(trimmedKey);
    const now = Date.now();
    const isActive = (keyData && keyData.expiresAt > now);
    return res.json({ status: isActive ? "active" : "pending", isAdmin: false });
  }

  return res.json({ status: "pending", isAdmin: false });
});

// --- ANONYMOUS CHAT & ACTIVATION SYSTEM ENDPOINTS ---

// 1. Get or Create Anonymous Chat Session
app.post("/api/chat/session", (req, res) => {
  const { licenseKey = "", deviceId = "dev-default" } = req.body;
  const trimmedKey = (licenseKey || "").trim().toUpperCase();

  // Find existing session or create new
  let sessionKey = trimmedKey || `PENDING-${deviceId}`;
  let session = chatSessions.get(sessionKey);

  const keyData = validLicenseKeys.get(trimmedKey);
  const now = Date.now();
  const isActive = trimmedKey === ADMIN_KEY || (keyData && keyData.expiresAt > now);

  if (!session) {
    const sessionId = `CHAT-${uuidv4().substring(0, 8).toUpperCase()}`;
    const initialKey = trimmedKey || `GC-PENDING-${uuidv4().substring(0, 6).toUpperCase()}`;

    // Provision pending key if doesn't exist
    if (!validLicenseKeys.has(initialKey) && initialKey !== ADMIN_KEY) {
      validLicenseKeys.set(initialKey, { expiresAt: 0, deviceIds: [deviceId] }); // 0 means pending activation
    }

    session = {
      sessionId,
      licenseKey: initialKey,
      deviceId,
      status: isActive ? "active" : "pending",
      createdAt: now,
      updatedAt: now,
      messages: [
        {
          id: `msg-${Date.now()}-welcome`,
          sender: "admin",
          text: "👋 Γεια σας! Ο λογαριασμός σας βρίσκεται σε αναμονή ενεργοποίησης.\n\nΣτείλτε μας μήνυμα εδώ για να σας αποστείλουμε τη διεύθυνση θυρίδας BoxNow και τις οδηγίες κατάθεσης χρημάτων. Μόλις παραλάβουμε την κατάθεση, η πρόσβασή σας ενεργοποιείται αμέσως!",
          timestamp: now
        }
      ]
    };

    chatSessions.set(session.licenseKey, session);
    chatSessions.set(session.sessionId, session);
  } else {
    // Update active status dynamically
    session.status = isActive ? "active" : "pending";
  }

  res.json({
    sessionId: session.sessionId,
    licenseKey: session.licenseKey,
    status: session.status,
    messages: session.messages,
    expiresAt: keyData?.expiresAt || 0
  });
});

// 2. Fetch Anonymous Chat Messages
app.get("/api/chat/messages", (req, res) => {
  const sessionId = (req.query.sessionId as string || "").trim();
  const session = chatSessions.get(sessionId);

  if (!session) {
    return res.status(404).json({ error: "Η συνεδρία συνομιλίας δεν βρέθηκε." });
  }

  // Check current license key expiration status
  const keyData = validLicenseKeys.get(session.licenseKey);
  const isActive = session.licenseKey === ADMIN_KEY || (keyData && keyData.expiresAt > Date.now());
  session.status = isActive ? "active" : "pending";

  res.json({
    sessionId: session.sessionId,
    licenseKey: session.licenseKey,
    status: session.status,
    messages: session.messages,
    expiresAt: keyData?.expiresAt || 0
  });
});

// 3. User Sends Message in Chat
app.post("/api/chat/send", (req, res) => {
  const { sessionId, text } = req.body;
  const session = chatSessions.get(sessionId);

  if (!session) {
    return res.status(404).json({ error: "Η συνεδρία συνομιλίας δεν βρέθηκε." });
  }

  if (!text || !text.trim()) {
    return res.status(400).json({ error: "Το μήνυμα δεν μπορεί να είναι κενό." });
  }

  const userMsg: ChatMessage = {
    id: `msg-${Date.now()}-${uuidv4().substring(0, 4)}`,
    sender: "user",
    text: text.trim(),
    timestamp: Date.now()
  };

  session.messages.push(userMsg);
  session.updatedAt = Date.now();

  res.json({ success: true, messages: session.messages });
});

// 4. Admin: List All Customer Chats
app.get("/api/admin/chats", (req, res) => {
  const adminKey = (req.headers["x-admin-key"] as string) || (req.query.adminKey as string);
  if (!isAdminKey(adminKey)) {
    return res.status(403).json({ error: "Δεν έχετε δικαιώματα διαχειριστή." });
  }

  const isReadOnly = isReadOnlyAdminKey(adminKey);

  // Deduplicate and return list sorted by last activity
  const uniqueSessionsMap = new Map<string, ChatSession>();
  chatSessions.forEach((sess) => {
    uniqueSessionsMap.set(sess.sessionId, sess);
  });

  let list = Array.from(uniqueSessionsMap.values())
    .map(sess => {
      const keyData = validLicenseKeys.get(sess.licenseKey);
      const isActive = sess.licenseKey === ADMIN_KEY || sess.licenseKey === ADMIN_VLASSIS_KEY || (keyData && keyData.expiresAt > Date.now());
      return {
        ...sess,
        status: isActive ? "active" : "pending",
        expiresAt: keyData?.expiresAt || 0,
        daysRemaining: keyData ? Math.max(0, Math.ceil((keyData.expiresAt - Date.now()) / (24 * 60 * 60 * 1000))) : 0
      };
    });

  if (isReadOnly) {
    list = list.filter(s => s.status === "active");
  }

  list.sort((a, b) => b.updatedAt - a.updatedAt);

  res.json({ chats: list, isReadOnly });
});

// 5. Admin: Reply to Customer Chat
app.post("/api/admin/chat/reply", (req, res) => {
  const { adminKey, sessionId, text } = req.body;
  if (!isAdminKey(adminKey)) {
    return res.status(403).json({ error: "Δεν έχετε δικαιώματα διαχειριστή." });
  }
  if (isReadOnlyAdminKey(adminKey)) {
    return res.status(403).json({ error: "Ο λογαριασμός adminvlassis έχει δικαίωμα μόνο προβολής." });
  }

  const session = chatSessions.get(sessionId);
  if (!session) {
    return res.status(404).json({ error: "Η συνεδρία συνομιλίας δεν βρέθηκε." });
  }

  if (!text || !text.trim()) {
    return res.status(400).json({ error: "Το μήνυμα δεν μπορεί να είναι κενό." });
  }

  const adminMsg: ChatMessage = {
    id: `msg-${Date.now()}-${uuidv4().substring(0, 4)}`,
    sender: "admin",
    text: text.trim(),
    timestamp: Date.now()
  };

  session.messages.push(adminMsg);
  session.updatedAt = Date.now();

  res.json({ success: true, messages: session.messages });
});

// 6. Admin: Activate User Access directly from Chat
app.post("/api/admin/chat/activate", (req, res) => {
  const { adminKey, sessionId, days = 30 } = req.body;
  if (!isAdminKey(adminKey)) {
    return res.status(403).json({ error: "Δεν έχετε δικαιώματα διαχειριστή." });
  }
  if (isReadOnlyAdminKey(adminKey)) {
    return res.status(403).json({ error: "Ο λογαριασμός adminvlassis έχει δικαίωμα μόνο προβολής." });
  }

  const session = chatSessions.get(sessionId);
  if (!session) {
    return res.status(404).json({ error: "Η συνεδρία συνομιλίας δεν βρέθηκε." });
  }

  const now = Date.now();
  const durationMs = days * 24 * 60 * 60 * 1000;
  const newExpiresAt = now + durationMs;

  // Update License Key in RAM storage
  const keyData = validLicenseKeys.get(session.licenseKey) || { expiresAt: 0, deviceIds: [] };
  keyData.expiresAt = newExpiresAt;
  validLicenseKeys.set(session.licenseKey, keyData);

  session.status = "active";
  session.updatedAt = now;

  // Update associated user account if found
  const user = userAccounts.get(session.licenseKey) || Array.from(userAccounts.values()).find(u => u.licenseKey === session.licenseKey);
  if (user) {
    user.status = "active";
    user.expiresAt = newExpiresAt;
    user.renewalsCount = (user.renewalsCount || 0) + 1;
  }

  // Append confirmation message to chat
  const confirmMsg: ChatMessage = {
    id: `msg-${now}-activation`,
    sender: "admin",
    text: `🎉 ΣΥΓΧΑΡΗΤΗΡΙΑ! Η συνδρομή σας ενεργοποιήθηκε επιτυχώς για +${days} ημέρες (Λήξη: ${new Date(newExpiresAt).toLocaleDateString('el-GR')}). Έχετε τώρα πλήρη πρόσβαση σε όλες τις ταινίες και σειρές!`,
    timestamp: now
  };
  session.messages.push(confirmMsg);

  res.json({
    success: true,
    status: "active",
    licenseKey: session.licenseKey,
    expiresAt: newExpiresAt,
    messages: session.messages
  });
});

// 7. Login (Validate License Key)
app.post("/api/login", (req, res) => {
  const { licenseKey, deviceId = "dev-default" } = req.body;
  const trimmedKey = (licenseKey || "").trim();
  
  // Allow empty or dev key for instant login as admin
  if (!trimmedKey || trimmedKey.toLowerCase() === "dev") {
    return res.json({
      success: true,
      isAdmin: true,
      status: "active",
      key: "ADMIN-XMR-9999",
      expiresAt: 9999999999999,
      deviceCount: 1,
      maxDevices: 3
    });
  }
  
  // Provision key if new
  if (!validLicenseKeys.has(trimmedKey)) {
    validLicenseKeys.set(trimmedKey, {
      expiresAt: 0, // Pending initial activation
      deviceIds: [deviceId]
    });
  }

  const data = validLicenseKeys.get(trimmedKey)!;
  const now = Date.now();
  const isAdmin = trimmedKey === ADMIN_KEY;
  const isExpiredOrPending = !isAdmin && data.expiresAt < now;

  // Check device limit (Maximum 3 devices per key)
  if (!isAdmin) {
    if (!data.deviceIds.includes(deviceId)) {
      if (data.deviceIds.length >= 3) {
        return res.status(403).json({
          error: "Το License Key χρησιμοποιείται ήδη στο μέγιστο όριο (3 συσκευές)."
        });
      }
      data.deviceIds.push(deviceId);
      validLicenseKeys.set(trimmedKey, data);
    }
  }

  res.json({
    success: true,
    isAdmin,
    status: isExpiredOrPending ? "pending" : "active",
    key: trimmedKey,
    expiresAt: data.expiresAt,
    deviceCount: data.deviceIds.length || 1,
    maxDevices: 3
  });
});

// --- ADMIN USER APPROVAL & TESTING BYPASS ENDPOINTS ---

// 1. Admin: Fetch All User Accounts
app.get("/api/admin/users", (req, res) => {
  const adminKey = (req.headers["x-admin-key"] as string) || (req.query.adminKey as string);
  if (!isAdminKey(adminKey)) {
    return res.status(403).json({ error: "Δεν έχετε δικαιώματα διαχειριστή." });
  }

  const isReadOnly = isReadOnlyAdminKey(adminKey);
  const now = Date.now();
  let list = Array.from(userAccounts.values())
    .filter(u => u.username !== "admin" && u.username !== "admingctoons" && u.username !== "adminvlassis")
    .map(u => {
      const keyData = validLicenseKeys.get(u.licenseKey);
      const expiresAt = keyData ? keyData.expiresAt : u.expiresAt;
      const isActive = u.status === "active" || (expiresAt > now);
      const msRemaining = expiresAt - now;
      const daysRemaining = Math.max(0, Math.ceil(msRemaining / (24 * 60 * 60 * 1000)));

      const alertInfo = screenRecordAlertsMap.get(u.username.toLowerCase()) ||
                        screenRecordAlertsMap.get(u.licenseKey.toUpperCase()) ||
                        { count: 0, lastAlert: 0, details: "" };

      return {
        username: u.username,
        licenseKey: u.licenseKey,
        status: isActive ? "active" : "pending",
        createdAt: u.createdAt,
        expiresAt: expiresAt,
        daysRemaining: daysRemaining,
        renewalsCount: u.renewalsCount !== undefined ? u.renewalsCount : (isActive ? 1 : 0),
        isAdmin: false,
        screenRecordAlertsCount: alertInfo.count,
        lastScreenRecordAlert: alertInfo.lastAlert,
        screenRecordDetails: alertInfo.details
      };
    });

  // Read-only admin can ONLY see ACTIVE subscriptions
  if (isReadOnly) {
    list = list.filter(u => u.status === "active" && u.expiresAt > now);
  }

  list.sort((a, b) => {
    if (a.screenRecordAlertsCount > 0 && b.screenRecordAlertsCount === 0) return -1;
    if (a.screenRecordAlertsCount === 0 && b.screenRecordAlertsCount > 0) return 1;
    if (a.status === "pending" && b.status !== "pending") return -1;
    if (a.status !== "pending" && b.status === "pending") return 1;
    return b.createdAt - a.createdAt;
  });

  res.json({ users: list, isReadOnly });
});

// Security: Screen Recording Alert Trigger Endpoint
app.post("/api/security/screen-record-alert", (req, res) => {
  const { username = "", licenseKey = "", deviceId = "dev-default", details = "Προσπάθεια Screen Recording" } = req.body;
  const cleanUsername = (username || "").trim().toLowerCase();
  const cleanKey = (licenseKey || "").trim().toUpperCase();

  const now = Date.now();
  const lookup = cleanUsername || cleanKey || "unknown";

  const existing = screenRecordAlertsMap.get(lookup) || { count: 0, lastAlert: 0, details: "" };
  existing.count += 1;
  existing.lastAlert = now;
  existing.details = details;

  screenRecordAlertsMap.set(lookup, existing);
  if (cleanUsername) screenRecordAlertsMap.set(cleanUsername, existing);
  if (cleanKey) screenRecordAlertsMap.set(cleanKey, existing);

  console.warn(`[SECURITY ALERT] Screen recording attempt for user '${lookup}' on device '${deviceId}' at ${new Date(now).toISOString()}`);

  res.json({ success: true, count: existing.count, lastAlert: now });
});

// Admin: Clear Security Alerts for User
app.post("/api/admin/users/clear-alerts", (req, res) => {
  const { adminKey, username } = req.body;
  if (!isAdminKey(adminKey)) {
    return res.status(403).json({ error: "Δεν έχετε δικαιώματα διαχειριστή." });
  }
  if (isReadOnlyAdminKey(adminKey)) {
    return res.status(403).json({ error: "Ο λογαριασμός adminvlassis έχει δικαίωμα μόνο προβολής." });
  }

  const cleanUser = (username || "").trim().toLowerCase();
  if (cleanUser) {
    screenRecordAlertsMap.delete(cleanUser);
    if (userAccounts.has(cleanUser)) {
      screenRecordAlertsMap.delete(userAccounts.get(cleanUser)!.licenseKey);
    }
  }

  res.json({ success: true, message: "Οι ειδοποιήσεις ασφαλείας εκκαθαρίστηκαν." });
});

// User: Fetch Connected Devices
app.post("/api/user/devices", (req, res) => {
  const { username = "", licenseKey = "", deviceId = "dev-default" } = req.body;
  const cleanUsername = (username || "").trim().toLowerCase();
  const cleanKey = (licenseKey || "").trim().toUpperCase();

  if (cleanUsername) registerUserDevice(cleanUsername, deviceId, req);
  if (cleanKey) registerUserDevice(cleanKey, deviceId, req);

  const lookupKey = cleanUsername || cleanKey;
  let rawDevices = userDevicesMap.get(lookupKey) || [];

  if (rawDevices.length === 0) {
    const user = userAccounts.get(cleanUsername);
    const targetKey = cleanKey || (user ? user.licenseKey : "");
    const keyData = validLicenseKeys.get(targetKey);

    const userAgent = (req.headers["user-agent"] as string) || "";
    const ip = ((req.headers["x-forwarded-for"] as string)?.split(",")[0] || req.socket.remoteAddress || "127.0.0.1").trim();

    if (keyData && keyData.deviceIds && keyData.deviceIds.length > 0) {
      rawDevices = keyData.deviceIds.map(dId => ({
        deviceId: dId,
        deviceName: parseDeviceName(userAgent, dId),
        ip,
        lastActive: Date.now()
      }));
    } else {
      rawDevices = [{
        deviceId,
        deviceName: parseDeviceName(userAgent, deviceId),
        ip,
        lastActive: Date.now()
      }];
    }
    userDevicesMap.set(lookupKey, rawDevices);
  }

  const formatted = rawDevices.map(d => ({
    ...d,
    isCurrent: d.deviceId === deviceId
  }));

  res.json({ success: true, devices: formatted });
});

// User: Delete / Disconnect Device
app.post("/api/user/devices/delete", (req, res) => {
  const { username = "", licenseKey = "", deviceId = "dev-default", deviceIdToDelete } = req.body;
  const cleanUsername = (username || "").trim().toLowerCase();
  const cleanKey = (licenseKey || "").trim().toUpperCase();

  if (!deviceIdToDelete) {
    return res.status(400).json({ error: "Δεν ορίστηκε η συσκευή προς διαγραφή." });
  }

  const lookupKey = cleanUsername || cleanKey;
  let rawDevices = userDevicesMap.get(lookupKey) || [];

  rawDevices = rawDevices.filter(d => d.deviceId !== deviceIdToDelete);
  userDevicesMap.set(lookupKey, rawDevices);
  if (cleanUsername) userDevicesMap.set(cleanUsername, rawDevices);
  if (cleanKey) userDevicesMap.set(cleanKey, rawDevices);

  let targetLicenseKey = cleanKey;
  if (!targetLicenseKey && cleanUsername && userAccounts.has(cleanUsername)) {
    targetLicenseKey = userAccounts.get(cleanUsername)!.licenseKey;
  }
  if (targetLicenseKey && validLicenseKeys.has(targetLicenseKey)) {
    const keyData = validLicenseKeys.get(targetLicenseKey)!;
    keyData.deviceIds = keyData.deviceIds.filter(d => d !== deviceIdToDelete);
    validLicenseKeys.set(targetLicenseKey, keyData);
  }

  const isCurrentDeleted = deviceIdToDelete === deviceId;

  const formatted = rawDevices.map(d => ({
    ...d,
    isCurrent: d.deviceId === deviceId
  }));

  res.json({
    success: true,
    devices: formatted,
    deletedCurrent: isCurrentDeleted,
    message: isCurrentDeleted ? "Αποσυνδεθήκατε από αυτή τη συσκευή." : "Η συσκευή αφαιρέθηκε επιτυχώς."
  });
});

// 2. Admin: Approve User (Set/Reset access duration to specified days)
app.post("/api/admin/users/approve", (req, res) => {
  const { adminKey, username, days = 30 } = req.body;
  if (!isAdminKey(adminKey)) {
    return res.status(403).json({ error: "Δεν έχετε δικαιώματα διαχειριστή." });
  }
  if (isReadOnlyAdminKey(adminKey)) {
    return res.status(403).json({ error: "Ο λογαριασμός adminvlassis έχει δικαίωμα μόνο προβολής ενεργών συνδρομών και δεν μπορεί να κάνει αλλαγές ή ανανεώσεις." });
  }

  const cleanUsername = (username || "").trim().toLowerCase();
  const user = userAccounts.get(cleanUsername);

  if (!user) {
    return res.status(404).json({ error: "Ο χρήστης δεν βρέθηκε." });
  }

  const now = Date.now();
  const durationMs = days * 24 * 60 * 60 * 1000;
  // Reset subscription duration to exactly 'days' from NOW
  const newExpiresAt = now + durationMs;

  user.status = "active";
  user.expiresAt = newExpiresAt;
  user.renewalsCount = (user.renewalsCount || 0) + 1;
  userAccounts.set(cleanUsername, user);

  // Update License Key Expiration in validLicenseKeys map
  const keyData = validLicenseKeys.get(user.licenseKey) || { expiresAt: 0, deviceIds: [] };
  keyData.expiresAt = newExpiresAt;
  validLicenseKeys.set(user.licenseKey, keyData);

  // Update Chat Session if present
  const chat = chatSessions.get(cleanUsername) || chatSessions.get(user.licenseKey);
  if (chat) {
    chat.status = "active";
    chat.updatedAt = now;
    chat.messages.push({
      id: `msg-${now}-approve`,
      sender: "admin",
      text: `🎉 Ο λογαριασμός σας (${user.username}) εγκρίθηκε και ενεργοποιήθηκε για +${days} ημέρες! (Νέα λήξη: ${new Date(newExpiresAt).toLocaleDateString('el-GR')}).`,
      timestamp: now
    });
  }

  res.json({
    success: true,
    username: user.username,
    licenseKey: user.licenseKey,
    status: "active",
    expiresAt: newExpiresAt,
    daysRemaining: Math.ceil((newExpiresAt - now) / (24 * 60 * 60 * 1000))
  });
});

// 3. User Testing Phase Bypass Activation Endpoint
app.post("/api/test-bypass-activation", (req, res) => {
  const { username = "", licenseKey = "" } = req.body;
  const cleanUsername = (username || "").trim().toLowerCase();
  const trimmedKey = (licenseKey || "").trim().toUpperCase();

  const now = Date.now();
  const durationMs = 30 * 24 * 60 * 60 * 1000;
  const newExpiresAt = now + durationMs;

  if (cleanUsername && userAccounts.has(cleanUsername)) {
    const user = userAccounts.get(cleanUsername)!;
    user.status = "active";
    user.expiresAt = newExpiresAt;
    userAccounts.set(cleanUsername, user);

    const keyData = validLicenseKeys.get(user.licenseKey) || { expiresAt: 0, deviceIds: [] };
    keyData.expiresAt = newExpiresAt;
    validLicenseKeys.set(user.licenseKey, keyData);
  }

  if (trimmedKey) {
    const keyData = validLicenseKeys.get(trimmedKey) || { expiresAt: 0, deviceIds: [] };
    keyData.expiresAt = newExpiresAt;
    validLicenseKeys.set(trimmedKey, keyData);
  }

  res.json({ success: true, status: "active", expiresAt: newExpiresAt });
});

// Admin License Key Management Routes
app.get("/api/admin/licenses", (req, res) => {
  const adminKey = (req.headers["x-admin-key"] as string) || (req.query.adminKey as string);
  if (!isAdminKey(adminKey)) {
    return res.status(403).json({ error: "Δεν έχετε δικαιώματα διαχειριστή." });
  }

  const isReadOnly = isReadOnlyAdminKey(adminKey);
  const now = Date.now();
  let list = Array.from(validLicenseKeys.entries()).map(([key, data]) => {
    const isInfinite = data.expiresAt > 9000000000000;
    const msRemaining = isInfinite ? Infinity : data.expiresAt - now;
    const daysRemaining = isInfinite ? 9999 : Math.max(0, Math.ceil(msRemaining / (24 * 60 * 60 * 1000)));
    const isExpired = !isInfinite && data.expiresAt < now;

    return {
      key,
      expiresAt: data.expiresAt,
      daysRemaining,
      isInfinite,
      status: isExpired ? "expired" : "active",
      deviceCount: data.deviceIds.length,
      maxDevices: 3,
      deviceIds: data.deviceIds,
      isAdminKey: key === ADMIN_KEY || key === ADMIN_VLASSIS_KEY
    };
  });

  if (isReadOnly) {
    list = list.filter(l => l.status === "active");
  }

  res.json({ licenses: list, isReadOnly });
});

app.post("/api/admin/licenses/create", (req, res) => {
  const { adminKey, customKey, days = 30 } = req.body;
  if (!isAdminKey(adminKey)) {
    return res.status(403).json({ error: "Δεν έχετε δικαιώματα διαχειριστή." });
  }
  if (isReadOnlyAdminKey(adminKey)) {
    return res.status(403).json({ error: "Ο λογαριασμός adminvlassis έχει δικαίωμα μόνο προβολής." });
  }

  const newKey = customKey?.trim() ? customKey.trim().toUpperCase() : `GC-${uuidv4().substring(0, 8).toUpperCase()}`;
  const expiresAt = Date.now() + days * 24 * 60 * 60 * 1000;

  validLicenseKeys.set(newKey, {
    expiresAt,
    deviceIds: []
  });

  res.json({
    success: true,
    key: newKey,
    expiresAt,
    daysRemaining: days
  });
});

app.post("/api/admin/licenses/renew", (req, res) => {
  const { adminKey, key, daysToAdd = 30 } = req.body;
  if (!isAdminKey(adminKey)) {
    return res.status(403).json({ error: "Δεν έχετε δικαιώματα διαχειριστή." });
  }
  if (isReadOnlyAdminKey(adminKey)) {
    return res.status(403).json({ error: "Ο λογαριασμός adminvlassis έχει δικαίωμα μόνο προβολής." });
  }

  if (!key || !validLicenseKeys.has(key)) {
    return res.status(404).json({ error: "Το License key δεν βρέθηκε." });
  }

  const data = validLicenseKeys.get(key)!;
  const now = Date.now();
  const baseTime = data.expiresAt > now ? data.expiresAt : now;
  const newExpiresAt = baseTime + daysToAdd * 24 * 60 * 60 * 1000;

  data.expiresAt = newExpiresAt;
  validLicenseKeys.set(key, data);

  const matchedUser = Array.from(userAccounts.values()).find(u => u.licenseKey === key);
  if (matchedUser) {
    matchedUser.expiresAt = newExpiresAt;
    matchedUser.status = "active";
    matchedUser.renewalsCount = (matchedUser.renewalsCount || 0) + 1;
  }

  const daysRemaining = Math.max(0, Math.ceil((newExpiresAt - now) / (24 * 60 * 60 * 1000)));

  res.json({
    success: true,
    key,
    expiresAt: newExpiresAt,
    daysRemaining
  });
});

app.post("/api/admin/licenses/reset-devices", (req, res) => {
  const { adminKey, key } = req.body;
  if (adminKey !== ADMIN_KEY) {
    return res.status(403).json({ error: "Δεν έχετε δικαιώματα διαχειριστή." });
  }

  if (!key || !validLicenseKeys.has(key)) {
    return res.status(404).json({ error: "Το License key δεν βρέθηκε." });
  }

  const data = validLicenseKeys.get(key)!;
  data.deviceIds = [];
  validLicenseKeys.set(key, data);

  res.json({ success: true, key, message: "Οι συνδεδεμένες συσκευές μηδενίστηκαν επιτυχώς." });
});

app.delete("/api/admin/licenses/:key", (req, res) => {
  const adminKey = (req.headers["x-admin-key"] as string) || req.body?.adminKey || (req.query.adminKey as string);
  if (adminKey !== ADMIN_KEY) {
    return res.status(403).json({ error: "Δεν έχετε δικαιώματα διαχειριστή." });
  }

  const targetKey = req.params.key;
  if (targetKey === ADMIN_KEY) {
    return res.status(400).json({ error: "Δεν μπορείτε να διαγράψετε το Admin Key." });
  }

  validLicenseKeys.delete(targetKey);
  res.json({ success: true, message: "Το License key διαγράφηκε." });
});

// 5. Get Videos
app.get("/api/videos", (req, res) => {
  res.json(videos);
});

// Search Metadata (Cinemeta / IMDb)
app.get("/api/search-metadata", async (req, res) => {
  const query = (req.query.q as string || "").trim();
  const type = (req.query.type as string || "movie").trim();
  
  if (!query) return res.json({ results: [] });

  try {
    const url = `https://v3-cinemeta.strem.io/catalog/${type === 'series' ? 'series' : 'movie'}/top/search=${encodeURIComponent(query)}.json`;
    const response = await fetch(url);
    if (!response.ok) return res.json({ results: [] });
    
    const data = await response.json();
    const metas = data.metas || [];

    const results = metas.map((m: any) => ({
      id: m.id,
      imdb_id: m.imdb_id || m.id,
      title: m.name,
      year: m.releaseInfo || m.year || "",
      type: m.type || type,
      poster: m.poster || "",
      background: m.background || "",
      description: m.description || ""
    }));

    return res.json({ results });
  } catch (error) {
    console.error("Error in search-metadata:", error);
    return res.json({ results: [] });
  }
});

// Get Metadata Details
app.get("/api/metadata-details", async (req, res) => {
  const id = (req.query.id as string || "").trim();
  const type = (req.query.type as string || "movie").trim();
  const episodeNum = Number(req.query.episode) || 1;

  if (!id) return res.status(400).json({ error: "Missing ID" });

  try {
    const url = `https://v3-cinemeta.strem.io/meta/${type === 'series' ? 'series' : 'movie'}/${id}.json`;
    const response = await fetch(url);
    if (!response.ok) return res.status(404).json({ error: "Not found" });

    const data = await response.json();
    const meta = data.meta;
    if (!meta) return res.status(404).json({ error: "Meta not found" });

    let finalDescription = meta.description || "";
    let finalTitle = meta.name;

    // Try Wikipedia for Greek translation summary
    try {
      const wikiSearchRes = await fetch(`https://el.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(meta.name)}&utf8=&format=json&origin=*`);
      if (wikiSearchRes.ok) {
        const wikiSearchData = await wikiSearchRes.json();
        const hit = wikiSearchData.query?.search?.[0]?.title;
        if (hit && !hit.includes('2026')) {
          const wikiRes = await fetch(`https://el.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(hit)}`);
          if (wikiRes.ok) {
            const wInfo = await wikiRes.json();
            if (wInfo.extract) finalDescription = wInfo.extract;
            if (wInfo.title) finalTitle = wInfo.title;
          }
        }
      }
    } catch (e) {
      console.error("Wiki search failed:", e);
    }

    let episodeInfo = null;
    if (type === 'series' && meta.videos) {
      const ep = meta.videos.find((v: any) => v.episode === episodeNum || v.number === episodeNum);
      if (ep) {
        episodeInfo = {
          title: ep.title || ep.name || `Επεισόδιο ${episodeNum}`,
          description: ep.overview || ep.description || "",
          thumbnail: ep.thumbnail || meta.poster || ""
        };
      }
    }

    return res.json({
      title: finalTitle,
      originalTitle: meta.name,
      description: finalDescription,
      poster: meta.poster || "",
      background: meta.background || "",
      year: meta.year || meta.releaseInfo || "",
      genres: meta.genres || meta.genre || [],
      episodeInfo
    });
  } catch (error) {
    console.error("Error fetching metadata details:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Helper: Automatically translate text to Greek
async function translateToGreek(text: string): Promise<string> {
  if (!text || typeof text !== "string") return "";
  const trimmed = text.trim();
  if (!trimmed) return "";

  // If already mostly Greek (and no long English words), return as is
  if (/[\u0370-\u03FF]/.test(trimmed) && !/[a-zA-Z]{5,}/.test(trimmed)) {
    return trimmed;
  }

  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=el&dt=t&q=${encodeURIComponent(trimmed)}`;
    const res = await fetch(url, { headers: { "User-Agent": "StreamEA/1.0" } });
    if (res.ok) {
      const data: any = await res.json();
      const translated = data[0]?.map((x: any) => x[0]).join("").trim();
      if (translated) return translated;
    }
  } catch (err) {
    console.error("Greek translation failed:", err);
  }

  return trimmed;
}

// ============================================
// VIDEO UPLOAD & HLS PROCESSING (STORJ S3)
// ============================================
let s3Client: S3Client | null = null;
try {
  s3Client = new S3Client({
    region: "eu-1",
    endpoint: process.env.STORJ_ENDPOINT || "https://gateway.storjshare.io",
    credentials: {
      accessKeyId: process.env.STORJ_ACCESS_KEY || "",
      secretAccessKey: process.env.STORJ_SECRET_KEY || ""
    },
    forcePathStyle: true
  });
} catch (e) {
  console.warn("Failed to initialize S3 Client. Storj credentials may be missing.");
}

const upload = multer({ 
  dest: "/tmp/uploads/"
});

app.post("/api/admin/videos/upload", upload.single("video"), async (req, res) => {
  const adminKey = req.headers["x-admin-key"] as string || req.body?.adminKey;
  if (!isAdminKey(adminKey) || isReadOnlyAdminKey(adminKey)) {
    return res.status(403).json({ error: "Unauthorized." });
  }

  if (!req.file) {
    return res.status(400).json({ error: "No video file provided." });
  }

  const storjBucket = process.env.STORJ_BUCKET_NAME;
  if (!s3Client || !process.env.STORJ_ACCESS_KEY || !storjBucket) {
    return res.status(500).json({ error: "Storj credentials not configured in Settings." });
  }

  const fileId = uuidv4();
  const inputPath = req.file.path;
  const outputDir = path.join("/tmp", `hls_${fileId}`);
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log(`Starting HLS processing for fileId: ${fileId}...`);

  try {
    // Process video with fluent-ffmpeg
    await new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .outputOptions([
          '-c:v h264',
          '-c:a aac',
          '-hls_time 10',
          '-hls_list_size 0', // keep all segments in the playlist
          '-f hls'
        ])
        .output(path.join(outputDir, 'playlist.m3u8'))
        .on('end', () => {
          console.log(`HLS processing completed for ${fileId}`);
          resolve(true);
        })
        .on('error', (err) => {
          console.error(`FFmpeg error for ${fileId}:`, err);
          reject(err);
        })
        .run();
    });

    console.log(`Uploading ${fileId} segments to Storj...`);
    const files = fs.readdirSync(outputDir);

    for (const file of files) {
      const filePath = path.join(outputDir, file);
      const fileContent = fs.readFileSync(filePath);
      
      let contentType = 'application/octet-stream';
      if (file.endsWith('.m3u8')) contentType = 'application/x-mpegURL';
      else if (file.endsWith('.ts')) contentType = 'video/MP2T';

      await s3Client.send(new PutObjectCommand({
        Bucket: storjBucket,
        Key: `${fileId}/${file}`,
        Body: fileContent,
        ContentType: contentType
      }));
    }
    
    // Clean up local temp files
    try {
      fs.rmSync(inputPath, { force: true });
      fs.rmSync(outputDir, { recursive: true, force: true });
    } catch (cleanupErr) {
      console.warn("Cleanup error (ignored):", cleanupErr);
    }

    // Public URL format for Storj S3 Gateway
    const hlsUrl = `https://gateway.storjshare.io/${storjBucket}/${fileId}/playlist.m3u8`;
    
    console.log(`Upload complete for ${fileId}. HLS URL: ${hlsUrl}`);

    res.json({
      success: true,
      hlsUrl: hlsUrl,
      message: "Το βίντεο μετατράπηκε και ανέβηκε επιτυχώς στο Storj!"
    });

  } catch (error: any) {
    console.error("HLS processing/upload error:", error);
    try {
      fs.rmSync(inputPath, { force: true });
      fs.rmSync(outputDir, { recursive: true, force: true });
    } catch(e) {}
    res.status(500).json({ error: "Αποτυχία επεξεργασίας/αποστολής του βίντεο.", details: error.message });
  }
});

// 6. Admin: Add Video
app.post("/api/videos", async (req, res) => {
  const { 
    licenseKey, 
    title, 
    year,
    type, 
    episodeNumber,
    url,
    description,
    thumbnail
  } = req.body;
  
  if (licenseKey !== ADMIN_KEY) {
    return res.status(403).json({ error: "Unauthorized. Admin key required." });
  }

  if (!title || !url) {
    return res.status(400).json({ error: "Missing required fields (title, url)" });
  }

  let finalTitle = title;
  let finalDescription = description || "";
  let finalThumbnail = thumbnail || "";
  let originalTitle = title;
  let episodeTitle = "";
  let episodeDescription = "";
  let episodeThumbnail = "";
  let matchedYear = year || "";

  const fetchHeaders = { "User-Agent": "StreamEA/1.0 (https://streamea.app; info@streamea.app)" };

  // Perform automatic IMDb (Cinemeta) search
  try {
    const searchType = type === "series" ? "series" : "movie";
    
    // First try searching with title + year if available
    let searchQuery = year ? `${title} ${year}` : title;
    let searchUrl = `https://v3-cinemeta.strem.io/catalog/${searchType}/top/search=${encodeURIComponent(searchQuery)}.json`;
    let searchRes = await fetch(searchUrl, { headers: fetchHeaders });
    let metas: any[] = [];
    
    if (searchRes.ok) {
      const searchData = await searchRes.json();
      metas = searchData.metas || [];
    }

    // Fallback: search title only if no results with year
    if (metas.length === 0 && year) {
      searchQuery = title;
      searchUrl = `https://v3-cinemeta.strem.io/catalog/${searchType}/top/search=${encodeURIComponent(title)}.json`;
      searchRes = await fetch(searchUrl, { headers: fetchHeaders });
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        metas = searchData.metas || [];
      }
    }

    if (metas.length > 0) {
      let bestMeta: any = null;
      let minDiff = Infinity;

      if (year) {
        const targetYearNum = parseInt(year, 10);
        for (const m of metas) {
          const rawYear = String(m.releaseInfo || m.year || "");
          const matchYear = rawYear.match(/\b(19\d\d|20\d\d)\b/);
          if (matchYear) {
            const metaStartYear = parseInt(matchYear[1], 10);
            const diff = Math.abs(metaStartYear - targetYearNum);
            if (diff < minDiff) {
              minDiff = diff;
              bestMeta = m;
            }
          }
        }
      }

      if (!bestMeta) {
        const cleanReqTitle = title.toLowerCase().replace(/[^a-z0-9]/g, "");
        const exactMatches = metas.filter((m: any) => {
          const cleanM = String(m.name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
          return cleanM === cleanReqTitle || cleanM.includes(cleanReqTitle);
        });

        if (exactMatches.length > 1) {
          exactMatches.sort((a: any, b: any) => {
            const yA = parseInt((String(a.releaseInfo || a.year).match(/\b(19\d\d|20\d\d)\b/) || [])[1] || "9999", 10);
            const yB = parseInt((String(b.releaseInfo || b.year).match(/\b(19\d\d|20\d\d)\b/) || [])[1] || "9999", 10);
            return yA - yB;
          });
          bestMeta = exactMatches[0];
        } else {
          bestMeta = metas[0];
        }
      }

      // Fetch full metadata for selected candidate
      const detailsUrl = `https://v3-cinemeta.strem.io/meta/${searchType}/${bestMeta.id}.json`;
      const detailsRes = await fetch(detailsUrl, { headers: fetchHeaders });
      
      if (detailsRes.ok) {
        const detailsData = await detailsRes.json();
        const meta = detailsData.meta;
        
        if (meta) {
          originalTitle = meta.name || title;
          finalTitle = meta.name || title;
          finalThumbnail = meta.poster || bestMeta.poster || "";
          finalDescription = meta.description || bestMeta.description || "";
          if (meta.releaseInfo || meta.year) {
            const yM = String(meta.releaseInfo || meta.year).match(/\b(19\d\d|20\d\d)\b/);
            if (yM) matchedYear = yM[1];
          }

          // If series, find episode metadata
          if (type === "series" && meta.videos) {
            const epNum = Number(episodeNumber) || 1;
            const ep = meta.videos.find((v: any) => v.episode === epNum || v.number === epNum);
            if (ep) {
              episodeTitle = ep.title || ep.name || `Επεισόδιο ${epNum}`;
              episodeDescription = ep.overview || ep.description || "";
              episodeThumbnail = ep.thumbnail || finalThumbnail;
            }
          }
        }
      }
    }
  } catch (err) {
    console.error("Automated Cinemeta fetch failed:", err);
  }

  // Try Wikipedia for Greek title and description translation
  try {
    const wikiTitleBase = originalTitle || title;
    const wikiQuery = matchedYear ? `${wikiTitleBase} ${matchedYear}` : wikiTitleBase;
    const wikiSearchRes = await fetch(`https://el.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(wikiQuery)}&utf8=&format=json&origin=*`, { headers: fetchHeaders });
    
    if (wikiSearchRes.ok) {
      const wikiSearchData = await wikiSearchRes.json();
      const hits = wikiSearchData.query?.search || [];

      for (const hit of hits.slice(0, 5)) {
        const wikiRes = await fetch(`https://el.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(hit.title)}`, { headers: fetchHeaders });
        if (wikiRes.ok) {
          const wikiData = await wikiRes.json();
          const extract = wikiData.extract || "";

          // Skip people / actors
          if (extract.includes("είναι Αμερικανός ηθοποιός") || extract.includes("είναι Αμερικανίδα ηθοποιός") || (extract.includes("ηθοποιός") && !extract.includes("σειρά") && !extract.includes("ταινία"))) {
            continue;
          }

          // Skip future releases or mismatched remake articles
          if (matchedYear && Number(matchedYear) < 2020) {
            if (extract.includes("του 2026") || extract.includes("του 2025") || extract.includes("του 2024")) {
              continue;
            }
          }

          if (type === "series" && extract.includes("ταινία του") && !extract.includes("σειρά")) {
            continue;
          }

          // Do NOT override finalTitle with Greek Wikipedia title (user wants English authentic titles for series/movies)
          if (wikiData.extract) finalDescription = wikiData.extract;
          if (!finalThumbnail && wikiData.thumbnail?.source) {
            finalThumbnail = wikiData.thumbnail.source;
          }
          break;
        }
      }
    }
  } catch (err) {
    console.error("Automated Wiki fetch failed:", err);
  }

  if (!matchedYear) {
    const titleYearMatch = (finalTitle + " " + (originalTitle || title)).match(/\b(19\d\d|20\d\d)\b/);
    if (titleYearMatch) {
      matchedYear = titleYearMatch[1];
    }
  }

  // Fallback defaults if anything is missing
  if (!finalThumbnail) {
    finalThumbnail = type === "series" 
      ? "https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?q=80&w=800&auto=format&fit=crop"
      : "https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=800&auto=format&fit=crop";
  }
  if (!finalDescription) {
    finalDescription = type === "series" ? `Σειρά: ${finalTitle}` : `Ταινία: ${finalTitle}`;
  }

  let finalEpisodes: Episode[] = [];

  if (type === "series") {
    const epNum = Number(episodeNumber) || 1;
    let formattedEpTitle = `Επεισόδιο ${epNum}`;

    if (episodeTitle) {
      const translated = await translateToGreek(episodeTitle);
      const lower = translated.toLowerCase();
      if (lower.startsWith("επεισόδιο") || lower.startsWith("episode")) {
        formattedEpTitle = translated;
      } else {
        formattedEpTitle = `Επεισόδιο ${epNum}: ${translated}`;
      }
    }

    let formattedEpDesc = episodeDescription ? await translateToGreek(episodeDescription) : `Επεισόδιο ${epNum} της σειράς ${finalTitle}.`;

    const epItem: Episode = {
      id: `${Date.now()}-ep-${epNum}`,
      episodeNumber: epNum,
      title: formattedEpTitle,
      description: formattedEpDesc,
      thumbnail: episodeThumbnail || finalThumbnail,
      url: url
    };
    finalEpisodes = [epItem];

    // Check if series already exists (with matching year if available)
    const cleanNewTitle = finalTitle.toLowerCase().trim();
    const existingSeriesIndex = videos.findIndex(v => {
      if (v.type !== "series") return false;
      const cleanVTitle = v.title.toLowerCase().trim();
      const titleMatches = cleanVTitle === cleanNewTitle || cleanVTitle.includes(cleanNewTitle) || cleanNewTitle.includes(cleanVTitle);
      if (!titleMatches) return false;

      const targetY = matchedYear || year;
      if (v.year && targetY) {
        const y1 = parseInt(v.year, 10);
        const y2 = parseInt(targetY, 10);
        if (!isNaN(y1) && !isNaN(y2) && Math.abs(y1 - y2) > 3) {
          return false; // e.g. 2005 animated vs 2024 live action
        }
      }
      return true;
    });
    if (existingSeriesIndex !== -1) {
      const existingSeries = videos[existingSeriesIndex];
      existingSeries.episodes = existingSeries.episodes || [];
      existingSeries.year = matchedYear || existingSeries.year || year;
      
      const existingEpIndex = existingSeries.episodes.findIndex(e => e.episodeNumber === epNum);
      if (existingEpIndex !== -1) {
        existingSeries.episodes[existingEpIndex] = epItem;
      } else {
        existingSeries.episodes.push(epItem);
        existingSeries.episodes.sort((a, b) => a.episodeNumber - b.episodeNumber);
      }
      
      // Update series poster/description if new valid values found
      if (finalThumbnail && (!existingSeries.thumbnail || existingSeries.thumbnail.includes('unsplash'))) {
        existingSeries.thumbnail = finalThumbnail;
      }
      if (finalDescription) {
        existingSeries.description = finalDescription;
      }

      videos.splice(existingSeriesIndex, 1);
      videos.unshift(existingSeries);
      
      return res.status(201).json({ video: existingSeries });
    }
  }

  const newVideo: Video = {
    id: uuidv4(),
    title: finalTitle,
    description: finalDescription,
    url,
    thumbnail: finalThumbnail,
    type,
    year: matchedYear || year,
    episodes: finalEpisodes
  };
  
  videos.unshift(newVideo);
  res.json({ success: true, video: newVideo });
});

// --- VITE MIDDLEWARE FOR DEVELOPMENT / STATIC SERVING FOR PRODUCTION ---
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
