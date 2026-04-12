"use client";

import { useActionState } from "react";
import { createBillTemplate } from "./actions";
import { initialFormState } from "./form-state";

export default function CreateBillTemplateForm() {
  const [state, formAction, isPending] = useActionState(
    createBillTemplate,
    initialFormState
  );

  return (
    <form
      action={formAction}
      className="mt-6 rounded-lg border border-gray-200 bg-white p-4"
    >
      <h2 className="text-base font-medium text-gray-900">Add a template</h2>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <label
            htmlFor="name"
            className="block text-xs font-medium text-gray-700"
          >
            Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            placeholder="e.g. Claro"
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-500 focus:outline-none"
          />
        </div>
        <div>
          <label
            htmlFor="default_amount"
            className="block text-xs font-medium text-gray-700"
          >
            Default amount (BRL)
          </label>
          <input
            id="default_amount"
            name="default_amount"
            type="number"
            min="0"
            step="0.01"
            required
            placeholder="0.00"
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-500 focus:outline-none"
          />
        </div>
        <div>
          <label
            htmlFor="due_day"
            className="block text-xs font-medium text-gray-700"
          >
            Due day (optional)
          </label>
          <input
            id="due_day"
            name="due_day"
            type="number"
            min="1"
            max="31"
            placeholder="1–31"
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-500 focus:outline-none"
          />
        </div>
      </div>

      {state.error && (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}

      <div className="mt-4 flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {isPending ? "Adding…" : "Add template"}
        </button>
      </div>
    </form>
  );
}
