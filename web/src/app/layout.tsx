import type { Metadata } from "next";
import { Header, Footer } from "@/components/header";
import { site } from "@/lib/site";
import "./globals.css";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: site.title, template: `%s · ${site.name}` },
  description: site.description,
  openGraph: {
    title: site.title,
    description: site.description,
    type: "website",
    locale: "zh_CN",
    url: site.url,
  },
  robots: { index: true, follow: true },
  alternates: { types: { "application/rss+xml": `${site.url}/feed.xml` } },
};
const themeScript = `try{const t=localStorage.getItem('theme');document.documentElement.dataset.theme=t|| (matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light')}catch{}`;
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
      </head>
      <body>
        <a className="skip-link" href="#main">
          跳到内容
        </a>
        <Header />
        <div className="site-content">
          <main id="main" className="main-shell" tabIndex={-1}>
            {children}
          </main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
