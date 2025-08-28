export interface ElementSelector {
  selector: string;
  key: string;
}

export interface AccessibleElement {
  name: string;
  type: string;
  selector: ElementSelector;
  tagName: string;
  textContent: string;
  id: string;
  className: string;
  role: string;
  nameAttr: string;
  placeholder: string;
  'aria-label': string;
  'aria-labelledby': string;
  attributes: Record<string, string>;
  propertyName: string;
  key: string;
}

export interface PageObjectConfig {
  containerSelector?: string;
  interactiveOnly?: boolean;
  maxTextLength?: number;
  namingConvention?: 'camelCase' | 'snake_case' | 'kebab-case';
  selectorPriorities?: string[];
  excludeSelectors?: string[];
  includeSelectors?: string[];
  customElementTypes?: Record<string, string[]>;
  elementTypeMappings?: Record<string, string>;
  elementFilters?: ElementFilter[];
  includeHiddenElements?: boolean;
  enableRuntimeVisibilityCheck?: boolean;
  includeHelpers?: boolean;
}

export interface ElementFilter {
  name: string;
  description: string;
  enabled: boolean;
  filter(elements: AccessibleElement[]): AccessibleElement[];
  filterAsync?(
    elements: AccessibleElement[],
    page: any
  ): Promise<AccessibleElement[]>;
}

export interface ValidationResult {
  type: 'error' | 'warning' | 'info';
  message: string;
  suggestion?: string;
}

export interface GenerationResult {
  pageObjectCode: string;
  elements: AccessibleElement[];
  elementTypes: Record<string, number>;
}
