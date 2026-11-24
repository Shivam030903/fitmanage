import makeWASocket, { useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import pino from 'pino';
import QRCode from 'qrcode';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { getMongoDb } from '../db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const AUTH_DIR = path.resolve(__dirname, '../../data/baileys_auth');

if (!fs.existsSync(AUTH_DIR)) {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
}

class WhatsAppWebService {
  constructor() {
    this.sock = null;
    this.status = 'disconnected'; // 'initializing', 'qr_ready', 'connecting', 'connected', 'disconnected'
    this.rawQr = null;
    this.qrCodeDataUrl = null;
    this.linkedPhone = null;
    this.pushName = null;
    this.isConnecting = false;
  }

  /**
   * Restore saved WhatsApp credentials from MongoDB Atlas cloud
   */
  async restoreAuthFromMongo() {
    try {
      const mongo = getMongoDb();
      if (!mongo) return;

      const authCol = mongo.collection('baileys_auth');
      const docs = await authCol.find({}).toArray();
      if (docs && docs.length > 0) {
        if (!fs.existsSync(AUTH_DIR)) {
          fs.mkdirSync(AUTH_DIR, { recursive: true });
        }
        for (const doc of docs) {
          const filePath = path.join(AUTH_DIR, doc._id);
          fs.writeFileSync(filePath, Buffer.from(doc.content, 'base64'));
        }
        console.log(`✅ [WhatsApp Web] Restored ${docs.length} credential files from MongoDB Atlas cloud!`);
      }
    } catch (err) {
      console.warn('[WhatsApp Web] Could not restore auth from MongoDB:', err.message);
    }
  }

  /**
   * Sync active WhatsApp credentials from local disk to MongoDB Atlas cloud
   */
  async syncAuthToMongo() {
    try {
      const mongo = getMongoDb();
      if (!mongo || !fs.existsSync(AUTH_DIR)) return;

      const authCol = mongo.collection('baileys_auth');
      const files = fs.readdirSync(AUTH_DIR);
      if (files.length === 0) return;

      for (const file of files) {
        const filePath = path.join(AUTH_DIR, file);
        if (fs.statSync(filePath).isFile()) {
          const buf = fs.readFileSync(filePath);
          await authCol.updateOne(
            { _id: file },
            { $set: { content: buf.toString('base64'), updatedAt: new Date() } },
            { upsert: true }
          );
        }
      }
      console.log(`☁️ [WhatsApp Web] Synced ${files.length} credential files to MongoDB Atlas.`);
    } catch (err) {
      console.warn('[WhatsApp Web] Auth cloud sync warning:', err.message);
    }
  }

  /**
   * Delete cloud credentials on logout
   */
  async clearMongoAuth() {
    try {
      const mongo = getMongoDb();
      if (mongo) {
        await mongo.collection('baileys_auth').deleteMany({});
        console.log('[WhatsApp Web] Cleared auth credentials from MongoDB Atlas.');
      }
    } catch (err) {}
  }

  async init() {
    if (this.isConnecting || this.status === 'connected') return;
    this.isConnecting = true;
    this.status = 'initializing';

    try {
      // 1. Restore cloud auth if container is fresh (e.g. on Render)
      await this.restoreAuthFromMongo();

      const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
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
            console.log('[WhatsApp Web] New QR Code generated for Linked Devices pairing.');
          } catch (e) {
            console.error('[WhatsApp Web] QR render error:', e);
          }
        }

        if (connection === 'close') {
          this.isConnecting = false;
          const statusCode = lastDisconnect?.error?.output?.statusCode;
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

          console.log(`[WhatsApp Web] Connection closed (code ${statusCode}). Reconnect: ${shouldReconnect}`);

          if (shouldReconnect) {
            this.status = 'connecting';
            setTimeout(() => this.init(), 4000);
          } else {
            this.status = 'disconnected';
            this.rawQr = null;
            this.qrCodeDataUrl = null;
            this.linkedPhone = null;
            // Clean up credentials if logged out
            try {
              fs.rmSync(AUTH_DIR, { recursive: true, force: true });
              fs.mkdirSync(AUTH_DIR, { recursive: true });
            } catch (err) {
              console.error('[WhatsApp Web] Auth cleanup error:', err);
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
          console.log(`✅ [WhatsApp Web] Device successfully paired & connected! Phone: +${this.linkedPhone}`);
          
          // Save active state to MongoDB Atlas immediately
          await this.syncAuthToMongo();
        }
      });
    } catch (err) {
      console.error('[WhatsApp Web] Initialization failed:', err.message);
      this.isConnecting = false;
      this.status = 'disconnected';
    }
  }

  getStatus() {
    return {
      status: this.status,
      isConnected: this.status === 'connected',
      qrCode: this.qrCodeDataUrl,
      linkedPhone: this.linkedPhone,
      pushName: this.pushName
    };
  }

  async sendMessage(toPhone, messageText) {
    if (this.status !== 'connected' || !this.sock) {
      throw new Error('WhatsApp device is not currently linked. Please scan the QR code in Settings.');
    }

    // Format Indian mobile number to E.164 JID
    const cleanPhone = toPhone.replace(/\D/g, '').slice(-10);
    const intlPhone = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;
    const jid = `${intlPhone}@s.whatsapp.net`;

    const result = await this.sock.sendMessage(jid, { text: messageText });
    return {
      success: true,
      messageId: result.key?.id,
      to: `+${intlPhone}`,
      status: 'DELIVERED_AUTOMATIC',
      provider: 'whatsapp_qr'
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
      fs.rmSync(AUTH_DIR, { recursive: true, force: true });
      fs.mkdirSync(AUTH_DIR, { recursive: true });
    } catch (e) {}

    await this.clearMongoAuth();

    // Generate fresh QR immediately
    setTimeout(() => this.init(), 1000);
    return { success: true };
  }
}

export const whatsappWebService = new WhatsAppWebService();
