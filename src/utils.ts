export async function executeWithTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs: number,
  operationName: string
): Promise<T> {
  try {
    return await Promise.race([
      operation(),
      new Promise<never>((_, reject) =>
        setTimeout(
          () =>
            reject(new Error(`${operationName} timeout after ${timeoutMs}ms`)),
          timeoutMs
        )
      ),
    ]);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`${operationName} failed: ${error.message}`);
    }
    throw new Error(`${operationName} failed with unknown error`);
  }
}

export function groupBy<T, K extends string | number | symbol>(
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

export function toCamelCase(input: string): string {
  if (!input || typeof input !== 'string') return 'element';

  return (
    input
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .map((word, index) => {
        if (index === 0) return word.toLowerCase();
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join('')
      .replace(/[^\w]/g, '')
      .replace(/^\d+/, '')
      .replace(/^[^a-zA-Z_$]/, '') || 'element'
  );
}

export function sanitizeKey(input: string): string {
  return input.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
}

export function escapeString(input: string): string {
  return input.replace(/'/g, "\\'");
}

export function uniquifyPropertyNames<T extends { propertyName: string }>(
  elements: T[]
): T[] {
  const usedNames = new Set<string>();

  return elements.map(element => {
    let uniqueName = element.propertyName;
    let counter = 1;

    while (usedNames.has(uniqueName)) {
      uniqueName = `${element.propertyName}${counter}`;
      counter++;
    }

    usedNames.add(uniqueName);
    return { ...element, propertyName: uniqueName };
  });
}
