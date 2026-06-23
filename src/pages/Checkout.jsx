import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Loader2, CreditCard, ArrowLeft } from 'lucide-react';

const WRAPPING_PRICES = { none: 0, kraft: 12.9, signature: 29.9 };

export default function Checkout() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    customer_name: user?.email?.split('@')[0] || '',
    customer_email: user?.email || '',
    customer_phone: '',
    customer_document: '',
    customer_address: '',
    customer_zip_code: '',
  });

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['cart'],
    queryFn: () => base44.entities.CartItem.list(),
    enabled: isAuthenticated,
  });

  const subtotal = items.reduce((sum, item) => sum + item.price * (item.quantity || 1), 0);
  const wrappingTotal = items.reduce((sum, item) => sum + (WRAPPING_PRICES[item.wrapping] || 0), 0);
  const total = subtotal + wrappingTotal;

  const checkoutMutation = useMutation({
    mutationFn: (data) => base44.checkout.startCielo(data),
    onSuccess: (result) => {
      window.location.href = result.checkout_url;
    },
    onError: (err) => {
      setError(err.message || 'Erro ao iniciar pagamento');
    },
  });

  if (!isAuthenticated) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <p className="font-body text-muted-foreground mb-4">Faça login para finalizar sua compra.</p>
        <Link to="/login" className="text-primary hover:underline font-body">Entrar</Link>
      </div>
    );
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    checkoutMutation.mutate(form);
  };

  const inputClass = 'w-full px-3 py-2.5 bg-background border border-border rounded-sm font-body text-sm focus:outline-none focus:ring-1 focus:ring-ring';
  const labelClass = 'block font-body text-xs text-muted-foreground tracking-wider uppercase mb-1.5';

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 font-body">
        <ArrowLeft className="w-4 h-4" />
        Voltar
      </button>

      <h1 className="font-display text-3xl tracking-wide mb-2">Finalizar Compra</h1>
      <p className="font-body text-sm text-muted-foreground mb-8">
        Você será redirecionado para o ambiente seguro da Cielo para concluir o pagamento.
      </p>

      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          Carregando carrinho...
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12">
          <p className="font-body text-muted-foreground mb-4">Seu carrinho está vazio.</p>
          <Link to="/" className="text-primary hover:underline font-body">Continuar comprando</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <form onSubmit={handleSubmit} className="lg:col-span-3 space-y-4">
            <div>
              <label className={labelClass}>Nome completo *</label>
              <input required className={inputClass} value={form.customer_name} onChange={(e) => set('customer_name', e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>E-mail *</label>
              <input required type="email" className={inputClass} value={form.customer_email} onChange={(e) => set('customer_email', e.target.value)} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Telefone *</label>
                <input required className={inputClass} value={form.customer_phone} onChange={(e) => set('customer_phone', e.target.value)} placeholder="11999999999" />
              </div>
              <div>
                <label className={labelClass}>CPF *</label>
                <input required className={inputClass} value={form.customer_document} onChange={(e) => set('customer_document', e.target.value)} placeholder="00000000000" />
              </div>
            </div>
            <div>
              <label className={labelClass}>Endereço de entrega *</label>
              <input required className={inputClass} value={form.customer_address} onChange={(e) => set('customer_address', e.target.value)} placeholder="Rua, número, bairro, cidade, UF" />
            </div>
            <div>
              <label className={labelClass}>CEP *</label>
              <input required className={inputClass} value={form.customer_zip_code} onChange={(e) => set('customer_zip_code', e.target.value)} placeholder="00000000" />
            </div>

            {error && (
              <div className="p-3 rounded-sm bg-destructive/10 text-destructive text-sm font-body">{error}</div>
            )}

            <Button type="submit" disabled={checkoutMutation.isPending} className="w-full py-6 font-body tracking-wider">
              {checkoutMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Redirecionando para Cielo...
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Pagar com Cielo — R$ {total.toFixed(2).replace('.', ',')}
                </>
              )}
            </Button>

            <p className="font-body text-xs text-muted-foreground text-center">
              Pagamento processado com segurança pela Cielo (cartão, PIX ou boleto).
            </p>
          </form>

          <div className="lg:col-span-2 bg-card border border-border rounded-sm p-5 h-fit">
            <h2 className="font-display text-lg tracking-wide mb-4">Resumo</h2>
            <div className="space-y-3 mb-4">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between gap-3 font-body text-sm">
                  <span className="text-foreground truncate">{item.quantity}x {item.product_name}</span>
                  <span className="shrink-0">R$ {(item.price * (item.quantity || 1)).toFixed(2).replace('.', ',')}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-border pt-3 space-y-2 font-body text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>R$ {subtotal.toFixed(2).replace('.', ',')}</span></div>
              {wrappingTotal > 0 && (
                <div className="flex justify-between"><span className="text-muted-foreground">Embalagem</span><span>R$ {wrappingTotal.toFixed(2).replace('.', ',')}</span></div>
              )}
              <div className="flex justify-between font-display text-base pt-2 border-t border-border">
                <span>Total</span>
                <span>R$ {total.toFixed(2).replace('.', ',')}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
