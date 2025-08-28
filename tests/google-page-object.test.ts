import { expect, test } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import {
  PageObjectConfig,
  PageObjectGenerator,
  AccessibleElement,
} from '../index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function savePageObjectToFile(
  pageObjectCode: string,
  fileName: string,
  elements: AccessibleElement[],
  config: PageObjectConfig
) {
  const generatedDir = path.join(__dirname, '..', 'generated');

  if (!fs.existsSync(generatedDir)) {
    fs.mkdirSync(generatedDir, { recursive: true });
  }

  const pageObjectPath = path.join(generatedDir, `${fileName}.ts`);
  fs.writeFileSync(pageObjectPath, pageObjectCode);

  const elementsPath = path.join(generatedDir, `${fileName}_elements.json`);
  fs.writeFileSync(elementsPath, JSON.stringify(elements, null, 2));

  const configPath = path.join(generatedDir, `${fileName}_config.json`);
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

test.describe('PageObjectGenerator Default Configuration', () => {
  test.setTimeout(120000);

  test('Interactive Elements Only - Generate Default Page Object', async ({
    page,
  }) => {
    await page.goto('https://www.google.com');
    await page.waitForLoadState('networkidle');

    const elements = await PageObjectGenerator.extractAccessibleElements(page);
    const className = 'GooglePage';
    const pageObjectCode = await PageObjectGenerator.generatePageObject(
      page,
      className
    );

    console.log(`Extracted ${elements.length} elements for ${className}`);

    expect(pageObjectCode).toContain(`export class ${className}`);
    expect(pageObjectCode).toContain('private readonly page: Page');
    expect(pageObjectCode).toContain('constructor(page: Page)');

    savePageObjectToFile(pageObjectCode, className, elements, {});

    expect(elements.length).toBeGreaterThan(0);

    const hasInputs = elements.some(
      (el: AccessibleElement) => el.type === 'input'
    );
    const hasButtons = elements.some(
      (el: AccessibleElement) => el.type === 'button'
    );
    const hasLinks = elements.some(
      (el: AccessibleElement) => el.type === 'link'
    );
    expect(hasInputs || hasButtons || hasLinks).toBe(true);
  });

  test('Complete Element Coverage - Generate Full Page Object', async ({
    page,
  }) => {
    await page.goto('https://www.google.com');
    await page.waitForLoadState('networkidle');

    const customConfig: PageObjectConfig = {
      interactiveOnly: false,
      namingConvention: 'snake_case',
    };

    const elements = await PageObjectGenerator.extractAccessibleElements(
      page,
      customConfig
    );
    const className = 'GoogleCompletePage';
    const pageObjectCode = await PageObjectGenerator.generatePageObject(
      page,
      className,
      customConfig
    );

    console.log(`Extracted ${elements.length} elements for ${className}`);

    savePageObjectToFile(pageObjectCode, className, elements, customConfig);

    expect(elements.length).toBeGreaterThan(0);
  });
});
