import "./globals.css";
import Providers from "./providers";

export const metadata = {
  title: "Cosmos",
  description: "Cosmos NFT marketplace built with Next.js",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
