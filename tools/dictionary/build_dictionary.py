"""Builds the Little Words dictionary seed from the IFDC (French CDI) item list published by Wordbank."""
import collections
import csv
import sys

RAW, OUT = sys.argv[1], sys.argv[2]

# Slash entries split into the words a parent would actually type; an empty list drops the item.
SPLITS = {
    'bavoir/bavette': ['bavoir', 'bavette'], 'chausson/pantoufle': ['chausson', 'pantoufle'],
    'culotte/slip': ['culotte', 'slip'], 'rue/route': ['rue', 'route'], 'sous/pièces': [],
    'figure/visage': ['figure', 'visage'], 'pénis/zizi…': ['zizi'], 'vagin/zezette': ['zézette'],
    'copain/e': ['copain', 'copine'], 'maître/sse': ['maître', 'maîtresse'],
    'beau/belle': ['beau', 'belle'], 'blanc/he': ['blanc', 'blanche'], 'bon/ne': ['bon', 'bonne'],
    'bruyant/e': ['bruyant', 'bruyante'], 'chaud/e': ['chaud', 'chaude'],
    'collant/e': ['collant', 'collante'], 'content/e': ['content', 'contente'],
    'coquin/e': ['coquin', 'coquine'], 'dégoutant/e': ['dégoûtant', 'dégoûtante'],
    'dernier/e': ['dernier', 'dernière'], 'doux/ce': ['doux', 'douce'], 'fort/e': ['fort', 'forte'],
    'fou/lle': ['fou', 'folle'], 'gentil/le': ['gentil', 'gentille'], 'grand/e': ['grand', 'grande'],
    'haut/e': ['haut', 'haute'], 'lent/e': ['lent', 'lente'], 'long/ue': ['long', 'longue'],
    'lourd/e': ['lourd', 'lourde'], 'méchant/e': ['méchant', 'méchante'],
    'mignon/e': ['mignon', 'mignonne'], 'neuf/ve': ['neuf', 'neuve'], 'petit/e': ['petit', 'petite'],
    'plein/e': ['plein', 'pleine'], 'premier/ère': ['premier', 'première'], 'sec/he': ['sec', 'sèche'],
    'vert/e': ['vert', 'verte'], 'vieux/vieille': ['vieux', 'vieille'],
    'vilain/e': ['vilain', 'vilaine'], 'faire du vélo/moto': ['faire du vélo'],
    'le/la/les/quelles': ['quel', 'quelle'], 'aucun/e': ['aucun', 'aucune'],
    'du/de la/des': ['du', 'de la', 'des'], 'le/la même': ['même'], 'le/la/les': ['le', 'la', 'les'],
    'plein/beaucoup': ['beaucoup'], 'tous/tout': ['tous', 'tout'], 'un/une': ['un', 'une'],
    'à elle/sa': ['sa'], 'à lui/son': ['son'], 'ils/elles': ['ils', 'elles'],
    'ma/mon/mes': ['ma', 'mon', 'mes'], 'votre/ta/ton': ['ta', 'ton', 'votre'],
    'vous/tu': ['tu', 'vous'],
    # Placeholders standing for a proper name, which the parent types instead.
    "nom de l'animal": [], "nom de l'enfant": [], 'nom de la nounou': [],
}

# Spelling fixes on the source.
FIXES = {'pinguoin': 'pingouin', 'baton': 'bâton', "s'il te plait": "s'il te plaît", 'allo': 'allô', 'aie': 'aïe'}

# Category kept for words listed twice in the instrument.
DUPLICATE_CATEGORY = {
    'eau': 'food_drink', 'goûter': 'food_drink', 'poisson': 'animals', 'dehors': 'places',
    'parc': 'places', 'pot': 'household', 'sucette': 'food_drink', 'orange': 'food_drink',
    'aller': 'action_words', 'faire': 'action_words',
}

# Number of earliest words flagged as frequent, shown as shortcuts on the add-word screen.
FREQUENT_COUNT = 24

items = [r for r in csv.DictReader(open(f'{RAW}/ws.csv', encoding='utf-8')) if r['type'] == 'word']

# Share of children producing each item, among the youngest (16 to 20 months) and among all.
reader = csv.reader(open(f'{RAW}/kern_data.csv', encoding='utf-8', errors='replace'))
header = next(reader)
children = [row for row in reader if row[1].isdigit()]
young = [row for row in children if int(row[1]) <= 20]


def share(rows, column):
    """Share of rows where the child produces the item."""
    return sum(1 for row in rows if row[column].strip() not in ('', '0')) / len(rows)


entries = {}
for item in items:
    column = header.index(item['itemID'])
    score = (share(young, column), share(children, column))
    for label in SPLITS.get(item['definition'], [item['definition']]):
        label = FIXES.get(label, label)
        category = DUPLICATE_CATEGORY.get(label, item['category'])
        previous = entries.get(label)
        if previous is None or previous['category'] != category:
            if previous is None or category == DUPLICATE_CATEGORY.get(label):
                entries[label] = {'label': label, 'category': category, 'score': score}
        else:
            previous['score'] = max(previous['score'], score)

ranked = sorted(entries.values(), key=lambda e: (-e['score'][0], -e['score'][1], e['label']))

# Everyday family words missing from the IFDC, ranked after it.
SUPPLEMENT = [
    ('doudou', 'toys'), ('tétine', 'household'), ('dodo', 'games_routines'),
    ('bisou', 'games_routines'), ('câlin', 'games_routines'), ('papi', 'people'),
    ('mamie', 'people'), ('tata', 'people'), ('tonton', 'people'), ('larme', 'body_parts'),
]
ranked += [{'label': label, 'category': category} for label, category in SUPPLEMENT]
with open(OUT, 'w', encoding='utf-8', newline='') as out:
    writer = csv.writer(out)
    writer.writerow(['acquisition_rank', 'label', 'category', 'frequent', 'source'])
    for rank, entry in enumerate(ranked, start=1):
        source = 'ifdc' if 'score' in entry else 'custom'
        writer.writerow([rank, entry['label'], entry['category'], str(rank <= FREQUENT_COUNT).lower(), source])

print(len(young), 'children <= 20 months,', len(children), 'in all,', len(ranked), 'entries')
print(collections.Counter(e['category'] for e in ranked))
print('frequent:', ', '.join(e['label'] for e in ranked[:FREQUENT_COUNT]))
