import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VisionBrave — Create Without Limits",
  description: "Your all-in-one AI creative studio for generating images, videos, and audio.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
