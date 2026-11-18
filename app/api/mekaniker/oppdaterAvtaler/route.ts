import { NextResponse } from "next/server";
import { supabase } from "../../supabaseClient";

export async function POST(request: Request) {
    try{
        const body = await request.json();

        const status = body.status || null;
        const timer = body.timer || null;
        const deler = body.deler || [];

        const result = await supabase
            .from("serviceavtaler")
            .update({
                status: body?.status,
                antall_timer: body?.timer,
                deler_brukt: body?.deler,
            })
            .eq("id", body?.id);
        
        console.log("Supabase update:", result);

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