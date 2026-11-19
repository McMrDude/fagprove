
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

export async function GET() {
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

        // Kontroller at tokenet inneholder en gyldig bruker-ID.
        if (
            (typeof payload.id !== "number" && typeof payload.id !== "string") ||
            (typeof payload.id === "string" && !payload.id.trim()) ||
            (typeof payload.id === "number" && (!Number.isSafeInteger(payload.id) || payload.id <= 0))
        ) {
            return NextResponse.json(
                { success: false, error: "Ugyldig innlogging." },
                { status: 401 }
            );
        }

        // 3. Kontroller at brukeren fortsatt finnes og har riktig rolle i databasen.
        const { data: bruker, error: brukerError } = await supabase
            .from("brukere")
            .select("id, role")
            .eq("id", payload.id)
            .maybeSingle();

        if (brukerError) {
            console.error("Databasefeil ved kontroll av bruker:", {
                code: brukerError.code,
                message: brukerError.message,
            });

            return NextResponse.json(
                { success: false, error: "Kunne ikke kontrollere innloggingen." },
                { status: 500 }
            );
        }

        if (!bruker || bruker.role !== "resepsjonist") {
            return NextResponse.json(
                { success: false, error: "Du har ikke tilgang til denne funksjonen." },
                { status: 403 }
            );
        }

        // 4. Hent dagens dato med norsk tidssone.
        const dagensDato = new Date().toLocaleDateString("sv-SE", {
            timeZone: "Europe/Oslo",
        });

        // 5. Hent alle serviceavtalene som har dagens dato.
        const { data: avtaler, error } = await supabase
            .from("serviceavtaler")
            .select("id, beskrivelse, dato, tid, tildelt_mekaniker, kunde, bil, status")
            .eq("dato", dagensDato)
            .order("id");

        if (error) {
            console.error("Databasefeil ved henting av dagens avtaler:", {
                code: error.code,
                message: error.message,
            });

            return NextResponse.json(
                { success: false, error: "Kunne ikke hente dagens avtaler." },
                { status: 500 }
            );
        }

        // 6. Hent informasjon om mekaniker, kunde og bil for hver avtale.
        const result = await Promise.all(
            avtaler.map(async (e) => {
                const { data: mekaniker, error: mekanikerError } = await supabase
                    .from("brukere")
                    .select("navn")
                    .eq("id", e.tildelt_mekaniker)
                    .eq("role", "mekaniker")
                    .single();

                const { data: kunde, error: kundeError } = await supabase
                    .from("kunder")
                    .select("navn")
                    .eq("id", e.kunde)
                    .single();

                const { data: bil, error: bilError } = await supabase
                    .from("biler")
                    .select("merke, registreringsnummer")
                    .eq("id", e.bil)
                    .single();

                // Kontroller at alle tilhørende opplysninger ble hentet.
                if (mekanikerError || kundeError || bilError) {
                    throw new Error("Kunne ikke hente informasjon til en serviceavtale.");
                }

                return {
                    id: e.id,
                    tid: e.tid,
                    desc: e.beskrivelse,
                    status: e.status,
                    kunde: kunde?.navn,
                    mekaniker: mekaniker?.navn,
                    registreringsnummer: bil?.registreringsnummer,
                    model: bil?.merke
                };
            })
        );

        return NextResponse.json({
            success: true,
            avtaler: result,
        });

    } catch (error) {
        console.error("Feil ved henting av dagens avtaler:", error);

        return NextResponse.json(
            { success: false, error: "Kunne ikke hente dagens avtaler." },
            { status: 500 }
        );
    }
}