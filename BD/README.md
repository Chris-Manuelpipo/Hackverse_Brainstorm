# Twist 1 — Comptabilité simplifiée pour PME africaines

## Le problème

80% des PME africaines n'ont pas de comptable. Le dirigeant gère ses finances sur un cahier, Excel, ou rien du tout. Résultat : aucune visibilité sur la trésorerie réelle, impossible d'obtenir un crédit faute d'historique structuré.

## Solution

Un outil de comptabilité simplifiée pensé pour un entrepreneur sans formation comptable :
- **Multi-devise** (CFA/USD/EUR)
- **Compatible mobile money** (MTN, Orange)
- **Offline-first** : fonctionne sans connexion
- **Bilan exportable** qu'un banquier accepte

## Architecture twist 1

### Hypothèse critique 

> *Une hypothèse de départ tenue pour neutre devient une dépendance destructrice.*

Le système est construit autour d'une hypothèse simple : **saisir facilement entrées et sorties sans jargon comptable**. Mais cette simplicité apparent cache des couches qui se contraignent entre elles :

1. **Preuve** — La transaction confirmée = fait acquis ? Pas toujours.
2. **Gouvernance** — Qui peut déclarer qu'une opération a eu lieu ?
3. **Temporalité** — `date_operation` ≠ `date_saisie` ≠ `date_sync`
4. **Responsabilité** — Le hash assure l'intégrité, mais l'interprétation varie

### Choix d'implémentation

| Choix | Justification |
|-------|---------------|
| `date_operation` comme fait de référence | C'est la date qui compte pour le bilan |
| `montant_xaf` stocké, jamais recalculé | Conserve l'état au moment de la saisie |
| Hash d'intégrité par transaction | Traçabilité ex-post pour l'audit |
| Catégories à double libellé | `libelle_user` ≠ `libelle_bilan` (ce que le dirigeant voit vs ce que le banquier lit) |
| Statut multi-états | `CONFIRME` → `EN_ATTENTE` → `LITIGE` → `ANNULE` |

## Twist 2 — Multi-devise et taux de change variables

### Le problème caché

Les transactions arrivent en CFA, USD et EUR avec **taux variables selon le jour**. Le taux de change au moment de la saisie n'est pas le même que le taux moyen du mois, ni le taux officiel de la banque.

### Hypothèse critique

> *Le taux de change est une donnée objective. En réalité, il n'existe pas de "vrai" taux — seulement des taux selon la source, le moment, et l'usage.*

#### Couches de complexité

1. **Taux du jour** — Taux effectif au moment de l'opération mobile money
2. **Taux moyen mensuel** — Pour la consolidation du bilan mensuel
3. **Taux bancaire** — Ce que la banque utilise pour l'évaluation
4. **Taux historiques** — Pour l'audit rétrospectif (API ECB)

### Problème d'intégrité

Quand `montant_xaf` est stocké à la saisie, il locks-in un taux spécifique. Si le taux change ensuite :
- La transaction est技术上 valide
-Mais le bilan mensuel utilise un autre taux moyen
- L'audit demande le taux du jour exact

**Comment garder les deux cohérents sans recalculer ?**

### Solution implémentée

```sql
-- Le taux appliqué est stocké avec la transaction
taux_applique REAL NOT NULL DEFAULT 1,  -- taux au moment de la saisie
montant_xaf REAL NOT NULL,               -- résultat figé

-- Le taux du jour est dans la table historique
SELECT taux FROM taux_change 
WHERE devise_source = 'USD' AND date_taux = '2026-04-25';

-- Pour le bilan mensuel : recalcul avec taux moyen du mois
SELECT 
    strftime('%Y-%m', date_operation) AS mois,
    AVG(taux_applique) AS taux_moyen_mensuel
FROM transactions 
WHERE devise = 'USD' 
GROUP BY mois;
```

### Source des taux

| Source | Usage | Fiabilité |
|--------|-------|------------|
| API_TEMPS_REEL | Taux ECB temps réel | FIABLE (online) |
| API_CACHE | Dernier taux connu | ACCEPTABLE (offline, < 7 jours) |
| MANUEL | Saisie manuelle | À VÉRIFIER (offline, aucun cache) |

### Hiérarchie de confiance (cas offline)

Quand l'utilisateur est sans internet et saisit une transaction en USD :
1. **Online** → Taux API temps réel → `API_TEMPS_REEL`
2. **Offline, cache < 7 jours** → Dernier taux connu → `API_CACHE`
3. **Offline, pas de cache** → Taux saisi manuellement → `MANUEL`

Le statut de confiance est stocké avec la transaction et visible sur le bilan exporté.

### Modifications du schéma

```sql
--taux_change : niveau de confiance du taux
ALTER TABLE taux_change
    ADD COLUMN IF NOT EXISTS fiabilite TEXT NOT NULL DEFAULT 'MANUEL'
        CHECK(fiabilite IN ('API_TEMPS_REEL', 'API_CACHE', 'MANUEL'));

--transactions : fiabilité du taux utilisé
ALTER TABLE transactions
    ADD COLUMN IF NOT EXISTS taux_fiabilite TEXT NOT NULL DEFAULT 'MANUEL'
        CHECK(taux_fiabilite IN ('API_TEMPS_REEL', 'API_CACHE', 'MANUEL'));
```

### Cohérence multi-périodes

```sql
-- Vue pour le bilan avec taux du jour stocké
CREATE VIEW IF NOT EXISTS v_bilan_tresorie AS
SELECT
    t.date_operation,
    c.groupe_bilan,
    t.type_flux,
    t.montant,
    t.devise,
    t.montant_xaf,
    t.taux_applique AS taux_jour
FROM transactions t
JOIN categories c ON t.categorie_id = c.id
WHERE t.statut = 'CONFIRME';

-- Vue pour comparaison avec taux moyen
CREATE VIEW IF NOT EXISTS v_bilan_taux_moyen AS
SELECT
    strftime('%Y-%m', date_operation) AS mois,
    SUM(montant_xaf) AS total_xaf,
    AVG(taux_applique) AS taux_moyen
FROM transactions
WHERE devise = 'USD' AND statut = 'CONFIRME'
GROUP BY mois;
```

### Ce qui est définitivement perdu

- Le taux "vrai" n'existe pas — seulement des approximations selon l'usage
- Recalculer `montant_xaf` détruirait la traçabilité d'audit
- Garder les deux (taux jour + taux moyen) nécessite une autre table

## Twist 3 — Preuves : photos, SMS, notes vocales

### Le problème caché

Les preuves sont des **reçus photo, captures SMS de mobile money, et notes vocales**. Mais une image n'est pas une preuve — c'est une interprétation de pixels qui attend d'être lue.

### Hypothèse critique

> *La pièce jointe confirme la transaction. En réalité, OCR et transcription sont eux-mêmes des transactions qui peuvent être fausses, incomplètes, ou requalifiées.*

#### Couches de complexité

1. **Image/PDF/SMS** — Fichier brut, stocké localement
2. **OCR** — Extrait automatique (montant, référence, date, opérateur)
3. **Transcription** — Pour les notes vocales en audio
4. **Validation** — L'extrait OCR核对 la transaction ?

### Le piège

L'OCR donne un résultat → mais ce résultat est lui-même une "transaction" qui peut être fausse. Si l'OCR mauvais lit "50 000" au lieu de "500 000", le bilan est faussé. Mais le hash de la transaction est correct → contradiction.

### Solution implémentée

```sql
--表 pieces_jointes : types de fichiers étendue
ALTER TABLE pieces_jointes 
    ADD CONSTRAINT pieces_jointes_type_fichier_check
    CHECK (type_fichier IN ('IMAGE', 'PDF', 'SMS_SCREENSHOT', 'AUDIO'));

-- Transcription pour audio
ALTER TABLE pieces_jointes 
    ADD COLUMN IF NOT EXISTS transcription TEXT;
    
ALTER TABLE pieces_jointes
    ADD COLUMN IF NOT EXISTS transcription_statut TEXT 
        CHECK (transcription_statut IN ('EN_ATTENTE', 'FAITE', 'ECHEC'));

-- ocr_extrait原有的结构
-- ocr_extrait: { montant, reference, date, operateur }
-- ocr_statut: 'EN_ATTENTE' | 'TRAITE' | 'ECHEC'
```

### Traçabilité OCR → Transaction

```sql
--Vue :核对 OCR vs transaction
CREATE VIEW IF NOT EXISTS v_pieces_jointes_ocr AS
SELECT
    pj.id AS pj_id,
    pj.transaction_id,
    pj.ocr_extrait,
    pj.ocr_statut,
    t.montant AS tx_montant,
    t.reference_externe AS tx_reference,
    CASE 
        WHEN pj.ocr_extrait IS NULL THEN 'OCR_MANQUANT'
        WHEN json_extract(pj.ocr_extrait, '$.montant') = CAST(t.montant AS TEXT) THEN 'OCR_OK'
        ELSE 'OCR_DIFFERENT'
    END AS ocr_match
FROM pieces_jointes pj
JOIN transactions t ON pj.transaction_id = t.id;
```

### Ce qu'on perd définitivement

- L'OCR n'est pas une preuve — c'est une autre couche d'interprétation
- La transcription audio peut être erronée
- Vérifier OCR ne garantit pas la réalité de la transaction

## Schéma de base de données

### Tables principales

- **`devises`** — XAF, USD, EUR
- **`taux_change`** — Historique des taux (API ECB)
- **`categories`** — Catégories avec double libellé (user vs bilan)
- **`comptes`** — Caisse, Banque, Mobile Money
- **`transactions`** — Flux financiers avec intégrité
- **`pieces_jointes`** — Preuves (images, PDF, screenshots SMS)
- **`sync_log`** — Traçabilité offline/sync

### Vues

- **`v_tresorerie_mensuelle`** — Synthèse mensuelle par catégorie
- **`v_solde_comptes`** — Solde courant par compte

## Format de données

### Transactions

```sql
-- Exemple d'entrée
INSERT INTO transactions (
    id, type_flux, montant, devise, montant_xaf, taux_applique,
    categorie_id, compte_id, tiers_nom, reference_externe,
    date_operation, date_saisie, source_saisie, hash
) VALUES (
    'uuid', 'ENTREE', 500000, 'XAF', 500000, 1,
    1, 'uuid-compte', 'Client Alpha', 'FAC-2026-001',
    '2026-04-25', '2026-04-25T10:30:00', 'MOBILE_MONEY_WEBHOOK',
    'sha256(...)'
);
```

### Export bilan

```sql
SELECT * FROM exports_bilan 
WHERE periode_debut = '2026-01-01' AND periode_fin = '2026-06-30';
```

## Twist 2 — Multi-devise et taux de change variables

### Le problème caché

Les transactions arrivent en CFA, USD et EUR avec **taux variables selon le jour**. Le taux de change au moment de la saisie n'est pas le même que le taux moyen du mois, ni le taux officiel de la banque.

### Hypothèse critique

> *Le taux de change est une donnée objective. En réalité, il n'existe pas de "vrai" taux — seulement des taux selon la source, le moment, et l'usage.*

#### Couches de complexité

1. **Taux du jour** — Taux effectif au moment de l'opération mobile money
2. **Taux moyen mensuel** — Pour la consolidation du bilan mensuel
3. **Taux bancaire** — Ce que la banque utilise pour l'évaluation
4. **Taux historiques** — Pour l'audit rétrospectif (API ECB)

### Problème d'intégrité

Quand `montant_xaf` est stocké à la saisie, il locks-in un taux spécifique. Si le taux change ensuite :
- La transaction est技术上 valide
-Mais le bilan mensuel utilise un autre taux moyen
- L'audit demande le taux du jour exact

**Comment garder les deux cohérents sans recalculer ?**

### Solution implémentée

```sql
-- Le taux appliqué est stocké avec la transaction
taux_applique REAL NOT NULL DEFAULT 1,  -- taux au moment de la saisie
montant_xaf REAL NOT NULL,               -- résultat figé

-- Le taux du jour est dans la table historique
SELECT taux FROM taux_change 
WHERE devise_source = 'USD' AND date_taux = '2026-04-25';

-- Pour le bilan mensuel : recalcul avec taux moyen du mois
SELECT 
    strftime('%Y-%m', date_operation) AS mois,
    AVG(taux_applique) AS taux_moyen_mensuel
FROM transactions 
WHERE devise = 'USD' 
GROUP BY mois;
```

### Source des taux

| Source | Usage | Fiabilité |
|--------|-------|------------|
| API_TEMPS_REEL | Taux ECB temps réel | FIABLE (online) |
| API_CACHE | Dernier taux connu | ACCEPTABLE (offline, < 7 jours) |
| MANUEL | Saisie manuelle | À VÉRIFIER (offline, aucun cache) |

### Hiérarchie de confiance (cas offline)

Quand l'utilisateur est sans internet et saisit une transaction en USD :
1. **Online** → Taux API temps réel → `API_TEMPS_REEL`
2. **Offline, cache < 7 jours** → Dernier taux connu → `API_CACHE`
3. **Offline, pas de cache** → Taux saisi manuellement → `MANUEL`

Le statut de confiance est stocké avec la transaction et visible sur le bilan exporté.

### Modifications du schéma

```sql
--taux_change : niveau de confiance du taux
ALTER TABLE taux_change
    ADD COLUMN IF NOT EXISTS fiabilite TEXT NOT NULL DEFAULT 'MANUEL'
        CHECK(fiabilite IN ('API_TEMPS_REEL', 'API_CACHE', 'MANUEL'));

--transactions : fiabilité du taux utilisé
ALTER TABLE transactions
    ADD COLUMN IF NOT EXISTS taux_fiabilite TEXT NOT NULL DEFAULT 'MANUEL'
        CHECK(taux_fiabilite IN ('API_TEMPS_REEL', 'API_CACHE', 'MANUEL'));
```

### Cohérence multi-périodes

```sql
-- Vue pour le bilan avec taux du jour stocké
CREATE VIEW IF NOT EXISTS v_bilan_tresorie AS
SELECT
    t.date_operation,
    c.groupe_bilan,
    t.type_flux,
    t.montant,
    t.devise,
    t.montant_xaf,
    t.taux_applique AS taux_jour
FROM transactions t
JOIN categories c ON t.categorie_id = c.id
WHERE t.statut = 'CONFIRME';

-- Vue pour comparaison avec taux moyen
CREATE VIEW IF NOT EXISTS v_bilan_taux_moyen AS
SELECT
    strftime('%Y-%m', date_operation) AS mois,
    SUM(montant_xaf) AS total_xaf,
    AVG(taux_applique) AS taux_moyen
FROM transactions
WHERE devise = 'USD' AND statut = 'CONFIRME'
GROUP BY mois;
```

### Ce qui est définitivement perdu

- Le taux "vrai" n'existe pas — seulement des approximations selon l'usage
- Recalculer `montant_xaf` détruirait la traçabilité d'audit
- Garder les deux (taux jour + taux moyen) nécessite une autre table

## Schéma de base de données

### Tables principales

- **`devises`** — XAF, USD, EUR
- **`taux_change`** — Historique des taux (API ECB)
- **`categories`** — Catégories avec double libellé (user vs bilan)
- **`comptes`** — Caisse, Banque, Mobile Money
- **`transactions`** — Flux financiers avec intégrité
- **`pieces_jointes`** — Preuves (images, PDF, screenshots SMS)
- **`sync_log`** — Traçabilité offline/sync

### Vues

- **`v_tresorerie_mensuelle`** — Synthèse mensuelle par catégorie
- **`v_solde_comptes`** — Solde courant par compte

## Format de données

### Transactions

```sql
-- Exemple d'entrée
INSERT INTO transactions (
    id, type_flux, montant, devise, montant_xaf, taux_applique,
    categorie_id, compte_id, tiers_nom, reference_externe,
    date_operation, date_saisie, source_saisie, hash
) VALUES (
    'uuid', 'ENTREE', 500000, 'XAF', 500000, 1,
    1, 'uuid-compte', 'Client Alpha', 'FAC-2026-001',
    '2026-04-25', '2026-04-25T10:30:00', 'MOBILE_MONEY_WEBHOOK',
    'sha256(...)'
);
```

### Export bilan

```sql
SELECT * FROM exports_bilan 
WHERE periode_debut = '2026-01-01' AND periode_fin = '2026-06-30';
```



<!-- TWIST 3 -->