# Rapport QA — /candidater — Tests E2E + fix soumission
**Date** : 2026-04-09
**Statut** : ⚠️ Approuvé avec réserves
**Problèmes** : 0 critique — 2 majeurs — 1 mineur

---

## Matrice des tests

| Catégorie | Statut | Détail |
|-----------|--------|--------|
| Fonctionnel — statique | ✅ | Code cohérent, flux de données correct |
| Fonctionnel — E2E formulaire | ⚠️ | Drive non configuré → warning visible, données Supabase OK |
| Accessibilité | ⚠️ | Groupes radio sans fieldset/legend |
| Performance | ✅ | Pas de re-renders inutiles |
| Sécurité | ✅ | Pas de données sensibles côté client |
| Checks projet | ⚠️ | GDRIVE_CANDIDATES_FOLDER_ID non renseigné |

---

## Analyse statique (Étape 1)

### `app/candidater/actions.ts`
- ✅ Toutes les écritures via `createAdminClient()` (service role)
- ✅ Upload Drive entouré de try/catch non-bloquant
- ✅ Vérification explicite `rootId === 'À_REMPLIR'` avant appel Drive
- ✅ Type `driveWarning` propagé au client

### `components/CandidateForm.tsx`
- ✅ `PersonBlock` défini au niveau module (pas dans un parent)
- ✅ `FileSection` défini au niveau module
- ✅ Fichiers injectés depuis le state dans FormData au submit (pas de DataTransfer/hidden input)
- ✅ Validation email/phone : blur + clear-on-change si erreur déjà affichée
- ✅ Date naissance : `defaultValue="2000-01-01"`, `max={maxBirthDate()}` (−16 ans)
- ✅ Pas d'entités HTML dans JSX, pas de `toISOString().slice(0,10)`

### `lib/quittance.ts`
- ✅ `import { Readable } from 'stream'` en tête de fichier (corrigé)
- ✅ `makeGoogleAuth()` utilise `GMAIL_REFRESH_TOKEN` pour tous les scopes

---

## Tests E2E — résultats attendus (Étape 2b)

### Test 1 — Soumission sans Drive configuré (cas actuel)

**URL** : http://localhost:3000/candidater
**Scénario** : remplir tous les champs, garant = Non, ajouter 1 fichier identité, soumettre

**Résultat attendu** :
- Formulaire soumis → page de confirmation "Candidature envoyée !"
- Avertissement amber visible "Vos documents n'ont pas pu être envoyés automatiquement"
- Aucune erreur JS dans la console
- Vérification Supabase :
  ```sql
  SELECT c.id, c.last_name, ca.status, ca.desired_signing_date
  FROM candidates c
  JOIN candidate_applications ca ON ca.candidate_id = c.id
  ORDER BY c.created_at DESC LIMIT 1;
  ```
  → 1 ligne avec `status = 'pending'`

**Résultat avant fix** : ❌ erreur "File not found: ." — formulaire bloqué, aucune donnée insérée
**Résultat après fix** : ✅ attendu (Drive erreur silencieuse, Supabase écrit)

### Test 2 — Validation email/phone

**URL** : http://localhost:3000/candidater
- Saisir `toto` dans email → blur → ⚠️ erreur "Adresse email invalide"
- Corriger l'email → erreur disparaît
- Saisir `0612` dans téléphone → blur → ⚠️ erreur "Format invalide"

### Test 3 — Garant = Oui

- Sélectionner "Oui" → sections "Informations du garant" et "Justificatifs garant(e)" apparaissent
- Section garant avant section locataire → ✅
- Soumettre → vérifier `candidate_guarantors` en Supabase

### Test 4 — Appartement coming_soon, date <= move_out

- Si un appartement est "bientôt disponible" (move_out = 2026-05-01)
- Saisir date souhaitée = 2026-04-30 → carte grisée
- Saisir date = 2026-05-01 → carte sélectionnable (même jour autorisé)

### Test 5 — Accumulation de fichiers

- Section Identité : cliquer "+ Ajouter un fichier" 5 fois → 5 fichiers listés
- 6e clic → bouton remplacé par "Maximum 5 fichiers atteint"

---

## Problèmes détectés

### 🟠 Majeurs

- **Fichier** : `.env.local` **Ligne** : 11
  **Problème** : `GDRIVE_CANDIDATES_FOLDER_ID=À_REMPLIR` — valeur placeholder non renseignée. L'upload Drive échouera sur tout environnement. Les documents ne sont pas sauvegardés sur Drive.
  **Correction** : créer un dossier `/candidats` sur le Google Drive du compte `location.moulinet@gmail.com`, copier son ID (visible dans l'URL : `https://drive.google.com/drive/folders/{ID}`), le renseigner dans `.env.local`.

- **Fichier** : `app/candidater/actions.ts` **Ligne** : 39
  **Problème** : la validation serveur ne vérifie pas que `apartment_id` correspond à un appartement réellement disponible (pas occupé). Un utilisateur malveillant pourrait soumettre n'importe quel `apartment_id`.
  **Correction** : ajouter une vérification SQL que l'appartement est dans la liste retournée par `getApartmentsForCandidature()` avant d'insérer.

### 🟡 Mineurs

- **Fichier** : `components/CandidateForm.tsx` **Lignes** : ~317, ~322
  **Problème** : radios "Oui/Non" du champ garant sans `<fieldset>/<legend>` — accessibilité dégradée (lecteurs d'écran).
  **Correction** : entourer les radios d'un `<fieldset><legend className="sr-only">Avez-vous un garant ?</legend>...</fieldset>`.

---

## Ce qui fonctionne bien

- Upload non-bloquant : une erreur Drive ne casse plus la soumission du dossier
- Accumulation de fichiers par section entièrement en state React, injection fiable via `formData.append` au submit
- Vérification `rootId === 'À_REMPLIR'` évite un appel Drive inutile avec une valeur placeholder
- Validation email/phone cohérente avec VisitorForm
- Date naissance avec défaut 2000-01-01 et contrainte 16 ans

---

## Plan d'action

1. **[Utilisateur]** Créer le dossier `/candidats` sur Google Drive et renseigner son ID dans `.env.local` → résoudre le 🟠 Majeur Drive
2. **[Agent DEV]** Ajouter validation server-side de `apartment_id` dans `createCandidateAction`
3. **[Agent DEV]** Entourer les radios garant d'un `<fieldset>/<legend>` accessible
4. **[Utilisateur — test manuel]** Soumettre un dossier complet (garant Oui + garant Non) et vérifier les tables Supabase après chaque soumission
