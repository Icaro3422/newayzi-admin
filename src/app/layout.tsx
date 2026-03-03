import type { Metadata } from "next";
import { Sora, Heebo } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { AdminProvider } from "@/contexts/AdminContext";

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
  weight: ["100", "200", "300", "400", "500", "600", "700", "800"],
  display: "swap",
});

const heebo = Heebo({
  subsets: ["latin"],
  variable: "--font-heebo",
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Newayzi Admin | Panel de administración",
  description: "Panel de administración de Newayzi",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="overflow-x-hidden max-w-full">
      <body
        className={`${sora.variable} ${heebo.variable} antialiased font-sans overflow-x-hidden max-w-full`}
        suppressHydrationWarning
      >
        <Providers>
        <AdminProvider>{children}</AdminProvider>
      </Providers>
      </body>
    </html>
  );
}
