# Agents — Location Moulinet

## Stack technique

- **Framework** : Next.js 16.2.2 — App Router, Server Components + Client Components
- **Base de données** : Supabase (PostgreSQL). Lire `BUSINESS_RULES.md §Accès base de données`.
- **CSS** : Tailwind CSS v4. Couleurs custom dans `@theme` (blue-primary, blue-dark, blue-light).
- **Langage** : TypeScript strict.

## Règles métier

Toujours consulter `BUSINESS_RULES.md` avant d'implémenter ou de tester. Ce fichier est la source de vérité du domaine.

---

## Workflow

```
User → [Agent DEV] → Handoff → [Agent QA] → Rapport → (si réserves) → [Agent DEV]
```

### Comment activer un agent

Au début de chaque message, l'utilisateur précise le mode :

- `MODE DEV : <description de la tâche>` → l'agent applique les règles DEV ci-dessous
- `MODE QA : <handoff ou description>` → l'agent applique `TEST_PROTOCOL.md`

Sans précision de mode, l'agent se comporte comme DEV par défaut.

---

## Agent DEV

**Responsabilités** : implémenter uniquement ce qui est demandé. Pas de refactoring non sollicité, pas de features bonus.

**Contraintes** :
- Ne pas modifier les fichiers `TEST_PROTOCOL.md`, `reports/`, `BUSINESS_RULES.md`
- Respecter les conventions de `BUSINESS_RULES.md` (encodage, accès DB, style)
- Pour les requêtes SQL avec des enums : toujours caster `field::text`
- Pour les dates en composants client : jamais `toISOString().slice(0,10)` — utiliser `getFullYear()/getMonth()/getDate()`
- Pas d'entités HTML dans le JSX — UTF-8 direct uniquement
- Pas de composants React définis à l'intérieur d'autres composants
- **Jamais d'erreur silencieuse** : un `catch` vide ou qui ne fait qu'un commentaire ("non-bloquant") est interdit, même pour une action best-effort qu'on ne veut pas bloquante. Il faut toujours au minimum `console.error`/`console.warn` avec le contexte (quelle action, quel id), et si l'action a une UI, remonter un message exploitable jusqu'à l'utilisateur (ex. `warnings: string[]` retourné par la server action, affiché dans le composant). Ne jamais imbriquer une action best-effort B à l'intérieur du `try` d'une action A non liée : un échec de A ne doit pas empêcher B d'être tentée — chaque action indépendante a son propre `try/catch`. (Cf. bug réel : bail Google Drive cassé pour un nom avec apostrophe → webhook Docusign et brouillon Gmail jamais exécutés car imbriqués dans le même `try`, sans aucun message d'erreur.)

**Tests obligatoires** — pour chaque modification de code (pas uniquement les nouvelles features) :
- Identifier les fonctions pures et composants client impactés
- Créer ou mettre à jour le fichier de test colocalisé dans `src/`
- Couvrir : happy path, cas limites, interactions utilisateur, messages d'erreur
- Exécuter `npm run test:coverage` — tous les tests doivent passer avant de livrer
- Stack : Vitest + React Testing Library + user-event (voir `vitest.config.ts`)
- **Performance** : si le fichier de test ne rend aucun composant React (pas d'appel à `render()`/`@testing-library/react` — fonctions pures, constantes, logique de requête), ajouter `// @vitest-environment node` en toute première ligne du fichier. Ça évite le coût de démarrage de jsdom, inutile sans rendu DOM. Dès qu'un test appelle `render()`, laisser l'environnement par défaut (`jsdom`, défini dans `vitest.config.ts`) — ne pas ajouter ce commentaire dans ce cas.
- **Toujours afficher en fin de réponse** :
  1. Le récap des tests (N passés / N échoués / durée)
  2. Le tableau de couverture par fichier (% Stmts / Branch / Funcs / Lines + lignes non couvertes)

**En fin de tâche**, produire obligatoirement un bloc Handoff :

```
## Handoff QA
- Feature : [nom court]
- Fichiers modifiés : [liste avec chemins]
- Comportement attendu : [description précise]
- Cas limites à vérifier : [liste]
- Règles métier impliquées : BUSINESS_RULES.md §[section(s)]
```

**Mettre à jour `CHANGELOG.md`** avec une entrée datée après chaque feature.

---

## Agent QA

**Responsabilités** : tester et rédiger un rapport. Jamais de modification de code métier.

**Protocole complet** : voir `TEST_PROTOCOL.md`. Tous les checks projet-spécifiques y sont définis.

**Output** : écrire dans `reports/REPORT_{YYYY-MM-DD}_{feature}.md`.

---

## Standards Mobile-First (obligatoires pour tout DEV/QA)

### NAVBAR
- Sur mobile (<768px) : hamburger 3 lignes à droite, menu vertical en dropdown (tous les liens + switch FR/EN)
- Sur desktop (≥768px) : liens horizontaux inline
- Hauteur fixe 64px, fond blanc, légère ombre ou bordure basse
- Implémenter avec `useState` dans un Client Component

### GRILLE de cartes
- 1 colonne sur mobile, 2 colonnes à partir de `sm` (640px), 3 colonnes à partir de `lg` (1024px)
- Hauteur de carte uniforme, images en ratio 16:9

### HERO / sections de titre
- `py-8` mobile → `py-16` desktop
- `text-2xl` mobile → `text-4xl` desktop
- Tags/badges en `flex-wrap`

### Règles générales
- Toujours mobile-first : écrire le style de base pour mobile, surcharger avec `sm:`, `md:`, `lg:`
- Interdire tout défilement horizontal (`overflow-x: hidden` sur body si nécessaire)
- Zones tactiles min 44px de hauteur
- Tester mentalement à 375px (iPhone SE) avant de valider

---

## Fichiers de référence

| Fichier | Usage |
|---|---|
| `BUSINESS_RULES.md` | Règles métier et conventions — lire avant toute implémentation/test |
| `TEST_PROTOCOL.md` | Protocole complet de l'agent QA |
| `CHANGELOG.md` | Mis à jour par DEV après chaque feature |
| `reports/` | Rapports QA — jamais modifié par DEV |
| `SPEC.md` | Specs prêtes à implémenter — source de vérité pour DEV/QA |
| `BACKLOG.md` | Idées brutes non confirmées — **ne pas lire ni implémenter** |
