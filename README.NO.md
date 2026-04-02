# WP Folders

WP Folders legger til virtuelle mapper og undermapper i WordPress Media Library uten å endre de fysiske filstiene i `uploads`.

Pluginen flytter, gir nytt navn til eller kopierer ikke filer på disk. Den lagrer kun relasjoner mellom WordPress-vedlegg og virtuelle mapper.

## Screenshots

### Main Library

![screen](./screens/output.gif)

### Grid View

![screen](./screens/screen-1.png)

### List View

![screen](./screens/screen-2.png)

### Attachment Modal

![screen](./screens/screen-3.png)

### Settings

![screen](./screens/screen-4.png)

## Installation

1. Bruk standard installasjon av plugin eller kopier plugin-mappen til `wp-content/plugins/`.
2. Sørg for at strukturen ser slik ut:
3. Logg inn i WordPress adminpanel.
4. Gå til `Plugins`.
5. Aktiver `WP Folders`.
6. Etter aktivering åpne:
   `Media -> WP Folders`

## What The Plugin Does

- Oppretter virtuelle mapper for mediefiler.
- Støtter nestede mapper og undermapper.
- Fungerer oppå standard WordPress-vedlegg.
- Endrer ikke den fysiske plasseringen av filer i `uploads`.
- Endrer ikke eksisterende fil-URLer.

## Main Features

- Opprette mapper og undermapper for mediefiler.
- Flytte filer mellom mapper uten å endre deres fysiske plassering.
- Eget WP Folders mediebibliotek med grid- og listevisning.
- Filtrere filer etter mappe, type, dato og søk.
- Laste opp filer direkte til gjeldende mappe.
- Redigere metadata for vedlegg:
  alt-tekst, tittel, bildetekst, beskrivelse.
- Kopiere fil-URL til utklippstavlen.
- Vise detaljer om vedlegg i et modalvindu.
- Visuell sortering av filer i grid-visning.
- Tabellmodus med massehandlinger og paginering.
- Sortering av kolonner i listevisning.
- Vise total størrelse på mediebiblioteket.
- Støtte for ikke-tilordnede filer.

## Library Overview

I WP Folders-biblioteket er følgende funksjoner tilgjengelige:

- Venstre panel med mappetre.
- Rottilstand `All Media`.
- Egen tilstand `Unassigned`.
- Opprette rotmappe.
- Opprette undermappe.
- Gi nytt navn til mappe.
- Slette mappe.
- Telle filer i mapper.
- Vise total størrelse på mediebiblioteket.

## Uploading Files

- Knappen `Upload files` åpner opplastingspanelet.
- Dra-og-slipp område tilgjengelig.
- Filer kan velges via systemets filvelger.
- Hvis en spesifikk mappe er åpen, kan nye filer tildeles den umiddelbart.
- Etter opplasting oppdateres biblioteket automatisk.

## Grid View

- Filkort med forhåndsvisning.
- Velg én eller flere filer.
- Visuell dra-og-slipp rekkefølge.
- Knappen `Select multiple`.
- Masseflytting til en annen mappe.
- Massesletting.
- Klikk på et kort åpner detaljmodal.

## List View

- Tabellvisning av filer.
- Kolonner:
  File, Author, Uploaded to, Comments, Date.
- Sortering av kolonner.
- Massehandlinger.
- Paginering.
- Velg alle for gjeldende side.
- Hurtighandlinger for rad:
  edit, delete permanently, view, copy URL, download.

## Filters And Search

WP Folders støtter:

- Søk i mediefiler.
- Filtrering etter filtype.
- Filtrering etter dato.
- Filtrering etter mappe.
- Valg `All media files`.
- Valg `All dates`.
- Systemtilstander:
  `Unattached`, `Mine`, `Unassigned`.

## Attachment Modal

Modalvinduet for fildetaljer inneholder:

- Forhåndsvisning av bilde eller filikon.
- Filnavn.
- MIME-type.
- Filstørrelse.
- Bildedimensjoner hvis tilgjengelig.
- Fil-URL.
- Knapp for å kopiere URL.
- Alt-tekst.
- Tittel.
- Bildetekst.
- Beskrivelse.
- Navigasjon mellom forrige og neste element.

## Settings

Pluginen har en egen innstillingsside:

`Media -> WP Folders`

### 1. Media Library Access

Konfigurerer hvordan WP Folders-biblioteket åpnes.

Tilgjengelige alternativer:

- `Create separate menu item for the WP Folders media library`
  Beholder standard WordPress Media Library uendret og viser WP Folders som et eget menypunkt i `Media`.

- `Redirect the standard Media Library to WP Folders`
  Omdirigerer standard `Media -> Library` til WP Folders og fjerner det separate menypunktet.

### 2. Media Library Items Per Page

Definerer hvor mange filer som vises per side i WP Folders-biblioteket.

Tilgjengelige verdier:

- `20`
- `50`
- `100`

### 3. Files Per Row In Grid View

Definerer hvor mange filer som vises per rad i grid-visning på store skjermer.

Tilgjengelige verdier:

- `5`
- `6`
- `7`
- `8`
- `9`
- `10`

## Files, URLs And Database

Viktige punkter om hvordan pluginen fungerer:

- Pluginen endrer ikke filstier.
- Pluginen endrer ikke filnavn.
- Pluginen endrer ikke fil-URLer.
- Filer forblir i standard WordPress uploads-struktur.
- Pluginen oppretter ikke egne databaser.
- Standard WordPress datastrukturer brukes:
  attachments, taxonomy relationships, options.

## What Happens If The Plugin Is Removed

- Alle opprettede WP Folders-mapper slettes.
- Alle relasjoner mellom filer og mapper fjernes.
- Selve mediefilene slettes ikke.
- Fysiske filer i `uploads` slettes ikke.
- Eksisterende fil-URLer fortsetter å fungere.
- Hvis pluginen installeres på nytt senere, må mapper opprettes på nytt.
