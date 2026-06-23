import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { getSetting } from '../services/settings.js';
import { generateProductScene, DEFAULT_IMAGE_MODEL } from '../services/imageGeneration.js';

const router = Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, '../../uploads/generated');
const TEMP_DIR = path.join(__dirname, '../../uploads/temp');

for (const dir of [UPLOADS_DIR, TEMP_DIR]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const MIME_EXT = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

router.post('/generate-scene', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { image, mime_type, product_name, category, materials } = req.body;

    if (!image && !product_name?.trim()) {
      return res.status(400).json({ message: 'Envie uma foto ou preencha o nome do produto para gerar a imagem' });
    }

    const pollinationsApiKey = await getSetting('pollinations_api_key');
    const huggingfaceApiToken = await getSetting('huggingface_api_token');
    const stableHordeApiKey = await getSetting('stable_horde_api_key') || process.env.STABLE_HORDE_API_KEY;
    const imageModel = (await getSetting('image_model')) || DEFAULT_IMAGE_MODEL;
    const publicBaseUrl = process.env.APP_PUBLIC_URL || (await getSetting('app_public_url'));

    const generated = await generateProductScene({
      imageBase64: image,
      mimeType: mime_type || 'image/jpeg',
      productName: product_name,
      category,
      materials,
      pollinationsApiKey,
      huggingfaceApiToken,
      stableHordeApiKey,
      publicBaseUrl,
      model: imageModel,
    });

    const ext = MIME_EXT[generated.mimeType] || 'png';
    const filename = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`;
    const filepath = path.join(UPLOADS_DIR, filename);

    fs.writeFileSync(filepath, Buffer.from(generated.data, 'base64'));

    res.json({
      image_url: `/api/uploads/generated/${filename}`,
      message: image
        ? 'Imagem gerada a partir da foto enviada'
        : 'Imagem gerada com sucesso (Pollinations — API gratuita)',
    });
  } catch (err) {
    console.error('Erro ao gerar imagem:', err);
    res.status(500).json({ message: err.message || 'Erro ao gerar imagem' });
  }
});

export default router;
