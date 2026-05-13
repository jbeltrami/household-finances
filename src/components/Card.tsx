type Props = {
  children: React.ReactNode;
  className?: string;
};

// Visual surface used throughout the redesigned UI. Rounded panel with
// a subtle border on a slightly-lighter background — the building
// block of every section on the monthly view, bills page, etc.
export default function Card({ children, className = "" }: Props) {
  return (
    <div
      className={`rounded-2xl border border-subtle bg-surface ${className}`}
    >
      {children}
    </div>
  );
}
