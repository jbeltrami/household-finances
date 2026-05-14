"use client";

import { useState, useTransition } from "react";
import { Info } from "lucide-react";
import Card from "@/components/Card";
import {
  saveWhatsAppPhone,
  setWhatsAppEnabled,
  sendWhatsAppTestMessage,
} from "../actions";

type Props = {
  initialPhone: string | null;
  initialEnabled: boolean;
};

export default function WhatsAppNotificationToggle({
  initialPhone,
  initialEnabled,
}: Props) {
  // Last value the server confirmed. The toggle and test button
  // both depend on this — typing in the input doesn't unlock them
  // until the user hits "Save phone" and the action returns ok.
  const [savedPhone, setSavedPhone] = useState<string | null>(initialPhone);
  const [phoneInput, setPhoneInput] = useState(initialPhone ?? "");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [savePending, startSave] = useTransition();

  const [enabled, setEnabled] = useState(initialEnabled);
  const [togglePending, startToggle] = useTransition();
  const [toggleError, setToggleError] = useState<string | null>(null);

  const [testPending, startTest] = useTransition();
  const [testResult, setTestResult] = useState<
    { kind: "ok" } | { kind: "error"; message: string } | null
  >(null);

  const phoneIsValid = savedPhone !== null;

  const handleSavePhone = (formData: FormData) => {
    setPhoneError(null);
    startSave(async () => {
      const result = await saveWhatsAppPhone(formData);
      if (result.error || !result.phone) {
        setPhoneError(result.error ?? "Falha ao salvar");
        return;
      }
      setSavedPhone(result.phone);
      setPhoneInput(result.phone);
    });
  };

  const handleToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.checked;
    setToggleError(null);
    setEnabled(newValue);
    startToggle(async () => {
      try {
        await setWhatsAppEnabled(newValue);
      } catch (err) {
        setEnabled(!newValue);
        setToggleError(err instanceof Error ? err.message : "Falha ao atualizar");
      }
    });
  };

  const handleTest = () => {
    setTestResult(null);
    startTest(async () => {
      const result = await sendWhatsAppTestMessage();
      if (result.ok) {
        setTestResult({ kind: "ok" });
      } else {
        setTestResult({
          kind: "error",
          message: result.error ?? "Falha ao enviar",
        });
      }
    });
  };

  return (
    <Card className="p-5">
      <h2 className="text-base font-medium text-fg">
        Notificações por WhatsApp
      </h2>

      <form action={handleSavePhone} className="mt-4">
        <label htmlFor="whatsapp-phone" className="field-label">
          Número de telefone
        </label>
        <div className="mt-1 flex gap-2">
          <input
            id="whatsapp-phone"
            name="phone"
            type="tel"
            inputMode="tel"
            placeholder="+5511987654321"
            value={phoneInput}
            onChange={(e) => setPhoneInput(e.target.value)}
            className="field-input mt-0 flex-1"
          />
          <button
            type="submit"
            disabled={savePending || phoneInput.trim() === ""}
            className="btn-primary"
          >
            {savePending ? "Salvando…" : "Salvar"}
          </button>
        </div>
        <p className="mt-1 text-xs text-muted">
          Formato internacional com código do país, ex.:{" "}
          <code>+5511987654321</code>.
        </p>
        {phoneError && (
          <p className="mt-2 text-xs text-danger" role="alert">
            {phoneError}
          </p>
        )}
      </form>

      <label className="mt-6 flex cursor-pointer items-start justify-between gap-4">
        <div>
          <div className="text-sm font-medium text-fg">
            Avisar pelo WhatsApp quando uma conta vencer
          </div>
          <div className="mt-1 text-xs text-muted">
            {phoneIsValid
              ? "Uma verificação diária às 08:00 (São Paulo) envia uma mensagem por conta vencida."
              : "Salve um número de telefone acima para ativar os avisos."}
          </div>
        </div>
        <input
          type="checkbox"
          checked={enabled}
          onChange={handleToggle}
          disabled={togglePending || !phoneIsValid}
          className="mt-0.5 h-4 w-4 rounded border-subtle accent-[--color-accent] disabled:opacity-50"
        />
      </label>
      {toggleError && (
        <p className="mt-2 text-xs text-danger" role="alert">
          {toggleError}
        </p>
      )}

      <div className="mt-6">
        <button
          type="button"
          onClick={handleTest}
          disabled={testPending || !phoneIsValid}
          className="rounded-lg border border-subtle px-3 py-2 text-sm font-medium text-fg transition-colors hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {testPending ? "Enviando…" : "Enviar mensagem de teste"}
        </button>
        {testResult?.kind === "ok" && (
          <p className="mt-2 text-xs text-accent">Enviado. Confira no WhatsApp.</p>
        )}
        {testResult?.kind === "error" && (
          <p className="mt-2 text-xs text-danger" role="alert">
            {testResult.message}
          </p>
        )}
      </div>

      <div className="mt-6 flex items-start gap-3 rounded-xl border border-warn/40 bg-warn/10 p-3 text-xs text-fg">
        <Info className="h-4 w-4 shrink-0 text-warn" strokeWidth={2} />
        <div>
          <strong className="text-fg">Modo sandbox:</strong> na primeira vez,
          envie{" "}
          <code className="rounded bg-surface-2 px-1 py-0.5 text-fg">
            join &lt;seu-código&gt;
          </code>{" "}
          como mensagem de WhatsApp para{" "}
          <code className="rounded bg-surface-2 px-1 py-0.5 text-fg">
            +1 415 523 8886
          </code>{" "}
          a partir deste número. Encontre seu código no console da Twilio em
          Messaging → Try it out → WhatsApp.
        </div>
      </div>
    </Card>
  );
}
