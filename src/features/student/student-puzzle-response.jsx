import { useCallback, useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

function shuffleCopy(items) {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Input jawaban siswa mengikuti tipe puzzle Case Builder (meta tanpa flag benar).
 */
export function StudentPuzzleResponse({
  puzzleId,
  puzzleMeta,
  answerText,
  onAnswerChange,
  disabled,
  onSubmitAttempt,
}) {
  const puzzleType = puzzleMeta?.puzzleType || 'Multiple Choice';
  const answers = Array.isArray(puzzleMeta?.answers) ? puzzleMeta.answers : [];

  const optionTexts = useMemo(
    () =>
      answers
        .map((a) => String(a?.text ?? '').trim())
        .filter((t) => t.length > 0),
    [answers],
  );

  const [orderPool, setOrderPool] = useState([]);
  const [orderPicked, setOrderPicked] = useState([]);
  const [matchLeft, setMatchLeft] = useState('');
  const [matchRight, setMatchRight] = useState('');

  const syncOrderingAnswer = useCallback(
    (picked) => {
      onAnswerChange(picked.map((x) => x.text).join('|'));
    },
    [onAnswerChange],
  );

  const optionTextsKey = useMemo(() => optionTexts.join('\u0001'), [optionTexts]);

  useEffect(() => {
    if (puzzleType !== 'Ordering') return;
    const tagged = optionTexts.map((text, i) => ({ key: `${puzzleId}-${i}`, text }));
    setOrderPool(shuffleCopy(tagged));
    setOrderPicked([]);
    onAnswerChange('');
  }, [puzzleId, puzzleType, optionTextsKey, onAnswerChange, optionTexts]);

  useEffect(() => {
    if (puzzleType === 'Matching') {
      setMatchLeft('');
      setMatchRight('');
      onAnswerChange('');
    }
  }, [puzzleId, puzzleType, onAnswerChange]);

  if (puzzleType === 'True/False') {
    const a = optionTexts[0] || 'Benar';
    const b = optionTexts[1] || 'Salah';
    return (
      <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
        {[a, b].map((label) => (
          <Button
            key={label}
            type='button'
            variant={answerText.trim() === label ? 'default' : 'outline'}
            className='h-auto min-h-14 py-4 text-base font-semibold'
            disabled={disabled}
            onClick={() => onAnswerChange(label)}
          >
            {label}
          </Button>
        ))}
      </div>
    );
  }

  if (puzzleType === 'Multiple Choice') {
    if (optionTexts.length === 0) {
      return (
        <div className='space-y-3'>
          <p className='text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2'>
            Opsi pilihan belum diisi guru — jawab dengan teks.
          </p>
          <Input
            value={answerText}
            onChange={(e) => onAnswerChange(e.target.value)}
            placeholder='Tulis jawaban Anda…'
            className='text-lg h-12'
            disabled={disabled}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !disabled) onSubmitAttempt?.();
            }}
          />
        </div>
      );
    }
    return (
      <div className='grid grid-cols-1 gap-2 sm:grid-cols-2'>
        {optionTexts.map((label) => (
          <Button
            key={label}
            type='button'
            variant={answerText.trim() === label ? 'default' : 'outline'}
            className='h-auto min-h-12 py-3 text-sm font-semibold whitespace-normal text-center'
            disabled={disabled}
            onClick={() => onAnswerChange(label)}
          >
            {label}
          </Button>
        ))}
      </div>
    );
  }

  if (puzzleType === 'Fill in the Blank') {
    return (
      <div className='space-y-2'>
        <Input
          value={answerText}
          onChange={(e) => onAnswerChange(e.target.value)}
          placeholder='Jawaban…'
          className='text-lg h-12'
          disabled={disabled}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !disabled) onSubmitAttempt?.();
          }}
        />
      </div>
    );
  }

  if (puzzleType === 'Ordering') {
    const pick = (item) => {
      setOrderPool((p) => p.filter((x) => x.key !== item.key));
      setOrderPicked((prev) => {
        const next = [...prev, item];
        syncOrderingAnswer(next);
        return next;
      });
    };
    const undoLast = () => {
      setOrderPicked((prev) => {
        if (!prev.length) return prev;
        const next = prev.slice(0, -1);
        const removed = prev[prev.length - 1];
        setOrderPool((p) => [...p, removed]);
        syncOrderingAnswer(next);
        return next;
      });
    };
    const reset = () => {
      const tagged = optionTexts.map((text, i) => ({ key: `${puzzleId}-${i}`, text }));
      setOrderPool(shuffleCopy(tagged));
      setOrderPicked([]);
      onAnswerChange('');
    };

    return (
      <div className='space-y-4'>
        <p className='text-sm text-gray-600'>
          Klik item di bawah sesuai urutan yang benar. Jawaban dikirim sebagai teks dipisah
          <span className='font-mono'> | </span>
          (sama seperti di Case Builder).
        </p>
        {orderPicked.length > 0 ? (
          <div className='rounded-xl border border-purple-200 bg-purple-50/80 p-3'>
            <p className='text-xs font-semibold text-purple-900 mb-2'>Urutanmu</p>
            <ol className='list-decimal space-y-1 pl-5 text-sm font-medium text-gray-900'>
              {orderPicked.map((x) => (
                <li key={x.key}>{x.text}</li>
              ))}
            </ol>
            <div className='mt-3 flex flex-wrap gap-2'>
              <Button type='button' size='sm' variant='outline' disabled={disabled} onClick={undoLast}>
                Urungkan satu
              </Button>
              <Button type='button' size='sm' variant='outline' disabled={disabled} onClick={reset}>
                Ulang dari awal
              </Button>
            </div>
          </div>
        ) : null}
        <div className='flex flex-wrap gap-2'>
          {orderPool.map((item) => (
            <Button
              key={item.key}
              type='button'
              variant='secondary'
              disabled={disabled}
              className='h-auto min-h-10 whitespace-normal text-left font-normal'
              onClick={() => pick(item)}
            >
              {item.text}
            </Button>
          ))}
        </div>
        {orderPool.length === 0 && optionTexts.length === 0 ? (
          <p className='text-sm text-gray-500'>Belum ada item urutan dari guru.</p>
        ) : null}
      </div>
    );
  }

  if (puzzleType === 'Matching') {
    const leftCol = answers
      .filter((_, i) => i % 2 === 0)
      .map((a) => String(a?.text ?? '').trim())
      .filter(Boolean);
    const rightCol = answers
      .filter((_, i) => i % 2 === 1)
      .map((a) => String(a?.text ?? '').trim())
      .filter(Boolean);
    const applyMatch = () => {
      if (!matchLeft.trim() || !matchRight.trim()) return;
      onAnswerChange(`${matchLeft.trim()}|${matchRight.trim()}`);
    };

    if (leftCol.length === 0 || rightCol.length === 0) {
      return (
        <div className='space-y-2'>
          <p className='text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2'>
            Pasangan matching belum lengkap — jawab dengan format kiri|kanan (teks).
          </p>
          <Input
            value={answerText}
            onChange={(e) => onAnswerChange(e.target.value)}
            placeholder='contoh: A|B'
            className='text-lg h-12 font-mono'
            disabled={disabled}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !disabled) onSubmitAttempt?.();
            }}
          />
        </div>
      );
    }

    return (
      <div className='space-y-4'>
        <p className='text-sm text-gray-600'>
          Pilih satu pasangan kiri dan kanan (sesuai layout guru di Case Builder).
        </p>
        <div className='grid gap-3 sm:grid-cols-2'>
          <div className='space-y-2'>
            <p className='text-xs font-semibold text-gray-600'>Kiri</p>
            <Select value={matchLeft} onValueChange={setMatchLeft} disabled={disabled}>
              <SelectTrigger>
                <SelectValue placeholder='Pilih…' />
              </SelectTrigger>
              <SelectContent>
                {leftCol.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className='space-y-2'>
            <p className='text-xs font-semibold text-gray-600'>Kanan</p>
            <Select value={matchRight} onValueChange={setMatchRight} disabled={disabled}>
              <SelectTrigger>
                <SelectValue placeholder='Pilih…' />
              </SelectTrigger>
              <SelectContent>
                {rightCol.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button type='button' variant='secondary' disabled={disabled} onClick={applyMatch}>
          Pakai pasangan ini sebagai jawaban
        </Button>
        {answerText.includes('|') ? (
          <p className='text-xs text-gray-500'>
            Jawaban terpilih: <span className='font-mono font-medium'>{answerText}</span>
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className='space-y-2'>
      <Input
        value={answerText}
        onChange={(e) => onAnswerChange(e.target.value)}
        placeholder='Tulis jawaban Anda…'
        className='text-lg h-12'
        disabled={disabled}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !disabled) onSubmitAttempt?.();
        }}
      />
    </div>
  );
}
