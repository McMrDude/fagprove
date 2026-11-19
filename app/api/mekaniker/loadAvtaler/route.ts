
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

export async function GET() {
  try {
    // 1. Kontroller at brukeren er innlogget.
    const cookieStore = await cookies();

    // Henter JWT-tokenet fra auth_token-cookien.
    const token = cookieStore.get("auth_token")?.value;

    if (!token) {
        return NextResponse.json(
            { success: false, error: "Du er ikke logget inn." },
            { status: 401 }
        );
    }

    // 2. Kontrollerer at JWT-tokenet er gyldig og ikke utløpt.
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

    // Henter ID-en til den innloggede mekanikeren.
    const mekanikerId = bruker.id;

    // 4. Hent kun serviceavtalene som tilhører den innloggede mekanikeren.
    const { data: avtale, error } = await supabase
      .from("serviceavtaler")
      .select("id, dato, tid, status, beskrivelse, antall_timer, deler_brukt, kunde, bil")
      .eq("tildelt_mekaniker", mekanikerId)
      .order("id");

    if (error) {
      console.error("Databasefeil ved henting av serviceavtaler:", {
        code: error.code,
        message: error.message,
      });

      return NextResponse.json(
        { success: false, error: "Kunne ikke hente serviceavtalene." },
        { status: 500 }
      );
    }

    // 5. Hent kunde- og bilinformasjon for hver serviceavtale.
    const result = await Promise.all(
        avtale.map(async (e) => {
            const { data: kunde, error: kundeError } = await supabase
            .from("kunder")
            .select("navn, telefon")
            .eq("id", e.kunde)
            .single();

            const { data: bil, error: bilError } = await supabase
            .from("biler")
            .select("merke, registreringsnummer")
            .eq("id", e.bil)
            .single();

            // Kontroller at kunde- og bilinformasjonen ble hentet.
            if (kundeError || bilError) {
                throw new Error("Kunne ikke hente informasjon til en serviceavtale.");
            }

            return {
              id: e.id,
              dato: e.dato,
              tid: e.tid,
              status: e.status,
              desc: e.beskrivelse,
              antall_timer: e.antall_timer,
              deler_brukt: e.deler_brukt,
              kunde: kunde?.navn,
              telefon: kunde?.telefon,
              registreringsnummer: bil?.registreringsnummer,
              model: bil?.merke,
            };
        })
    );

    return NextResponse.json({
      success: true,
      avtaler: result,
    });

  } catch (error) {
    console.error("Feil ved henting av mekanikerens serviceavtaler:", error);

    return NextResponse.json(
      { success: false, error: "En uventet feil oppstod." },
      { status: 500 }
    );
  }
}