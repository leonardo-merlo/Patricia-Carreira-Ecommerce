import { NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user, supabase } = await updateSession(request)
  const { pathname } = request.nextUrl

  // /admin — exige role = 'admin'
  if (pathname.startsWith('/admin')) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/conta/entrar'
      url.searchParams.set('next', pathname)
      return NextResponse.redirect(url)
    }
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    if (profile?.role !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  // Rotas de conta que não exigem sessão
  const isAuthRoute =
    pathname === '/conta/entrar' ||
    pathname === '/conta/cadastrar' ||
    pathname === '/conta/recuperar-senha' ||
    pathname === '/conta/redefinir-senha'

  // Rotas que só fazem sentido para quem NÃO está logado.
  // /conta/redefinir-senha fica de fora de propósito: o link de recuperação do
  // Supabase troca o code por uma sessão antes de chegar na página, então quem
  // vem do e-mail chega já autenticado — se redirecionasse, o formulário de
  // nova senha nunca apareceria. Para quem já estava logado a página funciona
  // como "trocar senha", e sem sessão o updateUser falha e a própria página
  // avisa que o link expirou.
  const isGuestOnlyRoute =
    pathname === '/conta/entrar' ||
    pathname === '/conta/cadastrar' ||
    pathname === '/conta/recuperar-senha'

  // /conta/** (exceto rotas de auth) — exige autenticação
  if (pathname.startsWith('/conta') && !isAuthRoute && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/conta/entrar'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  // Se já autenticado, redireciona entrar/cadastrar/recuperar para /conta
  if (isGuestOnlyRoute && user) {
    return NextResponse.redirect(new URL('/conta', request.url))
  }

  return supabaseResponse
}

export const config = {
  // api/ excluído: webhooks têm autenticação própria (assinatura/token) e não
  // usam sessão de cookie — rodar o middleware neles só adiciona latência.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
