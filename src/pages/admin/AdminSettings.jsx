import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Settings, Key, Sparkles, Loader2, CheckCircle2 } from 'lucide-react';

const MODELS = [
  { value: 'flux', label: 'Flux (fallback texto — gratuito)' },
  { value: 'turbo', label: 'Turbo (rápido)' },
  { value: 'nanobanana', label: 'Nano Banana (requer token Pollinations)' },
];

export default function AdminSettings() {
  const queryClient = useQueryClient();
  const [pollinationsKey, setPollinationsKey] = useState('');
  const [hfToken, setHfToken] = useState('');
  const [stableHordeKey, setStableHordeKey] = useState('');
  const [model, setModel] = useState('flux');
  const [saved, setSaved] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: () => base44.settings.get(),
  });

  React.useEffect(() => {
    if (data?.image_model) setModel(data.image_model);
  }, [data?.image_model]);

  const mutation = useMutation({
    mutationFn: (payload) => base44.settings.update(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
      setPollinationsKey('');
      setHfToken('');
      setStableHordeKey('');
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = { image_model: model };
    if (pollinationsKey.trim()) payload.pollinations_api_key = pollinationsKey.trim();
    if (hfToken.trim()) payload.huggingface_api_token = hfToken.trim();
    if (stableHordeKey.trim()) payload.stable_horde_api_key = stableHordeKey.trim();
    mutation.mutate(payload);
  };

  const inputClass = 'w-full px-3 py-2.5 bg-background border border-border rounded-sm font-body text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring';
  const labelClass = 'block font-body text-xs text-muted-foreground tracking-wider uppercase mb-1.5';

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Settings className="w-6 h-6 text-primary" />
          <h1 className="font-display text-2xl tracking-wide text-foreground">Configurações</h1>
        </div>
        <p className="font-body text-sm text-muted-foreground">
          Geração a partir da foto usa Stable Horde (grátis). Tokens opcionais melhoram velocidade e qualidade.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground font-body text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          Carregando...
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-sm p-6 space-y-6">
          <div className="flex items-start gap-3 p-4 bg-secondary/50 rounded-sm border border-border">
            <Sparkles className="w-5 h-5 text-primary mt-0.5 shrink-0" />
            <div className="font-body text-sm text-muted-foreground">
              <p className="text-foreground font-medium mb-1">Geração a partir da foto</p>
              <p>
                Ao enviar uma foto no cadastro de produto, o sistema usa img2img gratuito (Stable Horde).
                Nenhum token é obrigatório, mas a fila anônima pode demorar alguns minutos.
              </p>
            </div>
          </div>

          <div>
            <label className={labelClass}>
              <span className="inline-flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5" />
                Token Stable Horde (opcional — fila mais rápida)
              </span>
            </label>
            {data?.has_stable_horde_key && (
              <p className="font-body text-xs text-muted-foreground mb-2">
                Token atual: <span className="font-mono text-foreground">{data.stable_horde_api_key_masked}</span>
              </p>
            )}
            <input
              type="password"
              className={inputClass}
              value={stableHordeKey}
              onChange={(e) => setStableHordeKey(e.target.value)}
              placeholder="Opcional — stablehorde.net/register"
              autoComplete="off"
            />
          </div>

          <div>
            <label className={labelClass}>
              <span className="inline-flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5" />
                Token Hugging Face (opcional — melhor fidelidade)
              </span>
            </label>
            {data?.has_huggingface_token && (
              <p className="font-body text-xs text-muted-foreground mb-2">
                Token atual: <span className="font-mono text-foreground">{data.huggingface_api_token_masked}</span>
              </p>
            )}
            <input
              type="password"
              className={inputClass}
              value={hfToken}
              onChange={(e) => setHfToken(e.target.value)}
              placeholder="Opcional — huggingface.co/settings/tokens"
              autoComplete="off"
            />
          </div>

          <div>
            <label className={labelClass}>
              <span className="inline-flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5" />
                Token Pollinations (opcional)
              </span>
            </label>
            {data?.has_pollinations_key && (
              <p className="font-body text-xs text-muted-foreground mb-2">
                Token atual: <span className="font-mono text-foreground">{data.pollinations_api_key_masked}</span>
              </p>
            )}
            <input
              type="password"
              className={inputClass}
              value={pollinationsKey}
              onChange={(e) => setPollinationsKey(e.target.value)}
              placeholder="Opcional — enter.pollinations.ai"
              autoComplete="off"
            />
          </div>

          <div>
            <label className={labelClass}>Modelo Pollinations (fallback)</label>
            <select className={inputClass} value={model} onChange={(e) => setModel(e.target.value)}>
              {MODELS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          {mutation.isError && (
            <div className="p-3 rounded-sm bg-destructive/10 text-destructive text-sm font-body">
              {mutation.error.message}
            </div>
          )}

          {saved && (
            <div className="flex items-center gap-2 p-3 rounded-sm bg-green-500/10 text-green-700 dark:text-green-400 text-sm font-body">
              <CheckCircle2 className="w-4 h-4" />
              Configurações salvas com sucesso!
            </div>
          )}

          <button
            type="submit"
            disabled={mutation.isPending}
            className="px-6 py-2.5 bg-primary text-primary-foreground rounded-sm font-body text-sm tracking-wider hover:opacity-80 transition-opacity disabled:opacity-50"
          >
            {mutation.isPending ? 'Salvando...' : 'Salvar Configurações'}
          </button>
        </form>
      )}
    </div>
  );
}
