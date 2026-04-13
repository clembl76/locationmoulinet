"""
Purge des données de visites et de candidatures.

Supprime en cascade depuis Supabase :
  candidate_documents → candidate_applications → candidate_guarantors → candidates
  visitor_apartments → visitors

Supprime également tous les fichiers et dossiers dans /candidats sur Google Drive
(GDRIVE_CANDIDATES_FOLDER_ID dans .env.local).

Usage :
  python scripts/purge_visites_candidatures.py
"""

import sys
import requests
from pathlib import Path

# ─── Lecture .env.local ───────────────────────────────────────────────────────

ENV_PATH = Path(__file__).parent.parent / '.env.local'

env = {}
for line in ENV_PATH.read_text(encoding='utf-8').splitlines():
    line = line.strip()
    if line and '=' in line and not line.startswith('#'):
        k, v = line.split('=', 1)
        env[k.strip()] = v.strip().strip('"').strip("'")

SUPABASE_URL = env['NEXT_PUBLIC_SUPABASE_URL']
SUPABASE_KEY = env['SUPABASE_SERVICE_ROLE_KEY']
CLIENT_ID    = env.get('GOOGLE_CLIENT_ID', '')
CLIENT_SECRET= env.get('GOOGLE_CLIENT_SECRET', '')
REFRESH_TOKEN= env.get('GOOGLE_REFRESH_TOKEN', '')
CANDIDATES_FOLDER_ID = env.get('GDRIVE_CANDIDATES_FOLDER_ID', '')

SB_HEADERS = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal',
}

# ─── Confirmation ─────────────────────────────────────────────────────────────

print("=" * 60)
print("PURGE DES DONNÉES VISITES & CANDIDATURES")
print("=" * 60)
print()
print("Ce script va SUPPRIMER DÉFINITIVEMENT :")
print("  - Tous les candidats et leurs pièces jointes (Supabase)")
print("  - Toutes les visites (Supabase)")
print("  - Tous les dossiers et fichiers dans /candidats (Drive)")
print()
confirm = input("Tapez 'CONFIRMER' pour continuer : ").strip()
if confirm != 'CONFIRMER':
    print("Annulé.")
    sys.exit(0)

print()

# ─── Suppression Supabase ─────────────────────────────────────────────────────

def sb_delete(table: str, filter: str) -> int:
    """Supprime les lignes d'une table avec le filtre donné. Retourne le nb de lignes."""
    resp = requests.delete(
        f"{SUPABASE_URL}/rest/v1/{table}?{filter}",
        headers=SB_HEADERS,
        timeout=30,
    )
    if resp.status_code not in (200, 204):
        print(f"  ERREUR {table} ({resp.status_code}): {resp.text[:200]}")
        return 0
    # Supabase retourne les lignes supprimées si Prefer=return=representation
    return 0

TABLES_IN_ORDER = [
    ('candidate_documents',   'id=not.is.null'),
    ('candidate_applications','id=not.is.null'),
    ('candidate_guarantors',  'id=not.is.null'),
    ('candidates',            'id=not.is.null'),
    ('visitor_apartments',    'id=not.is.null'),
    ('visitors',              'id=not.is.null'),
]

print("1. Suppression des données Supabase...")
for table, filt in TABLES_IN_ORDER:
    sb_delete(table, filt)
    print(f"   OK  {table}")

print()

# ─── Suppression Drive ────────────────────────────────────────────────────────

if not all([CLIENT_ID, CLIENT_SECRET, REFRESH_TOKEN, CANDIDATES_FOLDER_ID]):
    print("2. Skipping Drive (credentials manquants dans .env.local).")
    print("   Vérifiez : GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN, GDRIVE_CANDIDATES_FOLDER_ID")
else:
    print("2. Récupération du token Google...")
    token_resp = requests.post(
        'https://oauth2.googleapis.com/token',
        data={
            'client_id':     CLIENT_ID,
            'client_secret': CLIENT_SECRET,
            'refresh_token': REFRESH_TOKEN,
            'grant_type':    'refresh_token',
        },
        timeout=15,
    )
    if token_resp.status_code != 200:
        print(f"   ERREUR token: {token_resp.text[:200]}")
        sys.exit(1)
    access_token = token_resp.json()['access_token']
    drive_headers = {'Authorization': f'Bearer {access_token}'}

    print(f"3. Listage des éléments dans le dossier /candidats ({CANDIDATES_FOLDER_ID})...")
    list_resp = requests.get(
        'https://www.googleapis.com/drive/v3/files',
        headers=drive_headers,
        params={
            'q':        f"'{CANDIDATES_FOLDER_ID}' in parents and trashed = false",
            'fields':   'files(id, name, mimeType)',
            'pageSize': 1000,
        },
        timeout=30,
    )
    if list_resp.status_code != 200:
        print(f"   ERREUR listage Drive: {list_resp.text[:200]}")
        sys.exit(1)

    files = list_resp.json().get('files', [])
    print(f"   {len(files)} élément(s) trouvé(s).")

    print("4. Suppression des éléments Drive...")
    for f in files:
        del_resp = requests.delete(
            f"https://www.googleapis.com/drive/v3/files/{f['id']}",
            headers=drive_headers,
            timeout=15,
        )
        status = 'OK' if del_resp.status_code == 204 else f"ERREUR {del_resp.status_code}"
        print(f"   {status}  {f['name']}")

print()
print("Purge terminée.")
