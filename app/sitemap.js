export default function sitemap() {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://mangalsaath.com';
  return [
    { url: base, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/?view=profiles`, changeFrequency: 'daily', priority: 0.8 },
    { url: `${base}/?view=about`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/?view=privacy`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/?view=terms`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/?view=contact`, changeFrequency: 'monthly', priority: 0.4 }
  ];
}
