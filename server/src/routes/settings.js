import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { getSetting, setSetting, maskToken } from '../services/settings.js';
import { DEFAULT_IMAGE_MODEL } from '../services/imageGeneration.js';

const router = Router();

router.get('/', requireAuth, requireAdmin, async (_req, res) => {
  try {
    const pollinationsKey = await getSetting('pollinations_api_key');
    const hfToken = await getSetting('huggingface_api_token');

    res.json({
      image_provider: 'pollinations',
      pollinations_api_key_masked: maskToken(pollinationsKey),
      has_pollinations_key: Boolean(pollinationsKey),
      huggingface_api_token_masked: maskToken(hfToken),
      has_huggingface_token: Boolean(hfToken),
      image_model: (await getSetting('image_model')) || DEFAULT_IMAGE_MODEL,
      app_public_url: (await getSetting('app_public_url')) || process.env.APP_PUBLIC_URL || '',
    });
  } catch (err) {
    console.error('Erro ao buscar configurações:', err);
    res.status(500).json({ message: 'Erro ao carregar configurações' });
  }
});

router.put('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const {
      pollinations_api_key,
      huggingface_api_token,
      image_model,
      app_public_url,
    } = req.body;

    if (pollinations_api_key !== undefined && pollinations_api_key !== '') {
      await setSetting('pollinations_api_key', pollinations_api_key.trim());
    }

    if (huggingface_api_token !== undefined && huggingface_api_token !== '') {
      await setSetting('huggingface_api_token', huggingface_api_token.trim());
    }

    if (image_model !== undefined && image_model !== '') {
      await setSetting('image_model', image_model.trim());
    }

    if (app_public_url !== undefined) {
      await setSetting('app_public_url', app_public_url.trim());
    }

    const pollinationsKey = await getSetting('pollinations_api_key');
    const hfToken = await getSetting('huggingface_api_token');

    res.json({
      message: 'Configurações salvas com sucesso',
      image_provider: 'pollinations',
      pollinations_api_key_masked: maskToken(pollinationsKey),
      has_pollinations_key: Boolean(pollinationsKey),
      huggingface_api_token_masked: maskToken(hfToken),
      has_huggingface_token: Boolean(hfToken),
      image_model: (await getSetting('image_model')) || DEFAULT_IMAGE_MODEL,
      app_public_url: (await getSetting('app_public_url')) || process.env.APP_PUBLIC_URL || '',
    });
  } catch (err) {
    console.error('Erro ao salvar configurações:', err);
    res.status(500).json({ message: 'Erro ao salvar configurações' });
  }
});

export default router;
