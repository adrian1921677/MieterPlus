# Security- & DSGVO-Audit — Mieter + (Juni 2026)

**Scope:** Web-App (`apps/web`, Next.js 15), Supabase-Backend (Postgres + RLS + Storage),
Mobile-App (`apps/mobile`, Expo). Durchgeführt als Pre-Launch-Härtung vor Play-Store-Release.

**Gesamtbewertung:** Die Anwendung ist technisch **solide gebaut**. Autorisierung, RLS,
IDOR-Schutz und Datei-Validierung waren bereits vorhanden. Die Lücken lagen bei
**DSGVO-Selbstbedienung** (Löschung/Auskunft) und einem **Middleware-Routing-Fehler**.
Alle gefundenen Punkte wurden in diesem Audit behoben.

---

## ✅ Bereits vorhanden & verifiziert (kein Handlungsbedarf)

| Bereich | Status |
|---|---|
| **RLS** auf allen Tabellen, `security definer`-Helper ohne Rekursion | ✓ |
| **API-Auth** über zentrale Guards (`requireUser` / `requireRole` / `requirePremium`) | ✓ |
| **IDOR-Schutz**: ressourcen-bezogene Routen prüfen Ownership/Manager-Recht (vault, generate-code, notify-comment …) | ✓ |
| **Storage-Buckets** alle `public=false` mit MIME- & Größen-Limits (Ausweise, Eigentumsnachweise, Tresor, Mängel-Fotos) | ✓ |
| **Upload-Validierung**: Größe, MIME-Typ, UUID-Pfad, signierte URLs (5 Min TTL) | ✓ |
| **Stripe-Webhook**: Signaturprüfung via `constructEvent` (gefälschte Events → 400) | ✓ |
| **Rate-Limiting**: Code-Erstellung (5/Unit) + Code-Einlösung (5/Stunde/User) | ✓ |
| **Security-Header**: HSTS, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy | ✓ |
| **Secrets**: Service-Role-Key nur serverseitig (`server-only`), nicht im Client-Bundle, `.env.local` in `.gitignore` | ✓ |
| **DSGVO-Hygiene**: Auto-Purge-Funktion für Ausweisdokumente nach 30 Tagen | ✓ (Scheduling siehe unten) |

---

## 🔧 In diesem Audit behoben

### 1. [HOCH] Middleware leitete API-Routen fehl um
`/api/*` (außer health) wurde bei fehlendem Cookie auf `/login` umgeleitet (HTTP-302, HTML).
**Folge:** Bearer-Token-Aufrufe der Mobile-App (ohne Cookie) — u. a. die Code-Einlösung —
wären gebrochen; API-Clients bekamen HTML statt JSON-401.
**Fix:** `/api/*` ist in der Middleware jetzt „public"; jede Route erzwingt ihre Auth selbst
(Guards / Bearer / Webhook-Signatur).

### 2. [HOCH · Compliance] Keine Konto-Löschung (DSGVO Art. 17 + Google-Play-Pflicht)
Die Datenschutzerklärung versprach Löschung, es gab aber keine Umsetzung. Google Play
**verlangt** für Apps mit Konten eine Löschmöglichkeit (in-App + Web-URL).
**Fix:** Anonymisierungs-basierte Löschung (`POST /api/account/delete`):
- Profil-PII (Name, Telefon, Anschrift, Verifizierung) → anonymisiert, `deleted_at` gesetzt
- Ausweisdokumente vollständig aus dem Storage gelöscht
- Auth-Account gesperrt (Ban) + E-Mail anonymisiert → kein Login mehr
- Referenzielle Integrität bleibt erhalten (geteilte Protokolle/Kommentare → „Gelöschtes Konto")
- **UI:** Profil-Seite (Web) mit Bestätigung („LÖSCHEN" eintippen), Mobile-Profil-Link,
  öffentliche Info-Seite `/konto-loeschen` (Play-Console-Lösch-URL)
- Migration: `20260605000015_account_deletion.sql` (`profiles.deleted_at`)

> **Designentscheidung:** Hartes Löschen scheitert an `ON DELETE RESTRICT`-FKs (Kommentare,
> Übergabe-Signaturen, Anhänge, die die andere Vertragspartei rechtlich benötigt).
> Anonymisierung + Account-Ban ist DSGVO-konform und referenz-sicher.

### 3. [MITTEL · Compliance] Keine Datenauskunft (DSGVO Art. 15)
**Fix:** `GET /api/account/export` liefert alle zur Person gespeicherten Daten als
JSON-Download (Profil, Mietverhältnisse, Mängel, Kommentare, Termine, Abo-Historie,
eigene Immobilien). UI-Button auf der Profil-Seite.

### 4. [MITTEL] Impressum & Datenschutz hinter Login
Ausgeloggte Besucher wurden von `/impressum` und `/datenschutz` auf Login umgeleitet —
diese Seiten müssen rechtlich frei zugänglich sein.
**Fix:** Beide (+ `/konto-loeschen`) als public in der Middleware ergänzt.

### 5. [MITTEL] Fehlende Content-Security-Policy
**Fix:** Funktionale CSP ergänzt (`frame-ancestors 'none'`, `object-src 'none'`,
`base-uri`/`form-action 'self'`, `upgrade-insecure-requests`; `img/connect https:` für
Mapbox + Supabase). `script/style 'unsafe-inline'` noch nötig für Next.js-Hydration.

---

## 📋 Empfehlungen (nach dem Launch)

- [ ] **Strikte CSP** mit Nonces (entfernt `'unsafe-inline'` bei Scripts) — mittel
- [ ] **`purge_old_identity_documents()` planen** (pg_cron / Supabase Scheduled Function) — mittel
- [ ] **Stripe-Abo bei Konto-Löschung kündigen** (sobald Stripe live ist) — niedrig
- [ ] **2FA für Admin-Konten** erwägen — niedrig
- [ ] **Migrationen 0011–0015** in Produktion verifiziert ausgeführt? — vor Launch prüfen
- [ ] Vor Skalierung: externer **Penetrationstest**

---

## Prüf-Checkliste nach Deploy

1. `/datenschutz`, `/impressum`, `/konto-loeschen` ausgeloggt erreichbar.
2. Website + Mapbox-Karten + Login laden ohne CSP-Fehler in der Browser-Konsole.
3. Profil → Datenauskunft lädt JSON herunter.
4. Mobile-App: Code-Einlösung funktioniert (Bearer-Token nicht mehr umgeleitet).

_Stand: Juni 2026 · durchgeführt im Rahmen der Launch-Vorbereitung._
