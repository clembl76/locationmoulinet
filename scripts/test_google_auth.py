"""
Teste que GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET + GMAIL_REFRESH_TOKEN
fonctionnent correctement en lisant .env.local automatiquement.
"""

import os, sys
from pathlib import Path

# Lire .env.local
env_path = Path(__file__).parent.parent / '.env.local'
if not env_path.exists():
    print("❌ .env.local introuvable")
    sys.exit(1)

env = {}
for line in env_path.read_text().splitlines():
    line = line.strip()
    if '=' in line and not line.startswith('#'):
        k, _, v = line.partition('=')
        env[k.strip()] = v.strip()

client_id     = env.get('GOOGLE_CLIENT_ID', '')
client_secret = env.get('GOOGLE_CLIENT_SECRET', '')
refresh_token = env.get('GMAIL_REFRESH_TOKEN', '')

print(f"GOOGLE_CLIENT_ID     : {client_id[:40]}...")
print(f"GOOGLE_CLIENT_SECRET : {client_secret[:8]}...")
print(f"GMAIL_REFRESH_TOKEN  : {refresh_token[:20]}...")
print()

if not client_id or not client_secret or not refresh_token:
    print("❌ Une variable est manquante dans .env.local")
    sys.exit(1)

from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request

creds = Credentials(
    token=None,
    refresh_token=refresh_token,
    client_id=client_id,
    client_secret=client_secret,
    token_uri='https://oauth2.googleapis.com/token',
)

try:
    creds.refresh(Request())
    print("✅ Token valide — access_token obtenu :", creds.token[:30] + "...")
except Exception as e:
    print("❌ Erreur :", e)
    print()
    print("Causes possibles :")
    print("  1. Le refresh_token a été copié avec des espaces ou tronqué")
    print("  2. L'app Google Cloud est en mode 'Test' → tokens expirent en 7 jours")
    print("     → Solution : Google Cloud Console → OAuth consent screen → Publish App")
    print("  3. L'autorisation a été donnée avec un mauvais compte Google (pas location.moulinet@gmail.com)")
    print("     → Solution : relancer get_refresh_token.py en vérifiant le compte connecté")
