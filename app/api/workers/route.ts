
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { supabase } from "../supabaseClient";

export async function GET() {
  try {
    // Hent hemmeligheten som brukes til å verifisere JWT-tokenet.
    const secret = process.env.AUTH_SECRET;

    if (!secret) {
      console.error("AUTH_SECRET mangler i miljøvariablene.");

      return NextResponse.json(
        { success: false, error: "En serverfeil oppstod." },
        { status: 500 }
      );
    }

    // Hent innloggingstokenet fra HTTP-only-cookien.
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Du må være logget inn." },
        { status: 401 }
      );
    }

    // Kontroller at tokenet har en gyldig signatur og ikke har utløpt.
    let payload;

    try {
      const result = await jwtVerify(
        token,
        new TextEncoder().encode(secret),
        { algorithms: ["HS256"] }
      );

      payload = result.payload;
    } catch {
      return NextResponse.json(
        { success: false, error: "Ugyldig eller utløpt innlogging." },
        { status: 401 }
      );
    }

    // Kontroller at bruker-ID-en fra tokenet har et gyldig format.
    const brukerId = payload.id;

    const gyldigId =
      (typeof brukerId === "string" && brukerId.trim() !== "") ||
      (typeof brukerId === "number" &&
        Number.isSafeInteger(brukerId) &&
        brukerId > 0);

    if (!gyldigId) {
      return NextResponse.json(
        { success: false, error: "Ugyldig innlogging." },
        { status: 401 }
      );
    }

    // Hent brukerens nåværende rolle fra databasen.
    // Vi stoler ikke bare på rollen som ligger i JWT-tokenet.
    const { data: bruker, error: brukerFeil } = await supabase
      .from("brukere")
      .select("id, role")
      .eq("id", brukerId)
      .maybeSingle();

    if (brukerFeil) {
      console.error("Feil ved kontroll av bruker:", brukerFeil.code);

      return NextResponse.json(
        { success: false, error: "Kunne ikke kontrollere brukeren." },
        { status: 500 }
      );
    }

    // Kontroller at brukeren fortsatt finnes i databasen.
    if (!bruker) {
      return NextResponse.json(
        { success: false, error: "Ugyldig innlogging." },
        { status: 401 }
      );
    }

    // Bare resepsjonister skal kunne hente listen over mekanikere.
    if (bruker.role !== "resepsjonist") {
      return NextResponse.json(
        { success: false, error: "Du har ikke tilgang til denne informasjonen." },
        { status: 403 }
      );
    }

    // Hent kun ID og navn på brukere som har rollen mekaniker.
    const { data, error } = await supabase
      .from("brukere")
      .select("id, navn")
      .eq("role", "mekaniker")
      .order("navn");

    if (error) {
      // Logg bare feilkoden, ikke unødvendig informasjon fra databasen.
      console.error("Feil ved henting av mekanikere:", error.code);

      return NextResponse.json(
        { success: false, error: "Kunne ikke hente mekanikere." },
        { status: 500 }
      );
    }

    // Returner listen over mekanikere uten å lagre svaret i mellomlagring.
    return NextResponse.json(
      {
        success: true,
        workers: data,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    // Logg feilen på serveren uten å vise interne detaljer til brukeren.
    console.error(
      "Uventet feil ved henting av mekanikere:",
      error instanceof Error ? error.message : "Ukjent feil"
    );

    return NextResponse.json(
      { success: false, error: "En uventet feil oppstod." },
      { status: 500 }
    );
  }
}