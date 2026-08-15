import Link from 'next/link'
import { AdminIcon } from '@/components/admin/admin-icon'
import { CONFIG_SECTIONS, configSectionHref, type ConfigSectionId } from '@/lib/config-sections'

// Server component: moldura de toda página de configuração. Cada seção é uma
// rota própria, então o título e o caminho de volta vivem aqui, num lugar só.

export function ConfigPageShell({
  section,
  children,
}: {
  section: ConfigSectionId
  children: React.ReactNode
}) {
  const current = CONFIG_SECTIONS.find((s) => s.id === section)!

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="cust-meta" style={{ marginBottom: 4 }}>
            <Link href="/admin/config" style={{ color: 'var(--text-3)', textDecoration: 'none' }}>
              Configurações
            </Link>
            {' / '}
            {current.label}
          </div>
          <h2 className="page-title">{current.label}</h2>
          <p className="page-sub">{current.description}</p>
        </div>
      </div>
      {children}
    </div>
  )
}

/** Índice: aparece quando alguém chega em /admin/config sem escolher seção. */
export function ConfigIndex() {
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h2 className="page-title">Configurações</h2>
          <p className="page-sub">Escolha o que quer ajustar</p>
        </div>
      </div>

      <div className="config-grid-2">
        {CONFIG_SECTIONS.map((s) => (
          <Link
            key={s.id}
            href={configSectionHref(s.id)}
            id={`link-config-${s.id}`}
            className="card"
            style={{ padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'center', textDecoration: 'none', color: 'inherit' }}
          >
            <div className="thumb" style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--surface-2)', color: 'var(--text-2)', flexShrink: 0 }}>
              <AdminIcon name={s.icon} size={15} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{s.label}</div>
              <div className="cust-meta">{s.description}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

export function ConfigLoadError() {
  return (
    <div className="alert alert-error" style={{ fontSize: 13 }}>
      Não foi possível carregar as configurações. Verifique a conexão com o Supabase.
    </div>
  )
}
