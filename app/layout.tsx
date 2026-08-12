import type { Metadata } from "next";
import "../css/main.css";

export const metadata: Metadata = {
  title: "Git-Fast-Learning — Master Git & GitHub In-Browser",
  description: "Learn Git by breaking it, not by reading about it. An interactive, in-browser Git & GitHub trainer featuring an authentic simulator, live DAG graph, mascot guidance, and 100 Ask AI prompts.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="light">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-[#F5F7FB] dark:bg-[#0A0E1A] text-[#0F172A] dark:text-[#F1F5F9] font-sans antialiased selection:bg-indigo-500 selection:text-white transition-colors duration-200">
        {children}
      </body>
    </html>
  );
}
