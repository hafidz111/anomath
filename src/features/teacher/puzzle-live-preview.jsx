/**
 * Pratinjau siswa di sidebar Case Builder — berubah sesuai Puzzle Type.
 */
export function PuzzleLivePreview({ puzzleType, question, answers }) {
  const q = question?.trim() || '—';
  const opts = Array.isArray(answers) ? answers : [];

  const baseCard = 'rounded-2xl border border-gray-200 bg-white p-6';

  if (!puzzleType) {
    return (
      <div className={baseCard}>
        <p className='text-sm text-gray-600'>
          Di daftar puzzle, ketuk <span className='font-medium text-gray-800'>Tambah puzzle</span>{' '}
          atau edit — pratinjau di sini mengikuti tipe dan isian form.
        </p>
      </div>
    );
  }

  if (puzzleType === 'True/False') {
    const a = opts[0]?.text?.trim() || 'Benar';
    const b = opts[1]?.text?.trim() || 'Salah';
    return (
      <div className={baseCard}>
        <p className='mb-2 text-sm text-gray-600'>True / False</p>
        <p className='mb-6 text-lg font-bold text-gray-900'>{q}</p>
        <div className='grid grid-cols-2 gap-3'>
          {[a, b].map((label, i) => (
            <div
              key={i}
              className={`rounded-xl border-2 py-4 text-center font-semibold ${
                opts[i]?.correct
                  ? 'border-green-400 bg-green-50 text-green-800'
                  : 'border-gray-200 bg-gray-50 text-gray-700'
              }`}
            >
              {label || (i === 0 ? 'Benar' : 'Salah')}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (puzzleType === 'Fill in the Blank') {
    return (
      <div className={baseCard}>
        <p className='mb-2 text-sm text-gray-600'>Isian</p>
        <p className='mb-6 text-lg font-bold leading-relaxed text-gray-900'>
          {q.includes('___') ? q : `${q} `}
          {!q.includes('___') ? (
            <span className='inline-block min-w-[5rem] border-b-2 border-dashed border-purple-400 align-bottom'>
              &nbsp;
            </span>
          ) : null}
        </p>
        {opts.find((x) => x.correct)?.text ? (
          <p className='text-xs text-gray-500'>
            Kunci (hanya guru):{' '}
            <span className='font-mono font-medium text-gray-700'>
              {opts.find((x) => x.correct)?.text}
            </span>
          </p>
        ) : null}
      </div>
    );
  }

  if (puzzleType === 'Matching') {
    const left = opts.filter((_, i) => i % 2 === 0);
    const right = opts.filter((_, i) => i % 2 === 1);
    return (
      <div className={baseCard}>
        <p className='mb-2 text-sm text-gray-600'>Matching</p>
        <p className='mb-4 text-lg font-bold text-gray-900'>{q}</p>
        <div className='grid grid-cols-2 gap-2 text-sm'>
          <div className='space-y-2'>
            {(left.length ? left : opts).slice(0, 4).map((o, i) => (
              <div
                key={`l-${i}`}
                className='rounded-lg border border-gray-200 bg-gray-50 px-2 py-2 text-center'
              >
                {o.text?.trim() || '—'}
              </div>
            ))}
          </div>
          <div className='space-y-2'>
            {(right.length ? right : opts).slice(0, 4).map((o, i) => (
              <div
                key={`r-${i}`}
                className='rounded-lg border border-dashed border-purple-200 bg-purple-50/50 px-2 py-2 text-center text-purple-900'
              >
                {o.text?.trim() || '—'}
              </div>
            ))}
          </div>
        </div>
        <p className='mt-3 text-xs text-gray-500'>Siswa menghubungkan pasangan (pratinjau layout).</p>
      </div>
    );
  }

  if (puzzleType === 'Ordering') {
    const ordered = [...opts].filter((o) => o.text?.trim());
    return (
      <div className={baseCard}>
        <p className='mb-2 text-sm text-gray-600'>Urutan</p>
        <p className='mb-4 text-lg font-bold text-gray-900'>{q}</p>
        <ol className='list-decimal space-y-2 pl-5 text-sm font-medium text-gray-800'>
          {(ordered.length ? ordered : [{ text: '—' }, { text: '—' }]).map((o, i) => (
            <li key={i} className='rounded-lg border border-gray-100 bg-gray-50 px-2 py-1.5'>
              {o.text?.trim() || '—'}
            </li>
          ))}
        </ol>
      </div>
    );
  }

  // Multiple Choice (default)
  return (
    <div className={baseCard}>
      <p className='mb-2 text-sm text-gray-600'>Pilihan ganda</p>
      <p className='mb-6 text-lg font-bold text-gray-900'>{q}</p>
      <div className='grid grid-cols-1 gap-2 sm:grid-cols-2'>
        {opts.map((answer, index) => (
          <div
            key={index}
            className={`rounded-xl border-2 p-3 text-center text-sm font-semibold ${
              answer.correct
                ? 'border-green-300 bg-green-50 text-green-700'
                : 'border-gray-200 bg-gray-50 text-gray-700'
            }`}
          >
            {answer.text?.trim() || '—'}
          </div>
        ))}
      </div>
    </div>
  );
}
