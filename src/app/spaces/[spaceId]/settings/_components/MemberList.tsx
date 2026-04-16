type Member = {
  userId: string;
  displayName: string;
  role: string;
};

type Props = {
  members: Member[];
};

export default function MemberList({ members }: Props) {
  if (members.length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        No members yet.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-800">
      {members.map((m) => (
        <li
          key={m.userId}
          className="flex items-center justify-between px-4 py-3"
        >
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {m.displayName}
          </span>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-400">
            {m.role}
          </span>
        </li>
      ))}
    </ul>
  );
}
