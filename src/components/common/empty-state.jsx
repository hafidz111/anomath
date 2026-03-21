/**
 * Blok kosong konsisten: selalu terlihat (border dashed), tidak menyembunyikan section.
 */
export function EmptyState({ title, description, className = '', children }) {
  return (
    <div
      className={`rounded-xl border border-dashed border-gray-200 bg-gray-50/90 px-4 py-10 text-center ${className}`}
    >
      <p className='text-sm font-medium text-gray-900'>{title}</p>
      {description ? (
        <p className='mx-auto mt-2 max-w-md text-sm text-gray-500'>{description}</p>
      ) : null}
      {children ? <div className='mt-4 flex flex-wrap justify-center gap-2'>{children}</div> : null}
    </div>
  );
}
