import localFont from "next/font/local";
import "./globals.css";
import { getAgentInfo } from "./api/agent";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

const name = process.env.NEXT_PUBLIC_AGENT_NAMESPACE;

export async function generateMetadata() {
  const res = await getAgentInfo(name);
  const agent = res.data;

  return {
    title: agent.title,
    icon: agent.coverimage,
    images: [agent.coverimage],
    description: agent.description,
    openGraph: {
        title: agent.title,
        description: agent.description,
        images: [agent.coverimage],
      },
  };
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased h-full`}
      >
        {children}
      </body>
    </html>
  );
}
