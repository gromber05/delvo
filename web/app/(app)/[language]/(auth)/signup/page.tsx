import { SignupForm } from "@/components/signup-form"

export default async function SignupPage({
  params,
}: {
  params: Promise<{ language: string }>
}) {
  const { language } = await params
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
      <div className="w-full max-w-sm">
        <SignupForm language={language} />
      </div>
    </div>
  )
}
