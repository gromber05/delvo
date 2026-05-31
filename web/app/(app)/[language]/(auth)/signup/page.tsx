import { SignupForm } from "@/components/signup-form"

export default async function SignupPage({
  params,
}: {
  params: Promise<{ language: string }>
}) {
  const { language } = await params
  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center gap-6 overflow-hidden bg-[#0f0f13] p-6 md:p-10">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-120 w-175 -translate-x-1/2 rounded-full bg-[#6c5ce7]/20 blur-[120px]" />
      </div>
      <div className="relative z-10 w-full max-w-sm">
        <SignupForm language={language} />
      </div>
    </div>
  )
}
