# Word dictionary

One list of first words per interface language, behind the add-word suggestions: `GET /api/dictionary?language=fr|en`. Each CSV seeds the `dictionary_entry` table through a Flyway migration.

| File | Language | Source | Seeded by |
|---|---|---|---|
| `dictionary.csv` | French | IFDC (French CDI by Sophie Kern, Words and Sentences form) | `V2__seed_dictionary.sql` |
| `dictionary_en.csv` | English | American English CDI (MacArthur-Bates, Words and Sentences form, norming sample) | `V10__seed_english_dictionary.sql` |

The comments of those two migrations still name this folder's former path, `docs/dictionary/`: an applied migration is never edited.

Data from [Wordbank](https://wordbank.stanford.edu) under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). A word added to the notebook takes its category from either list, French first.

## Changes from the sources

- Slash items split (`beau/belle` gives `beau` and `belle`, `soda/pop` gives `soda` and `pop`).
- Meaning notes and footnote marks removed (`chicken (animal)`, `mommy*`).
- Proper name placeholders removed, spelling fixed.
- A word listed twice keeps one category.
- The CDI `locations` category is stored as `prepositions`, its IFDC name.
- Everyday words added, with `source` = `custom`: 10 in French (`doudou`, `tétine`, `dodo`...), 2 in English (`blankie`, `pacifier`).

## Columns

| Column | Meaning |
|---|---|
| `acquisition_rank` | Order in which children say the word: share of 16 to 20 month olds producing it, then of all children |
| `label` | The word as shown |
| `category` | CDI category code |
| `frequent` | `true` for the 24 earliest words, offered as shortcuts |
| `source` | `ifdc`, `cdi` or `custom` |

## Regenerating

```bash
python3 -I tools/dictionary/build_dictionary.py <folder with ws.csv and kern_data.csv> tools/dictionary/dictionary.csv
python3 -I tools/dictionary/build_dictionary_en.py <folder with ws.csv, norming_data.csv and norming_fields.csv> tools/dictionary/dictionary_en.csv
```

The English inputs are `[English_WS].csv` and `EnglishWS_Marchman_Norming_{data,fields}.csv` from `raw_data/English_American_WS/` in the [Wordbank repository](https://github.com/langcog/wordbank). Then add a new Flyway migration with the differences.
