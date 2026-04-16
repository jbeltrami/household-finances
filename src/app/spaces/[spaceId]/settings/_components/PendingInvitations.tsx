"use client";

import { useTransition } from "react";
import { revokeInvitation } from "../actions";

type Invitation = {
  id: string;
  email: string;
};

type Props = {
  invitations: Invitation[];
};

export default function PendingInvitations({ invitations }: Props) {
  const [isPending, startTransition] = useTransition();

  if (invitations.length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        No pending invitations.
      </p>
    );
  }

  const handleRevoke = (invitationId: string) => {
    startTransition(async () => {
      await revokeInvitation(invitationId, new FormData());
    });
  };

  return (
    <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-800">
      {invitations.map((inv) => (
        <li
          key={inv.id}
          className="flex items-center justify-between px-4 py-3"
        >
          <span className="text-sm text-gray-900 dark:text-gray-100">
            {inv.email}
          </span>
          <button
            type="button"
            onClick={() => handleRevoke(inv.id)}
            disabled={isPending}
            className="text-xs font-medium text-red-600 hover:text-red-800 disabled:opacity-50 dark:text-red-400 dark:hover:text-red-300"
          >
            Revoke
          </button>
        </li>
      ))}
    </ul>
  );
}
