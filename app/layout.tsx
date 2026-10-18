import type { Metadata } from "next";
import "@fontsource/prompt/400.css";
import "@fontsource/prompt/500.css";
import "@fontsource/prompt/600.css";
import "./globals.css";
export const metadata: Metadata = {
  title: "ระบบจัดการคลังสินค้าอัจฉริยะ",
  description: "ระบบจัดการสินค้าและติดตามความเคลื่อนไหวในคลัง",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
