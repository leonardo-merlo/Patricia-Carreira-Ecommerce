import dynamic from "next/dynamic"

const CitiesMapInner = dynamic(
  () => import("./cities-map-inner").then((mod) => mod.CitiesMapInner),
  {
    ssr: false,
    loading: () => (
      <div className="h-64 w-full animate-pulse rounded-xl bg-on-primary/10 md:h-72" />
    ),
  }
)

export function CitiesMap() {
  return <CitiesMapInner />
}
