import { saveBlocker, wordNewQuestion } from './word-new.utils';

describe('word-new utils', () => {
  const lapin = { label: 'lapin', category: 'animals', word: null } as const;

  it('asks for the word, then for how the child said it', () => {
    expect(wordNewQuestion(null, false, 'Alix')).toBe('Quel mot Alix a-t-il dit ?');
    expect(wordNewQuestion(lapin, false, 'Alix')).toBe("Super ! Et comment Alix l'a dit ?");
  });

  it('asks nothing more about a word the child already says', () => {
    expect(wordNewQuestion(lapin, true, 'Alix')).toBe('Alix le dit déjà !');
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
