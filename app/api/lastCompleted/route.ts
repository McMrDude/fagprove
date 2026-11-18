import { NextResponse } from "next/server";
import { supabase } from "../supabaseClient";

export async function GET() {
    try{
        const dagensDato = new Date().toLocaleDateString("sv-SE", {
            timeZone: "Europe/Oslo",
        });

        const syvDagerSiden = new Date(`${dagensDato}T12:00:00Z`);

        // Trekker fra syv dager.
        syvDagerSiden.setUTCDate(syvDagerSiden.getUTCDate() - 7);

        // Gjør datoen om til YYYY-MM-DD.
        const fraDato = syvDagerSiden.toISOString().slice(0, 10);


        console.log("Dato som søkes etter:", dagensDato);

        const { data: avtaler, error } = await supabase
            .from("serviceavtaler")
            .select("id, beskrivelse, dato, kunde, bil")
            .eq("status", "ferdig")
            .gte("dato", fraDato)
            .lte("dato", dagensDato)
            .order("id")

        if (error) {
            throw error;
        }

        const result = await Promise.all(
            avtaler.map(async (e) => {
                const { data: kunde } = await supabase
                .from("kunder")
                .select("navn")
                .eq("id", e.kunde)
                .single();

                const { data: bil } = await supabase
                .from("biler")
                .select("merke")
                .eq("id", e.bil)
                .single();

                return {
                    id: e.id,
                    desc: e.beskrivelse,
                    dato: e.dato,
                    kunde: kunde?.navn,
                    model: bil?.merke,
                }
            })
        )

        return NextResponse.json({
            success: true,
            alleAvtaler: result,
        })
    } catch (error) {
        console.error("Feil ved henting av dagens avtaler:", error);

        return NextResponse.json(
            { success: false, error: "Kunne ikke hente dagens avtaler" },
            { status: 500 }
        );
    }
}