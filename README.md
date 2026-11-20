# Bilverkstedet AS – Dokumentasjon

## Innholdsfortegnelse

1. [Beskrivelse av arkitektur](#beskrivelse-av-arkitektur)
   - [Login-side](#login-side)
   - [Registreringsside](#registreringsside)
   - [Kundebehandlerside](#kundebehandlerside)
   - [Mekanikerside](#mekanikerside)
2. [Teknologivalg](#teknologivalg)
3. [Sikkerhetsvurderinger](#sikkerhetsvurderinger)
4. [Relevante lover og forskrifter](#relevante-lover-og-forskrifter)
5. [Utfordringer og feil](#utfordringer-og-feil)

---

## Beskrivelse av arkitektur

Prosjektet bruker Next.js, som betyr at nettsidens ruter blir bestemt av mappestrukturen til prosjektet.

### Login-side

1. Brukeren åpner nettsiden og blir møtt av login-siden.
2. Brukeren skriver inn e-post og passordet til kontoen sin.
3. Frontend sender e-post og passord til API-ruten `/api/auth/login`.
4. API-ruten ser etter brukeren som har samme e-post i databasen.
5. `bcrypt` sammenligner passordet brukeren skrev inn med den hashede versjonen av passordet som er lagret i databasen.
6. Hvis alt stemmer, blir det laget en JWT-token med hjelp av `jose`. Tokenen inneholder informasjon om den innloggede brukeren, blant annet brukerens ID og rolle.
7. Tokenen blir lagret i en HTTP-only cookie som blir kalt `auth_token`.
8. Brukeren blir omdirigert til dashboardet som passer rollen deres.

### Registreringsside

1. Brukeren trykker på «Opprett konto»-knappen fra login-siden.
2. Brukeren fyller inn alle feltene og trykker «Opprett konto».
3. Frontend sjekker om begge passordene brukeren skrev inn er like, og om telefonnummeret er 8 sifre.
4. Hvis alt stemmer, sender frontend all informasjonen til registreringsruten `/api/auth/register`.
5. API-ruten trimmer navn, e-post og telefonnummer, og gjør e-postadressen om til små bokstaver for enklere bruk.
6. API-ruten sjekker om all informasjon har kommet inn riktig, har riktige verdier og er formatert riktig. Hvis ikke, returnerer den en feilmelding.
7. API-ruten sjekker om telefonnummeret er akkurat 8 sifre. Hvis ikke, returnerer den en feilmelding.
8. API-ruten sjekker om en bruker med samme e-post allerede finnes. Hvis en slik bruker finnes, returnerer den en feilmelding.
9. Passordet hashes med `bcrypt`, og en ny bruker blir opprettet i databasen.
10. Brukeren blir deretter omdirigert til login-siden.

### Kundebehandlerside

Brukeren logger inn med en resepsjonistbruker.

Layout-filen i `resepsjonist`-mappen kontrollerer om brukeren har en gyldig `auth_token`, og om JWT-tokenen inneholder riktig rolle. Hvis ikke, blir brukeren omdirigert til login-siden.

#### Registrere nye serviceavtaler

1. Brukeren fyller inn all nødvendig informasjon i serviceavtale-skjemaet.
2. Frontend sender all informasjonen til API-ruten for registrering av kunder og serviceavtaler.
3. API-ruten validerer og forsikrer seg om at all informasjon er formatert riktig, og kontrollerer at brukeren har riktig rolle og en gyldig `auth_token`.
4. Deretter oppretter API-ruten en ny kunde, bil og serviceavtale i Supabase.

#### Vise dagens avtaler

1. API-ruten `/api/dagensAvtaler` henter alle serviceavtalene som har dagens dato fra Supabase og sender dem til frontend.
2. Frontend viser dagens serviceavtaler og informasjonen deres.

#### Vise alle avtaler

1. Frontend sender en GET-forespørsel til API-ruten `/api/resepsjonist/alleAvtaler`.
2. API-ruten henter alle avtaler, uansett om de er ferdige eller ikke, og sender dem tilbake.
3. Frontend viser alle serviceavtalene.

#### Redigere personopplysninger og avtaler

1. Resepsjonisten fyller inn alle feltene den vil forandre informasjon i, og trykker på lagre.
2. Frontend sender all informasjonen i en PATCH-forespørsel til API-ruten `/api/resepsjonist/alleAvtaler`.
3. API-ruten sjekker og verifiserer all informasjonen før den oppdaterer den valgte kunden, bilen og serviceavtalen med den nye informasjonen.

#### Slette opplysninger og avtale

1. Resepsjonisten trykker på slett-knappen på en valgt avtale.
2. Frontend sender en DELETE-forespørsel til `/api/resepsjonist/alleAvtaler`.
3. API-ruten henter først kunde- og bil-ID fra serviceavtalen før den slettes.
4. Deretter slettes serviceavtalen.
5. API-ruten sjekker også om bilen og kunden fremdeles er knyttet til andre serviceavtaler før den eventuelt sletter dem.

#### Vise fullførte avtaler fra de siste 7 dagene

1. API-ruten `/api/lastCompleted` filtrerer avtalene etter status og dato, slik at den bare returnerer avtalene som har blitt fullført de siste 7 dagene.
2. Frontend viser alle fullførte serviceavtaler fra de siste 7 dagene.

### Mekanikerside

Brukeren logger inn med en mekanikerbruker.

Layout-filen i `mekaniker`-mappen kontrollerer om brukeren har en gyldig `auth_token`, og om JWT-tokenen inneholder riktig rolle. Hvis ikke, blir brukeren omdirigert til login-siden.

#### Laste inn egne avtaler

1. Siden ber om alle avtaler som er tildelt den innloggede mekanikeren.
2. API-ruten `/api/mekaniker/loadAvtaler` filtrerer etter alle avtaler som har blitt tildelt til mekanikeren, og returnerer nødvendig informasjon.
3. Frontend viser den returnerte informasjonen slik at mekanikerne kan se alle avtalene sine.

#### Oppdatere og ferdiggjøre avtaler

1. Brukeren trykker på «Marker som under arbeid» for å starte avtalen og endre status.
2. API-ruten `/api/mekaniker/oppdaterAvtaler` oppdaterer avtalens status i databasen.
3. Brukeren fyller inn timer brukt og deler brukt, og trykker deretter på «Registrer utført arbeid».
4. Frontend sjekker om timer brukt og deler brukt er fylt inn når knappen blir trykket. Hvis ikke, blir brukeren advart om at alle felt må fylles ut.
5. API-ruten validerer informasjonen og oppdaterer avtalen med de nye verdiene i databasen.
6. Frontend oppdaterer seg og viser at avtalen er fullført, hvor mange timer som ble brukt og hvilke deler som ble brukt.

---

## Teknologivalg

| Teknologi | Bruk | Begrunnelse |
|---|---|---|
| **Next.js** | Backend og routing | Next.js gjør det enklere å lage nettsider og API-ruter i samme prosjekt. |
| **Node.js** | Kjøre JavaScript utenfor nettleseren | Node.js gjør det mulig å kjøre JavaScript på serveren, blant annet for backend-koden i prosjektet. |
| **Supabase** | Database og backend-funksjonalitet | Supabase er en tjeneste hvor man kan ha databaser, og det gjør det enkelt å sende og hente informasjon fra databasen i API-rutene. |
| **TailwindCSS** | Visuell design og styling | Tailwind lar deg skrive CSS ved å bruke ferdige klasser direkte på elementer i komponentene. Dette gjør det enklere å bruke ting som `:hover` og responsiv styling direkte på elementer. Det gjør det også enklere å holde samme styling gjennom hele nettsiden. |
| **TypeScript** | Kodespråk og debugging | TypeScript er JavaScript med et typesystem som lar deg bestemme hvilke typer verdier variabler skal ha. Dette gjør at du kan få beskjed hvis du prøver å bruke feil type verdier. |
| **React** | Interaktivt UI | React gjør det enkelt å lage interaktive elementer og oppdatere nettsiden automatisk med for eksempel `useState`. |
| **GitHub** | Lagring av kode og versjonskontroll | GitHub blir brukt for å lagre prosjektet på nettet og holde oversikt over endringer i koden. GitHub Desktop gjør det enklere for meg å lagre endringer i commits og sende dem til GitHub-repositoriet. |
| **jose** | Lage og verifisere tokens | `jose` lar deg lage og verifisere tokens som inneholder informasjon om en innlogget bruker. |
| **bcryptjs** | Hashe passord | `bcryptjs` lar deg hashe passord slik at de blir tryggere å lagre i databasen. |
| **npm** | Installasjon av pakker | npm blir brukt til å installere og administrere pakker som kan bli brukt i prosjektet, slik som `jose` og `bcryptjs`. |

---

## Sikkerhetsvurderinger

### Autentisering

Jeg passer på å sjekke etter `auth_token` for å forsikre meg om at brukeren er logget inn i systemet. Hvis et gyldig innloggingstoken ikke blir funnet, får ikke brukeren tilgang til beskyttede API-ruter. Dette blir gjort ved å kontrollere at tokenet finnes, at signaturen er gyldig og at tokenet ikke har utløpt.

### Autorisering

Når det har blitt bekreftet at brukeren er logget inn og har en gyldig `auth_token`, sjekker API-ruten om brukeren har riktig rolle for å få tilgang til informasjonen. Den gjør dette ved å kontrollere hvilken rolle brukeren har. Hvis brukeren har feil rolle, returnerer API-ruten en feilmelding uten å gi dem tilgang til informasjonen.

### Verifisere verdier

Selv om en bruker har riktig konto for API-rutene, kan de fremdeles sende feil informasjon og verdier til backend. For å bekrefte at verdiene som blir sendt er av den typen de er ment til å være, blir verdiene validert for å kontrollere at de inneholder og følger kravene de er ment å følge. Hvis en verdi er feil, blir den ikke brukt, og ruten returnerer en feil i stedet for å fullføre operasjonen.

### Tilgangskontroll

Alle brukere kan ikke få all informasjon de vil heller. På mekanikersiden er det en API-rute som henter informasjon om serviceavtaler, men den filtrerer etter avtaler som er tildelt den innloggede mekanikeren. Dette betyr at mekaniker A ikke kan hente eller gjøre endringer på serviceavtaler som er tildelt mekaniker B, men bare avtaler som er tildelt spesifikt mekaniker A.

### Beskytte verdifull informasjon

Når en bruker registrerer en konto, blir ikke passordet de skrev inn lagret akkurat som det er. Før den nye brukeren blir lagret i databasen, blir passordet hashet ved å bruke `bcrypt`. Dette betyr at hvis noen får tilgang til databasen og brukerens passord der, kan de ikke lese brukerens faktiske passord direkte. Det blir mye vanskeligere å finne det opprinnelige passordet.

`auth_token` blir også lagret som en HTTP-only cookie. Dette betyr at JavaScript i frontend ikke kan lese innholdet i cookien direkte, noe som gjør det vanskeligere for angripere å stjele tokenet gjennom for eksempel XSS-angrep.

`auth_token` er også signert med `AUTH_SECRET` fra `.env`-filen. Denne filen inneholder hemmelig informasjon som bare skal være tilgjengelig på serveren, og den blir ikke sendt til nettsiden. Siden tokenet er signert med `AUTH_SECRET`, kan backend bruke denne hemmeligheten til å kontrollere at tokenet er ekte og ikke har blitt endret. Det er derfor viktig at `AUTH_SECRET` aldri blir gjort tilgjengelig for frontend eller andre uvedkommende.

### Personvern

Siden systemet håndterer personopplysninger som navn, e-post, telefonnummer og lignende, må disse opplysningene bli håndtert riktig og tatt vare på. Som nevnt tidligere passer systemet på at bare brukere med riktige roller kan få tilgang til spesifikk informasjon om kundene. API-rutene henter også kun de nødvendige opplysningene som trengs for oppgaven de gjør, og systemet prøver ikke å hente mer informasjon fra databasen enn det som er nødvendig.

---

## Relevante lover og forskrifter

### Personopplysningsloven og GDPR

GDPR (General Data Protection Regulation) er regelverket i EU som regulerer hvordan for eksempel bedrifter samler inn, bruker og håndterer personopplysninger. Selv om Norge ikke er medlem av EU, gjelder GDPR også i Norge gjennom EØS-avtalen. Personopplysningsloven er den norske loven som gjør GDPR til en del av norsk lovgivning og inneholder også norske regler som supplerer GDPR.

Et eksempel på en regel er at bedrifter bare skal samle inn nødvendige opplysninger om folk. Altså kan de bare lagre informasjon de har et gyldig formål og behandlingsgrunnlag for.

### Dataminimering

Prinsippet om at bare nødvendig informasjon skal bli lagret og brukt. Jeg har prøvd å følge dette prinsippet ved å bare kreve informasjon fra kunder som jeg tenker er nødvendig. API-rutene henter også bare informasjon fra databasen som de trenger for å fungere.

### Integritet og konfidensialitet

Prinsippet om at man må beskytte informasjon mot uautorisert tilgang, tap og endringer. De beskyttede API-rutene autentiserer og autoriserer brukere og sjekker rollen deres for å finne ut om kontoen deres får lov til å hente og sende nødvendig informasjon til databasen.

### Lagringsbegrensning

Prinsippet om at opplysninger ikke skal bli lagret lenger enn nødvendig. Jeg har ikke fått implementert automatisk sletting av gamle personopplysninger, så dette må håndteres manuelt foreløpig.

### Riktighet

Prinsippet om at personopplysninger skal være korrekte og oppdaterte. Resepsjonisten kan redigere og oppdatere personopplysningene til en kunde hvis det er nødvendig.

### Slette opplysninger hvis spurt

Kunder har under visse vilkår rett til å be om at personopplysningene deres skal bli slettet. Denne retten gjelder ikke i alle situasjoner, siden bedrifter i noen tilfeller kan ha lovpålagte grunner til å beholde enkelte opplysninger.

I systemet kan resepsjonisten slette en serviceavtale og tilhørende kunde- og bilinformasjon dersom de ikke lenger er knyttet til andre serviceavtaler. Dette gjør det mulig å slette opplysninger som ikke lenger er nødvendige, men systemet har ikke en egen funksjon som vurderer alle juridiske unntak fra retten til sletting.

---

## Utfordringer og feil

### Slette kunde og bil som tilhører serviceavtale

Når jeg implementerte sletting av personopplysninger, startet jeg med å bare slette serviceavtalen. Når jeg senere prøvde å få kunden og bilen som tilhører avtalen til å også bli slettet, fikk jeg alltid en error, men avtalen ble alltid slettet.

Til slutt merket jeg at jeg prøvde å hente kunde- og bil-ID fra serviceavtalen etter at jeg hadde slettet avtalen. Da klarte ikke API-ruten å finne serviceavtalen og hente ID-ene som den skulle bruke til å slette kunden og bilen. Jeg fikset dette ved å reorganisere koden slik at kunde- og bil-ID ble hentet fra serviceavtalen før den ble slettet.

### Sikkerhet

Jeg slet ganske med sikkerhet fordi jeg hadde laget mesteparten av backend og API-rutene først uten sikkerhet, så det var vanskeligere å legge til så mange nye deler i et allerede kodet skript. Det var også vanskelig å tenke på alle sikkerhetsfunksjonene jeg trengte og hva jeg måtte beskytte dataene mot.

Jeg endte opp med å bruke JWT-tokens for å autentisere brukere og kontrollere hvilken rolle de har for å autorisere dem. Jeg brukte også `bcrypt` for å hashe passord og HTTP-only cookies for å beskytte innloggingstokenet.