import { wordNewQuestion } from './word-new.utils';

describe('word-new utils', () => {
  it('asks for the word, then for how Côme said it', () => {
    expect(wordNewQuestion(null)).toBe('Quel mot Côme a-t-il dit ?');
    expect(wordNewQuestion({ label: 'lapin', category: 'animals', word: null })).toBe(
      "Super ! Et comment Côme l'a dit ?",
    );
  });
});
