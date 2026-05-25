"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { ProductChat } from "@/components/product-chat"

export function StellaWidget() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <div
        className={cn(
          "fixed bottom-24 right-6 z-50 w-80 overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-[#6c5ce7]/15 transition-all duration-200",
          isOpen ? "pointer-events-auto scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0"
        )}
      >
        <div className="flex items-center justify-between border-b border-border/70 bg-card px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-7 items-center justify-center rounded-full bg-[#6c5ce7]/15">
              <svg className="size-3.5 text-[#6c5ce7]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold leading-tight">Stella</p>
              <div className="flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                <p className="text-[10px] text-muted-foreground">AI Assistant · Online</p>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="rounded-full p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="h-90">
          <ProductChat compact className="h-full" />
        </div>
      </div>

      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className={cn(
          "fixed bottom-6 right-6 z-50 flex size-14 items-center justify-center rounded-full bg-[#6c5ce7] text-white shadow-xl shadow-[#6c5ce7]/30 transition-all duration-200 hover:scale-105 hover:bg-[#5b4bd6] active:scale-95",
        )}
        aria-label="Open Stella AI chat"
      >
        {isOpen ? (
          <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
          </svg>
        )}
      </button>
    </>
  )
}
