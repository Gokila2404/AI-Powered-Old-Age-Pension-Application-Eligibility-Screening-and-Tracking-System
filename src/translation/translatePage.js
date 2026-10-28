let translateFn = null;
// Lazy-load the translator: the library is Node-oriented (`global` polyfill
// needed) and must not run during the initial module graph evaluation or the
// whole app fails to mount with "global is not defined".
const ensureTranslate = async () => {
  if (!translateFn) {
    const mod = await import('@vitalets/google-translate-api');
    translateFn = mod.translate;
  }
  return translateFn;
};

const cache = new Map();
const inFlight = new Map();
let activeTranslator = null;
const EXCLUDED_TAGS = new Set([
  "SCRIPT",
  "STYLE",
  "NOSCRIPT",
  "TEXTAREA",
  "INPUT",
  "SELECT",
  "OPTION",
  "CODE",
  "PRE",
  "SVG",
]);

const isTranslatable = (node) => {
  const parent = node.parentElement;
  return (
    node.nodeType === Node.TEXT_NODE &&
    node.nodeValue.trim().length > 0 &&
    parent &&
    !EXCLUDED_TAGS.has(parent.tagName) &&
    !parent.closest('[data-no-translate], [contenteditable="true"]')
  );
};

const translateText = async (text, targetLanguage) => {
  const key = `${targetLanguage}:${text}`;
  if (cache.has(key)) return cache.get(key);
  if (!inFlight.has(key)) {
    const request = ensureTranslate()
      .then((translate) => translate(text, { to: targetLanguage }))
      .then((result) => result.text)
      .catch(() => text)
      .then((translated) => {
        cache.set(key, translated);
        inFlight.delete(key);
        return translated;
      });
    inFlight.set(key, request);
  }
  return inFlight.get(key);
};

export const translatePage = (root, targetLanguage = "ta") => {
  if (!root || targetLanguage !== "ta") return () => {};

  activeTranslator?.();
  let cancelled = false;
  const originalValues = new WeakMap();
  const pendingNodes = new WeakSet();

  const queueTranslation = (node) => {
    if (!isTranslatable(node) || pendingNodes.has(node)) return;
    const original = node.nodeValue;
    if (!originalValues.has(node)) originalValues.set(node, original);
    const source = originalValues.get(node).trim();
    if (!source || /[\u0B80-\u0BFF]/.test(source)) return;
    pendingNodes.add(node);
    translateText(source, targetLanguage).then((result) => {
      pendingNodes.delete(node);
      if (cancelled || !node.isConnected) return;
      const prefix = original.match(/^\s*/)?.[0] || "";
      const suffix = original.match(/\s*$/)?.[0] || "";
      node.nodeValue = `${prefix}${result}${suffix}`;
    });
  };

  const scan = (element) => {
    if (!element) return;
    if (element.nodeType === Node.ELEMENT_NODE && !EXCLUDED_TAGS.has(element.tagName)) {
      ['placeholder', 'aria-label', 'title'].forEach((attr) => {
        const value = element.getAttribute(attr);
        if (!value || /[\u0B80-\u0BFF]/.test(value)) return;
        translateText(value, targetLanguage).then((result) => {
          if (!cancelled && element.isConnected && element.getAttribute(attr) === value) element.setAttribute(attr, result);
        });
      });
    }
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => isTranslatable(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT,
    });
    let node;
    while ((node = walker.nextNode())) queueTranslation(node);

  };

  scan(root);
  const observer = new MutationObserver((records) => {
    records.forEach((record) => {
      if (record.type === 'attributes') {
        const element = record.target;
        const attr = record.attributeName;
        const value = element.getAttribute(attr);
        if (value && !/[\u0B80-\u0BFF]/.test(value)) {
          translateText(value, targetLanguage).then((result) => {
            if (!cancelled && element.isConnected && element.getAttribute(attr) === value) element.setAttribute(attr, result);
          });
        }
      }
      record.addedNodes?.forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE) queueTranslation(node);
        else if (node.nodeType === Node.ELEMENT_NODE && !EXCLUDED_TAGS.has(node.tagName)) scan(node);
      });
    });
  });
  observer.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['placeholder', 'aria-label', 'title'] });

  const cleanup = () => {
    cancelled = true;
    observer.disconnect();
  };
  activeTranslator = cleanup;
  return cleanup;
};
