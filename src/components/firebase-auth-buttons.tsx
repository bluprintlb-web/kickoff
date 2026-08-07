"use client";

import * as CountryFlags from "country-flag-icons/react/3x2";
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signInWithPopup,
  type ConfirmationResult,
} from "firebase/auth";
import type { SVGProps } from "react";
import { useMemo, useRef, useState, useTransition } from "react";
import { firebaseLogin } from "@/app/actions/auth";
import { GoogleIcon } from "@/components/google-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { dictionaries, Locale } from "@/lib/i18n/dictionaries";
import { firebaseAuth, googleProvider } from "@/lib/firebase/client";
import {
  DEFAULT_PHONE_COUNTRY_ISO2,
  getPhoneCountries,
} from "@/lib/phone-countries";
import { cn } from "@/lib/utils";

type Dict = (typeof dictionaries)["en"]["firebaseAuth"];

// Real SVG flags, not emoji — Windows/Chrome render the regional-indicator
// emoji pair as plain two-letter text instead of a colored flag, so emoji
// isn't a reliable option here. `country-flag-icons` exports one named
// component per ISO2 code; looked up dynamically since the country list is
// data, not a fixed set of literal imports.
const flagComponents = CountryFlags as unknown as Record<
  string,
  React.ComponentType<SVGProps<SVGSVGElement>>
>;

function CountryFlag({ iso2, className }: { iso2: string; className?: string }) {
  const Flag = flagComponents[iso2];
  if (!Flag) return null;
  return <Flag className={cn("h-3.5 w-5 shrink-0 rounded-[2px]", className)} />;
}

// Phone sign-in goes through two steps (send code, then verify it) — this
// tracks which one is showing.
type Phase = "phone" | "code";

export function FirebaseAuthButtons({
  dict,
  locale,
}: {
  dict: Dict;
  locale: Locale;
}) {
  const countries = useMemo(() => getPhoneCountries(locale), [locale]);
  const [phase, setPhase] = useState<Phase>("phone");
  const [countryIso2, setCountryIso2] = useState(DEFAULT_PHONE_COUNTRY_ISO2);
  const [localNumber, setLocalNumber] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<"google" | "phone" | "verify" | null>(
    null
  );
  // Next.js only handles a Server Action's redirect-via-throw (see
  // firebaseLogin) when the action is invoked from a form or from an event
  // handler wrapped in startTransition — a bare `await` in a click handler
  // isn't a supported invocation path (confirmed against this Next version's
  // own bundled docs, node_modules/next/dist/docs/.../server-actions.md, per
  // AGENTS.md). isRedirecting stays true through the actual navigation, so
  // buttons don't briefly re-enable in the gap between the Firebase step
  // finishing and the redirect landing.
  const [isRedirecting, startTransition] = useTransition();
  const confirmationRef = useRef<ConfirmationResult | null>(null);
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null);
  const busy = pending !== null || isRedirecting;
  const selectedCountry =
    countries.find((c) => c.iso2 === countryIso2) ?? countries[0];

  // Hands a verified Firebase ID token to the server, which mints (or
  // reuses) a real site session for it — see firebaseLogin in
  // src/app/actions/auth.ts. That call throws on success (Next.js's
  // redirect signal); anything that returns normally is a real error.
  function completeSignIn(idToken: string) {
    startTransition(async () => {
      const result = await firebaseLogin(idToken);
      if (result?.error) {
        setError(result.error);
      }
    });
  }

  async function handleGoogle() {
    setError(null);
    setPending("google");
    try {
      const credential = await signInWithPopup(firebaseAuth, googleProvider);
      const idToken = await credential.user.getIdToken();
      completeSignIn(idToken);
    } catch {
      setError(dict.genericError);
    } finally {
      setPending(null);
    }
  }

  function getRecaptchaVerifier() {
    if (!recaptchaRef.current) {
      recaptchaRef.current = new RecaptchaVerifier(
        firebaseAuth,
        "firebase-recaptcha-container",
        { size: "invisible" }
      );
    }
    return recaptchaRef.current;
  }

  async function handleSendCode() {
    setError(null);
    const digits = localNumber.replace(/\D/g, "");
    if (!digits) {
      setError(dict.invalidPhone);
      return;
    }
    const e164 = `+${selectedCountry.dialCode}${digits}`;
    setPending("phone");
    try {
      const verifier = getRecaptchaVerifier();
      confirmationRef.current = await signInWithPhoneNumber(
        firebaseAuth,
        e164,
        verifier
      );
      setPhase("code");
    } catch {
      setError(dict.invalidPhone);
      // A failed send leaves the widget in a bad state — drop it so the
      // next attempt renders a fresh one instead of reusing a dead verifier.
      recaptchaRef.current?.clear();
      recaptchaRef.current = null;
    } finally {
      setPending(null);
    }
  }

  async function handleVerifyCode() {
    setError(null);
    if (!confirmationRef.current) {
      setError(dict.genericError);
      return;
    }
    setPending("verify");
    try {
      const credential = await confirmationRef.current.confirm(code.trim());
      const idToken = await credential.user.getIdToken();
      completeSignIn(idToken);
    } catch {
      setError(dict.invalidCode);
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">
          {dict.orContinueWith}
        </span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <Button
        type="button"
        variant="outline"
        size="lg"
        onClick={handleGoogle}
        disabled={busy}
      >
        <GoogleIcon className="size-4" />
        {dict.continueWithGoogle}
      </Button>

      <div className="flex flex-col gap-2">
        {phase === "phone" ? (
          <>
            <Label htmlFor="firebase-phone">{dict.phoneNumber}</Label>
            <div className="flex gap-2">
              <Select
                value={countryIso2}
                onValueChange={(value) => value && setCountryIso2(value)}
              >
                <SelectTrigger className="w-[110px] shrink-0" disabled={busy}>
                  <SelectValue>
                    {() => (
                      <span className="flex items-center gap-1.5">
                        <CountryFlag iso2={selectedCountry.iso2} />
                        {`+${selectedCountry.dialCode}`}
                      </span>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {countries.map((c) => (
                    <SelectItem key={c.iso2} value={c.iso2}>
                      <span className="flex items-center gap-2">
                        <CountryFlag iso2={c.iso2} />
                        {c.name} (+{c.dialCode})
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                id="firebase-phone"
                type="tel"
                dir="ltr"
                inputMode="numeric"
                placeholder="3 123 456"
                value={localNumber}
                onChange={(e) => setLocalNumber(e.target.value)}
                disabled={busy}
                className="flex-1"
              />
            </div>
            <p className="text-xs text-muted-foreground">{dict.phoneNumberHint}</p>
            <Button
              type="button"
              variant="outline"
              onClick={handleSendCode}
              disabled={busy || !localNumber.trim()}
            >
              {pending === "phone" ? dict.sendingCode : dict.sendCode}
            </Button>
          </>
        ) : (
          <>
            <Label htmlFor="firebase-otp">{dict.verificationCode}</Label>
            <Input
              id="firebase-otp"
              type="text"
              dir="ltr"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              disabled={busy}
            />
            <p className="text-xs text-muted-foreground">
              {dict.verificationCodeHint}
            </p>
            <Button
              type="button"
              onClick={handleVerifyCode}
              disabled={busy || !code.trim()}
            >
              {pending === "verify" ? dict.verifying : dict.verify}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setPhase("phone");
                setCode("");
                setError(null);
              }}
              disabled={busy}
            >
              {dict.changeNumber}
            </Button>
          </>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Invisible reCAPTCHA mounts here — never visibly rendered, just
          needs a real DOM node present before signInWithPhoneNumber runs. */}
      <div id="firebase-recaptcha-container" />
    </div>
  );
}
