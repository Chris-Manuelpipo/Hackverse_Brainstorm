#!/usr/bin/env python3
"""Script to initialize PostgreSQL database with required tables."""
import os
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

DB_URL = os.getenv("DATABASE_URL")
if not DB_URL:
    print("DATABASE_URL not set")
    exit(1)

print(f"Connecting to {DB_URL.split('@')[1].split('/')[0]}...")

conn = psycopg2.connect(DB_URL)
conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
cursor = conn.cursor()

# Create tables
tables_sql = """
-- Devises
CREATE TABLE IF NOT EXISTS devises (
    code VARCHAR(3) PRIMARY KEY,
    nom TEXT NOT NULL,
    symbole TEXT NOT NULL,
    actif INTEGER NOT NULL DEFAULT 1
);

-- Categories
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    libelle_user TEXT NOT NULL,
    libelle_bilan TEXT NOT NULL,
    type_flux TEXT NOT NULL,
    groupe_bilan TEXT NOT NULL,
    icone TEXT,
    actif INTEGER NOT NULL DEFAULT 1
);

-- Comptes (Accounts)
CREATE TABLE IF NOT EXISTS comptes (
    id TEXT PRIMARY KEY,
    nom TEXT NOT NULL,
    type_compte TEXT NOT NULL,
    operateur TEXT,
    devise VARCHAR(3) REFERENCES devises(code) DEFAULT 'XAF',
    solaire_initial NUMERIC(18,2) DEFAULT 0,
    date_ouverture TEXT NOT NULL,
    actif INTEGER NOT NULL DEFAULT 1,
    note TEXT
);

-- Transactions
CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    type_flux TEXT NOT NULL,
    montant NUMERIC(18,2) NOT NULL,
    devise VARCHAR(3) REFERENCES devises(code),
    montant_xaf NUMERIC(18,2) NOT NULL,
    taux_applique NUMERIC(18,6) DEFAULT 1,
    categorie_id INTEGER REFERENCES categories(id),
    compte_id TEXT REFERENCES comptes(id),
    tiers_nom TEXT,
    reference_externe TEXT,
    date_operation TEXT NOT NULL,
    date_saisie TEXT NOT NULL,
    date_sync TEXT,
    statut TEXT DEFAULT 'CONFIRME',
    source_saisie TEXT DEFAULT 'MANUEL',
    correction_de TEXT REFERENCES transactions(id),
    parent_id TEXT REFERENCES transactions(id),
    note TEXT,
    hash TEXT NOT NULL
);

-- Pieces jointes
CREATE TABLE IF NOT EXISTS pieces_jointes (
    id TEXT PRIMARY KEY,
    transaction_id TEXT REFERENCES transactions(id),
    type_fichier TEXT NOT NULL,
    chemin_local TEXT NOT NULL,
    chemin_cloud TEXT,
    date_ajout TEXT NOT NULL,
    taille_octets INTEGER,
    ocr_extrait TEXT,
    ocr_statut TEXT
);

-- Rapprochements
CREATE TABLE IF NOT EXISTS rapprochements (
    id TEXT PRIMARY KEY,
    transaction_id TEXT REFERENCES transactions(id),
    reference_interne TEXT NOT NULL,
    montant NUMERIC(18,2) NOT NULL,
    date_creation TEXT NOT NULL
);

-- Shared reports
CREATE TABLE IF NOT EXISTS shared_reports (
    token TEXT PRIMARY KEY,
    report_type TEXT NOT NULL,
    created_at TEXT NOT NULL,
    expires_at TEXT,
    is_active INTEGER DEFAULT 1
);
"""

print("Creating tables...")
cursor.execute(tables_sql)
conn.commit()

# Insert default data
insert_sql = """
-- Insert default currencies
INSERT INTO devises (code, nom, symbole) VALUES 
    ('XAF', 'Franc CFA', 'FCFA'),
    ('USD', 'Dollar US', '$'),
    ('EUR', 'Euro', '€')
ON CONFLICT (code) DO NOTHING;

-- Insert default categories
INSERT INTO categories (code, libelle_user, libelle_bilan, type_flux, groupe_bilan, icone) VALUES
    ('VENTE_CLIENT', 'Vente / Recette client', 'Chiffre d''affaires', 'ENTREE', 'CHIFFRE_AFFAIRES', '💰'),
    ('ACHAT_MARCHANDISE', 'Achat marchandise / Stock', 'Achats de biens', 'SORTIE', 'ACHATS_CHARGES_EXPLOITATION', '🛒'),
    ('CHARGE_PERSONNEL', 'Salaire versé', 'Charges de personnel', 'SORTIE', 'CHARGES_PERSONNEL', '👤'),
    ('CHARGE_LOYER', 'Loyer / Local', 'Charges externes — loyer', 'SORTIE', 'CHARGES_EXTERNES', '🏠'),
    ('CHARGE_TRANSPORT', 'Transport / Livraison', 'Charges externes — transport', 'SORTIE', 'CHARGES_EXTERNES', '🚚'),
    ('REMBOURSEMENT_DETTE', 'Remboursement emprunt', 'Flux de financement — sortie', 'SORTIE', 'FLUX_FINANCEMENT', '🏦'),
    ('EMPRUNT_RECU', 'Prêt / Crédit reçu', 'Flux de financement — entrée', 'ENTREE', 'FLUX_FINANCEMENT', '📥'),
    ('APPORT_DIRIGEANT', 'Dépôt personnel du dirigeant', 'Apport en capital', 'ENTREE', 'FLUX_CAPITAL', '🔼'),
    ('RETRAIT_DIRIGEANT', 'Retrait personnel du dirigeant', 'Retrait de capital', 'SORTIE', 'FLUX_CAPITAL', '🔽'),
    ('AUTRE_ENTREE', 'Autre entrée', 'Produits divers', 'ENTREE', 'PRODUITS_DIVERS', '➕'),
    ('AUTRE_SORTIE', 'Autre sortie', 'Charges diverses', 'SORTIE', 'CHARGES_DIVERSES', '➖')
ON CONFLICT (code) DO NOTHING;
"""
print("Inserting default data...")
cursor.execute(insert_sql)
conn.commit()

# Verify
cursor.execute("SELECT COUNT(*) FROM categories")
cat_count = cursor.fetchone()[0]
cursor.execute("SELECT COUNT(*) FROM devises")
dev_count = cursor.fetchone()[0]

print(f"✓ Created tables: {dev_count} devises, {cat_count} categories")

cursor.close()
conn.close()
print("Database initialized successfully!")