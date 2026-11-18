import { NextResponse } from "next/server";
import { supabase } from "../../supabaseClient";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const cookieStore = await cookies();

    // Henter JWT-tokenet fra auth_token-cookien.
    const token = cookieStore.get("auth_token")?.value;

    if (!token) {
        return NextResponse.json(
            { success: false, error: "Du er ikke logget inn." },
            { status: 401 }
        );
    }

    const secret = new TextEncoder().encode(
        process.env.AUTH_SECRET
    );

    // Kontrollerer tokenet og henter informasjonen som ligger i det.
    const { payload } = await jwtVerify(token, secret);

    // Henter ID-en til den innloggede brukeren.
    const mekanikerId = payload.id;



    const { data: avtale, error } = await supabase
      .from("serviceavtaler")
      .select("id, dato, tid, beskrivelse, kunde, bil, status, antall_timer, deler_brukt")
      .eq("tildelt_mekaniker", mekanikerId)
      .order("id");

    if (error) {
      throw(error);
    }

    const result = await Promise.all(
        avtale.map(async (e) => {
            const { data: kunde } = await supabase
            .from("kunder")
            .select("navn, telefon")
            .eq("id", e.kunde)
            .single();

            const { data: bil} = await supabase
            .from("biler")
            .select("merke, registreringsnummer")
            .eq("id", e.bil)
            .single();

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
            }
        })
    )

    return NextResponse.json({
      success: true,
      avtaler: result,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { success: false, error: "En uventet feil oppstod." },
      { status: 500 }
    );
  }
}