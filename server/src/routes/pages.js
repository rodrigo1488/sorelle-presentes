import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import {
  getContentPage,
  getAllContentPages,
  updateContentPage,
  listContentPageDefinitions,
} from '../services/contentPages.js';

const router = Router();

router.get('/definitions', requireAuth, requireAdmin, (_req, res) => {
  res.json(listContentPageDefinitions());
});

router.get('/', requireAuth, requireAdmin, async (_req, res) => {
  try {
    const pages = await getAllContentPages();
    res.json(pages);
  } catch (err) {
    console.error('Erro ao listar páginas:', err);
    res.status(500).json({ message: 'Erro ao carregar páginas' });
  }
});

router.get('/:slug', async (req, res) => {
  try {
    const page = await getContentPage(req.params.slug);
    if (!page) {
      return res.status(404).json({ message: 'Página não encontrada' });
    }
    res.json(page);
  } catch (err) {
    console.error('Erro ao buscar página:', err);
    res.status(500).json({ message: 'Erro ao carregar página' });
  }
});

router.put('/:slug', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { title, content } = req.body;
    const page = await updateContentPage(req.params.slug, { title, content });
    if (!page) {
      return res.status(404).json({ message: 'Página não encontrada' });
    }
    res.json({ message: 'Página salva com sucesso', page });
  } catch (err) {
    console.error('Erro ao salvar página:', err);
    res.status(500).json({ message: 'Erro ao salvar página' });
  }
});

export default router;
