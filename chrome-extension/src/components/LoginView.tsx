import { useState, type FormEvent } from "react";
import {
  CONNECT_EXTENSION_URL,
  connectWithCode,
  login,
} from "../lib/api";
import { Header } from "./Header";
import { Alert, AlertDescription } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

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
    <div className="view p-4">
      <Card>
        <CardHeader className="pb-4">
          <Header subtitle />
          <CardTitle className="text-base">Connect Session</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            type="button"
            variant="outline"
            onClick={openConnectPage}
            disabled={isBusy}
            className="w-full"
          >
            Open Connect Extension Page
          </Button>

          <form onSubmit={handleCodeSubmit} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="connect-code">One-time code</Label>
              <Input
                type="text"
                id="connect-code"
                name="connect-code"
                required
                placeholder="ABCD-EFGH"
                value={connectCode}
                onChange={(e) => setConnectCode(e.target.value.toUpperCase())}
              />
            </div>
            {codeError && (
              <Alert variant="destructive">
                <AlertDescription>{codeError}</AlertDescription>
              </Alert>
            )}
            <Button type="submit" disabled={isBusy} className="w-full">
              {isCodeSubmitting ? "Connecting..." : "Connect with code"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
