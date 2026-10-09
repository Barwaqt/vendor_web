import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {title:'Barwaqt | Vendor Portal',description:'Manage your business with the Barwaqt vendor portal.'};
export default function RootLayout({children}:{children:React.ReactNode}) {return <html lang="en"><body>{children}</body></html>}
