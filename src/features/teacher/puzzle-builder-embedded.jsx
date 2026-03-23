import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { toast } from 'sonner';
import {
  Check,
  Lightbulb,
  Plus,
  Settings,
  Target,
  Trash2,
} from 'lucide-react';

import { PuzzleListSkeleton } from '@/components/common/page-skeletons';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  createPuzzle,
  deletePuzzle,
  getPuzzle,
  listPuzzles,
  normalizePuzzleSaveResponse,
  updatePuzzle,
} from '@/lib/api/cases';

const ROW_THEMES = [
  'from-purple-100 to-purple-50 border-purple-200',
  'from-blue-100 to-blue-50 border-blue-200',
  'from-pink-100 to-pink-50 border-pink-200',
];

const ORDERING_MIN_OPTIONS = 2;
const ORDERING_DEFAULT_COUNT = 3;

function parsePointsForApi(raw) {
  const s = String(raw ?? '').trim();
  if (s === '' || Number.isNaN(Number(s))) return 0;
  return Math.max(0, Math.floor(Number(s)));
}

function difficultyForApi(value) {
  const v = String(value ?? '').trim().toLowerCase();
  return v === 'easy' || v === 'medium' || v === 'hard' ? v : '';
}

function sortPuzzlesByOrder(list) {
  return [...list].sort((a, b) => {
    const oa = Number(a?.order);
    const ob = Number(b?.order);
    if (Number.isFinite(oa) && Number.isFinite(ob) && oa !== ob) return oa - ob;
    return String(a?.id ?? '').localeCompare(String(b?.id ?? ''));
  });
}

function emptyAnswerSlots() {
  return [
    { text: '', correct: false },
    { text: '', correct: false },
    { text: '', correct: false },
    { text: '', correct: false },
  ];
}

/** Struktur jawaban awal saat guru mengganti Puzzle Type */
function defaultAnswersForPuzzleType(type) {
  switch (type) {
    case 'True/False':
      return [
        { text: 'Benar', correct: true },
        { text: 'Salah', correct: false },
      ];
    case 'Fill in the Blank':
      return [{ text: '', correct: true }];
    case 'Matching':
      return [
        { text: '', correct: true },
        { text: '', correct: false },
        { text: '', correct: false },
        { text: '', correct: false },
      ];
    case 'Ordering':
      return Array.from({ length: ORDERING_DEFAULT_COUNT }, () => ({
        text: '',
        correct: false,
      }));
    case 'Multiple Choice':
    default:
      return emptyAnswerSlots();
  }
}

/** Satu string jawaban untuk API (siswa membandingkan dengan jawaban terkirim). */
function buildStoredAnswer(puzzleType, answers) {
  const t = puzzleType || 'Multiple Choice';
  if (t === 'Fill in the Blank') {
    return (answers[0]?.text ?? '').trim();
  }
  if (t === 'Ordering') {
    return answers
      .map((a) => (a.text ?? '').trim())
      .filter(Boolean)
      .join('|');
  }
  if (t === 'Matching') {
    const useFirstPair = Boolean(answers[0]?.correct);
    const li = useFirstPair ? 0 : 2;
    const ri = useFirstPair ? 1 : 3;
    const left = (answers[li]?.text ?? '').trim();
    const right = (answers[ri]?.text ?? '').trim();
    return `${left}|${right}`;
  }
  const hit = answers.find((a) => a.correct);
  return (hit?.text ?? '').trim();
}

/** Disimpan di server agar opsi & tipe bisa dimuat lagi saat edit. */
function buildPuzzleMetaForApi(puzzleType, answers) {
  const pt = puzzleType || 'Multiple Choice';
  return {
    puzzleType: pt,
    answers: answers.map((a) => ({
      text: String(a?.text ?? ''),
      correct: Boolean(a?.correct),
    })),
  };
}

function padAnswersForType(puzzleType, answers) {
  const src = Array.isArray(answers) ? answers : [];
  if (puzzleType === 'Ordering') {
    const row = () => ({ text: '', correct: false });
    if (src.length === 0) {
      return Array.from({ length: ORDERING_DEFAULT_COUNT }, row);
    }
    const out = src.map((s) => ({
      text: String(s?.text ?? ''),
      correct: false,
    }));
    while (out.length < ORDERING_MIN_OPTIONS) out.push(row());
    return out;
  }
  const defaults = defaultAnswersForPuzzleType(puzzleType);
  return defaults.map((d, i) => ({
    text: src[i] != null ? String(src[i].text ?? '') : d.text,
    correct: src[i] != null ? Boolean(src[i].correct) : d.correct,
  }));
}

function hydrateFormFromPuzzle(p) {
  const meta = p?.puzzle_meta;
  if (
    meta &&
    typeof meta === 'object' &&
    Array.isArray(meta.answers) &&
    meta.answers.length > 0
  ) {
    const pt = meta.puzzleType || 'Multiple Choice';
    return {
      puzzleType: pt,
      answers: padAnswersForType(pt, meta.answers),
    };
  }
  const ans = p.answer != null ? String(p.answer).trim() : '';
  const pt = 'Multiple Choice';
  return {
    puzzleType: pt,
    answers: padAnswersForType(pt, [
      { text: ans, correct: true },
      { text: '', correct: false },
      { text: '', correct: false },
      { text: '', correct: false },
    ]),
  };
}

function ExampleFillCallout({ title, children }) {
  return (
    <details className='rounded-xl border border-amber-200/90 bg-amber-50/90 text-sm text-gray-800 open:shadow-sm'>
      <summary className='cursor-pointer list-none px-4 py-3 font-semibold text-amber-950 marker:hidden [&::-webkit-details-marker]:hidden'>
        <span className='inline-flex items-center gap-2'>
          <Lightbulb className='h-4 w-4 shrink-0 text-amber-600' />
          {title}
        </span>
      </summary>
      <div className='space-y-2 border-t border-amber-200/70 px-4 pb-4 pt-3 text-xs leading-relaxed text-gray-700'>
        {children}
      </div>
    </details>
  );
}

/**
 * Tahap puzzle: daftar → (Tambah/Edit) form → simpan → kembali ke daftar.
 * Live preview di sidebar parent lewat onLivePreviewChange.
 */
export function PuzzleBuilderEmbedded({
  caseId,
  /** Daftar puzzle dari parent: `undefined` = anak fetch sendiri; `null` = tunggu parent (jangan GET); array = pakai itu. */
  parentPuzzleList,
  /** Samakan state `casePuzzles` di parent dengan daftar lokal (tanpa GET) setelah simpan/hapus puzzle. */
  onPuzzleListSync,
  puzzleId,
  onPuzzleIdChange,
  onCreateCaseWithFirstPuzzle,
  onLivePreviewChange,
  /** `true` = tampilkan field waktu per puzzle (mode waktu di Case Info) */
  perPuzzleTimeMode = false,
  /**
   * Batas jumlah puzzle = "Number of stages" di Case Info (minimal 1).
   * Di luar Case Builder boleh tidak diisi (default besar).
   */
  maxPuzzleCount = 99,
  /** Ref untuk tombol Simpan/Batal di sidebar parent: `{ save, cancel }` */
  editorActionsRef,
  /** Metadata checklist sidebar (tanpa fungsi, aman untuk setState) */
  onEditorMetaChange,
  /** `list` | `edit` — parent memakai untuk blok Lanjut saat form puzzle terbuka */
  onPuzzleBuilderUiModeChange,
}) {
  const [uiMode, setUiMode] = useState(() => (puzzleId ? 'edit' : 'list'));
  const [question, setQuestion] = useState('');
  const [puzzleType, setPuzzleType] = useState('');
  const [clueText, setClueText] = useState('');
  const [points, setPoints] = useState('');
  const [metaDifficulty, setMetaDifficulty] = useState('');
  const [timeMin, setTimeMin] = useState('');
  const [answers, setAnswers] = useState(emptyAnswerSlots);
  const [casePuzzlesRaw, setCasePuzzlesRaw] = useState(undefined);
  const lastHydrateKey = useRef('');
  const casePuzzlesRawRef = useRef(casePuzzlesRaw);

  /** URL punya `puzzleId` ⇒ selalu editor; tanpa itu pakai state (list vs tambah baru). */
  const effectiveUiMode = puzzleId ? 'edit' : uiMode;

  /** Daftar dari parent (CaseBuilder) — diurutkan; hindari setState di efek untuk mirror props. */
  const parentPuzzleListSorted = useMemo(() => {
    if (!Array.isArray(parentPuzzleList)) return null;
    return sortPuzzlesByOrder(parentPuzzleList);
  }, [parentPuzzleList]);

  /** Tanpa `caseId` jangan tampilkan cache puzzle case sebelumnya; prioritas daftar dari parent. */
  const puzzleListForCase = caseId
    ? (parentPuzzleListSorted != null ? parentPuzzleListSorted : casePuzzlesRaw)
    : undefined;

  useLayoutEffect(() => {
    casePuzzlesRawRef.current = puzzleListForCase;
  });

  /** Hanya berubah saat urutan/id puzzle berubah — kurangi re-run efek hydrate & getPuzzle. */
  const puzzleListIdsKey = useMemo(
    () =>
      (puzzleListForCase ?? [])
        .map((p) => String(p?.id ?? ''))
        .join('|'),
    [puzzleListForCase],
  );

  const puzzleLimit = Math.max(1, Number(maxPuzzleCount) || 1);
  const puzzleCount = (puzzleListForCase ?? []).length;
  const atPuzzleLimit = Boolean(caseId) && puzzleCount >= puzzleLimit;
  const overPuzzleLimit = Boolean(caseId) && puzzleCount > puzzleLimit;

  const applyPuzzleToForm = (p) => {
    setQuestion(p.question || '');
    setClueText(p.explanation || '');
    const { puzzleType: pt, answers: nextAnswers } = hydrateFormFromPuzzle(p);
    setPuzzleType(pt);
    setAnswers(nextAnswers);
    const pts = p?.points;
    setPoints(
      pts !== undefined && pts !== null && String(pts).trim() !== ''
        ? String(pts)
        : '',
    );
    setMetaDifficulty(difficultyForApi(p?.difficulty) || '');
  };

  const resetFormToNew = () => {
    setQuestion('');
    setPuzzleType('');
    setClueText('');
    setPoints('');
    setMetaDifficulty('');
    setTimeMin('');
    setAnswers(emptyAnswerSlots());
  };

  useEffect(() => {
    onPuzzleBuilderUiModeChange?.(effectiveUiMode);
  }, [effectiveUiMode, onPuzzleBuilderUiModeChange]);

  useEffect(() => {
    if (!caseId || parentPuzzleList !== undefined) return;
    let cancelled = false;
    listPuzzles(caseId)
      .then((data) => {
        if (cancelled) return;
        setCasePuzzlesRaw(sortPuzzlesByOrder(data?.puzzles ?? []));
      })
      .catch(() => {
        if (!cancelled) setCasePuzzlesRaw([]);
      });
    return () => {
      cancelled = true;
    };
  }, [caseId, parentPuzzleList]);

  useEffect(() => {
    const key = `${caseId ?? ''}|${puzzleId || 'new'}`;
    const list = casePuzzlesRawRef.current;

    if (!caseId) {
      if (!puzzleId && lastHydrateKey.current !== key) {
        lastHydrateKey.current = key;
        queueMicrotask(() => resetFormToNew());
      }
      return;
    }

    if (list === undefined) return;

    if (!puzzleId) {
      if (lastHydrateKey.current !== key) {
        lastHydrateKey.current = key;
        queueMicrotask(() => resetFormToNew());
      }
      return;
    }

    const fromList = list.find((x) => String(x.id) === String(puzzleId));
    if (fromList) {
      if (lastHydrateKey.current === key) return;
      lastHydrateKey.current = key;
      queueMicrotask(() => applyPuzzleToForm(fromList));
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const detail = await getPuzzle(puzzleId);
        if (cancelled) return;
        if (lastHydrateKey.current === key) return;
        lastHydrateKey.current = key;
        queueMicrotask(() => applyPuzzleToForm(detail));
      } catch {
        if (!cancelled)
          toast.error('Puzzle tidak ditemukan atau tidak bisa dimuat.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [caseId, puzzleId, puzzleListIdsKey]);

  useEffect(() => {
    if (!onLivePreviewChange) return;
    if (effectiveUiMode === 'list') {
      onLivePreviewChange(null);
      return;
    }
    onLivePreviewChange({
      puzzleType: puzzleType || 'Multiple Choice',
      question,
      answers,
    });
  }, [effectiveUiMode, puzzleType, question, answers, onLivePreviewChange]);

  const listLoading = Boolean(caseId && puzzleListForCase === undefined);

  const mergeSavedIntoList = (list, response, form) => {
    const saved = normalizePuzzleSaveResponse(response);
    if (!saved?.id) return sortPuzzlesByOrder(list);
    const row = {
      ...saved,
      question: saved.question ?? form.question ?? '',
      answer: saved.answer ?? form.answer ?? '',
      explanation: saved.explanation ?? form.explanation ?? '',
      puzzle_meta: saved.puzzle_meta ?? form.puzzle_meta ?? null,
      points:
        saved.points !== undefined && saved.points !== null
          ? saved.points
          : (form.points ?? 0),
      difficulty:
        saved.difficulty !== undefined && saved.difficulty !== null
          ? saved.difficulty
          : (form.difficulty ?? ''),
    };
    const has = list.some((x) => String(x.id) === String(saved.id));
    if (!has) return sortPuzzlesByOrder([...list, row]);
    return sortPuzzlesByOrder(
      list.map((x) =>
        String(x.id) === String(saved.id) ? { ...x, ...row } : x,
      ),
    );
  };

  /**
   * Gabungkan respons POST/PUT puzzle ke daftar lokal + parent — tanpa GET case.
   * @param {{ response: unknown, question: string, answer: string, explanation: string, puzzle_meta?: object, points?: number, difficulty?: string }} mergeFromSave
   */
  const mergePuzzleListAfterSave = (mergeFromSave) => {
    if (!caseId || mergeFromSave?.response == null) return;
    const form = {
      question: mergeFromSave.question,
      answer: mergeFromSave.answer,
      explanation: mergeFromSave.explanation,
      puzzle_meta: mergeFromSave.puzzle_meta ?? null,
      points: mergeFromSave.points ?? 0,
      difficulty: mergeFromSave.difficulty ?? '',
    };
    setCasePuzzlesRaw((prev) => {
      const base =
        parentPuzzleListSorted != null ? parentPuzzleListSorted : (prev ?? []);
      const merged = mergeSavedIntoList(
        base,
        mergeFromSave.response,
        form,
      );
      onPuzzleListSync?.(merged);
      return merged;
    });
  };

  const handleDeleteListedPuzzle = async (id) => {
    if (!window.confirm('Hapus puzzle ini dari case?')) return;
    try {
      await deletePuzzle(id);
      toast.success('Puzzle dihapus.');
      setCasePuzzlesRaw((prev) => {
        const base =
          parentPuzzleListSorted != null ? parentPuzzleListSorted : (prev ?? []);
        const next = sortPuzzlesByOrder(
          base.filter((x) => String(x.id) !== String(id)),
        );
        onPuzzleListSync?.(next);
        return next;
      });
      if (String(id) === String(puzzleId)) {
        onPuzzleIdChange('');
        setUiMode('list');
        resetFormToNew();
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal menghapus');
    }
  };

  const openNewPuzzleEditor = () => {
    if (caseId && atPuzzleLimit) {
      toast.error(
        `Sudah ${puzzleLimit} puzzle (batas = jumlah tahap di Case Info). Hapus salah satu atau tambah jumlah tahap.`,
      );
      return;
    }
    onPuzzleIdChange('');
    resetFormToNew();
    setPuzzleType('Multiple Choice');
    setUiMode('edit');
  };

  const closeEditor = () => {
    onPuzzleIdChange('');
    resetFormToNew();
    setUiMode('list');
  };

  const savePuzzleToServer = async () => {
    const pt = puzzleType || 'Multiple Choice';
    const stored = buildStoredAnswer(pt, answers);
    if (pt === 'Ordering') {
      if (!stored || stored.split('|').length < 2) {
        toast.error('Isi minimal dua langkah urutan dengan teks.');
        return;
      }
    } else if (pt === 'Matching') {
      const p1 = Boolean(answers[0]?.correct);
      const p2 = Boolean(answers[2]?.correct);
      if (p1 === p2) {
        toast.error('Pilih tepat satu pasangan sebagai kunci jawaban.');
        return;
      }
      if (!answers.every((a) => (a.text ?? '').trim().length >= 1)) {
        toast.error('Lengkapi keempat teks pasangan (kiri & kanan).');
        return;
      }
      if (!stored.includes('|') || stored.split('|').some((x) => !x.trim())) {
        toast.error('Pasangan jawaban tidak valid.');
        return;
      }
    } else if (pt === 'Fill in the Blank') {
      if (!stored) {
        toast.error('Isi jawaban benar untuk isian singkat.');
        return;
      }
    } else if (!stored) {
      toast.error(
        pt === 'True/False'
          ? 'Pilih Benar atau Salah sebagai jawaban benar.'
          : 'Tandai satu opsi sebagai jawaban benar.',
      );
      return;
    }
    const correctAnswer = stored;
    const q = question.trim();
    const puzzleMetaPayload = buildPuzzleMetaForApi(pt, answers);
    const pointsPayload = parsePointsForApi(points);
    const difficultyPayload = difficultyForApi(metaDifficulty);
    if (q.length < 3) {
      toast.error('Pertanyaan minimal 3 karakter.');
      return;
    }

    const loadingId = toast.loading(
      puzzleId ? 'Memperbarui puzzle…' : 'Menyimpan puzzle…',
    );
    try {
      if (!caseId) {
        await onCreateCaseWithFirstPuzzle({
          question: q,
          answer: correctAnswer,
          explanation: clueText.trim(),
        });
        toast.dismiss(loadingId);
        toast.success('Case dan puzzle tersimpan.');
        closeEditor();
        return;
      }

      const timeLimit =
        perPuzzleTimeMode &&
        (() => {
          const t = Number.parseInt(String(timeMin).trim(), 10);
          return Number.isFinite(t) && t >= 0 ? t : undefined;
        })();
      const puzzleBody = {
        question: q,
        answer: correctAnswer,
        explanation: clueText.trim(),
        puzzle_meta: puzzleMetaPayload,
        points: pointsPayload,
        difficulty: difficultyPayload,
        ...(timeLimit !== undefined ? { time_limit_minutes: timeLimit } : {}),
      };

      let saveResponse;
      if (puzzleId) {
        saveResponse = await updatePuzzle(puzzleId, puzzleBody);
      } else {
        if (atPuzzleLimit) {
          toast.dismiss(loadingId);
          toast.error(
            `Maksimal ${puzzleLimit} puzzle sesuai jumlah tahap di Case Info. Hapus puzzle lain atau naikkan jumlah tahap.`,
          );
          return;
        }
        saveResponse = await createPuzzle(caseId, puzzleBody);
      }
      toast.dismiss(loadingId);
      toast.success(puzzleId ? 'Puzzle diperbarui.' : 'Puzzle tersimpan.');
      mergePuzzleListAfterSave({
        response: saveResponse,
        question: q,
        answer: correctAnswer,
        explanation: clueText.trim(),
        puzzle_meta: puzzleMetaPayload,
        points: pointsPayload,
        difficulty: difficultyPayload,
      });
      closeEditor();
    } catch (e) {
      toast.dismiss(loadingId);
      if (e instanceof Error && e.message === 'NEED_DIFFICULTY') return;
      if (e instanceof Error && e.message === 'DRAFT_FIRST') {
        toast.error(
          'Simpan draft case dulu (tombol "Simpan draft" di atas) sebelum menambah puzzle.',
        );
        return;
      }
      toast.error(e instanceof Error ? e.message : 'Gagal menyimpan');
    }
  };

  const answerType = puzzleType || 'Multiple Choice';
  const storedAnswerOk = (() => {
    if (!puzzleType) return false;
    if (answerType === 'Ordering') {
      const parts = answers
        .map((a) => (a.text ?? '').trim())
        .filter(Boolean);
      return parts.length >= 2;
    }
    if (answerType === 'Matching') {
      const p1 = Boolean(answers[0]?.correct);
      const p2 = Boolean(answers[2]?.correct);
      return (
        p1 !== p2 &&
        answers.every((a) => (a.text ?? '').trim().length >= 1)
      );
    }
    if (answerType === 'Fill in the Blank') {
      return (answers[0]?.text ?? '').trim().length >= 1;
    }
    return Boolean(buildStoredAnswer(answerType, answers));
  })();

  const canSubmit =
    Boolean(puzzleType) &&
    question.trim().length > 8 &&
    storedAnswerOk &&
    clueText.trim().length > 6;

  useEffect(() => {
    if (!onEditorMetaChange) return;
    if (effectiveUiMode === 'list') {
      onEditorMetaChange(null);
      return;
    }
    onEditorMetaChange({
      canSubmit,
      questionOk: question.trim().length > 8,
      answerOk: storedAnswerOk,
      clueOk: clueText.trim().length > 6,
      saveLabel: puzzleId ? 'Perbarui puzzle' : 'Simpan puzzle',
    });
  }, [
    effectiveUiMode,
    canSubmit,
    storedAnswerOk,
    question,
    answers,
    clueText,
    puzzleId,
    onEditorMetaChange,
  ]);

  const editorTitle = puzzleId ? 'Edit puzzle' : 'Tambah puzzle';

  useLayoutEffect(() => {
    if (!editorActionsRef) return;
    editorActionsRef.current.save = savePuzzleToServer;
    editorActionsRef.current.cancel = closeEditor;
  });

  return (
    <div className='space-y-6'>
      <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
        <div className='flex items-center gap-3'>
          <div className='flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br from-purple-200 to-blue-200 shadow-sm'>
            <Target className='h-6 w-6 text-purple-600' />
          </div>
          <div>
            <h2 className='text-2xl font-bold text-gray-900'>Math Puzzles</h2>
            <p className='text-sm text-gray-500'>
              {effectiveUiMode === 'list'
                ? `Kelola soal untuk case ini — maksimal ${puzzleLimit} puzzle (sama dengan jumlah tahap di Case Info).`
                : 'Isi form lalu simpan — editor akan tertutup kembali ke daftar.'}
            </p>
          </div>
        </div>
        {effectiveUiMode === 'list' ? (
          <Button
            type='button'
            onClick={openNewPuzzleEditor}
            disabled={Boolean(caseId) && atPuzzleLimit}
            title={
              atPuzzleLimit
                ? `Batas ${puzzleLimit} puzzle tercapai`
                : undefined
            }
            className='rounded-full bg-linear-to-r from-purple-200 to-blue-200 text-purple-700 disabled:opacity-50'
          >
            <Plus className='mr-2 h-4 w-4' />
            Tambah puzzle
          </Button>
        ) : null}
      </div>

      {!caseId ? (
        <div className='rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-950'>
          <p className='font-medium'>Belum ada case di server</p>
          <p className='mt-1 text-xs text-emerald-900/90'>
            Tekan <span className='font-semibold'>Tambah puzzle</span>, isi lalu
            simpan — case dibuat bersama puzzle pertama (tingkat sulit wajib di
            tahap Case Info).
          </p>
        </div>
      ) : null}

      {overPuzzleLimit ? (
        <div className='rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-950'>
          <p className='font-medium'>Lebih banyak puzzle daripada jumlah tahap</p>
          <p className='mt-1 text-xs'>
            Rencana saat ini: {puzzleLimit} tahap, tetapi ada {puzzleCount}{' '}
            puzzle. Hapus kelebihan atau naikkan &quot;Number of stages&quot; di
            Case Info.
          </p>
        </div>
      ) : null}

      {effectiveUiMode === 'list' ? (
        <Card className='rounded-3xl border border-gray-200 shadow-sm'>
          <CardContent className='p-8'>
            <h3 className='mb-4 text-lg font-bold text-gray-900'>
              Daftar puzzle
            </h3>
            <div className='space-y-3'>
              {listLoading ? (
                <PuzzleListSkeleton items={4} />
              ) : !caseId ? (
                <p className='text-sm text-gray-500'>
                  Belum ada case. Tambah puzzle akan membuat case di server.
                </p>
              ) : (puzzleListForCase ?? []).length === 0 ? (
                <p className='rounded-xl border border-dashed border-gray-200 bg-gray-50/80 px-4 py-8 text-center text-sm text-gray-600'>
                  Belum ada puzzle. Gunakan{' '}
                  <span className='font-medium'>Tambah puzzle</span> di atas.
                </p>
              ) : (
                (puzzleListForCase ?? []).map((puzzle, i) => (
                  <div
                    key={puzzle.id}
                    className={`flex flex-col gap-2 rounded-xl border bg-linear-to-br p-4 sm:flex-row sm:items-center sm:justify-between ${ROW_THEMES[i % ROW_THEMES.length]}`}
                  >
                    <div className='min-w-0 flex-1'>
                      <p className='mb-1 line-clamp-2 text-sm font-semibold text-gray-900'>
                        {puzzle.question || '(Tanpa teks soal)'}
                      </p>
                    </div>
                    <div className='flex shrink-0 items-center gap-1'>
                      <Button
                        variant='ghost'
                        size='icon'
                        type='button'
                        title='Edit'
                        onClick={() => onPuzzleIdChange(String(puzzle.id))}
                      >
                        <Settings className='h-4 w-4' />
                      </Button>
                      <Button
                        variant='ghost'
                        size='icon'
                        type='button'
                        className='text-red-600 hover:text-red-700'
                        title='Hapus'
                        onClick={() => handleDeleteListedPuzzle(puzzle.id)}
                      >
                        <Trash2 className='h-4 w-4' />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className='space-y-6'>
          <div className='flex flex-wrap items-center justify-between gap-2'>
            <h3 className='text-xl font-bold text-gray-900'>{editorTitle}</h3>
            <Button
              type='button'
              variant='outline'
              size='sm'
              className='rounded-full'
              onClick={closeEditor}
            >
              Batal
            </Button>
          </div>

          <Card className='rounded-3xl border border-gray-200 shadow-sm'>
            <CardContent className='space-y-6 p-8'>
              <ExampleFillCallout title='Contoh isi puzzle (Multiple Choice)'>
                <p>
                  <span className='font-medium text-gray-900'>Soal:</span>{' '}
                  Sebuah kain panjangnya 2,4 m dipotong menjadi 8 bagian sama
                  panjang. Berapa meter panjang tiap potongan?
                </p>
                <p>
                  <span className='font-medium text-gray-900'>Opsi:</span>{' '}
                  0,2 m · 0,25 m ·{' '}
                  <span className='font-semibold'>0,3 m (benar)</span> · 0,4 m
                  — isi empat baris jawaban, centang ikon centang pada yang
                  benar.
                </p>
                <p>
                  <span className='font-medium text-gray-900'>Points:</span>{' '}
                  misalnya <span className='font-semibold'>50</span> — skor
                  yang ingin Anda beri jika siswa menjawab benar (boleh
                  disesuaikan).
                </p>
                <p>
                  <span className='font-medium text-gray-900'>Difficulty:</span>{' '}
                  pilih <span className='font-semibold'>Easy</span>,{' '}
                  <span className='font-semibold'>Medium</span>, atau{' '}
                  <span className='font-semibold'>Hard</span> sesuai seberapa
                  sulit soal ini bagi siswa.
                </p>
                <p>
                  <span className='font-medium text-gray-900'>
                    Clue / penjelasan:
                  </span>{' '}
                  Bagi panjang total dengan banyak potongan: 2,4 ÷ 8 = 0,3.
                  Jawaban yang tersimpan di server mengikuti teks opsi yang Anda
                  centang sebagai benar.
                </p>
                <div className='rounded-lg bg-white/70 px-3 py-2 text-gray-700'>
                  <p className='mb-1.5 font-medium text-gray-900'>
                    Tipe soal lain (penjelasan singkat)
                  </p>
                  <ul className='list-inside list-disc space-y-1.5'>
                    <li>
                      <span className='font-medium text-gray-800'>
                        True/False
                      </span>{' '}
                      — Siswa hanya memilih &quot;Benar&quot; atau
                      &quot;Salah&quot; untuk satu pernyataan. Tulis pernyataan
                      di kolom soal, lalu isi dua opsi jawaban.
                    </li>
                    <li>
                      <span className='font-medium text-gray-800'>
                        Fill in the Blank
                      </span>{' '}
                      — Siswa mengetik jawaban singkat. Anda bisa menulis
                      bagian kosong dengan tanda ___ di teks soal, atau biarkan
                      pratinjau menampilkan garis kosong di akhir kalimat.
                    </li>
                    <li>
                      <span className='font-medium text-gray-800'>
                        Matching
                      </span>{' '}
                      — Menyambungkan dua hal yang berpasangan (misalnya bentuk
                      dengan namanya). Isi opsi bergantian: baris ganjil untuk
                      sisi kiri, baris genap untuk sisi kanan; pratinjau di
                      kanan membantu melihat susunannya.
                    </li>
                    <li>
                      <span className='font-medium text-gray-800'>
                        Ordering
                      </span>{' '}
                      — Siswa mengurutkan beberapa pilihan dari yang paling
                      tepat di awal sampai akhir. Isi tiap baris opsi sebagai
                      satu langkah urutan; urutan di form menggambarkan urutan
                      yang benar.
                    </li>
                  </ul>
                </div>
              </ExampleFillCallout>
              <div className='space-y-2'>
                <Label>Puzzle Type</Label>
                <Select
                  value={puzzleType || undefined}
                  onValueChange={(v) => {
                    setPuzzleType(v);
                    setAnswers(defaultAnswersForPuzzleType(v));
                  }}
                >
                  <SelectTrigger className='bg-gray-50'>
                    <SelectValue placeholder='Pilih tipe puzzle' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='Multiple Choice'>
                      Multiple Choice
                    </SelectItem>
                    <SelectItem value='True/False'>True/False</SelectItem>
                    <SelectItem value='Fill in the Blank'>
                      Fill in the Blank
                    </SelectItem>
                    <SelectItem value='Matching'>Matching</SelectItem>
                    <SelectItem value='Ordering'>Ordering</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className='space-y-2'>
                <Label>Question</Label>
                <textarea
                  rows={3}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  className='w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none focus:ring-2 focus:ring-purple-300'
                  placeholder='Contoh: Sebuah kain panjangnya 2,4 m dipotong menjadi 8 bagian sama panjang. Berapa meter panjang tiap potongan?'
                />
              </div>
              <div
                className={`grid gap-4 ${perPuzzleTimeMode ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}
              >
                <div className='space-y-2'>
                  <Label>Points</Label>
                  <Input
                    type='number'
                    min={0}
                    value={points}
                    onChange={(e) => setPoints(e.target.value)}
                    className='bg-gray-50'
                    placeholder='Contoh: 50'
                  />
                </div>
                <div className='space-y-2'>
                  <Label>Difficulty</Label>
                  <Select
                    value={metaDifficulty || undefined}
                    onValueChange={setMetaDifficulty}
                  >
                    <SelectTrigger className='bg-gray-50'>
                      <SelectValue placeholder='Contoh: Medium' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='easy'>Easy</SelectItem>
                      <SelectItem value='medium'>Medium</SelectItem>
                      <SelectItem value='hard'>Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {perPuzzleTimeMode ? (
                  <div className='space-y-2'>
                    <Label>Waktu (menit)</Label>
                    <Input
                      type='number'
                      min={0}
                      value={timeMin}
                      onChange={(e) => setTimeMin(e.target.value)}
                      className='bg-gray-50'
                      placeholder='Contoh: 5'
                    />
                  </div>
                ) : null}
              </div>
              <div className='space-y-2'>
                <Label>Clue / penjelasan</Label>
                <textarea
                  rows={2}
                  value={clueText}
                  onChange={(e) => setClueText(e.target.value)}
                  className='w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none focus:ring-2 focus:ring-purple-300'
                  placeholder='Contoh: Bagi panjang total dengan banyak potongan: 2,4 ÷ 8 = 0,3. Siswa bisa cek ulang dengan mengalikan 0,3 × 8.'
                />
              </div>
            </CardContent>
          </Card>

          <Card className='rounded-3xl border border-purple-200 bg-linear-to-br from-purple-100 to-blue-100 shadow-sm'>
            <CardContent className='p-8'>
              <div className='mb-6 flex items-center gap-3'>
                <div className='flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm'>
                  <Target className='h-6 w-6 text-purple-600' />
                </div>
                <h3 className='text-xl font-bold text-gray-900'>
                  Answer Options
                </h3>
              </div>
              <div className='space-y-3'>
                {answerType === 'Fill in the Blank' ? (
                  <div className='rounded-xl border-2 border-gray-200 bg-white p-4'>
                    <Label className='mb-2 block text-sm text-gray-600'>
                      Jawaban benar (kunci)
                    </Label>
                    <Input
                      value={answers[0]?.text ?? ''}
                      onChange={(e) => {
                        setAnswers([{ text: e.target.value, correct: true }]);
                      }}
                      placeholder='Contoh: 42 atau x = 3'
                      className='bg-gray-50'
                    />
                  </div>
                ) : null}

                {answerType === 'Ordering' ? (
                  <div className='space-y-3'>
                    <p className='text-sm text-gray-600'>
                      Urutan benar dari atas ke bawah (langkah 1 → terakhir).
                      Minimal {ORDERING_MIN_OPTIONS} langkah; tambah baris jika
                      perlu.
                    </p>
                    {answers.map((answer, index) => (
                      <div
                        key={index}
                        className='flex items-center gap-3 rounded-xl border-2 border-gray-200 bg-white p-4'
                      >
                        <span className='flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-100 text-sm font-bold text-purple-800'>
                          {index + 1}
                        </span>
                        <Input
                          value={answer.text}
                          onChange={(e) => {
                            const copy = [...answers];
                            copy[index] = {
                              ...copy[index],
                              text: e.target.value,
                            };
                            setAnswers(copy);
                          }}
                          placeholder={`Langkah ${index + 1}`}
                          className='bg-gray-50'
                        />
                        {answers.length > ORDERING_MIN_OPTIONS ? (
                          <Button
                            type='button'
                            size='icon'
                            variant='outline'
                            className='shrink-0 text-red-600 hover:bg-red-50 hover:text-red-700'
                            onClick={() => {
                              setAnswers((prev) =>
                                prev.filter((_, i) => i !== index),
                              );
                            }}
                            aria-label={`Hapus langkah ${index + 1}`}
                          >
                            <Trash2 className='h-4 w-4' />
                          </Button>
                        ) : null}
                      </div>
                    ))}
                    <Button
                      type='button'
                      variant='outline'
                      className='w-full border-dashed border-purple-300 bg-purple-50/50 text-purple-900 hover:bg-purple-100/80'
                      onClick={() => {
                        setAnswers((prev) => [
                          ...prev,
                          { text: '', correct: false },
                        ]);
                      }}
                    >
                      <Plus className='mr-2 h-4 w-4' />
                      Tambah opsi
                    </Button>
                  </div>
                ) : null}

                {answerType === 'Matching' ? (
                  <div className='space-y-4'>
                    <p className='text-sm text-gray-600'>
                      Dua pasangan (kiri ↔ kanan). Tandai pasangan yang menjadi
                      kunci jawaban.
                    </p>
                    {[
                      { left: 0, right: 1, label: 'Pasangan A' },
                      { left: 2, right: 3, label: 'Pasangan B' },
                    ].map((row) => {
                      const isKey = Boolean(answers[row.left]?.correct);
                      return (
                        <div
                          key={row.label}
                          className='rounded-xl border-2 border-gray-200 bg-white p-4'
                        >
                          <div className='mb-2 flex items-center justify-between gap-2'>
                            <span className='text-sm font-semibold text-gray-800'>
                              {row.label}
                            </span>
                            <Button
                              size='sm'
                              type='button'
                              variant={isKey ? 'default' : 'outline'}
                              className={
                                isKey
                                  ? 'bg-green-100 text-green-800 hover:bg-green-100 hover:text-green-800'
                                  : ''
                              }
                              onClick={() => {
                                setAnswers((prev) =>
                                  prev.map((item, i) => ({
                                    ...item,
                                    correct: i === row.left,
                                  })),
                                );
                              }}
                            >
                              <Check className='mr-1 h-4 w-4' />
                              Kunci
                            </Button>
                          </div>
                          <div className='grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center'>
                            <Input
                              value={answers[row.left]?.text ?? ''}
                              onChange={(e) => {
                                const copy = [...answers];
                                copy[row.left] = {
                                  ...copy[row.left],
                                  text: e.target.value,
                                };
                                setAnswers(copy);
                              }}
                              placeholder='Kiri'
                              className='bg-gray-50'
                            />
                            <span className='hidden text-center text-gray-400 sm:block'>
                              ↔
                            </span>
                            <Input
                              value={answers[row.right]?.text ?? ''}
                              onChange={(e) => {
                                const copy = [...answers];
                                copy[row.right] = {
                                  ...copy[row.right],
                                  text: e.target.value,
                                };
                                setAnswers(copy);
                              }}
                              placeholder='Kanan'
                              className='bg-gray-50'
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : null}

                {answerType === 'True/False' ||
                answerType === 'Multiple Choice' ? (
                  <>
                    {answers.map((answer, index) => (
                      <div
                        key={index}
                        className='flex items-center gap-3 rounded-xl border-2 border-gray-200 bg-white p-4'
                      >
                        {answerType === 'True/False' ? (
                          <span className='w-24 shrink-0 text-sm font-medium text-gray-600'>
                            Opsi {index + 1}
                          </span>
                        ) : null}
                        <Input
                          value={answer.text}
                          onChange={(e) => {
                            const copy = [...answers];
                            copy[index].text = e.target.value;
                            setAnswers(copy);
                          }}
                          className='bg-gray-50'
                        />
                        <Button
                          size='icon'
                          type='button'
                          variant={answer.correct ? 'default' : 'outline'}
                          className={
                            answer.correct
                              ? 'bg-green-100 text-green-700 hover:text-green-700'
                              : ''
                          }
                          onClick={() => {
                            setAnswers((prev) =>
                              prev.map((item, i) => ({
                                ...item,
                                correct: i === index,
                              })),
                            );
                          }}
                        >
                          <Check className='h-5 w-5' />
                        </Button>
                      </div>
                    ))}
                  </>
                ) : null}
              </div>
              <div className='mt-4 inline-flex items-center gap-2 rounded-xl border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800'>
                <Lightbulb className='h-4 w-4' />
                {answerType === 'Fill in the Blank'
                  ? 'Satu jawaban kunci disimpan ke server (teks persis, biasanya dicek tanpa membedakan huruf besar/kecil).'
                    : answerType === 'Ordering'
                    ? 'Urutan disimpan sebagai segmen dipisah tanda | sesuai banyaknya langkah di atas (bisa ditambah).'
                    : answerType === 'Matching'
                      ? 'Kunci = pasangan kiri|kanan yang Anda tandai (format disimpan ke server).'
                      : answerType === 'True/False'
                        ? 'Pilih satu opsi sebagai jawaban benar (label bisa Anda ubah).'
                        : 'Centang satu opsi sebagai jawaban benar — disimpan sebagai kunci di server.'}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
