const BRAND_PATTERN = /\bGreffio\b/g;
const BRAND_PATTERN_UPPER = /\bGREFFIO\b/g;
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'CODE', 'PRE', 'TEXTAREA']);
const BRAND_ATTRIBUTES = ['aria-label', 'title', 'placeholder', 'alt'];

const replaceBrand = (value) => String(value || '')
  .replace(BRAND_PATTERN, 'Clareffio')
  .replace(BRAND_PATTERN_UPPER, 'CLAREFFIO');

const shouldSkipNode = (node) => {
  const parent = node?.parentElement;
  if (!parent) return false;
  if (SKIP_TAGS.has(parent.tagName)) return true;
  if (parent.closest('[data-preserve-greffio="true"]')) return true;
  if (parent.closest('[contenteditable="true"]')) return true;
  return false;
};

const normalizeTextNode = (node) => {
  if (!node || node.nodeType !== Node.TEXT_NODE || shouldSkipNode(node)) return;
  const next = replaceBrand(node.nodeValue);
  if (next !== node.nodeValue) node.nodeValue = next;
};

const normalizeElement = (element) => {
  if (!(element instanceof Element)) return;
  if (element.matches('[data-preserve-greffio="true"]') || element.closest('[data-preserve-greffio="true"]')) return;

  BRAND_ATTRIBUTES.forEach((attribute) => {
    if (!element.hasAttribute(attribute)) return;
    const current = element.getAttribute(attribute);
    const next = replaceBrand(current);
    if (next !== current) element.setAttribute(attribute, next);
  });

  if (element.tagName === 'META' && element.hasAttribute('content')) {
    const current = element.getAttribute('content');
    const next = replaceBrand(current);
    if (next !== current) element.setAttribute('content', next);
  }
};

const normalizeSubtree = (root) => {
  if (!root) return;
  if (root.nodeType === Node.TEXT_NODE) {
    normalizeTextNode(root);
    return;
  }
  if (!(root instanceof Element) && root !== document.documentElement) return;

  if (root instanceof Element) normalizeElement(root);

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  let node = walker.nextNode();
  while (node) {
    if (node.nodeType === Node.TEXT_NODE) normalizeTextNode(node);
    else normalizeElement(node);
    node = walker.nextNode();
  }
};

export const installClareffioBranding = () => {
  if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') return () => {};

  normalizeSubtree(document.documentElement);

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'characterData') {
        normalizeTextNode(mutation.target);
        return;
      }
      if (mutation.type === 'attributes') {
        normalizeElement(mutation.target);
        return;
      }
      mutation.addedNodes.forEach(normalizeSubtree);
    });
  });

  observer.observe(document.documentElement, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: [...BRAND_ATTRIBUTES, 'content'],
  });

  return () => observer.disconnect();
};
