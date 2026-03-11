import { useState, type FormEvent } from "react";
import {
  CONNECT_EXTENSION_URL,
  connectWithCode,
  login,
} from "../lib/api";
import { Header } from "./Header";

interface LoginViewProps {
  onLoginSuccess: (email: string) => void;
}

export function LoginView({ onLoginSuccess }: LoginViewProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [connectCode, setConnectCode] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [isPasswordSubmitting, setIsPasswordSubmitting] = useState(false);
  const [isCodeSubmitting, setIsCodeSubmitting] = useState(false);

  async function handlePasswordSubmit(e: FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    setCodeError(null);
    setIsPasswordSubmitting(true);

    try {
      await login(email.trim(), password);
      onLoginSuccess(email.trim());
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setIsPasswordSubmitting(false);
    }
  }

  async function handleCodeSubmit(e: FormEvent) {
    e.preventDefault();
    setCodeError(null);
    setPasswordError(null);
    setIsCodeSubmitting(true);

    try {
      const userEmail = await connectWithCode(connectCode);
      onLoginSuccess(userEmail);
    } catch (err) {
      setCodeError(err instanceof Error ? err.message : "Code connect failed.");
    } finally {
      setIsCodeSubmitting(false);
    }
  }

  function openConnectPage() {
    chrome.tabs.create({ url: CONNECT_EXTENSION_URL });
  }

  const isBusy = isPasswordSubmitting || isCodeSubmitting;

  return (
    <div className="view">
      <Header subtitle />
      <button
        type="button"
        className="secondary-btn"
        onClick={openConnectPage}
        disabled={isBusy}
      >
        Open Connect Extension Page
      </button>

      <form onSubmit={handleCodeSubmit}>
        <label htmlFor="connect-code">One-time code</label>
        <input
          type="text"
          id="connect-code"
          name="connect-code"
          required
          placeholder="ABCD-EFGH"
          value={connectCode}
          onChange={(e) => setConnectCode(e.target.value.toUpperCase())}
        />
        {codeError && <p className="error">{codeError}</p>}
        <button type="submit" disabled={isBusy}>
          {isCodeSubmitting ? "Connecting..." : "Connect with code"}
        </button>
      </form>
    </div>
  );
}
