import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import GlobalState from "../components/GlobalContext";
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "AgentDesk",
  description:
    "Turn messy notes and documents into structured, approved actions.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
       <GlobalState>{children}</GlobalState>
      </body>
    </html>
  );
}


