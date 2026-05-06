import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Meme Guesser — YouTube Meme Tahmin Oyunu",
  description: "YouTube meme kliplerini izle, hangi meme olduğunu tahmin et ve liderlik tablosunda yerini al!",
  keywords: ["meme", "quiz", "oyun", "youtube", "tahmin"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Syne:wght@700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
