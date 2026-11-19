
"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError("");

        if (password !== confirmPassword) {
            setError("Passordene er ikke like.");
            return;
        }

        if (!/^\d{8}$/.test(phoneNumber)) {
            setError("Telefonnummeret må være nøyaktig 8 sifre.");
            return;
        }

        setLoading(true);

        try {
            const response = await fetch("/api/auth/register", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    name,
                    email,
                    phone: phoneNumber,
                    password,
                }),
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                setError(result.error || "Kunne ikke opprette konto.");
                return;
            }

            router.push("/login");
        } catch {
            setError("Kunne ikke kontakte serveren.");
        } finally {
            setLoading(false);
        }
    };

    const inputClass =
        "w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

    const labelClass =
        "mb-2 block text-sm font-medium text-slate-700";

    return (
        <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
            <section className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">

                {/* Overskrift */}
                <div className="mb-8 text-center">
                    <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                        <svg
                            aria-hidden="true"
                            viewBox="0 0 24 24"
                            fill="none"
                            className="h-7 w-7"
                            stroke="currentColor"
                            strokeWidth="1.8"
                        >
                            <path
                                d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                            <circle cx="10" cy="7" r="4" />
                            <path
                                d="M20 8v6m3-3h-6"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </div>

                    <p className="mb-2 text-sm font-semibold text-blue-700">
                        Bilverkstedet AS
                    </p>

                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                        Opprett konto
                    </h1>

                    <p className="mt-2 text-sm text-slate-500">
                        Fyll inn opplysningene dine for å komme i gang.
                    </p>
                </div>

                {/* Registreringsskjema */}
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label htmlFor="name" className={labelClass}>
                            Fullt navn
                        </label>

                        <input
                            type="text"
                            id="name"
                            placeholder="Skriv inn navnet ditt"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            autoComplete="name"
                            required
                            className={inputClass}
                        />
                    </div>

                    <div>
                        <label htmlFor="email" className={labelClass}>
                            E-post
                        </label>

                        <input
                            type="email"
                            id="email"
                            placeholder="navn@eksempel.no"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            autoComplete="email"
                            required
                            className={inputClass}
                        />
                    </div>

                    <div>
                        <label htmlFor="phoneNumber" className={labelClass}>
                            Telefonnummer
                        </label>

                        <input
                            type="tel"
                            id="phoneNumber"
                            placeholder="8 sifre"
                            value={phoneNumber}
                            onChange={(e) =>
                                setPhoneNumber(
                                    e.target.value.replace(/\D/g, "").slice(0, 8)
                                )
                            }
                            autoComplete="tel"
                            inputMode="numeric"
                            maxLength={8}
                            required
                            className={inputClass}
                        />
                    </div>

                    <div>
                        <label htmlFor="password" className={labelClass}>
                            Passord
                        </label>

                        <input
                            type="password"
                            id="password"
                            placeholder="Velg et passord"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoComplete="new-password"
                            required
                            className={inputClass}
                        />
                    </div>

                    <div>
                        <label htmlFor="confirmPassword" className={labelClass}>
                            Bekreft passord
                        </label>

                        <input
                            type="password"
                            id="confirmPassword"
                            placeholder="Skriv passordet på nytt"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            autoComplete="new-password"
                            required
                            className={inputClass}
                        />
                    </div>

                    {/* Viser feilmelding dersom registreringen mislykkes */}
                    {error && (
                        <div
                            role="alert"
                            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                        >
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {loading ? "Oppretter konto..." : "Opprett konto"}
                    </button>
                </form>

                {/* Lenke tilbake til innlogging */}
                <div className="my-6 flex items-center gap-4">
                    <div className="h-px flex-1 bg-slate-200" />

                    <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
                        Har du allerede en konto?
                    </span>

                    <div className="h-px flex-1 bg-slate-200" />
                </div>

                <button
                    type="button"
                    onClick={() => router.push("/")}
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                    Tilbake til innlogging
                </button>

                <p className="mt-6 text-center text-xs text-slate-400">
                    Bilverkstedet AS
                </p>
            </section>
        </main>
    );
}