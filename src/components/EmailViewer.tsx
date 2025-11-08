'use client';

interface EmailViewerProps {
  subject: string;
  from: string;
  body_html: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export default function EmailViewer({
  subject,
  from,
  body_html,
  difficulty,
}: EmailViewerProps) {
  const difficultyColors = {
    easy: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    hard: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  };

  return (
    <div className="rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
      <div className="border-b border-zinc-200 p-4 dark:border-zinc-800">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex-1">
            <div className="mb-1">
              <span className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">
                From:{' '}
              </span>
              <span className="text-zinc-900 dark:text-zinc-50">{from}</span>
            </div>
            <div>
              <span className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">
                Subject:{' '}
              </span>
              <span className="text-zinc-900 dark:text-zinc-50">{subject}</span>
            </div>
          </div>
          <span
            className={`ml-4 rounded-full px-3 py-1 text-xs font-semibold uppercase ${difficultyColors[difficulty]}`}
          >
            {difficulty}
          </span>
        </div>
      </div>
      <div className="p-6">
        <div
          className="whitespace-pre-wrap text-zinc-900 dark:text-zinc-50"
          dangerouslySetInnerHTML={{ __html: body_html }}
        />
      </div>
    </div>
  );
}

