import "./global.css";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <title>AceFighter</title>
      <body className={`antialiased`}>{children}</body>
    </html>
  );
}
