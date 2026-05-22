"use client"

import { useEffect } from "react"
import { MapContainer, TileLayer, Marker, ZoomControl, useMap } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

const CITIES: { name: string; lat: number; lng: number }[] = [
  { name: "Arraial d'Ajuda", lat: -16.4422, lng: -39.0694 },
  { name: "Salvador", lat: -12.9777, lng: -38.5016 },
  { name: "Belo Horizonte", lat: -19.9167, lng: -43.9345 },
  { name: "Muriaé", lat: -21.1317, lng: -42.3686 },
  { name: "Governador Valadares", lat: -18.8553, lng: -41.9496 },
  { name: "Juiz de Fora", lat: -21.7642, lng: -43.3503 },
  { name: "Uberlândia", lat: -18.9186, lng: -48.2772 },
  { name: "Vitória", lat: -20.3155, lng: -40.3128 },
  { name: "Rio de Janeiro", lat: -22.9068, lng: -43.1729 },
  { name: "Niterói", lat: -22.8833, lng: -43.1036 },
  { name: "Petrópolis", lat: -22.505, lng: -43.1789 },
  { name: "Teresópolis", lat: -22.4122, lng: -42.9786 },
  { name: "São Paulo", lat: -23.5505, lng: -46.6333 },
  { name: "Campinas", lat: -22.9099, lng: -47.0626 },
  { name: "Santos", lat: -23.9618, lng: -46.3322 },
  { name: "Curitiba", lat: -25.429, lng: -49.2671 },
  { name: "Londrina", lat: -23.3045, lng: -51.1696 },
  { name: "Maringá", lat: -23.4205, lng: -51.9331 },
  { name: "Florianópolis", lat: -27.5954, lng: -48.548 },
  { name: "Joinville", lat: -26.3044, lng: -48.8487 },
  { name: "Blumenau", lat: -26.9195, lng: -49.0661 },
  { name: "Porto Alegre", lat: -30.0346, lng: -51.2177 },
  { name: "Caxias do Sul", lat: -29.1681, lng: -51.1794 },
]

const PIN_ICON = L.divIcon({
  className: "",
  html: `<div style="
    width:14px;height:14px;border-radius:50%;
    background:#ffffff;border:2.5px solid #b45309;
    box-shadow:0 1px 4px rgba(0,0,0,0.28);
  "></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
})

function FitBounds() {
  const map = useMap()
  useEffect(() => {
    const bounds = L.latLngBounds(CITIES.map(({ lat, lng }) => [lat, lng] as [number, number]))
    map.fitBounds(bounds, { padding: [28, 28] })
  }, [map])
  return null
}

export function CitiesMapInner() {
  return (
    <MapContainer
      center={[-22, -44]}
      zoom={5}
      scrollWheelZoom={false}
      zoomControl={false}
      className="h-64 w-full rounded-xl md:h-72"
      aria-label="Mapa com cidades atendidas pela Patrícia Carreira"
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        subdomains="abcd"
        maxZoom={20}
      />
      <ZoomControl position="bottomright" />
      <FitBounds />
      {CITIES.map(({ name, lat, lng }) => (
        <Marker key={name} position={[lat, lng]} icon={PIN_ICON} title={name} />
      ))}
    </MapContainer>
  )
}
