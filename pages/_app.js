import "../styles/globals.css";
import "../styles/dkrs-theme.css";
import AuthProvider from "../components/AuthProvider";

export default function App({ Component, pageProps }) {
  return (
    <AuthProvider>
      <Component {...pageProps} />
    </AuthProvider>
  );
}
