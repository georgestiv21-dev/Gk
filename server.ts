import "dotenv/config";
import express from "express";
import path from "path";
import cors from "cors";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import multer from "multer";
import ffmpeg from "fluent-ffmpeg";
import { spawn } from "child_process";
import { S3Client, PutObjectCommand, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
import type { Readable } from "stream";

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: "50gb" }));
app.use(express.urlencoded({ limit: "50gb", extended: true }));


// In-memory Database for Demo
const validLicenseKeys = new Map<string, { expiresAt: number, deviceIds: string[] }>();
const ADMIN_KEY = "ADMIN-XMR-9999"; // Master admin key that never expires
const ADMIN_VLASSIS_KEY = "ADMIN-VLASSIS-2026"; // Read-only admin key with 3 devices limit

function isAdminKey(keyOrUser: string = ""): boolean {
  if (!keyOrUser) return false;
  const k = keyOrUser.trim().toLowerCase();
  if (keyOrUser.trim() === ADMIN_KEY) return true;
  if (k === "admings") {
    const u = userAccounts.get("admings");
    return !!u;
  }
  const u = userAccounts.get(k);
  if (u && (u.licenseKey === ADMIN_KEY || u.licenseKey === ADMIN_VLASSIS_KEY)) {
    return true;
  }
  return false;
}

function isReadOnlyAdminKey(keyOrUser: string = ""): boolean {
  if (!keyOrUser) return false;
  const k = keyOrUser.trim().toLowerCase();
  if (keyOrUser.trim() === ADMIN_VLASSIS_KEY) return true;
  const u = userAccounts.get(k);
  if (u && u.licenseKey === ADMIN_VLASSIS_KEY) return true;
  return false;
}
const DEFAULT_EXPIRY = Date.now() + 365 * 24 * 60 * 60 * 1000;

const now = Date.now();
const DAY = 24 * 60 * 60 * 1000;

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
  backdrop?: string;
  genres?: string[];
  type: "movie" | "series";
  year?: string;
  episodes?: Episode[];
  category?: "gctunes" | "greek_streaming";
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
  libraryAccess?: "gctunes" | "greek_streaming" | "both";
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
        videos.push(
          ...data.videos.map((v: any) => ({
            ...v,
            title: v.title ? v.title.replace(/\s*[\(\[]\s*\d{4}\s*[\)\]]\s*$/, "").trim() : v.title
          }))
        );
      }
      console.log("Database loaded from JSON.");
    } catch (e) {
      console.error("Error loading database.json:", e);
    }
  } else {
    console.log("No database.json found, initializing fresh database.");
  }
}

function initializeDatabase() {
  const isFirstTime = !fs.existsSync(DB_FILE);
  if (!isFirstTime) {
    loadDatabase();
  }

  // Ensure Master Super Admin always exists
  if (!userAccounts.has("admings")) {
    userAccounts.set("admings", {
      username: "admings",
      passwordHash: "g6975767770",
      licenseKey: ADMIN_KEY,
      status: "active",
      createdAt: Date.now(),
      expiresAt: 9999999999999,
    });
  }
  if (!validLicenseKeys.has(ADMIN_KEY)) {
    validLicenseKeys.set(ADMIN_KEY, { expiresAt: 9999999999999, deviceIds: ["dev-admin-pc"] });
  }

  // Seed default secondary accounts ONLY on fresh first-time installation
  if (isFirstTime) {
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
    validLicenseKeys.set(ADMIN_VLASSIS_KEY, { expiresAt: 9999999999999, deviceIds: ["dev_vlassis_pc_01", "dev_vlassis_phone_02"] });

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

    saveDatabase();
  }
}

// Initial Load & Boot
initializeDatabase();

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
    renewalsCount: 0,
    libraryAccess: "both"
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
    libraryAccess: newUser.libraryAccess || "both",
    expiresAt: 0
  });
});

// 0.1 Login Endpoint (Username + Password OR License Key)
app.post("/api/login", (req, res) => {
  const { username = "", password = "", licenseKey = "", deviceId = "dev-default" } = req.body;
  const cleanUsername = (username || "").trim().toLowerCase();
  const cleanPassword = (password || "").trim();
  const trimmedKey = (licenseKey || "").trim().toUpperCase();

  // Admin instant login via key or admings / admingctoons / admin credentials (REQUIRES VALID PASSWORD OR ADMIN KEY)
  if (
    trimmedKey === ADMIN_KEY ||
    (cleanUsername === "admings" && cleanPassword === "g6975767770") ||
    (cleanUsername === "admingctoons" && (cleanPassword === "g6975767770" || cleanPassword === "admin")) ||
    (cleanUsername === "admin" && (cleanPassword === "admin" || cleanPassword === "g6975767770"))
  ) {
    return res.json({
      success: true,
      username: cleanUsername || "admings",
      isAdmin: true,
      isReadOnlyAdmin: false,
      status: "active",
      libraryAccess: "both",
      key: ADMIN_KEY,
      licenseKey: ADMIN_KEY,
      expiresAt: 9999999999999
    });
  }

  // Read-Only Limited Admin login (adminvlassis with max 3 devices) (REQUIRES VALID PASSWORD OR ADMIN_VLASSIS_KEY)
  if (
    trimmedKey === ADMIN_VLASSIS_KEY ||
    (cleanUsername === "adminvlassis" && cleanPassword === "adminVlassis132")
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
      libraryAccess: "both",
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
      libraryAccess: user.libraryAccess || "both",
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
      return res.status(400).json({ error: "Μη έγκυρο κλειδί πρόσβασης ή λογαριασμός." });
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
      libraryAccess: matchedUser?.libraryAccess || "both",
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

  // Strict Admin Session Check
  if (trimmedKey === ADMIN_KEY || ((cleanUsername === "admin" || cleanUsername === "admingctoons") && trimmedKey === ADMIN_KEY)) {
    return res.json({ status: "active", isAdmin: true, isReadOnlyAdmin: false, libraryAccess: "both" });
  }

  if (trimmedKey === ADMIN_VLASSIS_KEY || (cleanUsername === "adminvlassis" && trimmedKey === ADMIN_VLASSIS_KEY)) {
    return res.json({ status: "active", isAdmin: true, isReadOnlyAdmin: true, libraryAccess: "both" });
  }

  // If claimed to be admin but key doesn't match:
  if (cleanUsername === "admin" || cleanUsername === "admingctoons" || cleanUsername === "adminvlassis") {
    return res.status(401).json({ error: "Μη εξουσιοδοτημένη πρόσβαση διαχειριστή." });
  }

  if (cleanUsername) {
    const user = userAccounts.get(cleanUsername);
    if (!user) {
      return res.status(401).json({ error: "Ο λογαριασμός δεν βρέθηκε." });
    }
    if (trimmedKey && user.licenseKey !== trimmedKey) {
      return res.status(401).json({ error: "Μη έγκυρο κλειδί συνεδρίας." });
    }
    const keyData = validLicenseKeys.get(user.licenseKey);
    const now = Date.now();
    const isActive = (keyData && keyData.expiresAt > now) || user.status === "active";
    return res.json({ status: isActive ? "active" : "pending", isAdmin: false, libraryAccess: user.libraryAccess || "both" });
  }

  if (trimmedKey) {
    const keyData = validLicenseKeys.get(trimmedKey);
    if (!keyData) {
      return res.status(401).json({ error: "Μη έγκυρο κλειδί πρόσβασης." });
    }
    let matchedUser: UserAccount | undefined;
    for (const u of userAccounts.values()) {
      if (u.licenseKey === trimmedKey) {
        matchedUser = u;
        break;
      }
    }
    const now = Date.now();
    const isActive = (keyData.expiresAt > now) || (matchedUser && matchedUser.status === "active");
    return res.json({ status: isActive ? "active" : "pending", isAdmin: false, libraryAccess: matchedUser?.libraryAccess || "both" });
  }

  return res.status(401).json({ error: "Απαιτείται σύνδεση." });
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

// 1. Admin: Fetch All User Accounts (Including Admin Accounts)
app.get("/api/admin/users", (req, res) => {
  const adminKey = (req.headers["x-admin-key"] as string) || (req.query.adminKey as string) || (req.headers["x-username"] as string);
  if (!isAdminKey(adminKey)) {
    return res.status(403).json({ error: "Δεν έχετε δικαιώματα διαχειριστή." });
  }

  const isReadOnly = isReadOnlyAdminKey(adminKey);
  const now = Date.now();
  let list = Array.from(userAccounts.values())
    .map(u => {
      const isUserAdmin = u.username === "admings" || u.username === "admin" || u.username === "admingctoons" || u.username === "adminvlassis" || u.licenseKey === ADMIN_KEY || u.licenseKey === ADMIN_VLASSIS_KEY;
      const isVlassis = u.username === "adminvlassis" || u.licenseKey === ADMIN_VLASSIS_KEY;
      const keyData = validLicenseKeys.get(u.licenseKey);
      const expiresAt = isUserAdmin ? 9999999999999 : (keyData ? keyData.expiresAt : u.expiresAt);
      const isActive = isUserAdmin || u.status === "active" || (expiresAt > now);
      const msRemaining = expiresAt - now;
      const daysRemaining = isUserAdmin ? 9999 : Math.max(0, Math.ceil(msRemaining / (24 * 60 * 60 * 1000)));

      const alertInfo = screenRecordAlertsMap.get(u.username.toLowerCase()) ||
                        screenRecordAlertsMap.get(u.licenseKey.toUpperCase()) ||
                        { count: 0, lastAlert: 0, details: "" };

      return {
        username: u.username,
        licenseKey: u.licenseKey,
        status: (isActive ? "active" : "pending") as "active" | "pending",
        createdAt: u.createdAt || now,
        expiresAt: expiresAt,
        daysRemaining: daysRemaining,
        renewalsCount: u.renewalsCount !== undefined ? u.renewalsCount : (isActive ? 1 : 0),
        isAdmin: isUserAdmin,
        isReadOnlyAdmin: isVlassis,
        roleLabel: isUserAdmin ? (isVlassis ? "🛡️ Limited Admin (Vlassis)" : "👑 Super Admin") : "Πελάτης / Χρήστης",
        libraryAccess: u.libraryAccess || "both",
        screenRecordAlertsCount: alertInfo.count,
        lastScreenRecordAlert: alertInfo.lastAlert,
        screenRecordDetails: alertInfo.details
      };
    });

  // Read-only admin can ONLY see ACTIVE subscriptions
  if (isReadOnly) {
    list = list.filter(u => u.status === "active" && u.expiresAt > now && !u.isAdmin);
  }

  list.sort((a, b) => {
    if (a.isAdmin && !b.isAdmin) return -1;
    if (!a.isAdmin && b.isAdmin) return 1;
    if (a.screenRecordAlertsCount > 0 && b.screenRecordAlertsCount === 0) return -1;
    if (a.screenRecordAlertsCount === 0 && b.screenRecordAlertsCount > 0) return 1;
    if (a.status === "pending" && b.status !== "pending") return -1;
    if (a.status !== "pending" && b.status === "pending") return 1;
    return (b.createdAt || 0) - (a.createdAt || 0);
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

// 2. Admin: Approve User (Set/Reset access duration to specified days & assign library access)
app.post("/api/admin/users/approve", (req, res) => {
  const { adminKey, username, days = 30, libraryAccess = "both" } = req.body;
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
  if (libraryAccess === "gctunes" || libraryAccess === "greek_streaming" || libraryAccess === "both") {
    user.libraryAccess = libraryAccess;
  }
  userAccounts.set(cleanUsername, user);

  // Update License Key Expiration in validLicenseKeys map
  const keyData = validLicenseKeys.get(user.licenseKey) || { expiresAt: 0, deviceIds: [] };
  keyData.expiresAt = newExpiresAt;
  validLicenseKeys.set(user.licenseKey, keyData);

  // Persist changes
  saveDatabase();

  const accessLabel = user.libraryAccess === "gctunes" 
    ? "Greek Cartoons (GC Tunes)" 
    : user.libraryAccess === "greek_streaming" 
    ? "Greek Streaming" 
    : "Πλήρης (Cartoons & Streaming)";

  // Update Chat Session if present
  const chat = chatSessions.get(cleanUsername) || chatSessions.get(user.licenseKey);
  if (chat) {
    chat.status = "active";
    chat.updatedAt = now;
    chat.messages.push({
      id: `msg-${now}-approve`,
      sender: "admin",
      text: `🎉 Ο λογαριασμός σας (${user.username}) εγκρίθηκε και ενεργοποιήθηκε για +${days} ημέρες! Δικαίωμα πρόσβασης: ${accessLabel}. (Νέα λήξη: ${new Date(newExpiresAt).toLocaleDateString('el-GR')}).`,
      timestamp: now
    });
  }

  res.json({
    success: true,
    username: user.username,
    licenseKey: user.licenseKey,
    status: "active",
    libraryAccess: user.libraryAccess || "both",
    expiresAt: newExpiresAt,
    daysRemaining: Math.ceil((newExpiresAt - now) / (24 * 60 * 60 * 1000))
  });
});

// 2.1 Admin: Update User Library Access Directly
app.post("/api/admin/users/update-access", (req, res) => {
  const { adminKey, username, libraryAccess } = req.body;
  if (!isAdminKey(adminKey)) {
    return res.status(403).json({ error: "Δεν έχετε δικαιώματα διαχειριστή." });
  }
  if (isReadOnlyAdminKey(adminKey)) {
    return res.status(403).json({ error: "Ο λογαριασμός adminvlassis δεν έχει δικαίωμα τροποποίησης πρόσβασης." });
  }

  const cleanUsername = (username || "").trim().toLowerCase();
  const user = userAccounts.get(cleanUsername);

  if (!user) {
    return res.status(404).json({ error: "Ο χρήστης δεν βρέθηκε." });
  }

  if (libraryAccess !== "gctunes" && libraryAccess !== "greek_streaming" && libraryAccess !== "both") {
    return res.status(400).json({ error: "Μη έγκυρος τύπος πρόσβασης." });
  }

  user.libraryAccess = libraryAccess;
  userAccounts.set(cleanUsername, user);
  saveDatabase();

  res.json({
    success: true,
    username: user.username,
    libraryAccess: user.libraryAccess
  });
});

// 3. Admin: Delete User Account and all associated data
const deleteUserAccountHandler = (req: any, res: any) => {
  const headerAdminKey = (req.headers["x-admin-key"] as string) || "";
  const headerUsername = (req.headers["x-username"] as string) || "";
  const bodyAdminKey = (req.body?.adminKey as string) || "";
  const bodyUsername = (req.body?.adminUsername as string) || "";
  const queryAdminKey = (req.query?.adminKey as string) || "";

  const adminAuth = headerAdminKey || bodyAdminKey || queryAdminKey || headerUsername || bodyUsername;
  
  if (!isAdminKey(adminAuth)) {
    return res.status(403).json({ error: "Δεν έχετε δικαιώματα διαχειριστή." });
  }
  if (isReadOnlyAdminKey(adminAuth)) {
    return res.status(403).json({ error: "Ο λογαριασμός adminvlassis δεν έχει δικαίωμα διαγραφής λογαριασμών." });
  }

  const targetUsername = (req.params.username || req.body?.username || req.query?.username || "").trim().toLowerCase();
  if (!targetUsername) {
    return res.status(400).json({ error: "Δεν ορίστηκε όνομα χρήστη προς διαγραφή." });
  }

  if (targetUsername === "admings") {
    return res.status(400).json({ error: "Ο κύριος Super Admin λογαριασμός (admings) είναι προστατευμένος και δεν μπορεί να διαγραφεί." });
  }

  const user = userAccounts.get(targetUsername);
  const userLicenseKey = user ? user.licenseKey : "";

  // 1. Remove from user accounts map
  userAccounts.delete(targetUsername);

  // 2. Remove associated license key if present
  if (userLicenseKey) {
    if (userLicenseKey !== ADMIN_KEY || targetUsername === "admin" || targetUsername === "admingctoons") {
      validLicenseKeys.delete(userLicenseKey);
    }
  }
  if (targetUsername === "adminvlassis") {
    validLicenseKeys.delete(ADMIN_VLASSIS_KEY);
  }

  // 3. Remove devices
  userDevicesMap.delete(targetUsername);
  if (userLicenseKey) {
    userDevicesMap.delete(userLicenseKey);
    userDevicesMap.delete(userLicenseKey.toLowerCase());
  }

  // 4. Remove chat session
  chatSessions.delete(targetUsername);
  if (userLicenseKey) {
    chatSessions.delete(userLicenseKey);
  }

  // 5. Remove security alerts
  screenRecordAlertsMap.delete(targetUsername);
  if (userLicenseKey) {
    screenRecordAlertsMap.delete(userLicenseKey);
  }

  // 6. Persist to database.json on the server disk
  saveDatabase();

  console.log(`[USER DELETED] Account '${targetUsername}' was deleted by admin.`);

  res.json({
    success: true,
    message: `Ο λογαριασμός '${targetUsername}' και όλα τα σχετικά δεδομένα διαγράφηκαν επιτυχώς.`
  });
};

app.delete("/api/admin/users/:username", deleteUserAccountHandler);
app.post("/api/admin/users/delete", deleteUserAccountHandler);

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

function getStorjConfig() {
  const accessKey = (process.env.STORJ_ACCESS_KEY || process.env.STORJ_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || "").trim();
  const secretKey = (process.env.STORJ_SECRET_KEY || process.env.STORJ_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || "").trim();
  const bucketName = (process.env.STORJ_BUCKET_NAME || process.env.STORJ_BUCKET || process.env.BUCKET_NAME || "").trim();
  const endpoint = (process.env.STORJ_ENDPOINT || process.env.AWS_ENDPOINT_URL || "https://gateway.storjshare.io").trim().replace(/\/$/, "");

  return {
    accessKey,
    secretKey,
    bucketName,
    endpoint,
    isConfigured: Boolean(accessKey && secretKey && bucketName)
  };
}

function getS3Client(): S3Client | null {
  const config = getStorjConfig();
  if (!config.isConfigured) {
    return null;
  }
  return new S3Client({
    region: "eu-1",
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKey,
      secretAccessKey: config.secretKey
    },
    forcePathStyle: true
  });
}

// Secure Stream Proxy Endpoint for S3/Storj (Handles Auth, CORS, Range Headers & On-The-Fly Transcoding for MKV/TS)
app.get("/api/stream", async (req, res) => {
  let rawKey = (req.query.key as string || req.query.url as string || "").trim();
  if (!rawKey) {
    return res.status(400).send("Missing video key or URL parameter");
  }

  const storjConfig = getStorjConfig();
  const s3 = getS3Client();

  if (!storjConfig.isConfigured || !s3) {
    return res.status(500).send("Storage backend credentials are not configured.");
  }

  // Normalize key: handle full URLs like https://gateway.storjshare.io/bucket/key
  let objectKey = rawKey;
  if (objectKey.startsWith("http://") || objectKey.startsWith("https://")) {
    try {
      const urlObj = new URL(objectKey);
      const pathParts = urlObj.pathname.split("/").filter(Boolean);
      if (pathParts.length >= 2 && pathParts[0].toLowerCase() === storjConfig.bucketName.toLowerCase()) {
        objectKey = pathParts.slice(1).join("/");
      } else if (pathParts.length >= 1) {
        objectKey = pathParts.join("/");
      }
    } catch (e) {}
  }
  
  try {
    objectKey = decodeURIComponent(objectKey);
  } catch (e) {}
  objectKey = objectKey.replace(/^\/+/, "");

  const lowerKey = objectKey.toLowerCase();
  const range = req.headers.range;

  // Formats that browsers cannot natively decode or need dynamic remuxing/transcoding (MKV, AVI, TS, MOV, WMV)
  const isNonNativeFormat = lowerKey.endsWith(".mkv") || 
                            lowerKey.endsWith(".avi") || 
                            lowerKey.endsWith(".wmv") || 
                            lowerKey.endsWith(".flv") || 
                            (lowerKey.endsWith(".ts") && !lowerKey.includes("master") && !lowerKey.includes("index")) ||
                            lowerKey.includes("x265") || 
                            lowerKey.includes("hevc");

  try {
    // Helper to get S3 object with fallback searching
    let s3Response: any;
    try {
      s3Response = await s3.send(new GetObjectCommand({
        Bucket: storjConfig.bucketName,
        Key: objectKey,
        Range: isNonNativeFormat ? undefined : range
      }));
    } catch (err: any) {
      if (err.name === "NoSuchKey" || err.$metadata?.httpStatusCode === 404) {
        // Attempt fallback search across bucket if key had different path prefix
        try {
          const listRes = await s3.send(new ListObjectsV2Command({
            Bucket: storjConfig.bucketName,
            MaxKeys: 100
          }));
          const filename = objectKey.split("/").pop()?.toLowerCase();
          const matchedKey = listRes.Contents?.find(c => {
            if (!c.Key) return false;
            const cName = c.Key.split("/").pop()?.toLowerCase();
            return cName === filename || (filename && cName && (cName.includes(filename) || filename.includes(cName)));
          })?.Key;

          if (matchedKey && matchedKey !== objectKey) {
            console.log(`Found alternative key match in bucket: ${matchedKey} (requested: ${objectKey})`);
            s3Response = await s3.send(new GetObjectCommand({
              Bucket: storjConfig.bucketName,
              Key: matchedKey,
              Range: isNonNativeFormat ? undefined : range
            }));
            objectKey = matchedKey;
          } else {
            throw err;
          }
        } catch (searchErr) {
          console.warn(`[Stream Proxy] Video key not found in bucket '${storjConfig.bucketName}': ${objectKey}`);
          return res.status(404).json({
            error: "NoSuchKey",
            message: `Το αρχείο βίντεο (${objectKey}) δεν βρέθηκε στο bucket ${storjConfig.bucketName}. Ελέγξτε αν υπάρχει στο Storj.`
          });
        }
      } else {
        throw err;
      }
    }

    if (isNonNativeFormat) {
      // Dynamic on-the-fly streaming to web-native fragmented MP4 (H.264 + AAC)
      const s3Stream = s3Response.Body as Readable;

      if (!s3Stream) {
        return res.status(404).send("Stream body not available from storage.");
      }

      res.setHeader("Content-Type", "video/mp4");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Range, Authorization, Origin, Content-Type, Accept");
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");

      const ffmpegArgs = [
        "-i", "pipe:0",
        "-c:v", "libx264",
        "-preset", "ultrafast",
        "-tune", "zerolatency",
        "-crf", "22",
        "-c:a", "aac",
        "-b:a", "192k",
        "-f", "mp4",
        "-movflags", "frag_keyframe+empty_moov+default_base_moof",
        "pipe:1"
      ];

      const ffmpegProc = spawn("ffmpeg", ffmpegArgs);

      s3Stream.pipe(ffmpegProc.stdin);
      ffmpegProc.stdout.pipe(res);

      ffmpegProc.stderr.on("data", (_data) => {
        // stream processing output
      });

      const cleanUp = () => {
        try {
          if (ffmpegProc && !ffmpegProc.killed) {
            ffmpegProc.kill("SIGKILL");
          }
        } catch (e) {}
      };

      req.on("close", cleanUp);
      res.on("close", cleanUp);
      res.on("finish", cleanUp);

      ffmpegProc.on("error", (err) => {
        console.error("FFmpeg live transcode error:", err.message);
        cleanUp();
        if (!res.headersSent) {
          res.status(500).send("Live transcode error.");
        }
      });

      return;
    }

    let contentType = s3Response.ContentType || "video/mp4";
    if (lowerKey.endsWith(".m3u8")) {
      contentType = "application/x-mpegURL";
    } else if (lowerKey.endsWith(".mp4")) {
      contentType = "video/mp4";
    } else if (lowerKey.endsWith(".webm")) {
      contentType = "video/webm";
    }

    res.setHeader("Content-Type", contentType);
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Range, Authorization, Origin, Content-Type, Accept");

    if (s3Response.ContentRange) {
      res.setHeader("Content-Range", s3Response.ContentRange);
      res.status(206);
    } else if (range && s3Response.ContentLength) {
      res.status(206);
    } else {
      res.status(200);
    }

    if (s3Response.ContentLength) {
      res.setHeader("Content-Length", s3Response.ContentLength);
    }

    const stream = s3Response.Body as Readable;
    if (stream && typeof stream.pipe === "function") {
      stream.pipe(res);
    } else if (stream) {
      const chunks: any[] = [];
      for await (const chunk of stream as any) {
        chunks.push(chunk);
      }
      res.end(Buffer.concat(chunks));
    } else {
      res.status(404).send("Stream body not available");
    }
  } catch (error: any) {
    console.error("Stream Proxy Error for key:", objectKey, error.message);
    if (error.name === "NoSuchKey" || error.$metadata?.httpStatusCode === 404) {
      return res.status(404).send("Video file not found in storage bucket.");
    }
    return res.status(500).send("Streaming error: " + (error.message || "Unknown error"));
  }
});

const upload = multer({ 
  dest: "/tmp/uploads/",
  limits: {
    fileSize: 50 * 1024 * 1024 * 1024, // 50 GB
    fieldSize: 50 * 1024 * 1024 * 1024
  }
});

app.post("/api/admin/videos/upload", upload.single("video"), async (req, res) => {
  const adminKey = req.headers["x-admin-key"] as string || req.body?.adminKey;
  if (!isAdminKey(adminKey) || isReadOnlyAdminKey(adminKey)) {
    return res.status(403).json({ error: "Unauthorized." });
  }

  if (!req.file) {
    return res.status(400).json({ error: "No video file provided." });
  }

  const storjConfig = getStorjConfig();
  const s3 = getS3Client();
  if (!storjConfig.isConfigured || !s3) {
    return res.status(500).json({ error: "Τα Storj credentials δεν έχουν οριστεί (STORJ_ACCESS_KEY, STORJ_SECRET_KEY, STORJ_BUCKET_NAME)." });
  }

  const storjBucket = storjConfig.bucketName;
  const fileId = uuidv4();
  const inputPath = req.file.path;
  const outputDir = path.join("/tmp", `hls_${fileId}`);
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log(`Starting HLS processing for fileId: ${fileId}...`);

  // Public URL format for Storj S3 Gateway
  const hlsUrl = `${storjConfig.endpoint}/${storjBucket}/${fileId}/playlist.m3u8`;
  
  // Respond immediately so the client (mobile browser/axios) doesn't timeout!
  res.json({
    success: true,
    hlsUrl: hlsUrl,
    message: "Η επεξεργασία του βίντεο ξεκίνησε στο παρασκήνιο. Θα εμφανιστεί μόλις ολοκληρωθεί!"
  });

  // Start the heavy FFmpeg work asynchronously in the background
  (async () => {
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

        await s3.send(new PutObjectCommand({
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
      
      console.log(`Upload complete for ${fileId}. HLS URL: ${hlsUrl}`);

    } catch (error: any) {
      console.error("HLS processing/upload error:", error);
      try {
        fs.rmSync(inputPath, { force: true });
        fs.rmSync(outputDir, { recursive: true, force: true });
      } catch(e) {}
    }
  })();
});

// ============================================
// AUTOMATIC STORJ SYNC & OFFICIAL METADATA (NO AI)
// ============================================

interface ParsedMedia {
  key: string;
  url: string;
  title: string;
  type: "movie" | "series";
  year?: string;
  seasonNumber: number;
  episodeNumber: number;
  episodeFileName: string;
  companionPosterUrl?: string;
  category: "gctunes" | "greek_streaming";
}

const SUPPORTED_VIDEO_EXTENSIONS = [".m3u8", ".mp4", ".mkv", ".avi", ".mov", ".webm", ".ts"];

function parseStorjMediaKey(
  key: string, 
  allImageKeys: string[], 
  storjBucket: string, 
  gatewayBase: string
): ParsedMedia | null {
  const lowerKey = key.toLowerCase();
  
  // Check if it has a valid media extension
  const hasValidExt = SUPPORTED_VIDEO_EXTENSIONS.some(ext => lowerKey.endsWith(ext));
  if (!hasValidExt) {
    return null;
  }
  
  // Ignore single .ts segment chunks inside an HLS stream (e.g. segment_001.ts, chunk-1.ts, data0.ts)
  // But allow if it is a standalone main .ts video or master playlist
  if (lowerKey.endsWith(".ts")) {
    const isSegment = /[-_.]?(segment|chunk|data|part)?\d{1,5}\.ts$/i.test(lowerKey);
    if (isSegment && !lowerKey.includes("master") && !lowerKey.includes("index")) {
      return null;
    }
  }

  // Ignore temporary folders and hidden files
  if (lowerKey.includes("/tmp/") || lowerKey.includes("/.cache/") || lowerKey.startsWith(".")) {
    return null;
  }

  const parts = key.split("/").filter(Boolean);
  if (parts.length === 0) return null;

  // Use the secure internal proxy endpoint to guarantee cross-device playback and avoid S3 CORS/Auth blocks
  const url = `/api/stream?key=${encodeURIComponent(key)}`;
  
  let rawTitle = "";
  let seasonNumber = 1;
  let episodeNumber = 1;
  let year: string | undefined = undefined;
  let type: "movie" | "series" = "series";
  let category: "gctunes" | "greek_streaming" = "gctunes";

  // Determine category based on path in Storj (gctunes vs Greek streaming)
  const fullKeyLower = key.toLowerCase();
  if (
    fullKeyLower.startsWith("greek streaming") ||
    fullKeyLower.startsWith("greek_streaming") ||
    fullKeyLower.startsWith("greekstreaming") ||
    parts.some(p => {
      const l = p.toLowerCase();
      return l === "greek streaming" || l === "greek_streaming" || l === "greekstreaming" || l === "streaming";
    })
  ) {
    category = "greek_streaming";
  } else if (
    fullKeyLower.startsWith("gctunes") ||
    fullKeyLower.startsWith("gctoons") ||
    parts.some(p => {
      const l = p.toLowerCase();
      return l === "gctunes" || l === "gctoons" || l === "cartoons" || l === "paidika" || l === "παιδικα" || l === "παιδικά";
    })
  ) {
    category = "gctunes";
  } else {
    category = "gctunes";
  }

  // Check for year in any path segment e.g. (2005) or 2005
  for (const part of parts) {
    const yMatch = part.match(/\b(19\d\d|20\d\d)\b/);
    if (yMatch && !part.toLowerCase().startsWith("s0") && !part.toLowerCase().startsWith("s1") && !part.toLowerCase().startsWith("s2")) {
      year = yMatch[1];
    }
  }

  const isInsideMoviesFolder = parts.some(p => {
    const l = p.toLowerCase();
    return l === "movies" || l === "tainies" || l === "ταινιες" || l === "ταινίες" || l === "ταινια" || l === "movie";
  });

  const fullPathText = parts.join(" ");
  
  // Detect Season and Episode patterns: S01E02, S1 Ep 2, 1x02, E02, Επεισόδιο 2, Part 2, Ep.2, 02 - Title
  const sxeMatch = fullPathText.match(/s(\d{1,2})[\s._-]*e(\d{1,3})/i) || fullPathText.match(/(\d{1,2})x(\d{1,3})/i);
  const epOnlyMatch = fullPathText.match(/(?:ep|episode|επεισοδιο|επεισόδιο|ep\.|e|part|pt)[\s._-]*(\d{1,3})/i) || fullPathText.match(/\bE(\d{1,3})\b/i);
  const seasonOnlyMatch = fullPathText.match(/(?:season|σεζον|σεζόν|κυκλος|κύκλος|s)[\s._-]*(\d{1,2})/i);
  const leadingNumMatch = parts[parts.length - 1].match(/^(\d{1,3})[\s._-]+/);

  if (sxeMatch) {
    type = "series";
    seasonNumber = parseInt(sxeMatch[1], 10);
    episodeNumber = parseInt(sxeMatch[2], 10);
  } else if (epOnlyMatch) {
    type = "series";
    episodeNumber = parseInt(epOnlyMatch[1], 10);
    if (seasonOnlyMatch) {
      seasonNumber = parseInt(seasonOnlyMatch[1], 10);
    }
  } else if (leadingNumMatch) {
    type = "series";
    episodeNumber = parseInt(leadingNumMatch[1], 10);
    if (seasonOnlyMatch) {
      seasonNumber = parseInt(seasonOnlyMatch[1], 10);
    }
  } else if (seasonOnlyMatch) {
    type = "series";
    seasonNumber = parseInt(seasonOnlyMatch[1], 10);
    const lastPart = parts[parts.length - 1].replace(/\.(m3u8|mp4|mkv|avi|mov|webm|ts)$/i, "");
    const numMatch = lastPart.match(/^(\d{1,3})$/) || lastPart.match(/(\d{1,3})/);
    if (numMatch) episodeNumber = parseInt(numMatch[1], 10);
  } else if (isInsideMoviesFolder || (parts.length === 1 && !/\d/.test(parts[0])) || (parts.length === 2 && parts[1].toLowerCase().startsWith("playlist"))) {
    type = isInsideMoviesFolder ? "movie" : "series";
  }

  // Extract clean series/movie title
  const cleanParts = parts.filter(p => {
    const l = p.toLowerCase();
    if (
      l === "gctunes" || 
      l === "gctoons" || 
      l === "greek streaming" || 
      l === "greek_streaming" || 
      l === "greekstreaming" || 
      l === "cartoons" || 
      l === "series" || 
      l === "movies" || 
      l === "paidika" || 
      l === "παιδικα" || 
      l === "παιδικά" ||
      l === "ταινιες" ||
      l === "ταινίες" ||
      l === "ταινια" ||
      l === "movie"
    ) return false;
    if (l === "playlist.m3u8" || l === "master.m3u8" || l === "index.m3u8" || l === "stream.m3u8") return false;
    if (/^s\d{1,2}e\d{1,3}/i.test(l)) return false;
    if (/^(season|σεζον|σεζόν)\s*\d{1,2}/i.test(l)) return false;
    if (/^(ep|episode|επεισοδιο|επεισόδιο)\s*\d{1,3}/i.test(l)) return false;
    return true;
  });

  rawTitle = cleanParts.length > 0 ? cleanParts[0] : parts[0];

  let cleanTitle = rawTitle
    .replace(/\.(m3u8|mp4|mkv|avi|mov|webm|ts)$/i, "")
    .replace(/\(\d{4}\)/g, "")
    .replace(/\[\d{4}\]/g, "")
    .replace(/s\d{1,2}e\d{1,3}/gi, "")
    .replace(/s\d{1,2}/gi, "")
    .replace(/e\d{1,3}/gi, "")
    .replace(/\b(1080p|720p|480p|2160p|4k|bluray|web-dl|hls|x264|x265|aac|dvdrip|hdtv)\b/gi, "")
    .replace(/[._-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleanTitle) {
    cleanTitle = parts[0].replace(/\.[^/.]+$/, "");
  }

  // Check for Companion Poster in Storj Bucket (e.g. folder/poster.jpg or show/cover.png)
  let companionPosterUrl: string | undefined = undefined;
  const parentPrefix = parts.slice(0, -1).join("/");
  const rootShowPrefix = parts[0];

  const matchedImg = allImageKeys.find(imgKey => {
    const l = imgKey.toLowerCase();
    const isImage = l.endsWith(".jpg") || l.endsWith(".jpeg") || l.endsWith(".png") || l.endsWith(".webp");
    if (!isImage) return false;
    
    if (parentPrefix && imgKey.startsWith(parentPrefix)) {
      if (l.includes("poster") || l.includes("cover") || l.includes("folder") || l.includes("thumb")) return true;
    }
    if (imgKey.startsWith(rootShowPrefix)) {
      if (l.includes("poster") || l.includes("cover") || l.includes("folder")) return true;
    }
    return false;
  });

  if (matchedImg) {
    companionPosterUrl = `${gatewayBase}/${storjBucket}/${matchedImg}`;
  }

  return {
    key,
    url,
    title: cleanTitle,
    type,
    year,
    seasonNumber,
    episodeNumber,
    episodeFileName: parts[parts.length - 1],
    companionPosterUrl,
    category
  };
}

// Deterministic Official Metadata Fetcher (Cinemeta / TVMaze / IMDb / Greek Wikipedia - Zero Generative AI)
async function fetchOfficialMetadata(title: string, type: "movie" | "series", year?: string, episodeNumber?: number) {
  let finalTitle = title;
  let finalDescription = "";
  let finalThumbnail = "";
  let originalTitle = title;
  let episodeTitle = "";
  let episodeDescription = "";
  let episodeThumbnail = "";
  let matchedYear = year || "";

  const fetchHeaders = { "User-Agent": "StreamEA/1.0 (https://streamea.app; info@streamea.app)" };

  // Sanitize title for search query (remove commas, excess punctuation, typos)
  const cleanSearchTitle = title
    .replace(/[,._:;-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // 1. Try Cinemeta (Official IMDb / Cinemeta catalog)
  try {
    const searchType = type === "series" ? "series" : "movie";
    let searchQuery = year ? `${cleanSearchTitle} ${year}` : cleanSearchTitle;
    let searchUrl = `https://v3-cinemeta.strem.io/catalog/${searchType}/top/search=${encodeURIComponent(searchQuery)}.json`;
    let searchRes = await fetch(searchUrl, { headers: fetchHeaders });
    let metas: any[] = [];
    
    if (searchRes.ok) {
      const searchData = await searchRes.json();
      metas = searchData.metas || [];
    }

    if (metas.length === 0) {
      searchQuery = cleanSearchTitle;
      searchUrl = `https://v3-cinemeta.strem.io/catalog/${searchType}/top/search=${encodeURIComponent(cleanSearchTitle)}.json`;
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
        const cleanReqTitle = cleanSearchTitle.toLowerCase().replace(/[^a-z0-9]/g, "");
        const exactMatches = metas.filter((m: any) => {
          const cleanM = String(m.name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
          return cleanM === cleanReqTitle || cleanM.includes(cleanReqTitle) || cleanReqTitle.includes(cleanM);
        });

        if (exactMatches.length > 0) {
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
    console.error("Cinemeta fetch error:", err);
  }

  // 2. TVMaze Fallback for TV series (Handles typos like "Avatar, Laste Benderr", provides posters & episode details)
  if (type === "series" && (!finalThumbnail || !episodeTitle)) {
    try {
      const tvMazeSearchUrl = `https://api.tvmaze.com/singlesearch/shows?q=${encodeURIComponent(cleanSearchTitle)}&embed=episodes`;
      const tvRes = await fetch(tvMazeSearchUrl, { headers: fetchHeaders });
      if (tvRes.ok) {
        const show = await tvRes.json();
        if (show && show.name) {
          if (!finalThumbnail) {
            finalThumbnail = show.image?.original || show.image?.medium || "";
          }
          if (!finalTitle || finalTitle === title) {
            finalTitle = show.name;
          }
          if (show.premiered && !matchedYear) {
            matchedYear = show.premiered.substring(0, 4);
          }
          if (!finalDescription && show.summary) {
            finalDescription = show.summary.replace(/<[^>]*>?/gm, "").trim();
          }

          if (show._embedded && show._embedded.episodes) {
            const epNum = Number(episodeNumber) || 1;
            const ep = show._embedded.episodes.find((e: any) => e.number === epNum);
            if (ep) {
              if (!episodeTitle) episodeTitle = ep.name || `Επεισόδιο ${epNum}`;
              if (!episodeDescription && ep.summary) {
                episodeDescription = ep.summary.replace(/<[^>]*>?/gm, "").trim();
              }
              if (!episodeThumbnail) {
                episodeThumbnail = ep.image?.original || ep.image?.medium || finalThumbnail;
              }
            }
          }
        }
      }
    } catch (tvErr) {
      console.error("TVMaze fetch error:", tvErr);
    }
  }

  // 3. Wikipedia for Greek Synopsis (if available)
  try {
    const wikiTitleBase = originalTitle || finalTitle || title;
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

          if (extract.includes("είναι Αμερικανός ηθοποιός") || extract.includes("είναι Αμερικανίδα ηθοποιός") || (extract.includes("ηθοποιός") && !extract.includes("σειρά") && !extract.includes("ταινία"))) {
            continue;
          }
          if (matchedYear && Number(matchedYear) < 2020) {
            if (extract.includes("του 2026") || extract.includes("του 2025") || extract.includes("του 2024")) {
              continue;
            }
          }
          if (type === "series" && extract.includes("ταινία του") && !extract.includes("σειρά")) {
            continue;
          }

          if (wikiData.extract) finalDescription = wikiData.extract;
          if (!finalThumbnail && wikiData.thumbnail?.source) {
            finalThumbnail = wikiData.thumbnail.source;
          }
          break;
        }
      }
    }
  } catch (err) {
    console.error("Wiki fetch error:", err);
  }

  if (!matchedYear) {
    const titleYearMatch = (finalTitle + " " + (originalTitle || title)).match(/\b(19\d\d|20\d\d)\b/);
    if (titleYearMatch) matchedYear = titleYearMatch[1];
  }

  if (!finalThumbnail) {
    finalThumbnail = type === "series" 
      ? "https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?q=80&w=800&auto=format&fit=crop"
      : "https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=800&auto=format&fit=crop";
  }
  if (!finalDescription) {
    finalDescription = type === "series" ? `Σειρά: ${finalTitle}` : `Ταινία: ${finalTitle}`;
  }

  // Ensure title never contains trailing year like (2005)
  finalTitle = finalTitle.replace(/\s*[\(\[]\s*\d{4}\s*[\)\]]\s*$/, "").trim();

  return {
    finalTitle,
    originalTitle,
    finalThumbnail,
    finalDescription,
    matchedYear,
    episodeTitle,
    episodeDescription,
    episodeThumbnail
  };
}

// 5b. Admin: Scan & Auto-Sync from Storj Object Storage (Zero AI Required)
app.post("/api/admin/storj-sync", async (req, res) => {
  const adminKey = req.headers["x-admin-key"] as string || req.body?.adminKey;
  if (!isAdminKey(adminKey) || isReadOnlyAdminKey(adminKey)) {
    return res.status(403).json({ error: "Unauthorized. Admin key required." });
  }

  const storjConfig = getStorjConfig();
  const s3 = getS3Client();
  if (!storjConfig.isConfigured || !s3) {
    return res.status(500).json({ 
      error: `Τα Storj credentials δεν έχουν οριστεί σωστά. (AccessKey: ${storjConfig.accessKey ? "OK" : "Missing"}, SecretKey: ${storjConfig.secretKey ? "OK" : "Missing"}, Bucket: ${storjConfig.bucketName ? "OK" : "Missing"}). Ελέγξτε τις ρυθμίσεις στο Settings -> Secrets.` 
    });
  }

  const storjBucket = storjConfig.bucketName;
  const gatewayBase = storjConfig.endpoint;

  try {
    console.log(`Starting Storj Bucket Scan for bucket: ${storjBucket}...`);
    
    // Fetch all objects in bucket
    let allObjects: any[] = [];
    let continuationToken: string | undefined = undefined;

    do {
      const listCommand = new ListObjectsV2Command({
        Bucket: storjBucket,
        ContinuationToken: continuationToken,
        MaxKeys: 1000
      });
      const listRes = await s3.send(listCommand);
      if (listRes.Contents) {
        allObjects.push(...listRes.Contents);
      }
      continuationToken = listRes.NextContinuationToken;
    } while (continuationToken);

    console.log(`Storj Scan found ${allObjects.length} total objects in bucket.`);

    const allKeys = allObjects.map(o => o.Key || "").filter(Boolean);
    const allImageKeys = allKeys.filter(k => {
      const l = k.toLowerCase();
      return l.endsWith(".jpg") || l.endsWith(".jpeg") || l.endsWith(".png") || l.endsWith(".webp");
    });

    // Find all media files (.m3u8, .mp4, .mkv, .avi, .mov, .webm, .ts)
    const mediaKeys = allKeys.filter(k => {
      const l = k.toLowerCase();
      const hasExt = SUPPORTED_VIDEO_EXTENSIONS.some(ext => l.endsWith(ext));
      if (!hasExt) return false;
      if (l.endsWith(".ts")) {
        const isSegment = /[-_.]?(segment|chunk|data|part)?\d{1,5}\.ts$/i.test(l);
        if (isSegment && !l.includes("master") && !l.includes("index")) return false;
      }
      return !l.includes("/tmp/") && !l.includes("/.cache/") && !l.startsWith(".");
    });

    console.log(`Found ${mediaKeys.length} media playlist/video files.`);

    let addedCount = 0;
    let updatedCount = 0;
    const syncLog: string[] = [];
    const detectedItems: Array<{
      key: string;
      title: string;
      year?: string;
      type: "series" | "movie";
      category: "gctunes" | "greek_streaming";
      categoryLabel: string;
      episodeNumber?: number;
      episodeTitle?: string;
      thumbnail: string;
      storageUrl: string;
      status: "created" | "updated" | "already_indexed";
      statusText: string;
    }> = [];

    for (const key of mediaKeys) {
      const parsed = parseStorjMediaKey(key, allImageKeys, storjBucket, gatewayBase);
      if (!parsed) continue;

      // Check if this exact video URL or key is already in our catalog
      const existingVideo = videos.find(v => {
        if (v.url === parsed.url || v.url?.includes(encodeURIComponent(key)) || v.url?.includes(key)) return true;
        if (v.episodes && v.episodes.some(e => e.url === parsed.url || e.url?.includes(encodeURIComponent(key)) || e.url?.includes(key))) return true;
        return false;
      });

      if (existingVideo) {
        // Already indexed media file - update url to proxy endpoint if needed
        if (existingVideo.url && (existingVideo.url.includes("gateway.storjshare.io") || existingVideo.url.includes("gateway."))) {
          existingVideo.url = parsed.url;
        }
        const ep = existingVideo.episodes?.find(e => e.url === parsed.url || e.url?.includes(encodeURIComponent(key)) || e.url?.includes(key));
        if (ep) {
          ep.url = parsed.url;
        }
        detectedItems.push({
          key,
          title: existingVideo.title,
          year: existingVideo.year,
          type: existingVideo.type,
          category: parsed.category,
          categoryLabel: parsed.category === "greek_streaming" ? "Greek Streaming" : "Greek Cartoons",
          episodeNumber: ep?.episodeNumber || (parsed.type === "series" ? parsed.episodeNumber : undefined),
          episodeTitle: ep?.title,
          thumbnail: ep?.thumbnail || existingVideo.thumbnail,
          storageUrl: parsed.url,
          status: "already_indexed",
          statusText: "Δημιουργήθηκε στο UI με επιτυχία"
        });
        continue;
      }

      console.log(`Processing media: ${parsed.title} (Type: ${parsed.type}, Ep: ${parsed.episodeNumber})...`);

      // Fetch official deterministic metadata (IMDb/Cinemeta & Wiki)
      const meta = await fetchOfficialMetadata(parsed.title, parsed.type, parsed.year, parsed.episodeNumber);

      const resolvedThumbnail = parsed.companionPosterUrl || meta.finalThumbnail;
      const cleanTitle = meta.finalTitle || parsed.title;
      const matchedYear = meta.matchedYear || parsed.year;

      if (parsed.type === "series") {
        const epNum = parsed.episodeNumber;
        let formattedEpTitle = `Επεισόδιο ${epNum}`;

        if (meta.episodeTitle) {
          const translated = await translateToGreek(meta.episodeTitle);
          const lower = translated.toLowerCase();
          if (lower.startsWith("επεισόδιο") || lower.startsWith("episode")) {
            formattedEpTitle = translated;
          } else {
            formattedEpTitle = `Επεισόδιο ${epNum}: ${translated}`;
          }
        }

        let formattedEpDesc = meta.episodeDescription 
          ? await translateToGreek(meta.episodeDescription) 
          : `Επεισόδιο ${epNum} της σειράς ${cleanTitle}.`;

        const epItem: Episode = {
          id: `${Date.now()}-ep-${epNum}-${Math.random().toString(36).substring(2, 6)}`,
          episodeNumber: epNum,
          title: formattedEpTitle,
          description: formattedEpDesc,
          thumbnail: meta.episodeThumbnail || resolvedThumbnail,
          url: parsed.url
        };

        // Check if this series already exists in catalog
        const cleanReqTitle = cleanTitle.toLowerCase().trim();
        const existingSeriesIndex = videos.findIndex(v => {
          if (v.type !== "series") return false;
          const cleanV = v.title.toLowerCase().trim();
          const titleMatches = cleanV === cleanReqTitle || cleanV.includes(cleanReqTitle) || cleanReqTitle.includes(cleanV);
          if (!titleMatches) return false;

          if (v.year && matchedYear) {
            const y1 = parseInt(v.year, 10);
            const y2 = parseInt(matchedYear, 10);
            if (!isNaN(y1) && !isNaN(y2) && Math.abs(y1 - y2) > 3) return false;
          }
          return true;
        });

        if (existingSeriesIndex !== -1) {
          const existingSeries = videos[existingSeriesIndex];
          existingSeries.episodes = existingSeries.episodes || [];
          existingSeries.year = matchedYear || existingSeries.year;
          existingSeries.category = parsed.category || existingSeries.category || "gctunes";
          
          const epIdx = existingSeries.episodes.findIndex(e => e.episodeNumber === epNum);
          if (epIdx !== -1) {
            existingSeries.episodes[epIdx] = epItem;
          } else {
            existingSeries.episodes.push(epItem);
            existingSeries.episodes.sort((a, b) => a.episodeNumber - b.episodeNumber);
          }

          if (resolvedThumbnail && (!existingSeries.thumbnail || existingSeries.thumbnail.includes("unsplash"))) {
            existingSeries.thumbnail = resolvedThumbnail;
          }
          if (meta.finalDescription && (!existingSeries.description || existingSeries.description.length < meta.finalDescription.length)) {
            existingSeries.description = meta.finalDescription;
          }

          updatedCount++;
          syncLog.push(`Ενημερώθηκε σειρά "${cleanTitle}" [${parsed.category === "greek_streaming" ? "Greek Streaming" : "GC Tunes"}] με το Επεισόδιο ${epNum}`);
          
          detectedItems.push({
            key,
            title: cleanTitle,
            year: matchedYear,
            type: "series",
            category: parsed.category,
            categoryLabel: parsed.category === "greek_streaming" ? "Greek Streaming" : "Greek Cartoons",
            episodeNumber: epNum,
            episodeTitle: formattedEpTitle,
            thumbnail: epItem.thumbnail || resolvedThumbnail,
            storageUrl: parsed.url,
            status: "updated",
            statusText: "Δημιουργήθηκε στο UI με επιτυχία"
          });
        } else {
          // New Series
          const newSeries: Video = {
            id: uuidv4(),
            title: cleanTitle,
            description: meta.finalDescription || `Σειρά: ${cleanTitle}`,
            url: parsed.url,
            thumbnail: resolvedThumbnail,
            type: "series",
            year: matchedYear,
            category: parsed.category,
            episodes: [epItem]
          };

          videos.unshift(newSeries);
          addedCount++;
          syncLog.push(`Προστέθηκε νέα σειρά "${cleanTitle}" [${parsed.category === "greek_streaming" ? "Greek Streaming" : "GC Tunes"}] (Επεισόδιο ${epNum})`);

          detectedItems.push({
            key,
            title: cleanTitle,
            year: matchedYear,
            type: "series",
            category: parsed.category,
            categoryLabel: parsed.category === "greek_streaming" ? "Greek Streaming" : "Greek Cartoons",
            episodeNumber: epNum,
            episodeTitle: formattedEpTitle,
            thumbnail: epItem.thumbnail || resolvedThumbnail,
            storageUrl: parsed.url,
            status: "created",
            statusText: "Δημιουργήθηκε στο UI με επιτυχία"
          });
        }
      } else {
        // Movie
        const newMovie: Video = {
          id: uuidv4(),
          title: cleanTitle,
          description: meta.finalDescription || `Ταινία: ${cleanTitle}`,
          url: parsed.url,
          thumbnail: resolvedThumbnail,
          type: "movie",
          category: parsed.category,
          year: matchedYear
        };

        videos.unshift(newMovie);
        addedCount++;
        syncLog.push(`Προστέθηκε ταινία "${cleanTitle}" [${parsed.category === "greek_streaming" ? "Greek Streaming" : "GC Tunes"}]`);

        detectedItems.push({
          key,
          title: cleanTitle,
          year: matchedYear,
          type: "movie",
          category: parsed.category,
          categoryLabel: parsed.category === "greek_streaming" ? "Greek Streaming" : "Greek Cartoons",
          thumbnail: resolvedThumbnail,
          storageUrl: parsed.url,
          status: "created",
          statusText: "Δημιουργήθηκε στο UI με επιτυχία"
        });
      }
    }

    // Persist changes to database.json
    saveDatabase();

    const resultMsg = mediaKeys.length === 0
      ? `Η σύνδεση με το Storj Bucket "${storjBucket}" πέτυχε 100%! Δεν βρέθηκαν νέα αρχεία .m3u8 ή .mp4 στο bucket.`
      : `Ο αυτόματος συγχρονισμός ολοκληρώθηκε με επιτυχία! Εντοπίστηκαν ${mediaKeys.length} αρχεία στο Storage και δημιουργήθηκαν στο UI.`;

    return res.json({
      success: true,
      scannedMediaFiles: mediaKeys.length,
      addedCount,
      updatedCount,
      totalCatalogVideos: videos.length,
      detectedItems,
      log: syncLog,
      message: resultMsg
    });

  } catch (err: any) {
    console.error("Storj Sync Error:", err);
    return res.status(500).json({ error: err.message || "Αποτυχία συγχρονισμού από το Storj" });
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
    thumbnail,
    category = "gctunes"
  } = req.body;
  
  if (licenseKey !== ADMIN_KEY) {
    return res.status(403).json({ error: "Unauthorized. Admin key required." });
  }

  if (!title || !url) {
    return res.status(400).json({ error: "Missing required fields (title, url)" });
  }

  const validatedCategory: "gctunes" | "greek_streaming" = category === "greek_streaming" ? "greek_streaming" : "gctunes";

  // Fetch official deterministic metadata (Cinemeta / Wikipedia)
  const meta = await fetchOfficialMetadata(title, type, year, episodeNumber);

  const finalTitle = title || meta.finalTitle;
  const finalDescription = description || meta.finalDescription || (type === "series" ? `Σειρά: ${finalTitle}` : `Ταινία: ${finalTitle}`);
  const finalThumbnail = thumbnail || meta.finalThumbnail;
  const matchedYear = meta.matchedYear || year;

  let finalEpisodes: Episode[] = [];

  if (type === "series") {
    const epNum = Number(episodeNumber) || 1;
    let formattedEpTitle = `Επεισόδιο ${epNum}`;

    if (meta.episodeTitle) {
      const translated = await translateToGreek(meta.episodeTitle);
      const lower = translated.toLowerCase();
      if (lower.startsWith("επεισόδιο") || lower.startsWith("episode")) {
        formattedEpTitle = translated;
      } else {
        formattedEpTitle = `Επεισόδιο ${epNum}: ${translated}`;
      }
    }

    let formattedEpDesc = meta.episodeDescription 
      ? await translateToGreek(meta.episodeDescription) 
      : (description || `Επεισόδιο ${epNum} της σειράς ${finalTitle}.`);

    const epItem: Episode = {
      id: `${Date.now()}-ep-${epNum}`,
      episodeNumber: epNum,
      title: formattedEpTitle,
      description: formattedEpDesc,
      thumbnail: meta.episodeThumbnail || finalThumbnail,
      url: url
    };
    finalEpisodes = [epItem];

    // Check if series already exists
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
          return false;
        }
      }
      return true;
    });

    if (existingSeriesIndex !== -1) {
      const existingSeries = videos[existingSeriesIndex];
      existingSeries.episodes = existingSeries.episodes || [];
      existingSeries.year = matchedYear || existingSeries.year || year;
      existingSeries.category = validatedCategory;
      
      const existingEpIndex = existingSeries.episodes.findIndex(e => e.episodeNumber === epNum);
      if (existingEpIndex !== -1) {
        existingSeries.episodes[existingEpIndex] = epItem;
      } else {
        existingSeries.episodes.push(epItem);
        existingSeries.episodes.sort((a, b) => a.episodeNumber - b.episodeNumber);
      }
      
      if (finalThumbnail && (!existingSeries.thumbnail || existingSeries.thumbnail.includes('unsplash'))) {
        existingSeries.thumbnail = finalThumbnail;
      }
      if (finalDescription) {
        existingSeries.description = finalDescription;
      }

      videos.splice(existingSeriesIndex, 1);
      videos.unshift(existingSeries);
      saveDatabase();
      
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
    category: validatedCategory,
    year: matchedYear || year,
    episodes: finalEpisodes
  };
  
  videos.unshift(newVideo);
  saveDatabase();
  res.json({ success: true, video: newVideo });
});

// 7. Admin Live Edit: Update Video Details (Title, Poster, Description, Year, Episodes, Category, etc.)
app.put("/api/videos/:id", async (req, res) => {
  const { id } = req.params;
  const adminKey = (req.headers["x-admin-key"] as string) || req.body?.adminKey || req.body?.licenseKey;

  if (!isAdminKey(adminKey) || isReadOnlyAdminKey(adminKey)) {
    return res.status(403).json({ error: "Unauthorized. Admin key required." });
  }

  const videoIndex = videos.findIndex(v => v.id === id);
  if (videoIndex === -1) {
    return res.status(404).json({ error: "Video not found" });
  }

  const current = videos[videoIndex];
  const {
    title,
    description,
    thumbnail,
    backdrop,
    year,
    type,
    category,
    url,
    episodes,
    genres
  } = req.body;

  const updatedVideo: Video = {
    ...current,
    title: typeof title === "string" ? title.trim() : current.title,
    description: typeof description === "string" ? description.trim() : current.description,
    thumbnail: typeof thumbnail === "string" ? thumbnail.trim() : current.thumbnail,
    url: typeof url === "string" ? url.trim() : current.url,
    type: type === "series" || type === "movie" ? type : current.type,
    category: category === "greek_streaming" || category === "gctunes" ? category : current.category,
    year: typeof year === "string" ? year.trim() : current.year,
    backdrop: typeof backdrop === "string" ? backdrop.trim() : (current as any).backdrop,
    genres: Array.isArray(genres) ? genres : (current as any).genres,
    episodes: Array.isArray(episodes) ? episodes : current.episodes
  };

  // If type is series and episodes have been updated, make sure they are sorted
  if (updatedVideo.type === "series" && updatedVideo.episodes) {
    updatedVideo.episodes.sort((a, b) => (a.episodeNumber || 1) - (b.episodeNumber || 1));
  }

  videos[videoIndex] = updatedVideo;
  saveDatabase();

  console.log(`[Admin Live Edit] Successfully updated video "${updatedVideo.title}" (${updatedVideo.id})`);
  return res.json({ success: true, video: updatedVideo });
});

// 8. Admin Live Edit: Delete Video
app.delete("/api/videos/:id", async (req, res) => {
  const { id } = req.params;
  const adminKey = (req.headers["x-admin-key"] as string) || req.body?.adminKey || (req.query.adminKey as string);

  if (!isAdminKey(adminKey) || isReadOnlyAdminKey(adminKey)) {
    return res.status(403).json({ error: "Unauthorized. Admin key required." });
  }

  const videoIndex = videos.findIndex(v => v.id === id);
  if (videoIndex === -1) {
    return res.status(404).json({ error: "Video not found" });
  }

  const removedTitle = videos[videoIndex].title;
  videos.splice(videoIndex, 1);
  saveDatabase();

  console.log(`[Admin Live Edit] Successfully deleted video "${removedTitle}" (${id})`);
  return res.json({ success: true, message: `Ο τίτλος "${removedTitle}" διαγράφηκε επιτυχώς.` });
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

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
  server.setTimeout(0);
  server.keepAliveTimeout = 0;
  server.headersTimeout = 0;
}

startServer();
