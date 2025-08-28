import type { AccessibleElement, ElementFilter } from './types.js';

export class DuplicateElementFilter implements ElementFilter {
  name = 'DuplicateElementFilter';
  description = 'Removes duplicate elements with the same selector';
  enabled = true;

  filter(elements: AccessibleElement[]): AccessibleElement[] {
    const grouped = groupBy(elements, el => el.selector.selector);
    return Object.values(grouped)
      .map(group => group[0])
      .filter((el): el is AccessibleElement => el !== undefined);
  }
}

export class HiddenElementFilter implements ElementFilter {
  name = 'HiddenElementFilter';
  description = 'Removes hidden elements unless explicitly included';
  enabled = true;

  filter(elements: AccessibleElement[]): AccessibleElement[] {
    return elements.filter(element => {
      const attributes = element.attributes;

      if (
        attributes['hidden'] === '' ||
        attributes['aria-hidden'] === 'true' ||
        attributes['style']?.includes('display: none') ||
        attributes['style']?.includes('visibility: hidden') ||
        attributes['style']?.includes('opacity: 0')
      ) {
        return false;
      }

      const className = element.className || '';
      if (
        className.includes('hidden') ||
        className.includes('invisible') ||
        className.includes('sr-only') ||
        className.includes('visually-hidden')
      ) {
        return false;
      }

      if (
        attributes['width'] === '0' ||
        attributes['height'] === '0' ||
        attributes['style']?.includes('width: 0') ||
        attributes['style']?.includes('height: 0')
      ) {
        return false;
      }

      if (
        element.tagName === 'script' ||
        element.tagName === 'style' ||
        element.tagName === 'noscript' ||
        element.tagName === 'meta' ||
        element.tagName === 'link' ||
        element.tagName === 'title' ||
        element.tagName === 'head'
      ) {
        return false;
      }

      return true;
    });
  }
}

export class VisibilityFilter implements ElementFilter {
  name = 'VisibilityFilter';
  description =
    'Removes elements that are not visible on the page (runtime check)';
  enabled = false;

  constructor(enabled = false) {
    this.enabled = enabled;
  }

  async filterAsync(
    elements: AccessibleElement[],
    page: any
  ): Promise<AccessibleElement[]> {
    if (!this.enabled) return elements;

    const visibleElements: AccessibleElement[] = [];

    for (const element of elements) {
      try {
        const locator = page.locator(element.selector);
        const isVisible = await locator.isVisible();

        if (isVisible) {
          visibleElements.push(element);
        }
      } catch {
        visibleElements.push(element);
      }
    }

    return visibleElements;
  }

  filter(elements: AccessibleElement[]): AccessibleElement[] {
    return elements;
  }
}

export class MeaningfulContentFilter implements ElementFilter {
  name = 'MeaningfulContentFilter';
  description = 'Removes elements with no meaningful content';
  enabled = true;

  filter(elements: AccessibleElement[]): AccessibleElement[] {
    return elements.filter(element => {
      if (
        !element.textContent &&
        !element['aria-label'] &&
        !element.placeholder &&
        !element.id &&
        !element.nameAttr
      ) {
        return false;
      }

      if (
        element.tagName === 'div' &&
        element.type === 'text' &&
        element.textContent.length > 200
      ) {
        return false;
      }

      if (element.textContent && !this.isMeaningfulText(element.textContent)) {
        return false;
      }

      if (
        element.selector.selector.includes('.nth(') &&
        !element.id &&
        !element['aria-label'] &&
        !element.textContent
      ) {
        return false;
      }

      if (
        element.textContent &&
        element.textContent.length > 50 &&
        !this.isInteractiveElement(element)
      ) {
        return false;
      }

      if (
        element.type === 'text' &&
        !this.hasInteractiveAttributes(element) &&
        element.textContent.length > 30
      ) {
        return false;
      }

      return true;
    });
  }

  private isMeaningfulText(text: string): boolean {
    const trimmed = text.trim();

    if (trimmed.length < 2) return false;

    if (trimmed.includes('{') && trimmed.includes('}')) return false;
    if (trimmed.includes(';') && trimmed.includes(':')) return false;
    if (trimmed.startsWith('.') || trimmed.startsWith('#')) return false;

    if (trimmed.includes('function(') || trimmed.includes('var ')) return false;
    if (trimmed.includes('document.') || trimmed.includes('window.'))
      return false;

    if (trimmed.length > 80) return false;

    if (
      trimmed.length > 30 &&
      !trimmed.includes(' ') &&
      /[A-Z][a-z]/.test(trimmed)
    ) {
      return false;
    }

    const specialCharRatio =
      (trimmed.match(/[^a-zA-Z0-9\s]/g) || []).length / trimmed.length;
    if (specialCharRatio > 0.7) return false;

    return true;
  }

  private isInteractiveElement(element: AccessibleElement): boolean {
    if (
      ['button', 'link', 'input', 'select', 'textarea', 'tab'].includes(
        element.type
      )
    ) {
      return true;
    }

    if (this.hasInteractiveAttributes(element)) {
      return true;
    }

    if (
      element.attributes['onclick'] ||
      element.attributes['onfocus'] ||
      element.attributes['tabindex']
    ) {
      return true;
    }

    return false;
  }

  private hasInteractiveAttributes(element: AccessibleElement): boolean {
    return !!(
      element.attributes['onclick'] ||
      element.attributes['onfocus'] ||
      element.attributes['onblur'] ||
      element.attributes['onmouseover'] ||
      element.attributes['onmouseenter'] ||
      element.attributes['tabindex'] ||
      element.attributes['role'] === 'button' ||
      element.attributes['role'] === 'link' ||
      element.attributes['role'] === 'tab' ||
      element.attributes['role'] === 'menuitem'
    );
  }
}

function groupBy<T, K extends string | number | symbol>(
  elements: T[],
  keyFn: (element: T) => K
): Record<K, T[]> {
  return elements.reduce((groups, element) => {
    const key = keyFn(element);
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(element);
    return groups;
  }, {} as Record<K, T[]>);
}
