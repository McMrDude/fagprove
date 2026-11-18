"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation";

export default function MekanikerDashboard() {
    const router = useRouter()

    async function handleLogout() {
        const response = await fetch("/api/auth/logout", {
            method: "POST",
        });

        if (!response.ok) {
            throw new Error("Kunne ikke logge ut. Prøv igjen.");
        }

        // replace() prevents the browser's Back button from returning to this page.
        router.replace("/login");
        router.refresh();
    }

    const [avtaler, setAvtaler] = useState<{ id: number, dato: number, tid: number, desc: string, status: string, kunde: string, telefon: string, registreringsnummer: string, model: string, antall_timer: string, deler_brukt: string[] }[]>([]);

    async function getAvtaler() {
        const response = await fetch("/api/mekaniker/loadAvtaler");

        // Viser om API-kallet lykkes.
        console.log("Status fra API:", response.status);

        const result = await response.json();

        // Viser hele svaret fra API-et.
        console.log("Data fra API:", result);
        console.log("Avtaler:", result.avtaler);

        setAvtaler(result.avtaler ?? []);
    }

    useEffect(() => {
        void getAvtaler();
    }, []);

    const [timer, setTimer] = useState("");
    const [deler, setDeler] = useState<string[]>([]);

    const [updateError, setUpdateError] = useState("")

    async function oppdaterAvtaler(status: string, timer: string | null, deler: string[] | null) {

        if(!timer || !deler) {
            setUpdateError("Fyll inn antall timer brukt og deler brukt")
            return
        }

        const riktig_timer = timer.toString();

        await fetch("/api/mekaniker/oppdaterAvtaler", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                id: valgtAvtale,
                status: status,
                timer: riktig_timer,
                deler: deler,
            })
        })

        setUpdateError("")

        getAvtaler();
    }

    function addDeler(del: string) {
        if (deler.includes(del)) {
            setDeler(deler.filter((delFilter) => delFilter !== del));
        } else {
            setDeler([...deler, del]);
        }
    }

    const [valgtAvtale, setValgtAvtale] = useState<number | null>();

    return (
        <main className="min-h-screen bg-gray-100 p-4 md:p-8">

            {/* Toppmeny */}
            <header className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        Bilverkstedet AS
                    </h1>
                    <p className="text-sm text-gray-500">
                        Mekaniker – Oversikt
                    </p>
                </div>

                {/* Logg ut-knapp – funksjonalitet legges til senere */}
                <button
                    type="button"
                    className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-red-600 transition hover:border-red-200 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                    onClick={() => void handleLogout()}
                >
                    {/* Ikon for utlogging */}
                    <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    >
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>

                    Logg ut
                </button>
            </header>

            {/* Hovedinnhold med arbeidsoppgaver og detaljer */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[380px_1fr]">

                {/* Venstre side: Liste over arbeidsoppgaver */}
                <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">

                    <div className="mb-5">
                        <h2 className="text-lg font-semibold text-gray-900">
                            Arbeidsoppgaver
                        </h2>
                        <p className="text-sm text-gray-500">
                            Dine tildelte serviceavtaler
                        </p>
                    </div>

                    <div className="space-y-3">

                        {/* Valgt arbeidsoppgave – blå markering */}
                        {avtaler.map((e) => (                            
                            <div 
                                className={`rounded-lg ${ valgtAvtale === e.id ? "border-2 border-blue-500 bg-blue-50 p-4" : "border border-gray-200 p-4 transition hover:bg-gray-50"}`}
                                key={e.id}
                                onClick={() => setValgtAvtale(e.id)}
                            >
                                <div className="mb-2 flex items-center justify-between">
                                    <span className="font-semibold text-gray-900">
                                        {e.tid.toString().slice(0,5)}
                                    </span>
                                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${ valgtAvtale === e.id ? "bg-blue-100 text-blue-700" : "bg-yellow-100 text-yellow-700"}`}>
                                        {e.status}
                                    </span>
                                </div>

                                <h3 className="font-medium text-gray-900">
                                    {e.kunde}
                                </h3>
                                <p className="mt-1 text-sm text-gray-600">
                                    {e.model}
                                </p>
                                <p className="text-sm text-gray-500">
                                    {e.registreringsnummer}
                                </p>
                            </div>
                        ))}

                    </div>

                </section>

                {/* Høyre side: Detaljer om valgt arbeidsoppgave */}
                <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">

                    <div className="mb-6 border-b border-gray-200 pb-4">
                        <h2 className="text-lg font-semibold text-gray-900">
                            Detaljer om arbeidsoppgave
                        </h2>
                        <p className="text-sm text-gray-500">
                            Informasjon om valgt serviceavtale
                        </p>
                    </div>

                    {/* Informasjon om den valgte avtalen */}
                    {valgtAvtale ? (
                        avtaler.map((avtale) => (
                            avtale.id === valgtAvtale ? (
                                <div key={avtale.id} className="space-y-6">

                                    {/* Kundeinformasjon */}
                                    <div>
                                        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
                                            Kundeinformasjon
                                        </h3>

                                        <p className="font-medium text-gray-900">
                                            Navn: {avtale.kunde}
                                        </p>
                                        <p className="mt-1 text-sm text-gray-600">
                                            Telefon: {avtale.telefon}
                                        </p>
                                    </div>

                                    {/* Bilinformasjon */}
                                    <div>
                                        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
                                            Bilinformasjon
                                        </h3>

                                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                            <div>
                                                <p className="text-sm text-gray-500">
                                                    Merke og modell
                                                </p>
                                                <p className="font-medium text-gray-900">
                                                    {avtale.model}
                                                </p>
                                            </div>

                                            <div>
                                                <p className="text-sm text-gray-500">
                                                    Registreringsnummer
                                                </p>
                                                <p className="font-medium text-gray-900">
                                                    {avtale.registreringsnummer}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Avtaleinformasjon */}
                                    <div>
                                        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
                                            Serviceinformasjon
                                        </h3>

                                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                            <div>
                                                <p className="text-sm text-gray-500">
                                                    Dato
                                                </p>
                                                {}
                                                <p className="font-medium text-gray-900">
                                                    {new Intl.DateTimeFormat("nb-NO", {day: "numeric",month: "long",year: "numeric",timeZone: "UTC",}).format(new Date(avtale.dato + "T00:00:00Z"))}
                                                </p>
                                            </div>

                                            <div>
                                                <p className="text-sm text-gray-500">
                                                    Klokkeslett
                                                </p>
                                                <p className="font-medium text-gray-900">
                                                    {avtale.tid.toString().slice(0, 5)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Beskrivelse av arbeidet */}
                                    <div>
                                        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
                                            Beskrivelse av arbeid
                                        </h3>

                                        <div className="rounded-lg bg-gray-50 p-4">
                                            <p className="text-sm leading-relaxed text-gray-700">
                                                {avtale.desc}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Handlingsknapp */}
                                    <div className="border-t border-gray-200 pt-5">
                                        {avtale.status === "ikke påbegynt" ? 
                                            (
                                                <button
                                                    type="button"
                                                    className="w-full rounded-lg bg-blue-600 px-5 py-3 font-medium text-white shadow-sm transition hover:bg-blue-700 sm:w-auto"
                                                    onClick={() => void oppdaterAvtaler("under arbeid", null, null)}
                                                >
                                                    Marker som under arbeid
                                                </button>
                                            ) : avtale.status === "under arbeid" ? (
                                                <div>
                                                    <button
                                                        type="button"
                                                        className="w-full rounded-lg bg-blue-600 px-5 py-3 font-medium text-white shadow-sm transition hover:bg-blue-700 sm:w-auto"
                                                        onClick={() => void oppdaterAvtaler("ferdig", timer, deler)}
                                                    >
                                                        Marker som ferdig
                                                    </button>

                                                    <input
                                                        type="number"
                                                        className="border border-gray-500"
                                                        placeholder="Antall timer..."
                                                        onChange={(e) => setTimer(e.target.value)}
                                                    />
                                                    
                                                    <form>
                                                        <input onChange={(e) => addDeler(e.target.value)} type="checkbox" value="Motorolje"/>
                                                        <label> Motorolje</label>
                                                        <input onChange={(e) => addDeler(e.target.value)} type="checkbox" value="Oljefilter"/>
                                                        <label > Oljefilter</label>
                                                        <input onChange={(e) => addDeler(e.target.value)} type="checkbox" value="Luftfilter"/>
                                                        <label> Luftfilter</label>
                                                        <input onChange={(e) => addDeler(e.target.value)} type="checkbox" value="Bremseklosser"/>
                                                        <label> Bremseklosser</label>
                                                        <input onChange={(e) => addDeler(e.target.value)} type="checkbox" value="Tennplugger"/>
                                                        <label> Tennplugger</label>
                                                    </form>

                                                    <h3>
                                                        {updateError}
                                                    </h3>
                                                </div>
                                            ) : (
                                                <div>
                                                    <button
                                                        type="button"
                                                        className="w-full rounded-lg bg-blue-600 px-5 py-3 font-medium text-white shadow-sm transition hover:bg-blue-700 sm:w-auto"
                                                    >
                                                        Er ferdig
                                                    </button>
                                                    
                                                    <h3>
                                                        Antall timer brukt: {avtale.antall_timer}
                                                    </h3>

                                                    <div>
                                                        <h2>Deler brukt:</h2>
                                                        {avtale.deler_brukt.map((e) => (
                                                            <h3>{e}</h3>
                                                        ))}
                                                    </div>
                                                </div>
                                            ) 
                                        }

                                    </div>

                                </div>
                            ) : (
                                null
                            )
                        )) 
                    ) : (
                        <div>
                            <h3>
                                Ingen avtale valgt
                            </h3>
                        </div>
                    )}
                </section>

            </div>
        </main>
    );
}