import { Navigate, useSearchParams } from 'react-router-dom';

/**
 * Rute lama `/teacher/puzzle-builder` dialihkan ke Case Builder, tahap Puzzle,
 * agar tidak membuka halaman baru.
 */
export default function PuzzleBuilder() {
  const [searchParams] = useSearchParams();
  const next = new URLSearchParams(searchParams);
  next.set('step', 'puzzles');
  return (
    <Navigate to={`/teacher/case-builder?${next.toString()}`} replace />
  );
}
