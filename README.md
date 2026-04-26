# PMECompta

Application web de gestion de tresorerie pour PME (React + FastAPI).

## Apercu

```
/frontend     - Application React Web (Vite)
/backend      - API FastAPI (Python)
/mobile      - Application React Native (Expo)
```

## Prerequis

- Node.js 18+
- npm 9+
- Python 3.11

## Demarrage local

Lancer backend et frontend dans 2 terminaux separes.

### 1) Backend (FastAPI)

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python init_db.py
mkdir -p uploads
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

API disponible sur `http://localhost:8000`.
Documentation OpenAPI: `http://localhost:8000/docs`.

### 2) Frontend (React)

```bash
cd frontend
npm install
```

<<<<<<< HEAD
### Mobile (Expo)

```bash
cd mobile
npm install
npx expo start
```

Scan le QR code avec l'app Expo Go sur mobile.

## API

L'API partagee est dans `mobile/src/services/api.ts` - meme endpoint que le frontend web.

## Variables d'environment

### Frontend (`frontend/.env`)
=======
Creer `frontend/.env`:
>>>>>>> 6e8f388 (fix page reports)

```env
VITE_API_URL=http://localhost:8000/api
```

<<<<<<< HEAD
### Backend (`backend/.env`)

```env
FRONTEND_URL=http://localhost:5173
```

## Pages Mobile

- **Accueil** - Dashboard avec soldes et transactions
- **Comptes** - Gestion des comptes
- **+ Transaction** - Nouvelle transaction

## Build Mobile
=======
Puis lancer:
>>>>>>> 6e8f388 (fix page reports)

```bash
npm run dev
```

<<<<<<< HEAD
=======
Frontend disponible sur `http://localhost:5173`.

## Variables d'environnement

### Frontend (`frontend/.env`)

- `VITE_API_URL`: URL de base de l'API (ex: `http://localhost:8000/api`).

### Backend (`backend/.env.example`)

Variables documentees pour le deploiement:
- `FRONTEND_URL`
- `DATABASE_URL` (PostgreSQL en production)
- `CORS_ALLOW_ORIGIN_REGEX`

Note importante:
- Le code actuel utilise SQLite en dur dans `backend/database.py`.
- Le CORS est configure directement dans `backend/main.py`.
- Ces variables sont donc surtout utiles pour la cible de deploiement actuelle, mais pas encore pleinement branchees dans le code.

## Base de donnees

- Base locale par defaut: `backend/database.sqlite`.
- Initialisation: `python init_db.py` (a executer depuis le dossier `backend/`).
- Scripts de migration disponibles:
  - `python migrate_db.py`
  - `python migrate_shared.py`
  - `python migrate_decision.py`

## Endpoints API disponibles

Base URL: `/api`

- `GET /accounts`
- `POST /accounts`
- `GET /accounts/{account_id}/balance`
- `DELETE /accounts/{account_id}`
- `GET /categories`
- `POST /categories`
- `GET /transactions`
- `POST /transactions`
- `POST /transactions/{tx_id}/cancel`
- `POST /transactions/{tx_id}/attachments`
- `GET /settings/{key}`
- `POST /settings/{key}`
- `GET /reports/cashflow`
- `GET /reports/dashboard`
- `POST /reports/share`
- `GET /public/reports/{token}`
- `GET /public/reports/{token}/pdf`
- `GET /public/attachments/{token}/{attachment_id}`
- `POST /sync/push`
- `GET /sync/pull`

>>>>>>> 6e8f388 (fix page reports)
## Deploiement

### 1) Backend sur Render

<<<<<<< HEAD
Le repo contient deja `render.yaml` a la racine pour un deploy via Blueprint.

1. Push le projet sur GitHub.
2. Dans Render: New + > Blueprint, puis selectionne ton repo.
3. Render va creer le service `pmecompta-backend` avec:
- Root Directory: `backend`
- Build Command: `pip install -r requirements.txt`
- Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. Configure les variables:
- `FRONTEND_URL=https://<ton-projet>.vercel.app`
- `DATABASE_URL` (optionnel mais recommande: PostgreSQL Render)
5. Teste: `https://<ton-service>.onrender.com/health`

### 2) Frontend sur Vercel

Le repo contient `frontend/vercel.json` pour gerer les routes React en SPA.

1. Dans Vercel: Add New > Project, puis selectionne le meme repo.
2. Configure:
- Root Directory: `frontend`
- Build Command: `npm run build`
- Output Directory: `dist`
3. Ajoute la variable d'environnement:
- `VITE_API_URL=https://<ton-service-render>.onrender.com/api`
4. Deploy.

### 3) Lier les deux

1. Copie l'URL Vercel finale et mets-la dans `FRONTEND_URL` sur Render.
2. Redeploie le backend Render.
3. Verifie qu'un appel depuis le frontend vers l'API fonctionne.

Note: SQLite fonctionne pour demo/tests, mais en production il vaut mieux utiliser PostgreSQL sur Render via `DATABASE_URL`.
=======
Le fichier `render.yaml` est deja present.

1. Push le repo sur GitHub.
2. Dans Render, creer un service via Blueprint.
3. Render lit automatiquement:
   - `rootDir: backend`
   - `buildCommand: pip install -r requirements.txt`
   - `startCommand: uvicorn main:app --host 0.0.0.0 --port $PORT`
4. Configurer les variables d'environnement Render:
   - `FRONTEND_URL`
   - `DATABASE_URL` (optionnel tant que SQLite est utilise)
   - `CORS_ALLOW_ORIGIN_REGEX`
5. Verifier le service avec `https://<service>.onrender.com/docs`.

### 2) Frontend sur Vercel

Le fichier `frontend/vercel.json` gere le fallback SPA.

1. Importer le repo dans Vercel.
2. Configurer:
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `dist`
3. Ajouter la variable:
   - `VITE_API_URL=https://<service-render>.onrender.com/api`
4. Deployer.

### 3) Relier frontend et backend

- Mettre l'URL frontend finale dans la config backend/CORS si necessaire.
- Redeployer le backend si vous modifiez la config CORS.

## Limitations connues

- Le dossier `mobile/` mentionne dans l'ancien README n'existe pas dans ce depot.
- L'authentification actuelle est simulee cote frontend (localStorage), sans API auth active.
- Certaines routes declarees dans `frontend/src/services/apiRoutes.js` (ex: `PUT`/`GET` detail sur comptes/categories/transactions) ne sont pas implementees dans `backend/main.py`.
- L'export PDF depend de `reportlab` (a installer si besoin: `pip install reportlab`).
>>>>>>> 6e8f388 (fix page reports)

## License

MIT
