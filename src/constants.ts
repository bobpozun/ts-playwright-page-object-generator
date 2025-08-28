import type { PageObjectConfig } from './types.js';

export const DEFAULT_CONFIG: Required<
  Omit<
    PageObjectConfig,
    | 'customElementTypes'
    | 'elementTypeMappings'
    | 'excludeSelectors'
    | 'includeSelectors'
    | 'elementFilters'
  >
> = {
  containerSelector: 'body',
  includeHelpers: true,
  interactiveOnly: true,
  selectorPriorities: ['role', 'testid', 'label', 'text', 'id', 'css'],
  maxTextLength: 100,
  includeHiddenElements: false,
  namingConvention: 'camelCase',
  enableRuntimeVisibilityCheck: false,
};

export const DEFAULT_ELEMENT_TYPES: Record<string, string[]> = {
  button: [
    'button',
    'input[type="button"]',
    'input[type="submit"]',
    'input[type="reset"]',
    '[role="button"]',
  ],
  link: ['a', '[role="link"]'],
  input: [
    'input[type="text"]',
    'input[type="email"]',
    'input[type="password"]',
    'input[type="number"]',
    'input[type="tel"]',
    'input[type="url"]',
    'input[type="search"]',
  ],
  checkbox: ['input[type="checkbox"]', '[role="checkbox"]'],
  radio: ['input[type="radio"]', '[role="radio"]'],
  select: ['select', '[role="combobox"]', '[role="listbox"]'],
  textarea: ['textarea'],
  image: ['img', '[role="img"]'],
  heading: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', '[role="heading"]'],
  label: ['label', '[role="label"]'],
  alert: ['[role="alert"]', '[role="status"]', '[role="alertdialog"]'],
  dialog: ['[role="dialog"]', '[role="modal"]'],
  tab: ['[role="tab"]', '[role="tabpanel"]'],
  navigation: ['nav', '[role="navigation"]'],
  main: ['main', '[role="main"]'],
  aside: ['aside', '[role="complementary"]'],
  header: ['header', '[role="banner"]'],
  footer: ['footer', '[role="contentinfo"]'],
  section: ['section', 'article'],
  text: ['p', 'span', 'div'],
};
