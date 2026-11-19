
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
                deler_brukt,
                ferdig_dato
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
            .select("id, navn, telefon")
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

                bilId: avtale.bil,
                model: bil?.merke ?? "Ukjent bil",
                registreringsnummer: bil?.registreringsnummer ?? "",

                mekanikerId: avtale.tildelt_mekaniker,
                mekaniker: mekaniker?.navn ?? "Ukjent mekaniker",

                antall_timer: avtale.antall_timer,
                deler_brukt: avtale.deler_brukt,
                ferdig_dato: avtale.ferdig_dato,
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

        // Verifiserer innloggingstokenet.
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

        // Sjekker at bruker-ID-en fra tokenet er gyldig.
        if (!payload.id) {
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
        const { dato, tid, beskrivelse, tildelt_mekaniker, status } = body;

        // Kontrollerer at serviceavtale-ID-en er gyldig.
        if (!Number.isSafeInteger(id) || id <= 0) {
            return NextResponse.json(
                { success: false, error: "Ugyldig serviceavtale-ID." },
                { status: 400 }
            );
        }

        // Lager et objekt med feltene som skal oppdateres.
        const oppdateringer: Record<string, string | number | null> = {};

        if (dato !== undefined) {
            const datoObjekt = new Date(`${dato}T00:00:00.000Z`);

            if (
                typeof dato !== "string" ||
                !/^\d{4}-\d{2}-\d{2}$/.test(dato) ||
                Number.isNaN(datoObjekt.getTime()) ||
                datoObjekt.toISOString().slice(0, 10) !== dato
            ) {
                return NextResponse.json(
                    { success: false, error: "Ugyldig dato." },
                    { status: 400 }
                );
            }

            oppdateringer.dato = dato;
        }

        if (tid !== undefined) {
            if (
                typeof tid !== "string" ||
                !/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(tid)
            ) {
                return NextResponse.json(
                    { success: false, error: "Ugyldig klokkeslett." },
                    { status: 400 }
                );
            }

            oppdateringer.tid = tid;
        }

        if (beskrivelse !== undefined) {
            if (
                typeof beskrivelse !== "string" ||
                !beskrivelse.trim() ||
                beskrivelse.length > 2000
            ) {
                return NextResponse.json(
                    { success: false, error: "Ugyldig beskrivelse." },
                    { status: 400 }
                );
            }

            oppdateringer.beskrivelse = beskrivelse.trim();
        }

        if (tildelt_mekaniker !== undefined) {
            const mekanikerId = Number(tildelt_mekaniker);

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

            oppdateringer.tildelt_mekaniker = mekanikerId;
        }

        if (status !== undefined) {
            const tillatteStatuser = [
                "ikke påbegynt",
                "under arbeid",
                "ferdig",
            ];

            if (!tillatteStatuser.includes(status)) {
                return NextResponse.json(
                    { success: false, error: "Ugyldig status." },
                    { status: 400 }
                );
            }

            oppdateringer.status = status;
        }

        // Sjekker at det faktisk er noe å oppdatere.
        if (Object.keys(oppdateringer).length === 0) {
            return NextResponse.json(
                { success: false, error: "Ingen endringer ble sendt." },
                { status: 400 }
            );
        }

        // Henter eksisterende avtale.
        const { data: gammelAvtale, error: henteFeil } = await supabase
            .from("serviceavtaler")
            .select("id")
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

        // Oppdaterer serviceavtalen.
        const { data: oppdatertAvtale, error: oppdateringsFeil } = await supabase
            .from("serviceavtaler")
            .update(oppdateringer)
            .eq("id", id)
            .select("id")
            .maybeSingle();

        if (oppdateringsFeil) {
            console.error(oppdateringsFeil.code);
            return NextResponse.json(
                { success: false, error: "Kunne ikke oppdatere serviceavtalen." },
                { status: 500 }
            );
        }

        if (!oppdatertAvtale) {
            return NextResponse.json(
                { success: false, error: "Serviceavtalen ble ikke funnet." },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            message: "Serviceavtalen ble oppdatert.",
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
        const { data: slettetAvtale, error: slettingFeil } = await supabase
            .from("serviceavtaler")
            .delete()
            .eq("id", id)
            .select("id")
            .maybeSingle();

        if (slettingFeil) {
            console.error(slettingFeil.code);
            return NextResponse.json(
                { success: false, error: "Kunne ikke slette serviceavtalen." },
                { status: 500 }
            );
        }

        if (!slettetAvtale) {
            return NextResponse.json(
                { success: false, error: "Serviceavtalen finnes ikke." },
                { status: 404 }
            );
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