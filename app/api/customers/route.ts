import { NextResponse } from "next/server";
import { supabase } from "../supabaseClient";

export async function POST(request: Request) {
    try{
        const body = await request.json();

        console.log("Hele request body:", body);
        console.log("Mottatt dato:", body.dueDate);

        const name = body.name;
        const phone = body.phone;
        const email = body.email;
        const number = body.number;
        const model = body.model;
        const date = body.date;
        const tid = body.tid;
        const desc = body.desc;
        const worker = body.worker;

        const { data: kunde, error: kundeError } = await supabase
            .from("kunder")
            .insert({
                navn: name,
                epost: email,
                telefon: phone,
            })
            .select("id")
            .single();
            
                
        const { data: biler, error: bilError } = await supabase
            .from("biler")
            .insert({
                eier: kunde?.id,
                merke: model,
                registreringsnummer: number,
            })
            .select("id")
            .single();

        console.log("Dato som sendes til databasen:", date);

        const avtale = await supabase
            .from("serviceavtaler")
            .insert({
                beskrivelse: desc,
                dato: date,
                tid: tid,
                tildelt_mekaniker: Number(worker),
                kunde: kunde?.id,
                bil: biler?.id,
            })
        
        return NextResponse.json({
        success: true,
        });
    } catch (error) {
        console.error(error);

        return NextResponse.json(
        { success: false, error: "En uventet feil oppstod." },
        { status: 500 }
        );
    }
}