
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { supabase } from "../../supabaseClient";

// Henter hemmeligheten som brukes til å kontrollere JWT-tokenet.
function getSecret() {
    const secret = process.env.AUTH_SECRET;

    if (!secret) {
        throw new Error("AUTH_SECRET mangler.");
    }

    return new TextEncoder().encode(secret);
}

export async function GET() {
    try {
        // Kontrollerer at brukeren har en innloggingscookie.
        const cookieStore = await cookies();
        const token = cookieStore.get("auth_token")?.value;

        if (!token) {
            return NextResponse.json(
                { success: false, error: "Du må være logget inn." },
                { status: 401 }
            );
        }

        // Kontrollerer at tokenet er ekte og ikke har utløpt.
        let payload;

        try {
            const result = await jwtVerify(token, getSecret(), {
                algorithms: ["HS256"],
            });

            payload = result.payload;
        } catch {
            return NextResponse.json(
                { success: false, error: "Ugyldig eller utløpt innlogging." },
                { status: 401 }
            );
        }

        // Kontrollerer at tokenet inneholder en gyldig bruker-ID.
        if (
            (typeof payload.id !== "string" &&
                typeof payload.id !== "number") ||
            String(payload.id).trim() === ""
        ) {
            return NextResponse.json(
                { success: false, error: "Ugyldig bruker." },
                { status: 401 }
            );
        }

        // Henter brukerens nåværende rolle fra databasen.
        const { data: bruker, error: brukerFeil } = await supabase
            .from("brukere")
            .select("id, role")
            .eq("id", payload.id)
            .maybeSingle();

        if (brukerFeil) {
            console.error("Feil ved kontroll av bruker:", brukerFeil.code);

            return NextResponse.json(
                { success: false, error: "Kunne ikke kontrollere brukeren." },
                { status: 500 }
            );
        }

        // Kontrollerer at brukeren fremdeles eksisterer og er resepsjonist.
        if (!bruker || bruker.role !== "resepsjonist") {
            return NextResponse.json(
                { success: false, error: "Du har ikke tilgang." },
                { status: 403 }
            );
        }

        // Henter alle serviceavtaler med feltene som trengs i oversikten.
        const { data: avtaler, error: avtaleFeil } = await supabase
            .from("serviceavtaler")
            .select(`
                id,
                dato,
                tid,
                status,
                beskrivelse,
                kunde,
                bil,
                tildelt_mekaniker,
                antall_timer,
                deler_brukt
            `)
            .order("dato", { ascending: false })
            .order("tid", { ascending: false });

        if (avtaleFeil) {
            console.error("Feil ved henting av serviceavtaler:", avtaleFeil.code);

            return NextResponse.json(
                { success: false, error: "Kunne ikke hente serviceavtalene." },
                { status: 500 }
            );
        }

        // Returnerer en tom liste dersom det ikke finnes noen avtaler.
        if (!avtaler || avtaler.length === 0) {
            return NextResponse.json({
                success: true,
                avtaler: [],
            });
        }

        // Henter unike ID-er slik at vi slipper å hente samme informasjon flere ganger.
        const kundeIds = [...new Set(avtaler.map((avtale) => avtale.kunde))];
        const bilIds = [...new Set(avtaler.map((avtale) => avtale.bil))];
        const mekanikerIds = [
            ...new Set(avtaler.map((avtale) => avtale.tildelt_mekaniker)),
        ];

        // Henter kundeinformasjon.
        const { data: kunder, error: kundeFeil } = await supabase
            .from("kunder")
            .select("id, navn, telefon, epost")
            .in("id", kundeIds);

        if (kundeFeil) {
            console.error("Feil ved henting av kunder:", kundeFeil.code);

            return NextResponse.json(
                { success: false, error: "Kunne ikke hente kundeinformasjon." },
                { status: 500 }
            );
        }

        // Henter bilinformasjon.
        const { data: biler, error: bilFeil } = await supabase
            .from("biler")
            .select("id, merke, registreringsnummer")
            .in("id", bilIds);

        if (bilFeil) {
            console.error("Feil ved henting av biler:", bilFeil.code);

            return NextResponse.json(
                { success: false, error: "Kunne ikke hente bilinformasjon." },
                { status: 500 }
            );
        }

        // Henter mekanikernavnene.
        const { data: mekanikere, error: mekanikerFeil } = await supabase
            .from("brukere")
            .select("id, navn")
            .in("id", mekanikerIds)
            .eq("role", "mekaniker");

        if (mekanikerFeil) {
            console.error("Feil ved henting av mekanikere:", mekanikerFeil.code);

            return NextResponse.json(
                { success: false, error: "Kunne ikke hente mekanikerinformasjon." },
                { status: 500 }
            );
        }

        // Lager oppslagstabeller slik at informasjonen kan kobles til riktig avtale.
        const kundeMap = new Map(kunder.map((kunde) => [kunde.id, kunde]));
        const bilMap = new Map(biler.map((bil) => [bil.id, bil]));
        const mekanikerMap = new Map(
            mekanikere.map((mekaniker) => [mekaniker.id, mekaniker])
        );

        // Setter sammen serviceavtalene med tilhørende kunde, bil og mekaniker.
        const ferdigeAvtaler = avtaler.map((avtale) => {
            const kunde = kundeMap.get(avtale.kunde);
            const bil = bilMap.get(avtale.bil);
            const mekaniker = mekanikerMap.get(avtale.tildelt_mekaniker);

            return {
                id: avtale.id,
                dato: avtale.dato,
                tid: avtale.tid,
                status: avtale.status,
                desc: avtale.beskrivelse,

                kundeId: avtale.kunde,
                kunde: kunde?.navn ?? "Ukjent kunde",
                telefon: kunde?.telefon ?? "",
                epost: kunde?.epost ?? "",

                bilId: avtale.bil,
                model: bil?.merke ?? "Ukjent bil",
                registreringsnummer: bil?.registreringsnummer ?? "",

                mekanikerId: avtale.tildelt_mekaniker,
                mekaniker: mekaniker?.navn ?? "Ukjent mekaniker",

                antall_timer: avtale.antall_timer,
                deler_brukt: avtale.deler_brukt,
            };
        });

        return NextResponse.json({
            success: true,
            avtaler: ferdigeAvtaler,
        });

    } catch (error) {
        // Logger bare en generell feil, ikke personopplysninger eller tokeninnhold.
        console.error("Uventet feil ved henting av alle serviceavtaler:", error instanceof Error ? error.message : "Ukjent feil");

        return NextResponse.json(
            { success: false, error: "En uventet feil oppstod." },
            { status: 500 }
        );
    }
}


export async function PATCH(request: Request) {
    try {
        // Sjekker om brukeren er logget inn.
        const cookieStore = await cookies();
        const token = cookieStore.get("auth_token")?.value;

        if (!token) {
            return NextResponse.json(
                { success: false, error: "Du må være logget inn." },
                { status: 401 }
            );
        }

        // Kontrollerer at innloggingstokenet er gyldig.
        let payload;

        try {
            const result = await jwtVerify(token, getSecret(), {
                algorithms: ["HS256"],
            });

            payload = result.payload;
        } catch {
            return NextResponse.json(
                { success: false, error: "Ugyldig innlogging." },
                { status: 401 }
            );
        }

        // Sjekker at bruker-ID-en er gyldig.
        if (
            (typeof payload.id !== "string" &&
                typeof payload.id !== "number") ||
            String(payload.id).trim() === ""
        ) {
            return NextResponse.json(
                { success: false, error: "Ugyldig bruker." },
                { status: 401 }
            );
        }

        // Sjekker brukerens nåværende rolle i databasen.
        const { data: bruker, error: brukerFeil } = await supabase
            .from("brukere")
            .select("id, role")
            .eq("id", payload.id)
            .maybeSingle();

        if (brukerFeil) {
            console.error(brukerFeil.code);
            return NextResponse.json(
                { success: false, error: "Kunne ikke kontrollere brukeren." },
                { status: 500 }
            );
        }

        if (!bruker || bruker.role !== "resepsjonist") {
            return NextResponse.json(
                { success: false, error: "Du har ikke tilgang." },
                { status: 403 }
            );
        }

        // Henter informasjonen som skal endres.
        const body = await request.json();

        const id = Number(body.id);

        if (!Number.isSafeInteger(id) || id <= 0) {
            return NextResponse.json(
                { success: false, error: "Ugyldig serviceavtale-ID." },
                { status: 400 }
            );
        }

        // Henter ID-ene til kunden og bilen fra serviceavtalen.
        const { data: gammelAvtale, error: henteFeil } = await supabase
            .from("serviceavtaler")
            .select("id, kunde, bil")
            .eq("id", id)
            .maybeSingle();

        if (henteFeil) {
            console.error(henteFeil.code);
            return NextResponse.json(
                { success: false, error: "Kunne ikke hente serviceavtalen." },
                { status: 500 }
            );
        }

        if (!gammelAvtale) {
            return NextResponse.json(
                { success: false, error: "Serviceavtalen finnes ikke." },
                { status: 404 }
            );
        }

        // Lager objekter med informasjonen som skal oppdateres.
        const kundeOppdateringer: Record<string, string> = {};
        const bilOppdateringer: Record<string, string> = {};
        const avtaleOppdateringer: Record<string, string | number> = {};

        // Kontrollerer og legger til kundeinformasjon.
        if (body.navn !== undefined) {
            if (
                typeof body.navn !== "string" ||
                !body.navn.trim() ||
                body.navn.length > 100
            ) {
                return NextResponse.json(
                    { success: false, error: "Ugyldig kundenavn." },
                    { status: 400 }
                );
            }

            kundeOppdateringer.navn = body.navn.trim();
        }

        if (body.telefon !== undefined) {
            if (
                typeof body.telefon !== "string" ||
                !body.telefon.trim() ||
                body.telefon.length > 30
            ) {
                return NextResponse.json(
                    { success: false, error: "Ugyldig telefonnummer." },
                    { status: 400 }
                );
            }

            kundeOppdateringer.telefon = body.telefon.trim();
        }

        if (body.epost !== undefined) {
            if (
                typeof body.epost !== "string" ||
                body.epost.length > 254 ||
                (body.epost.trim() !== "" &&
                    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.epost.trim()))
            ) {
                return NextResponse.json(
                    { success: false, error: "Ugyldig e-postadresse." },
                    { status: 400 }
                );
            }

            kundeOppdateringer.epost = body.epost.trim();
        }

        // Kontrollerer og legger til bilinformasjon.
        if (body.merke !== undefined) {
            if (
                typeof body.merke !== "string" ||
                !body.merke.trim() ||
                body.merke.length > 100
            ) {
                return NextResponse.json(
                    { success: false, error: "Ugyldig bilmerke." },
                    { status: 400 }
                );
            }

            bilOppdateringer.merke = body.merke.trim();
        }

        if (body.registreringsnummer !== undefined) {
            if (
                typeof body.registreringsnummer !== "string" ||
                !body.registreringsnummer.trim() ||
                body.registreringsnummer.length > 20
            ) {
                return NextResponse.json(
                    { success: false, error: "Ugyldig registreringsnummer." },
                    { status: 400 }
                );
            }

            bilOppdateringer.registreringsnummer =
                body.registreringsnummer.trim();
        }

        // Kontrollerer og legger til informasjon om serviceavtalen.
        if (body.dato !== undefined) {
            const datoObjekt = new Date(`${body.dato}T00:00:00.000Z`);

            if (
                typeof body.dato !== "string" ||
                !/^\d{4}-\d{2}-\d{2}$/.test(body.dato) ||
                Number.isNaN(datoObjekt.getTime()) ||
                datoObjekt.toISOString().slice(0, 10) !== body.dato
            ) {
                return NextResponse.json(
                    { success: false, error: "Ugyldig dato." },
                    { status: 400 }
                );
            }

            avtaleOppdateringer.dato = body.dato;
        }

        if (body.tid !== undefined) {
            if (
                typeof body.tid !== "string" ||
                !/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(body.tid)
            ) {
                return NextResponse.json(
                    { success: false, error: "Ugyldig klokkeslett." },
                    { status: 400 }
                );
            }

            avtaleOppdateringer.tid = body.tid;
        }

        if (body.beskrivelse !== undefined) {
            if (
                typeof body.beskrivelse !== "string" ||
                !body.beskrivelse.trim() ||
                body.beskrivelse.length > 2000
            ) {
                return NextResponse.json(
                    { success: false, error: "Ugyldig beskrivelse." },
                    { status: 400 }
                );
            }

            avtaleOppdateringer.beskrivelse = body.beskrivelse.trim();
        }

        if (body.tildelt_mekaniker !== undefined) {
            const mekanikerId = Number(body.tildelt_mekaniker);

            if (!Number.isSafeInteger(mekanikerId) || mekanikerId <= 0) {
                return NextResponse.json(
                    { success: false, error: "Ugyldig mekaniker." },
                    { status: 400 }
                );
            }

            // Kontrollerer at den valgte brukeren er en mekaniker.
            const { data: mekaniker, error: mekanikerFeil } = await supabase
                .from("brukere")
                .select("id")
                .eq("id", mekanikerId)
                .eq("role", "mekaniker")
                .maybeSingle();

            if (mekanikerFeil) {
                console.error(mekanikerFeil.code);
                return NextResponse.json(
                    { success: false, error: "Kunne ikke kontrollere mekanikeren." },
                    { status: 500 }
                );
            }

            if (!mekaniker) {
                return NextResponse.json(
                    { success: false, error: "Mekanikeren finnes ikke." },
                    { status: 400 }
                );
            }

            avtaleOppdateringer.tildelt_mekaniker = mekanikerId;
        }

        if (body.status !== undefined) {
            const tillatteStatuser = [
                "Ikke påbegynt",
                "Under arbeid",
                "Ferdig",
            ];

            if (
                typeof body.status !== "string" ||
                !tillatteStatuser.includes(body.status)
            ) {
                return NextResponse.json(
                    { success: false, error: "Ugyldig status." },
                    { status: 400 }
                );
            }

            avtaleOppdateringer.status = body.status;
        }

        // Sjekker at det faktisk er noe å oppdatere.
        if (
            Object.keys(kundeOppdateringer).length === 0 &&
            Object.keys(bilOppdateringer).length === 0 &&
            Object.keys(avtaleOppdateringer).length === 0
        ) {
            return NextResponse.json(
                { success: false, error: "Ingen endringer ble sendt." },
                { status: 400 }
            );
        }

        // Oppdaterer kundeinformasjonen dersom noe er endret.
        if (Object.keys(kundeOppdateringer).length > 0) {
            const { error } = await supabase
                .from("kunder")
                .update(kundeOppdateringer)
                .eq("id", gammelAvtale.kunde);

            if (error) {
                console.error(error.code);
                return NextResponse.json(
                    { success: false, error: "Kunne ikke oppdatere kundeinformasjonen." },
                    { status: 500 }
                );
            }
        }

        // Oppdaterer bilinformasjonen dersom noe er endret.
        if (Object.keys(bilOppdateringer).length > 0) {
            const { error } = await supabase
                .from("biler")
                .update(bilOppdateringer)
                .eq("id", gammelAvtale.bil);

            if (error) {
                console.error(error.code);
                return NextResponse.json(
                    { success: false, error: "Kunne ikke oppdatere bilinformasjonen." },
                    { status: 500 }
                );
            }
        }

        // Oppdaterer serviceavtalen dersom noe er endret.
        if (Object.keys(avtaleOppdateringer).length > 0) {
            const { error } = await supabase
                .from("serviceavtaler")
                .update(avtaleOppdateringer)
                .eq("id", id);

            if (error) {
                console.error(error.code);
                return NextResponse.json(
                    { success: false, error: "Kunne ikke oppdatere serviceavtalen." },
                    { status: 500 }
                );
            }
        }

        return NextResponse.json({
            success: true,
            message: "Informasjonen ble oppdatert.",
        });

    } catch (error) {
        console.error(
            "Feil ved oppdatering:",
            error instanceof Error ? error.message : "Ukjent feil"
        );

        return NextResponse.json(
            { success: false, error: "En uventet feil oppstod." },
            { status: 500 }
        );
    }
}

export async function DELETE(request: Request) {
    try {
        // Sjekker om brukeren er logget inn.
        const cookieStore = await cookies();
        const token = cookieStore.get("auth_token")?.value;

        if (!token) {
            return NextResponse.json(
                { success: false, error: "Du må være logget inn." },
                { status: 401 }
            );
        }

        // Kontrollerer at innloggingstokenet er gyldig.
        let payload;

        try {
            const result = await jwtVerify(token, getSecret(), {
                algorithms: ["HS256"],
            });

            payload = result.payload;
        } catch {
            return NextResponse.json(
                { success: false, error: "Ugyldig innlogging." },
                { status: 401 }
            );
        }

        // Sjekker at bruker-ID-en er gyldig.
        if (
            (typeof payload.id !== "string" && typeof payload.id !== "number") ||
            String(payload.id).trim() === ""
        ) {
            return NextResponse.json(
                { success: false, error: "Ugyldig bruker." },
                { status: 401 }
            );
        }

        // Sjekker at brukeren faktisk er en resepsjonist.
        const { data: bruker, error: brukerFeil } = await supabase
            .from("brukere")
            .select("id, role")
            .eq("id", payload.id)
            .maybeSingle();

        if (brukerFeil) {
            console.error(brukerFeil.code);
            return NextResponse.json(
                { success: false, error: "Kunne ikke kontrollere brukeren." },
                { status: 500 }
            );
        }

        if (!bruker || bruker.role !== "resepsjonist") {
            return NextResponse.json(
                { success: false, error: "Du har ikke tilgang." },
                { status: 403 }
            );
        }

        // Henter ID-en til serviceavtalen fra URL-en.
        const url = new URL(request.url);
        const idParameter = url.searchParams.get("id");

        if (
            !idParameter ||
            !/^[1-9]\d*$/.test(idParameter) ||
            !Number.isSafeInteger(Number(idParameter))
        ) {
            return NextResponse.json(
                { success: false, error: "Ugyldig serviceavtale-ID." },
                { status: 400 }
            );
        }

        const id = Number(idParameter);

        // Sletter serviceavtalen fra databasen.

        // Henter kunde- og bil-ID før serviceavtalen slettes.
        const { data: avtale, error: avtaleFeil } = await supabase
            .from("serviceavtaler")
            .select("kunde, bil")
            .eq("id", id)
            .maybeSingle();

        if (avtaleFeil) {
            console.error("Feil ved henting av serviceavtale:", avtaleFeil.code);
            return NextResponse.json(
                { success: false, error: "Kunne ikke hente serviceavtalen." },
                { status: 500 }
            );
        }

        if (!avtale) {
            return NextResponse.json(
                { success: false, error: "Serviceavtalen finnes ikke." },
                { status: 404 }
            );
        }

        // Sletter serviceavtalen.
        const { error: slettingFeil } = await supabase
            .from("serviceavtaler")
            .delete()
            .eq("id", id);

        if (slettingFeil) {
            console.error("Feil ved sletting av serviceavtale:", slettingFeil.code);
            return NextResponse.json(
                { success: false, error: "Kunne ikke slette serviceavtalen." },
                { status: 500 }
            );
        }

        // Sjekker om bilen brukes av andre serviceavtaler.
        const { data: andreBilAvtaler, error: bilSjekkFeil } = await supabase
            .from("serviceavtaler")
            .select("id")
            .eq("bil", avtale.bil);

        if (bilSjekkFeil) {
            console.error("Feil ved kontroll av bil:", bilSjekkFeil.code);
            return NextResponse.json(
                { success: false, error: "Kunne ikke kontrollere bilen." },
                { status: 500 }
            );
        }

        // Sletter bilen hvis ingen andre avtaler bruker den.
        if (andreBilAvtaler.length === 0) {
            const { error: bilFeil } = await supabase
                .from("biler")
                .delete()
                .eq("id", avtale.bil);

            if (bilFeil) {
                console.error("Feil ved sletting av bil:", bilFeil.code);
                return NextResponse.json(
                    { success: false, error: "Kunne ikke slette bilen." },
                    { status: 500 }
                );
            }
        }

        // Sjekker om kunden har andre serviceavtaler.
        const { data: andreKundeAvtaler, error: kundeSjekkFeil } = await supabase
            .from("serviceavtaler")
            .select("id")
            .eq("kunde", avtale.kunde);

        if (kundeSjekkFeil) {
            console.error("Feil ved kontroll av kunde:", kundeSjekkFeil.code);
            return NextResponse.json(
                { success: false, error: "Kunne ikke kontrollere kunden." },
                { status: 500 }
            );
        }

        // Sletter kunden hvis ingen andre avtaler bruker kunden.
        if (andreKundeAvtaler.length === 0) {
            const { error: kundeFeil } = await supabase
                .from("kunder")
                .delete()
                .eq("id", avtale.kunde);

            if (kundeFeil) {
                console.error("Feil ved sletting av kunde:", kundeFeil.code);
                return NextResponse.json(
                    { success: false, error: "Kunne ikke slette kunden." },
                    { status: 500 }
                );
            }
        }

        return NextResponse.json({
            success: true,
            message: "Serviceavtalen ble slettet.",
        });

    } catch (error) {
        console.error(
            "Feil ved sletting:",
            error instanceof Error ? error.message : "Ukjent feil"
        );

        return NextResponse.json(
            { success: false, error: "En uventet feil oppstod." },
            { status: 500 }
        );
    }
}