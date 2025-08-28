# TypeScript Playwright Page Object Generator

A powerful tool for automatically generating Playwright Page Objects from web pages. Focuses on interactive elements by default and generates clean, maintainable TypeScript code with comprehensive element coverage options.

**📦 Available on npm**: [ts-playwright-page-object-generator](https://www.npmjs.com/package/ts-playwright-page-object-generator)

## ✨ Features

- **🔄 Automatic Element Detection**: Intelligently identifies buttons, links, inputs, forms, and other interactive elements
- **🎯 Smart Selector Generation**: Creates robust Playwright selectors using accessibility attributes, text content, and semantic roles
- **📝 TypeScript Generation**: Outputs fully-typed Page Object classes ready for immediate use
- **🔍 Element Filtering**: Built-in filters for duplicates, hidden elements, and meaningful content
- **👁️ Visibility Control**: Optional runtime visibility checks to ensure elements are actually interactable
- **🎨 Customizable**: Extensive configuration options for different use cases
- **🧪 Test Ready**: Generated code works seamlessly with Playwright test suites

## 🚀 Quick Start

### Installation

```bash
# Using yarn
yarn add ts-playwright-page-object-generator

# Using npm
npm install ts-playwright-page-object-generator
```

**📦 Package**: [ts-playwright-page-object-generator](https://www.npmjs.com/package/ts-playwright-page-object-generator)

### Basic Usage

```typescript
import { PageObjectGenerator } from 'ts-playwright-page-object-generator';

// Extract elements from a page
const elements = await PageObjectGenerator.extractAccessibleElements(page);

// Generate a complete Page Object class
const pageObjectCode = await PageObjectGenerator.generatePageObject(
  page,
  'MyPage'
);

// Generate with metadata
const result = await PageObjectGenerator.generatePageObjectMetadata(
  page,
  'MyPage'
);
```

## ⚙️ Configuration

### Default Behavior

By default, the generator:

- Focuses on **interactive elements only** (`interactiveOnly: true`)
- Excludes hidden elements using attribute-based detection
- Uses camelCase naming convention
- Generates helper methods for navigation

### Advanced Configuration

```typescript
const config: PageObjectConfig = {
  // Element Coverage
  interactiveOnly: false, // Include all elements, not just interactive
  enableRuntimeVisibilityCheck: true, // Runtime visibility checks (slower but more accurate)
  includeHiddenElements: false, // Include elements with hidden attributes

  // Naming & Content
  namingConvention: 'snake_case', // 'camelCase' | 'snake_case' | 'kebab-case'
  maxTextLength: 100, // Maximum text length for element names

  // Selector Priorities
  selectorPriorities: ['role', 'testid', 'label', 'text', 'id', 'css'],

  // Custom Element Types
  customElementTypes: {
    'custom-button': ['[data-type="custom-button"]', '.custom-btn'],
  },

  // Element Filtering
  elementFilters: [
    // Custom filters can be added here
  ],
};
```

## 🔍 Element Filtering

The generator includes several built-in filters:

### **DuplicateElementFilter**

Removes duplicate elements with the same selector, keeping only the first occurrence.

### **HiddenElementFilter**

Filters out elements that are likely hidden based on:

- `hidden` attribute
- `aria-hidden="true"`
- CSS styles (`display: none`, `visibility: hidden`, `opacity: 0`)
- Common hiding classes (`hidden`, `invisible`, `sr-only`)
- Zero dimensions

### **VisibilityFilter** (Optional)

When `enableRuntimeVisibilityCheck: true`, performs runtime visibility checks using Playwright's `isVisible()` method. This ensures only actually visible elements are included.

### **MeaningfulContentFilter**

Removes elements with:

- No meaningful text content
- Excessive text length (>200 chars for divs)
- JavaScript code or CSS selectors
- Generic placeholder content

## 📊 Element Types Detected

The generator automatically categorizes elements into types:

| Type       | Selectors                                           | Description            |
| ---------- | --------------------------------------------------- | ---------------------- |
| `button`   | `button`, `input[type="button"]`, `[role="button"]` | Clickable buttons      |
| `link`     | `a`, `[role="link"]`                                | Navigation links       |
| `input`    | `input[type="text"]`, `input[type="email"]`         | Form inputs            |
| `checkbox` | `input[type="checkbox"]`, `[role="checkbox"]`       | Checkboxes             |
| `radio`    | `input[type="radio"]`, `[role="radio"]`             | Radio buttons          |
| `select`   | `select`, `[role="combobox"]`                       | Dropdowns              |
| `textarea` | `textarea`                                          | Multi-line text inputs |
| `image`    | `img`, `[role="img"]`                               | Images with alt text   |
| `heading`  | `h1-h6`, `[role="heading"]`                         | Page headings          |
| `label`    | `label`, `[role="label"]`                           | Form labels            |

## 🎯 Selector Generation Strategy

The generator creates selectors in priority order:

1. **Role-based**: `getByRole('button', { name: 'Submit' })`
2. **Accessibility**: `getByLabel('Email Address')`
3. **Text-based**: `getByText('Click me')`
4. **Test IDs**: `getByTestId('submit-button')`
5. **Attributes**: `locator('#email')`
6. **Fallback**: `locator('button').nth(0)`

## 📁 Generated Output

### Page Object Class

```typescript
export class MyPage {
  private readonly page: Page;

  // Button Elements
  readonly submitButton: Locator;
  readonly cancelButton: Locator;

  // Input Elements
  readonly emailInput: Locator;
  readonly passwordInput: Locator;

  // Link Elements
  readonly signUpLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.submitButton = this.page.getByRole('button', { name: 'Submit' });
    this.emailInput = this.page.getByLabel('Email Address');
    // ... more elements
  }

  async goto(url?: string, timeout = 30000) {
    await this.page.goto(url || 'https://example.com');
    await this.page.waitForLoadState('networkidle', { timeout });
  }
}
```

## 🧪 Testing

### Run Tests

```bash
# Local Development Tests (default)
yarn test                   # Run local tests only (recommended for development)

# Live Package Tests
yarn test:live             # Run live package tests only
```

**Note**: The default `yarn test` command runs only local development tests. To run both test suites, use `yarn test` followed by `yarn test:live`.

**CLI Options**: You can add common Playwright flags to any test command:
- `yarn test --headed` - Run with browser visible
- `yarn test --debug` - Run in debug mode
- `yarn test --grep "pattern"` - Run only tests matching a pattern
- `yarn test --timeout 60000` - Set custom timeout

## 📋 Test Examples

The test suite demonstrates:

- **Default configuration**: Interactive elements only
- **Complete coverage**: All elements with visibility checks
- **Custom filtering**: User-defined element filters

## 🏗️ Test Structure

The project includes two test suites:

- **Local Tests** (`tests/google-page-object.test.ts`): Tests the local development version
- **Live Tests** (`tests/google-page-object-live.test.ts`): Tests the published package version

Tests are organized into Playwright projects for easy separation and selective execution.

## 🛠️ Development

### Quick Setup

For local development, you can use the provided setup script:

```bash
chmod +x setup.sh
./setup.sh
```

This script will automatically:
- Install dependencies with `yarn install`
- Install Playwright browsers with `yarn playwright install`
- Build the project with `yarn build`
- Run tests to verify setup with `yarn test`



### Build

```bash
yarn build                   # Compile TypeScript
yarn lint                    # Check code quality
yarn lint:fix               # Fix linting issues
yarn format                  # Format code with Prettier
```

### Project Structure

```
src/
├── PageObjectGenerator.ts   # Main generator class
├── filters.ts              # Element filtering logic
├── selectors.ts            # Selector generation
├── types.ts                # TypeScript interfaces
├── utils.ts                # Utility functions
└── constants.ts            # Default configurations
```

## 🔧 Advanced Usage

### Custom Element Filters

```typescript
class CustomFilter implements ElementFilter {
  name = 'CustomFilter';
  description = 'Custom filtering logic';
  enabled = true;

  filter(elements: AccessibleElement[]): AccessibleElement[] {
    return elements.filter(/* custom logic */);
  }
}

const config: PageObjectConfig = {
  elementFilters: [new CustomFilter()],
};
```

### Runtime Visibility Checks

```typescript
// Enable for maximum accuracy (slower)
const config: PageObjectConfig = {
  enableRuntimeVisibilityCheck: true,
  interactiveOnly: false,
};

const elements = await PageObjectGenerator.extractAccessibleElements(
  page,
  config
);
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/bobpozun/ts-playwright-page-object-generator/issues)
- **Discussions**: [GitHub Discussions](https://github.com/bobpozun/ts-playwright-page-object-generator/discussions)

---

Built with ❤️ for the Playwright community
