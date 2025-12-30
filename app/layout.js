import "./globals.css";
import Providers from "./providers";

export const metadata = {
  title: "Cosmos",
  description: "Cosmos NFT marketplace built with Next.js",
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
