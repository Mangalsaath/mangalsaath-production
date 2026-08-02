export default function robots() {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://mangalsaath.com';
  return { rules: [{ userAgent: '*', allow: '/', disallow: ['/api/', '/admin'] }], sitemap: `${base}/sitemap.xml` };
}
