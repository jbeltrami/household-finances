import type { CategoryRow } from "@/helpers/taxonomy";

type Props = {
  // Active Categorias of the relevant direction. Deactivated ones are
  // deliberately absent: retiring a Categoria must stop it being chosen
  // for anything new.
  categories: CategoryRow[];
  // The Categoria currently on the record being edited, if any. Needed
  // separately from `categories` because it may have been deactivated
  // since it was assigned — see below.
  current?: { id: string; name: string } | null;
  name?: string;
  id?: string;
  // Optional, for the save-on-change case. Left off, this stays an
  // uncontrolled field that a plain <form> submission picks up.
  onChange?: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  disabled?: boolean;
};

// The Categoria dropdown, shared by every form that assigns one.
//
// The non-obvious part is `current`. A deactivated Categoria is not in the
// active list, so a form whose <select> only renders that list would have a
// defaultValue matching no option — browsers then select the first one
// ("Sem categoria"), and the next save silently strips a Categoria the user
// never touched. Rendering the current value as an extra, clearly-labelled
// option keeps the edit non-destructive while still refusing to offer
// deactivated Categorias for anything new.
export default function CategorySelect({
  categories,
  current = null,
  name = "category_id",
  id,
  onChange,
  disabled = false,
}: Props) {
  const currentIsRetired =
    current != null && !categories.some((c) => c.id === current.id);

  return (
    <select
      id={id}
      name={name}
      defaultValue={current?.id ?? ""}
      onChange={onChange}
      disabled={disabled}
      className="field-input"
    >
      <option value="">Sem categoria</option>
      {categories.map((category) => (
        <option key={category.id} value={category.id}>
          {category.name}
        </option>
      ))}
      {currentIsRetired && (
        <option value={current.id}>{current.name} (desativada)</option>
      )}
    </select>
  );
}
