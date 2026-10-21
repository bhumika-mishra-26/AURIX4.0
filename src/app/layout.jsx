import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip"
import { AuthProvider } from "@/context/AuthContext"
import { ThemeProvider } from "@/context/ThemeContext"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "AURIX | AI Vulnerability Intelligence Platform",
  description: "AURIX - Autonomous Agentic Security Vulnerability Detection and Remediation Platform",
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
  openGraph: {
    title: "AURIX | AI Vulnerability Intelligence Platform",
    description: "AURIX - Autonomous Agentic Security Vulnerability Detection and Remediation Platform",
    images: [{ url: "/logo.png" }],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark" style={{ colorScheme: "dark" }} suppressHydrationWarning>
      <head>
        <link rel="icon" href="/logo.png" type="image/png" sizes="any" />
        <link rel="apple-touch-icon" href="/logo.png" />
        <script dangerouslySetInnerHTML={{
          __html: `
            (function() {
              try {
                var theme = localStorage.getItem('aurix_theme') || 'dark';
                var root = document.documentElement;
                root.classList.remove('light', 'dark');
                root.classList.add(theme);
                root.style.colorScheme = theme;
              } catch(e) {}
            })();
          `,
        }} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground min-h-screen transition-colors duration-300`}>
        <AuthProvider>
          <ThemeProvider>
            <TooltipProvider>
              {children}
            </TooltipProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}