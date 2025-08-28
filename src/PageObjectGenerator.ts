import { Page, Locator } from '@playwright/test';
import type {
  ElementSelector,
  AccessibleElement,
  PageObjectConfig,
  ValidationResult,
} from './types.js';
import { DEFAULT_CONFIG, DEFAULT_ELEMENT_TYPES } from './constants.js';
import {
  DuplicateElementFilter,
  HiddenElementFilter,
  MeaningfulContentFilter,
  VisibilityFilter,
} from './filters.js';
import {
  executeWithTimeout,
  groupBy,
  toCamelCase,
  sanitizeKey,
  escapeString,
  uniquifyPropertyNames,
} from './utils.js';
import { buildSelectorString } from './selectors.js';

/**
 * Page Object Generator for Playwright
 *
 * Automatically generates Page Object classes from web pages by analyzing
 * accessible elements and creating appropriate Playwright selectors.
 */
export class PageObjectGenerator {
  private static mergeConfig(
    userConfig: PageObjectConfig = {}
  ): Required<PageObjectConfig> {
    const merged = { ...DEFAULT_CONFIG, ...userConfig };

    const elementTypes = {
      ...DEFAULT_ELEMENT_TYPES,
      ...userConfig.customElementTypes,
    };

    const elementTypeMappings = { ...userConfig.elementTypeMappings };

    const excludeSelectors = [
      'script',
      'style',
      'noscript',
      'meta',
      'link',
      'title',
      'head',
      ...(userConfig.excludeSelectors || []),
    ];

    const includeSelectors = userConfig.includeSelectors || [];

    const elementFilters = [
      ...(userConfig.elementFilters || []),
      new DuplicateElementFilter(),
      new HiddenElementFilter(),
      new MeaningfulContentFilter(),
      new VisibilityFilter(userConfig.enableRuntimeVisibilityCheck || false),
    ];

    return {
      ...merged,
      customElementTypes: elementTypes,
      elementTypeMappings,
      excludeSelectors,
      includeSelectors,
      elementFilters,
    };
  }

  private static validateConfig(config: PageObjectConfig): ValidationResult[] {
    const results: ValidationResult[] = [];

    if (config.maxTextLength && config.maxTextLength < 1) {
      results.push({
        type: 'error',
        message: 'maxTextLength must be at least 1',
        suggestion: 'Set maxTextLength to a value >= 1',
      });
    }

    if (config.selectorPriorities && config.selectorPriorities.length === 0) {
      results.push({
        type: 'error',
        message: 'selectorPriorities cannot be empty',
        suggestion: 'Provide at least one selector priority or use defaults',
      });
    }

    return results;
  }

  static async extractAccessibleElements(
    page: Page,
    config: PageObjectConfig = {}
  ): Promise<AccessibleElement[]> {
    return executeWithTimeout(
      () => this._extractAccessibleElementsInternal(page, config),
      60000,
      'Element extraction'
    );
  }

  private static async _extractAccessibleElementsInternal(
    page: Page,
    config: PageObjectConfig = {}
  ): Promise<AccessibleElement[]> {
    const mergedConfig = this.mergeConfig(config);

    const validationResults = this.validateConfig(config);
    if (validationResults.some(r => r.type === 'error')) {
      throw new Error(
        `Configuration validation failed: ${validationResults
          .filter(r => r.type === 'error')
          .map(r => r.message)
          .join(', ')}`
      );
    }

    const selector = buildSelectorString(mergedConfig);

    try {
      await executeWithTimeout(
        () => page.waitForLoadState('domcontentloaded'),
        5000,
        'Page load'
      );
    } catch {
      console.warn('Page load timeout, continuing with element extraction');
    }

    const elementHandles = await executeWithTimeout(
      () => page.locator(selector).all(),
      10000,
      'Element selection'
    );

    const elementDetails: AccessibleElement[] = [];

    const batchSize = 5;
    for (let i = 0; i < elementHandles.length; i += batchSize) {
      const batch = elementHandles.slice(i, i + batchSize);

      const batchPromises = batch.map(async (element, batchIndex) => {
        const globalIndex = i + batchIndex;
        try {
          return await executeWithTimeout(
            () => this.extractElementInfo(element, globalIndex),
            5000,
            'Element processing'
          );
        } catch {
          return null;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      const validElements = batchResults.filter(
        (element): element is AccessibleElement => element !== null
      );
      elementDetails.push(...validElements);
    }

    let filteredElements = elementDetails;

    // Apply synchronous filters first
    for (const filter of mergedConfig.elementFilters) {
      if (filter.enabled) {
        filteredElements = filter.filter(filteredElements);
      }
    }

    // Apply async filters (like runtime visibility checks)
    for (const filter of mergedConfig.elementFilters) {
      if (filter.enabled && filter.filterAsync) {
        filteredElements = await filter.filterAsync(filteredElements, page);
      }
    }

    return uniquifyPropertyNames(filteredElements);
  }

  private static async extractElementInfo(
    element: Locator,
    index: number
  ): Promise<AccessibleElement | null> {
    const tagName =
      (await element.evaluate((el: any) => el.tagName))?.toLowerCase() ||
      'unknown';
    const role = (await element.getAttribute('role')) || '';
    const textContent = (await element.textContent())?.trim() || '';
    const id = (await element.getAttribute('id')) || '';
    const className = (await element.getAttribute('class')) || '';
    const nameAttr = (await element.getAttribute('name')) || '';
    const placeholder = (await element.getAttribute('placeholder')) || '';
    const ariaLabel = (await element.getAttribute('aria-label')) || '';
    const ariaLabelledby =
      (await element.getAttribute('aria-labelledby')) || '';

    const attributes = await element.evaluate((el: any) => {
      const attrs: Record<string, string> = {};
      for (let j = 0; j < el.attributes.length; j++) {
        const attr = el.attributes[j];
        attrs[attr.name] = attr.value;
      }
      return attrs;
    });

    const elementType = this.getElementType(
      tagName,
      role,
      attributes['type'] || ''
    );
    const elementSelector = this.generateSelector(
      element,
      tagName,
      role,
      textContent,
      ariaLabel,
      placeholder,
      attributes,
      index
    );
    const propertyName = this.generatePropertyName(
      elementType,
      tagName,
      textContent,
      ariaLabel,
      placeholder,
      nameAttr,
      id,
      attributes,
      index
    );

    return {
      name: propertyName,
      type: elementType,
      selector: elementSelector,
      tagName,
      textContent,
      id,
      className,
      role,
      nameAttr,
      placeholder,
      'aria-label': ariaLabel,
      'aria-labelledby': ariaLabelledby,
      attributes,
      propertyName,
      key: elementSelector.key,
    };
  }

  private static getElementType(
    tagName: string,
    role: string,
    type: string
  ): string {
    const tag = tagName.toLowerCase();
    const roleNormalized = role.toLowerCase();
    const typeNormalized = type.toLowerCase();

    if (
      tag === 'button' ||
      roleNormalized === 'button' ||
      (tag === 'input' &&
        ['button', 'submit', 'reset'].includes(typeNormalized))
    ) {
      return 'button';
    }

    if (tag === 'a' || roleNormalized === 'link') {
      return 'link';
    }

    if (tag === 'input') {
      const specialTypes = [
        'checkbox',
        'radio',
        'file',
        'range',
        'color',
        'date',
        'time',
        'datetime-local',
        'month',
        'week',
        'password',
        'email',
        'tel',
        'url',
      ];
      if (specialTypes.includes(typeNormalized)) {
        return typeNormalized;
      }
      return 'input';
    }

    if (tag === 'select' || roleNormalized === 'combobox') {
      return 'select';
    }

    if (tag === 'textarea') {
      return 'textarea';
    }

    if (tag === 'img' || roleNormalized === 'img') {
      return 'image';
    }

    if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag)) {
      return 'heading';
    }

    if (tag === 'label' || roleNormalized === 'link') {
      return 'label';
    }

    if (tag === 'div' || tag === 'span') {
      if (['alert', 'status', 'alertdialog'].includes(roleNormalized)) {
        return 'alert';
      }
      if (['dialog', 'modal'].includes(roleNormalized)) {
        return 'dialog';
      }
      if (roleNormalized === 'tab') {
        return 'tab';
      }
    }

    if (
      [
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
      ].includes(tag)
    ) {
      return 'text';
    }

    return tag || 'generic';
  }

  private static generateSelector(
    _element: any,
    tagName: string,
    role: string,
    textContent: string,
    ariaLabel: string,
    placeholder: string,
    attributes: Record<string, string>,
    index: number
  ): ElementSelector {
    const testId = attributes['data-testid'];
    const id = attributes['id'];
    const name = attributes['name'];
    const type = attributes['type'];

    if (role && (ariaLabel || textContent)) {
      const accessibleName = ariaLabel || textContent;
      return {
        selector: `getByRole('${role}', { name: '${escapeString(
          accessibleName
        )}' })`,
        key: sanitizeKey(accessibleName),
      };
    }

    if (['input', 'select', 'textarea'].includes(tagName)) {
      if (ariaLabel) {
        return {
          selector: `getByLabel('${escapeString(ariaLabel)}')`,
          key: sanitizeKey(ariaLabel),
        };
      }

      if (placeholder) {
        return {
          selector: `getByPlaceholder('${escapeString(placeholder)}')`,
          key: sanitizeKey(placeholder),
        };
      }
    }

    if (
      tagName === 'button' ||
      (tagName === 'input' &&
        type &&
        ['button', 'submit', 'reset'].includes(type))
    ) {
      if (textContent) {
        return {
          selector: `getByRole('button', { name: '${escapeString(
            textContent
          )}' })`,
          key: sanitizeKey(textContent),
        };
      } else {
        return {
          selector: `getByRole('button')`,
          key: `button_${index}`,
        };
      }
    }

    if (tagName === 'a') {
      if (textContent) {
        return {
          selector: `getByRole('link', { name: '${escapeString(
            textContent
          )}' })`,
          key: sanitizeKey(textContent),
        };
      } else {
        const href = attributes['href'];
        if (href && href !== '#' && href.length > 0) {
          return {
            selector: `locator('a[href="${href}"]')`,
            key: this.generateHrefKey(href, index),
          };
        } else {
          return {
            selector: `locator('a').nth(${index})`,
            key: `link_${index}`,
          };
        }
      }
    }

    if (tagName === 'img') {
      const alt = attributes['alt'];
      if (alt) {
        return {
          selector: `getByAltText('${escapeString(alt)}')`,
          key: sanitizeKey(alt),
        };
      } else {
        return {
          selector: `getByRole('img')`,
          key: `image_${index}`,
        };
      }
    }

    if (textContent && textContent.length > 0 && textContent.length < 100) {
      return {
        selector: `getByText('${escapeString(textContent)}')`,
        key: sanitizeKey(textContent),
      };
    }

    if (testId) {
      return {
        selector: `getByTestId('${testId}')`,
        key: sanitizeKey(testId),
      };
    }

    if (id) {
      return {
        selector: `locator('#${id}')`,
        key: sanitizeKey(id),
      };
    }

    if (name) {
      return {
        selector: `locator('[name="${name}"]')`,
        key: sanitizeKey(name),
      };
    }

    return {
      selector: `locator('${tagName}').nth(${index})`,
      key: `${tagName}_${index}`,
    };
  }

  private static generatePropertyName(
    elementType: string,
    tagName: string,
    textContent: string,
    ariaLabel: string,
    placeholder: string,
    nameAttr: string,
    id: string,
    attributes: Record<string, string>,
    index: number
  ): string {
    let name = '';

    if (ariaLabel && ariaLabel.length > 0 && ariaLabel.length < 50) {
      name = ariaLabel;
    } else if (nameAttr) {
      name = nameAttr;
    } else if (placeholder) {
      name = placeholder;
    } else if (
      textContent &&
      textContent.length > 0 &&
      textContent.length < 50
    ) {
      name = textContent;
    } else if (id) {
      name = id;
    } else {
      name = this.generateFallbackName(elementType, tagName, attributes, index);
    }

    return toCamelCase(name) || `element${index}`;
  }

  private static generateFallbackName(
    elementType: string,
    tagName: string,
    attributes: Record<string, string>,
    index: number
  ): string {
    if (tagName === 'a') {
      const href = attributes['href'];
      if (href) {
        return this.generateHrefName(href);
      }
    } else if (tagName === 'img') {
      const alt = attributes['alt'];
      const src = attributes['src'];
      if (alt) {
        return alt;
      } else if (src) {
        const filename = src.split('/').pop()?.split('.')[0];
        return filename && filename.length > 0
          ? `${tagName}_${filename}`
          : `${elementType}_${index}`;
      }
    } else if (['input', 'select', 'textarea'].includes(tagName)) {
      const type = attributes['type'];
      const value = attributes['value'];
      if (type && type !== 'text') {
        return `${type}Input`;
      } else if (value && value.length > 0 && value.length < 20) {
        return `${tagName}_${sanitizeKey(value)}`;
      }
    } else if (tagName === 'button') {
      const type = attributes['type'];
      const value = attributes['value'];
      if (value && value.length > 0 && value.length < 20) {
        return value;
      } else if (type && type !== 'button') {
        return `${type}Button`;
      }
    }

    return `${elementType}_${index}`;
  }

  private static generateHrefName(href: string): string {
    const socialDomains: Record<string, string> = {
      'instagram.com': 'instagram',
      'linkedin.com': 'linkedin',
      'facebook.com': 'facebook',
      'twitter.com': 'twitter',
      'x.com': 'twitter',
      'youtube.com': 'youtube',
      'tiktok.com': 'tiktok',
    };

    for (const [domain, name] of Object.entries(socialDomains)) {
      if (href.includes(domain)) {
        return name;
      }
    }

    if (href.startsWith('mailto:')) return 'emailLink';
    if (href.startsWith('tel:')) return 'phoneLink';

    try {
      const url = new URL(href.startsWith('http') ? href : `https://${href}`);
      const domain = url.hostname.replace('www.', '').split('.')[0];
      return domain && domain.length > 0 ? `${domain}Link` : 'link';
    } catch {
      const cleanUrl = href
        .replace(/^https?:\/\//, '')
        .replace(/^www\./, '')
        .split('/')[0]
        ?.split('.')[0];
      return cleanUrl && cleanUrl.length > 0 ? `${cleanUrl}Link` : 'link';
    }
  }

  private static generateHrefKey(href: string, index: number): string {
    const name = this.generateHrefName(href);
    return name === 'link' ? `link_${index}` : name;
  }

  static async generatePageObject(
    page: Page,
    className: string,
    config: PageObjectConfig = {}
  ): Promise<string> {
    const { includeHelpers = true } = config;

    const elements = await this.extractAccessibleElements(page, config);
    const pageUrl = page.url();

    const grouped = groupBy(elements, el => el.type);

    const properties = Object.entries(grouped)
      .map(([type, typeElements]) => {
        const typeHeader = `    // ${
          type.charAt(0).toUpperCase() + type.slice(1)
        } Elements`;
        const elementProps = (typeElements || [])
          .map(el => {
            const comment = `/** Locator for ${el.name || 'unnamed'} ${
              el.type
            } */`;
            return `    ${comment}\n    readonly ${el.propertyName}: Locator;`;
          })
          .join('\n\n');

        return `${typeHeader}\n${elementProps}`;
      })
      .join('\n\n');

    const constructorInitializers = elements
      .map(
        el =>
          `        this.${el.propertyName} = this.page.${el.selector.selector};`
      )
      .join('\n');

    const helpers = includeHelpers ? this.generateHelperMethods(pageUrl) : [];

    return `import { Page, Locator } from '@playwright/test';

/**
 * Auto-generated Page Object for ${className}
 * Generated by PageObjectGenerator
 * @class ${className}
 */
export class ${className} {
    private readonly page: Page;

${properties}

    /**
     * Creates a new instance of ${className}
     * @param page Playwright Page instance
     */
    constructor(page: Page) {
        this.page = page;
${constructorInitializers}
    }

${helpers.join('\n')}`;
  }

  private static generateHelperMethods(pageUrl: string): string[] {
    return [
      '    /**',
      '     * Navigates to the page URL and waits for it to load',
      '     * @param url Optional URL to navigate to (defaults to current page URL)',
      '     * @param timeout Maximum time to wait in milliseconds (default: 30 seconds)',
      '     */',
      '    async goto(url?: string, timeout = 30000) {',
      `        await this.page.goto(url || '${pageUrl}');`,
      "        await this.page.waitForLoadState('networkidle', { timeout });",
      '    }',
      '',
      '}',
    ];
  }

  static async generatePageObjectMetadata(
    page: Page,
    pageObjectName: string,
    config: PageObjectConfig = {}
  ): Promise<{
    pageObjectCode: string;
    elements: AccessibleElement[];
    elementTypes: Record<string, number>;
  }> {
    const pageObjectCode = await this.generatePageObject(
      page,
      pageObjectName,
      config
    );
    const elements = await this.extractAccessibleElements(page, config);

    console.log(`\n✅ Generated page object for: ${pageObjectName}`);
    console.log(`📋 Extracted ${elements.length} accessible elements`);
    console.log(
      `📄 Page object code length: ${pageObjectCode.length} characters`
    );

    const elementTypes = groupBy(elements, el => el.type);
    const elementTypeCounts = Object.fromEntries(
      Object.entries(elementTypes).map(([type, group]) => [
        type,
        group?.length || 0,
      ])
    );

    console.log('\nElement types found:');
    console.log('='.repeat(50));
    console.table(elementTypeCounts);

    return {
      pageObjectCode,
      elements,
      elementTypes: elementTypeCounts,
    };
  }
}
