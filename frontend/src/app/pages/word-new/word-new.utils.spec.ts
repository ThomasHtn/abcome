import { saveBlocker, wordNewQuestion } from './word-new.utils';

describe('word-new utils', () => {
  const lapin = { label: 'lapin', category: 'animals', word: null } as const;

  it('asks for the word, then for how Côme said it', () => {
    expect(wordNewQuestion(null, false)).toBe('Quel mot Côme a-t-il dit ?');
    expect(wordNewQuestion(lapin, false)).toBe("Super ! Et comment Côme l'a dit ?");
  });

  it('asks nothing more about a word Côme already says', () => {
    expect(wordNewQuestion(lapin, true)).toBe('Côme le dit déjà !');
  });

  it('names what blocks the save: the spoken form first, then the day', () => {
    const today = '2026-10-18';
    expect(saveBlocker({ spoken: ' ', status: 'almost', date: '' }, today)).toBe(
      "Note d'abord comment il le dit",
    );
    expect(saveBlocker({ spoken: 'pin', status: 'almost', date: '' }, today)).toBe(
      "Choisis d'abord le jour",
    );
    expect(saveBlocker({ spoken: 'pin', status: 'almost', date: '2026-10-19' }, today)).toBe(
      "Choisis d'abord le jour",
    );
  });
});
