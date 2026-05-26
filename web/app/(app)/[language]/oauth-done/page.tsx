import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Delvo - Connection complete",
};

export default function OAuthDonePage({
  params,
  searchParams,
}: {
  params: Promise<{ language: string }>;
  searchParams: Promise<{ status?: string; email?: string }>;
}) {
  return (
    <main className="min-h-screen flex items-center justify-center bg-background text-foreground px-6">
      <OAuthResult params={params} searchParams={searchParams} />
    </main>
  );
}

async function OAuthResult({
  params,
  searchParams,
}: {
  params: Promise<{ language: string }>;
  searchParams: Promise<{ status?: string; email?: string }>;
}) {
  const { language } = await params;
  const { status, email } = await searchParams;
  const isSpanish = language === "es";
  const ok = status === "ok";

  return (
    <div className="text-center max-w-sm space-y-4">
      <div className="text-5xl">{ok ? "✓" : "×"}</div>
      <h1 className="text-xl font-bold">
        {ok
          ? isSpanish ? "Google Calendar conectado" : "Google Calendar connected"
          : isSpanish ? "No se pudo conectar" : "Could not connect"}
      </h1>
      {ok && email && (
        <p className="text-sm text-muted-foreground">
          {isSpanish ? "Cuenta" : "Account"}: {email}
        </p>
      )}
      <p className="text-sm text-muted-foreground">
        {ok
          ? isSpanish ? "Puedes cerrar esta ventana y volver a la app." : "You can close this window and return to the app."
          : isSpanish ? "Cierra esta ventana e intentalo de nuevo desde la app." : "Close this window and try again from the app."}
      </p>
    </div>
  );
}
