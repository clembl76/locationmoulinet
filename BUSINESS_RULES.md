# Règles métier — Location Moulinet

> Compilé à partir des échanges de développement. Source de vérité pour les agents DEV et QA.
> À mettre à jour lorsqu'une règle évolue.

---

## Contexte produit

Logiciel de gestion locative pour des **studios meublés à Rouen centre-ville**, loués exclusivement à des **étudiants**. Deux interfaces :
- **Site vitrine** (`/`, `/apartments/[number]`) — public, bilingue FR/EN
- **Admin** (`/admin/*`) — accès restreint, gestion complète

---

## Éligibilité locataire

- **Seuls les étudiants** sont acceptés. Toute autre situation est éliminatoire dès le formulaire de visite.
- **Condition de revenus** : revenus mensuels nets (locataire + garant si applicable) ≥ **3× le loyer CC** de l'appartement visé.
- Types de garant acceptés : `none` (sans garant), `physical` (garant physique), `visale` (Garantie Visale).

---

## Appartements

- Les appartements sont regroupés par **bâtiment** (`buildings.short_name`).
- Type `BUREAU` exclu du site vitrine et de la liste de visites.
- Un appartement est **disponible** si aucun bail actif n'existe (`leases.move_out_inspection_date IS NULL OR >= CURRENT_DATE`).
- Un appartement est **prochainement disponible** si le bail est actif ET une date d'edl de sortie a été renseignée (`leases.move_out_inspection_date IS NOT NULL)
- `valid_to` sur les appartements : un appartement périmé n'est pas affiché.

---

## Baux (leases)

- Un bail = un locataire principal (`tenants`) + 0 ou 1 garant (`guarantors`).
- `move_in_date` = date d'entrée.
- `move_out_inspection_date` = date de fin (peut être null si actif).
- `leases.deposit` = montant de la caution (source de vérité, pas les transactions).
- Préavis de départ : date minimum = **aujourd'hui + 3 mois**.

---

## Loyers et prorata

- La table `rents` contient une ligne par bail par mois (`lease_id`, `year`, `month`).
- **Loyer plein** : `amount_expected = rent_including_charges`, `is_prorata = false`.
- **Prorata d'entrée** (signing_date > 1er du mois) :
  - `prorataDays = daysInMonth - signingDay + 1` (jour de signing inclus)
  - `amount_expected = round(prorataDays / daysInMonth × rent_including_charges, 2)`
  - `is_prorata = true`, `prorata_days = prorataDays`, `days_in_month = daysInMonth`
- **Prorata de sortie** (move_out_inspection_date < dernier jour du mois) :
  - `prorataDays = moveOutDay - 1 + 1 = moveOutDay` (du 1er au jour de sortie inclusif)
  - Même formule de calcul.
- Si signing_date est le 1er du mois : loyer plein (pas de prorata).
- La génération des loyers mensuels se fait via `generateMonthlyRents(year, month)` dans `lib/adminData.ts`.
- À la signature d'un bail ("Bail signé"), la première ligne de loyer est générée immédiatement avec prorata si applicable.

---

## Transactions financières

- **Direction** : `CREDIT` (encaissement) / `DEBIT` (décaissement) — **enum PostgreSQL**, cast requis : `direction::text`.
- **Type** : enum PostgreSQL — cast requis : `type::text ILIKE '%..%'`.
- Types courants : caution (dépôt de garantie), loyer (loyer mensuel), et autres.
- **CA encaissé** = somme des transactions `CREDIT` du mois courant.
- La **quittance de caution** utilise `leases.deposit`, pas le montant d'une transaction.
- Warning si on génère une quittance de caution sans transaction de type caution en CREDIT pour ce locataire.

---

## Funnel visiteur

```
visitor → candidate → tenant
```
Ces trois entités restent **séparées** (tables distinctes, pas de migration automatique).

- **Statuts visitor** : `pending`, `confirmed`, `done`, `cancelled`
- **Créneaux de visite** : 09:00 à 18:00, pas de **15 minutes**
- La liste des appartements proposés = disponibles + prochainement disponibles (< 3 mois)
- Le formulaire de visite bloque si : situation ≠ étudiant, revenus < 3× loyer, ou champs obligatoires vides

---

## Documents générés (PDF)

| Document | Montant source | Destinataire email | CC |
|---|---|---|---|
| Quittance de loyer | `transactions.amount` | Locataire | — |
| Quittance de caution | `leases.deposit` | Locataire | Garant |
| Attestation de location | — | Locataire | Garant |

**Convention de nommage des fichiers PDF :**
- `{YYYY}-{MM}_Quittance_{number}-{NOM}.pdf`
- `{YYYY}-{MM}_QuittanceCaution_{number}-{NOM}.pdf`
- `{YYYY}-{MM}_AttestationLocation_{number}-{NOM}.pdf`

---

## EDL (État des lieux)

- Un EDL est lié à **un seul bail**.
- Même document pour l'entrée et la sortie.
- Tables : `apartment_installation`, `apartment_keys`, `check_in_elements`, `inventory_items`.
- Noms de colonnes **en anglais** (ex: `room`, `condition`, `quantity_entry`, `quantity_exit`).
- Affichage : la colonne "pièce" n'est affichée que sur la première ligne du groupe.
- Les tableaux d'EDL et d'inventaire sont éditables inline (auto-save via server actions).

---

## Accès base de données (Supabase)

| Opération | Client à utiliser |
|---|---|
| SELECT (lecture) | `db()` via `run_sql` RPC (clé anon) |
| INSERT / UPDATE / DELETE | `createAdminClient()` (clé service role) |

**Règle critique** : les champs de type **enum PostgreSQL** ne supportent pas `ILIKE` directement. Toujours caster : `field::text ILIKE '%valeur%'`.

**Pattern multi-locataire** : `DISTINCT ON (a.id)` pour éviter les doublons quand un appartement a eu plusieurs baux.

---

## Dates et fuseaux horaires

- Toujours ajouter `T12:00:00` lors de la construction d'un objet `Date` depuis une string ISO date (`YYYY-MM-DD`) pour éviter le décalage UTC/Paris.
- `todayStr` dans les composants client : utiliser `getFullYear()/getMonth()/getDate()`, jamais `toISOString().slice(0,10)`.

---

## Catégorisation des transactions Linxo

Les transactions de la table `transactions_linxo` disposent de colonnes de catégorisation :

| Colonne DB | Libellé affiché | Description |
|---|---|---|
| `supplier` | Fournisseur | Nom normalisé du fournisseur |
| `type` | Type | Catégorie comptable (LOYER, ACHAT, TRAVAUX, SERVICES, GESTION, ENTRETIEN, IMPOTS, PRET, INTERNE) |
| `description` | Description | Description libre, pré-remplie pour les loyers |
| `apartment_num` | Appt | Numéro d'appartement lié |
| `tenant_name` | Locataire | Nom du locataire lié |
| `validated` | Validé | Booléen — la ligne a été vérifiée manuellement |

### Règles de catégorisation automatique (priorité décroissante)

1. **Nom de locataire actif** trouvé dans `libelle` ou `notes` (recherche insensible à la casse et aux accents) :
   - `type = LOYER`, `supplier = NOM_DU_LOCATAIRE`, `apartment_num = numéro de son appartement`, `tenant_name = prénom + nom`
   - Si `montant ≈ rent_including_charges` (±1 €) : `description = LOYER - [num] - [NOM] - [mois année]` (ex: `LOYER - 7 - DUPONT - janv. 2026`)
2. **Nom de garant actif** trouvé dans `libelle` ou `notes` :
   - Même règle que locataire, `apartment_num` = appartement du locataire associé au garant
3. **Table `linxo_mappings`** : recherche du `libelle_pattern` dans le libellé (ILIKE, pattern le plus long en premier)
   - Applique le `type` et `supplier` correspondants

### Apprentissage automatique

Lors de la validation d'une transaction (`validated = true`), si aucune règle dans `linxo_mappings` ne correspond déjà au libellé, une nouvelle entrée est insérée automatiquement avec `libelle_pattern = libelle`, `type` et `supplier` de la transaction.

### Table `linxo_mappings`

Stocke les patterns de reconnaissance : `libelle_pattern TEXT`, `type TEXT`, `supplier TEXT`. Pré-alimentée avec ~120 entrées de référence (voir migration `20260414_categorisation_linxo.sql`).

---

## Conventions UI / Style

- **Tailwind v4** — couleurs personnalisées définies dans le thème :
  - `blue-primary` : `#185FA5`
  - `blue-dark` : `#0C447C`
  - `blue-light` : `#E6F1FB`
- **Tous les boutons d'action principaux** : `bg-blue-primary text-white px-3 py-2 rounded-lg hover:bg-blue-dark`
- **Pas d'entités HTML dans JSX** (`&#233;` → `é`). Toujours UTF-8 direct.
- **Pas de `\u00a0` littéral dans le JSX** — utiliser l'espace insécable directement ou `{'\u00a0'}` en expression JS.
- Les composants serveur admin utilisent `export const dynamic = 'force-dynamic'`.
- Encodage des caractères accentués : écrire directement dans le fichier, ne pas encoder.
