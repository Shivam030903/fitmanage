import makeWASocket, { useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import pino from 'pino';
import QRCode from 'qrcode';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { getMongoDb, db } from '../db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const AUTH_BASE_DIR = path.resolve(__dirname, '../../data/baileys_auth');

if (!fs.existsSync(AUTH_BASE_DIR)) {
  fs.mkdirSync(AUTH_BASE_DIR, { recursive: true });
}

/**
 * Individual Gym WhatsApp Web Session
 */
export class GymWhatsAppSession {
  constructor(gymId) {
    this.gymId = gymId;
    this.sock = null;
    this.status = 'disconnected'; // 'initializing', 'qr_ready', 'connecting', 'connected', 'disconnected'
    this.rawQr = null;
    this.qrCodeDataUrl = null;
    this.linkedPhone = null;
    this.pushName = null;
    this.isConnecting = false;
    this.authDir = path.resolve(AUTH_BASE_DIR, this.gymId);

    if (!fs.existsSync(this.authDir)) {
      fs.mkdirSync(this.authDir, { recursive: true });
    }
  }

  /**
   * Restore saved WhatsApp credentials for this specific gym from MongoDB Atlas
   */
  async restoreAuthFromMongo() {
    try {
      const mongo = getMongoDb();
      if (!mongo) return;

      const authCol = mongo.collection('baileys_auth');
      let docs = await authCol.find({ gymId: this.gymId }).toArray();

      // If no docs found with gymId, and this is primary gym, migrate legacy untagged docs
      if ((!docs || docs.length === 0) && (this.gymId === 'gym_1795021748195' || this.gymId === 'default')) {
        const legacyDocs = await authCol.find({ gymId: { $exists: false } }).toArray();
        if (legacyDocs && legacyDocs.length > 0) {
          console.log(`[WhatsApp Web] Migrating ${legacyDocs.length} legacy cloud credentials to gym ${this.gymId}...`);
          for (const d of legacyDocs) {
            await authCol.updateOne(
              { _id: d._id },
              { $set: { gymId: this.gymId, fileName: d._id } }
            );
          }
          docs = legacyDocs;
        }
      }

      if (docs && docs.length > 0) {
        if (!fs.existsSync(this.authDir)) {
          fs.mkdirSync(this.authDir, { recursive: true });
        }
        for (const doc of docs) {
          const fileName = doc.fileName || doc._id.replace(`${this.gymId}_`, '');
          const filePath = path.join(this.authDir, fileName);
          fs.writeFileSync(filePath, Buffer.from(doc.content, 'base64'));
        }
        console.log(`✅ [WhatsApp Web] Restored ${docs.length} credential files for gym ${this.gymId} from MongoDB Atlas!`);
      }
    } catch (err) {
      console.warn(`[WhatsApp Web] Auth restore error for gym ${this.gymId}:`, err.message);
    }
  }

  /**
   * Sync active WhatsApp credentials for this gym from disk to MongoDB Atlas
   */
  async syncAuthToMongo() {
    try {
      const mongo = getMongoDb();
      if (!mongo || !fs.existsSync(this.authDir)) return;

      const authCol = mongo.collection('baileys_auth');
      const files = fs.readdirSync(this.authDir);
      if (files.length === 0) return;

      for (const file of files) {
        const filePath = path.join(this.authDir, file);
        if (fs.statSync(filePath).isFile()) {
          const buf = fs.readFileSync(filePath);
          const docId = `${this.gymId}_${file}`;
          await authCol.updateOne(
            { _id: docId },
            { 
              $set: { 
                gymId: this.gymId,
                fileName: file,
                content: buf.toString('base64'), 
                updatedAt: new Date() 
              } 
            },
            { upsert: true }
          );
        }
      }
      console.log(`☁️ [WhatsApp Web] Synced ${files.length} credential files for gym ${this.gymId} to MongoDB Atlas.`);
    } catch (err) {
      console.warn(`[WhatsApp Web] Auth cloud sync error for gym ${this.gymId}:`, err.message);
    }
  }

  /**
   * Delete cloud credentials on logout for this gym only
   */
  async clearMongoAuth() {
    try {
      const mongo = getMongoDb();
      if (mongo) {
        await mongo.collection('baileys_auth').deleteMany({
          $or: [
            { gymId: this.gymId },
            { _id: { $regex: `^${this.gymId}_` } }
          ]
        });
        console.log(`[WhatsApp Web] Cleared auth credentials for gym ${this.gymId} from MongoDB Atlas.`);
      }
    } catch (err) {}
  }

  async init() {
    if (this.isConnecting || this.status === 'connected') return;
    this.isConnecting = true;
    this.status = 'initializing';

    try {
      // 1. Restore cloud auth if fresh instance
      await this.restoreAuthFromMongo();

      const { state, saveCreds } = await useMultiFileAuthState(this.authDir);
      const logger = pino({ level: 'silent' });

      this.sock = makeWASocket({
        auth: state,
        logger,
        printQRInTerminal: false,
        browser: ['FitManage Gym System', 'Chrome', '1.0.0'],
        syncFullHistory: false
      });

      this.sock.ev.on('creds.update', async () => {
        await saveCreds();
        await this.syncAuthToMongo();
      });

      this.sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          this.rawQr = qr;
          try {
            this.qrCodeDataUrl = await QRCode.toDataURL(qr, { margin: 2, scale: 7 });
            this.status = 'qr_ready';
            console.log(`[WhatsApp Web] New QR Code generated for gym [${this.gymId}] Linked Devices pairing.`);
          } catch (e) {
            console.error(`[WhatsApp Web] QR render error for gym ${this.gymId}:`, e);
          }
        }

        if (connection === 'close') {
          this.isConnecting = false;
          const statusCode = lastDisconnect?.error?.output?.statusCode;
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

          console.log(`[WhatsApp Web - Gym: ${this.gymId}] Connection closed (code ${statusCode}). Reconnect: ${shouldReconnect}`);

          if (shouldReconnect) {
            this.status = 'connecting';
            setTimeout(() => this.init(), 4000);
          } else {
            this.status = 'disconnected';
            this.rawQr = null;
            this.qrCodeDataUrl = null;
            this.linkedPhone = null;
            try {
              fs.rmSync(this.authDir, { recursive: true, force: true });
              fs.mkdirSync(this.authDir, { recursive: true });
            } catch (err) {
              console.error(`[WhatsApp Web] Auth cleanup error for gym ${this.gymId}:`, err);
            }
            await this.clearMongoAuth();
          }
        } else if (connection === 'open') {
          this.isConnecting = false;
          this.status = 'connected';
          this.rawQr = null;
          this.qrCodeDataUrl = null;
          const userJid = this.sock.user?.id || '';
          this.linkedPhone = userJid.split(':')[0] || userJid.split('@')[0];
          this.pushName = this.sock.user?.name || 'Gym Admin';
          console.log(`✅ [WhatsApp Web] Device for gym [${this.gymId}] paired & connected! Phone: +${this.linkedPhone}`);
          
          await this.syncAuthToMongo();
        }
      });
    } catch (err) {
      console.error(`[WhatsApp Web] Initialization failed for gym ${this.gymId}:`, err.message);
      this.isConnecting = false;
      this.status = 'disconnected';
    }
  }

  getStatus() {
    return {
      gymId: this.gymId,
      status: this.status,
      isConnected: this.status === 'connected',
      qrCode: this.qrCodeDataUrl,
      linkedPhone: this.linkedPhone,
      pushName: this.pushName
    };
  }

  async sendMessage(toPhone, messageText) {
    if (this.status !== 'connected' || !this.sock) {
      throw new Error(`WhatsApp device for gym is not connected. Please scan the QR code in Settings.`);
    }

    const cleanPhone = toPhone.replace(/\D/g, '').slice(-10);
    const intlPhone = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;
    const jid = `${intlPhone}@s.whatsapp.net`;

    const result = await this.sock.sendMessage(jid, { text: messageText });
    return {
      success: true,
      messageId: result.key?.id,
      to: `+${intlPhone}`,
      status: 'DELIVERED_AUTOMATIC',
      provider: 'whatsapp_qr',
      gymId: this.gymId
    };
  }

  async logout() {
    try {
      if (this.sock) {
        await this.sock.logout().catch(() => {});
      }
    } catch (e) {}

    this.sock = null;
    this.status = 'disconnected';
    this.rawQr = null;
    this.qrCodeDataUrl = null;
    this.linkedPhone = null;

    try {
      fs.rmSync(this.authDir, { recursive: true, force: true });
      fs.mkdirSync(this.authDir, { recursive: true });
    } catch (e) {}

    await this.clearMongoAuth();
    setTimeout(() => this.init(), 1000);
    return { success: true };
  }
}

/**
 * Multi-Tenant WhatsApp Web Manager
 */
class WhatsAppWebManager {
  constructor() {
    this.sessions = new Map();
  }

  /**
   * Migrate any loose files in root baileys_auth/ into primary gym subfolder
   */
  migrateLegacyAuth() {
    try {
      if (!fs.existsSync(AUTH_BASE_DIR)) {
        fs.mkdirSync(AUTH_BASE_DIR, { recursive: true });
        return;
      }
      const items = fs.readdirSync(AUTH_BASE_DIR);
      const looseFiles = items.filter(f => {
        const p = path.join(AUTH_BASE_DIR, f);
        return fs.statSync(p).isFile();
      });

      if (looseFiles.length > 0) {
        const primaryGymId = 'gym_1795021748195';
        const targetDir = path.join(AUTH_BASE_DIR, primaryGymId);
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }
        for (const file of looseFiles) {
          const src = path.join(AUTH_BASE_DIR, file);
          const dest = path.join(targetDir, file);
          fs.copyFileSync(src, dest);
          fs.unlinkSync(src);
        }
        console.log(`[WhatsApp Web] Migrated ${looseFiles.length} legacy files into dedicated folder: ${primaryGymId}`);
      }
    } catch (e) {
      console.warn('[WhatsApp Web] Legacy migration error:', e.message);
    }
  }

  getSession(gymId = 'gym_1795021748195') {
    const id = gymId || 'gym_1795021748195';
    if (!this.sessions.has(id)) {
      const session = new GymWhatsAppSession(id);
      this.sessions.set(id, session);
    }
    return this.sessions.get(id);
  }

  async init(gymId) {
    this.migrateLegacyAuth();
    const session = this.getSession(gymId);
    return await session.init();
  }

  async initAll() {
    this.migrateLegacyAuth();
    try {
      const gyms = db.gyms.find({});
      if (gyms.length === 0) {
        this.getSession('gym_1795021748195').init().catch(() => {});
      } else {
        for (const gym of gyms) {
          const session = this.getSession(gym._id);
          session.init().catch(e => console.error(`[WhatsApp Web] Init error on gym ${gym._id}:`, e.message));
        }
      }
    } catch (e) {
      console.error('[WhatsApp Web] initAll error:', e);
    }
  }

  getStatus(gymId) {
    const session = this.getSession(gymId);
    return session.getStatus();
  }

  async sendMessage(gymId, toPhone, messageText) {
    const session = this.getSession(gymId);
    return await session.sendMessage(toPhone, messageText);
  }

  async logout(gymId) {
    const session = this.getSession(gymId);
    return await session.logout();
  }
}

export const whatsappWebService = new WhatsAppWebManager();
