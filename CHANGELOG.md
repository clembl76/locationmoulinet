# Changelog

## [Non publié]

### 2026-04-09 — Fix référencement candidate_documents dans Supabase (spec SPEC.md)
- Séparation en deux blocs try/catch indépendants : upload Drive d'un côté, insert Supabase `candidate_documents` de l'autre
- Avant : erreur Supabase masquée par le catch Drive → message "documents non envoyés" affiché alors que Drive avait réussi
- Après : si Drive OK et Supabase OK → aucun avertissement ; chaque bloc rapporte sa propre erreur si elle se produit
- Fichiers : `app/candidater/actions.ts`

### 2026-04-09 — Fix soumission /candidater + agent QA E2E (spec SPEC.md)
- Fix "File not found" : upload Drive rendu non-bloquant, candidat sauvegardé en base même si Drive échoue
- Validation explicite de GDRIVE_CANDIDATES_FOLDER_ID (rejette "À_REMPLIR")
- Avertissement affiché sur la page de succès si Drive a échoué
- TEST_PROTOCOL.md : ajout Étape 2b — Tests E2E obligatoires (formulaires, pages cibles, vérification Supabase)
- Fichiers : `app/candidater/actions.ts`, `components/CandidateForm.tsx`, `TEST_PROTOCOL.md`

### 2026-04-09 — Fix upload Drive + ajout fichiers par section (spec SPEC.md)
- Fix erreur "File not found: ." : `import { Readable } from 'stream'` était au milieu du fichier (illégal en ES modules) → déplacé en tête de `lib/quittance.ts`
- Nouvelle UI FileSection : ajout de fichiers un par un avec liste visible et bouton ×, jusqu'à 5 par section
- Injection des fichiers depuis le state React directement dans FormData au submit (fiable, sans DataTransfer/input caché)
- Fichiers : `lib/quittance.ts`, `components/CandidateForm.tsx`

### 2026-04-09 — Corrections formulaire /candidater (spec SPEC.md)
- Fix date bail : même jour que move_out autorisé (`<` strict au lieu de `<=`)
- Étoile rouge sur pièces jointes obligatoires (Identité, Revenus si pas garant, pièces garant)
- Pièces garant affichées avant pièces locataire
- Limite 5 fichiers par section validée au submit côté client
- SQL de création des tables dans `scripts/create_candidates_tables.sql` (tables manquantes → erreur corrigée une fois le script exécuté dans Supabase)
- Fichiers : `components/CandidateForm.tsx`, `scripts/create_candidates_tables.sql`

### 2026-04-09 — Fix calendrier sortie + améliorations /candidater (spec SPEC.md)
- Fix calendrier : renommé en "Etat des lieux de sortie" (et non d'entrée)
- CandidateForm : validation email/phone (blur, clear on change) identique à VisitorForm
- CandidateForm : date naissance avec défaut 01/01/2000, max = aujourd'hui - 16 ans, obligatoire
- CandidateForm : adresse placeholder "N° rue, code postal, ville, pays"
- CandidateForm : bloc "Date souhaitée" séparé avant "Appartement souhaité"
- CandidateForm : justificatifs décomposés en sous-sections (Identité obligatoire, Revenus conditionnel garant, Statut facultatif) pour candidat et garant
- Fichiers : `lib/quittance.ts`, `components/CandidateForm.tsx`, `app/candidater/actions.ts`

### 2026-04-09 — Événement calendrier préavis enrichi + page /candidater (spec SPEC.md)
- Fix événement calendrier : dateTime 14h-14h30 Europe/Paris, nom "Etat des lieux d'entrée [apt] [NOM]", description complète (signing_date, deposit, lease_type, garant)
- Nouvelle page `/candidater` : formulaire candidature (infos perso, garant conditionnel, appartement, date souhaitée, upload justificatifs Drive)
- Upload fichiers vers Google Drive `/candidats/{num}-{NOM}/justificatifs/candidate` et `guarantor`
- Nouveaux fichiers : `app/candidater/page.tsx`, `app/candidater/actions.ts`, `components/CandidateForm.tsx`
- `lib/adminData.ts` : ajout `getApartmentsForCandidature`, `lib/quittance.ts` : ajout `uploadCandidateDocuments`
- Tables Supabase à créer : voir note Handoff QA

### 2026-04-09 — Corrections garant, token Google, nomenclature Drive (spec SPEC.md)
- Fix root cause bloc garant vide : `guarantors.tenant_id` (pas `lease_id`) → requête via `JOIN lease_tenants`
- Fix CC garant quittance caution + attestation : même correction FK → email garant maintenant récupéré
- Fix token Google Calendar : `GOOGLE_REFRESH_TOKEN` n'avait pas le scope calendar → utilisation de `GMAIL_REFRESH_TOKEN` pour tout (drive + calendar + gmail.compose)
- Fix nomenclature Drive : dossiers `{num}_{NOM.UPPER()}`, fichiers bail `_Bail_`, fichiers EDL `_EDLInventaire_`
- Suppression de `makeGmailAuth` redondante → une seule fonction `makeGoogleAuth`
- Fichiers : `lib/adminData.ts`, `lib/quittance.ts`

### 2026-04-09 — Page détail appartement : garant, CC, EDL Drive, sections post-préavis (spec SPEC.md)
- Ajout bloc Garant (nom, email, téléphone / message si aucun) entre Locataire et Bail
- Correction CC garant sur quittance de caution et attestation : utilisation du client service role (createAdminClient) au lieu du client anon qui échouait silencieusement
- Ajout lien Google Drive vers le PDF d'EDL d'entrée dans la section État des lieux
- Correction : sections Actions, EDL, Documents restent visibles après saisie d'un préavis (`isOccupied = !!lease_id` sans `&& !move_out_date`)
- Ajout `getGuarantorForLease` dans `lib/adminData.ts`, `getDriveEdlEntryUrl` dans `lib/quittance.ts`
- Fichiers : `lib/adminData.ts`, `lib/quittance.ts`, `app/admin/apartments/[number]/page.tsx`

### 2026-04-09 — Corrections page /visiter (spec SPEC.md)
- Adresse complète du bâtiment affichée à la place du short_name
- Liens "Voir tous les appartements" et "Voir la fiche" ouverts dans un nouvel onglet
- Corrigé props manquantes sur AptCard (isSelected, onToggle) → sélection, warnings revenus et bouton submit fonctionnels
- Fichiers : `components/VisitorForm.tsx`

### 2026-04-09 — Déplacement CTA "Visiter" sous le filtre de recherche
- Supprimé le bouton "Prendre rendez-vous" du hero (section `bg-blue-light`)
- Ajouté le même bouton centré sous `FilterBar`, au-dessus de la grille d'appartements
- Fichiers : `components/HomeClient.tsx`

<!-- L'agent DEV doit ajouter une entrée ici après chaque feature. Format :
### YYYY-MM-DD — Titre de la feature
- Ce qui a été ajouté / modifié / corrigé
- Fichiers touchés
-->
