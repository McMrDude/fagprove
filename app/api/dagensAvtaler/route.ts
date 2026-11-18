import { NextResponse } from "next/server";
import { supabase } from "../supabaseClient";

export async function GET() {
    try{
        const dagensDato = new Date().toLocaleDateString("sv-SE", {
            timeZone: "Europe/Oslo",
        });

        console.log("Dato som søkes etter:", dagensDato);

        const { data: avtaler, error } = await supabase
            .from("serviceavtaler")
            .select("id, beskrivelse, dato, tid, tildelt_mekaniker, kunde, bil, status")
            .eq("dato", dagensDato)
            .order("id")

        if (error) {
            throw error;
        }

        const result = await Promise.all(
            avtaler.map(async (e) => {
                const { data: mekaniker } = await supabase
                    .from("brukere")
                    .select("navn")
                    .eq("id", e.tildelt_mekaniker)
                    .eq("role", "mekaniker")
                    .single();

                const { data: kunde } = await supabase
                    .from("kunder")
                    .select("navn")
                    .eq("id", e.kunde)
                    .single();

                const { data: bil } = await supabase
                    .from("biler")
                    .select("merke, registreringsnummer")
                    .eq("id", e.bil)
                    .single();

                return {
                    id: e.id,
                    tid: e.tid,
                    desc: e.beskrivelse,
                    status: e.status,
                    kunde: kunde?.navn,
                    mekaniker: mekaniker?.navn,
                    registreringsnummer: bil?.registreringsnummer,
                    model: bil?.merke
                }
            })
        );

        return NextResponse.json({
            success: true,
            avtaler: result,
        });
        
    } catch (error) {
        console.error("Feil ved henting av dagens avtaler:", error);

        return NextResponse.json(
            { success: false, error: "Kunne ikke hente dagens avtaler" },
            { status: 500 }
        );
    }
}