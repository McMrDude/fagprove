
import { NextResponse } from "next/server";
import { supabase } from "../../supabaseClient";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";

// Hent hemmeligheten som brukes til å kontrollere JWT-tokenet.
function getSecret() {
    const authSecret = process.env.AUTH_SECRET;

    if (!authSecret) {
        throw new Error("AUTH_SECRET mangler i miljøvariablene.");
    }

    return new TextEncoder().encode(authSecret);
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

        if (!bruker || bruker.role !== "mekaniker") {
            return NextResponse.json(
                { success: false, error: "Du har ikke tilgang til denne funksjonen." },
                { status: 403 }
            );
        }

        // 4. Les dataene fra forespørselen.
        let body: unknown;

        try {
            body = await request.json();
        } catch {
            return NextResponse.json(
                { success: false, error: "Ugyldige data." },
                { status: 400 }
            );
        }

        // Kontroller at forespørselen inneholder et objekt.
        if (!body || typeof body !== "object" || Array.isArray(body)) {
            return NextResponse.json(
                { success: false, error: "Ugyldige data." },
                { status: 400 }
            );
        }

        const data = body as Record<string, unknown>;

        // 5. Kontroller at avtale-ID-en er et positivt heltall.
        const idValue = data.id;

        if (
            (typeof idValue !== "number" && typeof idValue !== "string") ||
            !/^\d+$/.test(String(idValue))
        ) {
            return NextResponse.json(
                { success: false, error: "Ugyldig avtale-ID." },
                { status: 400 }
            );
        }

        const id = Number(idValue);

        if (!Number.isSafeInteger(id) || id <= 0) {
            return NextResponse.json(
                { success: false, error: "Ugyldig avtale-ID." },
                { status: 400 }
            );
        }

        // 6. Kontroller at statusen er en av de tillatte verdiene.
        const tillatteStatuser = [
            "Ikke påbegynt",
            "Under arbeid",
            "Ferdig",
        ];

        if (
            typeof data.status !== "string" ||
            !tillatteStatuser.includes(data.status)
        ) {
            return NextResponse.json(
                { success: false, error: "Ugyldig status." },
                { status: 400 }
            );
        }

        // 7. Kontroller at antall timer er et gyldig, ikke-negativt tall.
        let timer: number | null = null;

        if (data.timer !== null && data.timer !== undefined) {
            if (
                (typeof data.timer !== "number" && typeof data.timer !== "string") ||
                (typeof data.timer === "string" && !/^\d+(\.\d+)?$/.test(data.timer))
            ) {
                return NextResponse.json(
                    { success: false, error: "Ugyldig antall timer." },
                    { status: 400 }
                );
            }

            timer = Number(data.timer);

            if (!Number.isFinite(timer) || timer < 0 || timer > 1000) {
                return NextResponse.json(
                    { success: false, error: "Ugyldig antall timer." },
                    { status: 400 }
                );
            }
        }

        // 8. Kontroller at deler er en liste med gyldige tekstverdier.
        const deler = data.deler ?? [];

        if (
            !Array.isArray(deler) ||
            deler.length > 50 ||
            !deler.every(
                (del) =>
                    typeof del === "string" &&
                    del.trim().length > 0 &&
                    del.trim().length <= 100
            )
        ) {
            return NextResponse.json(
                { success: false, error: "Ugyldig liste over deler." },
                { status: 400 }
            );
        }

        // Fjern unødvendige mellomrom fra delene.
        const rensedeDeler = deler.map((del: string) => del.trim());

        // 9. Oppdater kun avtaler som tilhører den innloggede mekanikeren.
        const { data: oppdatertAvtale, error: updateError } = await supabase
            .from("serviceavtaler")
            .update({
                status: data.status,
                antall_timer: timer,
                deler_brukt: rensedeDeler,
            })
            .eq("id", id)
            .eq("tildelt_mekaniker", bruker.id)
            .select("id")
            .maybeSingle();

        if (updateError) {
            console.error("Databasefeil ved oppdatering av serviceavtale:", {
                code: updateError.code,
                message: updateError.message,
            });

            return NextResponse.json(
                { success: false, error: "Kunne ikke oppdatere serviceavtalen." },
                { status: 500 }
            );
        }

        // Kontroller at en avtale faktisk ble oppdatert.
        if (!oppdatertAvtale) {
            return NextResponse.json(
                { success: false, error: "Serviceavtalen finnes ikke eller tilhører ikke deg." },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
        });

    } catch (error) {
        console.error("Feil ved oppdatering av serviceavtale:", error);

        return NextResponse.json(
            { success: false, error: "En uventet feil oppstod." },
            { status: 500 }
        );
    }
}