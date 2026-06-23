import React, { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { X, Upload, Sparkles, Loader2, ImageIcon } from 'lucide-react';

const CATEGORIES = [
  { value: 'casa', label: 'Casa' },
  { value: 'decoracao', label: 'Decoração' },
  { value: 'fragancias', label: 'Fragrâncias' },
  { value: 'cama_mesa_banho', label: 'Cama, Mesa & Banho' },
];

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function ProductFormModal({ product, onClose }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const isEditing = !!product;

  const [form, setForm] = useState({
    name: product?.name || '',
    description: product?.description || '',
    price: product?.price || '',
    original_price: product?.original_price || '',
    category: product?.category || 'casa',
    subcategory: product?.subcategory || '',
    image_url: product?.image_url || '',
    materials: product?.materials || '',
    dimensions: product?.dimensions || '',
    in_stock: product?.in_stock ?? true,
    featured: product?.featured ?? false,
  });

  const [sourcePreview, setSourcePreview] = useState(null);
  const [sourceBase64, setSourceBase64] = useState(null);
  const [sourceMimeType, setSourceMimeType] = useState('image/jpeg');
  const [imageError, setImageError] = useState('');

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const mutation = useMutation({
    mutationFn: (data) => isEditing
      ? base44.entities.Product.update(product.id, data)
      : base44.entities.Product.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      onClose();
    },
  });

  const generateMutation = useMutation({
    mutationFn: () => base44.images.generateScene({
      image: sourceBase64,
      mime_type: sourceMimeType,
      product_name: form.name,
      category: CATEGORIES.find((c) => c.value === form.category)?.label || form.category,
      materials: form.materials,
    }),
    onSuccess: (result) => {
      set('image_url', result.image_url);
      setImageError('');
    },
    onError: (err) => {
      setImageError(err.message || 'Erro ao gerar imagem');
    },
  });

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setImageError('Selecione um arquivo de imagem (JPG, PNG ou WebP)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setImageError('A imagem deve ter no máximo 10 MB');
      return;
    }

    setImageError('');
    const dataUrl = await readFileAsDataUrl(file);
    setSourcePreview(dataUrl);
    setSourceBase64(dataUrl);
    setSourceMimeType(file.type);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate({
      ...form,
      price: parseFloat(form.price),
      original_price: form.original_price ? parseFloat(form.original_price) : undefined,
    });
  };

  const inputClass = 'w-full px-3 py-2.5 bg-background border border-border rounded-sm font-body text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring';
  const labelClass = 'block font-body text-xs text-muted-foreground tracking-wider uppercase mb-1.5';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-sm w-full max-w-2xl max-h-[90vh] overflow-auto shadow-xl">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border sticky top-0 bg-card z-10">
          <h2 className="font-display text-xl tracking-wide text-foreground">
            {isEditing ? 'Editar Produto' : 'Novo Produto'}
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="md:col-span-2">
              <label className={labelClass}>Nome do Produto *</label>
              <input required className={inputClass} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Ex: Vaso Orgânico em Cerâmica" />
            </div>

            <div>
              <label className={labelClass}>Categoria *</label>
              <select required className={inputClass} value={form.category} onChange={(e) => set('category', e.target.value)}>
                {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>

            <div>
              <label className={labelClass}>Subcategoria</label>
              <input className={inputClass} value={form.subcategory} onChange={(e) => set('subcategory', e.target.value)} placeholder="Ex: Vasos, Velas..." />
            </div>

            <div>
              <label className={labelClass}>Preço (R$) *</label>
              <input required type="number" step="0.01" min="0" className={inputClass} value={form.price} onChange={(e) => set('price', e.target.value)} placeholder="199,90" />
            </div>

            <div>
              <label className={labelClass}>Preço Original (R$)</label>
              <input type="number" step="0.01" min="0" className={inputClass} value={form.original_price} onChange={(e) => set('original_price', e.target.value)} placeholder="Deixe vazio se não houver desconto" />
            </div>

            <div className="md:col-span-2 space-y-4 p-4 border border-border rounded-sm bg-secondary/30">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <p className="font-body text-sm font-medium text-foreground">Imagem do Produto — Pollinations (grátis)</p>
              </div>
              <p className="font-body text-xs text-muted-foreground">
                Envie uma foto do produto — a geração usará essa imagem como base (Stable Horde gratuito).
                Opcional: token Hugging Face em Configurações para melhor qualidade.
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleFileSelect}
              />

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 px-4 py-2.5 border border-border rounded-sm font-body text-sm hover:bg-secondary transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  Enviar foto
                </button>

                <button
                  type="button"
                  disabled={!sourceBase64 || generateMutation.isPending}
                  onClick={() => generateMutation.mutate()}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-sm font-body text-sm hover:opacity-80 transition-opacity disabled:opacity-50"
                >
                  {generateMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Gerando a partir da foto...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Gerar cenário sofisticado
                    </>
                  )}
                </button>
              </div>

              {imageError && (
                <div className="p-3 rounded-sm bg-destructive/10 text-destructive text-sm font-body">
                  {imageError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className={labelClass}>Foto original</p>
                  <div className="aspect-[4/5] rounded-sm border border-border bg-background overflow-hidden flex items-center justify-center">
                    {sourcePreview ? (
                      <img src={sourcePreview} alt="Foto original" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center text-muted-foreground p-4">
                        <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="font-body text-xs">Nenhuma foto enviada</p>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <p className={labelClass}>Imagem gerada / final</p>
                  <div className="aspect-[4/5] rounded-sm border border-border bg-background overflow-hidden flex items-center justify-center">
                    {form.image_url ? (
                      <img src={form.image_url} alt="Imagem do produto" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center text-muted-foreground p-4">
                        <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="font-body text-xs">Gere ou cole uma URL</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className={labelClass}>URL da Imagem (alternativa)</label>
                <input className={inputClass} value={form.image_url} onChange={(e) => set('image_url', e.target.value)} placeholder="https://... ou /api/uploads/generated/..." />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className={labelClass}>Descrição</label>
              <textarea rows={3} className={inputClass} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Descrição detalhada do produto..." />
            </div>

            <div>
              <label className={labelClass}>Materiais</label>
              <input className={inputClass} value={form.materials} onChange={(e) => set('materials', e.target.value)} placeholder="Ex: Cerâmica artesanal" />
            </div>

            <div>
              <label className={labelClass}>Dimensões</label>
              <input className={inputClass} value={form.dimensions} onChange={(e) => set('dimensions', e.target.value)} placeholder="Ex: 22cm x 15cm" />
            </div>

            <div className="flex items-center gap-3">
              <input type="checkbox" id="in_stock" checked={form.in_stock} onChange={(e) => set('in_stock', e.target.checked)} className="w-4 h-4 rounded" />
              <label htmlFor="in_stock" className="font-body text-sm text-foreground">Em estoque</label>
            </div>

            <div className="flex items-center gap-3">
              <input type="checkbox" id="featured" checked={form.featured} onChange={(e) => set('featured', e.target.checked)} className="w-4 h-4 rounded" />
              <label htmlFor="featured" className="font-body text-sm text-foreground">Produto em destaque</label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <button type="button" onClick={onClose} className="px-5 py-2.5 font-body text-sm text-muted-foreground hover:text-foreground tracking-wider transition-colors">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="px-6 py-2.5 bg-primary text-primary-foreground rounded-sm font-body text-sm tracking-wider hover:opacity-80 transition-opacity disabled:opacity-50"
            >
              {mutation.isPending ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Criar Produto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
