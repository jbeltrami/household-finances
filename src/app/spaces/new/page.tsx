"use client";

import { useActionState } from "react";
import Link from "next/link";
import { createSharedSpace } from "./action";

const initialState = { error: null as string | null };

export default function NewSharedSpacePage() {
  const [state, formAction, isPending] = useActionState(
    createSharedSpace,
    initialState
  );

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <Link
        href="/"
        className="text-xs font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
      >
        ← Back
      </Link>

      <h1 className="mt-4 text-2xl font-semibold text-gray-900 dark:text-gray-100">
        Create a shared space
      </h1>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
        A shared space lets you track joint finances with someone
        else — a partner, roommate, or anyone you split costs with.
        You can invite people after creating it.
      </p>

      <form
        action={formAction}
        className="mt-6 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
      >
        <label
          htmlFor="name"
          className="block text-xs font-medium text-gray-700 dark:text-gray-300"
        >
          Space name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          placeholder="e.g. Apartment, Family budget"
          className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-gray-500"
        />

        {state.error && (
          <p
            className="mt-3 text-sm text-red-600 dark:text-red-400"
            role="alert"
          >
            {state.error}
          </p>
        )}

        <div className="mt-4 flex justify-end">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
          >
            {isPending ? "Creating…" : "Create space"}
          </button>
        </div>
      </form>
    </div>
  );
}
