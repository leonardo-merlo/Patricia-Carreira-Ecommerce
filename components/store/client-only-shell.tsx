"use client" // ssr:false on dynamic() is only valid inside a Client Component

import dynamic from "next/dynamic"

const SignupPopup = dynamic(
  () => import("./signup-popup").then((m) => m.SignupPopup),
  { ssr: false }
)

export function ClientOnlyShell() {
  return <SignupPopup />
}
