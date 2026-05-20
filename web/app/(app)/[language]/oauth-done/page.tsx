import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Delvo – Conexión completada",
};

export default function OAuthDonePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; email?: string }>;
}) {
  return (
    <main className="min-h-screen flex items-center justify-center bg-background text-foreground px-6">
      <OAuthResult searchParams={searchParams} />
    </main>
  );
}

async function OAuthResult({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; email?: string }>;
}) {
  const { status, email } = await searchParams;
  const ok = status === "ok";

  return (
    <div className="text-center max-w-sm space-y-4">
      <div className="text-5xl">{ok ? "✓" : "✗"}</div>
      <h1 className="text-xl font-bold">
        {ok ? "Google Calendar conectado" : "No se pudo conectar"}
      </h1>
      {ok && email && (
        <p className="text-sm text-muted-foreground">Cuenta: {email}</p>
      )}
      <p className="text-sm text-muted-foreground">
        {ok
          ? "Puedes cerrar esta ventana y volver a la app."
          : "Cierra esta ventana e inténtalo de nuevo desde la app."}
      </p>
    </div>
  );
}
