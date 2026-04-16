"use client";

import { useActionState } from "react";
import { inviteMember } from "../actions";

type Props = {
  spaceId: string;
};

const initialState = { error: null as string | null };

export default function InviteMemberForm({ spaceId }: Props) {
  const boundAction = inviteMember.bind(null, spaceId);
  const [state, formAction, isPending] = useActionState(
    boundAction,
    initialState
  );

  return (
    <form action={formAction} className="flex items-end gap-3">
      <div className="flex-1">
        <label
          htmlFor="email"
          className="block text-xs font-medium text-gray-700 dark:text-gray-300"
        >
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          placeholder="someone@example.com"
          className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-gray-500"
        />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
      >
        {isPending ? "Inviting…" : "Invite"}
      </button>
      {state.error && (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {state.error}
        </p>
      )}
    </form>
  );
}
