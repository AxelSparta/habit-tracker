import { ClerkProvider } from "@clerk/nextjs";
import { esUY } from "@clerk/localizations";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
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
    colorPrimaryForeground: "#ffffff",
    colorDanger: "var(--danger)",
    colorRing: "var(--app-accent)",
    colorNeutral: "var(--foreground)",
    colorModalBackdrop: "rgb(0 0 0 / 0.5)",
    fontFamily: "var(--font-geist-sans)",
  },
};

export const metadata: Metadata = {
  title: "Hábitos",
  description:
    "Registrá tus hábitos, mantené la racha y mirá tus estadísticas.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <ClerkProvider localization={esUY} appearance={clerkAppearance}>
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
