const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const crypto = require('crypto');
const cors = require('cors');

const app = express();

// ✅ Enable CORS
app.use(cors());

// ✅ Multer setup
const upload = multer({ storage: multer.memoryStorage() });

const DELIMITER = '|||';

// 🔐 Encrypt Message
function encryptMessage(message, password) {
  if (!password || password.trim() === '') return message;

  const key = crypto.createHash('sha256').update(password).digest();
  const iv = crypto.randomBytes(16);

  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(message, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  return `ENC:${iv.toString('hex')}:${encrypted}`;
}

// 🔓 Decrypt Message
function decryptMessage(encryptedData, password) {
  if (!encryptedData.startsWith('ENC:')) return encryptedData;
  if (!password || password.trim() === '') return "Password required";

  try {
    const parts = encryptedData.slice(4).split(':');
    if (parts.length !== 2) return "Corrupted data";

    const iv = Buffer.from(parts[0], 'hex');
    const encryptedHex = parts[1];

    const key = crypto.createHash('sha256').update(password).digest();
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);

    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (err) {
    return "Wrong password or corrupted data";
  }
}

// 📥 Embed Function
async function embedHybrid(buffer, message, password = '') {
  const finalMsg = encryptMessage(message, password);
  const fullText = finalMsg + DELIMITER;

  const binary = fullText.split('').map(c =>
    c.charCodeAt(0).toString(2).padStart(8, '0')
  ).join('');

  const { data, info } = await sharp(buffer).raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  let bitIndex = 0;

  for (let i = 0; i < data.length && bitIndex < binary.length; i++) {
    data[i] = (data[i] & 0xFE) | parseInt(binary[bitIndex]);
    bitIndex++;
  }

  const stegoBuffer = await sharp(data, {
    raw: { width, height, channels }
  }).png().toBuffer();

  return stegoBuffer.toString('base64');
}

// 📤 Extract Function
async function extractHybrid(buffer, password = '') {
  const { data } = await sharp(buffer).raw().toBuffer({ resolveWithObject: true });

  let binary = '';
  for (let i = 0; i < data.length; i++) {
    binary += (data[i] & 1).toString();
  }

  let text = '';
  for (let i = 0; i < binary.length; i += 8) {
    if (i + 8 > binary.length) break;
    text += String.fromCharCode(parseInt(binary.slice(i, i + 8), 2));
  }

  const delimPos = text.indexOf(DELIMITER);
  if (delimPos === -1) return "No hidden message found";

  const encryptedPart = text.substring(0, delimPos);
  return decryptMessage(encryptedPart, password);
}

// 🌐 Test Route
app.get('/', (req, res) => {
  res.send('🚀 Backend is LIVE on Render!');
});

// 📥 Embed API
app.post('/embed', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image uploaded" });
    }

    const { message = "Govindha Govindha", password = '' } = req.body;

    const stegoBase64 = await embedHybrid(req.file.buffer, message, password);

    res.json({
      success: true,
      stegoBase64
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 📤 Extract API
app.post('/extract', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image uploaded" });
    }

    const { password = '' } = req.body;

    const message = await extractHybrid(req.file.buffer, password);

    res.json({ message });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ IMPORTANT FOR RENDER
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🔥 Server running on port ${PORT}`);
});