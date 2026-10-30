# ViaSteven website

Statische site voor ViaSteven, gehost op GitHub Pages. Geen bouwstap.

## Commando's
- `npm test`: tests van de hulpscripts
- `npm run build`: kop en voet synchroniseren en contactgegevens invullen
- `npm run check`: regels controleren (voorbeeld, met noindex)
- `npm run check:live`: strenge controle voor livegang
- `npm run serve`: lokaal bekijken op http://localhost:8080

## Regels
Elke pagina heeft exact `<meta name="robots" content="noindex">` tot `node scripts/go-live.js <domein>` draait. Paden zijn relatief. Lettertypen zijn zelf gehost.
