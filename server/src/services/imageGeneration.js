import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMP_DIR = path.join(__dirname, '../../uploads/temp');

const SCENE_VARIATIONS = [
  'marble surface with soft side lighting from the left',
  'linen fabric backdrop with warm golden ambient light',
  'light noble wood table with cool diffused studio lighting',
  'subtle bokeh luxury interior softly blurred in the background',
  'neutral beige studio with gentle top-down light',
  'dark velvet accent surface with elegant rim lighting',
  'cream plaster wall with natural window light and soft shadows',
  'polished stone pedestal with minimalist composition',
  'sage green muted backdrop with editorial fashion lighting',
  'warm terracotta tones with afternoon soft light',
];

function randomSeed() {
  return crypto.randomInt(1, 2_147_483_647);
}

function pickSceneVariation() {
  return SCENE_VARIATIONS[crypto.randomInt(0, SCENE_VARIATIONS.length)];
}

function cleanBase64(imageBase64) {
  return imageBase64.replace(/^data:[^;]+;base64,/, '');
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const FIDELITY_RULE = `CRITICAL: Do not change the original object in any way. Preserve exactly its original shape, proportions, colors, textures, materials, finish, labels, details and physical condition. Only change the background, lighting and surrounding scene. The product must remain identical to the reference.`;

const SCENE_PROMPT = `Professional luxury e-commerce product photography for premium gift store Sorelle.
Sophisticated minimalist studio scene, soft editorial lighting, premium background with marble, linen or noble wood subtly blurred.
Product as absolute hero, high-end catalog style, photorealistic, no text, no watermark, no people.
${FIDELITY_RULE}`;

export function buildScenePrompt(productName, category, materials, sceneVariation) {
  const parts = [SCENE_PROMPT];
  if (productName) parts.push(`Product: ${productName}.`);
  if (category) parts.push(`Category: ${category}.`);
  if (materials) parts.push(`Materials: ${materials}.`);
  parts.push(`Scene variation: ${sceneVariation}.`);
  return parts.join(' ');
}

function buildEditPrompt(sceneVariation, productName) {
  return `Place this exact product in a sophisticated luxury e-commerce studio scene. Scene variation: ${sceneVariation}. ${FIDELITY_RULE} ${productName ? `Product: ${productName}.` : ''}`;
}

function ensureTempDir() {
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }
}

function saveTempSourceImage(imageBase64, mimeType) {
  ensureTempDir();
  const ext = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg';
  const filename = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`;
  const filepath = path.join(TEMP_DIR, filename);
  fs.writeFileSync(filepath, Buffer.from(cleanBase64(imageBase64), 'base64'));
  return filename;
}

function buildPollinationsUrl(prompt, params) {
  const base = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}`;
  const search = new URLSearchParams(params);
  return `${base}?${search.toString()}`;
}

async function fetchImageBuffer(url, timeoutMs = 120000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
    });
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`Pollinations retornou ${response.status}${text ? `: ${text.slice(0, 120)}` : ''}`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.startsWith('image/')) {
      throw new Error('Pollinations não retornou uma imagem válida. Tente novamente em alguns segundos.');
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length < 1000) {
      throw new Error('Imagem gerada inválida ou vazia.');
    }

    return {
      data: buffer.toString('base64'),
      mimeType: contentType.split(';')[0] || 'image/jpeg',
    };
  } finally {
    clearTimeout(timer);
  }
}

async function generateWithPollinationsText({ prompt, apiKey, model, seed }) {
  const params = {
    model: model || 'flux',
    width: '800',
    height: '1000',
    seed: String(seed ?? randomSeed()),
    nologo: 'true',
    private: 'true',
  };
  if (apiKey) params.key = apiKey;

  return fetchImageBuffer(buildPollinationsUrl(prompt, params));
}

async function uploadToPollinations(imageBase64, mimeType, apiKey) {
  const buffer = Buffer.from(cleanBase64(imageBase64), 'base64');
  const response = await fetch('https://media.pollinations.ai/upload', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey.trim()}`,
      'Content-Type': mimeType,
    },
    body: buffer,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Upload Pollinations falhou (${response.status})`);
  }
  if (!data.url) {
    throw new Error('Upload Pollinations não retornou URL da imagem');
  }
  return data.url;
}

async function generateWithPollinationsKontext({ prompt, imageUrl, apiKey, seed }) {
  const params = {
    model: 'kontext',
    image: imageUrl,
    width: '800',
    height: '1000',
    seed: String(seed ?? randomSeed()),
    nologo: 'true',
    private: 'true',
  };
  if (apiKey) params.key = apiKey;

  return fetchImageBuffer(buildPollinationsUrl(prompt, params));
}

async function generateWithHuggingFace({ prompt, imageBase64, apiKey, seed }) {
  if (!apiKey?.trim()) {
    throw new Error('Token Hugging Face não configurado.');
  }

  const response = await fetch(
    'https://api-inference.huggingface.co/models/timbrooks/instruct-pix2pix',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: cleanBase64(imageBase64),
        parameters: {
          prompt,
          num_inference_steps: 30,
          image_guidance_scale: 1.8,
          guidance_scale: 7.5,
          seed: seed ?? randomSeed(),
        },
      }),
    }
  );

  if (response.status === 503) {
    throw new Error('Modelo Hugging Face carregando. Aguarde 20 segundos e tente novamente.');
  }

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Hugging Face retornou ${response.status}`);
  }

  const contentType = response.headers.get('content-type') || 'image/jpeg';
  const buffer = Buffer.from(await response.arrayBuffer());

  return {
    data: buffer.toString('base64'),
    mimeType: contentType.split(';')[0] || 'image/jpeg',
  };
}

async function generateWithStableHorde({ prompt, imageBase64, apiKey, seed }) {
  const headers = {
    'Content-Type': 'application/json',
    'Client-Agent': 'sorelle-presentes:1.0:admin@sorelle.com.br',
  };
  if (apiKey?.trim()) headers.apikey = apiKey.trim();

  const submitRes = await fetch('https://stablehorde.net/api/v2/generate/async', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      prompt,
      params: {
        width: 512,
        height: 640,
        steps: 28,
        cfg_scale: 7,
        denoising_strength: 0.45,
        sampler_name: 'k_euler_a',
        seed: String(seed),
      },
      source_image: cleanBase64(imageBase64),
      source_processing: 'img2img',
      nsfw: false,
      censor_nsfw: true,
      models: ['Realistic Vision'],
      r2: true,
    }),
  });

  const submitData = await submitRes.json().catch(() => ({}));
  if (!submitRes.ok) {
    throw new Error(submitData.message || submitData.error || `Stable Horde: ${submitRes.status}`);
  }

  const jobId = submitData.id;
  if (!jobId) {
    throw new Error('Stable Horde não retornou ID da geração');
  }

  const deadline = Date.now() + 180000;
  while (Date.now() < deadline) {
    await sleep(4000);
    const checkRes = await fetch(`https://stablehorde.net/api/v2/generate/check/${jobId}`, { headers });
    const checkData = await checkRes.json().catch(() => ({}));
    if (checkData.faulted) {
      throw new Error('Geração falhou no Stable Horde');
    }
    if (checkData.done) break;
  }

  const statusRes = await fetch(`https://stablehorde.net/api/v2/generate/status/${jobId}`, { headers });
  const status = await statusRes.json().catch(() => ({}));
  const generation = status.generations?.[0];

  if (!generation?.img) {
    throw new Error('Stable Horde não retornou imagem (fila cheia — tente novamente)');
  }

  let buffer;
  if (generation.img.startsWith('http')) {
    const imgRes = await fetch(generation.img);
    if (!imgRes.ok) throw new Error('Erro ao baixar imagem do Stable Horde');
    buffer = Buffer.from(await imgRes.arrayBuffer());
  } else {
    buffer = Buffer.from(cleanBase64(generation.img), 'base64');
  }

  return {
    data: buffer.toString('base64'),
    mimeType: 'image/webp',
  };
}

async function generateFromUploadedImage({
  imageBase64,
  mimeType,
  editPrompt,
  seed,
  huggingfaceApiToken,
  stableHordeApiKey,
  pollinationsApiKey,
  publicBaseUrl,
}) {
  const errors = [];

  if (huggingfaceApiToken) {
    try {
      return await generateWithHuggingFace({
        prompt: editPrompt,
        imageBase64,
        apiKey: huggingfaceApiToken,
        seed,
      });
    } catch (err) {
      errors.push(`Hugging Face: ${err.message}`);
    }
  }

  try {
    return await generateWithStableHorde({
      prompt: editPrompt,
      imageBase64,
      apiKey: stableHordeApiKey,
      seed,
    });
  } catch (err) {
    errors.push(`Stable Horde: ${err.message}`);
  }

  if (pollinationsApiKey) {
    try {
      const uploadedUrl = await uploadToPollinations(imageBase64, mimeType, pollinationsApiKey);
      return await generateWithPollinationsKontext({
        prompt: `Transform only the background and scene around this product. ${editPrompt}`,
        imageUrl: uploadedUrl,
        apiKey: pollinationsApiKey,
        seed,
      });
    } catch (err) {
      errors.push(`Pollinations Kontext: ${err.message}`);
    }
  }

  if (publicBaseUrl) {
    try {
      const tempFile = saveTempSourceImage(imageBase64, mimeType);
      const imageUrl = `${publicBaseUrl.replace(/\/$/, '')}/api/uploads/temp/${tempFile}?t=${Date.now()}`;
      return await generateWithPollinationsKontext({
        prompt: `Transform only the background and scene around this product. ${editPrompt}`,
        imageUrl,
        apiKey: pollinationsApiKey,
        seed,
      });
    } catch (err) {
      errors.push(`Pollinations URL: ${err.message}`);
    }
  }

  throw new Error(
    errors.at(-1)
    || 'Não foi possível gerar a partir da foto. A fila gratuita pode estar cheia — aguarde e tente novamente.'
  );
}

export async function generateProductScene({
  imageBase64,
  mimeType = 'image/jpeg',
  productName,
  category,
  materials,
  pollinationsApiKey,
  huggingfaceApiToken,
  stableHordeApiKey,
  publicBaseUrl,
  model = 'flux',
}) {
  const seed = randomSeed();
  const sceneVariation = pickSceneVariation();
  const prompt = buildScenePrompt(productName, category, materials, sceneVariation);
  const editPrompt = buildEditPrompt(sceneVariation, productName);

  if (imageBase64) {
    return generateFromUploadedImage({
      imageBase64,
      mimeType,
      editPrompt,
      seed,
      huggingfaceApiToken,
      stableHordeApiKey,
      pollinationsApiKey,
      publicBaseUrl,
    });
  }

  const modelsToTry = [model, 'flux', 'turbo'].filter(Boolean);
  const uniqueModels = [...new Set(modelsToTry)];
  const errors = [];

  for (const currentModel of uniqueModels) {
    try {
      return await generateWithPollinationsText({
        prompt,
        apiKey: pollinationsApiKey,
        model: currentModel,
        seed: randomSeed(),
      });
    } catch (err) {
      errors.push(`${currentModel}: ${err.message}`);
    }
  }

  throw new Error(
    errors.at(-1)
    || 'Não foi possível gerar a imagem. Aguarde 15s e tente de novo.'
  );
}

export const DEFAULT_IMAGE_MODEL = 'flux';
export const IMAGE_PROVIDERS = ['pollinations', 'stable_horde'];
