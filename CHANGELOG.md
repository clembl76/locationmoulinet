# Changelog

## [Non publié]

### 2026-07-23 — Unification de la liste "Statut familial" (candidature + nouveau bail)
- `lib/familyStatus.ts` (nouveau) : constante partagée `FAMILY_STATUSES` (5 valeurs : Célibataire, Marié(e), Pacsé(e), Divorcé(e), Veuf/Veuve) + type `FamilyStatus`
- `app/admin/apartments/[number]/nouveau-bail/NouveauBailForm.tsx` : supprime sa constante locale (4 valeurs, sans "Veuf/Veuve") au profit de la liste partagée — le formulaire de bail propose désormais les mêmes 5 options que la candidature publique
- `components/CandidateForm.tsx` : les 5 `<option>` codés en dur remplacés par un `.map()` sur `FAMILY_STATUSES`
- `src/lib/familyStatus.test.ts` (nouveau) : vérifie le contenu exact de la liste
- `src/app/admin/apartments/[number]/nouveau-bail/NouveauBailForm.test.tsx` (nouveau, premier test pour ce composant) : vérifie que les 5 statuts (dont "Veuf/Veuve") sont bien proposés

### 2026-07-22 — Écran Paiements : remplacement du filtre/badge "Perso" par "Renard"
- `components/admin/LinxoTable.tsx` : `SOURCE_LABELS`/`SOURCE_COLORS` — entrée `perso` remplacée par `renard: 'Renard'` (couleur violet réutilisée) ; option du filtre Source `<option value="perso">Perso</option>` remplacée par `<option value="renard">Renard</option>`
- **Contexte** : la base ne contient plus aucune transaction `source = 'perso'` (réattribuées manuellement à `renard`) ; l'UI n'affichait plus correctement les transactions Renard (badge gris par défaut, pas de filtre dédié) alors même que `lib/linxoImport.ts` reconnaît `renard` depuis un peu plus tôt cette session
- `src/components/admin/LinxoTable.test.tsx` (nouveau) : 3 tests — badge "Renard" avec la bonne couleur, présence de l'option "Renard"/absence de "Perso" dans le filtre, filtrage effectif par source

### 2026-07-22 — Import Linxo : exclusion de "perso" de la liste fermée des fichiers acceptés
- `lib/linxoImport.ts` : `KNOWN_LINXO_SOURCES` réduite à `['moulinet', 'bonsenfants', 'vieuxpalais', 'renard']` — un fichier `perso.csv` (ou variante) est désormais ignoré comme n'importe quel fichier non reconnu, au lieu d'être importé sous `source = 'perso'`
- Le filtre "Perso" reste disponible dans `components/admin/LinxoTable.tsx` (transactions déjà importées avec ce tag avant ce changement) — seule l'acceptation de **nouveaux** fichiers est concernée
- `src/lib/linxoImport.test.ts` : test "reconnaît perso" remplacé par un test confirmant l'exclusion, `KNOWN_LINXO_SOURCES` mis à jour (4 sources)

### 2026-07-22 — Import Linxo : liste fermée des fichiers acceptés, fichiers non reconnus ignorés
- `lib/linxoImport.ts` :
  - `detectSource` retourne désormais `LinxoSource | null` (au lieu de retomber sur le nom de fichier brut) — liste fermée exportée `KNOWN_LINXO_SOURCES = ['moulinet', 'bonsenfants', 'vieuxpalais', 'renard', 'perso']`
  - `importLinxoCsvs` : un fichier CSV dont le nom ne correspond à aucune source connue est désormais ignoré (aucun téléchargement, aucun insert) et génère un message explicite dans `errors` : `Fichier ignoré (nom non reconnu, attendu : moulinet, bonsenfants, vieuxpalais, renard, perso) : <nom>` — visible dans le compteur d'erreurs de `LinxoTable` et loggé en console
- `src/lib/linxoImport.test.ts` : mise à jour du test "fichier non reconnu" (retourne `null` au lieu du fallback), ajout d'un test sur `KNOWN_LINXO_SOURCES`

### 2026-07-22 — Import Linxo : reconnaissance du fichier CSV pour l'immeuble Renard
- `lib/linxoImport.ts` — `detectSource` (désormais exportée) : ajout de la branche `if (lower.includes('renard')) return 'renard'`, manquante alors que Moulinet/Bons Enfants/Vieux Palais/perso étaient déjà reconnus. Sans cette branche, un fichier Renard tombait dans le fallback générique (nom de fichier brut sans normalisation), fragilisant la déduplication par fingerprint.
- `src/lib/linxoImport.test.ts` (nouveau) : 7 tests couvrant les 5 sources reconnues (avec variantes de séparateur), la casse, et le fallback sur fichier non reconnu

### 2026-07-22 — Quittance de loyer : dates réelles de la période en cas de mois au prorata
- `lib/quittanceUtils.ts` : nouvelle fonction pure exportée et testée `computeQuittancePeriod(year, month, leaseSigningDateIso, leaseMoveOutDateIso)` — détermine les bornes réelles de la période facturée :
  - prorata d'entrée (signature ce mois-ci) : période du jour de signature au dernier jour du mois
  - prorata de sortie (fin de bail ce mois-ci) : période du 1er du mois au jour de fin du bail
  - sinon (mois plein) : du 1er au dernier jour du mois, comme avant
- `lib/quittance.ts` :
  - `QuittanceData` : 2 nouveaux champs `lease_signing_date`, `lease_move_out_date` (ajoutés à la requête `getQuittanceData`)
  - `generateQuittancePdf` : `dateDebut`/`dateFin` calculés via `computeQuittancePeriod` + `fmtShortDate` au lieu du 1er/dernier jour du mois systématique
  - Suppression de la fonction locale `daysInMonth` devenue inutilisée
- `src/lib/quittanceUtils.test.ts` : 8 nouveaux tests pour `computeQuittancePeriod` (mois plein, prorata entrée, prorata sortie, bail signé et terminé le même mois, cas limites signature/sortie le 1er/dernier jour)

### 2026-07-21 — Fix v3 : transactions Linxo — filtre uniquement par lease_id + backfill au Catégoriser
- `lib/adminData.ts` — `getLinxoTransactionsForApartment` : revenu au filtre simple `WHERE lease_id = X` (suppression de toute logique OR/tenant_name/date)
- `lib/linxoCategorization.ts` — deux corrections :
  1. Requêtes tenant/garant sans `WHERE l.move_out_inspection_date IS NULL` — tous les baux (actifs et archivés) sont désormais candidats à la reconnaissance du nom
  2. Étape de backfill ajoutée en fin de `runCategorization` : pour toutes les transactions avec `apartment_num + tenant_name` mais sans `lease_id`, la fonction calcule et écrit le bon `lease_id` (matching sur `apartment_num` + sous-chaîne `tenant_name`)
- **Action requise** : cliquer "Catégoriser" une fois en prod pour que le backfill s'exécute sur les transactions de MASSON (juin 2026, caution)

### 2026-07-21 — Création automatique de contacts Google à l'acceptation d'un candidat
- `lib/quittance.ts` : nouvelle fonction exportée `createGoogleContacts` (Google People API v1)
  - Crée un contact pour le candidat (entreprise = "Apt X")
  - Crée un contact pour le garant si présent (entreprise = "Apt X Garant")
  - Champs : nom, prénom, email, téléphone
- `app/admin/mise-en-location/candidats/[id]/actions.ts` : appel best-effort de `createGoogleContacts` lors du passage en statut `accepted`
- `scripts/get_refresh_token.py` : ajout du scope `https://www.googleapis.com/auth/contacts`
- **Prérequis activés** : People API activée dans Google Cloud Console + `GMAIL_REFRESH_TOKEN` régénéré avec le scope contacts

### 2026-07-03 — Bail : placeholders état civil bailleur
- `lib/quittance.ts` — `generateBailAndUploadToDrive` :
  - 2 nouveaux placeholders `{{etat_civil_bailleur}}` et `{{naissance_bailleur}}` dans le dict `replacements`
  - `ownerNee` ("né"/"née" selon le titre de l'owner) calculé avant le dict pour alimenter `naissance_bailleur`
  - Suppression du raw text replacement combiné "Mariée née le 02/08/1983 à Paris 15e" (remplacé par les 2 placeholders qui fonctionnent sur des lignes séparées)
- **Mise à jour requise dans les 2 templates Google Docs** : remplacer `Mariée` par `{{etat_civil_bailleur}}` et `née le 02/08/1983 à Paris 15e` par `{{naissance_bailleur}}`

### 2026-07-03 — Bouton "Générer mail arrivée" étendu à tous les bâtiments
- `app/admin/apartments/[number]/page.tsx` : suppression de la condition `building_short_name === 'Moulinet'` — le bouton `EdlEntreeEmailButton` est maintenant visible pour tous les appartements occupés (non archivés), quel que soit le bâtiment

### 2026-07-03 — Génération du bail : remplacement du texte hardcodé du template (owner réel, adresse bâtiment)
- `lib/quittanceUtils.ts` : ajout de `fmtShortDate(iso)` (YYYY-MM-DD → DD/MM/YYYY) exportée et testée
- `lib/quittance.ts` — `generateBailAndUploadToDrive` :
  - Import de `fmtShortDate` depuis `quittanceUtils`
  - Requête SQL étendue : 5 nouveaux champs owner — `phone`, `email`, `etat_civil`, `birth_date::text`, `birth_place`
  - Migration `supabase/migrations/20260703_owners_personal_data.sql` : colonnes `etat_civil TEXT`, `birth_date DATE`, `birth_place TEXT` sur `owners`
  - `batchUpdate` étendu avec 5 opérations `replaceAllText` sur le texte hardcodé du template :
    - `"9 rue du Moulinet"` → `buildings.address` (page de garde + section adresse + ACTE DE CAUTIONNEMENT)
    - `"Clémentine ALAOUI M'HAMMEDI"` → `owners.first_name + owners.last_name` (bailleur + ACTE DE CAUTIONNEMENT)
    - `"Mariée née le 02/08/1983 à Paris 15e"` → état civil + "née/né" + birth_date + birth_place (si renseignés en DB)
    - `"06 28 07 67 29"` → `owners.phone`
    - `"location.moulinet@gmail.com"` → `owners.email`
- `src/lib/quittanceUtils.test.ts` : 3 tests ajoutés pour `fmtShortDate` (happy path, null, padding zéros)
- **Actions manuelles requises** : voir Handoff QA

### 2026-07-03 — Génération du bail : bailleur dynamique, adresse logement, IRL 2026, paragraphes équipements
- `lib/quittance.ts` — `generateBailAndUploadToDrive` :
  - Requête étendue avec `LEFT JOIN owners` pour récupérer le bailleur de l'immeuble (title, first_name, last_name, personal_address)
  - 4 nouveaux placeholders bailleur : `{{civilite_bailleur}}`, `{{prenom_bailleur}}`, `{{nom_bailleur}}`, `{{adresse_bailleur}}`
  - Nouveau placeholder `{{adresse_logement}}` alimenté par l'adresse du bâtiment (`buildings.address`)
  - `{{num_appt}}` vide pour l'appartement 1000 (Vieux Palais — immeuble mono-logement)
  - 2 nouveaux placeholders paragraphes : `{{chaudiere_compteurs}}` et `{{equipements_tech}}` avec les textes mis à jour
  - IRL : variables d'env (`BAIL_IRL_DATE` / `BAIL_IRL_VALUE`) prioritaires sur l'API INSEE (auparavant c'était l'inverse)
- `.env.local` : IRL mis à jour — 1er trimestre 2026, valeur 146,60
- **Mise à jour requise dans les templates Google Docs** : ajouter les 7 nouveaux placeholders (voir Handoff QA)

### 2026-07-03 — Formulaire candidature : regex téléphone + message d'aide bouton désactivé
- `components/CandidateForm.tsx` : regex téléphone étendue pour accepter les formats avec tirets (`06-37-04-38-55`) et points (`06.37.04.38.55`) qu'iOS peut générer via l'autofill ou la saisie de contacts
- `components/CandidateForm.tsx` : ajout d'un encadré orange visible au-dessus du bouton "Envoyer ma candidature" listant exactement les conditions non remplies (date, appartement, garant, erreur de format) — plus de bouton grisé sans explication
- `src/components/CandidateForm.test.tsx` : 7 tests ajoutés (formats téléphone tirets/points/sans séparateur, message d'aide et ses conditions)

### 2026-06-22 — Recalibrage précis du PDF CERFA + ajustements texte (retour utilisateur sur un cas réel)
- `lib/quittance.ts` : coordonnées de `generateAttestationLoyerCafPdf` entièrement recalculées à partir des positions exactes extraites du flux du gabarit (et non plus d'une estimation visuelle) — toutes les croix de case à cocher tombent désormais précisément dans leur case (chambre, colocation, à jour, sous-location, hôtel, décence), et chaque texte est positionné au-dessus de sa ligne continue avec une légère marge
- `lib/quittance.ts` : objet de l'email simplifié en "Attestation de loyer CAF - Appartement {n}" (suppression de "/MSA"), corps simplifié ("... à destination de la CAF.")
- `components/admin/AttestationLoyerCafButton.tsx` : libellé du bouton renommé en "Attestation CAF"
- Tests : `src/components/admin/AttestationLoyerCafButton.test.tsx` mis à jour avec le nouveau libellé — 333 passés / 0 échoué — Build : OK

### 2026-06-22 — Génération de l'attestation de loyer CAF/MSA (CERFA 10842*07)
- `lib/templates/attestation-loyer-cerfa.pdf` (nouveau) : gabarit officiel CERFA, formulaire plat sans champs AcroForm
- `supabase/migrations/20260622_owners_siret.sql` (nouveau) : ajout de la colonne `siret TEXT` sur `owners`. **Migration à appliquer manuellement sur Supabase.**
- `lib/quittance.ts` : nouvelle section "Attestation de loyer CAF/MSA" — `getAttestationLoyerCafData(leaseId, tenantIsUpToDate)` (lecture bailleur/locataire/logement, `owner_siret` en best-effort si migration non appliquée), `generateAttestationLoyerCafPdf(data)` (surimpression sur le gabarit via `pdf-lib`, coordonnées calibrées manuellement à partir d'une grille de test ; signature du bailleur réutilisée selon le building comme pour la quittance de caution), `createGmailDraftAttestationLoyerCaf(data, pdfBytes, filename)` (brouillon Gmail avec PDF en pièce jointe, jamais envoyé directement)
- `app/admin/apartments/[number]/actions.ts` : nouvelle action `generateAttestationLoyerCafAction(leaseId, aptNumber, tenantIsUpToDate)`
- `components/admin/AttestationLoyerCafButton.tsx` (nouveau, client) : bouton "Attestation de loyer CAF/MSA", remplace le placeholder désactivé "Attestation CAF"
- `app/admin/apartments/[number]/page.tsx` : bouton intégré au bloc "Documents", `tenantIsUpToDate` dérivé du même calcul que pour l'attestation de location (`!isUnpaid`)
- Champs pré-remplis automatiquement : identité bailleur (nom, adresse, téléphone, email, SIRET — table `owners`), identité locataire, date et mois d'entrée, adresse du logement, surface, loyer (sections "mois d'entrée" et "mois de juillet", valeurs identiques), statut "à jour des loyers"
- Cases à réponse fixe (toujours identiques pour ces studios meublés à locataire unique) : chambre = non, colocation = non, sous-location = non, hôtel/pension = non, décence = oui
- Tests : `src/components/admin/AttestationLoyerCafButton.test.tsx` (nouveau, 6 tests)
- Tests : 333 passés / 0 échoués — Build : OK
- **Action manuelle requise** : appliquer la migration `20260622_owners_siret.sql`, puis renseigner `personal_address`, `phone`, `email` et `siret` sur la table `owners` si pas déjà fait

### 2026-06-22 — Remplacement du cron par un bouton "Générer mail arrivée" (SPEC.md §Page Détail d'un appartement /admin/apartments/num)
- Remplace le déclenchement automatique par cron (entrée CHANGELOG précédente) par une génération manuelle depuis la fiche appartement
- Supprimés : `app/api/cron/edl-entree-email/route.ts`, `vercel.json`, `supabase/migrations/20260622_lease_edl_entree_email.sql`, et les fonctions `getLeasesNeedingEdlEntreeEmail`/`markEdlEntreeEmailCreated` dans `lib/adminData.ts` — plus de suivi `edl_entree_email_created` en base, le brouillon peut être régénéré à la demande comme pour la quittance et l'attestation de location
- `app/admin/apartments/[number]/actions.ts` : nouvelle action `generateEdlEntreeEmailAction(tenantEmail)` — crée le brouillon Gmail via `createGmailDraftEdlEntree` (déjà existant dans `lib/quittance.ts`)
- `components/admin/EdlEntreeEmailButton.tsx` (nouveau, client) : bouton "Générer mail arrivée", désactivé si email locataire manquant, affiche la confirmation "✓ Brouillon Gmail créé"
- `app/admin/apartments/[number]/page.tsx` : bouton ajouté en fin du bloc "Bail", visible uniquement pour le building **Moulinet** et pour un bail non archivé
- Tests : `src/components/admin/EdlEntreeEmailButton.test.tsx` (nouveau, 6 tests) — affichage, désactivation sans email, succès, erreur avec nouvelle tentative possible
- Tests : 327 passés / 0 échoués — Build : OK

### 2026-06-22 — Email automatique "informations d'arrivée" après EDL d'entrée (SPEC.md §Page Détail d'un appartement /admin/apartments/num)
- `supabase/migrations/20260622_lease_edl_entree_email.sql` (nouveau) : ajout de la colonne `edl_entree_email_created BOOLEAN NOT NULL DEFAULT FALSE` sur `leases`. **Migration à appliquer manuellement sur Supabase.**
- `lib/emailFormatting.ts` : nouvelles fonctions pures exportées `EDL_ENTREE_EMAIL_SUBJECT` et `buildEdlEntreeEmailBody()` — contenu statique défini dans SPEC.md (contacts, wifi, poubelles, laveries)
- `lib/quittance.ts` : nouvelle fonction `createGmailDraftEdlEntree(tenantEmail)` — crée un brouillon Gmail (non envoyé) via `gmail.users.drafts.create`
- `lib/adminData.ts` : nouvelles fonctions `getLeasesNeedingEdlEntreeEmail()` (baux du building Moulinet dont `move_in_inspection_date = CURRENT_DATE` et email pas encore créé) et `markEdlEntreeEmailCreated(leaseId)`
- `app/api/cron/edl-entree-email/route.ts` (nouveau) : route GET — pour chaque bail éligible, crée le brouillon puis marque le bail traité ; protégée par `CRON_SECRET` si défini
- `vercel.json` (nouveau) : planning du cron quotidien (`0 6 * * *`) appelant la route ci-dessus — **nécessite que la variable d'env `CRON_SECRET` soit définie sur le projet Vercel**
- `src/lib/edlEntreeEmail.test.ts` (nouveau) : 8 tests sur `buildEdlEntreeEmailBody()` et `EDL_ENTREE_EMAIL_SUBJECT`
- Tests : 321 passés / 0 échoués — Build : OK
- **Action manuelle requise après déploiement** : appliquer la migration Supabase, définir `CRON_SECRET` dans les variables d'environnement Vercel, vérifier l'activation du cron (Vercel Hobby : 1 exécution par jour max)

### 2026-06-19 — Filtrage Linxo par lease_id (SPEC.md §Page Détail d'un appartement /admin/apartments/num)
- `supabase/migrations/20260619_linxo_lease_id.sql` (nouveau) : ajout de la colonne `lease_id UUID REFERENCES leases(id)` sur `transactions_linxo`. **Migration à appliquer manuellement sur Supabase.**
- `scripts/backfill_linxo_lease_id.sql` (nouveau) : UPDATE de rétrobackfill — lie les transactions existantes à leur bail en matchant `apartment_num` + plage de dates (`signing_date <= date <= move_out_inspection_date`). À exécuter après la migration.
- `lib/linxoCategorization.ts` : ajout de `lease_id` dans les types `TenantInfo`, `GuarantorInfo` et `CategorizedResult` ; `categorize()` maintenant exportée pour les tests unitaires ; `runCategorization()` inclut `l.id AS lease_id` dans ses requêtes et l'écrit dans `transactions_linxo` lors de la mise à jour
- `lib/adminData.ts` : `getLinxoTransactionsForApartment(aptNumber, leaseId?, fromDate?, toDate?)` — filtre par `lease_id` quand disponible (requête précise), avec fallback automatique sur le filtrage par date si la colonne n'existe pas encore (migration non appliquée)
- `app/admin/apartments/[number]/page.tsx` : passage de `apt?.lease_id` comme 2e argument à `getLinxoTransactionsForApartment` — les transactions affichées correspondent désormais au bail en cours, non à l'appartement entier
- `src/lib/linxoCategorization.test.ts` (nouveau) : 14 tests unitaires sur `categorize()` — règle locataire (happy path, description, montant, notes, accents, nom court), règle garant, règle mapping (pattern long, non-match), cas aucune correspondance et libellé null
- Tests : 313 passés / 0 échoués — Build : OK

### 2026-06-19 — Archivage conditionnel + déplacement dossier Drive (SPEC.md §Page Appartements /admin/apartments)
- `components/admin/ClosingLeaseActions.tsx` : bouton "Archiver" désactivé (`disabled`) tant que les deux cases "EDL signé" et "Caution restituée" ne sont pas toutes cochées
- `lib/quittance.ts` : nouvelle fonction exportée `moveTenantFolderToArchive(aptNumber, tenantLastName)` — cherche le dossier `{aptNum}_{NOM}` dans `GDRIVE_TENANTS_FOLDER_ID`, trouve ou crée le sous-dossier "Archive", puis déplace le dossier locataire dedans via `drive.files.update` (addParents/removeParents). Retourne `{ ok, error? }`
- `app/admin/apartments/[number]/actions.ts` : `archiveLeaseAction` récupère le nom du locataire via `runSqlAdmin` et appelle `moveTenantFolderToArchive` de façon non-bloquante (best-effort `.catch()`) après avoir mis à jour le statut en DB
- Tests : 299 passés / 0 échoués — 4 nouveaux tests sur `ClosingLeaseActions` couvrant l'état désactivé (aucune case, une seule case, les deux cases) — Build : OK

### 2026-06-19 — Sections "Baux en cours de clôture" et "Archives" (SPEC.md §Page Appartements /admin/apartments)
- `supabase/migrations/20260619_lease_closing_status.sql` (nouveau) : ajout de 3 colonnes sur la table `leases` — `status TEXT NOT NULL DEFAULT 'active'`, `edl_signed BOOLEAN NOT NULL DEFAULT FALSE`, `deposit_returned BOOLEAN NOT NULL DEFAULT FALSE`. **Migration à appliquer manuellement sur Supabase.**
- `lib/adminData.ts` : nouveaux types `ClosingLease` et `ArchivedLease` ; nouvelles fonctions `getClosingLeases()` (baux dont `move_out_inspection_date < CURRENT_DATE` et `status != 'archived'`) et `getArchivedLeases()` (baux dont `status = 'archived'`) ; extension de `AdminApartmentDetail` avec `lease_status`, `lease_edl_signed`, `lease_deposit_returned` et mise à jour du SELECT correspondant dans `getAdminApartmentDetail`
- `app/admin/apartments/[number]/actions.ts` : 3 nouvelles server actions — `updateEdlSignedAction` (mise à jour `edl_signed`), `updateDepositReturnedAction` (mise à jour `deposit_returned`), `archiveLeaseAction` (passage `status = 'archived'` + revalidation)
- `components/admin/ClosingLeaseActions.tsx` (nouveau, client) : panneau de clôture — case "EDL signé", case "Caution restituée" (auto-save), bouton "Archiver" (confirmation + redirection `/admin/apartments`)
- `components/admin/ArchivesSection.tsx` (nouveau, client) : liste déroulante des baux archivés + bouton OK naviguant vers la fiche de l'appartement (`/admin/apartments/[number]?lease=[id]`)
- `app/admin/apartments/page.tsx` : ajout des sections "Baux en cours de clôture" (tableau identique au modèle "Futurs baux", visible si ≥1 bail en clôture) et "Archives" (toujours visible)
- `app/admin/apartments/[number]/page.tsx` : détection du statut du bail (`isArchived`, `isClosing`) — badge "En cours de clôture"/"Archivé" dans le header ; panneau "Clôture" (ClosingLeaseActions) affiché si bail en clôture ; toutes les actions masquées en mode archive ; bannière d'information "consultation uniquement" pour les baux archivés
- Tests : 295 passés / 0 échoués — `src/components/admin/ClosingLeaseActions.test.tsx` (13 tests) et `src/components/admin/ArchivesSection.test.tsx` (8 tests) — Build : OK

### 2026-06-15 — Contenu "Quartier & commodités" et puces charges spécifiques par immeuble (SPEC.md §Page Détail appartement /#apartments/num)
- `lib/apartmentContent.ts` (nouveau) : fonctions pures `getQuartierContent(buildingShortName, lang)` et `getChargesBullets(buildingShortName, lang)`
  - "Quartier & commodités" : contenu Moulinet inchangé par défaut ; nouveau contenu commun pour `Vieux Palais`/`Bons Enfants` (hyper centre, Vieux Marché, Métro Palais de Justice/Teor/Gare SNCF) ; nouveau contenu pour `Renard` (Teor T4, Teors T1-T3 + Fac Pasteur, Métro, Gare SNCF/Métro)
  - Puces "charges comprises" du bloc loyer : liste Moulinet inchangée (eau chaude/électricité/chauffage/wifi inclus) ; nouvelle liste commune pour `Vieux Palais`/`Bons Enfants`/`Renard` (charges = eau froide/TOM/syndic, électricité non incluse)
- `components/ApartmentDetail.tsx` : utilise `getQuartierContent`/`getChargesBullets` avec `apartment.buildings?.short_name` au lieu des constantes statiques `QUARTIER_FR`/`QUARTIER_EN` et de la liste de puces fixe
- Tests : `src/lib/apartmentContent.test.ts` (nouveau, 14 tests) — couvre les 4 immeubles (Moulinet, Vieux Palais, Bons Enfants, Renard) en FR/EN, le fallback Moulinet pour un immeuble inconnu/null, et l'équivalence Bons Enfants ≡ Vieux Palais / Renard pour les puces charges
- 276 passés / 0 échoués — Build : OK

### 2026-06-15 — Correction du garant non rattaché lors de la création du bail depuis un candidat (`signLeaseAction`)
- `app/admin/mise-en-location/candidats/[id]/actions.ts` : l'étape « Créer le garant si présent » insérait par erreur une nouvelle ligne `tenants` pour le garant puis une ligne `guarantors` avec `tenant_id` pointant vers ce nouveau locataire fantôme (sans nom/email/téléphone) — `getGuarantorForLease` (jointure `guarantors.tenant_id = lease_tenants.tenant_id`) ne pouvait donc jamais le retrouver. Corrigé pour insérer directement dans `guarantors` avec `tenant_id` = locataire principal du bail et les colonnes `title/first_name/last_name/email/phone/birth_date/birth_place/address`, comme le fait déjà `app/admin/apartments/[number]/nouveau-bail/actions.ts`
- Correction des données existantes pour le bail de Jade MASSON (appartement 11, signé le 19/06) : ajout de la ligne `guarantors` manquante pour Zéphirine ROMUALD (à partir des infos de `candidate_guarantors`) et suppression du locataire fantôme orphelin créé par l'ancien code
- Tests : 262 passés / 0 échoués (pas de test supplémentaire requis — `signLeaseAction` est une fonction d'intégration Supabase/Drive non couverte unitairement, comme le reste de ce fichier) — Build : OK

### 2026-06-15 — Filtrage des transactions Linxo affichées sur la fiche d'un bail (courant ou futur)
- `lib/adminData.ts` : `getLinxoTransactionsForApartment(aptNumber, fromDate?, toDate?)` accepte désormais des bornes de dates optionnelles et filtre `transactions_linxo.date` en conséquence (la table n'a pas de lien direct vers un bail/locataire, seul le filtrage par date permet de la rattacher au bon bail)
- `app/admin/apartments/[number]/page.tsx` : appel mis à jour avec `apt?.move_in_date` / `apt?.move_out_date` — la section "Transactions Linxo" n'affiche que les transactions de la période du bail affiché (ex. via `?lease=`, plus aucune transaction de l'ancien locataire HAMMOUM ne remonte sur la fiche du bail futur de MASSON)
- Tests : 262 passés / 0 échoués (pas de test supplémentaire requis — requête SQL et page serveur non couvertes unitairement, comme le reste de `lib/adminData.ts` et des pages `app/admin/apartments/**`) — Build : OK

### 2026-06-14 — Correction de l'affichage du locataire courant en cas de bail futur déjà signé + liste "Futurs baux" (Page Appartements /admin/apartments)
- `lib/adminData.ts` : `getAdminApartments` et `getAdminApartmentDetail` — la jointure vers `leases` ne retenait que `move_out_inspection_date IS NULL OR >= CURRENT_DATE`, ce qui faisait remonter arbitrairement (ordre non garanti) un bail futur déjà signé (ex. nouveau locataire à partir du 19/06) à la place du bail réellement en cours (locataire actuel jusqu'au 18/06). Ajout de la condition `l.signing_date <= CURRENT_DATE` et tri `ORDER BY a.id, l.signing_date DESC` pour retenir le bail le plus récent réellement actif aujourd'hui
- `lib/adminData.ts` : `getAdminApartmentDetail(number, leaseId?)` accepte désormais un `leaseId` optionnel — si fourni (et au format UUID), la fiche affiche ce bail précis (même futur) au lieu du bail "en cours aujourd'hui"
- `lib/adminData.ts` : nouvelle fonction exportée `getFutureLeases()` — retourne tous les baux dont `signing_date > CURRENT_DATE`, tous appartements confondus (n° appartement, immeuble, locataire, date d'entrée, loyer CC), triés par date d'entrée croissante
- `app/admin/apartments/page.tsx` : nouvelle section "Futurs baux" sous le tableau principal (uniquement si au moins un bail futur existe), chaque ligne renvoie vers `/admin/apartments/[number]?lease=[leaseId]` — la fiche de cet appartement affiche alors ce bail futur (et son locataire) comme s'il était le bail courant
- Tests : 262 passés / 0 échoués (aucun test supplémentaire requis — requêtes SQL et pages serveur non couvertes unitairement, comme le reste de `lib/adminData.ts` et des pages `app/admin/apartments/**`) — Build : OK

### 2026-06-11 — Loyer du 1er mois au prorata et titre du mail de confirmation candidat (SPEC.md §Page Détail d'un candidat /admin/mise-en-location/candidats/id)
- `app/admin/mise-en-location/candidats/[id]/actions.ts` : nouvelle fonction `computeFirstMonthRent(signingDate, rentCC)` calculant le loyer du 1er mois au prorata (même formule que l'étape 6 de `signLeaseAction` : `prorataDays = joursDuMois - jourSignature + 1`, `montant = round(prorataDays / joursDuMois × rentCC, 2)`, ou loyer plein si signature le 1er du mois). Ce calcul est uniquement utilisé pour l'affichage dans le mail de confirmation — aucune nouvelle écriture en base dans `rents` (la ligne `rents` au prorata reste générée à l'étape « Bail signé »)
- `lib/quittance.ts` : `createGmailDraftCandidateAccepted` accepte un nouveau paramètre `firstMonthRent: number`, utilisé pour « le loyer du 1er mois de X € » dans le corps du mail (le champ « Les loyers suivants de X € » continue d'utiliser `rentCC`)
- `lib/quittance.ts` : titre du mail de confirmation candidat changé de `Confirmation de location - Appartement {num} {adresse}` à `Confirmation de location - Appartement {num} - {adresse}` (ajout du tiret séparateur)
- Tests : 262 passés / 0 échoués (pas de test supplémentaire requis — `createGmailDraftCandidateAccepted` est une intégration Gmail best-effort non couverte unitairement, comme les autres fonctions d'envoi ; `computeFirstMonthRent` reproduit une formule déjà présente et non testée unitairement dans `signLeaseAction`) — Build : OK

### 2026-06-11 — Webhook Make.com à l'acceptation d'un candidat (SPEC.md §Page Détail d'un candidat /admin/mise-en-location/candidats/id)
- `lib/quittance.ts` : `generateBailAndUploadToDrive` retourne désormais `{ filename, webViewLink? }` (upload du PDF avec le champ `webViewLink`) au lieu de `void`. Lève une erreur si `GDRIVE_CANDIDATES_FOLDER_ID` est manquant (auparavant retour silencieux)
- `lib/quittance.ts` : nouvelle fonction exportée `triggerCandidateAcceptedWebhook({ apartmentNumber, candidateFirstName, candidateLastName, candidateEmail, candidatePhone, hasGuarantor, guarantorFirstName, guarantorLastName, guarantorEmail, signingDate, endDate, rentCC, filename, webViewLink? })` — envoie une requête `POST` JSON vers l'URL du webhook Make.com lue dans `process.env.MAKE_CANDIDATE_ACCEPTED_WEBHOOK_URL` (nouvelle variable d'environnement, renseignée dans `.env.local`), même pattern que `triggerEdlSignatureWebhook`. Renvoie `{ ok, error? }`. Le champ `hasGuarantor` (booléen) est calculé à partir de la présence d'un nom de garant lié au candidat
- `app/admin/mise-en-location/candidats/[id]/actions.ts` : dans `updateApplicationStatusAction`, après la génération réussie du bail (statut `accepted`), appel non-bloquant à `triggerCandidateAcceptedWebhook` avec les informations du candidat, du bail généré et le lien Drive du PDF
- `lib/quittance.ts` : nouvelle fonction exportée `createGmailDraftCandidateAccepted({ candidateEmail, aptNumber, buildingShortName, buildingAddress, moveInDate, rentCC, deposit, hasGuarantor })` — crée un **brouillon Gmail** (HTML, même pattern que `createGmailDraftPreavis`) confirmant au candidat son acceptation : appartement/adresse/date d'entrée, mention DocuSign (bail + garant le cas échéant), RDV état des lieux + assurance habitation, montants loyer 1er mois/caution/loyers suivants. Signature « Mme ALAOUI M'HAMMEDI »
- `lib/ribs/` : ajout des 4 RIB (PDF) par immeuble — `RIB_Moulinet.pdf`, `RIB_VieuxPalais.pdf`, `RIB_Renard.pdf`, `RIB_BonsEnfants.pdf`. Le RIB correspondant à l'immeuble de l'appartement est joint automatiquement au brouillon (mapping `RIB_FILES` par `building_short_name`)
- `app/admin/mise-en-location/candidats/[id]/actions.ts` : la requête SQL de `BailRow` récupère désormais `b.short_name AS building_short_name` et `b.address AS building_address` (jointure `buildings`) ; appel non-bloquant à `createGmailDraftCandidateAccepted` après le webhook Make.com
- Tests : 262 passés / 0 échoués (logique métier de `generateBailAndUploadToDrive` / `triggerCandidateAcceptedWebhook` / `createGmailDraftCandidateAccepted` non couverte unitairement, comme les autres intégrations Drive/Gmail/Make.com) — Build : OK

### 2026-06-11 — Correction : génération du bail non déclenchée à l'acceptation d'un candidat
- `app/admin/mise-en-location/candidats/[id]/actions.ts` : dans `updateApplicationStatusAction`, l'appel à `generateBailAndUploadToDrive` n'était pas attendu (`.catch()` sans `await`, en fire-and-forget) — la fonction serveur pouvait se terminer et couper l'exécution avant que la copie du modèle, le remplacement des champs, l'export PDF et le dépôt sur Drive n'aient eu le temps de s'exécuter. Le PDF est désormais généré avec `try { await generateBailAndUploadToDrive(...) } catch { /* non-bloquant */ }`, conforme au pattern déjà utilisé pour `createCalendarPreavisEvent`
- Régénération manuelle (one-off) du bail manquant pour le candidat Jade MASSON (appartement 11), déposé dans `/candidats/11-MASSON/`
- Tests : 262 passés / 0 échoués (logique métier de `generateBailAndUploadToDrive` non couverte unitairement, comme les autres intégrations Drive/Gmail) — Build : OK

### 2026-06-11 — Envoi réel (et non plus brouillon) de la notification de nouvelle candidature (SPEC.md §Page Candidater /candidater)
- `lib/quittance.ts` : `sendCandidateNotificationEmail` envoie désormais le mail directement via `gmail.users.messages.send` au lieu de créer un brouillon (`gmail.users.drafts.create`) — même mécanisme que `sendVisitNotificationEmail` pour la notification de réservation de visite. Destinataire inchangé : `location.moulinet@gmail.com`. Sujet/corps du mail inchangés
- Aucun changement côté `app/candidater/actions.ts` : l'appel à `sendCandidateNotificationEmail` était déjà en place, en best-effort non bloquant
- Tests : 262 passés / 0 échoués (aucun test supplémentaire requis — fonction d'envoi Gmail non couverte unitairement, comme `sendVisitNotificationEmail`/`sendTenantListEmail`) — Build : OK

### 2026-06-09 — Réduction de la liste des pièces dans les surfaces (SPEC.md §Page Inventaire /admin/inventory)
- `lib/surfacesConstants.ts` : `ROOM_TYPES` réduit à 9 valeurs (`Partout`, `Parties communes`, `Cave`, `Chambre`, `Couloir`, `Cuisine`, `Salle de bains`, `Salon`, `Toilettes`) — aligné sur la liste `ROOMS` de `InventoryManager.tsx`
- `src/lib/surfacesConstants.test.ts` : assertions sur `'Entrée'` et `'Indifférent'` (supprimées) retirées ; ajout des assertions sur les valeurs maintenues ; description du dernier `it` mise à jour
- Tests : 262 passés / 0 échoués — Build : OK

### 2026-06-09 — Ajout de Cave, Toilettes, Couloir dans la liste des pièces de l'inventaire (SPEC.md §Page Inventaire /admin/inventory)
- `components/admin/InventoryManager.tsx` : `ROOMS` passe de 6 à 9 valeurs : ajout de `Cave`, `Couloir` et `Toilettes`, triés alphabétiquement dans la liste
- Tests : 262 passés / 0 échoués — Build : OK

### 2026-06-09 — Réduction de la liste des pièces dans l'inventaire (SPEC.md §Page Inventaire /admin/inventory)
- `components/admin/InventoryManager.tsx` : `ROOMS` réduit à 6 valeurs (`Partout`, `Parties communes`, `Chambre`, `Salon`, `Cuisine`, `Salle de bains`) au lieu de la liste exhaustive de 24 entrées. Les états par défaut `room` et `newRoom` (anciennement `'Indifférent'`, valeur supprimée) sont mis à jour à `'Chambre'`. Note : `ROOM_TYPES` dans `lib/surfacesConstants.ts` (utilisé pour les surfaces, pas l'inventaire) est inchangé
- Tests : 262 passés / 0 échoués — Build : OK

### 2026-06-08 — Ajout de la date de l'EDL dans les données envoyées au webhook Make.com (SPEC.md §Page EDL /admin/inventory/edl-fige/)
- `lib/quittance.ts` : `triggerEdlSignatureWebhook` accepte et transmet désormais un champ `edlDate` (date d'entrée ou de sortie selon `edlType`, au format `YYYY-MM-DD`, ou `null` si non renseignée)
- `app/admin/inventory/edlFigePdfActions.ts` : `generateEdlFigePdfAction` calcule cette date à partir de `leaseDates` (`move_in_date` en mode Entrée, `move_out_date` en mode Sortie — même logique que `buildEdlPdfFilename`) et la transmet au webhook
- Tests : 262 passés / 0 échoués (pas de test supplémentaire requis — `edlDate` est un champ de payload transmis tel quel à une fonction d'intégration réseau best-effort déjà non couverte unitairement, cf. justification de l'entrée précédente) — Build : OK

### 2026-06-08 — Déclenchement d'un scénario Make.com (signature) après génération du PDF de l'EDL figé
- **Contexte** : en complément de l'enregistrement sur Google Drive (cf. entrée précédente), le bouton "Générer le pdf" déclenche désormais, en dernière étape, un scénario Make.com (webhook personnalisé côté Make, configuré par l'utilisateur) chargé de lancer le processus de signature électronique
- `lib/edlFigePdf.ts` : `generateEdlFigePdf` renvoie désormais aussi `pageCount` (nombre de pages du PDF généré, via `doc.getPageCount()` de `pdf-lib`), en plus de `pdfBytes`/`filename`
- `lib/quittance.ts` : nouvelle fonction exportée `triggerEdlSignatureWebhook({ apartmentNumber, tenantLastName, edlType, filename, pageCount, webViewLink? })` — envoie une requête `POST` JSON vers l'URL du webhook Make.com lue dans `process.env.MAKE_EDL_SIGNATURE_WEBHOOK_URL` (nouvelle variable d'environnement, à renseigner dans `.env.local`). Renvoie `{ ok, error? }`
- `app/admin/inventory/edlFigePdfActions.ts` : `generateEdlFigePdfAction` appelle `triggerEdlSignatureWebhook` juste après l'enregistrement réussi sur Google Drive, dans un `try/catch` non-bloquant (même pattern que `createCalendarPreavisEvent` dans `app/admin/apartments/[number]/actions.ts`) — un échec ou une absence de configuration du webhook n'empêche jamais la génération/l'enregistrement du PDF de réussir
- Aucune modification de l'interface : le contrat `GenerateEdlFigePdfResult` exposé au composant `EdlFigeView` est inchangé
- Tests : 262 passés / 0 échoués (aucun test supplémentaire requis — `triggerEdlSignatureWebhook` est une fonction d'intégration réseau best-effort, suivant le même principe de non-couverture unitaire que `uploadEdlFigePdfToDrive`/les autres wrappers Google API de `lib/quittance.ts`, dont le contrat côté UI ne change pas) — Build : OK

### 2026-06-08 — Génération du PDF de l'EDL figé : enregistrement direct dans le dossier locataire sur Google Drive (SPEC.md §Page EDL /admin/inventory/edl-fige/)
- **Contexte** : plutôt que de télécharger le PDF généré en local (comportement de l'itération précédente), le bouton "Générer le pdf" enregistre désormais le document directement dans le dossier Google Drive du locataire concerné (`/locataires/[numéro appartement]-[NOM]`), déjà utilisé par les fonctionnalités existantes (lien vers le bail, lien vers l'EDL d'entrée)
- `lib/quittance.ts` : nouvelle fonction exportée `uploadEdlFigePdfToDrive({ aptNumber, tenantLastName, filename, pdfBytes })` — réutilise le helper interne `findTenantFolder` (déjà utilisé par `getDriveTenantFolderUrl`/`getDriveEdlEntryUrl` pour localiser ce même dossier) pour retrouver le dossier locataire existant, puis y crée le fichier PDF (`drive.files.create` avec `media.body: Readable.from(...)`, même pattern que `generateBailAndUploadToDrive`). Renvoie `{ ok, webViewLink?, error? }`. Le nom de fichier produit par `buildEdlPdfFilename` (`[date]_EDLInventaire_[numéro]-[NOM]`) est intentionnellement compatible avec la recherche `_EDLInventaire_` déjà utilisée par `getDriveEdlEntryUrl` pour retrouver ce document
- `app/admin/inventory/edlFigePdfActions.ts` : `generateEdlFigePdfAction` ne renvoie plus les octets du PDF en base64 pour un téléchargement local — elle génère le PDF puis appelle `uploadEdlFigePdfToDrive` et renvoie un résultat typé `GenerateEdlFigePdfResult` (`{ ok: true, filename, webViewLink? } | { ok: false, error }`)
- `components/admin/EdlFigeView.tsx` : `handleGeneratePdf` ne construit plus de `Blob`/lien de téléchargement — elle déclenche la Server Action via `useTransition` et affiche le résultat sous le bouton (pattern repris de `QuittanceCautionButton`) : message de succès "✓ Enregistré sur Google Drive" avec lien cliquable vers le fichier si `webViewLink` est disponible, ou message d'erreur en rouge sinon. Le bouton affiche "Enregistrement…" et se désactive pendant la génération
- `src/components/admin/EdlFigeView.test.tsx` : describe "génération PDF" entièrement réécrit (5 tests : présence du bouton, confirmation avec lien Drive cliquable en mode Entrée, appel avec le type "sortie" après bascule du toggle, confirmation sans lien cliquable si `webViewLink` absent, message d'erreur si l'enregistrement Drive échoue) — remplace les tests de téléchargement local (`Blob`/`<a download>`) devenus obsolètes
- Tests : 262 passés / 0 échoués — Build : OK

### 2026-06-08 — Suppression d'une visite depuis la liste des visites (SPEC.md §Page Mise en location /admin/mise-en-location)
- `app/admin/mise-en-location/visitsActions.ts` (nouveau) : Server Action `deleteVisitAction(visitorId)` — suppression "propre" d'une visite via `createAdminClient()` (clé service role, conformément à `BUSINESS_RULES.md §Accès base de données`) : supprime d'abord les liens `visitor_apartments` du visiteur, détache le visiteur des candidatures éventuellement liées (`candidate_applications.visitor_id = NULL`, sans supprimer la candidature elle-même — cf. `BUSINESS_RULES.md §Funnel visiteur` qui impose des entités `visitor`/`candidate`/`tenant` séparées), puis supprime la ligne `visitors`. Renvoie `{ ok, error? }` et appelle `revalidatePath('/admin/mise-en-location')`
- `app/admin/mise-en-location/VisitsTable.tsx` : ajout d'une colonne "Action" avec un bouton de suppression (✕ rouge, `title="Supprimer la visite"`, conforme au style établi dans `InventoryManager`/`ApartmentKeysPanel`) à côté de chaque visite. Une confirmation `window.confirm` rappelant le nom du visiteur est demandée avant suppression (action irréversible). En cas de succès, la visite est retirée de la liste affichée (avec ajustement de la page courante si la page active devient vide) ; en cas d'échec, un message d'erreur est affiché et la visite reste dans la liste
- `src/app/admin/mise-en-location/VisitsTable.test.tsx` (nouveau) : 8 tests — affichage du message "Aucune visite.", présence du bouton de suppression par visite, demande de confirmation avant suppression (avec le nom du visiteur), annulation de la confirmation (aucun appel à l'action, visite conservée), suppression réussie (retrait de la liste), échec de suppression (message d'erreur affiché, visite conservée), disparition de la dernière visite (retour au message "Aucune visite."), pagination (navigation entre pages au-delà de 5 visites)
- Tests : 261 passés / 0 échoués — Build : OK

### 2026-06-08 — Génération du PDF de l'EDL figé : suppression du bloc de titre et nom de fichier limité au nom de famille (SPEC.md §Page EDL /admin/inventory/edl-fige/)
- `lib/edlFigePdf.ts` : suppression du bloc de titre en première page du PDF généré ("État des lieux d'entrée/de sortie — Appartement n°X" + nom complet du locataire), jugé redondant avec l'en-tête officiel EDL/bail qui suit immédiatement ; le document commence directement sur cette section. La fonction pure `buildEdlPdfFilename` utilise désormais `apt.tenant_last_name` (uniquement le nom de famille, en majuscules) au lieu de `apt.tenant_name` (prénom + nom) dans le nom de fichier généré, au format `[date AAAA-MM-JJ]_EDLInventaire_[numéro appartement]-[NOM]`
- `lib/adminData.ts` : ajout du champ `tenant_last_name` au type `ApartmentWithLease` et à la requête `getApartmentsWithActiveLease` (`UPPER(t.last_name) AS tenant_last_name`) — expose la donnée déjà disponible dans la jointure plutôt que de reparser la chaîne combinée `tenant_name`, qui resterait fragile pour les noms de famille composés
- `src/lib/edlFigePdf.test.ts` : mise à jour des 3 tests de `buildEdlPdfFilename` pour vérifier que seul le nom de famille (`DUPONT`) apparaît dans le nom de fichier généré, sans le prénom
- `src/components/admin/EdlFigeView.test.tsx` : ajout du champ `tenant_last_name: 'DUPONT'` au jeu de données `apt` (requis par le type `ApartmentWithLease` étendu)
- Tests : 253 passés / 0 échoués — Build : OK

### 2026-06-08 — Génération du PDF de l'EDL figé : abandon de l'impression navigateur au profit d'une génération côté serveur avec pdf-lib (SPEC.md §Page EDL /admin/inventory/edl-fige/)
- **Contexte** : malgré les correctifs CSS successifs (passage de `zoom` à `transform: scale`, `@page { size: landscape }`), le bouton "Générer le pdf" continuait à produire un PDF affiché en portrait avec les pages pivotées une fois enregistré et ouvert hors du navigateur, et le nom de fichier suggéré via `document.title` n'était pas repris par la fenêtre d'enregistrement native. Ces deux comportements sont pilotés par le pilote d'impression du navigateur/OS (boîte de dialogue "Imprimer → Enregistrer en PDF"), hors de portée du code web — aucun réglage CSS/HTML/JS ne peut les contrôler de façon fiable. Solution validée avec l'utilisateur : contourner entièrement ce pipeline en générant le PDF directement côté serveur, comme le fait déjà `lib/quittance.ts` pour les quittances
- `lib/edlFigePdf.ts` (nouveau) : génération programmatique du PDF avec `pdf-lib` — pages explicitement créées en format paysage `[842, 595]` (A4 paysage en points, 297×210mm), ce qui garantit une orientation paysage réelle dans le document produit (indépendante de tout pilote d'impression). Dessine le bloc de titre, l'en-tête officiel EDL/bail, les sections Installations/Clés, un tableau Inventaire groupé par pièce (saut de page avant), un tableau Surfaces & équipements, et la section Signatures (saut de page avant, blocs locataire/propriétaire côte à côte) ; gestion automatique des sauts de page et répétition des en-têtes de tableau via un contexte de dessin `Ctx` et un helper générique `drawTable`. Exporte également `buildEdlPdfFilename` (fonction pure, déplacée depuis `EdlFigeView.tsx`) au format `[date AAAA-MM-JJ]_EDLInventaire_[numéro appartement]-[nom locataire]`
- `app/admin/inventory/edlFigePdfActions.ts` (nouveau) : Server Action `generateEdlFigePdfAction(apartmentId, edlType)` — récupère les données de l'appartement/bail/installations/clés/inventaire/surfaces/en-tête, appelle `generateEdlFigePdf`, et renvoie `{ pdfBase64, filename }` (octets encodés en base64 pour le transport vers le client)
- `components/admin/EdlFigeView.tsx` : `handleGeneratePdf` ne déclenche plus `window.print()` mais appelle `generateEdlFigePdfAction`, décode la réponse base64 en `Blob`, et déclenche le téléchargement via un élément `<a download>` temporaire — le nom de fichier exact (renvoyé par le serveur) est ainsi garanti dans la boîte de dialogue d'enregistrement, sans dépendre de `document.title`. L'infrastructure CSS d'impression existante (`edl-print-area`, classes `print:`, sauts de page par section) est conservée telle quelle : elle ne sert plus à la génération du PDF via ce bouton, mais reste utile pour une impression manuelle (Ctrl+P) de la page
- `src/lib/edlFigePdf.test.ts` (nouveau) : 3 tests sur la fonction pure `buildEdlPdfFilename` (date d'entrée en mode Entrée, date de sortie en mode Sortie, repli sur chaîne vide si la date n'est pas renseignée)
- `src/components/admin/EdlFigeView.test.tsx` : describe "génération PDF" entièrement réécrit (4 tests : présence du bouton, déclenchement du téléchargement avec le nom de fichier renvoyé par le serveur en mode Entrée, appel avec le type "sortie" après bascule du toggle, absence de téléchargement si le serveur ne retrouve pas l'appartement) — remplace les anciens tests qui vérifiaient `window.print`/`document.title`, devenus obsolètes
- Tests : 253 passés / 0 échoués — Build : OK

### 2026-06-08 — Impression PDF de l'EDL figé : sauts de page par section et correction de l'orientation paysage (SPEC.md §Page EDL /admin/inventory/edl-fige/)
- `components/admin/EdlFigeView.tsx` : `CollapsibleSection` accepte une nouvelle prop optionnelle `printBreakBefore` qui ajoute `print:break-before-page` sur le conteneur de la section — appliquée aux sections "Inventaire" et "Signatures" pour qu'elles démarrent chacune sur une nouvelle page à l'impression
- `app/globals.css` : remplacement de `zoom: 0.62` par `transform: scale(0.62)` + `transform-origin: top left` + `width: calc(100% / 0.62)` sur `.edl-print-area` — la propriété non standard `zoom`, combinée à `@page { size: landscape }`, produisait un PDF dont la page était orientée portrait avec le contenu pivoté (l'aperçu d'impression affichait correctement le paysage, mais le fichier PDF enregistré s'ouvrait pivoté/portrait sur l'ordinateur de l'utilisateur). La mise à l'échelle via `transform` conserve le même effet de compaction visuelle sans perturber le calcul de l'orientation/format de page lors de l'export PDF, et garantit un véritable rendu paysage à l'ouverture du fichier
- `src/components/admin/EdlFigeView.test.tsx` : 3 nouveaux tests dans le describe "mise en forme impression" — présence de `print:break-before-page` sur les sections Inventaire et Signatures, absence sur les autres sections (ex. Surfaces & équipements)
- Tests : 250 passés / 0 échoués — Build : OK

### 2026-06-08 — Impression PDF de l'EDL figé : compaction supplémentaire du tableau Inventaire (SPEC.md §Page EDL /admin/inventory/edl-fige/)
- `components/admin/EdlFigeView.tsx` : suppression de la colonne "Pièce" et de la sous-information de catégorie ("Meuble ou objet" / "Appareil électrique") dans le tableau Inventaire — l'information de pièce reste disponible via les titres de section qui regroupent déjà les lignes par pièce, ce qui rendait la colonne redondante ; ajustement de `colSpan` (5/4 au lieu de 6/5) et `minWidth` (650/520 au lieu de 750/600) en conséquence
- `src/components/admin/EdlFigeView.test.tsx` : 2 nouveaux tests dans le describe "inventaire" — absence de la colonne "Pièce" dans le tableau Inventaire (avec vérification que l'information de pièce reste affichée une seule fois via les titres de section, en utilisant `within(table)` pour ne pas confondre avec la colonne "Pièce" du tableau Surfaces qui, lui, n'est pas groupé par section et conserve donc cette colonne), absence du texte de catégorie d'item
- Tests : 247 passés / 0 échoués — Build : OK

**Limite signalée** : il n'existe pas de mécanisme web (CSS/HTML/JS) permettant de précocher ou décocher par défaut l'option "En-têtes et pieds de page" de la boîte de dialogue d'impression du navigateur — ce réglage est entièrement piloté par le navigateur et la page web ne peut ni le lire ni le modifier. L'utilisateur souhaitant masquer l'en-tête/pied de page natif doit décocher cette option manuellement dans "Plus de paramètres" lors de l'impression (l'option est généralement décochée par défaut dans Chrome/Edge récents).

### 2026-06-08 — Impression PDF de l'EDL figé : suppression navigation et compaction (SPEC.md §Page EDL /admin/inventory/edl-fige/)
- `components/admin/AdminNavbar.tsx` : ajout de `print:hidden` sur le `<header>` — la barre de navigation "Location Moulinet" disparaît à l'impression sur toutes les pages admin
- `app/admin/inventory/edl-fige/[apartmentId]/page.tsx` : ajout de `print:hidden` sur le conteneur du lien "← Retour à l'inventaire"
- `components/admin/EdlFigeView.tsx` : ajout de la classe `edl-print-area` sur le conteneur principal pour cibler la compaction à l'impression
- `app/globals.css` : règle `@media print { .edl-print-area { zoom: 0.62; } }` — réduit proportionnellement la taille du texte, les interlignes et les marges du contenu de l'EDL pour viser 5-10 pages maximum à l'impression, en complément du format paysage et des classes `print:` déjà en place
- `src/components/admin/AdminNavbar.test.tsx` : nouveau describe "impression" (1 test : `print:hidden` sur le header)
- `src/components/admin/EdlFigeView.test.tsx` : 1 nouveau test vérifiant la présence de la classe `edl-print-area` sur le conteneur principal
- Tests : 245 passés / 0 échoués — Build : OK

**Limite signalée (inchangée)** : la suppression complète de l'en-tête et du pied de page générés par le navigateur lors de l'impression (titre, URL, date, numérotation des pages) reste hors de portée du code web — c'est un réglage de la boîte de dialogue d'impression ("En-têtes et pieds de page" dans "Plus de paramètres"), généralement désactivé par défaut. Si l'utilisateur les voit apparaître, il doit décocher cette option côté navigateur ; aucune CSS/HTML ne permet de les piloter depuis la page.

### 2026-06-08 — Mise en forme de l'impression PDF de l'EDL figé (SPEC.md §Page EDL /admin/inventory/edl-fige/)
- `components/admin/EdlFigeView.tsx` : ajout de classes Tailwind `print:` pour une impression "mise en forme" plutôt qu'une simple capture de la page web — masquage du 1er bloc de titre et de ses boutons (`print:hidden` sur le bandeau Apt/locataire + toggle Entrée-Sortie + bouton "Générer le pdf"), suppression des cadres/ombres/arrondis des sections (`sectionCls` étendu avec `print:rounded-none print:border-0 print:shadow-none print:overflow-visible`), réduction des marges/paddings inutiles (`print:p-2 print:space-y-2` sur les conteneurs), zones de saisie sans cadre ni placeholder visible à l'impression (`printTextareaCls` : `print:border-0 print:shadow-none print:bg-transparent print:resize-none print:px-0 print:placeholder:text-transparent` appliqué à tous les `<textarea>`) ; suppression définitive du badge "État des lieux d'entrée / de sortie" (texte rouge/orange en bas de page), retiré de la page ET de l'impression
- `app/globals.css` : ajout `@page { margin: 1cm; }` en complément du format paysage existant
- `src/components/admin/EdlFigeView.test.tsx` : 3 tests du badge supprimé remplacés par des assertions sur le style actif des boutons Entrée/Sortie (le badge textuel n'existe plus), nouveau describe "mise en forme impression" (5 tests : masquage du bloc titre, présence du bouton PDF dans le bloc masqué, classes `print:` sur les textareas Commentaire sortie, classes `print:` sur les sections, absence définitive du badge de type d'EDL)
- Tests : 243 passés / 0 échoués — Build : OK

**Limite signalée** : la mention de l'URL de la page dans le pied de page imprimé (avec date / titre / numérotation) est générée par le navigateur lui-même via l'option "En-têtes et pieds de page" de la boîte de dialogue d'impression — il n'existe pas de mécanisme web (CSS/HTML) permettant de supprimer sélectivement l'URL tout en conservant la numérotation des pages. Pour l'enlever, l'utilisateur doit décocher "En-têtes et pieds de page" dans "Plus de paramètres" de la boîte de dialogue d'impression (ce qui retire aussi la numérotation, les deux étant liés côté navigateur).

### 2026-06-08 — Génération PDF de l'EDL figé en paysage (SPEC.md §Page EDL /admin/inventory/edl-fige/)
- `components/admin/EdlFigeView.tsx` : nouveau bouton "Générer le pdf" déclenchant l'impression navigateur (`window.print()`) ; nom de fichier suggéré construit via `buildEdlPdfFilename` au format `[date AAAA-MM-JJ]_EDLInventaire_[numéro appartement]-[nom locataire]` (date d'entrée si EDL d'entrée, date de sortie si EDL de sortie), appliqué temporairement sur `document.title` puis restauré à l'évènement `afterprint`
- `app/globals.css` : règle `@media print { @page { size: landscape; } }` pour forcer le format paysage à l'impression
- `src/components/admin/EdlFigeView.test.tsx` : nouveau describe "génération PDF" (4 tests : présence du bouton, nom de fichier en mode Entrée avec appel à `window.print`, nom de fichier en mode Sortie, restauration du titre après `afterprint`)
- Tests : 238 passés / 0 échoués — Build : OK

### 2026-06-05 — EDL figé : bloc locataire dans les signatures (SPEC.md §Page EDL /admin/inventory/edl-fige/)
- `supabase/migrations/20260605_tenant_notes_exit.sql` : nouvelle colonne `tenant_notes_exit TEXT` sur `apartment_installation`
- `lib/adminData.ts` : champ `tenant_notes_exit: string | null` ajouté au type `EdlInstallation`
- `app/admin/inventory/summaryActions.ts` : sélection de `tenant_notes_exit` dans `getInstallationAction` + nouvelle action `updateTenantNotesExitAction`
- `components/admin/EdlFigeView.tsx` : label bailleur renommé en "Bailleur - Commentaires, réserves et retenues éventuelles sur caution :", nouveau bloc "Locataire - Commentaires ou réserves :" avec textarea auto-save (`onBlur`), états `savingDeposit` / `savingTenant` distincts
- `src/components/admin/EdlFigeView.test.tsx` : mock `updateTenantNotesExitAction`, champ `tenant_notes_exit` dans la fixture, 4 nouveaux tests footer (label bailleur, bloc locataire visible en Sortie, masqué en Entrée, pré-remplissage)
- Tests : 50 passés / 0 échoués

### 2026-06-05 — Tous les appartements dans la liste déroulante de l'inventaire (SPEC.md §Page Inventaire)
- `lib/adminData.ts` : nouveau type `ApartmentForInventory` (lease_id et tenant_name nullables) + fonction `getAllApartmentsForInventory()` — LEFT JOIN apartments/leases/tenants, retourne tous les appartements valides non-BUREAU qu'ils aient un bail actif ou non
- `app/admin/inventory/page.tsx` : remplace `getApartmentsWithActiveLease` par `getAllApartmentsForInventory`
- `components/admin/InventoryManager.tsx` : type mis à jour vers `ApartmentForInventory`, label "Vacant" pour les appartements sans locataire, `ApartmentSummaryPanel` conditionnel à `lease_id !== null`
- `src/components/admin/InventoryManager.test.tsx` : données de test `vacantApartments`, 3 nouveaux tests (label Vacant, pas de SummaryPanel, boutons présents)
- Tests : 232 passés — Build : OK

### 2026-06-05 — Catalogue dynamique de surfaces : persistance dans la bibliothèque (SPEC.md §Page Inventaire)
- `app/admin/inventory/surfacesActions.ts` : nouvelle action `getAllDistinctSurfaceNamesAction` — requête `SELECT DISTINCT surface::text` sur toute la table `surfaces`
- `components/admin/SurfacesEdl.tsx` : chargement du catalogue DB au montage (`useEffect` + `getAllDistinctSurfaceNamesAction`), fusion avec `SURFACE_TYPES` via `useMemo` (dédupliqué, trié fr), mise à jour immédiate du catalogue local après ajout d'un nom personnalisé
- `src/components/admin/SurfacesEdl.test.tsx` : mock `getAllDistinctSurfaceNamesAction` ajouté dans tous les `beforeEach`, nouveau describe "catalogue dynamique" (4 tests : appel au montage, noms DB dans dropdown, pas de doublon, mise à jour après ajout)
- Tests : 229 passés — Build : OK

### 2026-06-05 — Ajout de Saladier, Passoire et Porte-serviette à l'inventaire par défaut (SPEC.md §Page Inventaire)
- `app/admin/inventory/defaultData.ts` : nouveau type `DefaultNamedInventoryRow` + export `DEFAULT_INVENTORY_NAMED` (3 items : Saladier / Cuisine, Passoire / Cuisine, Porte-serviette / Salle de bains)
- `app/admin/inventory/defaultActions.ts` : étape find-or-create dans `fillDefaultAction` — pour chaque item nommé, recherche par `name` dans le catalogue `items` ; création automatique si absent ; insertion unitaire dans `inventory`
- `src/app/admin/inventory/defaultActions.test.ts` : mock renforcé (select chaîné, invBulkError / invSingleError distincts), 7 nouveaux tests (item existant, item créé, erreur création, erreur insert, contenu Cuisine / Salle de bains, validation données)
- Tests : 225 passés — Build : OK

### 2026-06-03 — Bouton "Créer un nouvel item dans la bibliothèque" dans Surfaces EDL (SPEC.md §Page Inventaire)
- `components/admin/SurfacesEdl.tsx` : ajout du toggle "+ Créer un nouvel item dans la bibliothèque" dans le formulaire d'ajout — bascule entre le select des types prédéfinis et un champ texte libre ; validation nom vide ; réinitialisation après ajout réussi
- `src/components/admin/SurfacesEdl.test.tsx` : 6 nouveaux tests (affichage toggle, bascule dropdown/texte, annuler création, ajout avec nom libre, erreur nom vide, réinitialisation)
- Tests : 218 passés — Build : OK

### 2026-06-03 — Bouton "Remplir par défaut" sur la page Inventaire (SPEC.md §Page Inventaire)
- `app/admin/inventory/defaultActions.ts` (nouveau) : server action `fillDefaultAction` — insère en masse 87 lignes d'inventaire et 24 surfaces/EDL standards depuis les CSV fournis
- `components/admin/InventoryManager.tsx` : bouton "Remplir par défaut" affiché à droite de "Figer l'EDL" après sélection d'un appartement ; rechargement automatique inventaire + surfaces après succès ; gestion état de chargement et affichage d'erreur
- `src/app/admin/inventory/defaultActions.test.ts` (nouveau) : 8 tests (inserts OK, erreurs inventaire/surfaces, validité données)
- `src/components/admin/InventoryManager.test.tsx` (nouveau) : 9 tests (visibilité bouton, appel action, rechargement, erreur, état disabled)
- Tests nouveaux fichiers : 17 passés — Build : OK

### 2026-06-03 — Correction répartition loyer/charges dans quittance au prorata (spec SPEC.md §Détail appartement)
- `lib/quittanceUtils.ts` (nouveau) : `calcProrataBreakdown()` — calcule la répartition loyer HC / charges proportionnellement au montant reçu, en centimes entiers pour éviter les erreurs de virgule flottante
- `lib/quittance.ts` : `generateQuittancePdf()` utilise désormais `calcProrataBreakdown` au lieu des valeurs brutes du bail
- `src/lib/quittanceUtils.test.ts` : 8 tests (cas plein, prorata entrée/sortie, charges nulles, division par zéro)
- Tests : 195 passés — Build : OK

### 2026-06-03 — Suppression bouton "Contacter" (spec SPEC.md §Détail appartement)
- `app/admin/apartments/[number]/page.tsx` : `<DisabledBtn>Contacter</DisabledBtn>` retiré
- Tests : 187 passés — Build : OK

### 2026-06-02 — Toggle "Candidatures activées" sur /admin/disponibilites (spec SPEC.md §Disponibilités)
- `supabase/migrations/20260602_applications_active.sql` : colonne `applications_active BOOLEAN DEFAULT true` ajoutée à `visit_settings`
- `lib/adminData.ts` : `VisitSettings` + `getVisitSettings()` incluent `applications_active`
- `app/admin/disponibilites/actions.ts` : `setCandidatureActiveAction()` + revalidation `/candidater`
- `app/admin/disponibilites/AvailabilityManager.tsx` : toggle "Candidatures activées" dans la section Paramètres généraux
- `app/candidater/page.tsx` : si `applications_active = false`, affiche le message de suspension (même style que Visiter)
- Tests : 187 passés — Build : OK

### 2026-06-02 — Tableau Linxo : colonnes Date / Montant / Description (spec SPEC.md §Détail appartement)
- `lib/adminData.ts` : `ApartmentLinxoTransaction` — champ `type` remplacé par `montant`, query SQL mise à jour (`SELECT montant` au lieu de `type`)
- `app/admin/apartments/[number]/page.tsx` : colonne "Type" (badge bleu) remplacée par "Montant" (valeur numérique colorée — vert si > 0)
- Tests : 187 passés

### 2026-06-02 — Email automatique liste locataires lors d'une entrée/sortie (spec SPEC.md §Admin)
- Nouvelle fonction `buildTenantListEmailBody()` (pure, testable) dans `lib/quittance.ts`
- Nouvelle fonction `sendTenantListEmail()` : envoie un email à `hmicout@hotmail.com` avec le locataire concerné en gras + liste complète des locataires actifs
- `createBailAction()` : email envoyé automatiquement à la création d'un bail (entrée)
- `savePreavisAction()` : email envoyé automatiquement à la saisie d'un préavis (sortie) — requête SQL étendue pour récupérer titre/prénom/nom/téléphone du locataire
- Les deux appels sont best-effort (`.catch(() => {})`) — non bloquants
- Tests : 10 passés (`buildTenantListEmailBody` — happy path, cas limites, dates, titres, champs manquants)

### 2026-05-26 — EDL figé : renommage titre principal (spec SPEC.md)
- Titre de page "EDL figé — Apt {n}" renommé "Etat des lieux - Apt {n}"
- Tests : 169 passés

### 2026-05-26 — EDL figé : espacement signatures, libellés charges (spec SPEC.md)
- Section Signatures : `space-y-8` → `space-y-1` sur les blocs locataire et propriétaire (titre, nom, "Lu et approuvé" resserrés)
- Label "Charges :" renommé "Relevé des consommations"
- Texte par défaut et placeholder forfait : "Charges au forfait" → "Charges au forfait, aucun relevé des compteurs."
- Tests : 169 passés (mise à jour du test valeur textarea forfait)

### 2026-05-26 — EDL figé : pivot gauche, titre section, ligne Appartement conditionnelle, Signatures (spec SPEC.md)
- `CollapsibleSection` : chevron ▼/▶ déplacé à gauche du titre (cohérent avec ApartmentInstallationPanel)
- Bloc "En-tête" renommé "État des lieux / Inventaire des meubles"
- Ligne "Appartement [numéro]" dans l'entête officiel : affichée uniquement quand `building_short_name === 'Moulinet'`
- Bloc footer renommé "Signatures" (suppression du suffixe "— Entrée" / "— Sortie")
- `summaryActions.ts` : `EdlFigeHeader` étendu avec `building_short_name`, query SQL inclut `b.short_name`
- Tests : 169 passés (3 nouveaux : section title button, appartement conditionnel Moulinet, appartement absent autre building)

### 2026-05-26 — EDL figé : blocs collapsibles, COMMENTAIRE SORTIE surfaces, footer signatures (spec SPEC.md)
- Tous les blocs de la page EDL figé sont désormais pliables/dépliables (chevron toggle, état local par section)
- Nouveau composant `CollapsibleSection` (module-level) utilisé pour Bail/En-tête, Installations, Clés, Inventaire, Surfaces, Signatures
- Surfaces & équipements : colonne "COMMENTAIRE SORTIE" ajoutée en mode Sortie (textarea auto-save via `updateSurfaceNotesExitAction`)
- Bloc footer Signatures en fin de page : date d'entrée/sortie, caution, texte légal, "Fait en 2 exemplaires à Rouen le…", signatures locataire/propriétaire ; en mode Sortie uniquement, textarea "Commentaires, réserves et retenues éventuelles sur caution" (auto-save via `updateDepositNotesAction`)
- Migration `20260526_edl_footer_surfaces.sql` : `surfaces.notes_exit TEXT` + `apartment_installation.deposit_notes TEXT`
- `surfacesActions.ts` : `SurfaceRow` étendu avec `notes_exit`, ajout `updateSurfaceNotesExitAction`
- `adminData.ts` : `EdlInstallation` étendu avec `deposit_notes`
- `summaryActions.ts` : `getInstallationAction` inclut `deposit_notes`, ajout `updateDepositNotesAction`
- Tests : 166 passés (15 nouveaux tests : collapsible, surfaces COMMENTAIRE SORTIE, footer entrée/sortie, signatures)

### 2026-05-26 — EDL figé : en-tête officiel, date sortie conditionnelle, colonne COMMENTAIRE SORTIE, charges éditables (spec SPEC.md)
- `EdlFigeView` : en-tête officiel EDL (titre, adresse, dates, blocs Bailleur et Locataire avec coordonnées) affiché quand le `header` est fourni
- Migration `20260526_edl_fige_enhancements.sql` : ajout colonnes `birth_date, birth_place, address, phone, email` sur `owners` ; colonne `notes_exit TEXT` sur `inventory`
- En mode Entrée : date de sortie masquée dans l'en-tête et dans la section bail de repli
- En mode Sortie : colonne "COMMENTAIRE SORTIE" ajoutée à l'inventaire (textarea auto-save au blur via `updateInventoryNotesExitAction`)
- Section Charges désormais un textarea éditable (auto-save au blur via `updateChargesTypeAction`)
- `summaryActions.ts` : ajout de `getEdlFigeHeaderAction(leaseId)` (JOIN apartments/buildings/owners/tenants), `updateInstallationAction` et `updateChargesTypeAction` inchangés
- `actions.ts` : ajout de `updateInventoryNotesExitAction`, `InventoryRow` étendu avec `notes_exit`
- Page `edl-fige/[apartmentId]/page.tsx` : récupération du header via `getEdlFigeHeaderAction` et passage au composant
- Tests : 151 passés (27 nouveaux/mis à jour : en-tête officiel, date sortie conditionnelle, COMMENTAIRE SORTIE, charges éditables, lecture seule)

### 2026-05-26 — Inventaire : Figer l'EDL + toggle Charges/Compteurs (spec SPEC.md)
- Bouton "Figer l'EDL" dans `InventoryManager` (visible quand un appartement est sélectionné), redirige vers `/admin/inventory/edl-fige/[apartmentId]`
- Nouvelle page `/admin/inventory/edl-fige/[apartmentId]` (server component) : affiche toutes les informations de l'appartement en lecture seule — bail, installations, clés, inventaire, surfaces
- Nouveau composant `EdlFigeView` : toggle Entrée/Sortie, affichage read-only de toutes les sections, badge coloré en bas de page
- Toggle "Charges au forfait" / "Relevé des compteurs" dans `ApartmentInstallationPanel`, persisté en BDD (`charges_type`, `meter_readings` via `updateChargesTypeAction`)
- Zone de texte modifiable pré-remplie avec le template de relevés (auto-save au blur) quand "Relevé des compteurs" est sélectionné
- Migration SQL `20260526_installation_charges.sql` : ajout colonnes `charges_type TEXT DEFAULT 'forfait'` et `meter_readings TEXT` à `apartment_installation`
- Tests : 140 passés (19 nouveaux tests : EdlFigeView + toggle charges ApartmentInstallationPanel)

### 2026-05-25 — Inventaire : ajout et modification des installations (spec SPEC.md)
- `ApartmentInstallationPanel` : section désormais éditable — bouton "Modifier" (si installation existante) ou "+ Ajouter" (si nulle), formulaire inline Eau chaude / Chauffage, sauvegarde via upsert
- `summaryActions.ts` : ajout de `updateInstallationAction(apartmentId, hot_water, heating)` avec upsert sur `apartment_installation`
- Fix config Vitest : suppression de `pool: 'forks'` qui causait des échecs intermittents en mode non-coverage
- Tests : 116 passés (8 nouveaux tests : Modifier/+ Ajouter, pré-remplissage, Annuler, Enregistrer avec args, mise à jour affichage, formulaire vide si null)

### 2026-05-25 — Inventaire : modification quantité clé + caution dans panel dates (spec SPEC.md)
- `ApartmentKeysPanel` : quantité de chaque clé désormais éditable inline (input avec sauvegarde au blur via `updateApartmentKeyQuantityAction`, minimum 1)
- `ApartmentSummaryPanel` : ajout de la section Caution (lease.deposit) dans le panel dates — grille passée à 3 colonnes (Entrée / Sortie / Caution)
- Tests : 108 passés (4 nouveaux tests : modification quantité + validation min + caution montant + caution nulle)

### 2026-05-25 — Inventaire : séparation clés/installations + table key_type (spec SPEC.md)
- Nouvelle table `key_type` (migration `20260525_key_type_table.sql`) avec 4 valeurs : Vigik Immeuble, Porte palière appartement, Boite aux lettres, Cave
- `ApartmentSummaryPanel` simplifié : affiche uniquement les dates Entrée/Sortie du bail
- Nouveau composant `ApartmentKeysPanel` : section collapsible autonome avec liste des clés, ajout (type_type depuis la table, quantité) et suppression optimiste
- Nouveau composant `ApartmentInstallationPanel` : section collapsible autonome eau chaude + chauffage (lecture seule)
- Nouveaux server actions : `app/admin/inventory/keysActions.ts` (getKeyTypes, getApartmentKeys, add, delete), `app/admin/inventory/summaryActions.ts` refactorisé (getLeaseDatesAction, getInstallationAction)
- `InventoryManager` : intègre les 3 nouveaux panneaux dans l'ordre Dates → Clés → Installations → Inventaire → EDL
- Fix config Vitest : ajout `pool: 'forks'` pour résoudre le bug de couverture en parallèle
- Tests : 104 passés (19 nouveaux tests sur ApartmentKeysPanel, ApartmentInstallationPanel, ApartmentSummaryPanel mis à jour)

### 2026-05-25 — Inventaire : panel résumé appartement (spec SPEC.md)
- Nouveau composant `ApartmentSummaryPanel` affiché en haut de page après sélection d'un appartement
- 4 sections : Entrée (move_in_date), Sortie (move_out_inspection_date), Installations (hot_water + heating), Clés (apartment_keys avec qté entrée/sortie éditables)
- Grille responsive : 1 col mobile → 2 col sm → 4 col lg
- Fichiers : `app/admin/inventory/summaryActions.ts`, `components/admin/ApartmentSummaryPanel.tsx`, `components/admin/InventoryManager.tsx`
- Tests : `src/components/admin/ApartmentSummaryPanel.test.tsx` (8 tests)

### 2026-05-23 — EDL surfaces : ajout Plafonnier et Spot (spec SPEC.md)
- `SURFACE_TYPES` : ajout de Plafonnier (Ampoule + Douille), Spot 1 lumière, Spot 2 lumières, Spot 3 lumières (insérés à leur position alphabétique)

### 2026-05-23 — Inventaire/EDL : repliage, nouveaux types Prise, tri Matière (spec SPEC.md)
- `SURFACE_TYPES` : ajout de Prise câble, Prise Fibre, Prise RJ45, Prise téléphone, Prise télévision
- `SURFACE_MATERIALS` : trié alphabétiquement (fr)
- Sections Inventaire et EDL repliables indépendamment (▼/▶ dans le titre)
- Migration `20260523_surfaces_text_columns.sql` : colonnes `surface` et `material` converties en `text` — résout définitivement l'erreur "invalid input value for enum surface_type"
- Tests : 80 passés (5 tests repliage ajoutés)

### 2026-05-23 — EDL surfaces : tri + ajout Bois (spec SPEC.md)
- `SURFACE_TYPES` : liste triée alphabétiquement (fr)
- `SURFACE_MATERIALS` : ajout de Bois
- Migration : `supabase/migrations/20260523_surfaces_material_bois.sql`

### 2026-05-23 — EDL surfaces : nouveaux types et matières (spec SPEC.md)
- `SURFACE_TYPES` : ajout de Prises électriques, Interrupteurs, Point lumière, Ventilation
- `SURFACE_MATERIALS` : ajout de PVC (Peinture était déjà présente)
- Migration : `supabase/migrations/20260523_surfaces_enum_additions.sql`

### 2026-05-23 — EDL surfaces : lien avec room_type (spec SPEC.md)
- Ajout colonne `room` (enum `room_type` existante) sur la table `surfaces`
- `SurfacesEdl` : colonne "Pièce" éditée inline avec la liste complète des `room_type`
- Formulaire d'ajout : champ Pièce optionnel (enum `room_type`)
- `surfacesActions.ts` : `addSurfaceAction`/`updateSurfaceAction` acceptent et persistem `room`
- `lib/surfacesConstants.ts` : export `ROOM_TYPES` (source de vérité partagée avec `InventoryManager`)
- Migration : `supabase/migrations/20260523_surfaces_add_room.sql`
- Tests : `src/components/admin/SurfacesEdl.test.tsx`, `src/lib/surfacesConstants.test.ts` (72 tests, tous verts)

### 2026-05-23 — Inventaire : section État des lieux surfaces & équipements (spec SPEC.md)
- Enums `surface_type` (15 valeurs) et `surface_material` (10 valeurs) + table `surfaces`
- Composant `SurfacesEdl` : ajout/édition inline/suppression de surfaces par appartement
- Colonnes : surface, matière, état (item_condition), commentaire libre
- Affiché sous l'inventaire dès qu'un appartement est sélectionné
- Fichiers : `supabase/migrations/20260523_surfaces_edl.sql`, `app/admin/inventory/surfacesActions.ts`, `components/admin/SurfacesEdl.tsx`, `components/admin/InventoryManager.tsx`

### 2026-05-23 — Inventaire : création à la volée dans la bibliothèque (spec SPEC.md)
- Bouton "+ Créer un nouvel item dans la bibliothèque" dans le formulaire d'ajout
- Formulaire inline : nom, catégorie, pièce par défaut, prix unitaire, main d'œuvre, URL référence
- Après création : item sélectionné automatiquement, ajouté à la liste locale sans rechargement
- Action `createCatalogItemAction` dans `app/admin/inventory/actions.ts`
- Fichiers : `app/admin/inventory/actions.ts`, `components/admin/InventoryManager.tsx`

### 2026-05-23 — Inventaire : état par défaut "Bon état" + recherche (spec SPEC.md)
- Formulaire ajout : état initialisé à "Bon état" au lieu de vide
- Barre de recherche filtrante sur le nom de l'item (liste mise à jour en temps réel)
- Fichier : `components/admin/InventoryManager.tsx`

### 2026-05-22 — Page Inventaire /admin/inventory (spec SPEC.md §Page Mois en cours)
- Table `items` (catalogue) + table `inventory` (lien appartement/items) avec enums `room_type` et `item_condition`
- Trigger `updated_at` sur inventory
- Page /admin/inventory : sélection appartement → inventaire groupé par pièce, trié alphabétiquement
- Ajout items : sélection dans le catalogue, pièce (modifiable), quantité, état
- Modification quantité/pièce/état inline avec bouton "Enregistrer"
- Suppression d'un item
- Script seed `scripts/seed_items.mjs` pour importer `scripts/items.csv` dans Supabase
- Fichiers : `supabase/migrations/20260522_inventory_tables.sql`, `scripts/items.csv`, `scripts/seed_items.mjs`, `lib/adminData.ts`, `app/admin/inventory/actions.ts`, `app/admin/inventory/page.tsx`, `components/admin/InventoryManager.tsx`, `components/admin/AdminNavbar.tsx`

### 2026-05-21 — Préavis : brouillon Gmail confirmation locataire (spec SPEC.md)
- Brouillon Gmail créé automatiquement à la saisie du préavis (best-effort non bloquant)
- Destinataire : email du locataire ; objet : "Préavis de sortie Appartement [n°] - [adresse]"
- Corps HTML : dates fin de bail / EDL, loyer prorata, rappels état des lieux, restitution caution
- Fichiers : `lib/quittance.ts`, `app/admin/apartments/[number]/actions.ts`

### 2026-05-21 — Préavis : mise à jour end_date + loyer prorata (spec SPEC.md)
- `savePreavisAction` : met à jour `leases.end_date = moveOutDate` en plus de `move_out_inspection_date`
- Génère le loyer prorata du mois de départ : `moveOutDay / daysInMonth × rentCC` (arrondi au centime)
- Si un loyer existe déjà pour ce mois → mis à jour (upsert) ; sinon → créé
- Non-bloquant : le préavis est enregistré même si la création du loyer échoue
- Fichier : `app/admin/apartments/[number]/actions.ts`

### 2026-05-21 — Fix déconnexion viewer + date préavis (spec SPEC.md)
- Déconnexion viewer : `/admin/logout` ajouté aux chemins passants dans `proxy.ts` (était intercepté par la restriction viewer et redirigé vers /admin/apartments)
- Préavis : date par défaut = aujourd'hui + 1 mois (getFullYear/getMonth/getDate), plus de contrainte min, n'importe quelle date acceptée
- Fichiers : `proxy.ts`, `components/admin/PreavisButton.tsx`

### 2026-05-14 — Email alerte nouvelle visite (spec SPEC.md §Page Visiter)
- Envoi d'un brouillon Gmail à location.moulinet@gmail.com à chaque nouvelle visite programmée
- Objet : "Nouvelle visite le [date] à [heure]" — Corps : date/heure, appartements, nom/prénom, email, téléphone, situation, garant, revenus, durée souhaitée, commentaires
- Best-effort non bloquant — la réservation est enregistrée même si l'email échoue
- Fichiers : `lib/quittance.ts`, `app/visiter/actions.ts`

### 2026-04-19 — Générateur de quittances à la demande sur /admin/payments (spec SPEC.md)
- Sélection appartement + année + un/plusieurs/tous les mois
- Affiche les montants réels (prorata inclus) par mois
- Génère autant de brouillons Gmail que de mois sélectionnés
- Retour visuel par mois : ✓ brouillon créé ou message d'erreur
- Fichiers : `lib/adminData.ts`, `app/admin/payments/quittancesActions.ts` (nouveau), `components/admin/QuittancesGenerator.tsx` (nouveau), `app/admin/payments/page.tsx`

### 2026-04-19 — Fix régression quittance (spec SPEC.md §Page Détail appartement)
- `markReceivedAndGenerateQuittance` : lecture et mise à jour de `rents` via `runSqlAdmin` au lieu de `createAdminClient()` — bypasse le RLS sans dépendre des policies service_role
- `sendCandidateNotificationEmail` : corrigé pour utiliser `drafts.create` (scope `gmail.compose`) au lieu de `messages.send` (scope `gmail.send` non disponible) — évitait une erreur OAuth pouvant perturber les tokens Google
- Fichiers : `app/admin/apartments/[number]/actions.ts`, `lib/quittance.ts`

### 2026-04-19 — Email notification nouvelle candidature + fix LettingTable mobile (spec SPEC.md)
- Candidater : envoi d'un email à location.moulinet@gmail.com à chaque soumission (objet, nom/prénom, date bail souhaitée, durée 1 an) via Gmail API — best-effort non bloquant
- LettingTable : scroll horizontal sur mobile via `overflow-x-auto` + `minWidth: 560` sur la table principale, les lignes et candidatures sont désormais accessibles sur mobile
- Fichiers : `lib/quittance.ts`, `app/candidater/actions.ts`, `app/admin/mise-en-location/LettingTable.tsx`

### 2026-04-19 — Fix régression filtre home page (disponible/prochainement/loué)
- Root cause : le client anon de la home page ne pouvait plus lire `leases` après activation du RLS (pas de policy anon sur leases)
- Fix : réécriture de `app/page.tsx` via `runSqlAdmin` (bypass RLS) — cohérent avec les autres pages server-side
- La jointure LEFT JOIN sur leases filtre désormais sur baux actifs/futurs uniquement
- `lease_id IS NULL` distingue "pas de bail" de "bail actif sans date de départ" → statuts corrects
- Fichier : `app/page.tsx`

### 2026-04-19 — Page Visiter : filtre créneaux passés + buffer 2h (spec SPEC.md)
- Pour le jour courant, seuls les créneaux >= heure Paris + 2h sont proposés
- Exemple : il est 9h31 → premier créneau proposé est 11h45 (slot >= 11h31)
- Calcul en heure Europe/Paris (pas UTC) pour éviter les décalages DST
- Fichier : `app/visiter/actions.ts`

### 2026-04-19 — Correction sécurité : ré-activation RLS sur toutes les tables
- RLS ré-activé sur les 21 tables (service role bypasse automatiquement, aucune policy nécessaire)
- Corrige la vulnérabilité : clé anon publique ne peut plus accéder directement aux tables via REST API
- Migration : `supabase/migrations/20260419_reenable_rls_all_tables.sql`

### 2026-04-19 — Fix soumission formulaire candidature : limite fichiers + config serveur
- Config `serverActions.bodySizeLimit: '20mb'` dans `next.config.ts` (syntaxe Next.js 16)
- Validation côté client : max 5 Mo par fichier, max 18 Mo total — message d'erreur explicite
- Barre de progression du poids total visible en temps réel (bleu → orange → rouge)
- Compression images inchangée (canvas 1400px JPEG 75%)
- Fichiers : `next.config.ts`, `components/CandidateForm.tsx`

### 2026-04-19 — Admin mobile-first : hamburger menu + sidebars responsive
- `AdminNavbar` (client component) : hamburger animé sur mobile, dropdown vertical, nav horizontale sur desktop ≥768px
- Page détail candidat : sidebar droite empilée verticalement sur mobile (`flex-col lg:flex-row`, `w-full lg:w-72`)
- `LettingTable` : tableau des candidatures expandable avec `overflow-x-auto` + `minWidth: 600`
- Fichiers : `components/admin/AdminNavbar.tsx` (nouveau), `app/admin/layout.tsx`, `app/admin/mise-en-location/candidats/[id]/page.tsx`, `app/admin/mise-en-location/LettingTable.tsx`

### 2026-04-19 — Désactivation RLS sur toutes les tables serveur
- Root cause : nouveau format de clé Supabase (`sb_publishable_*`) empêche le bypass RLS via `createAdminClient()`
- Toutes les tables accédées uniquement via Server Actions Next.js ont leur RLS désactivé (21 tables)
- Migration : `supabase/migrations/20260419_disable_rls_all_server_tables.sql`

### 2026-04-18 — Navbar mobile-first avec menu hamburger
- Menu hamburger (3 lignes animées → croix) sur mobile (<768px), dropdown vertical avec tous les liens + switch FR/EN
- Navigation horizontale conservée sur desktop (≥768px)
- Standards mobile-first ajoutés à `AGENTS.md` (NAVBAR/GRILLE/HERO/Règles générales)
- Fichiers : `components/Navbar.tsx`, `AGENTS.md`

### 2026-04-18 — Page détail appartement : boutons et coches (spec SPEC.md)
- Boutons "Nous contacter" et "Visiter" : taille réduite (py-2 px-4 text-sm rounded-lg), espacement mt-2 entre les deux
- Conditions de location : remplacement des bullets • par des coches ✓ (même style que le bloc Loyer mensuel)
- Fichiers : `components/ApartmentDetail.tsx`

### 2026-04-18 — Header responsive + bouton Visiter sur détail appartement (spec SPEC.md)
- Navbar : suppression des liens "Appartements" et "Contact", whitespace-nowrap sur le titre et les boutons, gap réduit sur mobile
- Page détail appartement : ajout du bouton "Visiter" / "Book a visit" sous le bouton "Nous contacter", lien vers /visiter
- Fichiers : `components/Navbar.tsx`, `components/ApartmentDetail.tsx`

### 2026-04-14 — Attestation CAF (spec SPEC.md §Page Détail d'un appartment)
- Bouton "Attestation CAF" activé sur la page /admin/apartments/[num] (section Documents)
- Génère un PDF "ATTESTATION DE LOYER" (sections bailleur, locataire, logement, loyer mensuel + signature)
- Upload du PDF dans le dossier Drive du locataire (best-effort, non bloquant)
- Crée un brouillon Gmail avec le PDF en pièce jointe, destinataire = email locataire
- Objet : "Votre attestation de loyer pour la CAF"
- Nom fichier : `yyyy-mm_AttestationCAF_[numéro appt]-[NOM].pdf`
- Infos contact propriétaire hardcodées par immeuble (Vieux Palais → FRANCOIS, autres → ALAOUI)
- Fichiers : `lib/quittance.ts`, `app/admin/apartments/[number]/actions.ts`, `components/admin/AttestationCafButton.tsx`, `app/admin/apartments/[number]/page.tsx`

### 2026-04-14 — Détail appartement : Linxo au lieu de transactions + ordre Paiements (spec SPEC.md)
- Page /admin/apartments/[num] : bloc "Transactions récentes" remplacé par "Transactions Linxo" (filtrées par apartment_num), colonnes Date / Type / Description
- Nouvelle fonction `getLinxoTransactionsForApartment()` dans adminData.ts
- Page /admin/payments : Transactions Linxo affichée en premier, puis Transactions
- Fichiers : `lib/adminData.ts`, `app/admin/apartments/[number]/page.tsx`, `app/admin/payments/page.tsx`

### 2026-04-14 — Scripts de sauvegarde/restauration base de données (spec SPEC.md)
- `scripts/backup.mjs` : exporte toutes les tables (26) en JSON horodaté dans `backups/`
- `scripts/restore.mjs` : restaure depuis un fichier JSON (TRUNCATE CASCADE + INSERT par chunks de 200)
- Lecture automatique de `.env.local` (pas besoin de passer les vars à la main)
- `/backups/` ajouté au `.gitignore`
- Usage : `node scripts/backup.mjs` / `node scripts/restore.mjs backups/backup_YYYY-MM-DDTHH-MM-SS.json`

### 2026-04-14 — LinxoTable : fix requête locataires (GROUP BY + bool_or, sans CTE) (spec SPEC.md)
- Réécriture de `getTenantOptions()` sans CTE ni window functions (incompatibles avec run_sql RPC)
- Utilise GROUP BY + bool_or pour détecter les locataires actuels, COALESCE pour préférer l'appt actuel
- Fichiers : `lib/adminData.ts`

### 2026-04-14 — LinxoTable : fix requête locataires + ajout CAUTION (spec SPEC.md)
- Fix requête `getTenantOptions()` : utilise ROW_NUMBER() + cast sécurisé pour éviter crash SQL silencieux
- Locataires actuels en premier (triés par appt), puis anciens locataires — groupés en optgroup
- Ajout de "CAUTION" dans les types disponibles (colonne Type et filtre)
- Fichiers : `lib/adminData.ts`, `components/admin/LinxoTable.tsx`

### 2026-04-14 — LinxoTable : dropdown Locataire inclut les anciens locataires (spec SPEC.md)
- `getTenantOptions()` retourne maintenant tous les locataires (actuels + anciens), triés : actuels par appt croissant, puis anciens par nom
- `TenantOption` : ajout du champ `is_current: boolean`
- `SelectCell` : supporte les `<optgroup>` via un prop `groups`
- Dropdown Locataire (cellule + filtre) : groupes "Locataires actuels" / "Anciens locataires"
- Fichiers : `lib/adminData.ts`, `components/admin/LinxoTable.tsx`

### 2026-04-14 — LinxoTable : filtre Type, tri locataires par appt, Appt sans dropdown (spec SPEC.md)
- Filtre Type ajouté (liste déroulante alphabétique : ACHAT, ENTRETIEN, GESTION, IMPOTS, INTERNE, LOYER, PRET, SERVICES, TRAVAUX)
- Liste déroulante Locataire dans les lignes triée par numéro d'appartement croissant
- Colonne Appt : plus de liste déroulante (texte lecture seule, déjà fait cycle précédent)
- Fichiers : `components/admin/LinxoTable.tsx`, `lib/adminData.ts`

### 2026-04-14 — LinxoTable : tri toutes colonnes, Type dropdown, Appt en lecture seule (spec SPEC.md)
- Toutes les colonnes désormais triables (Fournisseur, Type, Description, Appt, Locataire, Validé)
- Colonne Type remplacée par une liste déroulante (LOYER, ACHAT, ENTRETIEN, GESTION, IMPOTS, INTERNE, PRET, SERVICES, TRAVAUX)
- Colonne Appt en lecture seule (texte), mise à jour automatique lors du choix du locataire
- Suppression de `apartmentOptions` (plus nécessaire)
- Fichiers : `components/admin/LinxoTable.tsx`, `app/admin/payments/page.tsx`

### 2026-04-14 — Filtres Fournisseur/Locataire + dropdowns Appt/Locataire dans LinxoTable (spec SPEC.md)
- Filtre Fournisseur (liste déroulante dynamique depuis les données)
- Filtre Locataire (liste déroulante depuis les locataires actifs)
- Colonne Appt : remplacée par une `SelectCell` liée aux appartements réels
- Colonne Locataire : remplacée par une `SelectCell` liée aux locataires actifs ; sélection auto-remplit apartment_num
- Fichiers : `components/admin/LinxoTable.tsx`, `lib/adminData.ts`, `app/admin/payments/page.tsx`

### 2026-04-14 — Catégorisation transactions Linxo (spec SPEC.md)
- Nouveaux champs sur `transactions_linxo` : supplier, type, description, apartment_num, tenant_name, validated
- Table `linxo_mappings` avec ~120 mappings libellé → type + fournisseur (migration SQL)
- Catégorisation automatique : priorité locataire/garant → mappings table
- Apprentissage : validation d'une transaction insère un nouveau mapping si absent
- UI : colonnes éditables inline (clic → input → blur/Enter), case à cocher Validé
- Filtre "Validé" dans la barre de filtres, lignes validées en fond vert
- Bouton "Catégoriser" qui appelle POST /api/admin/categorize-linxo
- Règles documentées dans BUSINESS_RULES.md §Catégorisation des transactions Linxo
- Fichiers : `supabase/migrations/20260414_categorisation_linxo.sql`, `lib/linxoCategorization.ts`, `app/api/admin/categorize-linxo/route.ts`, `app/api/admin/linxo-transactions/[id]/route.ts`, `components/admin/LinxoTable.tsx`, `lib/linxoImport.ts`

### 2026-04-14 — Tableau de bord annuel : corrections bar chart (spec SPEC.md)
- Filtre bâtiment : même style avec bordures que le filtre Affichage (BUILDING_TOGGLE_COLORS)
- Correction hydration error : suppression de `<title>` dans `<rect>` SVG (locale-dépendant)
- Fichiers : `components/admin/CaBarChartClient.tsx`

### 2026-04-14 — Tableau de bord annuel : bar chart CA mensuel (spec SPEC.md)
- Bar chart SVG du CA encaissé par mois sur l'année, barres empilées par bâtiment
- Filtre bâtiment (toggles dynamiques, tous actifs par défaut)
- Deux modes d'affichage : Loyers CC (montant reçu) et Loyers HC (reçu - charges)
- YTD dynamique selon filtres actifs
- Fichiers : `lib/adminData.ts` (getCaByMonth), `components/admin/CaBarChartClient.tsx` (nouveau), `app/admin/page.tsx`

### 2026-04-14 — Mois en cours : filtres Occupation + Bâtiment dans section Loyers (spec SPEC.md)
- Section Loyers remplacée par composant client `MoisLoyersClient`
- Filtre Occupation (Loué / Disponible / Départ prévu) identique à la page Appartements
- Filtre Bâtiment (toggles dynamiques issus des données, tous actifs par défaut)
- CA encaissé et pie chart réactifs aux deux filtres combinés
- Fichiers : `components/admin/MoisLoyersClient.tsx` (nouveau), `app/admin/mois/page.tsx`

### 2026-04-14 — Corrections UX vitrine + formulaire nouveau bail (spec SPEC.md)
- Vitrine appartement : bloc "Conditions de location" rendu sticky avec le bloc loyer (colonne droite entière sticky)
- Formulaire nouveau bail : tous les champs obligatoires (required HTML5 + label avec *)
- Fichiers : `components/ApartmentDetail.tsx`, `app/admin/apartments/[number]/nouveau-bail/NouveauBailForm.tsx`

### 2026-04-14 — Saisie manuelle d'un bail (spec SPEC.md)
- Nouvelle page `/admin/apartments/[number]/nouveau-bail` avec formulaire complet
- Sections : Bail, Locataire, Garant (optionnel via checkbox)
- Champs bail : date signature (peut être dans le passé), date EDL entrée, durée, loyer HC/charges/CC, caution, type résidence, type bail, notes
- Champs locataire : civilité, prénom/nom, email, téléphone, date/lieu de naissance, situation familiale
- Champs garant : civilité, prénom/nom, email, téléphone, date/lieu de naissance, adresse
- Bouton "+ Créer un bail" affiché sur la fiche appartement quand vacant
- Redirection vers la fiche appartement après création
- Fichiers : `app/admin/apartments/[number]/nouveau-bail/page.tsx`, `NouveauBailForm.tsx`, `actions.ts`
- Modifié : `app/admin/apartments/[number]/page.tsx`

### 2026-04-13 — Nettoyage base et code mort (spec SPEC.md)
- Script SQL de truncate des tables de test : `supabase/migrations/20260413_truncate_test_data.sql`
- Suppression de la route morte `/admin/visitors` (remplacée par mise-en-location)
- Inspection complète : toutes les autres tables et colonnes sont effectivement utilisées dans le code
- Fichiers supprimés : `app/admin/visitors/page.tsx`

### 2026-04-13 — Linxo : ajout source Vieux Palais (spec SPEC.md)
- Détection du fichier `vieux palais.csv` (variantes : vieuxpalais, vieux-palais, vieux_palais)
- Badge amber dans la table, option dans le filtre Source
- Fichiers : `lib/linxoImport.ts`, `components/admin/LinxoTable.tsx`

### 2026-04-13 — Linxo : filtres, tri et colonnes (spec SPEC.md)
- Colonnes affichées : Date, Montant, Libellé, Note, Catégorie, Source (Compte supprimé)
- Tri sur toutes les colonnes (clic sur l'en-tête)
- Recherche texte sur Libellé et Note
- Filtres déroulants Catégorie (dynamique) et Source
- Fichiers : `components/admin/LinxoTable.tsx`

### 2026-04-13 — Paiements : pagination + import Linxo (spec SPEC.md)
- Pagination 10 éléments/page sur la table Paiements (contrôles précédent/suivant + numéros de pages)
- Table `transactions_linxo` : colonnes Date, Libellé, Catégorie, Montant, Notes, N° de chèque, Labels, Nom du compte, Nom de la connexion, source, fingerprint, imported_at
- Import depuis Google Drive (dossier 1PRij2TBgU1I8e7jI5ubnS5Cd-T5-cJmQ) : lit les CSV moulinet/bonsenfants/perso, parse le format Linxo (date DD/MM/YYYY, montant français), déduplique par fingerprint SHA-256
- Bouton "Importer depuis Drive" avec filtre par source + pagination propre
- Migration SQL : `supabase/migrations/20260413_transactions_linxo.sql`
- Fichiers : `lib/linxoImport.ts`, `app/api/admin/import-linxo/route.ts`, `app/api/admin/linxo-transactions/route.ts`, `components/admin/PaymentsClient.tsx`, `components/admin/LinxoTable.tsx`, `app/admin/payments/page.tsx`

### 2026-04-13 — Tableau de bord : déplacement "Occupation" vers Mois en cours (spec SPEC.md)
- Section "Occupation" (stat cards Total/Loués/Disponibles/Départ prévu) déplacée de `/admin` vers `/admin/mois`
- Fichiers : `app/admin/page.tsx`, `app/admin/mois/page.tsx`

### 2026-04-13 — Tableau de bord : séparation en deux pages (spec SPEC.md)
- `/admin` → "Tableau de bord annuel" : occupation (stat cards), indicateurs annuels (CA YTD, taux, durée), calendrier
- `/admin/mois` → "Mois en cours" : génération des loyers, CA mois, camembert payé/impayé, départs dans 30 jours
- Navigation mise à jour avec les deux liens
- Fichiers : `app/admin/page.tsx`, `app/admin/mois/page.tsx`, `app/admin/layout.tsx`

### 2026-04-13 — Calendrier : démarrage du prévisionnel (spec SPEC.md)
- Correction : pour les baux futurs (signing_date > aujourd'hui), le segment pointillé démarrait à la position d'aujourd'hui au lieu de la date de début du bail
- Ex: appt 31 GAZAGNES (24/05/2026) → pointillé commence en mai, pas en avril
- Fichiers : `app/admin/page.tsx`

### 2026-04-13 — Calendrier : appartements manquants (spec SPEC.md)
- Correction du filtre SQL : `a.type != 'BUREAU'` → `(a.type IS NULL OR a.type::text != 'BUREAU')` — les appartements sans type étaient exclus
- Correction du JOIN : utilisation de `move_out_inspection_date` seul (sans COALESCE avec end_date) — un bail dont end_date est expiré mais sans départ effectif était exclu à tort
- Idem dans l'export CSV
- Fichiers : `lib/adminData.ts`, `app/api/admin/export-leases/route.ts`, `app/admin/page.tsx`

### 2026-04-13 — Export CSV : corrections (spec SPEC.md)
- Sélecteur d'année : plage 2016 → année en cours (ordre décroissant), au lieu de ±2 ans
- Loyer HC, Charges, Loyer CC : COALESCE sur les valeurs de l'appartement quand le bail ne les renseigne pas
- Fichiers : `components/admin/ExportLeasesButton.tsx`, `app/api/admin/export-leases/route.ts`

### 2026-04-13 — Calendrier : export CSV des baux par année (spec SPEC.md)
- Bouton "Exporter CSV" avec sélecteur d'année (±2 ans) dans l'en-tête du calendrier
- Route API `/api/admin/export-leases?year=YYYY` : génère un CSV UTF-8 avec BOM (compatible Excel)
- Colonnes : Appartement, Nom Prénom, Date entrée, Date sortie, Loyer HC, Charges, Loyer CC, Date de naissance
- Un appartement avec plusieurs locataires dans l'année génère plusieurs lignes
- Fichiers : `app/api/admin/export-leases/route.ts`, `components/admin/ExportLeasesButton.tsx`, `app/admin/page.tsx`

### 2026-04-13 — Calendrier : nom dans pointillés + zones cliquables (spec SPEC.md)
- Nom du locataire affiché aussi dans les zones prévisionnelles (pointillées), en couleur
- Chaque barre (solide ou pointillée) est cliquable vers /admin/apartments/{number}
- Fichiers : `app/admin/page.tsx`

### 2026-04-13 — Calendrier : positionnement au jour près + label sans numéro (spec SPEC.md)
- Positionnement des barres au jour près (helpers startDayPct/endDayPct) — un bail démarrant le 15 commence visuellement au milieu de la colonne du mois
- Suppression du numéro d'appartement dans la barre colorée (nom du locataire uniquement)
- Fichiers : `app/admin/page.tsx`

### 2026-04-13 — Calendrier : vue prévisionnelle en pointillés (spec SPEC.md)
- Segment solide = occupation confirmée (passé jusqu'à aujourd'hui)
- Segment pointillé = prévisionnel futur :
  - Sans date de départ → barres pointillées jusqu'en décembre
  - Avec date de départ programmée → barres pointillées jusqu'à cette date, vide après
  - Locataire parti (move_out dans le passé) → barre pleine seulement
- `CalendarLease` : `lease_end` → `end_date` + `move_out_date` séparés
- Fichiers : `lib/adminData.ts`, `app/admin/page.tsx`

### 2026-04-13 — Dashboard : calendrier d'occupation + script purge (spec SPEC.md)
- **Calendrier occupation** : vue annuelle en bas du dashboard — une ligne par appartement, barres colorées par locataire, appartements vacants affichés vides
- Nouvelle fonction `getCalendarLeases(year)` dans `lib/adminData.ts`
- Composants `OccupationCalendar` et `buildCalendarRows` ajoutés dans `app/admin/page.tsx`
- **Script purge** : `scripts/purge_visites_candidatures.py` — supprime en cascade visitors/candidates dans Supabase et les dossiers Drive dans /candidats
- Fichiers : `lib/adminData.ts`, `app/admin/page.tsx`, `scripts/purge_visites_candidatures.py`

### 2026-04-13 — Mise en location : lien "Page Disponibilités" (spec SPEC.md)
- Renommage "Page visites →" → "Page Disponibilités →" dans le header de la page mise-en-location
- Fichiers : `app/admin/mise-en-location/page.tsx`

### 2026-04-13 — Multiples ajustements UI (spec SPEC.md)
- **Navbar** : "Prendre RDV" → "Visiter" ; ajout bouton "Déposer mon dossier" (→ /candidater)
- **Home** : suppression du bouton "Prendre rendez-vous pour une visite" sous le filtre
- **CandidateActions** : bouton "Plus intéressé" reste visible à l'état `accepted` (disparaît seulement après "Bail signé")
- **Admin header** : suppression du lien "Visites" ; ordre → Mise en location, Appartements, Paiements, Tableau de bord
- **Dashboard** : "locataires payés" → "locataires ont payé"
- **Détail appartement** : vignette "Départ prévu" (amber) alignée à droite dans la ligne de titre si `move_out_date` renseigné
- **Mise en location** : ajout du lien "Page visites →" (→ /admin/disponibilites) dans le header de la page
- **Visites** : URL `/admin/visites` → `/admin/disponibilites` (dossier renommé, revalidatePath mis à jour)
- Fichiers : `components/Navbar.tsx`, `components/HomeClient.tsx`, `CandidateActions.tsx`, `app/admin/layout.tsx`, `app/admin/page.tsx`, `app/admin/apartments/[number]/page.tsx`, `app/admin/mise-en-location/page.tsx`, `app/admin/disponibilites/` (ex-visites)

### 2026-04-12 — PDF bail : description appartement depuis apartments.description (spec SPEC.md)
- `{{description_appartement}}` remplacé par `apartments.description` au lieu du champ calculé type/surface/étage
- Fichiers : `lib/quittance.ts`

### 2026-04-12 — PDF bail : déplacement vers dossier candidat au clic "Choisir" (spec SPEC.md)
- PDF généré au clic "Choisir" (`accepted`) via `updateApplicationStatusAction` au lieu de `signLeaseAction`
- Données candidat/garant/appartement récupérées depuis la DB dans `updateApplicationStatusAction`
- PDF enregistré dans `/candidats/[aptNum]-[NOM]/` (via `GDRIVE_CANDIDATES_FOLDER_ID`) au lieu de `/locataires/`
- Fichiers : `lib/quittance.ts`, `app/admin/mise-en-location/candidats/[id]/actions.ts`

### 2026-04-12 — Génération PDF bail depuis template Google Docs (spec SPEC.md)
- `generateBailAndUploadToDrive()` dans `lib/quittance.ts` : copie le template Docs, remplace les champs `{{FIELD}}`, exporte en PDF, upload dans le dossier Drive du locataire
- 2 templates : sans garant (`GDOCS_BAIL_SANS_GARANT_ID`) et avec garant (`GDOCS_BAIL_AVEC_GARANT_ID`)
- Déclenché au clic "Bail signé" en step 11 de `signLeaseAction` (non-bloquant)
- Fichier nommé : `{signing_date}_Bail_{aptNum}-{NOM}.pdf`
- Garant : ajout de `title`, `birthDate`, `birthPlace`, `address` dans les opts de `signLeaseAction` et le type de `CandidateActions`
- Scope Google requis : `https://www.googleapis.com/auth/documents` (pour batchUpdate Docs API)
- Fichiers : `lib/quittance.ts`, `app/admin/mise-en-location/candidats/[id]/actions.ts`, `CandidateActions.tsx`, `page.tsx`

### 2026-04-12 — Corrections insurance_attestation, URLs Docusign, déplacement checkbox (spec SPEC.md)
- `insurance_attestation` déplacé de `tenants` vers `leases` (migration `add_insurance_attestation_to_leases.sql`)
- `InsuranceCheckbox` : prop `tenantId` → `leaseId`, action cible `leases`
- DocuSign URLs : normaliseur (UUID → URL complète, ajout `https://` si manquant), placeholder correct `apps.docusign.com/send/documents/details/…`
- Case attestation déplacée du bloc Locataire vers le bloc Bail (sous les liens Docusign)
- Fichiers : `scripts/add_insurance_attestation_to_leases.sql`, `lib/adminData.ts`, `actions.ts`, `InsuranceCheckbox.tsx`, `DocusignUrls.tsx`, `page.tsx`

### 2026-04-12 — Attestation assurance, caution payée, DocuSign, renommage lien EDL (spec SPEC.md)
- Locataire : case "Attestation d'assurance fournie" cochable en temps réel (colonne `tenants.insurance_attestation`)
- Documents : remplace bouton "Quittance de caution" par case "Caution payée ?" avec montant caution ; cochage propose de générer la quittance (colonne `leases.deposit_paid`)
- Bail : lien DocuSign "Bail signé sur Docusign" si envelope trouvée
- EDL : lien DocuSign "EDL Entrée sur Docusign" si envelope trouvée ; renommage "PDF d'entrée → Ouvrir l'EDL d'entrée sur Google Drive"
- DocuSign : stockage manuel des URLs (colonnes `leases.docusign_lease_url` / `docusign_edl_url`) — composant `DocusignUrls` avec 2 champs éditables dans le bloc Bail
- Migrations SQL : `scripts/add_insurance_deposit_paid.sql` + `scripts/add_docusign_urls.sql`
- Fichiers : `lib/adminData.ts`, `lib/docusign.ts`, `app/admin/apartments/[number]/page.tsx`, `app/admin/apartments/[number]/actions.ts`, `components/admin/InsuranceCheckbox.tsx`, `components/admin/DepositPaidCheckbox.tsx`

### 2026-04-11 — Page confirmation visite enrichie + description agenda (spec SPEC.md)
- Page confirmation `/visiter` : affiche date, heure, adresse, contact complet, instructions et conditions
- Description événement Google Agenda : "Visite programmée appartement(s) : ..." (suppression de "de l'(des)")
- `AvailabilityData` étendu avec `contactName/Phone/Email/Website` passés depuis `page.tsx`
- Fichiers : `components/VisitorForm.tsx`, `app/visiter/page.tsx`, `lib/quittance.ts`

### 2026-04-10 — Prorata loyer 1er mois à la signature du bail (spec SPEC.md)
- "Bail signé" génère maintenant la 1ère ligne `rents` avec prorata si signing_date > 1er du mois
- Formule : `prorataDays = daysInMonth - signingDay + 1`, `amount = round(prorataDays / daysInMonth × loyer CC, 2)`
- Récupération du `rent_including_charges` depuis la jointure `candidate_applications → apartments`
- Règle de prorata documentée dans `BUSINESS_RULES.md §Loyers et prorata`
- Fichiers : `app/admin/mise-en-location/candidats/[id]/actions.ts`, `BUSINESS_RULES.md`

### 2026-04-10 — Fix statuts candidats dans LettingTable + nomenclature Drive (spec SPEC.md)
- LettingTable : statuts en français (Nouvelle/Acceptée/Rejetée/Plus intéressé/Bail signé), couleurs cohérentes avec page détail (Bleu/Vert/Rouge/Gris/Vert foncé)
- `moveCandidateFolderToTenants` : ne renomme plus le dossier, conserve `{aptNum}-NOM` dans `/locataires`
- Fichiers : `app/admin/mise-en-location/LettingTable.tsx`, `lib/quittance.ts`

### 2026-04-10 — Actions candidat : Rejeter/Choisir/Plus intéressé/Bail signé (spec SPEC.md)
- `/candidater` : lookup visiteur rendu strictement non-bloquant (try/catch)
- Bloc "Demande de bail" : ajout durée de location souhaitée du visiteur (`desired_duration_months`)
- Boutons Actions refondus : "Rejeter" et "Choisir" mettent à jour le statut candidat ET le statut visiteur lié (best-effort)
- Nouveau bouton "Plus intéressé" : statut `withdrawn`, désactive toutes les actions après
- Après "Choisir" : bouton "Bail signé" → crée locataire, bail, `lease_tenants`, garant si présent, déplace dossier Drive `/candidats` → `/locataires`, marque candidature `signed`
- Tous les statuts terminaux (`accepted`, `rejected`, `withdrawn`, `signed`) affichent un message et désactivent les boutons
- Nouveaux statuts : `withdrawn`, `signed` dans `candidate_applications` (script `scripts/add_candidate_statuses.sql`)
- `lib/quittance.ts` : nouvelle fonction `moveCandidateFolderToTenants` (déplace + renomme dossier Drive)
- Fichiers : `app/candidater/actions.ts`, `lib/adminData.ts`, `lib/quittance.ts`, `app/admin/mise-en-location/candidats/[id]/actions.ts`, `CandidateActions.tsx`, `page.tsx`

### 2026-04-10 — Liaison candidat/visiteur + refonte page détail candidat (spec SPEC.md)
- Nouveau script SQL : `scripts/add_visitor_link.sql` — colonne `visitor_id` dans `candidate_applications`
- `createCandidateAction` : recherche un visiteur par email (exact) puis téléphone (9 derniers chiffres) et enregistre le lien `visitor_id` à la création
- `getCandidateDetail` : enrichi avec les données du visiteur lié (visit_date, visit_time, total_income, comments)
- Page détail candidat : layout 2 colonnes, "Demande de bail" remonté en premier, infos visiteur intégrées dedans (date visite, revenus, commentaires), statut retiré du bloc demande
- Nouveau bloc Actions (colonne droite) : case "Revenus vérifiés" + boutons "Rejeter" / "Choisir" activés uniquement si cochée
- Documents déplacés en colonne droite sous Actions
- Nouvelles fichiers : `app/admin/mise-en-location/candidats/[id]/actions.ts`, `CandidateActions.tsx`
- Fichiers modifiés : `lib/adminData.ts`, `app/candidater/actions.ts`, `app/admin/mise-en-location/candidats/[id]/page.tsx`

### 2026-04-10 — Corrections mise en location post-QA (spec SPEC.md)
- Fix "Invalid date" : `ca.created_at::text` → `::date::text` dans `getRecentCandidates` et `getCandidateDetail` (timestamp complet incompatible avec fmtDate)
- Fix "Dossier reçu le" dans le détail candidat : utilise désormais `ca.created_at` (date de la demande) et non `c.created_at` (date d'enregistrement du candidat)
- Fix React key warning : `<>` → `<Fragment key={apt.id}>` dans LettingTable
- Fix statut "Nouvelle" non propagé : corrigé dans la page détail candidat (STATUS_LABELS + STATUS_COLORS cohérents avec LettingTable)
- Script SQL de nettoyage du schéma : `scripts/cleanup_candidates_schema.sql` — supprime colonnes orphelines (`apartment_id`, `desired_signing_date`, `visitor_id`, colonnes `g_*`) dans `candidates` si elles existent
- Fichiers : `lib/adminData.ts`, `app/admin/mise-en-location/LettingTable.tsx`, `app/admin/mise-en-location/candidats/[id]/page.tsx`, `scripts/cleanup_candidates_schema.sql`

### 2026-04-10 — Améliorations mise en location + fix candidater (spec SPEC.md)
- Fix bug UUID "undefined" sur page détail candidat : `params` est une Promise en Next.js 15, ajout de `await params`
- Statut candidature "Nouvelle" remplace "En attente"
- Appartements + candidatures fusionnés en un seul accordion : clic sur une ligne d'appartement déplie les candidatures
- Suppression du lien "Fiche →" dans la section appartements
- Visites : affichage de toutes les visites avec pagination 5 items/page (composant client)
- CandidateForm : bloc "Vos justificatifs" masqué jusqu'à ce qu'une valeur soit sélectionnée pour "Avez-vous un garant ?"
- Nouveaux composants : `LettingTable.tsx`, `VisitsTable.tsx` (client components)
- Fichiers : `app/admin/mise-en-location/page.tsx`, `app/admin/mise-en-location/LettingTable.tsx`, `app/admin/mise-en-location/VisitsTable.tsx`, `app/admin/mise-en-location/candidats/[id]/page.tsx`, `lib/adminData.ts`, `components/CandidateForm.tsx`

### 2026-04-10 — Tableau de bord mise en location /admin/mise-en-location (spec SPEC.md)
- Nouvelle page `/admin/mise-en-location` remplaçant `/admin/visitors`
- KPIs : visites en attente / total, candidatures en attente / total, appartements disponibles, prochainement libres
- Section appartements disponibles ou prochainement libres avec compteurs visites et candidatures
- Section candidatures regroupées par appartement avec accès au détail
- Page de détail candidat `/admin/mise-en-location/candidats/[id]` : infos perso, garant, demande de bail, documents Drive cliquables
- Section visites récentes (10 dernières)
- Nav admin : "Visites" → "Mise en location"
- Nouvelles fonctions : `getLettingKpis`, `getLettingApartments`, `getRecentCandidates`, `getRecentVisits`, `getCandidateDetail`, `getCandidateGuarantor`, `getCandidateDocuments`
- Fichiers : `lib/adminData.ts`, `app/admin/mise-en-location/page.tsx`, `app/admin/mise-en-location/candidats/[id]/page.tsx`, `app/admin/layout.tsx`

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
