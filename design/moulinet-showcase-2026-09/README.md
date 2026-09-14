# Vitrine portfolio — Immeuble Moulinet (septembre 2026)

Fiche patrimoine en 2 pages, conçue comme complément visuel au CV : bilan locatif chiffré de l'immeuble Moulinet et plaquette des fonctionnalités du back-office développé pour l'ensemble du portefeuille. Menée dans une conversation Claude Code (skill dataviz + artifact-design), en reprenant les tokens visuels retenus pour la refonte des pages publiques (`design/homepage-refresh-2026-09`) puis réadaptés au style plus sobre du back-office admin (pas d'icônes sur les tuiles KPI, barres arrondies d'un seul côté, légendes en pastille + texte sans habillage pilule).

**Version interactive (à jour) :** https://claude.ai/code/artifact/4c79add4-fab4-4594-ae42-64aef95f5877

## Pages

Les deux vues (Fonctionnalités et Analytics) vivent dans un **unique fichier** `index.html` : la navigation bascule entre elles en JS (affichage/masquage), sans rechargement de page — l'artefact Claude ne supporte pas de manière fiable la navigation entre plusieurs documents HTML séparés dans un même artefact.

| Fichier | Contenu |
|---|---|
| `index.html` | Page unique — bascule Fonctionnalités / Analytics via les boutons de nav en haut de page (ou `?view=analytics` dans l'URL) |
| `styles.css` | Design system partagé (tokens clair/sombre, composants) |
| `captures/` | Captures d'écran du site vitrine et du tableau de bord admin, intégrées comme fichiers ordinaires (pas de capacité `assets`, pour rester partageable publiquement hors organisation) |
| `Fonctionnalites.pdf`, `Analytics.pdf` | Exports PDF paysage des deux vues, générés à partir de `index.html` (avec `?view=analytics` pour la seconde) |

## Notes

- Toutes les données chiffrées viennent de la base Supabase de production (locataires, loyers, occupation) croisées avec l'historique 2017-2025 saisi dans un Google Sheet ; le détail des hypothèses (estimations 2026, travaux manquants 2023-2026, etc.) est documenté dans les légendes/tooltips du graphique lui-même.
- CSS d'impression (`@media print`) ajouté pour une sortie PDF en paysage, sans ombres portées — seule la vue active à l'écran est imprimée.
- Ouvrir `index.html` directement dans un navigateur pour prévisualiser hors ligne (liens relatifs, aucune dépendance serveur hormis Google Fonts).
