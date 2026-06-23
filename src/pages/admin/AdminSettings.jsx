import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  Settings, Key, Sparkles, Loader2, CheckCircle2,
  CreditCard, Circle, ExternalLink, AlertCircle,
} from 'lucide-react';

const MODELS = [
  { value: 'flux', label: 'Flux (fallback texto — gratuito)' },
  { value: 'turbo', label: 'Turbo (rápido)' },
  { value: 'nanobanana', label: 'Nano Banana (requer token Pollinations)' },
];

const CIELO_DOCS_URL = 'https://developercielo.github.io/manual/checkout-cielo';

function RequirementItem({ item }) {
  const Icon = item.done ? CheckCircle2 : item.manual ? AlertCircle : Circle;
  const iconClass = item.done
    ? 'text-green-600 dark:text-green-400'
    : item.manual
      ? 'text-amber-600 dark:text-amber-400'
      : 'text-muted-foreground';

  return (
    <li className="flex gap-2.5">
      <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${iconClass}`} />
      <div>
        <p className={`font-body text-sm ${item.done ? 'text-foreground' : 'text-muted-foreground'}`}>
          {item.label}
          {item.required && !item.done && <span className="text-destructive ml-1">*</span>}
        </p>
        {item.hint && (
          <p className="font-body text-xs text-muted-foreground mt-0.5 break-all">{item.hint}</p>
        )}
      </div>
    </li>
  );
}

export default function AdminSettings() {
  const queryClient = useQueryClient();
  const [pollinationsKey, setPollinationsKey] = useState('');
  const [hfToken, setHfToken] = useState('');
  const [stableHordeKey, setStableHordeKey] = useState('');
  const [cieloMerchantId, setCieloMerchantId] = useState('');
  const [cieloSoftDescriptor, setCieloSoftDescriptor] = useState('');
  const [cieloFrontendUrl, setCieloFrontendUrl] = useState('');
  const [cieloBackendUrl, setCieloBackendUrl] = useState('');
  const [cieloCheckoutApiUrl, setCieloCheckoutApiUrl] = useState('');
  const [cieloMaxInstallments, setCieloMaxInstallments] = useState('12');
  const [model, setModel] = useState('flux');
  const [saved, setSaved] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: () => base44.settings.get(),
  });

  React.useEffect(() => {
    if (data?.image_model) setModel(data.image_model);
    if (data?.cielo) {
      setCieloSoftDescriptor(data.cielo.softDescriptor || 'SORELLE');
      setCieloFrontendUrl(data.cielo.frontendUrl || '');
      setCieloBackendUrl(data.cielo.backendPublicUrl || '');
      setCieloCheckoutApiUrl(data.cielo.checkoutApiUrl || '');
      setCieloMaxInstallments(String(data.cielo.maxInstallments || 12));
    }
  }, [data?.image_model, data?.cielo]);

  const mutation = useMutation({
    mutationFn: (payload) => base44.settings.update(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
      setPollinationsKey('');
      setHfToken('');
      setStableHordeKey('');
      setCieloMerchantId('');
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      image_model: model,
      cielo_soft_descriptor: cieloSoftDescriptor.trim(),
      cielo_frontend_url: cieloFrontendUrl.trim(),
      cielo_backend_public_url: cieloBackendUrl.trim(),
      cielo_checkout_api_url: cieloCheckoutApiUrl.trim(),
      cielo_max_installments: cieloMaxInstallments,
    };
    if (pollinationsKey.trim()) payload.pollinations_api_key = pollinationsKey.trim();
    if (hfToken.trim()) payload.huggingface_api_token = hfToken.trim();
    if (stableHordeKey.trim()) payload.stable_horde_api_key = stableHordeKey.trim();
    if (cieloMerchantId.trim()) payload.cielo_merchant_id = cieloMerchantId.trim();
    mutation.mutate(payload);
  };

  const inputClass = 'w-full px-3 py-2.5 bg-background border border-border rounded-sm font-body text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring';
  const labelClass = 'block font-body text-xs text-muted-foreground tracking-wider uppercase mb-1.5';
  const cielo = data?.cielo;
  const requirements = cielo?.requirements || [];
  const autoDoneCount = requirements.filter((r) => r.done && !r.manual).length;
  const autoTotal = requirements.filter((r) => !r.manual).length;

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Settings className="w-6 h-6 text-primary" />
          <h1 className="font-display text-2xl tracking-wide text-foreground">Configurações</h1>
        </div>
        <p className="font-body text-sm text-muted-foreground">
          Pagamentos Cielo e geração de imagens. Configure credenciais abaixo.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground font-body text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          Carregando...
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* ── Cielo ── */}
          <section className="bg-card border border-border rounded-sm p-6 space-y-6">
            <div className="flex items-start gap-3">
              <CreditCard className="w-5 h-5 text-primary mt-0.5 shrink-0" />
              <div>
                <h2 className="font-display text-lg tracking-wide text-foreground">Pagamento Cielo</h2>
                <p className="font-body text-sm text-muted-foreground mt-1">
                  Checkout Cielo — o cliente é redirecionado ao gateway seguro da Cielo para pagar com cartão.
                </p>
                <a
                  href={CIELO_DOCS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-body text-xs text-primary hover:underline mt-2"
                >
                  Documentação oficial
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            {cielo && (
              <div className={`flex items-center gap-2 px-3 py-2 rounded-sm text-sm font-body ${
                cielo.isReady
                  ? 'bg-green-500/10 text-green-700 dark:text-green-400'
                  : 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
              }`}>
                {cielo.isReady ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                {cielo.isReady
                  ? 'API Cielo pronta para checkout'
                  : 'Configure o MerchantId para habilitar pagamentos'}
                {autoTotal > 0 && (
                  <span className="ml-auto text-xs opacity-80">
                    {autoDoneCount}/{autoTotal} requisitos automáticos
                  </span>
                )}
              </div>
            )}

            <div className="p-4 bg-secondary/50 rounded-sm border border-border">
              <p className="font-body text-xs text-muted-foreground uppercase tracking-wider mb-3">
                Requisitos da API
              </p>
              <ul className="space-y-3">
                {requirements.map((item) => (
                  <RequirementItem key={item.id} item={item} />
                ))}
              </ul>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={labelClass}>
                  <span className="inline-flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5" />
                    MerchantId *
                  </span>
                </label>
                {cielo?.merchantId && (
                  <p className="font-body text-xs text-muted-foreground mb-2">
                    Atual: <span className="font-mono text-foreground">{cielo.merchant_id_masked}</span>
                  </p>
                )}
                <input
                  type="password"
                  className={inputClass}
                  value={cieloMerchantId}
                  onChange={(e) => setCieloMerchantId(e.target.value)}
                  placeholder="00000000-0000-0000-0000-000000000000"
                  autoComplete="off"
                />
                <p className="font-body text-xs text-muted-foreground mt-1">
                  GUID de 36 caracteres. Enviado no header <code className="font-mono">MerchantId</code> em cada requisição POST.
                </p>
              </div>

              <div>
                <label className={labelClass}>Soft Descriptor</label>
                <input
                  type="text"
                  className={inputClass}
                  value={cieloSoftDescriptor}
                  onChange={(e) => setCieloSoftDescriptor(e.target.value.slice(0, 13))}
                  placeholder="SORELLE"
                  maxLength={13}
                />
                <p className="font-body text-xs text-muted-foreground mt-1">
                  Nome na fatura do cartão (máx. 13 caracteres).
                </p>
              </div>

              <div>
                <label className={labelClass}>Máx. parcelas</label>
                <input
                  type="number"
                  min={1}
                  max={12}
                  className={inputClass}
                  value={cieloMaxInstallments}
                  onChange={(e) => setCieloMaxInstallments(e.target.value)}
                />
              </div>

              <div className="sm:col-span-2">
                <label className={labelClass}>URL do site (retorno)</label>
                <input
                  type="url"
                  className={inputClass}
                  value={cieloFrontendUrl}
                  onChange={(e) => setCieloFrontendUrl(e.target.value)}
                  placeholder="http://localhost:5173"
                />
                <p className="font-body text-xs text-muted-foreground mt-1">
                  Retorno após pagamento:{' '}
                  <span className="font-mono break-all">{cielo?.returnUrlExample || '—'}</span>
                </p>
              </div>

              <div className="sm:col-span-2">
                <label className={labelClass}>URL pública do backend</label>
                <input
                  type="url"
                  className={inputClass}
                  value={cieloBackendUrl}
                  onChange={(e) => setCieloBackendUrl(e.target.value)}
                  placeholder="http://localhost:3001"
                />
                <p className="font-body text-xs text-muted-foreground mt-1">
                  URL de notificação (cadastre no painel Cielo):{' '}
                  <span className="font-mono break-all">{cielo?.notificationUrl || '—'}</span>
                </p>
              </div>

              <div className="sm:col-span-2">
                <label className={labelClass}>URL da API Checkout</label>
                <input
                  type="url"
                  className={inputClass}
                  value={cieloCheckoutApiUrl}
                  onChange={(e) => setCieloCheckoutApiUrl(e.target.value)}
                  placeholder="https://cieloecommerce.cielo.com.br/api/public/v1/orders/"
                />
                <p className="font-body text-xs text-muted-foreground mt-1">
                  Endpoint POST para criar pedidos. Mantenha o padrão salvo, salvo orientação da Cielo.
                </p>
              </div>
            </div>

            <div className="p-4 bg-secondary/30 rounded-sm border border-border font-body text-xs text-muted-foreground space-y-1">
              <p className="text-foreground font-medium text-sm mb-2">Campos enviados no checkout</p>
              <p>• <strong>Cart.Items</strong> — produtos do carrinho (preço em centavos)</p>
              <p>• <strong>Customer</strong> — CPF, nome, e-mail e telefone do comprador</p>
              <p>• <strong>Shipping</strong> — endereço e CEP informados no checkout</p>
              <p>• <strong>Options.ReturnUrl</strong> — redirecionamento após pagamento</p>
              <p>• <strong>Payment.MaxNumberOfInstallments</strong> — parcelas configuradas acima</p>
            </div>
          </section>

          {/* ── Imagens ── */}
          <section className="bg-card border border-border rounded-sm p-6 space-y-6">
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
          </section>

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
