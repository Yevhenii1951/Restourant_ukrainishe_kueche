export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>
        <header className="bg-stone-900 text-white p-4 text-sm">Admin — nur für eingeladene Mitarbeiter</header>
        <main>{children}</main>
      </body>
    </html>
  );
}
