import { getSetting, setSetting } from './settings.js';

export const CONTENT_PAGES = {
  'sobre-nos': {
    settingKey: 'page_sobre_nos',
    title: 'Sobre Nós',
    defaultContent: `## Nossa história

A **Sorelle Presentes** nasceu do desejo de reunir, em um só lugar, presentes e peças de decoração selecionadas com carinho — para quem valoriza detalhes, qualidade e momentos especiais.

Somos uma loja de Sacramento, Minas Gerais, dedicada a transformar gestos simples em memórias duradouras. Cada produto passa por uma curadoria criteriosa, pensando no conforto do lar, na beleza dos ambientes e no prazer de presentear.

## O que nos move

- **Curadoria:** escolhemos peças que combinam estética, funcionalidade e propósito.
- **Atendimento próximo:** tratamos cada cliente com atenção e transparência.
- **Paixão pelo lar:** acreditamos que ambientes bem cuidados refletem quem somos.

## Onde estamos

Sacramento — MG  
Telefone: (34) 3351-1975  
E-mail: contato@sorellepresentes.com.br

Obrigado por fazer parte da nossa história.`,
  },
  'politica-de-privacidade': {
    settingKey: 'page_politica_privacidade',
    title: 'Política de Privacidade',
    defaultContent: `## Introdução

A **Sorelle Presentes** respeita a sua privacidade. Esta política descreve como coletamos, usamos e protegemos seus dados pessoais ao utilizar nosso site e serviços.

## Dados que coletamos

Podemos coletar:

- **Cadastro:** nome, e-mail, telefone e senha (armazenada de forma criptografada).
- **Compras:** endereço de entrega, CPF/CNPJ quando necessário, histórico de pedidos e forma de pagamento.
- **Navegação:** cookies e dados técnicos de acesso (IP, navegador, páginas visitadas) para melhorar a experiência.

## Como usamos seus dados

Utilizamos as informações para:

- Processar pedidos, entregas e pagamentos;
- Enviar confirmações e atualizações sobre compras;
- Prestar suporte ao cliente;
- Cumprir obrigações legais e fiscais;
- Melhorar nossos produtos e a experiência no site.

## Compartilhamento

Não vendemos seus dados. Podemos compartilhá-los apenas com:

- Operadores de pagamento e logística, para concluir sua compra;
- Autoridades, quando exigido por lei.

## Seus direitos

Você pode solicitar:

- Acesso, correção ou exclusão dos seus dados;
- Revogação de consentimentos, quando aplicável.

Entre em contato: **contato@sorellepresentes.com.br**

## Segurança

Adotamos medidas técnicas e organizacionais para proteger suas informações, incluindo conexões seguras e controle de acesso.

## Alterações

Esta política pode ser atualizada. A versão vigente estará sempre disponível nesta página.

**Última atualização:** ${new Date().toLocaleDateString('pt-BR')}`,
  },
};

function parseStoredPage(raw, fallback) {
  if (!raw) return { ...fallback };
  try {
    const parsed = JSON.parse(raw);
    return {
      slug: fallback.slug,
      title: parsed.title || fallback.title,
      content: parsed.content ?? fallback.content,
      updated_date: parsed.updated_date || null,
    };
  } catch {
    return { ...fallback, content: raw };
  }
}

export async function getContentPage(slug) {
  const meta = CONTENT_PAGES[slug];
  if (!meta) return null;

  const raw = await getSetting(meta.settingKey);
  const fallback = {
    slug,
    title: meta.title,
    content: meta.defaultContent,
    updated_date: null,
  };

  return parseStoredPage(raw, fallback);
}

export async function getAllContentPages() {
  const slugs = Object.keys(CONTENT_PAGES);
  const pages = await Promise.all(slugs.map((slug) => getContentPage(slug)));
  return pages.filter(Boolean);
}

export async function updateContentPage(slug, { title, content }) {
  const meta = CONTENT_PAGES[slug];
  if (!meta) return null;

  const payload = {
    title: (title || meta.title).trim(),
    content: content ?? meta.defaultContent,
    updated_date: new Date().toISOString(),
  };

  await setSetting(meta.settingKey, JSON.stringify(payload));
  return getContentPage(slug);
}

export function listContentPageDefinitions() {
  return Object.entries(CONTENT_PAGES).map(([slug, meta]) => ({
    slug,
    title: meta.title,
    settingKey: meta.settingKey,
  }));
}
