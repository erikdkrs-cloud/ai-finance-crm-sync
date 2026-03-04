// pages/_app.js
import "../styles/globals.css";
import "../styles/dkrs-theme.css";

export default function App({ Component, pageProps }) {
  return <Component {...pageProps} />;
}
