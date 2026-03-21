import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { CheckCircle, Search, XCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function CaseResult() {
  const { caseId } = useParams();
  const [params] = useSearchParams();
  const location = useLocation();
  const status = params.get('status') ?? 'failed';
  const solved = status === 'solved';
  const payload = location.state ?? {};
  const clueSelection = Array.isArray(payload.selectedClues) ? payload.selectedClues : [];

  return (
    <div className='min-h-screen bg-[#f8f9ff]'>
      <div className='max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10'>
        <Card
          className={`rounded-3xl border ${
            solved ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
          }`}
        >
          <CardContent className='p-8'>
            <div className='flex items-start gap-3 mb-4'>
              {solved ? (
                <CheckCircle className='w-8 h-8 text-green-700 mt-0.5' />
              ) : (
                <XCircle className='w-8 h-8 text-red-700 mt-0.5' />
              )}
              <div>
                <h1
                  className={`text-2xl font-bold ${
                    solved ? 'text-green-900' : 'text-red-900'
                  }`}
                >
                  {solved ? 'Case Solved' : 'Case Failed'}
                </h1>
                <p className={`${solved ? 'text-green-700' : 'text-red-700'} mt-1`}>
                  {solved
                    ? 'Excellent deduction. Evidence and logic match the mystery timeline.'
                    : 'Deduction belum tepat. Coba evaluasi ulang bukti dan suspect.'}
                </p>
              </div>
            </div>

            <Card className='bg-white border border-gray-200'>
              <CardContent className='p-5 space-y-2 text-sm'>
                <p>
                  <span className='font-semibold text-gray-900'>Chosen suspect:</span>{' '}
                  <span className='text-gray-700'>{payload.culprit ?? '-'}</span>
                </p>
                <p>
                  <span className='font-semibold text-gray-900'>Secret code:</span>{' '}
                  <span className='text-gray-700'>{payload.secretCode ?? '-'}</span>
                </p>
                <p>
                  <span className='font-semibold text-gray-900'>Clues used:</span>{' '}
                  <span className='text-gray-700'>
                    {clueSelection.length > 0 ? `${clueSelection.length} clue dipilih` : '-'}
                  </span>
                </p>
                <div>
                  <p className='font-semibold text-gray-900 mb-1'>Explanation</p>
                  <p className='text-gray-700'>{payload.reasoning ?? '-'}</p>
                </div>
              </CardContent>
            </Card>

            <div className='flex flex-wrap gap-3 mt-6'>
              <Button asChild variant='outline'>
                <Link to='/student'>Back to Dashboard</Link>
              </Button>
              {caseId ? (
                <Button asChild variant='outline'>
                  <Link to={`/case/${caseId}/story`}>Review story</Link>
                </Button>
              ) : null}
              <Button asChild className='bg-linear-to-r from-purple-300 to-blue-300 text-purple-700'>
                <Link to='/student'>
                  <Search className='w-4 h-4 mr-2' />
                  Browse cases
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
