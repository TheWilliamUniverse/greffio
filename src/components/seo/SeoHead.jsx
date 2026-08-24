import { useEffect } from 'react';
import { runtimeConfig } from '@/config/runtime.js';

const upsertMeta = (selector, attributes) => {
  if (typeof document === 'undefined') return;
  let element = document.head.querySelector(selector);
  if (!element) {
    element = document.createElement('meta');
    document.head.appendChild(element);
  }
  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, value);
  });
};

const upsertLink = (rel, href) => {
  if (typeof document === 'undefined' || !href) return;
  let element = document.head.querySelector(`link[rel="${rel}"]`);
  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', rel);
    document.head.appendChild(element);
  }
  element.setAttribute('href', href);
};

const upsertJsonLd = (id, payload) => {
  if (typeof document === 'undefined' || !payload) return;
  const scriptId = `clareffio-jsonld-${id}`;
  let element = document.getElementById(scriptId);
  if (!element) {
    element = document.createElement('script');
    element.type = 'application/ld+json';
    element.id = scriptId;
    document.head.appendChild(element);
  }
  element.textContent = JSON.stringify(payload);
};

export const SeoHead = ({
  title,
  description,
  path = '/',
  ogImage = `${runtimeConfig.appUrl}/icons/clareffio-arc.svg`,
  jsonLd = null,
  jsonLdId = 'page',
  noIndex = false,
}) => {
  useEffect(() => {
    const canonical = `${runtimeConfig.appUrl}${path.startsWith('/') ? path : `/${path}`}`;
    document.title = title;
    upsertMeta('meta[name="description"]', { name: 'description', content: description });
    upsertMeta('meta[name="robots"]', { name: 'robots', content: noIndex ? 'noindex, nofollow' : 'index, follow' });
    upsertLink('canonical', canonical);
    upsertMeta('meta[property="og:type"]', { property: 'og:type', content: 'website' });
    upsertMeta('meta[property="og:site_name"]', { property: 'og:site_name', content: 'Clareffio' });
    upsertMeta('meta[property="og:title"]', { property: 'og:title', content: title });
    upsertMeta('meta[property="og:description"]', { property: 'og:description', content: description });
    upsertMeta('meta[property="og:url"]', { property: 'og:url', content: canonical });
    upsertMeta('meta[property="og:image"]', { property: 'og:image', content: ogImage });
    upsertMeta('meta[property="og:locale"]', { property: 'og:locale', content: 'fr_FR' });
    upsertMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary_large_image' });
    upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: title });
    upsertMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: description });
    upsertMeta('meta[name="twitter:image"]', { name: 'twitter:image', content: ogImage });
    if (jsonLd) upsertJsonLd(jsonLdId, jsonLd);
  }, [title, description, path, ogImage, jsonLd, jsonLdId, noIndex]);

  return null;
};

export const buildFaqJsonLd = (faqs, pageUrl) => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map(({ question, answer }) => ({
    '@type': 'Question',
    name: question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: answer,
    },
  })),
  url: pageUrl,
});

export const HOME_JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': 'https://clareffio.willentreprises.com/#organization',
      name: 'Clareffio',
      url: 'https://clareffio.willentreprises.com/',
      logo: 'https://clareffio.willentreprises.com/icons/clareffio-arc.svg',
      parentOrganization: {
        '@type': 'Organization',
        name: 'William Establishments',
        url: 'https://willentreprises.com/',
      },
    },
    {
      '@type': 'WebSite',
      '@id': 'https://clareffio.willentreprises.com/#website',
      name: 'Clareffio',
      url: 'https://clareffio.willentreprises.com/',
      inLanguage: 'fr-FR',
      description: 'Formalités d\'entreprise en ligne : création, modification, statuts et dépôt du dossier.',
      publisher: { '@id': 'https://clareffio.willentreprises.com/#organization' },
    },
    {
      '@type': 'Service',
      '@id': 'https://clareffio.willentreprises.com/#service',
      name: 'Clareffio',
      serviceType: 'Formalités d\'entreprise en ligne',
      areaServed: { '@type': 'Country', name: 'France' },
      provider: { '@id': 'https://clareffio.willentreprises.com/#organization' },
      description: 'Création d\'entreprise, modification statutaire, statuts, dépôt du dossier et accompagnement administratif pour les entrepreneurs français.',
    },
  ],
};
