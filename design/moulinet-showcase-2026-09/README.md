# Vitrine portfolio — Immeuble Moulinet (septembre 2026)

Fiche patrimoine en 2 pages, conçue comme complément visuel au CV : bilan locatif chiffré de l'immeuble Moulinet et plaquette des fonctionnalités du back-office développé pour l'ensemble du portefeuille. Menée dans une conversation Claude Code (skill dataviz + artifact-design), en reprenant les tokens visuels retenus pour la refonte des pages publiques (`design/homepage-refresh-2026-09`) puis réadaptés au style plus sobre du back-office admin (pas d'icônes sur les tuiles KPI, barres arrondies d'un seul côté, légendes en pastille + texte sans habillage pilule).

**Version interactive (à jour) :** https://claude.ai/code/artifact/4c79add4-fab4-4594-ae42-64aef95f5877

## Pages

| Fichier | Contenu |
|---|---|
| `index.html` | Fonctionnalités — plaquette du back-office (features, captures d'écran, stack) |
| `analytics.html` | Analytics — KPI et trajectoire financière de l'immeuble Moulinet depuis l'achat (juin 2017) |
| `styles.css` | Design system partagé entre les deux pages (tokens clair/sombre, composants) |
| `captures/` | Captures d'écran du site vitrine et du tableau de bord admin, intégrées comme fichiers ordinaires (pas de capacité `assets`, pour rester partageable publiquement hors organisation) |

## Notes

- Toutes les données chiffrées viennent de la base Supabase de production (locataires, loyers, occupation) croisées avec l'historique 2017-2025 saisi dans un Google Sheet ; le détail des hypothèses (estimations 2026, travaux manquants 2023-2026, etc.) est documenté dans les légendes/tooltips du graphique lui-même.
- CSS d'impression (`@media print`) ajouté pour une sortie PDF en paysage, sans ombres portées.
- Ouvrir `index.html` ou `analytics.html` directement dans un navigateur pour prévisualiser hors ligne (liens relatifs, aucune dépendance serveur hormis Google Fonts).
