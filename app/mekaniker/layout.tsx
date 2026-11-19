
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { redirect } from "next/navigation";

// Hent hemmeligheten som brukes til å kontrollere JWT-tokenet.
function getSecret() {
    const authSecret = process.env.AUTH_SECRET;

    if (!authSecret) {
        throw new Error("AUTH_SECRET mangler i miljøvariablene.");
    }

    return new TextEncoder().encode(authSecret);
}

// Kontroller om brukeren har tilgang til mekanikerområdet.
export default async function mekanikerLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Hent innloggingscookien fra brukerens forespørsel.
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    // Send brukeren til innlogging hvis tokenet mangler.
    if (!token) {
        redirect("/");
    }

    try {
        // Kontroller at JWT-tokenet har gyldig signatur og ikke er utløpt.
        const { payload } = await jwtVerify(token, getSecret(), {
            algorithms: ["HS256"],
        });

        // Kontroller at brukeren har riktig rolle.
        if (payload.role !== "mekaniker") {
            redirect("/");
        }

    } catch {
        // Send brukeren til innlogging hvis tokenet er ugyldig.
        redirect("/");
    }

    // Vis innholdet hvis brukeren har gyldig innlogging og riktig rolle.
    return <>{children}</>;
}