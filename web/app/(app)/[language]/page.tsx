"use client"
import { usePathname, useRouter } from "next/navigation";

export default function Home() {
    const router = useRouter()
    const pathname = usePathname()
    router.push(`${pathname}/home`)
}