"use client";

import { useActionState } from "react";
import Card from "@/components/Card";
import { renameSpace } from "../actions";

type Props = {
  spaceId: string;
  currentName: string;
};

const initialState = { error: null as string | null };

export default function RenameSpaceForm({ spaceId, currentName }: Props) {
  const boundAction = renameSpace.bind(null, spaceId);
  const [state, formAction, isPending] = useActionState(
    boundAction,
    initialState
  );

  return (
    <Card className="p-5">
      <h2 className="text-base font-medium text-fg">Nome do espaço</h2>
      <form action={formAction} className="mt-4 flex items-end gap-3">
        <div className="flex-1">
          <label htmlFor="name" className="field-label">
            Nome
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            defaultValue={currentName}
            className="field-input"
          />
        </div>
        <button type="submit" disabled={isPending} className="btn-primary">
          {isPending ? "Salvando…" : "Renomear"}
        </button>
      </form>
      {state.error && (
        <p className="mt-2 text-sm text-danger" role="alert">
          {state.error}
        </p>
      )}
    </Card>
  );
}
