"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation";

// Felles styling for skjemafeltene, slik at de får et konsekvent utseende.
const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"

// Hovedkomponenten for resepsjonistens dashboard.
export default function ResepsjonistDashboard() {
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


  const [dagligAvtaler, setDagligAvtaler] = useState<{
    id: number
    tid: number
    desc: string
    status: string
    kunde: string
    mekaniker: string
    registreringsnummer: string
    model: string
  }[]>([])

  const [ukenligAvtaler, setUkenligAvtaler] = useState<{
    id: number
    desc: string
    dato: number
    kunde: string
    model: string
  }[]>([])

  const [dagensDato, setDagensDato] = useState("")

  // Tilstand for alle feltene i registreringsskjemaet.
  const [name, setName] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [email, setEmail] = useState("")
  const [carNumber, setCarNumber] = useState("")
  const [carModel, setCarModel] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [time, setTime] = useState("")
  const [description, setDescription] = useState("")
  const [chosenWorker, setChosenWorker] = useState("")

  const [worker, setWorker] = useState<{ id: number; navn: string }[]>([])

  // Tilbakemeldinger som vises i registreringsskjemaet.
  const [formError, setFormError] = useState("")
  const [formSuccess, setFormSuccess] = useState("")

  // Henter dagens serviceavtaler fra API-et.
  useEffect(() => {
    async function getDagligAvtaler() {
      const response = await fetch("/api/dagensAvtaler")
      const result = await response.json()

      setDagligAvtaler(result.avtaler ?? [])
    }

    void getDagligAvtaler()
  }, [])

  // Henter fullførte serviceavtaler fra de siste syv dagene.
  useEffect(() => {
    async function getUkentligAvtaler() {
      const response = await fetch("/api/lastCompleted")
      const result = await response.json()

      setUkenligAvtaler(result.alleAvtaler ?? [])
    }

    void getUkentligAvtaler()
  }, [])

  // Henter dagens dato og formaterer den på norsk etter at siden er lastet.
  useEffect(() => {
    setDagensDato(
      new Date().toLocaleDateString("nb-NO", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    )
  }, [])

  // Tømmer alle feltene etter en vellykket registrering.
  function clearForm() {
    setName("")
    setPhoneNumber("")
    setEmail("")
    setCarNumber("")
    setCarModel("")
    setDueDate("")
    setTime("")
    setDescription("")
    setChosenWorker("")
  }

  // Registrerer en ny serviceavtale gjennom API-et.
  async function register() {
    // Kontrollerer at alle feltene inneholder informasjon.
    if (
      !name.trim() ||
      !phoneNumber.trim() ||
      !email.trim() ||
      !carNumber.trim() ||
      !carModel.trim() ||
      !dueDate ||
      !time ||
      !description.trim() ||
      !chosenWorker
    ) {
      setFormError("Alle feltene må fylles ut før du kan registrere serviceavtalen.")
      setFormSuccess("")
      return
    }

    // Fjerner tidligere meldinger før et nytt forsøk.
    setFormError("")
    setFormSuccess("")

    try {
      const response = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name,
          phone: phoneNumber,
          email: email,
          number: carNumber,
          model: carModel,
          date: dueDate,
          tid: time,
          desc: description,
          worker: chosenWorker,
        }),
      })

      // Kontrollerer om serveren godtok registreringen.
      if (!response.ok) {
        setFormError("Kunne ikke registrere serviceavtalen. Prøv igjen.")
        return
      }

      // Tømmer skjemaet når registreringen har lykkes.
      clearForm()

      // Viser en bekreftelse til brukeren.
      setFormSuccess("Serviceavtalen ble registrert.")

    } catch (error) {
      console.error("Feil ved registrering av serviceavtale:", error)
      setFormError("En feil oppstod. Kontroller tilkoblingen og prøv igjen.")
    }
  }

  // Henter listen over mekanikere som kan tildeles serviceavtaler.
  useEffect(() => {
    async function getWorkers() {
      const response = await fetch("/api/workers")
      const result = await response.json()

      setWorker(result.workers ?? [])
    }

    void getWorkers()
  }, [])

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
              Resepsjonist
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Administrer kunder og serviceavtaler
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-600">
              Resepsjonist
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

        {/* Hovedinnhold: registreringsskjema til venstre og oversikter til høyre. */}
        <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[1.05fr_0.95fr]">

          {/* VENSTRE SIDE – Registreringsskjema. */}
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
                    <path d="M12 5v14" />
                    <path d="M5 12h14" />
                  </svg>
                </div>

                <div>
                  <h2 className="text-lg font-bold tracking-tight text-slate-900">
                    Registrer ny serviceavtale
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Fyll inn informasjon om kunden, bilen og avtalen.
                  </p>
                </div>
              </div>
            </div>

            <form
              className="space-y-7 p-5 sm:p-6"
              onSubmit={(e) => {
                e.preventDefault()
                void register()
              }}
            >

              {/* Informasjonsmelding som forklarer at alle feltene må fylles ut. */}
              <div className="flex gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mt-0.5 shrink-0 text-blue-700"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 16v-4" />
                  <path d="M12 8h.01" />
                </svg>

                <div>
                  <p className="text-sm font-semibold text-blue-900">
                    Alle feltene må fylles ut
                  </p>

                  <p className="mt-1 text-sm text-blue-800">
                    Fyll inn all kunde-, bil- og serviceinformasjon før du registrerer avtalen.
                  </p>
                </div>
              </div>

              {/* Viser feilmelding dersom skjemaet mangler informasjon eller registreringen feiler. */}
              {formError && (
                <div
                  role="alert"
                  className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="19"
                    height="19"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mt-0.5 shrink-0"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 8v4" />
                    <path d="M12 16h.01" />
                  </svg>

                  <p>{formError}</p>
                </div>
              )}

              {/* Viser bekreftelse når serviceavtalen er registrert. */}
              {formSuccess && (
                <div
                  role="status"
                  className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800"
                >
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
                    className="mt-0.5 shrink-0"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>

                  <p>{formSuccess}</p>
                </div>
              )}

              {/* Kundens personopplysninger. */}
              <div>
                <h3 className="mb-4 border-b border-slate-100 pb-2 text-sm font-semibold text-slate-800">
                  Kundeinformasjon
                </h3>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="kundeNavn" className="mb-1.5 block text-sm font-medium text-slate-700">
                      Fullt navn <span className="text-red-600">*</span>
                    </label>

                    <input
                      id="kundeNavn"
                      type="text"
                      required
                      value={name}
                      placeholder="Skriv inn kundens navn"
                      className={inputClass}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>

                  <div>
                    <label htmlFor="telefon" className="mb-1.5 block text-sm font-medium text-slate-700">
                      Telefonnummer <span className="text-red-600">*</span>
                    </label>

                    <input
                      id="telefon"
                      type="tel"
                      required
                      value={phoneNumber}
                      placeholder="Skriv inn telefonnummer"
                      className={inputClass}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                    />
                  </div>

                  <div>
                    <label htmlFor="epost" className="mb-1.5 block text-sm font-medium text-slate-700">
                      E-postadresse <span className="text-red-600">*</span>
                    </label>

                    <input
                      id="epost"
                      type="email"
                      required
                      value={email}
                      placeholder="Skriv inn e-postadresse"
                      className={inputClass}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Informasjon om bilen som tilhører kunden. */}
              <div>
                <h3 className="mb-4 border-b border-slate-100 pb-2 text-sm font-semibold text-slate-800">
                  Bilinformasjon
                </h3>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="registreringsnummer" className="mb-1.5 block text-sm font-medium text-slate-700">
                      Registreringsnummer <span className="text-red-600">*</span>
                    </label>

                    <input
                      id="registreringsnummer"
                      type="text"
                      required
                      value={carNumber}
                      placeholder="F.eks. AB12345"
                      className={inputClass}
                      onChange={(e) => setCarNumber(e.target.value)}
                    />
                  </div>

                  <div>
                    <label htmlFor="bilmerke" className="mb-1.5 block text-sm font-medium text-slate-700">
                      Bilmerke <span className="text-red-600">*</span>
                    </label>

                    <input
                      id="bilmerke"
                      type="text"
                      required
                      value={carModel}
                      placeholder="F.eks. Volvo"
                      className={inputClass}
                      onChange={(e) => setCarModel(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Informasjon om serviceavtalen. */}
              <div>
                <h3 className="mb-4 border-b border-slate-100 pb-2 text-sm font-semibold text-slate-800">
                  Serviceavtale
                </h3>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="dato" className="mb-1.5 block text-sm font-medium text-slate-700">
                        Dato <span className="text-red-600">*</span>
                      </label>

                      <input
                        id="dato"
                        type="date"
                        required
                        value={dueDate}
                        className={inputClass}
                        onChange={(e) => setDueDate(e.target.value)}
                      />
                    </div>

                    <div>
                      <label htmlFor="tid" className="mb-1.5 block text-sm font-medium text-slate-700">
                        Tid <span className="text-red-600">*</span>
                      </label>

                      <input
                        id="tid"
                        type="time"
                        required
                        value={time}
                        className={inputClass}
                        onChange={(e) => setTime(e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="mekaniker" className="mb-1.5 block text-sm font-medium text-slate-700">
                      Tildel mekaniker <span className="text-red-600">*</span>
                    </label>

                    <select
                      id="mekaniker"
                      required
                      value={chosenWorker}
                      className={inputClass}
                      onChange={(e) => setChosenWorker(e.target.value)}
                    >
                      <option value="" disabled>
                        Velg en mekaniker
                      </option>

                      {worker.map((worker) => (
                        <option key={worker.id} value={worker.id}>
                          {worker.navn}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="beskrivelse" className="mb-1.5 block text-sm font-medium text-slate-700">
                      Beskrivelse av problem <span className="text-red-600">*</span>
                    </label>

                    <textarea
                      id="beskrivelse"
                      rows={4}
                      required
                      value={description}
                      placeholder="Beskriv hva kunden ønsker å få undersøkt eller reparert..."
                      className={`${inputClass} resize-y`}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Knapp for å registrere serviceavtalen. */}
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 active:bg-blue-800"
              >
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
                  <path d="M12 5v14" />
                  <path d="M5 12h14" />
                </svg>

                Registrer serviceavtale
              </button>

            </form>
          </section>

          {/* HØYRE SIDE – Oversikter over serviceavtaler. */}
          <div className="space-y-6">

            {/* Oversikt over dagens serviceavtaler. */}
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

              <div className="mb-5 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold tracking-tight text-slate-900">
                    Dagens serviceavtaler
                  </h2>

                  <p className="mt-1 text-sm capitalize text-slate-500">
                    {dagensDato}
                  </p>
                </div>

                {/* Viser antall avtaler som er registrert i dag. */}
                <span className="rounded-lg bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-700">
                  {dagligAvtaler.length} avtaler
                </span>
              </div>

              <div className="space-y-3">

                {dagligAvtaler.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
                    <p className="text-sm font-medium text-slate-700">
                      Ingen serviceavtaler i dag
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Registrerte avtaler vil vises her.
                    </p>
                  </div>
                ) : (
                  dagligAvtaler.map((avtale) => (
                    <div
                      key={avtale.id}
                      className="rounded-lg border border-slate-200 p-4 transition hover:border-blue-200 hover:bg-slate-50/70"
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
                            {avtale.tid.toString().slice(0, 5)}
                          </span>
                        </div>

                        {/* Statusen får forskjellig utseende avhengig av verdien. */}
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            avtale.status === "Under arbeid"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {avtale.status}
                        </span>
                      </div>

                      <p className="font-semibold text-slate-900">
                        {avtale.kunde}
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        {avtale.model} · {avtale.registreringsnummer}
                      </p>

                      <div className="mt-3 border-t border-slate-100 pt-3">
                        <p className="text-xs text-slate-500">
                          Mekaniker: <span className="font-medium text-slate-700">{avtale.mekaniker}</span>
                        </p>
                      </div>
                    </div>
                  ))
                )}

              </div>
            </section>

            {/* Oversikt over fullførte serviceavtaler de siste syv dagene. */}
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

              <div className="mb-5">
                <h2 className="text-lg font-bold tracking-tight text-slate-900">
                  Fullførte serviceavtaler
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Oversikt over de siste syv dagene.
                </p>
              </div>

              {/* Viser det faktiske antallet fullførte avtaler fra API-et. */}
              <div className="mb-5 flex items-center justify-between rounded-lg border border-green-100 bg-green-50 p-4">
                <div>
                  <p className="text-sm font-medium text-green-800">
                    Totalt fullførte avtaler
                  </p>

                  <p className="mt-1 text-xs text-green-700">
                    Siste 7 dager
                  </p>
                </div>

                <p className="text-3xl font-bold tracking-tight text-green-800">
                  {ukenligAvtaler.length}
                </p>
              </div>

              <h3 className="mb-4 text-sm font-semibold text-slate-800">
                Siste fullførte avtaler
              </h3>

              <div className="space-y-3">

                {ukenligAvtaler.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
                    <p className="text-sm font-medium text-slate-700">
                      Ingen fullførte avtaler
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Fullførte avtaler fra de siste syv dagene vil vises her.
                    </p>
                  </div>
                ) : (
                  ukenligAvtaler.map((avtale) => (
                    <div
                      key={avtale.id}
                      className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 last:border-0 last:pb-0"
                    >
                      <div className="flex min-w-0 items-center gap-3">

                        {/* Grønt ikon som viser at serviceavtalen er fullført. */}
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="17"
                            height="17"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-800">
                            {avtale.kunde}
                          </p>

                          <p className="mt-1 truncate text-xs text-slate-500">
                            {avtale.model}
                          </p>
                        </div>
                      </div>

                      <span className="shrink-0 text-xs font-medium text-slate-500">
                        {avtale.dato}
                      </span>
                    </div>
                  ))
                )}

              </div>
            </section>

          </div>
        </div>
      </div>
    </main>
  )
}