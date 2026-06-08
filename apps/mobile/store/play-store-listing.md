# Play-Store-Release — Mieter + (Checkliste & Texte)

Package: `de.adb.mieterplus` · Version: `1.0.0` · Bundle: `.aab` (EAS production)

---

## 1) Production-Build erstellen

```
cd /d "D:\ADB\MieterPlus - ADB\apps\mobile"
eas build --platform android --profile production
```

Ergebnis: ein `.aab` (App-Bundle) mit automatisch hochgezähltem versionCode.
Download-Link kommt am Ende der Ausgabe (oder unter expo.dev → Builds).

> Optional automatisch hochladen (statt manuell): `eas submit -p android --latest`
> — braucht einmalig einen Google-Service-Account-Key (siehe Schritt 6).

---

## 2) Store-Eintrag — Texte (Deutsch)

**App-Name (30 Zeichen):**
```
Mieter +
```

**Kurzbeschreibung (max. 80 Zeichen):**
```
Mängel melden, Dokumente & Termine – für Mieter und Vermieter.
```

**Vollständige Beschreibung (max. 4000 Zeichen):**
```
Mieter + bringt Mieter und Vermieter auf einer einfachen Plattform zusammen –
für eine schnelle, transparente Kommunikation rund um die Wohnung.

FÜR MIETER
• Mängel in Sekunden melden – mit Foto direkt aus der App
• Status jeder Meldung live verfolgen: offen, in Bearbeitung, behoben
• Wichtige Dokumente vom Vermieter sicher einsehen (Mietvertrag,
  Nebenkostenabrechnung, Hausordnung)
• Termine mit dem Vermieter bequem buchen
• Zugang per Einladungscode des Vermieters – kein Papierkram

FÜR VERMIETER
• Alle Immobilien, Wohnungen und Mieter zentral verwalten
• Mängelmeldungen gebündelt bearbeiten und beantworten
• Dokumente sicher mit Mietern teilen – inkl. Lesebestätigung
• Digitale Übergabeprotokolle mit Unterschrift
• Termine planen und automatisch benachrichtigen

SICHER & DATENSCHUTZKONFORM
• Server in der EU, Übertragung verschlüsselt
• Volle Kontrolle über deine Daten: Datenauskunft und Konto-Löschung
  jederzeit in der App
• Entwickelt nach DSGVO

Mieter + ist eine App von ADB Dienstleistungen (Immobilien · Gebäude ·
Service) aus Wuppertal.

Die Nutzung der Grundfunktionen ist kostenlos. Für Vermieter gibt es optionale
Abo-Pakete (Plus & Pro) mit erweiterten Funktionen und größeren Kontingenten.
```

**Kategorie:** Hausverwaltung / Tools (Empfehlung: „Wohnen & Immobilien" bzw. „Business")
**Tags/Stichwörter:** Mieter, Vermieter, Mängel, Hausverwaltung, Immobilien

---

## 3) Grafik-Assets (liegen in diesem Ordner)

| Asset | Datei | Vorgabe |
|---|---|---|
| App-Icon | `store/listing-icon-512.png` | 512×512 PNG ✓ |
| Feature-Grafik | `store/feature-graphic-1024x500.png` | 1024×500 PNG ✓ |
| Screenshots Handy | _noch aufnehmen_ | min. 2, je 1080×1920 (Hochformat) |

**Screenshots:** Am echten Gerät (oder Emulator) aufnehmen — empfohlen:
Login, Übersicht, Mangel melden (mit Foto), Meine Wohnungen, Profil.
2–8 Stück, Hochformat 9:16. (Sag Bescheid, wenn ich beim Erstellen helfen soll.)

---

## 4) App-Inhalte (App content) im Play Console

- **Datenschutzerklärung-URL:** `https://mieterplus.abdullahu.de/datenschutz`
- **Konto-/Datenlöschung-URL:** `https://mieterplus.abdullahu.de/konto-loeschen`
- **Zielgruppe:** Erwachsene (18+) – kein an Kinder gerichtetes Angebot
- **Werbung:** Nein, enthält keine Werbung
- **Inhaltsbewertung:** Fragebogen ausfüllen → Utility-App, keine bedenklichen
  Inhalte. Hinweis: Nutzer können untereinander Nachrichten/Kommentare austauschen
  (geschlossenes System Mieter↔Vermieter) → ehrlich angeben. Ergebnis i. d. R.
  „USK 0 / PEGI 3 / Ab 0".

---

## 5) Datensicherheit (Data safety) — Antworten

**Erhobene Daten & Zweck (App-Funktionalität + Kontoverwaltung):**
- Personenbezogene Daten: Name, E-Mail, Telefonnummer, Anschrift
- Fotos: Mängel-Bilder
- Ausweisdokumente (nur Vermieter, zur Identitätsprüfung)
- App-Aktivität: Kommentare/Nachrichten zu Mängeln
- KEINE Standortdaten vom Gerät (Adressen werden nur per Texteingabe verarbeitet)

**Angaben:**
- Daten werden bei der Übertragung verschlüsselt (HTTPS): **Ja**
- Nutzer können Löschung beantragen: **Ja** (URL siehe oben)
- Werden Daten mit Dritten „geteilt"? Es kommen Auftragsverarbeiter zum Einsatz
  (Supabase = Hosting/DB, Stripe = Zahlungen, Resend = E-Mail-Versand,
  Mapbox = Adress-Suche). Reine Auftragsverarbeitung zählt i. d. R. nicht als
  „Sharing" – im Zweifel als Verarbeitung angeben.

---

## 6) Release-Schritte im Play Console

1. **App erstellen:** Name „Mieter +", Sprache Deutsch, App, Kostenlos.
2. **App-Inhalte** (Schritt 4 oben) vollständig ausfüllen.
3. **Store-Eintrag:** Texte (Schritt 2) + Icon + Feature-Grafik + Screenshots.
4. **Release → Internes Testing** (empfohlen für den Start):
   - neuen Release erstellen, `.aab` hochladen
   - Tester-E-Mails hinterlegen, Link teilen → auf echten Geräten testen
5. Wenn alles passt: zu **Produktion** hochstufen und veröffentlichen.
   (Erstprüfung durch Google dauert meist einige Stunden bis wenige Tage.)

> **App-Signing:** Beim ersten Upload „Play App Signing" aktivieren (Standard) —
> Google verwaltet den Signaturschlüssel; EAS signiert den Upload-Key.

---

## Vor dem Build nochmal prüfen
- [ ] Migrationen 0014 + 0015 in Supabase ausgeführt
- [ ] Code-Einlösung auf dem Test-APK funktioniert (Bearer-Fix ist live)
- [ ] In den eas.json `submit.production.track` steht „internal" (für Start ok)
