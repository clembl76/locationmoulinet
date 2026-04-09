# TEST_PROTOCOL.md — Agent QA

## Entrée attendue

- Le bloc `## Handoff QA` produit par l'agent DEV
- Les fichiers modifiés listés dans ce bloc
- `BUSINESS_RULES.md` pour les règles métier impliquées
- L'application doit tourner localement : `npm run dev` → http://localhost:3000

---

## Étapes — dans l'ordre, sans en sauter aucune

### Étape 1 — Analyse statique
- Vérifie la structure des fichiers et l'organisation du projet
- Identifie les dépendances déclarées vs utilisées
- Détecte les erreurs de syntaxe évidentes (balises non fermées, imports manquants)
- Repère les mauvaises pratiques : `console.log` laissés, TODO non résolus, variables globales
- Évalue la lisibilité et la maintenabilité du code

### Étape 2 — Tests fonctionnels
- Vérifie que chaque comportement décrit dans le Handoff est implémenté
- Teste les cas nominaux (happy path) pour chaque feature
- Teste les cas limites : champs vides, valeurs extrêmes, caractères spéciaux
- Vérifie la gestion des erreurs et les messages utilisateur
- Contrôle les interactions : clics, formulaires, navigation

### Étape 3 — Accessibilité & compatibilité
- Présence des attributs `alt` sur les images
- Hiérarchie des headings (h1 > h2 > h3)
- Navigabilité au clavier (tabindex, focus visible)
- Responsivité : mobile (320px), tablette (768px), desktop (1280px)

### Étape 4 — Performance
- Requêtes réseau inutiles
- Re-renders inutiles (composants React)
- Event listeners ou intervals non nettoyés

### Étape 2b — Tests E2E (bout en bout — obligatoires si formulaire ou navigation impliqués)

> **Prérequis** : l'app tourne sur http://localhost:3000. Tester dans un navigateur réel (Chrome ou Firefox).
> Ouvrir la console DevTools (F12 → Console + Network) pendant chaque test pour capturer les erreurs réseau et JS.

#### Pour chaque formulaire modifié :

**Happy path complet** — remplir TOUS les champs et soumettre :
1. Ouvrir la page (ex : http://localhost:3000/candidater)
2. Remplir chaque champ valide, noter les valeurs utilisées dans le rapport
3. Cliquer "Envoyer" / "Confirmer"
4. Vérifier la **page cible** : message de succès affiché ? Pas d'erreur JS dans la console ?
5. Vérifier côté Supabase que la ligne a bien été insérée (Table Editor ou SQL : `SELECT * FROM candidates ORDER BY created_at DESC LIMIT 1`)

**Validation des champs** — tester au moins :
- Soumettre avec un champ obligatoire vide → message d'erreur attendu, formulaire non envoyé
- Email invalide → message d'erreur au blur
- Téléphone invalide → message d'erreur au blur

**Cas limite** :
- Pour `/candidater` : tester avec garant = Oui ET garant = Non (deux soumissions séparées)

#### Pour chaque page modifiée (GET) :

1. Naviguer vers l'URL exacte, noter tout message d'erreur ou page blanche
2. Vérifier que les données s'affichent correctement (pas de `null`, `undefined`, `NaN`)
3. Si la page est admin, naviguer vers une URL avec un id inexistant → vérifier qu'une 404 s'affiche (pas un crash)

#### Vérification Supabase post-soumission :

Pour chaque table écrite par l'action, exécuter une vérification SQL via le SQL Editor de Supabase :
```sql
-- Exemple pour candidater
SELECT c.*, ca.desired_signing_date, ca.status
FROM candidates c
JOIN candidate_applications ca ON ca.candidate_id = c.id
ORDER BY c.created_at DESC LIMIT 3;
```
Vérifier : tous les champs soumis sont présents, pas de `null` inattendu.

#### Erreurs à signaler immédiatement (bloquantes) :

- Page blanche ou crash après soumission → 🔴 Critique
- Console JS : `TypeError`, `ReferenceError`, `Unhandled promise rejection` → 🔴 Critique
- Réseau (DevTools Network) : réponse HTTP 500 → 🔴 Critique
- Données non insérées en base après soumission réussie → 🔴 Critique
- Message de succès affiché mais erreur silencieuse en console → 🟠 Majeur

### Étape 5 — Sécurité basique
- Données sensibles hardcodées (API keys, mots de passe)
- Risques XSS évidents (innerHTML non sanitisé, eval())
- URLs d'API exposées côté client

---

## Checks spécifiques — Location Moulinet

> Ces checks s'ajoutent aux étapes génériques et priment en cas de conflit.
> Consulter `BUSINESS_RULES.md` pour le détail des règles métier.

### Accès base de données
- `run_sql` RPC (clé anon) = lecture seule — toute écriture via anon → 🔴 Critique
- `createAdminClient()` (service role) requis pour INSERT / UPDATE / DELETE
- Enums PostgreSQL sans cast `::text` dans les requêtes → 🔴 Critique (erreur runtime garantie)
- `ORDER BY` directement dans un `UNION`/`UNION ALL` sans sous-requête → 🔴 Critique (erreur PostgreSQL runtime : "invalid UNION/INTERSECT/EXCEPT ORDER BY clause") — toujours wrapper dans `SELECT * FROM (...) sub ORDER BY sub.col`

### React / Next.js
- Composant défini dans le corps d'un composant parent → 🟠 Majeur (remount à chaque render)
- `export const dynamic = 'force-dynamic'` manquant sur les pages admin → 🟠 Majeur
- `toISOString().slice(0,10)` pour dates locales → 🟠 Majeur (décalage UTC/Paris)

### HTML / Accessibilité
- `<a>` imbriqué dans `<label>` → 🟠 Majeur (HTML invalide)
- Entités HTML dans JSX (`&#233;`, etc.) → 🟠 Majeur (s'affichent telles quelles)
- Boutons de navigation sans `aria-label` → 🟡 Mineur
- Groupes radio sans `<fieldset>/<legend>` → 🟡 Mineur

### Règles métier (vérifier côté serveur ET client)
- Formulaire visiteur : `situation === 'other'` non rejeté côté serveur → 🟠 Majeur
- Formulaire visiteur : règle 3× loyer non vérifiée côté serveur → 🟠 Majeur
- Quittance de caution : montant issu de `transactions` au lieu de `leases.deposit` → 🟠 Majeur
- Préavis de départ : date min < aujourd'hui + 3 mois → 🟠 Majeur

### Style
- Boutons d'action principaux sans `bg-blue-primary text-white` → 🟡 Mineur
- Couleurs Tailwind custom utilisées sans variable CSS → 🟡 Mineur

---

## Format du rapport

Fichier : `reports/REPORT_{YYYY-MM-DD}_{feature}.md`

```markdown
# Rapport QA — {feature}
**Date** : {date}
**Statut** : ✅ Approuvé | ⚠️ Approuvé avec réserves | ❌ Rejeté
**Problèmes** : {n} critique(s) — {n} majeur(s) — {n} mineur(s)

## Matrice des tests
| Catégorie | Statut | Détail |
|-----------|--------|--------|
| Fonctionnel | ✅/⚠️/❌ | |
| Accessibilité | ✅/⚠️/❌ | |
| Performance | ✅/⚠️/❌ | |
| Sécurité | ✅/⚠️/❌ | |
| Qualité du code | ✅/⚠️/❌ | |
| Checks projet | ✅/⚠️/❌ | |

## Problèmes détectés

### 🔴 Critiques
- **Fichier** : `...` **Ligne** : N
  **Problème** : ...
  **Correction** : ...

### 🟠 Majeurs
- ...

### 🟡 Mineurs
- ...

## Ce qui fonctionne bien
- ...

## Plan d'action
<!-- Prompts prêts à l'emploi pour l'agent DEV, ordonnés par priorité -->
1. ...
```

---

## Règles de comportement

- Citer toujours le fichier et la ligne concernés
- Tester uniquement ce qui est dans le Handoff — le reste est hors scope
- Distinguer les opinions stylistiques des vrais problèmes techniques
- Formuler les corrections comme des prompts prêts à l'emploi pour l'agent DEV
- Si le code ne peut pas être exécuté, effectuer une analyse statique et le signaler explicitement
