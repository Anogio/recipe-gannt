import "./globals.css";
import { Metadata } from "next";
import { APP_NAME, I18nProvider } from "@/i18n";

export const metadata: Metadata = {
  title: APP_NAME,
  description: "Turn any recipe into an interactive cooking checklist",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
