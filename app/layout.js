import './globals.css';
import { getPublicSiteSettings } from '@/lib/settings-service';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mangalsaath.com';

export async function generateMetadata() {
  const settings = await getPublicSiteSettings();
  return {
    metadataBase: new URL(siteUrl),
    title: { default: settings.seoTitle, template: `%s | ${settings.businessName}` },
    description: settings.seoDescription,
    applicationName: settings.businessName,
    keywords: ['matrimonial', 'marriage', 'Indian matrimony', 'trusted matches', settings.businessName],
    alternates: { canonical: '/' },
    openGraph: { type: 'website', locale: 'en_IN', url: siteUrl, siteName: settings.businessName, title: settings.seoTitle, description: settings.seoDescription },
    twitter: { card: 'summary_large_image', title: settings.businessName, description: settings.seoDescription },
    robots: { index: true, follow: true },
    icons: { icon: '/favicon.ico' }
  };
}

export default async function RootLayout({ children }) {
  const settings = await getPublicSiteSettings();
  const organization = { '@context':'https://schema.org', '@type':'Organization', name:settings.businessName, url:siteUrl, email:settings.supportEmail };
  return <html lang="en-IN"><body>{children}<script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(organization)}} /></body></html>;
}
