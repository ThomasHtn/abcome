"""Builds the English dictionary seed from the American English CDI (Words and Sentences) published by Wordbank."""
import collections
import csv
import re
import sys

RAW, OUT = sys.argv[1], sys.argv[2]

# Slash entries split into the words a parent would actually type; an empty list drops the item.
SPLITS = {
    'soda/pop': ['soda', 'pop'], 'buttocks/bottom': ['bottom'], 'owie/boo boo': ['owie', 'boo boo'],
    'tissue/kleenex': ['tissue', 'kleenex'], 'shh/shush/hush': ['shh', 'shush', 'hush'],
    'inside/in': ['inside', 'in'], 'did/did ya': ['did'], 'gonna/going to': ['gonna', 'going to'],
    'gotta/got to': ['gotta', 'got to'], 'hafta/have to': ['hafta', 'have to'],
    'lemme/let me': ['lemme', 'let me'], 'need/need to': ['need'], 'try/try to': ['try'],
    'wanna/want to': ['wanna', 'want to'],
    # Placeholders standing for a proper name, which the parent types instead.
    "babysitter's name": [], "child's own name": [], "pet's name": [],
}

# Spelling fixes on the source.
FIXES = {'teddybear': 'teddy bear'}

# Category kept for words listed twice in the instrument, once per meaning.
DUPLICATE_CATEGORY = {
    'chicken': 'animals', 'fish': 'animals', 'orange': 'food_drink', 'water': 'food_drink',
    'drink': 'food_drink', 'clean': 'action_words', 'dry': 'action_words', 'slide': 'outside',
    'swing': 'outside', 'watch': 'action_words', 'work': 'action_words', 'can': 'household',
}

# The CDI calls `locations` what the IFDC, and so the database, calls `prepositions`.
CATEGORY_RENAMES = {'locations': 'prepositions'}

# Number of earliest words flagged as frequent, shown as shortcuts on the add-word screen.
FREQUENT_COUNT = 24


def clean(definition):
    """Definition without its meaning note ("chicken (food)") or its footnote mark ("mommy*")."""
    return re.sub(r'\s*\(.*\)$', '', definition).rstrip('*')


items = [r for r in csv.DictReader(open(f'{RAW}/ws.csv', encoding='utf-8')) if r['type'] == 'word']

# Data columns of the norming sample, named differently from the instrument's item ids.
columns = {r['field']: r['column'] for r in csv.DictReader(open(f'{RAW}/norming_fields.csv', encoding='utf-8'))}
children = list(csv.DictReader(open(f'{RAW}/norming_data.csv', encoding='utf-8')))
young = [row for row in children if int(row['data_age']) <= 20]


def share(rows, column):
    """Share of rows where the child produces the item."""
    return sum(1 for row in rows if row[column].strip() not in ('', '0')) / len(rows)


entries = {}
for item in items:
    column = columns[item['itemID']]
    score = (share(young, column), share(children, column))
    definition = clean(item['definition'])
    for label in SPLITS.get(definition, [definition]):
        label = FIXES.get(label, label)
        category = DUPLICATE_CATEGORY.get(label, CATEGORY_RENAMES.get(item['category'], item['category']))
        previous = entries.get(label)
        if previous is None or previous['category'] != category:
            if previous is None or category == DUPLICATE_CATEGORY.get(label):
                entries[label] = {'label': label, 'category': category, 'score': score}
        else:
            previous['score'] = max(previous['score'], score)

ranked = sorted(entries.values(), key=lambda e: (-e['score'][0], -e['score'][1], e['label']))

# Everyday family words missing from the CDI, ranked after it.
SUPPLEMENT = [('blankie', 'toys'), ('pacifier', 'household')]
ranked += [{'label': label, 'category': category} for label, category in SUPPLEMENT]
with open(OUT, 'w', encoding='utf-8', newline='') as out:
    writer = csv.writer(out)
    writer.writerow(['acquisition_rank', 'label', 'category', 'frequent', 'source'])
    for rank, entry in enumerate(ranked, start=1):
        source = 'cdi' if 'score' in entry else 'custom'
        writer.writerow([rank, entry['label'], entry['category'], str(rank <= FREQUENT_COUNT).lower(), source])

print(len(young), 'children <= 20 months,', len(children), 'in all,', len(ranked), 'entries')
print(collections.Counter(e['category'] for e in ranked))
print('frequent:', ', '.join(e['label'] for e in ranked[:FREQUENT_COUNT]))
