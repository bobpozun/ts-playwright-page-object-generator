import type { PageObjectConfig } from './types.js';

export function buildSelectorString(
  config: Required<PageObjectConfig>
): string {
  const { containerSelector, includeSelectors, interactiveOnly } = config;

  if (includeSelectors.length > 0) {
    return `${containerSelector} ${includeSelectors.join(
      `, ${containerSelector} `
    )}`;
  }

  if (interactiveOnly) {
    const interactiveSelectors = [
      'button',
      'a',
      'input',
      'select',
      'textarea',
      '[role="button"]',
      '[role="link"]',
      '[role="tab"]',
      '[role="menuitem"]',
      '[role="combobox"]',
      '[role="listbox"]',
      '[role="checkbox"]',
      '[role="radio"]',
      '[onclick]',
      '[onfocus]',
      '[onblur]',
      '[tabindex]',
      '[data-testid]',
      'label',
    ];
    return `${containerSelector} ${interactiveSelectors.join(
      `, ${containerSelector} `
    )}`;
  }

  const defaultSelectors = [
    '[role]',
    'button',
    'a',
    'input',
    'select',
    'textarea',
    'img',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'label',
    'p',
    'span',
    'div',
    'section',
    'article',
    'main',
    'aside',
    'header',
    'footer',
    'nav',
  ];

  return `${containerSelector} ${defaultSelectors.join(
    `, ${containerSelector} `
  )}`;
}
