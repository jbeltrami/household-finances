"use client";

import { useTransition } from "react";
import { acceptInvitation, declineInvitation } from "./actions";

type PendingInvite = {
  id: string;
  spaceName: string;
  spaceId: string;
};

type Props = {
  invitations: PendingInvite[];
};

export default function InvitationBannerClient({ invitations }: Props) {
  const [isPending, startTransition] = useTransition();

  if (invitations.length === 0) return null;

  const handleAccept = (invitationId: string, spaceId: string) => {
    startTransition(async () => {
      await acceptInvitation(invitationId, spaceId, new FormData());
    });
  };

  const handleDecline = (invitationId: string) => {
    startTransition(async () => {
      await declineInvitation(invitationId, new FormData());
    });
  };

  return (
    <div className="border-b border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-800 dark:bg-blue-950">
      <div className="mx-auto max-w-5xl space-y-2">
        {invitations.map((inv) => (
          <div
            key={inv.id}
            className="flex items-center justify-between gap-4"
          >
            <p className="text-sm text-blue-900 dark:text-blue-100">
              You&rsquo;ve been invited to join{" "}
              <span className="font-semibold">{inv.spaceName}</span>
            </p>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => handleAccept(inv.id, inv.spaceId)}
                disabled={isPending}
                className="rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
              >
                Accept
              </button>
              <button
                type="button"
                onClick={() => handleDecline(inv.id)}
                disabled={isPending}
                className="rounded-md border border-blue-300 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50 dark:border-blue-700 dark:text-blue-300 dark:hover:bg-blue-900"
              >
                Decline
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
