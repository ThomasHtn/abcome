# Word dictionary

`dictionary.csv` seeds the `dictionary_entry` table through a Flyway migration and feeds the add-word suggestions.

Based on the IFDC (French CDI by Sophie Kern, Words and Sentences form), data from [Wordbank](https://wordbank.stanford.edu) under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

## Changes from the source

- Slash items split (`beau/belle` gives `beau` and `belle`).
- Proper name placeholders removed, spelling fixed.
- A word listed twice keeps one category.
- 10 everyday words added, with `source` = `abcome` (`doudou`, `tétine`, `dodo`...).

## Columns

| Column | Meaning |
|---|---|
| `acquisition_rank` | Order in which children say the word |
| `label` | The word as shown |
| `category` | IFDC category code |
| `frequent` | `true` for the 24 earliest words, offered as shortcuts |
| `source` | `ifdc` or `abcome` |

## Regenerating

```bash
python3 -I docs/dictionary/build_dictionary.py <folder with ws.csv and kern_data.csv> docs/dictionary/dictionary.csv
```

Then add a new Flyway migration with the differences.
