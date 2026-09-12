# Refonte visuelle — pistes de design (septembre 2026)

Exploration de nouvelles directions visuelles pour le site public (page d'accueil, fiche appartement, candidature, demande de visite), menée dans une conversation Claude avec le skill "design" (Claude Design). Ce dossier garde une copie locale du travail pour référence de développement future ; la version interactive complète (canvas avec undo/versions/export PNG-PDF) reste sur l'artifact publié :

**Canvas complet (toutes les pistes explorées) :** https://claude.ai/code/artifact/c3289d31-40f2-42d7-84e2-bb7382dd167b

## Direction retenue

Après plusieurs rounds d'exploration (voir "Historique" plus bas), la direction choisie est inspirée des codes visuels de Qonto / Pennylane / Gemini / Free.fr : tons clairs, lignes fines, un accent unique, halos dégradés très légers en fond de hero. Dans le canvas, c'est la piste **n°17 "Airbnb x dégradés doux"**.

### Tokens visuels

- **Police** : [Plus Jakarta Sans](https://fonts.google.com/specimen/Plus+Jakarta+Sans) (Google Fonts), poids 400/500/600/700/800
- **Fond** : `oklch(99% 0.003 90)` (blanc cassé chaud)
- **Encre / texte** : `oklch(18% 0.01 60)`
- **Accent (teal)** : `oklch(40% 0.09 195)` — utilisé pour les liens, badges, montants secondaires
- **Statut "Disponible"** : fond `oklch(90% 0.09 150)`, texte `oklch(30% 0.09 150)`
- **Statut "Prochainement"** : fond `oklch(93% 0.07 85)`, texte `oklch(42% 0.1 75)`
- Boutons pleins : `oklch(18% 0.01 60)` (quasi-noir) avec `border-radius: 100px` (pilule)
- Cartes : `border-radius` généreux (16–24px), ombres très douces (`box-shadow` faible opacité) plutôt que des bordures dures
- Icônes : SVG au trait uniquement (jamais d'emoji, jamais de pictos remplis)

Ces valeurs diffèrent du thème actuel du site (`app/globals.css` : `--color-blue-primary: #185FA5`, police Geist). L'implémentation devra soit remplacer ces tokens dans `@theme`, soit les ajouter en parallèle si une bascule progressive est souhaitée.

## Pages finalisées (`artboards/`)

Chaque fichier est un artboard Claude Design (`.dc.html`, HTML+CSS autonome) — à lire comme référence de structure/contenu, pas comme du code à copier tel quel (pas de composants React, tout est en style inline pour l'éditeur visuel).

| Fichier | Page réelle correspondante | Contenu |
|---|---|---|
| `Home.dc.html` | `app/page.tsx` | Page d'accueil : hero + recherche, 3 blocs "pourquoi nous choisir", grille de 6 appartements |
| `ApartmentDetail.dc.html` | `app/apartments/[number]` | Fiche appartement (contenu réel de l'Appartement 30) — colonne unique, bloc loyer + CTA compact, Quartier & commodités en accordéon en dernier |
| `Candidater.dc.html` | `app/candidater/page.tsx` | Formulaire de candidature (contenu réel du formulaire) |
| `Visiter.dc.html` | `app/visiter/page.tsx` | Formulaire de demande de visite (contenu réel, visites réactivées : infos, choix d'appartement, calendrier, profil, projet) |

Tout le texte de ces 4 pages est repris **mot pour mot** du site en production (pas de copywriting inventé) — seule la mise en page et les styles ont été redessinés.

### Fiche appartement — 5 variantes de mise en page

`DetailA_Colonne.dc.html`, `DetailB_Chips.dc.html`, `DetailC_Accordion.dc.html`, `DetailD_Editorial.dc.html`, `DetailE_Minimal.dc.html` : cinq réagencements de la fiche appartement testés avant de converger vers `ApartmentDetail.dc.html` (base = variante A, avec le bloc prix/CTA de la variante C et Quartier & commodités déplacé en accordéon final).

## Historique (exploration, non retenue)

Les autres fichiers (`Main`, `ColorBlock`, `DarkPremium`, `WarmOrganic`, `SwissGrid`, `AirbnbStyle`, `AppleStyle`, `MapSplit`, `MarketplaceDense`, `DarkRows`, `QontoStat`, `PennylaneLine`, `GeminiSoft`, `FreeSpec`, `LedgerLight`, `AppleRows`, `AirbnbGradient`, `WarmOrganicRefined`, `PennylaneFixed`) sont les 19 directions explorées avant de converger vers la n°17. Gardés pour mémoire — ne pas les utiliser comme base d'implémentation.

`canvas.json` décrit la disposition de tous les artboards sur le canvas (usage interne à l'éditeur Claude Design, pas nécessaire pour le développement).
