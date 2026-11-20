"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation";

// Felles styling for skjemafeltene.
const inputClass =
    "w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"

export default function MekanikerDashboard() {
    const router = useRouter()

    // Logger ut brukeren og sender vedkommende tilbake til innloggingssiden.
    async function handleLogout() {
        const response = await fetch("/api/auth/logout", {
            method: "POST",
        });

        if (!response.ok) {
            throw new Error("Kunne ikke logge ut. Prøv igjen.");
        }

        router.replace("/");
        router.refresh();
    }

    const [avtaler, setAvtaler] = useState<{
        id: number,
        dato: number,
        tid: number,
        desc: string,
        status: string,
        kunde: string,
        telefon: string,
        registreringsnummer: string,
        model: string,
        antall_timer: string,
        deler_brukt: string[]
    }[]>([]);

    // Henter mekanikerens tildelte serviceavtaler fra API-et.
    async function getAvtaler() {
        const response = await fetch("/api/mekaniker/loadAvtaler");

        console.log("Status fra API:", response.status);

        const result = await response.json();

        console.log("Data fra API:", result);
        console.log("Avtaler:", result.avtaler);

        setAvtaler(result.avtaler ?? []);
    }

    useEffect(() => {
        void getAvtaler();
    }, []);

    const [timer, setTimer] = useState("");
    const [deler, setDeler] = useState<string[]>([]);
    const [updateError, setUpdateError] = useState("");

    // Oppdaterer status, arbeidstimer og deler for valgt serviceavtale.
    async function oppdaterAvtaler(
        status: string,
        timer: string | null,
        deler: string[] | null
    ) {
        if (!timer || !deler) {
            setUpdateError("Fyll inn antall timer brukt og deler brukt");
            return;
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
        });

        setUpdateError("");

        getAvtaler();
    }

    // Legger til eller fjerner en del fra listen over valgte deler.
    function addDeler(del: string) {
        if (deler.includes(del)) {
            setDeler(deler.filter((delFilter) => delFilter !== del));
        } else {
            setDeler([...deler, del]);
        }
    }

    const [valgtAvtale, setValgtAvtale] = useState<number | null>(null);

    return (
        <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-900 sm:px-6 lg:px-8">

            <div className="mx-auto max-w-7xl">

                {/* Sideoverskrift med brukertype og utloggingsknapp. */}
                <header className="mb-8 flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-blue-700">
                            Bilverkstedet AS
                        </p>

                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                            Mekaniker
                        </h1>

                        <p className="mt-1 text-sm text-slate-500">
                            Oversikt over tildelte serviceavtaler og arbeidsoppgaver
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <span className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-600">
                            Mekaniker
                        </span>

                        {/* Knapp for å logge ut. */}
                        <button
                            type="button"
                            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-100"
                            onClick={() => void handleLogout()}
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="17"
                                height="17"
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
                    </div>
                </header>

                {/* Hovedinnhold med arbeidsoppgaver til venstre og detaljer til høyre. */}
                <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[0.85fr_1.15fr]">

                    {/* VENSTRE SIDE – Liste over arbeidsoppgaver. */}
                    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">

                        <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
                            <div className="flex items-start gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="21"
                                        height="21"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <path d="M9 11l3 3L22 4" />
                                        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                                    </svg>
                                </div>

                                <div>
                                    <h2 className="text-lg font-bold tracking-tight text-slate-900">
                                        Arbeidsoppgaver
                                    </h2>

                                    <p className="mt-1 text-sm text-slate-500">
                                        Dine tildelte serviceavtaler
                                    </p>
                                </div>
                            </div>

                            {/* Viser antall tildelte arbeidsoppgaver. */}
                            <div className="mt-4 flex items-center justify-between rounded-lg bg-slate-50 px-3.5 py-3">
                                <span className="text-sm font-medium text-slate-600">
                                    Totalt antall oppgaver
                                </span>

                                <span className="rounded-lg bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700">
                                    {avtaler.length}
                                </span>
                            </div>
                        </div>

                        <div className="space-y-3 p-5 sm:p-6">

                            {avtaler.length === 0 ? (
                                <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center">
                                    <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-400">
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            width="22"
                                            height="22"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="1.8"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        >
                                            <rect x="3" y="4" width="18" height="17" rx="2" />
                                            <path d="M16 2v4M8 2v4M3 10h18" />
                                        </svg>
                                    </div>

                                    <p className="text-sm font-medium text-slate-700">
                                        Ingen arbeidsoppgaver
                                    </p>

                                    <p className="mt-1 text-xs text-slate-500">
                                        Tildelte serviceavtaler vil vises her.
                                    </p>
                                </div>
                            ) : (
                                avtaler.map((e) => (
                                    <div
                                        key={e.id}
                                        className={`cursor-pointer rounded-lg p-4 transition ${
                                            valgtAvtale === e.id
                                                ? "border-2 border-blue-500 bg-blue-50"
                                                : "border border-slate-200 hover:border-blue-200 hover:bg-slate-50"
                                        }`}
                                        onClick={() => {e.id === valgtAvtale ? setValgtAvtale(null) : setValgtAvtale(e.id)}}
                                    >
                                        <div className="mb-3 flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-2">
                                                <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    width="17"
                                                    height="17"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="2"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    className="text-slate-400"
                                                >
                                                    <circle cx="12" cy="12" r="10" />
                                                    <polyline points="12 6 12 12 16 14" />
                                                </svg>

                                                <span className="text-base font-bold text-slate-900">
                                                    {e.tid.toString().slice(0, 5)}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    width="17"
                                                    height="17"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="2"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    className="text-slate-400"
                                                >
                                                    <circle cx="12" cy="12" r="10" />
                                                    <polyline points="12 6 12 12 16 14" />
                                                </svg>

                                                <span className="text-base font-bold text-slate-900">
                                                    {new Intl.DateTimeFormat("nb-NO", {
                                                        day: "numeric",
                                                        month: "long",
                                                        year: "numeric",
                                                        timeZone: "UTC",
                                                    }).format(new Date(e.dato + "T00:00:00Z"))}
                                                </span>
                                            </div>

                                            {/* Statusen får forskjellig utseende avhengig av verdien. */}
                                            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                                                e.status === "ferdig"
                                                    ? "bg-green-100 text-green-700"
                                                    : e.status === "under arbeid"
                                                        ? "bg-blue-100 text-blue-700"
                                                        : "bg-amber-100 text-amber-700"
                                            }`}>
                                                {e.status}
                                            </span>
                                        </div>

                                        <h3 className="font-semibold text-slate-900">
                                            {e.kunde}
                                        </h3>

                                        <p className="mt-1 text-sm text-slate-500">
                                            {e.model}
                                        </p>

                                        <p className="text-sm text-slate-500">
                                            {e.registreringsnummer}
                                        </p>
                                    </div>
                                ))
                            )}

                        </div>
                    </section>

                    {/* HØYRE SIDE – Detaljer om valgt arbeidsoppgave. */}
                    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">

                        <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
                            <div className="flex items-start gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="21"
                                        height="21"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                        <polyline points="14 2 14 8 20 8" />
                                        <line x1="8" y1="13" x2="16" y2="13" />
                                        <line x1="8" y1="17" x2="16" y2="17" />
                                    </svg>
                                </div>

                                <div>
                                    <h2 className="text-lg font-bold tracking-tight text-slate-900">
                                        Detaljer om arbeidsoppgave
                                    </h2>

                                    <p className="mt-1 text-sm text-slate-500">
                                        Informasjon om valgt serviceavtale
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="p-5 sm:p-6">

                            {/* Viser informasjonen til den valgte serviceavtalen. */}
                            {valgtAvtale !== null ? (
                                avtaler.map((avtale) => (
                                    avtale.id === valgtAvtale ? (
                                        <div key={avtale.id} className="space-y-7">

                                            {/* Kundeinformasjon. */}
                                            <div>
                                                <h3 className="mb-4 border-b border-slate-100 pb-2 text-sm font-semibold text-slate-800">
                                                    Kundeinformasjon
                                                </h3>

                                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                                    <div>
                                                        <p className="mb-1 text-xs font-medium text-slate-500">
                                                            Navn
                                                        </p>

                                                        <p className="font-medium text-slate-900">
                                                            {avtale.kunde}
                                                        </p>
                                                    </div>

                                                    <div>
                                                        <p className="mb-1 text-xs font-medium text-slate-500">
                                                            Telefonnummer
                                                        </p>

                                                        <p className="font-medium text-slate-900">
                                                            {avtale.telefon}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Bilinformasjon. */}
                                            <div>
                                                <h3 className="mb-4 border-b border-slate-100 pb-2 text-sm font-semibold text-slate-800">
                                                    Bilinformasjon
                                                </h3>

                                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                                    <div>
                                                        <p className="mb-1 text-xs font-medium text-slate-500">
                                                            Merke og modell
                                                        </p>

                                                        <p className="font-medium text-slate-900">
                                                            {avtale.model}
                                                        </p>
                                                    </div>

                                                    <div>
                                                        <p className="mb-1 text-xs font-medium text-slate-500">
                                                            Registreringsnummer
                                                        </p>

                                                        <p className="font-medium text-slate-900">
                                                            {avtale.registreringsnummer}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Informasjon om serviceavtalen. */}
                                            <div>
                                                <h3 className="mb-4 border-b border-slate-100 pb-2 text-sm font-semibold text-slate-800">
                                                    Serviceinformasjon
                                                </h3>

                                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                                    <div>
                                                        <p className="mb-1 text-xs font-medium text-slate-500">
                                                            Dato
                                                        </p>

                                                        <p className="font-medium text-slate-900">
                                                            {new Intl.DateTimeFormat("nb-NO", {
                                                                day: "numeric",
                                                                month: "long",
                                                                year: "numeric",
                                                                timeZone: "UTC",
                                                            }).format(new Date(avtale.dato + "T00:00:00Z"))}
                                                        </p>
                                                    </div>

                                                    <div>
                                                        <p className="mb-1 text-xs font-medium text-slate-500">
                                                            Klokkeslett
                                                        </p>

                                                        <p className="font-medium text-slate-900">
                                                            {avtale.tid.toString().slice(0, 5)}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Beskrivelse av arbeidet. */}
                                            <div>
                                                <h3 className="mb-4 border-b border-slate-100 pb-2 text-sm font-semibold text-slate-800">
                                                    Beskrivelse av arbeid
                                                </h3>

                                                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                                                    <p className="text-sm leading-relaxed text-slate-700">
                                                        {avtale.desc}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Handlingsknapper og registrering av utført arbeid. */}
                                            <div className="border-t border-slate-100 pt-6">

                                                {avtale.status === "Ikke påbegynt" ? (
                                                    <button
                                                        type="button"
                                                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 sm:w-auto"
                                                        onClick={() => void oppdaterAvtaler("Under arbeid", null, null)}
                                                    >
                                                        <svg
                                                            xmlns="http://www.w3.org/2000/svg"
                                                            width="17"
                                                            height="17"
                                                            viewBox="0 0 24 24"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            strokeWidth="2"
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                        >
                                                            <polygon points="5 3 19 12 5 21 5 3" />
                                                        </svg>

                                                        Marker som under arbeid
                                                    </button>
                                                ) : avtale.status === "Under arbeid" ? (
                                                    <div className="space-y-5">

                                                        <div>
                                                            <h3 className="mb-3 text-sm font-semibold text-slate-800">
                                                                Registrer utført arbeid
                                                            </h3>

                                                            <p className="mb-4 text-sm text-slate-500">
                                                                Fyll inn hvor mange timer som er brukt, og velg hvilke deler som er benyttet.
                                                            </p>

                                                            <div className="space-y-2">
                                                                <label htmlFor="timer" className="block text-sm font-medium text-slate-700">
                                                                    Antall timer brukt
                                                                </label>

                                                                <input
                                                                    id="timer"
                                                                    type="number"
                                                                    min="0"
                                                                    step="0.5"
                                                                    className={inputClass}
                                                                    placeholder="Skriv inn antall timer..."
                                                                    value={timer}
                                                                    onChange={(e) => setTimer(e.target.value)}
                                                                />
                                                            </div>
                                                        </div>

                                                        {/* Valg av deler som er brukt under arbeidet. */}
                                                        <div>
                                                            <h3 className="mb-3 text-sm font-medium text-slate-700">
                                                                Deler brukt
                                                            </h3>

                                                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                                                {[
                                                                    "Motorolje",
                                                                    "Oljefilter",
                                                                    "Luftfilter",
                                                                    "Bremseklosser",
                                                                    "Tennplugger"
                                                                ].map((del) => (
                                                                    <label
                                                                        key={del}
                                                                        className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-700 transition hover:border-blue-300 hover:bg-blue-50"
                                                                    >
                                                                        <input
                                                                            type="checkbox"
                                                                            value={del}
                                                                            checked={deler.includes(del)}
                                                                            onChange={(e) => addDeler(e.target.value)}
                                                                            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                                        />

                                                                        {del}
                                                                    </label>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        {/* Viser eventuell feilmelding ved registrering. */}
                                                        {updateError && (
                                                            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
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
                                                                    className="mt-0.5 shrink-0"
                                                                >
                                                                    <circle cx="12" cy="12" r="10" />
                                                                    <line x1="12" y1="8" x2="12" y2="12" />
                                                                    <line x1="12" y1="16" x2="12.01" y2="16" />
                                                                </svg>

                                                                {updateError}
                                                            </div>
                                                        )}

                                                        <button
                                                            type="button"
                                                            className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 sm:w-auto"
                                                            onClick={() => void oppdaterAvtaler("Ferdig", timer, deler)}
                                                        >
                                                            <svg
                                                                xmlns="http://www.w3.org/2000/svg"
                                                                width="17"
                                                                height="17"
                                                                viewBox="0 0 24 24"
                                                                fill="none"
                                                                stroke="currentColor"
                                                                strokeWidth="2"
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                            >
                                                                <polyline points="20 6 9 17 4 12" />
                                                            </svg>

                                                            Marker som ferdig
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-4">

                                                        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
                                                            <svg
                                                                xmlns="http://www.w3.org/2000/svg"
                                                                width="19"
                                                                height="19"
                                                                viewBox="0 0 24 24"
                                                                fill="none"
                                                                stroke="currentColor"
                                                                strokeWidth="2.5"
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                className="text-green-700"
                                                            >
                                                                <polyline points="20 6 9 17 4 12" />
                                                            </svg>

                                                            <span className="text-sm font-semibold text-green-800">
                                                                Serviceavtalen er fullført
                                                            </span>
                                                        </div>

                                                        <div className="rounded-lg border border-slate-200 p-4">
                                                            <p className="text-xs font-medium text-slate-500">
                                                                Antall timer brukt
                                                            </p>

                                                            <p className="mt-1 text-lg font-semibold text-slate-900">
                                                                {avtale.antall_timer}
                                                            </p>
                                                        </div>

                                                        <div>
                                                            <h3 className="mb-3 text-sm font-semibold text-slate-800">
                                                                Deler brukt
                                                            </h3>

                                                            <div className="flex flex-wrap gap-2">
                                                                {avtale.deler_brukt.map((del) => (
                                                                    <span
                                                                        key={del}
                                                                        className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700"
                                                                    >
                                                                        {del}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ) : null
                                ))
                            ) : (
                                <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-12 text-center">
                                    <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-400">
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            width="22"
                                            height="22"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="1.8"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        >
                                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                            <polyline points="14 2 14 8 20 8" />
                                        </svg>
                                    </div>

                                    <p className="text-sm font-medium text-slate-700">
                                        Ingen avtale valgt
                                    </p>

                                    <p className="mt-1 text-xs text-slate-500">
                                        Velg en arbeidsoppgave fra listen for å se detaljene.
                                    </p>
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            </div>
        </main>
    );
}