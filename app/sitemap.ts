import { MetadataRoute } from 'next'
import { createServiceClient } from '@/lib/supabase/service'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = 'https://patriciacarreira.com.br'

  const supabase = createServiceClient()
  const { data: products } = await supabase
    .from('products')
    .select('slug, updated_at')
    .eq('is_active', true)

  const productUrls: MetadataRoute.Sitemap = (products ?? []).map(p => ({
    url: `${base}/produto/${p.slug}`,
    lastModified: p.updated_at,
    changeFrequency: 'weekly',
    priority: 0.8,
  }))

  const staticUrls: MetadataRoute.Sitemap = [
    { url: base,                             changeFrequency: 'daily',   priority: 1.0 },
    { url: `${base}/bolsas`,                 changeFrequency: 'weekly',  priority: 0.9 },
    { url: `${base}/vestuario`,              changeFrequency: 'weekly',  priority: 0.9 },
    { url: `${base}/acessorios`,             changeFrequency: 'weekly',  priority: 0.9 },
    { url: `${base}/lancamentos`,            changeFrequency: 'weekly',  priority: 0.9 },
    { url: `${base}/bazar`,                  changeFrequency: 'weekly',  priority: 0.7 },
    { url: `${base}/sobre`,                  changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/faq`,                    changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/afiliadas`,              changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/privacidade`,            changeFrequency: 'monthly', priority: 0.3 },
    { url: `${base}/termos`,                 changeFrequency: 'monthly', priority: 0.3 },
    { url: `${base}/politica-de-trocas`,     changeFrequency: 'monthly', priority: 0.4 },
    { url: `${base}/politica-de-envio`,      changeFrequency: 'monthly', priority: 0.4 },
  ]

  return [...staticUrls, ...productUrls]
}
