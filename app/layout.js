import "./globals.css";

export const metadata = {
  title: "OpenBay",
  description: "OpenSea-style NFT marketplace clone built with Next.js",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}