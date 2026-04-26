# PMECompta - Gestion de Tresorerie pour PME

Application web et mobile de gestion de tresorerie pour les petites et moyennes entreprises.

## Projets

```
/frontend     - Application React Web (Vite)
/backend      - API FastAPI (Python)
/mobile      - Application React Native (Expo)
```

## Installation

### Frontend Web

```bash
cd frontend
npm install
npm run dev
```

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

```env
VITE_API_URL=http://localhost:8000/api
```

### Backend (`backend/.env`)

```env
FRONTEND_URL=http://localhost:5173
```

## Pages Mobile

- **Accueil** - Dashboard avec soldes et transactions
- **Comptes** - Gestion des comptes
- **+ Transaction** - Nouvelle transaction

## Build Mobile

```bash
cd mobile
npx expo prebuild
npx expo run:ios    # ou run:android
```

## Deploiement

### 1) Backend sur Render

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

## License

MIT
