import { NextResponse } from "next/server";
import { supabase } from "../supabaseClient";

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("brukere")
      .select("id, navn")
      .eq("role", "mekaniker")
      .order("navn");

    if (error) {
      console.error(error);

      return NextResponse.json(
        { success: false, error: "Kunne ikke hente deltakere." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      workers: data,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { success: false, error: "En uventet feil oppstod." },
      { status: 500 }
    );
  }
}