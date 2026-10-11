import { ClerkProvider } from "@clerk/nextjs";
import { esUY } from "@clerk/localizations";
import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { ServiceWorker } from "@/components/service-worker";
import "./globals.css";

// Inter para el texto y JetBrains Mono para números, fechas y etiquetas.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

// Los componentes de Clerk usan los mismos tokens que el sitio, así siguen el
// modo claro/oscuro del sistema definido en globals.css. Clerk aplica su propia
// transparencia a colorBorder, por eso se le pasa el color del texto.
const clerkAppearance = {
  variables: {
    colorBackground: "var(--surface)",
    colorForeground: "var(--foreground)",
    colorMutedForeground: "var(--muted)",
    colorMuted: "var(--surface-2)",
    colorInput: "var(--background)",
    colorInputForeground: "var(--foreground)",
    colorBorder: "var(--foreground)",
    colorPrimary: "var(--app-accent)",
    colorPrimaryForeground: "var(--app-accent-foreground)",
    colorDanger: "var(--danger)",
    colorRing: "var(--app-accent)",
    colorNeutral: "var(--foreground)",
    colorModalBackdrop: "rgb(0 0 0 / 0.5)",
    fontFamily: "var(--font-inter)",
  },
};

export const metadata: Metadata = {
  title: "Hábitos",
  description:
    "Registrá tus hábitos, mantené la racha y mirá tus estadísticas.",
  // iOS no lee el manifest para esto: abre la app instalada sin la barra de
  // Safari y usa este nombre debajo del ícono.
  appleWebApp: { capable: true, title: "Hábitos", statusBarStyle: "default" },
};

// Color de la barra del sistema, igual al fondo de cada modo (globals.css).
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3f4f7" },
    { media: "(prefers-color-scheme: dark)", color: "#12151c" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <ClerkProvider localization={esUY} appearance={clerkAppearance}>
          {children}
        </ClerkProvider>
        <ServiceWorker />
      </body>
    </html>
  );
}
