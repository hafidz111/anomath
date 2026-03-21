import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Search } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { LogoutButton } from '@/components/auth/logout-button';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { submitFinalDeduction } from '@/lib/api/cases';

export default function FinalDeduction() {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const ctx = location.state ?? {};
  const [culprit, setCulprit] = useState(ctx.suspect ?? '');
  const [secretCode, setSecretCode] = useState('');
  const [reasoning, setReasoning] = useState('');

  const submit = async () => {
    if (!caseId) return;
    try {
      const result = await submitFinalDeduction(caseId, {
        culprit,
        secret_code: secretCode,
        reasoning,
        selected_clues: ctx.selectedClues ?? [],
      });
      navigate(`/case/${caseId}/result?status=${result.status}`, {
        state: {
          culprit: result.culprit,
          secretCode,
          reasoning: result.reasoning,
          selectedClues: result.selected_clues ?? [],
        },
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal submit final deduction');
    }
  };

  return (
    <div className='min-h-screen bg-[#f8f9ff]'>
      <nav className='bg-white border-b sticky top-0 z-50'>
        <div className='max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 grid h-16 grid-cols-[1fr_auto_1fr] items-center gap-2'>
          <Link to={`/case/${caseId}/board`} className='inline-flex items-center gap-2 justify-self-start text-gray-600 hover:text-purple-600'>
            <ArrowLeft className='w-5 h-5 shrink-0' />
            Back
          </Link>
          <div className='inline-flex items-center gap-2 justify-self-center text-purple-600 font-bold'>
            <Search className='w-6 h-6 shrink-0' />
            Final Deduction
          </div>
          <div className='justify-self-end'>
            <LogoutButton className='shrink-0 rounded-full border-0 bg-linear-to-r from-purple-200 to-blue-200 text-purple-700 hover:opacity-95' variant='ghost' size='sm' />
          </div>
        </div>
      </nav>

      <div className='max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        <Card className='rounded-3xl border border-gray-200'>
          <CardContent className='p-8 space-y-6'>
            <div>
              <h1 className='text-2xl font-bold text-gray-900'>Submit Detective Conclusion</h1>
              <p className='text-sm text-gray-600 mt-1'>
                Gunakan clue yang sudah kamu analisis untuk menutup case.
              </p>
            </div>

            <div className='space-y-2'>
              <Label>Who is the culprit?</Label>
              <div className='flex flex-wrap gap-2'>
                {['Suspect A', 'Suspect B', 'Suspect C'].map((name) => (
                  <button
                    key={name}
                    type='button'
                    onClick={() => setCulprit(name)}
                    className={`px-4 py-2 rounded-lg border text-sm font-semibold ${
                      culprit === name
                        ? 'bg-purple-100 border-purple-300 text-purple-700'
                        : 'bg-white border-gray-200 text-gray-700'
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>

            <div className='space-y-2'>
              <Label htmlFor='code'>Secret code</Label>
              <Input
                id='code'
                value={secretCode}
                onChange={(e) => setSecretCode(e.target.value)}
                placeholder='Masukkan kode rahasia final'
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='reason'>Reasoning summary</Label>
              <textarea
                id='reason'
                rows={4}
                value={reasoning}
                onChange={(e) => setReasoning(e.target.value)}
                className='w-full rounded-md border border-input bg-white px-3 py-2 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50'
                placeholder='Explain your evidence briefly...'
              />
            </div>

            <div className='flex justify-end'>
              <Button
                type='button'
                onClick={submit}
                disabled={!culprit || !secretCode || !reasoning.trim()}
                className='bg-linear-to-r from-purple-300 to-blue-300 text-purple-700'
              >
                Submit Case Report
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
