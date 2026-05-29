import './afiliada.css'

export const metadata = {
  title: 'Meu painel — Patrícia Carreira',
}

export default function AfiliadaLayout({ children }: { children: React.ReactNode }) {
  return <div className="afiliada-portal">{children}</div>
}
