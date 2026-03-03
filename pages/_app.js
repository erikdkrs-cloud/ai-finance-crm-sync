// pages/_app.js
import "../styles/globals.css";
import "../styles/dkrs-theme.css";
import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export default function App({ Component, pageProps }) {
  return (
    <div className={`${inter.className} dkrs-root dkrs-bg`}>
      <Component {...pageProps} />
    </div>
  );
}
