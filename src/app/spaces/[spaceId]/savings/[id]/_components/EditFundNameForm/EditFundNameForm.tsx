"use client";

import { useState, useTransition } from "react";
import { updateSavingsFund } from "../../../actions";

type Props = {
  fundId: string;
  currentName: string;
};

// Inline rename form. Starts in display mode (shows the name + Edit
// button); opens an input on Edit. Uses useTransition instead of
// useActionState so the success branch can close the editor in the
// same callback — no setState-in-effect.
export default function EditFundNameForm({ fundId, currentName }: Props) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      const result = await updateSavingsFund(fundId, { error: null }, formData);
      if (result.error) {
        setError(result.error);
      } else {
        setError(null);
        setEditing(false);
      }
    });
  };

  if (!editing) {
    return (
      <div className="flex items-baseline gap-3">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
          {currentName}
        </h1>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-xs font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
        >
          Edit
        </button>
      </div>
    );
  }

  return (
    <form action={handleSubmit} className="flex items-center gap-2">
      <input
        type="text"
        name="name"
        required
        defaultValue={currentName}
        autoFocus
        className="w-full max-w-xs rounded-md border border-gray-300 bg-white px-3 py-1.5 text-base text-gray-900 focus:border-gray-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
      />
      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800 disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
      >
        {isPending ? "Saving…" : "Save"}
      </button>
      <button
        type="button"
        onClick={() => {
          setEditing(false);
          setError(null);
        }}
        disabled={isPending}
        className="rounded-md px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-50 dark:text-gray-400 dark:hover:bg-gray-700"
      >
        Cancel
      </button>
      {error && (
        <span className="text-xs text-red-600 dark:text-red-400" role="alert">
          {error}
        </span>
      )}
    </form>
  );
}
