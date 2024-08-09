import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v13-appRouter";
import "./globals.css";
import { Provider } from "jotai";
import { getStore } from "@/store";
import { useRef } from "react";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Pomo",
  description: "Anthropomorphize anything",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const storeRef = useRef<any>();
  if (!storeRef.current) {
    storeRef.current = getStore();
  }

  return (
    <html lang="en">
      <body className={inter.className}>
        <Provider store={storeRef.current}>
          <AppRouterCacheProvider>{children}</AppRouterCacheProvider>
        </Provider>
      </body>
    </html>
  );
}
