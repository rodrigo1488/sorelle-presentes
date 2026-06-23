import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { getSetting, setSetting, maskToken } from '../services/settings.js';
import { DEFAULT_IMAGE_MODEL } from '../services/imageGeneration.js';
import { getCieloConfig, getCieloRequirements } from '../services/cieloConfig.js';

const router = Router();

async function buildSettingsResponse(message) {
  const pollinationsKey = await getSetting('pollinations_api_key');
  const hfToken = await getSetting('huggingface_api_token');
  const stableHordeKey = await getSetting('stable_horde_api_key');
  const cieloConfig = await getCieloConfig();

  return {
    ...(message ? { message } : {}),
    image_provider: 'stable_horde',
    pollinations_api_key_masked: maskToken(pollinationsKey),
    has_pollinations_key: Boolean(pollinationsKey),
    huggingface_api_token_masked: maskToken(hfToken),
    has_huggingface_token: Boolean(hfToken),
    stable_horde_api_key_masked: maskToken(stableHordeKey),
    has_stable_horde_key: Boolean(stableHordeKey),
    image_model: (await getSetting('image_model')) || DEFAULT_IMAGE_MODEL,
    cielo: {
      ...cieloConfig,
      merchant_id_masked: maskToken(cieloConfig.merchantId),
      requirements: getCieloRequirements(cieloConfig),
    },
  };
}

router.get('/', requireAuth, requireAdmin, async (_req, res) => {
  try {
    res.json(await buildSettingsResponse());
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
      cielo_merchant_id,
      cielo_soft_descriptor,
      cielo_frontend_url,
      cielo_backend_public_url,
      cielo_checkout_api_url,
      cielo_max_installments,
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

    if (cielo_merchant_id !== undefined && cielo_merchant_id !== '') {
      await setSetting('cielo_merchant_id', cielo_merchant_id.trim());
    }

    if (cielo_soft_descriptor !== undefined) {
      await setSetting('cielo_soft_descriptor', cielo_soft_descriptor.trim());
    }

    if (cielo_frontend_url !== undefined) {
      await setSetting('cielo_frontend_url', cielo_frontend_url.trim());
    }

    if (cielo_backend_public_url !== undefined) {
      await setSetting('cielo_backend_public_url', cielo_backend_public_url.trim());
    }

    if (cielo_checkout_api_url !== undefined && cielo_checkout_api_url !== '') {
      await setSetting('cielo_checkout_api_url', cielo_checkout_api_url.trim());
    }

    if (cielo_max_installments !== undefined && cielo_max_installments !== '') {
      await setSetting('cielo_max_installments', String(cielo_max_installments));
    }

    if (image_model !== undefined && image_model !== '') {
      await setSetting('image_model', image_model.trim());
    }

    res.json(await buildSettingsResponse('Configurações salvas com sucesso'));
  } catch (err) {
    console.error('Erro ao salvar configurações:', err);
    res.status(500).json({ message: 'Erro ao salvar configurações' });
  }
});

export default router;
