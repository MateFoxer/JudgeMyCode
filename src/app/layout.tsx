import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Judge My Code",
  description: "Upload code and get brutally honest feedback",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(() => {
              try {
                const saved = localStorage.getItem("judge-theme");
                const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
                const theme = saved === "dark" || saved === "light" ? saved : (prefersDark ? "dark" : "light");
                document.documentElement.dataset.theme = theme;
              } catch {
                document.documentElement.dataset.theme = "light";
              }
            })();`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
