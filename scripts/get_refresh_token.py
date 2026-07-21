"""
Régénère le GMAIL_REFRESH_TOKEN pour locationmoulinet.
Scopes requis : gmail.compose + drive + calendar + contacts

Usage :
  1. Copie credentials.json depuis gestion-locative/ dans ce dossier (ou indique le chemin)
  2. cd scripts
  3. python get_refresh_token.py
  4. Copie le refresh_token affiché dans .env.local et dans Vercel (GMAIL_REFRESH_TOKEN)
"""

from google_auth_oauthlib.flow import InstalledAppFlow
import os

SCOPES = [
    'https://www.googleapis.com/auth/gmail.compose',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/contacts',
]

# Cherche credentials.json ici ou dans gestion-locative
candidates = [
    'credentials.json',
    '../credentials.json',
    '../../gestion-locative/credentials.json',
]
creds_path = next((p for p in candidates if os.path.exists(p)), None)
if not creds_path:
    raise FileNotFoundError(
        "credentials.json introuvable. Copie-le depuis Google Cloud Console "
        "(APIs & Services → Credentials → ton OAuth 2.0 Client ID → Download JSON)."
    )

flow = InstalledAppFlow.from_client_secrets_file(creds_path, scopes=SCOPES)
# login_hint force l'ouverture avec le bon compte Google
creds = flow.run_local_server(port=0, login_hint='location.moulinet@gmail.com')

print()
print("=== Copie ces valeurs dans .env.local et dans Vercel ===")
print(f"GMAIL_REFRESH_TOKEN={creds.refresh_token}")
print()
print("(GOOGLE_CLIENT_ID et GOOGLE_CLIENT_SECRET sont déjà dans tes env vars)")
