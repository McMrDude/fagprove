
"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
    const router = useRouter();

    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email,
                    password,
                }),
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                setError(result.error || "Kunne ikke logge inn.");
                return;
            }

            // Send brukeren til riktig side basert på rollen.
            if (result.user.role === "mekaniker") {
                router.push("/mekaniker");
            } else if (result.user.role === "resepsjonist") {
                router.push("/resepsjonist");
            }
        } catch {
            setError("Kunne ikke kontakte serveren.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
            <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">

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
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M3 13h2l2-5h10l2 5h2v5h-2"
                            />
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M5 18H3v-5m16 5h2v-5"
                            />
                            <circle cx="7" cy="18" r="2" />
                            <circle cx="17" cy="18" r="2" />
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M7 8l1-3h8l1 3"
                            />
                        </svg>
                    </div>

                    <p className="mb-2 text-sm font-semibold text-blue-700">
                        Bilverkstedet AS
                    </p>

                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                        Logg inn
                    </h1>

                    <p className="mt-2 text-sm text-slate-500">
                        Logg inn for å fortsette til kontrollpanelet.
                    </p>
                </div>

                {/* Innloggingsskjema */}
                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                    <div>
                        <label
                            htmlFor="email"
                            className="mb-2 block text-sm font-medium text-slate-700"
                        >
                            E-post
                        </label>

                        <input
                            id="email"
                            type="email"
                            placeholder="navn@eksempel.no"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            autoComplete="email"
                            required
                            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="password"
                            className="mb-2 block text-sm font-medium text-slate-700"
                        >
                            Passord
                        </label>

                        <input
                            id="password"
                            type="password"
                            placeholder="Skriv inn passord"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoComplete="current-password"
                            required
                            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        />
                    </div>

                    {/* Viser feilmelding dersom innloggingen mislykkes */}
                    {error && (
                        <p
                            role="alert"
                            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                        >
                            {error}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="mt-1 rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {loading ? "Logger inn..." : "Logg inn"}
                    </button>
                </form>

                {/* Lenke til registrering */}
                <div className="my-7 flex items-center gap-4">
                    <div className="h-px flex-1 bg-slate-200" />
                    <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
                        Ny bruker?
                    </span>
                    <div className="h-px flex-1 bg-slate-200" />
                </div>

                <button
                    type="button"
                    onClick={() => router.push("/register")}
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                    Opprett konto
                    <span aria-hidden="true" className="ml-2 text-blue-600">
                        →
                    </span>
                </button>

                <p className="mt-6 text-center text-xs text-slate-400">
                    Sikker innlogging for Bilverkstedet AS
                </p>
            </section>
        </main>
    );
}