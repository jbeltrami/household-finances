"use client";

import { useActionState } from "react";
import Link from "next/link";
import { updateBillTemplate } from "../../actions";
import { initialFormState } from "../../form-state";

type Template = {
  id: string;
  name: string;
  default_amount: number | string;
  due_day: number | null;
};

export default function EditBillTemplateForm({
  template,
}: {
  template: Template;
}) {
  // Bind the template id so the server action's signature matches what
  // useActionState expects: (prevState, formData) => newState.
  const boundAction = updateBillTemplate.bind(null, template.id);
  const [state, formAction, isPending] = useActionState(
    boundAction,
    initialFormState
  );

  return (
    <form
      action={formAction}
      className="mt-6 rounded-lg border border-gray-200 bg-white p-4"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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
            defaultValue={template.name}
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
            defaultValue={template.default_amount}
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
            defaultValue={template.due_day ?? ""}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-500 focus:outline-none"
          />
        </div>
      </div>

      <label className="mt-4 flex items-start gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          name="cascade"
          defaultChecked
          className="mt-0.5"
        />
        <span>
          Apply amount change to unpaid bill instances in the current and
          future months. Past months are left untouched.
        </span>
      </label>

      {state.error && (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}

      <div className="mt-4 flex justify-end gap-2">
        <Link
          href="/bills"
          className="rounded-md px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {isPending ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}
