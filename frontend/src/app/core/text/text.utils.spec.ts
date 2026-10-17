import {
  findQueryRange,
  matchesQuery,
  normalizeForSearch,
  normalizeText,
  quote,
  rankByQuery,
} from './text.utils';

// Same cases as the backend's LabelsTest, so both sides agree on what a duplicate is.
describe('normalizeText', () => {
  it('drops case, accents and surrounding spaces', () => {
    expect(normalizeText('  Gâteau ')).toBe('gateau');
    expect(normalizeText(' Bébé ')).toBe('bebe');
    expect(normalizeText('GÂTEAU')).toBe(normalizeText('gateau'));
    expect(normalizeText('maïs')).toBe('mais');
  });

  it('collapses inner whitespace', () => {
    expect(normalizeText('  Au   revoir  ')).toBe('au revoir');
  });

  it('spells out ligatures and straightens apostrophes', () => {
    expect(normalizeText('sœur')).toBe('soeur');
    expect(normalizeText('Œuf')).toBe('oeuf');
    expect(normalizeText('ex æquo')).toBe('ex aequo');
    expect(normalizeText('s\u2019il te plaît')).toBe("s'il te plait");
  });
});

describe('normalizeForSearch', () => {
  it('drops apostrophes and reads hyphens as spaces', () => {
    expect(normalizeForSearch("S'il te plaît")).toBe('sil te plait');
    expect(normalizeForSearch('s\u2019il  te')).toBe('sil te');
    expect(normalizeForSearch('Là-bas')).toBe('la bas');
  });

  it('collapses and trims spaces like normalizeText', () => {
    expect(normalizeForSearch('  au   revoir ')).toBe('au revoir');
    expect(normalizeForSearch('Sœur')).toBe('soeur');
  });
});

describe('findQueryRange', () => {
  it('locates the query in the original text, accents and ligatures included', () => {
    expect(findQueryRange('gâteau', 'gat')).toEqual({ start: 0, end: 3 });
    expect(findQueryRange('sœur', 'soe')).toEqual({ start: 0, end: 2 });
    expect(findQueryRange("s'il te plaît", 'sil')).toEqual({ start: 0, end: 4 });
    expect(findQueryRange('là-bas', 'a bas')).toEqual({ start: 1, end: 6 });
  });

  it('is null for an empty or absent query', () => {
    expect(findQueryRange('lapin', ' ')).toBeNull();
    expect(findQueryRange('lapin', 'chat')).toBeNull();
  });
});

describe('matchesQuery', () => {
  it('finds a query anywhere, ignoring accents', () => {
    expect(matchesQuery('gâteau', 'ATE')).toBe(true);
    expect(matchesQuery('lapin', 'chat')).toBe(false);
  });

  it('ignores apostrophes and hyphens', () => {
    expect(matchesQuery("s'il te plaît", 'sil te')).toBe(true);
    expect(matchesQuery('là-bas', 'la bas')).toBe(true);
  });

  it('matches everything with an empty query', () => {
    expect(matchesQuery('lapin', '  ')).toBe(true);
  });
});

describe('rankByQuery', () => {
  /**
   * Dictionary excerpt in its stored order.
   */
  const words = ['lampe', 'salade', 'lapin', 'canard', 'lait'];

  it('puts labels starting with the query before those containing it', () => {
    expect(rankByQuery(words, (word) => word, 'la')).toEqual(['lampe', 'lapin', 'lait', 'salade']);
  });

  it('returns nothing for an empty query', () => {
    expect(rankByQuery(words, (word) => word, '')).toEqual([]);
  });
});

describe('quote', () => {
  it('wraps the text in guillemets held to it by no-break spaces', () => {
    expect(quote('lapin')).toBe('\u00AB\u00A0lapin\u00A0\u00BB');
    expect(quote('a pu ato')).not.toMatch(/« | »/u);
  });
});
