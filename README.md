# MieterPlus — eine App von ADB

Mobile-App für Mieter, Web-Dashboard für Vermieter und Admins. Mieter melden Mängel an
ihren Vermieter, Vermieter verwalten Anfragen über alle ihre Immobilien hinweg.

- **Stack**: Next.js 15 + React Native (Expo) + Supabase (Postgres + RLS + Storage + Edge Functions)
- **Sprache**: TypeScript überall
- **Hosting**: Supabase EU-Region (Frankfurt), Vercel, EAS
- **Compliance**: DSGVO-konform

---

## Projektstruktur

```
.
├── apps/
│   ├── mobile/         Expo App (Mieter-App)
│   └── web/            Next.js (Vermieter + Admin Dashboard)
├── packages/
│   └── shared/         Zod-Schemas, TypeScript-Typen, Konstanten
├── supabase/
│   ├── migrations/     Postgres-Schema + RLS-Policies + Storage-Buckets
│   ├── functions/      Edge Functions (Deno)
│   ├── config.toml     lokale Supabase-CLI-Konfiguration
│   └── seed.sql
├── package.json        Workspace-Root (npm workspaces)
└── turbo.json
```

---

## Schnellstart (lokal)

### Voraussetzungen

- **Node.js** ≥ 20.0.0 (`node -v`)
- **npm** ≥ 10
- **Docker Desktop** (für lokales Supabase via `supabase start`)
- **Supabase CLI** ≥ 1.200 — Installation: <https://supabase.com/docs/guides/cli>
- **Expo CLI** (kommt automatisch via `npx expo`)
- Für iOS-Tests: macOS + Xcode; für Android: Android Studio oder physisches Gerät mit Expo Go

### 1) Repo klonen & Dependencies installieren

```bash
npm install
```

`npm install` läuft im Root und installiert alle Workspaces (mobile, web, shared) gleichzeitig.

### 2) Supabase lokal starten

```bash
npm run db:start
```

Wartet bis Docker alle Container hochgefahren hat. Studio läuft danach auf
<http://localhost:54323>, API auf <http://localhost:54321>, Mail-Inbucket auf
<http://localhost:54324>.

Die CLI gibt dir die lokalen Keys aus, z. B.:

```
anon key:           eyJhbG...
service_role key:   eyJhbG...
```

### 3) Environment-Dateien anlegen

Erstelle `apps/web/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key aus Schritt 2>
SUPABASE_SERVICE_ROLE_KEY=<service_role key aus Schritt 2>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Erstelle `apps/mobile/.env.local`:

```env
EXPO_PUBLIC_SUPABASE_URL=http://<DEINE-IP>:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon key aus Schritt 2>
EXPO_PUBLIC_WEB_URL=http://<DEINE-IP>:3000
```

> Für Mobile-Tests von einem echten Gerät: ersetze `127.0.0.1` durch deine
> Rechner-IP im LAN (z. B. `192.168.178.42`), damit das Handy den Supabase-Server
> erreichen kann.

### 4) Test-Nutzer anlegen

```bash
# Vermieter
supabase auth admin create-user \
  --email landlord@test.de --password "TestPass123A!" \
  --user-metadata '{"role":"landlord","full_name":"Lisa Vermieter"}'

# Mieter
supabase auth admin create-user \
  --email tenant@test.de --password "TestPass123A!" \
  --user-metadata '{"role":"tenant","full_name":"Tom Mieter"}'

# Admin
supabase auth admin create-user \
  --email admin@test.de --password "TestPass123A!" \
  --user-metadata '{"role":"admin","full_name":"Anna Admin"}'
```

Der DB-Trigger `tg_handle_new_user` erstellt automatisch das passende `profiles`-Datenbank-Eintrag.

### 5) Web-App starten

```bash
npm run dev --workspace=@mieterplus/web
# → http://localhost:3000
```

### 6) Mobile-App starten

```bash
npm run start --workspace=@mieterplus/mobile
```

Dann QR-Code mit Expo Go (iOS App Store / Google Play) scannen, oder `i` für iOS-Simulator
bzw. `a` für Android-Emulator drücken.

> **Assets**: Vor dem ersten Mobile-Build siehe `apps/mobile/assets/README.md` — dort
> stehen die fehlenden PNG-Dateien (Icon, Splash, etc.). Für Expo Go reicht ein einfaches
> blaues 1024×1024-PNG.

### 7) Edge Functions lokal deployen

```bash
supabase functions serve --no-verify-jwt
```

> Hinweis: Für Edge-Functions zu Verifikations-Endpoints sollte `--no-verify-jwt` nur
> lokal genutzt werden. In Produktion läuft JWT-Verifikation an.

---

## End-to-End-Test (Smoke)

1. **Vermieter** loggt sich im Web-Dashboard ein → legt Immobilie an → lädt Eigentumsnachweis hoch.
2. **Admin** loggt sich ein → öffnet "Verifikationen" → gibt Immobilie frei.
3. **Vermieter** → legt Wohnung an → generiert Einladungscode → teilt Code dem Mieter mit.
4. **Mieter** lädt App, registriert sich → gibt Adresse + Code ein → Tenancy wird erstellt.
5. **Mieter** meldet Mangel mit Foto → erscheint sofort im Vermieter-Dashboard.
6. **Vermieter** ändert Status auf "In Bearbeitung" → Mieter sieht Update live (Realtime).
7. Beide schreiben Kommentare → Realtime-Thread funktioniert.

---

## Sicherheits-Eigenheiten

- **Row Level Security** auf jeder Tabelle. Direkter Client-Zugriff darf nur eigene Daten lesen/ändern.
- **Sensible Operationen** (Codes generieren, Codes einlösen, Property verifizieren) laufen
  ausschließlich in **Edge Functions** mit Service-Role-Key, nie im Client.
- **Codes**: 12 Zeichen aus `A–Z 0–9` (ohne `I O 0 1` für Lesbarkeit), einmalig nutzbar,
  30 Tage gültig, max. 5 aktive pro Wohnung, Rate-Limit von 5 Versuchen/Stunde pro Mieter.
- **Storage**: private Buckets, signed URLs mit 5-Min-TTL.
- **Audit-Log** bei jeder sicherheitsrelevanten Aktion (Verifikationen, Status-Wechsel, Admin-Entscheidungen).
- **Auth**: E-Mail-Bestätigung Pflicht, Mindestpasswort 10 Zeichen mit Komplexitätsregeln.

---

## Verifikation der Implementation

```bash
# Typecheck überall
npm run typecheck

# Lint
npm run lint

# Web-Build
npm run build --workspace=@mieterplus/web

# Mobile-Bundle prüfen
npm run start --workspace=@mieterplus/mobile -- --no-dev --minify
```

**RLS-Tests** (manuell): Logge dich als zwei verschiedene Mieter ein, versuche via Browser-DevTools
auf Daten des jeweils anderen zuzugreifen — muss von Postgres mit leerem Ergebnis abgelehnt werden.

---

## Deployment

### Web (Vercel)

```bash
vercel --cwd apps/web
```

Setze in den Project-Settings die Environment-Variablen aus `apps/web/.env.example`.

### Mobile (EAS)

```bash
cd apps/mobile
npx eas-cli build --platform all --profile preview
```

EAS-Account und `eas.json` müssen noch eingerichtet werden — siehe <https://docs.expo.dev/build/setup/>.

### Supabase (Produktion)

```bash
# Mit Cloud-Projekt linken (einmalig)
supabase link --project-ref <PROJECT-REF>

# Migrationen pushen
supabase db push

# Edge Functions deployen
supabase functions deploy generate-tenant-code
supabase functions deploy verify-tenant-code
supabase functions deploy review-property
supabase functions deploy send-push-notification
```

> **EU-Region**: Beim Anlegen des Supabase-Projekts unbedingt **eu-central-1 (Frankfurt)**
> wählen — DSGVO-Konformität.

---

## Roadmap (Post-MVP)

- [ ] Mehrsprachigkeit (EN/TR/AR zusätzlich zu DE)
- [ ] Vermieter-Mobile-App
- [ ] Wiederkehrende Wartungen
- [ ] Rechnungs-/Belegmanagement
- [ ] Handwerker-Vergabe und Bewertungen
- [ ] SSO-Anbindung an ADB-Bestandssysteme

---

## Lizenz

Eigentum der ADB. Alle Rechte vorbehalten.
