"use client"

import { useState, useEffect } from "react"


// Hovedkomponenten for resepsjonistens dashboard.
export default function ResepsjonistDashboard() {
  const [dagligAvtaler, setDagligAvtaler] = useState<{ id: number, tid: number, desc: string, status: string, kunde: string, mekaniker: string, registreringsnummer: string, model: string }[]>([]);

  useEffect(() => {
    async function getDagligAvtaler() {
        const response = await fetch("/api/dagensAvtaler");

        // Viser om API-kallet lykkes.
        console.log("Status fra API:", response.status);

        const result = await response.json();

        // Viser hele svaret fra API-et.
        console.log("Data fra API:", result);
        console.log("Avtaler:", result.avtaler);

        setDagligAvtaler(result.avtaler ?? []);
    }

    void getDagligAvtaler();
  }, []);

  const [ukenligAvtaler, setUkenligAvtaler] = useState<{ id: number, desc: string, dato: number, kunde: string, model: string }[]>([]);

  useEffect(() => {
    async function getUkentligAvtaler() {
        const response = await fetch("/api/lastCompleted");

        // Viser om API-kallet lykkes.
        console.log("Status fra API:", response.status);

        const result = await response.json();

        // Viser hele svaret fra API-et.
        console.log("Data fra API:", result);
        console.log("FERDIGE AVTALER DE 7 SISTE DAGENE:", result.alleAvtaler);

        setUkenligAvtaler(result.alleAvtaler ?? []);
    }

    void getUkentligAvtaler();
  }, []);


  // Henter dagens dato og formaterer den på norsk.
  const dagensDato = new Date().toLocaleDateString("nb-NO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });


  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [carNumber, setCarNumber] = useState("");
  const [carModel, setCarModel] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [time, setTime] = useState("");
  const [description, setDescription] = useState("");
  const [chosenWorker, setChosenWorker] = useState("");

  const [worker, setWorker] = useState<{ id: number; navn: string }[]>([]);

  async function register() {
    if (!name || !phoneNumber || !email) {
      return
    }
    if (!phoneNumber) {
      return
    }
    if (!email) {
      return
    }

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
      })
    }) 
  }


  useEffect(() => {
    async function getWorkers() {
      const response = await fetch("/api/workers")

      const result = await response.json();

      setWorker(result.workers);
    }

    void getWorkers()
  }, []);

  return (
    <main className="min-h-screen bg-gray-100 p-4 md:p-8">

      {/* Sideoverskrift med brukertype og utloggingsknapp */}
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Bilverkstedet AS
          </h1>
          <p className="text-sm text-gray-500">
            Resepsjonist – Oversikt
          </p>
        </div>

        {/* Viser innlogget brukertype og knapp for å logge ut */}
        <div className="flex items-center gap-3">
          <span className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700">
            Resepsjonist
          </span>

          <button
            type="button"
            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-red-600 transition hover:border-red-200 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
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
        </div>
      </header>

      {/* Hovedinnhold: Registreringsskjema til venstre og oversikter til høyre */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">

        {/* VENSTRE SIDE – Registreringsskjema */}
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm md:p-6">

          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              Registrer ny serviceavtale
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Fyll inn informasjon om kunden, bilen og serviceavtalen.
            </p>
          </div>

          <form className="space-y-6">

            {/* Kundens personopplysninger */}
            <div>
              <h3 className="mb-4 border-b border-gray-200 pb-2 text-sm font-semibold text-gray-800">
                Kundeinformasjon
              </h3>

              <div className="space-y-4">
                <div>
                  <label htmlFor="kundeNavn" className="mb-1.5 block text-sm font-medium text-gray-700">
                    Fullt navn
                  </label>
                  <input
                    id="kundeNavn"
                    type="text"
                    placeholder="Skriv inn kundens navn"
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div>
                  <label htmlFor="telefon" className="mb-1.5 block text-sm font-medium text-gray-700">
                    Telefonnummer
                  </label>
                  <input
                    id="telefon"
                    type="tel"
                    placeholder="Skriv inn telefonnummer"
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    onChange={(e) => setPhoneNumber(e.target.value)}
                  />
                </div>

                <div>
                  <label htmlFor="epost" className="mb-1.5 block text-sm font-medium text-gray-700">
                    E-postadresse
                  </label>
                  <input
                    id="epost"
                    type="email"
                    placeholder="Skriv inn e-postadresse"
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Informasjon om bilen som tilhører kunden */}
            <div>
              <h3 className="mb-4 border-b border-gray-200 pb-2 text-sm font-semibold text-gray-800">
                Bilinformasjon
              </h3>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="registreringsnummer" className="mb-1.5 block text-sm font-medium text-gray-700">
                    Registreringsnummer
                  </label>
                  <input
                    id="registreringsnummer"
                    type="text"
                    placeholder="F.eks. AB12345"
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    onChange={(e) => setCarNumber(e.target.value)}
                  />
                </div>

                <div>
                  <label htmlFor="bilmerke" className="mb-1.5 block text-sm font-medium text-gray-700">
                    Bilmerke
                  </label>
                  <input
                    id="bilmerke"
                    type="text"
                    placeholder="F.eks. Volvo"
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    onChange={(e) => setCarModel(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Informasjon om serviceavtalen */}
            <div>
              <h3 className="mb-4 border-b border-gray-200 pb-2 text-sm font-semibold text-gray-800">
                Serviceavtale
              </h3>

              <div className="space-y-4">

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="dato" className="mb-1.5 block text-sm font-medium text-gray-700">
                      Dato
                    </label>
                    <input
                      id="dato"
                      type="date"
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      onChange={(e) => setDueDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label htmlFor="dato" className="mb-1.5 block text-sm font-medium text-gray-700">
                      Tid
                    </label>
                    <input
                      id="tid"
                      type="time"
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      onChange={(e) => setTime(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="mekaniker" className="mb-1.5 block text-sm font-medium text-gray-700">
                    Tildel mekaniker
                  </label>
                  <select
                    id="mekaniker"
                    defaultValue=""
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    onChange={(e) => setChosenWorker(e.target.value)}
                  >
                    <option value="" disabled>
                      Velg en mekaniker
                    </option>
                    {worker.map((worker) => {
                      return(
                        <option key={worker.id} value={worker.id}>{worker.navn}</option>
                      )
                    })}
                  </select>
                </div>

                <div>
                  <label htmlFor="beskrivelse" className="mb-1.5 block text-sm font-medium text-gray-700">
                    Beskrivelse av problem
                  </label>
                  <textarea
                    id="beskrivelse"
                    rows={4}
                    placeholder="Beskriv hva kunden ønsker å få undersøkt eller reparert..."
                    className="w-full resize-y rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Hovedknappen for å registrere alle opplysningene */}
            <button
              type="button"
              className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              onClick={() => void register()}
            >
              + Registrer serviceavtale
            </button>

          </form>
        </section>

        {/* HØYRE SIDE – Oversikter */}
        <div className="space-y-6">

          {/* Oversikt over dagens serviceavtaler */}
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm md:p-6">

            <div className="mb-5">
              <h2 className="text-lg font-bold text-gray-900">
                Dagens serviceavtaler
              </h2>

              {/* Viser dagens dato automatisk med norsk datoformat */}
              <p className="mt-1 text-sm capitalize text-gray-500">
                {dagensDato}
              </p>
            </div>

            {/* Viser alle serviceavtalene som er registrert for i dag */}
            <div className="space-y-4">
              {dagligAvtaler.map((avtale) => (
                <div
                  key={avtale.id}
                  className="rounded-lg border border-gray-200 p-4 transition hover:border-gray-300"
                >
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <span className="text-base font-bold text-gray-900">
                      {avtale.tid.toString().slice(0, 5)}
                    </span>

                    {/* Statusen får forskjellig farge avhengig av verdien */}
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        avtale.status === "Under arbeid"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {avtale.status}
                    </span>
                  </div>

                  <p className="font-semibold text-gray-800">
                    {avtale.kunde}
                  </p>

                  <p className="mt-1 text-sm text-gray-500">
                    {avtale.model} · {avtale.registreringsnummer}
                  </p>

                  <p className="mt-2 text-xs text-gray-500">
                    Mekaniker: {avtale.mekaniker}
                  </p>
                </div>
              ))}
            </div>

          </section>

          {/* Oversikt over fullførte serviceavtaler de siste syv dagene */}
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm md:p-6">

            <div className="mb-5">
              <h2 className="text-lg font-bold text-gray-900">
                Fullførte serviceavtaler
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Oversikt over de siste syv dagene.
              </p>
            </div>

            {/* Viser totalt antall fullførte serviceavtaler */}
            <div className="mb-5 rounded-lg bg-green-50 p-4">
              <p className="text-sm font-medium text-green-700">
                Totalt fullførte avtaler
              </p>

              <p className="mt-1 text-3xl font-bold text-green-800">
                18
              </p>

              <p className="mt-1 text-xs text-green-700">
                Siste 7 dager
              </p>
            </div>

            {/* Viser de siste fullførte avtalene med et grønt avkrysningsikon */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-800">
                Siste fullførte avtaler
              </h3>

              {ukenligAvtaler.map((avtale) => (
                <div
                  key={avtale.id}
                  className="flex items-center justify-between gap-3 border-b border-gray-100 pb-3 last:border-0 last:pb-0"
                >
                  <div className="flex items-center gap-3">

                    {/* Grønt ikon som viser at serviceavtalen er fullført */}
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700">
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

                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {avtale.kunde}
                      </p>

                      <p className="mt-1 text-xs text-gray-500">
                        {avtale.model}
                      </p>
                    </div>
                  </div>

                  <span className="shrink-0 text-xs text-gray-500">
                    {avtale.dato}
                  </span>
                </div>
              ))}
            </div>

          </section>

        </div>
      </div>
    </main>
  );
}