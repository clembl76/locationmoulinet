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
- Un appartement est **prochainement disponible** si le bail se termine dans les **3 mois**.
- `valid_to` sur les appartements : un appartement périmé n'est pas affiché.

---

## Baux (leases)

- Un bail = un locataire principal (`tenants`) + 0 ou 1 garant (`guarantors`).
- `move_in_date` = date d'entrée.
- `move_out_inspection_date` = date de fin (peut être null si actif).
- `leases.deposit` = montant de la caution (source de vérité, pas les transactions).
- Préavis de départ : date minimum = **aujourd'hui + 3 mois**.

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
