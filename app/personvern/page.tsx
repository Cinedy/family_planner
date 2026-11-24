import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Personvern – Familieplanlegger",
  description: "Hvilke opplysninger Familieplanlegger lagrer, og hvordan de brukes",
}

// Public page (no login): required by Google for the sign-in screen
export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10 space-y-6 text-sm leading-relaxed">
      <div>
        <Link href="/login" className="text-xs text-muted-foreground hover:text-foreground">
          ← Til innlogging
        </Link>
        <h1 className="mt-3 text-2xl font-bold">Personvern</h1>
        <p className="text-muted-foreground">Sist oppdatert 24. november 2026</p>
      </div>

      <p>
        Familieplanlegger er en privat app for å dele kalender, handleliste, gjøremål og middagsplan i en familie.
        Den har ingen reklame, selger ingen opplysninger og bruker ingen sporing eller analyseverktøy.
      </p>

      <section className="space-y-2">
        <h2 className="text-base font-semibold">Hva vi lagrer</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Fra Google-kontoen din:</strong> navn, e-postadresse og profilbilde. Vi får ikke tilgang til
            e-post, kalender, filer eller annet i Google-kontoen din.
          </li>
          <li>
            <strong>Det familien legger inn:</strong> hendelser, handlelister, gjøremål, middager og oppskrifter.
          </li>
          <li>
            <strong>Invitasjoner:</strong> e-postadressen til den som blir invitert.
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold">Hvem som kan se det</h2>
        <p>
          Bare medlemmene i din familie i appen. Ingen andre brukere kan se familiens data, og opplysningene deles
          ikke med andre.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold">Hvor det lagres</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>I en database hos Neon, i EU (Frankfurt).</li>
          <li>Appen kjører hos Vercel. E-post med invitasjoner sendes via Resend.</li>
          <li>
            En kopi av familiens data lagres på telefonen din slik at appen virker uten nett. Kopien slettes når du
            logger ut.
          </li>
          <li>Vi bruker bare en informasjonskapsel (cookie) for å holde deg innlogget.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold">Sletting</h2>
        <p>
          Du kan forlate familien under Innstillinger. Er du det siste medlemmet, slettes familien og alle dens data.
          Vil du at kontoen din skal slettes helt, ta kontakt med den som inviterte deg til appen.
        </p>
      </section>
    </main>
  )
}
