// pages/_app.js
import "@/styles/globals.css";
import "@/styles/dkrs-theme.css";
import { Sora } from "next/font/google";

const sora = Sora({
  subsets: ["latin", "cyrillic"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export default function App({ Component, pageProps }) {
  return (
    <div className={sora.className}>
      <Component {...pageProps} />
    </div>
  );
}
