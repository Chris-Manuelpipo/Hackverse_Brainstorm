import psycopg2
import csv
import hashlib
from datetime import datetime

DATABASE_URL = 'postgresql://pme_user:6rp9nib6evfMfeowoJEYbX1wxmH3zEU5@dpg-d7mh81a8qa3s739nkfjg-a.ohio-postgres.render.com/pme_compta'

cat_map = {
    'Subvention': 24,
    'Prestation service': 25,
    'Vente produit': 1,
    'Commission': 26,
    'Remboursement': 27,
    'Salaires': 3,
    'Loyer': 4,
    'Transport': 5,
    'Frais bancaires': 11,
    'Telecom': 11,
    'Impot': 11,
    'Marketing': 11,
    'Maintenance': 11,
    'Stock/Achats': 2,
    'Divers': 11,
}

main_account_id = '34bca7f4-7a9d-40d1-b108-d65d84d6758e'

def generate_hash(tx_id, date_op, montant, tiers):
    content = tx_id + '|' + date_op + '|' + str(montant) + '|' + tiers
    return hashlib.sha256(content.encode()).hexdigest()[:16]

conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor()

print('Importing transactions...')
inserted = 0
errors = 0

with open('../transactions_pme.csv', 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        try:
            tx_id = row['tx_id']
            date_op = row['date']
            categorie = row['categorie']
            montant_devise = float(row['montant_devise_origine'])
            devise = row['devise_origine']
            montant_xof = float(row['montant_xof'])
            taux = float(row['taux_change_applique'])
            type_flux = 'ENTREE' if row['type'] == 'recette' else 'SORTIE'
            tiers = row['pme_nom']
            reference = row['reference']
            note = row.get('note', '') or ''
            
            cat_id = cat_map.get(categorie, 1)
            
            if devise == 'XAF':
                montant = montant_devise
                montant_xaf = montant_devise
                taux_app = 1.0
            else:
                montant = montant_devise
                montant_xaf = montant_xof
                taux_app = taux
            
            tx_hash = generate_hash(tx_id, date_op, str(montant_xaf), tiers)
            
            cur.execute('''INSERT INTO transactions 
                (id, type_flux, montant, devise, montant_xaf, taux_applique, categorie_id, compte_id, 
                 tiers_nom, reference_externe, date_operation, date_saisie, statut, source_saisie, note, hash)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO NOTHING''',
                (tx_id, type_flux, montant, devise, montant_xaf, taux_app, cat_id, main_account_id,
                 tiers, reference, date_op, datetime.now().strftime('%Y-%m-%d'), 'CONFIRME', 'IMPORT', note, tx_hash))
            
            inserted += 1
            
            if inserted % 100 == 0:
                conn.commit()
                print('Inserted ' + str(inserted) + '...')                
        except Exception as e:
            errors += 1
            print('Error: ' + str(e))

conn.commit()

print('Import complete: ' + str(inserted) + ' inserted, ' + str(errors) + ' errors')

print('Adding exchange rates...')

with open('../taux_change_historiques.csv', 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        try:
            date = row['date']
            usd_eur = float(row['USD_EUR'])
            xof_eur = float(row['XOF_EUR'])
            usd_xof = float(row['USD_XOF'])
            
            cur.execute('''INSERT INTO taux_change (date, usd_eur, xof_eur, usd_xof)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (date) DO NOTHING''',
                (date, usd_eur, xof_eur, usd_xof))
        except Exception as e:
            print('Error rate: ' + str(e))

conn.commit()

cur.execute('SELECT COUNT(*) FROM transactions;')
print('Total transactions: ' + str(cur.fetchone()[0]))

cur.execute('SELECT COUNT(*) FROM taux_change;')
print('Total exchange rates: ' + str(cur.fetchone()[0]))

conn.close()
print('Done!')