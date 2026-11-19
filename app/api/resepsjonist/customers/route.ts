import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { supabase } from "../../supabaseClient";

// Hent hemmeligheten som brukes til å kontrollere JWT-tokenet.
function getSecret() {
    const authSecret = process.env.AUTH_SECRET;

    if (!authSecret) {
        throw new Error("AUTH_SECRET mangler i miljøvariablene.");
    }

    return new TextEncoder().encode(authSecret);
}

// Kontroller at datoen er en gyldig kalenderdato.
function isValidDate(value: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false;
    }

    const date = new Date(`${value}T00:00:00Z`);

    return (
        !Number.isNaN(date.getTime()) &&
        date.toISOString().slice(0, 10) === value
    );
}

// Logg databasefeil uten å skrive kundedata.
function logDatabaseError(
    operation: string,
    error: { code?: string; message?: string }
) {
    console.error(`Databasefeil ved ${operation}:`, {
        code: error.code,
        message: error.message,
    });
}

export async function POST(request: Request) {
    try {
        // 1. Kontroller at brukeren er innlogget.
        const cookieStore = await cookies();
        const token = cookieStore.get("auth_token")?.value;

        if (!token) {
            return NextResponse.json(
                { success: false, error: "Du må være logget inn." },
                { status: 401 }
            );
        }

        // 2. Kontroller at JWT-tokenet er gyldig og ikke utløpt.
        let payload;

        try {
            const verified = await jwtVerify(token, getSecret(), {
                algorithms: ["HS256"],
            });

            payload = verified.payload;
        } catch {
            return NextResponse.json(
                { success: false, error: "Ugyldig eller utløpt innlogging." },
                { status: 401 }
            );
        }

        // Kontroller at tokenet inneholder nødvendig informasjon.
        if (
            (typeof payload.id !== "number" && typeof payload.id !== "string") ||
            typeof payload.role !== "string"
        ) {
            return NextResponse.json(
                { success: false, error: "Ugyldig innlogging." },
                { status: 401 }
            );
        }

        // 3. Kontroller at brukeren har riktig rolle.
        if (payload.role !== "resepsjonist") {
            return NextResponse.json(
                { success: false, error: "Du har ikke tilgang til denne funksjonen." },
                { status: 403 }
            );
        }

        // 4. Les dataene fra forespørselen.
        const body: unknown = await request.json();

        // Kontroller at forespørselen inneholder et objekt.
        if (!body || typeof body !== "object" || Array.isArray(body)) {
            return NextResponse.json(
                { success: false, error: "Ugyldige data." },
                { status: 400 }
            );
        }

        const data = body as Record<string, unknown>;

        // Kontroller at tekstfeltene faktisk inneholder tekst.
        const stringFields = [
            "name",
            "phone",
            "email",
            "number",
            "model",
            "date",
            "tid",
            "desc",
        ];

        for (const field of stringFields) {
            if (typeof data[field] !== "string") {
                return NextResponse.json(
                    { success: false, error: "Alle feltene må fylles ut korrekt." },
                    { status: 400 }
                );
            }
        }

        // Fjern unødvendige mellomrom og normaliser verdiene.
        const name = (data.name as string).trim();
        const phone = (data.phone as string).trim();
        const email = (data.email as string).trim().toLowerCase();
        const number = (data.number as string).trim().toUpperCase();
        const model = (data.model as string).trim();
        const date = (data.date as string).trim();
        const tid = (data.tid as string).trim();
        const desc = (data.desc as string).trim();

        // Kontroller at mekaniker-ID-en er et positivt heltall.
        const workerValue = data.worker;

        if (
            (typeof workerValue !== "string" && typeof workerValue !== "number") ||
            !/^\d+$/.test(String(workerValue))
        ) {
            return NextResponse.json(
                { success: false, error: "Ugyldig mekaniker." },
                { status: 400 }
            );
        }

        const worker = Number(workerValue);

        if (!Number.isSafeInteger(worker) || worker <= 0) {
            return NextResponse.json(
                { success: false, error: "Ugyldig mekaniker." },
                { status: 400 }
            );
        }

        // 5. Kontroller at alle verdiene er gyldige før de lagres.
        if (
            name.length < 2 ||
            name.length > 100 ||
            !/^\d{8}$/.test(phone) ||
            email.length > 254 ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
            number.length < 2 ||
            number.length > 15 ||
            !/^[A-Z0-9 -]+$/.test(number) ||
            model.length < 1 ||
            model.length > 100 ||
            !isValidDate(date) ||
            !/^([01]\d|2[0-3]):[0-5]\d$/.test(tid) ||
            desc.length < 1 ||
            desc.length > 1000
        ) {
            return NextResponse.json(
                { success: false, error: "Kontroller at alle feltene er fylt ut riktig." },
                { status: 400 }
            );
        }

        // 6. Kontroller at den valgte brukeren faktisk er en mekaniker.
        const { data: mekaniker, error: mekanikerError } = await supabase
            .from("brukere")
            .select("id, role")
            .eq("id", worker)
            .maybeSingle();

        if (mekanikerError) {
            logDatabaseError("kontroll av mekaniker", mekanikerError);

            return NextResponse.json(
                { success: false, error: "Kunne ikke kontrollere mekanikeren." },
                { status: 500 }
            );
        }

        if (!mekaniker || mekaniker.role !== "mekaniker") {
            return NextResponse.json(
                { success: false, error: "Den valgte mekanikeren finnes ikke." },
                { status: 400 }
            );
        }

        // 7. Opprett kunden i databasen.
        const { data: kunde, error: kundeError } = await supabase
            .from("kunder")
            .insert({
                navn: name,
                epost: email,
                telefon: phone,
            })
            .select("id")
            .single();

        if (kundeError || !kunde) {
            if (kundeError) {
                logDatabaseError("opprettelse av kunde", kundeError);
            }

            return NextResponse.json(
                { success: false, error: "Kunne ikke registrere kunden." },
                { status: 500 }
            );
        }

        // 8. Opprett bilen og knytt den til kunden.
        const { data: bil, error: bilError } = await supabase
            .from("biler")
            .insert({
                eier: kunde.id,
                merke: model,
                registreringsnummer: number,
            })
            .select("id")
            .single();

        if (bilError || !bil) {
            if (bilError) {
                logDatabaseError("opprettelse av bil", bilError);
            }

            return NextResponse.json(
                { success: false, error: "Kunne ikke registrere bilen." },
                { status: 500 }
            );
        }

        // 9. Opprett serviceavtalen og knytt den til kunden, bilen og mekanikeren.
        const { error: avtaleError } = await supabase
            .from("serviceavtaler")
            .insert({
                beskrivelse: desc,
                dato: date,
                tid: tid,
                tildelt_mekaniker: mekaniker.id,
                kunde: kunde.id,
                bil: bil.id,
            });

        if (avtaleError) {
            logDatabaseError("opprettelse av serviceavtale", avtaleError);

            return NextResponse.json(
                { success: false, error: "Kunne ikke opprette serviceavtalen." },
                { status: 500 }
            );
        }

        // Alle registreringene ble gjennomført.
        return NextResponse.json(
            { success: true },
            { status: 201 }
        );

    } catch (error) {
        // Logg tekniske feil uten å eksponere dem til brukeren.
        console.error("Uventet feil i registrerings-API:", error);

        return NextResponse.json(
            { success: false, error: "En uventet feil oppstod." },
            { status: 500 }
        );
    }
}