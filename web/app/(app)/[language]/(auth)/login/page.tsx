import { LoginForm } from "@/components/login-form"

export default async function LoginPage({
  params,
}: {
  params: Promise<{ language: string }>
}) {
  const { language } = await params
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
      <div className="w-full max-w-sm">
        <LoginForm language={language} />
      </div>
    </div>
  )
}
