# Asteroids Arcade (Static Web Game)

Ein kleines, sofort spielbares Asteroids-Arcade-Spiel im Retro-Look mit **reinem HTML, CSS und JavaScript**.
Keine Build-Pipeline, kein Backend, keine Datenbank.

## Features

- 2D-Canvas-Gameplay im klassischen Asteroids-Stil
- Trägheitsbasierte Schiffsteuerung
- Screen-Wrapping für Schiff, Asteroiden und Schüsse
- Asteroiden splitten von groß -> mittel -> klein
- Kollisionen mit Leben-System (3 Leben)
- Score-System
- Game-Over-Screen mit sauberem Neustart
- Kleine visuelle Effekte (Schubflamme, Explosion-Partikel, Hit-Flash)

## Lokal starten

Da es eine statische Website ist, kannst du das Spiel direkt starten:

1. Repository klonen oder herunterladen.
2. `index.html` im Browser öffnen.

Optional (empfohlen): über einen einfachen lokalen Static-Server starten:

```bash
python3 -m http.server 8080
```

Dann im Browser öffnen: `http://localhost:8080`

## Als GitHub Pages Vorschau hosten

1. Projekt in ein GitHub-Repository pushen.
2. Auf GitHub: **Settings -> Pages** öffnen.
3. Unter **Build and deployment** bei **Source**: `Deploy from a branch` wählen.
4. Branch auswählen (z. B. `main`) und Ordner `/ (root)` auswählen.
5. Speichern.
6. Nach kurzer Zeit ist die Seite unter der angezeigten GitHub-Pages-URL erreichbar.

## Steuerung

- **Pfeil links/rechts**: Rotation
- **Pfeil hoch**: Schub
- **Leertaste**: Schießen
- **R**: Neustart nach Game Over

## Projektstruktur

```text
.
├── index.html   # Grundstruktur, Canvas und UI-Rahmen
├── style.css    # Retro-Arcade-Styling
├── script.js    # Komplette Spiellogik (Loop, Input, Entities, Kollisionen, Rendering)
└── README.md    # Dokumentation
```

## Hinweis

Das Spiel läuft komplett clientseitig und eignet sich daher ideal für statisches Hosting (z. B. GitHub Pages).
