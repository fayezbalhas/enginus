import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: 'https://enginus.org', lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: 'https://enginus.org/calculators', lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    { url: 'https://enginus.org/calculators/beam', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: 'https://enginus.org/calculators/unit-converter', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: 'https://enginus.org/calculators/rebar', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: 'https://enginus.org/calculators/rc-beam', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: 'https://enginus.org/calculators/rc-slab', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: 'https://enginus.org/calculators/rc-column', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: 'https://enginus.org/calculators/section-properties', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: 'https://enginus.org/dashboard', lastModified: new Date(), changeFrequency: 'weekly', priority: 0.6 },
    { url: 'https://enginus.org/pro', lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: 'https://enginus.org/about', lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: 'https://enginus.org/privacy', lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: 'https://enginus.org/terms', lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: 'https://enginus.org/disclaimer', lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
  ]
}
