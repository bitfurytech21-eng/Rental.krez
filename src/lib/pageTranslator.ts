import { TranslationService } from './translationService';

// WeakMap storing original English text for every DOM Text Node
const originalTextMap = new WeakMap<Node, string>();

// Regex to identify non-translatable text: numbers only, prices, hex addresses, URLs, pure symbols
const NON_TRANSLATABLE_REGEX = /^[\d\s€$£¥%.,\-\/:#+@a-fA-F0-9_]{1,30}$|^https?:\/\/|^0x[a-fA-F0-9]{10,}/;

let currentObserver: MutationObserver | null = null;
let isTranslatingDOM = false;

/**
 * Checks if an HTML element should be excluded from translation
 */
function shouldSkipElement(element: Element | null): boolean {
  if (!element) return false;
  const tagName = element.tagName.toLowerCase();
  if (['script', 'style', 'code', 'pre', 'noscript', 'textarea', 'svg'].includes(tagName)) {
    return true;
  }
  if (element.getAttribute('data-no-translate') === 'true' || element.classList.contains('no-translate')) {
    return true;
  }
  return false;
}

/**
 * Collects all eligible text nodes under a parent element
 */
function collectTextNodes(root: Node): Text[] {
  const textNodes: Text[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.textContent || !node.textContent.trim()) {
        return NodeFilter.FILTER_REJECT;
      }
      if (shouldSkipElement(node.parentElement)) {
        return NodeFilter.FILTER_REJECT;
      }
      const text = node.textContent.trim();
      // Skip pure numbers, prices, crypto addresses, or single symbols
      if (NON_TRANSLATABLE_REGEX.test(text) && !/[a-zA-Z]{2,}/.test(text)) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  let currentNode = walker.nextNode();
  while (currentNode) {
    textNodes.push(currentNode as Text);
    currentNode = walker.nextNode();
  }
  return textNodes;
}

/**
 * Translates all text nodes on the current page into targetLang
 */
export async function translateCurrentPage(targetLang: string): Promise<void> {
  if (typeof document === 'undefined' || isTranslatingDOM) return;

  // If returning to English, restore all original text nodes
  if (targetLang === 'en' || targetLang === 'en-US' || targetLang === 'en-GB') {
    restoreOriginalPage();
    if (currentObserver) {
      currentObserver.disconnect();
      currentObserver = null;
    }
    return;
  }

  isTranslatingDOM = true;

  try {
    const textNodes = collectTextNodes(document.body);
    const missingNodes: Text[] = [];
    const missingTexts: string[] = [];

    // Step 1: Record original English text and apply instant cached/dictionary translations
    textNodes.forEach((node) => {
      if (!originalTextMap.has(node)) {
        originalTextMap.set(node, node.textContent || '');
      }

      const origText = originalTextMap.get(node) || '';
      const trimmed = origText.trim();
      if (!trimmed) return;

      const cached = TranslationService.translateInstant(trimmed, targetLang);
      if (cached && cached !== trimmed) {
        // Apply instant translation preserving surrounding whitespace
        const leadingSpace = origText.match(/^\s*/)?.[0] || '';
        const trailingSpace = origText.match(/\s*$/)?.[0] || '';
        node.textContent = `${leadingSpace}${cached}${trailingSpace}`;
      } else {
        missingNodes.push(node);
        missingTexts.push(trimmed);
      }
    });

    // Step 2: Batch fetch missing translations from backend Switch Translation API
    if (missingTexts.length > 0) {
      // Deduplicate texts for server call
      const uniqueTexts = Array.from(new Set(missingTexts));
      const batchSize = 15;

      for (let i = 0; i < uniqueTexts.length; i += batchSize) {
        const slice = uniqueTexts.slice(i, i + batchSize);
        const translatedSlice = await TranslationService.translateBatch(slice, targetLang);

        const translationMap: Record<string, string> = {};
        slice.forEach((orig, idx) => {
          if (translatedSlice[idx]) {
            translationMap[orig] = translatedSlice[idx];
          }
        });

        // Apply translations to matching DOM nodes
        missingNodes.forEach((node) => {
          const origText = originalTextMap.get(node) || '';
          const trimmed = origText.trim();
          if (translationMap[trimmed]) {
            const leadingSpace = origText.match(/^\s*/)?.[0] || '';
            const trailingSpace = origText.match(/\s*$/)?.[0] || '';
            node.textContent = `${leadingSpace}${translationMap[trimmed]}${trailingSpace}`;
          }
        });
      }
    }

    // Step 3: Setup MutationObserver to translate newly mounted dynamic elements (e.g. tabs, modals, page routes)
    if (!currentObserver) {
      currentObserver = new MutationObserver((mutations) => {
        let needsTranslation = false;
        mutations.forEach((m) => {
          if (m.addedNodes.length > 0) {
            needsTranslation = true;
          }
        });

        if (needsTranslation && !isTranslatingDOM) {
          translateCurrentPage(targetLang);
        }
      });

      currentObserver.observe(document.body, {
        childList: true,
        subtree: true,
      });
    }
  } catch (err) {
    console.warn('Page translation error:', err);
  } finally {
    isTranslatingDOM = false;
  }
}

/**
 * Restores original English text on all modified text nodes
 */
export function restoreOriginalPage(): void {
  if (typeof document === 'undefined') return;

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let currentNode = walker.nextNode();
  while (currentNode) {
    if (originalTextMap.has(currentNode)) {
      const orig = originalTextMap.get(currentNode);
      if (orig !== undefined) {
        currentNode.textContent = orig;
      }
    }
    currentNode = walker.nextNode();
  }
}
