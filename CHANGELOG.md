# Changelog

## [Non publié]

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
