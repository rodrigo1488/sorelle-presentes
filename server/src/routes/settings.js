import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { getSetting, setSetting, maskToken } from '../services/settings.js';
import { DEFAULT_IMAGE_MODEL } from '../services/imageGeneration.js';

const router = Router();

router.get('/', requireAuth, requireAdmin, async (_req, res) => {
  try {
    const pollinationsKey = await getSetting('pollinations_api_key');
    const hfToken = await getSetting('huggingface_api_token');
    const stableHordeKey = await getSetting('stable_horde_api_key');

    res.json({
      image_provider: 'stable_horde',
      pollinations_api_key_masked: maskToken(pollinationsKey),
      has_pollinations_key: Boolean(pollinationsKey),
      huggingface_api_token_masked: maskToken(hfToken),
      has_huggingface_token: Boolean(hfToken),
      stable_horde_api_key_masked: maskToken(stableHordeKey),
      has_stable_horde_key: Boolean(stableHordeKey),
      image_model: (await getSetting('image_model')) || DEFAULT_IMAGE_MODEL,
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
      stable_horde_api_key,
      image_model,
    } = req.body;

    if (pollinations_api_key !== undefined && pollinations_api_key !== '') {
      await setSetting('pollinations_api_key', pollinations_api_key.trim());
    }

    if (huggingface_api_token !== undefined && huggingface_api_token !== '') {
      await setSetting('huggingface_api_token', huggingface_api_token.trim());
    }

    if (stable_horde_api_key !== undefined && stable_horde_api_key !== '') {
      await setSetting('stable_horde_api_key', stable_horde_api_key.trim());
    }

    if (image_model !== undefined && image_model !== '') {
      await setSetting('image_model', image_model.trim());
    }

    const pollinationsKey = await getSetting('pollinations_api_key');
    const hfToken = await getSetting('huggingface_api_token');
    const stableHordeKey = await getSetting('stable_horde_api_key');

    res.json({
      message: 'Configurações salvas com sucesso',
      image_provider: 'stable_horde',
      pollinations_api_key_masked: maskToken(pollinationsKey),
      has_pollinations_key: Boolean(pollinationsKey),
      huggingface_api_token_masked: maskToken(hfToken),
      has_huggingface_token: Boolean(hfToken),
      stable_horde_api_key_masked: maskToken(stableHordeKey),
      has_stable_horde_key: Boolean(stableHordeKey),
      image_model: (await getSetting('image_model')) || DEFAULT_IMAGE_MODEL,
    });
  } catch (err) {
    console.error('Erro ao salvar configurações:', err);
    res.status(500).json({ message: 'Erro ao salvar configurações' });
  }
});

export default router;
