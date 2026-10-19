import en from './en.json';
import fr from './fr.json';

/**
 * Translation tree: texts grouped by screen or feature.
 */
interface TranslationTree {
  /**
   * A text, or a group of texts.
   */
  readonly [key: string]: string | TranslationTree;
}

/**
 * Every text of a tree by its dotted key.
 */
function flatten(tree: TranslationTree, prefix = ''): Record<string, string> {
  return Object.entries(tree).reduce<Record<string, string>>((texts, [key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === 'string'
      ? { ...texts, [path]: value }
      : { ...texts, ...flatten(value, path) };
  }, {});
}

/**
 * Parameters of a text (`{{ childName }}`), sorted.
 */
function params(text: string): string[] {
  return [...text.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map(([, name]) => name).sort();
}

describe('translation files', () => {
  const french = flatten(fr);
  const english = flatten(en);

  it('have the same keys in French and English', () => {
    expect(Object.keys(english).sort()).toEqual(Object.keys(french).sort());
  });

  it('keep the parameters of each text', () => {
    const broken = Object.keys(french).filter(
      (key) =>
        english[key] !== undefined && params(english[key]).join() !== params(french[key]).join(),
    );
    expect(broken).toEqual([]);
  });
});
