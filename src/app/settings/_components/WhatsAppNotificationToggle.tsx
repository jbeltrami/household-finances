"use client";

import { useState, useTransition } from "react";
import {
  saveWhatsAppPhone,
  setWhatsAppEnabled,
  sendWhatsAppTestMessage,
} from "../actions";

type Props = {
  spaceId: string;
  initialPhone: string | null;
  initialEnabled: boolean;
};

export default function WhatsAppNotificationToggle({
  spaceId,
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
      const result = await saveWhatsAppPhone(spaceId, formData);
      if (result.error || !result.phone) {
        setPhoneError(result.error ?? "Failed to save");
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
        await setWhatsAppEnabled(spaceId, newValue);
      } catch (err) {
        setEnabled(!newValue);
        setToggleError(err instanceof Error ? err.message : "Failed to update");
      }
    });
  };

  const handleTest = () => {
    setTestResult(null);
    startTest(async () => {
      const result = await sendWhatsAppTestMessage(spaceId);
      if (result.ok) {
        setTestResult({ kind: "ok" });
      } else {
        setTestResult({
          kind: "error",
          message: result.error ?? "Failed to send",
        });
      }
    });
  };

  return (
    <div className="space-y-4">
      <form action={handleSavePhone} className="space-y-2">
        <label
          htmlFor="whatsapp-phone"
          className="block text-sm font-medium text-gray-900 dark:text-gray-100"
        >
          Número de telefone
        </label>
        <div className="flex gap-2">
          <input
            id="whatsapp-phone"
            name="phone"
            type="tel"
            inputMode="tel"
            placeholder="+5511987654321"
            value={phoneInput}
            onChange={(e) => setPhoneInput(e.target.value)}
            className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          />
          <button
            type="submit"
            disabled={savePending || phoneInput.trim() === ""}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {savePending ? "Salvando…" : "Salvar telefone"}
          </button>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Formato internacional com código do país, ex.: <code>+5511987654321</code>.
        </p>
        {phoneError && (
          <p className="text-xs text-red-600 dark:text-red-400">{phoneError}</p>
        )}
      </form>

      <label className="flex cursor-pointer items-start justify-between gap-4">
        <div>
          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Avisar pelo WhatsApp quando uma conta vencer
          </div>
          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
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
          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
        />
      </label>
      {toggleError && (
        <p className="text-xs text-red-600 dark:text-red-400">{toggleError}</p>
      )}

      <div>
        <button
          type="button"
          onClick={handleTest}
          disabled={testPending || !phoneIsValid}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
        >
          {testPending ? "Enviando…" : "Enviar mensagem de teste"}
        </button>
        {testResult?.kind === "ok" && (
          <p className="mt-2 text-xs text-green-700 dark:text-green-400">
            Enviado. Confira no WhatsApp.
          </p>
        )}
        {testResult?.kind === "error" && (
          <p className="mt-2 text-xs text-red-600 dark:text-red-400">
            {testResult.message}
          </p>
        )}
      </div>

      <div className="rounded-md bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
        <strong>Modo sandbox:</strong> na primeira vez, envie{" "}
        <code className="rounded bg-amber-100 px-1 py-0.5 dark:bg-amber-900/40">
          join &lt;seu-código&gt;
        </code>{" "}
        como mensagem de WhatsApp para{" "}
        <code className="rounded bg-amber-100 px-1 py-0.5 dark:bg-amber-900/40">
          +1 415 523 8886
        </code>{" "}
        a partir deste número. Encontre seu código no console da Twilio em
        Messaging → Try it out → WhatsApp.
      </div>
    </div>
  );
}
