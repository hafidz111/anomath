import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { PuzzleBuilderEmbedded } from '@/features/teacher/puzzle-builder-embedded';
import { PuzzleLivePreview } from '@/features/teacher/puzzle-live-preview';
import { toast } from 'sonner';
import {
  BookOpen,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  CloudUpload,
  Eye,
  Lightbulb,
  Save,
} from 'lucide-react';

import { CaseBuilderFormSkeleton } from '@/components/common/page-skeletons';
import { TeacherTopBar } from '@/components/teacher/teacher-top-bar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
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
import { fetchMe } from '@/lib/api/auth';
import {
  fetchAdminClass,
  fetchAdminClasses,
  updateAdminClass,
} from '@/lib/api/admin';
import {
  createCase,
  getCase,
  getCaseRecordApiId,
  listCases,
  updateCase,
} from '@/lib/api/cases';

function buildClassCode(c) {
  return (
    c.join_code ||
    c.code ||
    c.class_code ||
    `${String(c.name || '')
      .toUpperCase()
      .replaceAll(/\s+/g, '-')}-${c.id}`
  );
}

const CASE_THEMES = [
  'from-blue-100 to-blue-50 border-blue-200',
  'from-purple-100 to-purple-50 border-purple-200',
  'from-yellow-100 to-yellow-50 border-yellow-200',
];

function sortPuzzlesByOrder(list) {
  return [...list].sort((a, b) => {
    const oa = Number(a?.order);
    const ob = Number(b?.order);
    if (Number.isFinite(oa) && Number.isFinite(ob) && oa !== ob) return oa - ob;
    return String(a?.id ?? '').localeCompare(String(b?.id ?? ''));
  });
}

const BUILDER_STEPS = [
  { key: 'info', label: 'Case Info' },
  { key: 'story', label: 'Story' },
  { key: 'puzzles', label: 'Puzzles' },
  { key: 'validation', label: 'Validation' },
  { key: 'publish', label: 'Publish' },
];

const STEP_URL_KEYS = BUILDER_STEPS.map((s) => s.key);

/** Nilai query `?step=` → indeks wizard */
const BUILDER_STEP_QUERY = {
  info: 0,
  story: 1,
  puzzles: 2,
  validation: 3,
  publish: 4,
};

/** Deskripsi minimal untuk POST/PUT draft sebelum cerita panjang diisi (API tidak memaksa panjang). */
const PLACEHOLDER_CASE_DESCRIPTION =
  'Draft case.\n\nBelum ada cerita lengkap.\n\nLengkapi nanti di Case Builder.';

/** Batas bawah "Number of stages" di Case Info (tidak boleh di bawah ini). */
const MIN_STAGES_PLANNED = 3;

function buildBuilderMetaObject(stages, timeScope, caseTimeMinutes) {
  return {
    stages: String(stages ?? ''),
    timeScope: String(timeScope ?? ''),
    caseTimeMinutes: String(caseTimeMinutes ?? ''),
  };
}

/** Untuk PUT/POST draft: langkah wizard + meta yang tidak ada kolom di model Case. */
function buildDraftAutosavePayloadParts(
  builderStepIndex,
  stages,
  timeScope,
  caseTimeMinutes,
) {
  const key = BUILDER_STEPS[builderStepIndex]?.key ?? 'info';
  return {
    builder_step: key,
    builder_meta: buildBuilderMetaObject(stages, timeScope, caseTimeMinutes),
  };
}

function normalizeBuilderMetaFromServer(meta) {
  const m = meta && typeof meta === 'object' ? meta : {};
  return buildBuilderMetaObject(m.stages, m.timeScope, m.caseTimeMinutes);
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

export default function CaseBuilder() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const classCodeParam = searchParams.get('classCode') || '';
  const caseUuidParam = searchParams.get('caseUuid') || '';
  const stepQuery = searchParams.get('step') || '';
  const puzzleIdParam = searchParams.get('puzzleId') || '';

  const [caseTitle, setCaseTitle] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [stages, setStages] = useState('3');
  const [storyIntro, setStoryIntro] = useState('');
  const [clueNarrative, setClueNarrative] = useState('');
  const [finalObjective, setFinalObjective] = useState('');
  const [targetClass, setTargetClass] = useState('');
  const [classOptions, setClassOptions] = useState([]);
  const [myCasesPreview, setMyCasesPreview] = useState([]);
  const [caseLoaded, setCaseLoaded] = useState(!caseUuidParam);
  /** `undefined` = sedang muat / belum fetch */
  const [casePuzzles, setCasePuzzles] = useState(undefined);
  /** Payload pratinjau dari `PuzzleBuilderEmbedded` (mode edit); null di mode daftar */
  const [puzzleLivePreview, setPuzzleLivePreview] = useState(null);
  /** Checklist Simpan puzzle di sidebar (mode edit) */
  const [puzzleEditorMeta, setPuzzleEditorMeta] = useState(null);
  const puzzleEditorActionsRef = useRef({
    save: () => {},
    cancel: () => {},
  });
  /** `case` = satu durasi total; `perPuzzle` = field waktu di tiap puzzle */
  const [timeScope, setTimeScope] = useState('perPuzzle');
  const [caseTimeMinutes, setCaseTimeMinutes] = useState('');
  const [builderStep, setBuilderStep] = useState(() =>
    stepQuery && BUILDER_STEP_QUERY[stepQuery] !== undefined
      ? BUILDER_STEP_QUERY[stepQuery]
      : 0,
  );

  /**
   * Tab hijau: hanya tahap yang sudah dilewati (Lanjut / navigasi), bukan karena data
   * tahap belakang (mis. puzzle) sudah terpenuhi.
   */
  const [maxVisitedStepIndex, setMaxVisitedStepIndex] = useState(() =>
    stepQuery && BUILDER_STEP_QUERY[stepQuery] !== undefined
      ? BUILDER_STEP_QUERY[stepQuery]
      : 0,
  );

  /** Tahap puzzle: `edit` = form terbuka — wajib simpan/batal sebelum Lanjut. */
  const [puzzleBuilderUiMode, setPuzzleBuilderUiMode] = useState('list');

  const [stepsPassed, setStepsPassed] = useState(() => [
    false,
    false,
    false,
    false,
    false,
  ]);

  /** Form siap dipakai setelah muat dari server (atau langsung untuk case baru tanpa UUID). */
  const [draftHydrated, setDraftHydrated] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  /** Status draft di API (bukan draft lokal perangkat). */
  const [caseIsDraft, setCaseIsDraft] = useState(false);

  /** Hindari skeleton penuh saat `caseUuid` baru dari POST draft (state sudah diisi dari response). */
  const skipNextCaseFetchUnloadRef = useRef(false);
  /** Kartu "Case Anda (server)" — fetch sekali per kunjungan tahap 4. */
  const myCasesPreviewFetchStartedRef = useRef(false);

  /**
   * Indeks tahap wizard tertinggi yang sudah pernah disimpan di server (draft).
   * Dipakai untuk melonggarkan tombol Lanjut / canReachStep agar tidak terkunci
   * oleh validasi form yang tidak match data lama setelah load.
   */
  const [draftWizardCeiling, setDraftWizardCeiling] = useState(-1);

  const formSnapshotRef = useRef({
    stepInfoComplete: false,
    caseTitle: '',
    difficulty: '',
    descriptionCombined: '',
    descriptionForApi: PLACEHOLDER_CASE_DESCRIPTION,
    builderStep: 0,
    stages: '',
    timeScope: '',
    caseTimeMinutes: '',
  });

  useEffect(() => {
    if (!caseUuidParam) setCaseIsDraft(false);
  }, [caseUuidParam]);

  const stepInfoComplete = useMemo(() => {
    const diff = difficulty.toLowerCase();
    const stagesNum = Number.parseInt(String(stages).trim(), 10);
    const caseMinutes = Number.parseInt(String(caseTimeMinutes).trim(), 10);
    return (
      caseTitle.trim().length >= 3 &&
      ['easy', 'medium', 'hard'].includes(diff) &&
      Number.isFinite(stagesNum) &&
      stagesNum >= MIN_STAGES_PLANNED &&
      (timeScope === 'perPuzzle' ||
        (timeScope === 'case' &&
          Number.isFinite(caseMinutes) &&
          caseMinutes >= 1))
    );
  }, [caseTitle, difficulty, stages, timeScope, caseTimeMinutes]);

  useEffect(() => {
    if (builderStep !== 2) {
      setPuzzleLivePreview(null);
      setPuzzleEditorMeta(null);
    }
  }, [builderStep]);

  /** Daftar kelas: butuh segera jika ada `classCode` di URL; jika tidak, baru saat tahap Validasi (≥3). */
  useEffect(() => {
    const needForUrl = Boolean(classCodeParam);
    const needForValidation = !classCodeParam && builderStep >= 3;
    if (!needForUrl && !needForValidation) return;
    if (classOptions.length > 0) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchAdminClasses({ page_size: 500 });
        const classes = data?.classes ?? [];
        if (!cancelled) {
          setClassOptions(
            classes.map((c) => ({
              id: String(c.id),
              name: c.name,
              code: buildClassCode(c),
            })),
          );
        }
      } catch {
        if (!cancelled) setClassOptions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [classCodeParam, builderStep, classOptions.length]);

  useEffect(() => {
    if (!classCodeParam || !classOptions.length) return;
    const found = classOptions.find(
      (c) => c.code === classCodeParam || c.id === classCodeParam,
    );
    if (found) setTargetClass(found.id);
  }, [classCodeParam, classOptions]);

  useEffect(() => {
    myCasesPreviewFetchStartedRef.current = false;
  }, [caseUuidParam]);

  /** Pratinjau "Case Anda (server)" hanya di tahap Publish. */
  useEffect(() => {
    if (builderStep !== 4) return;
    if (myCasesPreviewFetchStartedRef.current) return;
    myCasesPreviewFetchStartedRef.current = true;
    let cancelled = false;
    (async () => {
      try {
        const me = await fetchMe();
        const casesData = await listCases({ page_size: 200 });
        const mine = (casesData?.cases ?? []).filter(
          (c) => String(c.created_by) === String(me.id),
        );
        if (!cancelled) setMyCasesPreview(mine.slice(0, 8));
      } catch {
        if (!cancelled) setMyCasesPreview([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [builderStep]);

  const applyServerCaseToBuilderState = useCallback(
    (c, opts = {}) => {
      if (!c || typeof c !== 'object') return;
      const syncStepFromServer = opts.syncStepFromServer === true;
      setCaseTitle(c.title || '');
      const desc = String(c.description || '');
      const parts = desc.split(/\n\n+/);
      setStoryIntro(parts[0] || '');
      setClueNarrative(parts[1] || '');
      setFinalObjective(parts.slice(2).join('\n\n') || '');
      setDifficulty(
        String(c.difficulty || 'medium').replace(/^\w/, (ch) =>
          ch.toUpperCase(),
        ),
      );
      setCaseIsDraft(Boolean(c.is_draft));
      setCasePuzzles(sortPuzzlesByOrder(c.puzzles ?? []));

      if (c.builder_meta != null && typeof c.builder_meta === 'object') {
        const m = c.builder_meta;
        if ('stages' in m) setStages(String(m.stages ?? ''));
        if ('timeScope' in m) setTimeScope(String(m.timeScope ?? ''));
        if ('caseTimeMinutes' in m) {
          setCaseTimeMinutes(String(m.caseTimeMinutes ?? ''));
        }
      }

      const stepKey =
        typeof c.builder_step === 'string' ? c.builder_step.trim() : '';
      const stepIdx =
        stepKey && BUILDER_STEP_QUERY[stepKey] !== undefined
          ? BUILDER_STEP_QUERY[stepKey]
          : -1;

      /** Query `?step=` saat GET case selesai — utamakan di atas `builder_step` server agar tab Puzzles / puzzleId tidak tertimpa. */
      const urlWizardIndex = opts.urlWizardIndex;

      if (syncStepFromServer) {
        const urlOk =
          typeof urlWizardIndex === 'number' &&
          urlWizardIndex >= 0 &&
          urlWizardIndex < BUILDER_STEPS.length;
        const serverOk = stepIdx >= 0;
        const targetIdx = urlOk ? urlWizardIndex : serverOk ? stepIdx : -1;
        if (targetIdx >= 0) {
          setBuilderStep(targetIdx);
          setSearchParams((prev) => {
            const n = new URLSearchParams(prev);
            n.set('step', STEP_URL_KEYS[targetIdx]);
            if (targetIdx !== 2) n.delete('puzzleId');
            return n;
          }, { replace: true });
          if (c.is_draft) {
            setStepsPassed((prev) =>
              prev.map((p, i) => p || i <= targetIdx),
            );
          }
        }
        setMaxVisitedStepIndex((m) =>
          Math.max(
            m,
            targetIdx >= 0 ? targetIdx : 0,
            stepIdx >= 0 ? stepIdx : 0,
          ),
        );
      } else if (stepIdx >= 0) {
        setMaxVisitedStepIndex((m) => Math.max(m, stepIdx));
      }

      if (c.is_draft) {
        setDraftWizardCeiling((prev) =>
          Math.max(prev, stepIdx >= 0 ? stepIdx : 4),
        );
      } else {
        setDraftWizardCeiling(-1);
      }
    },
    [setSearchParams],
  );

  /** Hindari GET case ulang saat ganti `?step=` — jangan taruh callback di deps efek fetch. */
  const applyCaseFromServerRef = useRef(applyServerCaseToBuilderState);
  applyCaseFromServerRef.current = applyServerCaseToBuilderState;

  useEffect(() => {
    if (!caseUuidParam) {
      setDraftWizardCeiling(-1);
      return;
    }

    let cancelled = false;
    const holdUi = skipNextCaseFetchUnloadRef.current;
    skipNextCaseFetchUnloadRef.current = false;
    if (!holdUi) {
      setCaseLoaded(false);
      setDraftWizardCeiling(-1);
      setMaxVisitedStepIndex(0);
    }

    (async () => {
      if (holdUi) {
        if (!cancelled) {
          setDraftHydrated(true);
          setCaseLoaded(true);
        }
        return;
      }
      try {
        const c = await getCase(caseUuidParam);
        if (cancelled || !c) return;
        const sp = new URLSearchParams(
          typeof window !== 'undefined' ? window.location.search : '',
        );
        const stepFromUrl = sp.get('step') || '';
        const urlWizardIndex =
          stepFromUrl && BUILDER_STEP_QUERY[stepFromUrl] !== undefined
            ? BUILDER_STEP_QUERY[stepFromUrl]
            : undefined;
        applyCaseFromServerRef.current(c, {
          syncStepFromServer: true,
          urlWizardIndex,
        });
      } catch {
        if (!cancelled) {
          toast.error('Gagal memuat case untuk edit.');
          setCaseIsDraft(false);
        }
      } finally {
        if (cancelled) return;
        setDraftHydrated(true);
        setCaseLoaded(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [caseUuidParam]);

  useLayoutEffect(() => {
    if (!caseUuidParam) {
      setDraftHydrated(true);
    } else {
      setDraftHydrated(false);
    }
  }, [caseUuidParam]);

  useEffect(() => {
    if (!caseUuidParam) setCasePuzzles(undefined);
  }, [caseUuidParam]);

  useEffect(() => {
    if (caseUuidParam) return;
    const idx =
      stepQuery && BUILDER_STEP_QUERY[stepQuery] !== undefined
        ? BUILDER_STEP_QUERY[stepQuery]
        : 0;
    setMaxVisitedStepIndex((m) => Math.max(m, idx));
  }, [caseUuidParam, stepQuery]);

  useEffect(() => {
    if (builderStep !== 2) setPuzzleBuilderUiMode('list');
  }, [builderStep]);

  /** Minimal stages = max(3, jumlah puzzle yang sudah ada di case ini). */
  const minStagesFloor = useMemo(() => {
    const pc =
      caseUuidParam && Array.isArray(casePuzzles) ? casePuzzles.length : 0;
    return Math.max(MIN_STAGES_PLANNED, pc);
  }, [caseUuidParam, casePuzzles]);

  const stageCount = Math.max(0, Number.parseInt(String(stages), 10) || 0);
  const plannedPuzzleSlots = Math.max(
    minStagesFloor,
    stageCount || minStagesFloor,
  );

  const handleStagesInputBlur = useCallback(() => {
    const n = Number.parseInt(String(stages).trim(), 10);
    if (!Number.isFinite(n)) return;
    if (n < minStagesFloor) {
      toast.error(
        `Jumlah tahap minimal ${minStagesFloor} (wajib ≥ ${MIN_STAGES_PLANNED}${casePuzzles?.length ? ` dan ≥ ${casePuzzles.length} puzzle yang sudah ada` : ''}).`,
      );
      setStages(String(minStagesFloor));
    }
  }, [stages, minStagesFloor, casePuzzles]);

  /** Sinkron: stages tidak boleh di bawah 3 atau di bawah jumlah puzzle. */
  useEffect(() => {
    const pc =
      caseUuidParam && Array.isArray(casePuzzles) ? casePuzzles.length : 0;
    const floor = Math.max(MIN_STAGES_PLANNED, pc);
    setStages((prev) => {
      const sn = Number.parseInt(String(prev).trim(), 10);
      if (!Number.isFinite(sn)) return prev;
      if (sn >= floor) return prev;
      return String(floor);
    });
  }, [caseUuidParam, casePuzzles]);

  const descriptionCombined = useMemo(
    () =>
      [storyIntro, clueNarrative, finalObjective].join('\n\n').trim(),
    [storyIntro, clueNarrative, finalObjective],
  );

  useLayoutEffect(() => {
    formSnapshotRef.current = {
      stepInfoComplete,
      caseTitle,
      difficulty,
      descriptionCombined,
      descriptionForApi:
        descriptionCombined.length >= 10
          ? descriptionCombined
          : PLACEHOLDER_CASE_DESCRIPTION,
      builderStep,
      stages,
      timeScope,
      caseTimeMinutes,
    };
  }, [
    stepInfoComplete,
    caseTitle,
    difficulty,
    descriptionCombined,
    builderStep,
    stages,
    timeScope,
    caseTimeMinutes,
  ]);

  const checks = [
    { label: 'Judul case', ok: caseTitle.trim().length >= 5 },
    { label: 'Cerita pembuka', ok: storyIntro.trim().length >= 20 },
    { label: 'Tujuan akhir', ok: finalObjective.trim().length >= 12 },
    { label: 'Minimum 3 tahap (rencana)', ok: stageCount >= 3 },
  ];
  const classAttachOk =
    Boolean(classCodeParam) || Boolean(targetClass) || Boolean(caseUuidParam);
  /** Centang hijau Validasi: kelas/URL — bukan cuma karena case sudah ada di server. */
  const classStrict =
    Boolean(classCodeParam) || Boolean(String(targetClass || '').trim());
  const classCheckLabel = caseUuidParam
    ? 'Mode edit (kelas tidak perlu dipilih ulang)'
    : classCodeParam
      ? 'Kelas dari URL (akan ditautkan saat simpan)'
      : 'Kelas dipilih untuk menautkan case';
  const readyToPublish = checks.every((item) => item.ok) && classAttachOk;

  /**
   * Syarat per tahap untuk Lanjut / canReachStep (bukan AND kumulatif).
   * Draft: tahap di bawah `draftWizardCeiling` dari server dianggap sudah boleh dilewati
   * agar Next/Back tidak terkunci setelah load.
   */
  const navigableComplete = useMemo(() => {
    const storyOkStrict =
      storyIntro.trim().length >= 20 &&
      clueNarrative.trim().length >= 10 &&
      finalObjective.trim().length >= 12;
    const storyOk =
      storyOkStrict ||
      (Boolean(caseUuidParam) &&
        caseIsDraft &&
        descriptionCombined.length >= 10);
    const puzzlesStepOk =
      Boolean(caseUuidParam) &&
      puzzleBuilderUiMode === 'list' &&
      Array.isArray(casePuzzles) &&
      casePuzzles.length === plannedPuzzleSlots;
    const classNavOk = classStrict || Boolean(caseUuidParam);
    const diff = difficulty.toLowerCase();
    const publishOk =
      ['easy', 'medium', 'hard'].includes(diff) &&
      caseTitle.trim().length >= 3 &&
      descriptionCombined.length >= 10;
    const raw = [
      stepInfoComplete,
      storyOk,
      puzzlesStepOk,
      classNavOk,
      publishOk,
    ];
    const relaxDraft =
      caseIsDraft && Boolean(caseUuidParam) && draftWizardCeiling >= 0;
    return raw.map((v, i) => {
      if (
        relaxDraft &&
        i < draftWizardCeiling &&
        (i === 0 || i === 1)
      ) {
        return true;
      }
      return v;
    });
  }, [
    stepInfoComplete,
    storyIntro,
    clueNarrative,
    finalObjective,
    descriptionCombined,
    caseUuidParam,
    caseIsDraft,
    casePuzzles,
    puzzleBuilderUiMode,
    plannedPuzzleSlots,
    classStrict,
    difficulty,
    caseTitle,
    draftWizardCeiling,
  ]);

  useEffect(() => {
    setStepsPassed((prev) => {
      let ch = false;
      const next = prev.map((p, i) => {
        const v = p || navigableComplete[i];
        if (v !== p) ch = true;
        return v;
      });
      return ch ? next : prev;
    });
  }, [navigableComplete]);

  /**
   * Navigasi maju: gabungkan `stepsPassed` dengan `navigableComplete` supaya tidak ada
   * satu frame di mana efek URL memaksa mundur karena `setStepsPassed` belum jalan.
   */
  const canReachStep = useCallback(
    (j) => {
      for (let k = 0; k < j; k += 1) {
        if (!stepsPassed[k] && !navigableComplete[k]) return false;
      }
      return true;
    },
    [stepsPassed, navigableComplete],
  );

  const firstIncompleteStepIndex = useCallback(() => {
    for (let k = 0; k < BUILDER_STEPS.length; k += 1) {
      if (!stepsPassed[k] && !navigableComplete[k]) return k;
    }
    return BUILDER_STEPS.length - 1;
  }, [stepsPassed, navigableComplete]);

  /** Minimal sama dengan validasi di `handlePublishToServer` (bukan checklist kualitas). Kelas opsional. */
  const canSaveCaseToServer = (() => {
    const diff = difficulty.toLowerCase();
    const base =
      ['easy', 'medium', 'hard'].includes(diff) &&
      caseTitle.trim().length >= 3 &&
      descriptionCombined.length >= 10;
    if (!base) return false;
    if (caseUuidParam && caseIsDraft) {
      return (
        puzzleBuilderUiMode === 'list' &&
        Array.isArray(casePuzzles) &&
        casePuzzles.length === plannedPuzzleSlots
      );
    }
    return true;
  })();

  const publishPrimaryLabel =
    caseUuidParam && caseIsDraft
      ? 'Terbitkan case'
      : caseUuidParam
        ? 'Simpan perubahan'
        : 'Simpan case & buka tambah puzzle';
  /** Label singkat di top bar untuk case baru (layar sempit). */
  const publishTopBarLabel =
    caseUuidParam && caseIsDraft
      ? 'Terbitkan case'
      : caseUuidParam
        ? 'Simpan perubahan'
        : 'Simpan case';

  const forceStep = useCallback(
    (index) => {
      if (index < 0 || index >= BUILDER_STEPS.length) return;
      setMaxVisitedStepIndex((m) => Math.max(m, index));
      setBuilderStep(index);
      setSearchParams(
        (prev) => {
          const n = new URLSearchParams(prev);
          n.set('step', STEP_URL_KEYS[index]);
          if (index !== 2) n.delete('puzzleId');
          return n;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const goToStepIndex = useCallback(
    (index) => {
      if (index < 0 || index >= BUILDER_STEPS.length) return;
      if (index === builderStep) return;
      if (builderStep === 2 && puzzleBuilderUiMode !== 'list' && index !== 2) {
        toast.error(
          'Tutup editor puzzle dulu (Simpan atau Batal) sebelum pindah tahap atau kembali.',
        );
        return;
      }
      if (index < builderStep) {
        forceStep(index);
        return;
      }
      if (!canReachStep(index)) {
        if (builderStep === 2 && index > 2) {
          toast.error(
            `Simpan atau batalkan editor puzzle. Lalu pastikan ada tepat ${plannedPuzzleSlots} puzzle tersimpan (sama dengan Number of stages) sebelum lanjut.`,
            { duration: 6000 },
          );
          return;
        }
        let bad = -1;
        for (let k = 0; k < index; k += 1) {
          if (!stepsPassed[k] && !navigableComplete[k]) {
            bad = k;
            break;
          }
        }
        const label =
          BUILDER_STEPS[bad >= 0 ? bad : 0]?.label ?? 'sebelumnya';
        toast.error(
          `Selesaikan dulu tahap "${label}" (belum pernah dilengkapi penuh).`,
        );
        return;
      }
      forceStep(index);
    },
    [
      builderStep,
      puzzleBuilderUiMode,
      forceStep,
      canReachStep,
      stepsPassed,
      navigableComplete,
      plannedPuzzleSlots,
    ],
  );

  useEffect(() => {
    if (!caseLoaded) return;
    if (!stepQuery || BUILDER_STEP_QUERY[stepQuery] === undefined) return;
    const idx = BUILDER_STEP_QUERY[stepQuery];
    if (!canReachStep(idx)) {
      const target = firstIncompleteStepIndex();
      setMaxVisitedStepIndex((m) => Math.max(m, target));
      setBuilderStep(target);
      setSearchParams(
        (prev) => {
          const n = new URLSearchParams(prev);
          n.set('step', STEP_URL_KEYS[target]);
          if (target !== 2) n.delete('puzzleId');
          return n;
        },
        { replace: true },
      );
      toast.error(
        'Beberapa tahap belum lengkap. Membuka tahap pertama yang perlu dilengkapi.',
      );
      return;
    }
    setMaxVisitedStepIndex((m) => Math.max(m, idx));
    setBuilderStep(idx);
  }, [
    caseLoaded,
    stepQuery,
    setSearchParams,
    canReachStep,
    firstIncompleteStepIndex,
    stepsPassed,
  ]);

  useEffect(() => {
    if (!caseLoaded) return;
    if (!canReachStep(builderStep)) {
      const target = firstIncompleteStepIndex();
      setMaxVisitedStepIndex((m) => Math.max(m, target));
      setBuilderStep(target);
      setSearchParams(
        (prev) => {
          const n = new URLSearchParams(prev);
          n.set('step', STEP_URL_KEYS[target]);
          if (target !== 2) n.delete('puzzleId');
          return n;
        },
        { replace: true },
      );
    }
  }, [
    caseLoaded,
    builderStep,
    canReachStep,
    firstIncompleteStepIndex,
    setSearchParams,
    stepsPassed,
  ]);

  function goToCaseBuilderWithCase(caseId) {
    const next = new URLSearchParams();
    next.set('caseUuid', String(caseId));
    if (classCodeParam) next.set('classCode', classCodeParam);
    next.set('step', 'puzzles');
    next.delete('puzzleId');
    setSearchParams(next, { replace: true });
    setMaxVisitedStepIndex((m) => Math.max(m, 2));
    setBuilderStep(2);
  }

  const setPuzzleIdInUrl = (id) => {
    const next = new URLSearchParams(searchParams);
    if (id) next.set('puzzleId', String(id));
    else next.delete('puzzleId');
    next.set('step', 'puzzles');
    setSearchParams(next, { replace: true });
  };

  const handlePuzzleLivePreview = useCallback((data) => {
    setPuzzleLivePreview(data);
  }, []);

  const handlePuzzleEditorMeta = useCallback((meta) => {
    setPuzzleEditorMeta(meta);
  }, []);

  const attachCaseToClassroom = useCallback(
    async (caseId) => {
      const mergeIds = async (classId) => {
        const detail = await fetchAdminClass(classId);
        const existingIds = (detail?.cases ?? [])
          .map((c) => getCaseRecordApiId(c))
          .filter(Boolean);
        if (existingIds.includes(String(caseId))) return;
        await updateAdminClass(classId, {
          case_ids: [...existingIds, caseId],
        });
      };

      if (classCodeParam) {
        let rows = classOptions;
        if (rows.length === 0) {
          try {
            const data = await fetchAdminClasses({ page_size: 500 });
            rows = (data?.classes ?? []).map((c) => ({
              id: String(c.id),
              name: c.name,
              code: buildClassCode(c),
            }));
            setClassOptions(rows);
          } catch {
            rows = [];
          }
        }
        const found = rows.find(
          (c) =>
            c.code === classCodeParam || c.id === classCodeParam,
        );
        if (found) {
          await mergeIds(found.id);
          return true;
        }
        toast.warning(
          'Case dibuat, tetapi kelas dari URL tidak ditemukan. Pasang case dari menu detail kelas.',
        );
        return false;
      }
      if (targetClass) {
        await mergeIds(targetClass);
        return true;
      }
      return false;
    },
    [classCodeParam, targetClass, classOptions],
  );

  const createCaseWithFirstPuzzleForEmbedded = async () => {
    throw new Error('DRAFT_FIRST');
  };

  const handlePublishToServer = async () => {
    const diff = difficulty.toLowerCase();
    if (!['easy', 'medium', 'hard'].includes(diff)) {
      toast.error('Pilih tingkat kesulitan (Easy/Medium/Hard).');
      return;
    }
    const description = descriptionCombined;
    if (caseTitle.trim().length < 3 || description.length < 10) {
      toast.error('Judul dan deskripsi terlalu pendek.');
      return;
    }
    const loadingId = toast.loading('Menyimpan case ke server…');
    const wasDraftBeforeSave = caseIsDraft;
    try {
      let data;
      if (caseUuidParam) {
        data = await updateCase(caseUuidParam, {
          title: caseTitle.trim(),
          description,
          difficulty: diff,
          is_draft: false,
          ...buildDraftAutosavePayloadParts(
            2,
            stages,
            timeScope,
            caseTimeMinutes,
          ),
        });
        try {
          await attachCaseToClassroom(data.id ?? caseUuidParam);
        } catch {
          if (classCodeParam || targetClass) {
            toast.warning(
              'Case terbit, tetapi menaut ke kelas gagal. Pasangkan dari detail kelas.',
            );
          }
        }
      } else {
        data = await createCase({
          title: caseTitle.trim(),
          description,
          difficulty: diff,
          is_draft: false,
          ...buildDraftAutosavePayloadParts(
            2,
            stages,
            timeScope,
            caseTimeMinutes,
          ),
        });
        setCaseIsDraft(Boolean(data.is_draft));
        const attached = await attachCaseToClassroom(data.id);
        toast.dismiss(loadingId);
        if (attached) {
          toast.success(
            'Case dibuat dan terpasang ke kelas. Kelola puzzle dari Case Builder lewat case di kelas.',
          );
        } else {
          toast.success(
            'Case dibuat. Tautkan ke kelas dari detail kelas bila perlu, lalu tambahkan puzzle.',
          );
        }
        if (classCodeParam) {
          navigate(
            `/teacher/classes/${encodeURIComponent(classCodeParam)}`,
            { replace: true },
          );
        } else {
          goToCaseBuilderWithCase(data.id);
        }
        return;
      }
      toast.dismiss(loadingId);
      setCaseIsDraft(Boolean(data?.is_draft));

      const nowPublished =
        data?.is_draft === false || String(data?.is_draft).toLowerCase() === 'false';

      if (wasDraftBeforeSave && nowPublished) {
        toast.success('Case diterbitkan.');
        if (classCodeParam) {
          navigate(
            `/teacher/classes/${encodeURIComponent(classCodeParam)}`,
            { replace: true },
          );
        } else {
          navigate('/teacher', { replace: true });
        }
        return;
      }

      if (!wasDraftBeforeSave) {
        toast.success('Perubahan tersimpan.');
      } else {
        toast.success('Case diperbarui.');
      }
      if (classCodeParam) {
        navigate(
          `/teacher/classes/${encodeURIComponent(classCodeParam)}`,
          { replace: true },
        );
      } else {
        navigate('/teacher', { replace: true });
      }
    } catch (e) {
      toast.dismiss(loadingId);
      const msg = e instanceof Error ? e.message : 'Gagal menyimpan';
      toast.error(msg);
      if (
        typeof msg === 'string' &&
        msg.toLowerCase().includes('case draft')
      ) {
        toast.message(
          'Buka case draft yang ada, gunakan tahap terakhir untuk menerbitkan, atau hapus dari detail kelas.',
          { duration: 6000 },
        );
      }
    }
  };

  const backTo = classCodeParam
    ? `/teacher/classes/${encodeURIComponent(classCodeParam)}`
    : '/teacher';
  const backLabel = classCodeParam ? 'Detail kelas' : 'Dashboard';

  /** Sinkron daftar puzzle dari Puzzle Builder tanpa GET case (sudah di-fetch sekali saat buka edit). */
  const syncPuzzlesFromChild = useCallback((list) => {
    setCasePuzzles(sortPuzzlesByOrder(Array.isArray(list) ? list : []));
  }, []);

  const handleSaveDraftToServer = useCallback(async () => {
    if (!caseLoaded || !draftHydrated) {
      toast.error('Tunggu hingga form siap.');
      return;
    }
    if (!caseUuidParam) {
      if (!stepInfoComplete) {
        toast.error(
          'Lengkapi Case Info (judul, sulit, jumlah tahap, waktu) sebelum menyimpan draft.',
        );
        return;
      }
      const diff = difficulty.toLowerCase();
      if (!['easy', 'medium', 'hard'].includes(diff)) {
        toast.error('Pilih tingkat kesulitan.');
        return;
      }
      const desc =
        descriptionCombined.length >= 10
          ? descriptionCombined
          : PLACEHOLDER_CASE_DESCRIPTION;
      const loadingId = toast.loading('Menyimpan draft ke server…');
      try {
        const data = await createCase({
          title: caseTitle.trim(),
          description: desc,
          difficulty: diff,
          is_draft: true,
          ...buildDraftAutosavePayloadParts(
            builderStep,
            stages,
            timeScope,
            caseTimeMinutes,
          ),
        });
        applyServerCaseToBuilderState(data, { syncStepFromServer: false });
        try {
          await attachCaseToClassroom(data.id);
        } catch {
          toast.warning(
            'Draft tersimpan; menaut ke kelas gagal. Pasangkan dari detail kelas.',
          );
        }
        toast.dismiss(loadingId);
        if (classCodeParam) {
          toast.success('Draft tersimpan.');
          navigate(
            `/teacher/classes/${encodeURIComponent(classCodeParam)}`,
            { replace: true },
          );
          return;
        }
        skipNextCaseFetchUnloadRef.current = true;
        setSearchParams((prev) => {
          const n = new URLSearchParams(prev);
          n.set('caseUuid', String(data.id));
          return n;
        }, { replace: true });
        toast.success('Draft tersimpan. Lanjutkan mengisi atau tutup halaman.');
      } catch (e) {
        toast.dismiss(loadingId);
        const msg = e instanceof Error ? e.message : 'Gagal menyimpan draft';
        toast.error(msg);
        if (
          typeof msg === 'string' &&
          msg.toLowerCase().includes('case draft')
        ) {
          toast.info('Selesaikan atau hapus draft lain dulu.', {
            duration: 5000,
          });
        }
      }
      return;
    }
    if (!caseIsDraft) {
      toast.info(
        'Case sudah terbit. Gunakan tombol simpan / terbitkan di tahap terakhir.',
      );
      return;
    }
    const diff = difficulty.toLowerCase();
    if (!['easy', 'medium', 'hard'].includes(diff)) {
      toast.error('Pilih tingkat kesulitan.');
      return;
    }
    const desc =
      descriptionCombined.length >= 10
        ? descriptionCombined
        : PLACEHOLDER_CASE_DESCRIPTION;
    const payload = {
      title: caseTitle.trim(),
      description: desc,
      difficulty: diff,
      is_draft: true,
      ...buildDraftAutosavePayloadParts(
        builderStep,
        stages,
        timeScope,
        caseTimeMinutes,
      ),
    };
    const loadingId = toast.loading('Menyimpan draft…');
    try {
      const updated = await updateCase(caseUuidParam, payload);
      applyServerCaseToBuilderState(updated, { syncStepFromServer: false });
      toast.dismiss(loadingId);
      toast.success('Draft tersimpan (isi + tahap wizard).');
      try {
        await attachCaseToClassroom(caseUuidParam);
      } catch {
        if (classCodeParam || targetClass) {
          toast.warning(
            'Draft tersimpan; menaut ke kelas gagal. Muat ulang detail kelas atau pasangkan manual.',
          );
        }
      }
      if (classCodeParam) {
        navigate(
          `/teacher/classes/${encodeURIComponent(classCodeParam)}`,
          { replace: true },
        );
      }
    } catch (e) {
      toast.dismiss(loadingId);
      toast.error(e instanceof Error ? e.message : 'Gagal menyimpan');
    }
  }, [
    caseLoaded,
    draftHydrated,
    caseUuidParam,
    caseIsDraft,
    difficulty,
    descriptionCombined,
    caseTitle,
    builderStep,
    stages,
    timeScope,
    caseTimeMinutes,
    stepInfoComplete,
    attachCaseToClassroom,
    applyServerCaseToBuilderState,
    setSearchParams,
    classCodeParam,
    targetClass,
    navigate,
  ]);

  if (!caseLoaded) {
    return (
      <div className='min-h-screen bg-white'>
        <TeacherTopBar
          title='Case Builder'
          showBackTo={backTo}
          backLabel={backLabel}
        />
        <CaseBuilderFormSkeleton />
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-white'>
      <TeacherTopBar
        title='Case Builder'
        showBackTo={backTo}
        backLabel={backLabel}
        actionsRight={
          <div className='flex flex-wrap items-center justify-end gap-2'>
            <Button
              variant='outline'
              className='rounded-full'
              size='sm'
              type='button'
              title='Kirim isian form + tahap wizard ke server sebagai draft'
              onClick={() => void handleSaveDraftToServer()}
            >
              <Save className='mr-2 h-4 w-4' />
              Simpan draft
            </Button>
            <Button
              variant='outline'
              className='rounded-full'
              size='sm'
              type='button'
              onClick={() => setPreviewOpen(true)}
            >
              <Eye className='mr-2 h-4 w-4' />
              Pratinjau
            </Button>
            {builderStep === BUILDER_STEPS.length - 1 ? (
              <Button
                onClick={handlePublishToServer}
                disabled={!canSaveCaseToServer}
                className='rounded-full bg-linear-to-r from-green-200 to-emerald-200 text-emerald-800 disabled:opacity-50'
                size='sm'
                type='button'
              >
                <CloudUpload className='mr-2 h-4 w-4' />
                {publishTopBarLabel}
              </Button>
            ) : null}
          </div>
        }
      />

      <div className='mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8'>
        <Card className='rounded-2xl border border-purple-200 bg-linear-to-r from-purple-50 to-blue-50 mb-6'>
          <CardContent className='p-4'>
            {caseUuidParam && caseIsDraft ? (
              <div className='mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-amber-200/90 bg-amber-50/95 px-3 py-2 text-xs text-amber-950'>
                <Badge
                  variant='outline'
                  className='border-amber-300 bg-white/90 text-amber-900'
                >
                  Draft server
                </Badge>
                <span>
                  Data tidak dikirim ke server sampai Anda menekan &quot;Simpan
                  draft&quot; — tersimpan apa yang sudah diisi beserta tahap
                  wizard. Satu akun hanya satu draft — terbitkan di tahap
                  terakhir atau hapus case ini di detail kelas sebelum membuat
                  draft baru.
                </span>
              </div>
            ) : null}
            <p className='text-xs font-medium text-gray-500 mb-3'>
              Tahap {builderStep + 1} dari {BUILDER_STEPS.length}
            </p>
            <div className='grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3 text-sm'>
              {BUILDER_STEPS.map((step, index) => {
                const active = index === builderStep;
                /** Centang hanya setelah navigasi melewati tahap (Lanjut / tab), bukan karena syarat belakang sudah terpenuhi. */
                const completed = maxVisitedStepIndex > index;
                const puzzleEditBlocksStepNav =
                  builderStep === 2 && puzzleBuilderUiMode !== 'list';
                const tabDisabled = puzzleEditBlocksStepNav && index !== 2;
                return (
                  <button
                    key={step.key}
                    type='button'
                    disabled={tabDisabled}
                    title={
                      tabDisabled
                        ? 'Tutup editor puzzle dulu (Simpan atau Batal)'
                        : undefined
                    }
                    onClick={() => goToStepIndex(index)}
                    className={`relative rounded-lg border px-2 py-2.5 pr-7 text-left font-medium transition-colors sm:px-3 sm:pr-8 ${
                      tabDisabled
                        ? 'cursor-not-allowed opacity-50'
                        : ''
                    } ${
                      active
                        ? 'border-purple-400 bg-white text-purple-900 ring-2 ring-purple-200'
                        : completed
                          ? 'border-emerald-200 bg-emerald-50/80 text-emerald-900 hover:bg-emerald-50'
                          : 'border-gray-200 bg-white/70 text-gray-600 hover:bg-white'
                    }`}
                  >
                    {completed ? (
                      <CheckCircle
                        className='pointer-events-none absolute right-2 top-2 h-3.5 w-3.5 text-emerald-600 sm:h-4 sm:w-4'
                        aria-hidden
                      />
                    ) : null}
                    <span className='block text-[10px] font-semibold uppercase tracking-wide text-gray-500 sm:text-xs'>
                      {index + 1}
                    </span>
                    <span className='block truncate text-xs sm:text-sm'>
                      {step.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className='grid lg:grid-cols-3 gap-8'>
          <div className='lg:col-span-2 space-y-6'>
            {builderStep === 0 ? (
              <Card className='rounded-3xl border border-gray-200 shadow-sm'>
                <CardContent className='p-8 space-y-6'>
                  <h2 className='text-2xl font-bold text-gray-900'>
                    Case Details
                  </h2>
                  <ExampleFillCallout title='Contoh pengisian (tahap ini)'>
                    <p>
                      <span className='font-medium text-gray-900'>Judul:</span>{' '}
                      Misteri Angka di Laboratorium Seni
                    </p>
                    <p>
                      <span className='font-medium text-gray-900'>
                        Kesulitan:
                      </span>{' '}
                      Medium — cocok untuk kelas yang sudah paham pecahan &amp;
                      persamaan sederhana.
                    </p>
                    <p>
                      <span className='font-medium text-gray-900'>
                        Jumlah tahap:
                      </span>{' '}
                      4 — artinya Anda merencanakan sekitar empat puzzle /
                      langkah investigasi (boleh disesuaikan).
                    </p>
                  </ExampleFillCallout>
                  <div className='space-y-2'>
                    <Label>Case Title</Label>
                    <Input
                      value={caseTitle}
                      onChange={(e) => setCaseTitle(e.target.value)}
                      className='bg-gray-50'
                      placeholder='Contoh: Misteri Angka di Laboratorium Seni'
                    />
                  </div>
                  <p className='text-xs text-gray-500'>
                    Deskripsi penuh di server = cerita pembuka + narasi clue +
                    tujuan akhir (diisi di tahap Story).
                  </p>
                    <div className='grid sm:grid-cols-2 gap-4'>
                    <div className='space-y-2'>
                      <Label>Difficulty Level</Label>
                      <Select
                        value={difficulty || undefined}
                        onValueChange={setDifficulty}
                      >
                        <SelectTrigger className='bg-gray-50'>
                          <SelectValue placeholder='Contoh: Medium' />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value='Easy'>Easy</SelectItem>
                          <SelectItem value='Medium'>Medium</SelectItem>
                          <SelectItem value='Hard'>Hard</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className='space-y-2'>
                      <Label>Number of Stages</Label>
                      <Input
                        type='number'
                        min={minStagesFloor}
                        value={stages}
                        onChange={(e) => setStages(e.target.value)}
                        onBlur={handleStagesInputBlur}
                        className='bg-gray-50'
                        placeholder='Contoh: 4'
                      />
                      <p className='text-xs text-gray-600'>
                        Wajib minimal <strong>{MIN_STAGES_PLANNED}</strong> tahap
                        {minStagesFloor > MIN_STAGES_PLANNED ? (
                          <>
                            ; untuk case ini batas bawahnya{' '}
                            <strong>{minStagesFloor}</strong> karena sudah ada{' '}
                            <strong>{casePuzzles?.length ?? 0}</strong> puzzle.
                            Hapus puzzle dulu bila ingin menurunkan batas itu.
                          </>
                        ) : (
                          <>.</>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className='space-y-2'>
                    <Label>Waktu pengerjaan</Label>
                    <Select
                      value={timeScope || undefined}
                      onValueChange={setTimeScope}
                    >
                      <SelectTrigger className='bg-gray-50'>
                        <SelectValue placeholder='Pilih: satu durasi case atau per puzzle' />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='case'>
                          Satu batas untuk seluruh case
                        </SelectItem>
                        <SelectItem value='perPuzzle'>
                          Per puzzle (tiap soal punya waktu)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className='text-xs text-gray-500'>
                      Pilih &quot;case&quot; untuk satu durasi total. Pilih
                      &quot;per puzzle&quot; untuk mengisi menit di form tiap
                      soal (tanpa field waktu di sini).
                    </p>
                  </div>
                  {timeScope === 'case' ? (
                    <div className='space-y-2'>
                      <Label>Durasi total case (menit)</Label>
                      <Input
                        type='number'
                        min={1}
                        value={caseTimeMinutes}
                        onChange={(e) => setCaseTimeMinutes(e.target.value)}
                        className='bg-gray-50'
                        placeholder='Contoh: 45'
                      />
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            ) : null}

            {builderStep === 1 ? (
              <Card className='rounded-3xl border border-blue-200 bg-linear-to-br from-blue-100 to-purple-100 shadow-sm'>
                <CardContent className='p-8 space-y-4'>
                  <div className='flex items-center gap-3'>
                    <div className='w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-sm'>
                      <BookOpen className='w-6 h-6 text-blue-600' />
                    </div>
                    <h2 className='text-2xl font-bold text-gray-900'>
                      Story and Context
                    </h2>
                  </div>
                  <ExampleFillCallout title='Contoh pengisian (cerita & tujuan)'>
                    <p className='font-medium text-gray-900'>Cerita pembuka</p>
                    <p className='whitespace-pre-line rounded-lg bg-white/80 p-2 text-[11px] text-gray-600'>
                      {`Pagi itu, papan jadwal praktikum tiba-tiba berubah angka. Pak Guru yakin tidak ada yang mengubahnya. Kamu diminta membuka pola angka di balik jadwal tersebut sebelum jam istirahat.`}
                    </p>
                    <p className='font-medium text-gray-900'>Narasi clue</p>
                    <p className='whitespace-pre-line rounded-lg bg-white/80 p-2 text-[11px] text-gray-600'>
                      {`Setiap angka di jadwal ternyata berhubungan dengan nomor alat di rak. Petunjuk pertama: "Jumlah alat di rak A dan rak B sama dengan jam mulai praktikum hari ini."`}
                    </p>
                    <p className='font-medium text-gray-900'>Tujuan akhir</p>
                    <p className='rounded-lg bg-white/80 p-2 text-[11px] text-gray-600'>
                      Temukan kombinasi tiga digit yang membuka laci alat ukur
                      dan buktikan siapa yang terakhir menyentuh papan jadwal.
                    </p>
                  </ExampleFillCallout>
                  <div className='space-y-2'>
                    <Label>Cerita pembuka</Label>
                    <textarea
                      rows={5}
                      className='w-full px-4 py-3 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-300 resize-none'
                      value={storyIntro}
                      onChange={(e) => setStoryIntro(e.target.value)}
                      placeholder='Contoh: Pagi itu, papan jadwal praktikum tiba-tiba berubah angka… (minimal ±20 karakter)'
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label>Narasi clue / petunjuk</Label>
                    <textarea
                      rows={3}
                      className='w-full px-4 py-3 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-300 resize-none'
                      value={clueNarrative}
                      onChange={(e) => setClueNarrative(e.target.value)}
                      placeholder='Contoh: Setiap angka di jadwal berhubungan dengan nomor alat di rak…'
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label>Final Objective</Label>
                    <Input
                      value={finalObjective}
                      onChange={(e) => setFinalObjective(e.target.value)}
                      className='bg-white'
                      placeholder='Contoh: Temukan kombinasi tiga digit yang membuka laci alat ukur…'
                    />
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {builderStep === 2 ? (
              <PuzzleBuilderEmbedded
                key={caseUuidParam || 'no-case'}
                caseId={caseUuidParam}
                parentPuzzleList={
                  !caseUuidParam
                    ? undefined
                    : Array.isArray(casePuzzles)
                      ? casePuzzles
                      : null
                }
                onPuzzleListSync={syncPuzzlesFromChild}
                puzzleId={puzzleIdParam}
                onPuzzleIdChange={setPuzzleIdInUrl}
                onCreateCaseWithFirstPuzzle={
                  createCaseWithFirstPuzzleForEmbedded
                }
                onLivePreviewChange={handlePuzzleLivePreview}
                perPuzzleTimeMode={timeScope === 'perPuzzle'}
                editorActionsRef={puzzleEditorActionsRef}
                onEditorMetaChange={handlePuzzleEditorMeta}
                maxPuzzleCount={plannedPuzzleSlots}
                onPuzzleBuilderUiModeChange={setPuzzleBuilderUiMode}
              />
            ) : null}

            {builderStep === 3 ? (
              <Card className='rounded-3xl border border-gray-200 shadow-sm'>
                <CardContent className='p-8 space-y-6'>
                  <h2 className='text-2xl font-bold text-gray-900'>
                    Validasi sebelum simpan
                  </h2>
                  <p className='text-sm text-gray-600'>
                    Periksa kelas tujuan dan daftar persyaratan. Lanjut ke tahap
                    terakhir untuk menyimpan ke server.
                  </p>
                  {caseUuidParam && caseIsDraft ? (
                    <p className='rounded-lg border border-amber-200 bg-amber-50/90 px-3 py-2 text-xs text-amber-950'>
                      Case ini masih <strong>draft</strong> di server. Untuk
                      menerbitkannya cukup judul, tingkat sulit, dan gabungan
                      cerita minimal (≥10 karakter) — checklist di bawah bisa
                      merah untuk saran kualitas, bukan syarat wajib draft.
                    </p>
                  ) : null}
                  <div className='space-y-2'>
                    <Label>Kelas (untuk menautkan case)</Label>
                    {classCodeParam ? (
                      <p className='rounded-lg border border-emerald-200 bg-emerald-50/80 px-3 py-2 text-sm text-emerald-900'>
                        Dari detail kelas:{' '}
                        <span className='font-mono font-semibold'>
                          {classCodeParam}
                        </span>
                      </p>
                    ) : (
                      <Select
                        value={targetClass}
                        onValueChange={setTargetClass}
                      >
                        <SelectTrigger className='bg-gray-50'>
                          <SelectValue placeholder='Pilih kelas' />
                        </SelectTrigger>
                        <SelectContent>
                          {classOptions.map((classItem) => (
                            <SelectItem key={classItem.id} value={classItem.id}>
                              {classItem.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  <div className='space-y-2 rounded-xl border border-gray-100 bg-gray-50/80 p-4'>
                    {checks.map((item) => (
                      <div
                        key={item.label}
                        className='flex items-center gap-2 text-sm'
                      >
                        <CheckCircle
                          className={`w-4 h-4 shrink-0 ${item.ok ? 'text-green-600' : 'text-gray-400'}`}
                        />
                        <span
                          className={
                            item.ok ? 'text-gray-800' : 'text-gray-500'
                          }
                        >
                          {item.label}
                        </span>
                      </div>
                    ))}
                    <div className='flex items-center gap-2 text-sm'>
                      <CheckCircle
                        className={`w-4 h-4 shrink-0 ${classAttachOk ? 'text-green-600' : 'text-gray-400'}`}
                      />
                      <span
                        className={
                          classAttachOk ? 'text-gray-800' : 'text-gray-500'
                        }
                      >
                        {classCheckLabel}
                      </span>
                    </div>
                  </div>
                  <Button
                    type='button'
                    variant='secondary'
                    className='rounded-full'
                    onClick={() => goToStepIndex(BUILDER_STEPS.length - 1)}
                  >
                    Lanjut ke simpan
                    <ChevronRight className='ml-2 h-4 w-4' />
                  </Button>
                </CardContent>
              </Card>
            ) : null}

            {builderStep === 4 ? (
              <Card className='rounded-3xl border border-purple-200 bg-linear-to-br from-purple-50 to-blue-50 shadow-sm'>
                <CardContent className='p-8 space-y-6'>
                  <h2 className='text-2xl font-bold text-gray-900'>
                    {caseUuidParam && caseIsDraft
                      ? 'Terbitkan case'
                      : 'Simpan ke server'}
                  </h2>
                  <p className='text-sm text-gray-600'>
                    {caseUuidParam && caseIsDraft ? (
                      <>
                        Tombol di bawah mengatur{' '}
                        <span className='font-medium text-gray-800'>
                          is_draft = false
                        </span>{' '}
                        sehingga case tampil bagi siswa (sesuai pengaturan kelas)
                        dan Anda bisa membuat draft case lain bila perlu.
                      </>
                    ) : (
                      <>
                        Case baru akan ditautkan ke kelas (jika dipilih) lalu
                        Anda bisa lanjut menambah puzzle. Case yang sudah terbit
                        diperbarui isinya di sini.
                      </>
                    )}
                  </p>
                  <div className='space-y-2 rounded-xl border border-white/80 bg-white/60 p-4 text-sm'>
                    <div className='flex justify-between gap-2'>
                      <span className='text-gray-600'>Judul</span>
                      <span
                        className='max-w-[60%] truncate font-medium text-gray-900'
                        title={caseTitle}
                      >
                        {caseTitle.trim() || '—'}
                      </span>
                    </div>
                    <div className='flex justify-between'>
                      <span className='text-gray-600'>Tingkat</span>
                      <span className='font-medium text-gray-900'>
                        {difficulty || '—'}
                      </span>
                    </div>
                    <div className='flex justify-between'>
                      <span className='text-gray-600'>Puzzle</span>
                      <span className='font-medium text-gray-900'>
                        {Array.isArray(casePuzzles)
                          ? `${casePuzzles.length} buah`
                          : '—'}
                      </span>
                    </div>
                  </div>
                  <Button
                    type='button'
                    disabled={!canSaveCaseToServer}
                    onClick={handlePublishToServer}
                    className='w-full bg-linear-to-r from-green-200 to-emerald-200 text-emerald-900 disabled:opacity-50 sm:w-auto sm:min-w-[240px]'
                  >
                    <CloudUpload className='mr-2 h-4 w-4' />
                    {publishPrimaryLabel}
                  </Button>
                  {!canSaveCaseToServer ? (
                    <p className='text-xs text-gray-500'>
                      {caseUuidParam &&
                      caseIsDraft &&
                      (!Array.isArray(casePuzzles) ||
                        casePuzzles.length < 1) ? (
                        <>
                          Untuk menerbitkan draft: simpan{' '}
                          <strong>minimal satu puzzle</strong> di tahap Puzzles.
                          Lengkapi juga judul (≥3 karakter), gabungan cerita (≥10
                          karakter), dan tingkat sulit.
                        </>
                      ) : (
                        <>
                          Minimal: judul (≥3 karakter), gabungan cerita+tujuan (≥10
                          karakter), tingkat sulit. Kelas opsional — pilih di tahap
                          Validasi bila ingin menautkan ke kelas.
                        </>
                      )}
                    </p>
                  ) : !readyToPublish ? (
                    <p className='text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2'>
                      Case sudah bisa disimpan. Centang hijau di tahap Validasi
                      adalah saran kualitas (cerita lebih panjang, min. 3 tahap
                      rencana); tidak wajib untuk menyimpan.
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            ) : null}

            <div className='space-y-3 border-t border-gray-100 pt-6'>
              {builderStep === 2 && !navigableComplete[2] ? (
                <p className='rounded-lg border border-amber-200 bg-amber-50/90 px-3 py-2 text-xs text-amber-950'>
                  {puzzleBuilderUiMode !== 'list' ? (
                    <>
                      Tutup editor puzzle dulu dengan{' '}
                      <strong>Simpan puzzle</strong> atau{' '}
                      <strong>Batal</strong> (tombol di atas form atau di
                      sidebar). Setelah itu barulah <strong>Kembali</strong>,{' '}
                      <strong>Lanjut</strong>, atau tab tahap lain bisa dipakai.
                    </>
                  ) : (
                    <>
                      Tambah dan simpan puzzle hingga{' '}
                      <strong>{plannedPuzzleSlots}</strong> buah (sama dengan
                      Number of stages di Case Info). Saat ini:{' '}
                      <strong>
                        {Array.isArray(casePuzzles) ? casePuzzles.length : 0}
                      </strong>
                      .
                    </>
                  )}
                </p>
              ) : null}
              <div className='flex flex-wrap items-center justify-between gap-3'>
              <Button
                type='button'
                variant='outline'
                className='rounded-full'
                disabled={
                  builderStep === 0 ||
                  (builderStep === 2 && puzzleBuilderUiMode !== 'list')
                }
                title={
                  builderStep === 2 && puzzleBuilderUiMode !== 'list'
                    ? 'Tutup editor puzzle dulu (Simpan atau Batal)'
                    : undefined
                }
                onClick={() => goToStepIndex(builderStep - 1)}
              >
                <ChevronLeft className='mr-2 h-4 w-4' />
                Kembali
              </Button>
              <span className='text-sm text-gray-500'>
                {BUILDER_STEPS[builderStep]?.label}
              </span>
              <Button
                type='button'
                className='rounded-full bg-linear-to-r from-purple-200 to-blue-200 text-purple-800'
                disabled={
                  builderStep >= BUILDER_STEPS.length - 1 ||
                  !navigableComplete[builderStep]
                }
                onClick={() => goToStepIndex(builderStep + 1)}
              >
                Lanjut
                <ChevronRight className='ml-2 h-4 w-4' />
              </Button>
              </div>
            </div>
          </div>

          <div className='space-y-6'>
            {builderStep === 0 || builderStep === 1 ? (
              <Card className='rounded-3xl border border-yellow-200 bg-linear-to-br from-yellow-100 to-pink-100 shadow-sm'>
                <CardContent className='p-6'>
                  <div className='inline-flex items-center gap-2 mb-4'>
                    <Lightbulb className='w-6 h-6 text-yellow-600' />
                    <h3 className='text-lg font-bold text-gray-900'>
                      Design Tips
                    </h3>
                  </div>
                  <div className='space-y-2 text-sm text-gray-700'>
                    <p>- Start with an engaging story hook</p>
                    <p>- Increase difficulty gradually</p>
                    <p>- Provide helpful hints</p>
                    <p>- Include a satisfying conclusion</p>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {builderStep === 3 || builderStep === 4 ? (
              <Card className='rounded-3xl border border-purple-200 bg-linear-to-br from-purple-100 to-blue-100 shadow-sm'>
                <CardContent className='p-6 text-sm'>
                  <h3 className='text-lg font-bold text-gray-900 mb-3'>
                    Case Summary
                  </h3>
                  <div className='space-y-2'>
                    <div className='flex justify-between'>
                      <span className='text-gray-600'>Total Stages:</span>
                      <span className='font-bold text-gray-900'>
                        {stageCount || '—'}
                      </span>
                    </div>
                    <div className='flex justify-between'>
                      <span className='text-gray-600'>Difficulty:</span>
                      <span className='font-bold text-gray-900'>
                        {difficulty || '—'}
                      </span>
                    </div>
                    <div className='flex justify-between'>
                      <span className='text-gray-600'>Total Points:</span>
                      <span className='font-bold text-gray-900'>
                        {Array.isArray(casePuzzles) && casePuzzles.length > 0
                          ? casePuzzles.length * 50
                          : '—'}
                      </span>
                    </div>
                    <div className='flex justify-between'>
                      <span className='text-gray-600'>Est. Time:</span>
                      <span className='font-bold text-gray-900'>
                        {timeScope === 'case' &&
                        Number.parseInt(String(caseTimeMinutes).trim(), 10) >=
                          1
                          ? `${caseTimeMinutes} min (case)`
                          : timeScope === 'perPuzzle'
                            ? 'Per puzzle'
                            : '—'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {builderStep === 2 ? (
              <>
                <Card className='rounded-3xl border border-purple-200 bg-linear-to-br from-purple-100 to-blue-100 shadow-sm'>
                  <CardContent className='p-6'>
                    <h3 className='text-lg font-bold text-gray-900 mb-3'>
                      Live preview
                    </h3>
                    <PuzzleLivePreview
                      puzzleType={puzzleLivePreview?.puzzleType}
                      question={puzzleLivePreview?.question}
                      answers={puzzleLivePreview?.answers}
                    />
                  </CardContent>
                </Card>
                {puzzleEditorMeta ? (
                  <Card className='rounded-3xl border border-purple-200 bg-linear-to-br from-purple-100 to-blue-100 shadow-sm'>
                    <CardContent className='p-6'>
                      <h3 className='mb-3 text-lg font-bold text-gray-900'>
                        Simpan puzzle
                      </h3>
                      <div className='mb-4 space-y-2 text-sm'>
                        <p
                          className={
                            puzzleEditorMeta.questionOk
                              ? 'text-gray-800'
                              : 'text-gray-500'
                          }
                        >
                          - Pertanyaan cukup panjang
                        </p>
                        <p
                          className={
                            puzzleEditorMeta.answerOk
                              ? 'text-gray-800'
                              : 'text-gray-500'
                          }
                        >
                          - Satu jawaban benar dipilih &amp; berisi teks
                        </p>
                        <p
                          className={
                            puzzleEditorMeta.clueOk
                              ? 'text-gray-800'
                              : 'text-gray-500'
                          }
                        >
                          - Clue / penjelasan cukup panjang
                        </p>
                      </div>
                      <div className='flex flex-col gap-2 sm:flex-row sm:flex-wrap'>
                        <Button
                          type='button'
                          onClick={() => puzzleEditorActionsRef.current.save()}
                          disabled={!puzzleEditorMeta.canSubmit}
                          className='bg-linear-to-r from-green-200 to-emerald-200 text-emerald-900 disabled:opacity-50'
                        >
                          <CloudUpload className='mr-2 h-4 w-4' />
                          {puzzleEditorMeta.saveLabel}
                        </Button>
                        <Button
                          type='button'
                          variant='outline'
                          onClick={() => puzzleEditorActionsRef.current.cancel()}
                        >
                          Batal
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : null}
              </>
            ) : null}

            {builderStep === 4 ? (
              <Card className='rounded-3xl border border-gray-200 shadow-sm'>
                <CardContent className='p-6'>
                  <h3 className='text-lg font-bold text-gray-900 mb-4'>
                    Case Anda (server)
                  </h3>
                  <div className='space-y-3'>
                    {myCasesPreview.map((item, idx) => (
                      <div
                        key={item.id}
                        className={`p-4 bg-linear-to-br rounded-xl border ${CASE_THEMES[idx % CASE_THEMES.length]}`}
                      >
                        <p className='font-semibold text-gray-900 mb-1'>
                          {item.title}
                        </p>
                        <div className='flex items-center justify-between text-xs'>
                          <span className='text-gray-600'>
                            {item.difficulty}
                          </span>
                          <Button
                            variant='ghost'
                            size='sm'
                            className='h-7 text-xs'
                            asChild
                          >
                            <Link
                              to={`/teacher/case-builder?caseUuid=${encodeURIComponent(item.id)}&step=puzzles`}
                            >
                              Puzzle
                            </Link>
                          </Button>
                        </div>
                      </div>
                    ))}
                    {myCasesPreview.length === 0 ? (
                      <p className='text-sm text-gray-500'>
                        Belum ada case di akun ini.
                      </p>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            ) : null}
          </div>
        </div>
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className='max-h-[min(90vh,640px)] overflow-y-auto sm:max-w-lg'>
          <DialogHeader>
            <DialogTitle>Pratinjau</DialogTitle>
            <DialogDescription>
              {builderStep === 2
                ? 'Menampilkan perkiraan tampilan soal dan pilihan jawaban seperti yang akan dilihat siswa saat mengerjakan puzzle (bukan data di server).'
                : 'Ringkasan judul, tingkat kesulitan, dan cerita yang sedang Anda isi. Untuk pratinjau bentuk soal, buka tahap Puzzles lalu edit atau tambah puzzle.'}
            </DialogDescription>
          </DialogHeader>
          {builderStep === 2 ? (
            <PuzzleLivePreview
              puzzleType={puzzleLivePreview?.puzzleType}
              question={puzzleLivePreview?.question}
              answers={puzzleLivePreview?.answers}
            />
          ) : (
            <div className='space-y-4 text-sm text-gray-800'>
              <div>
                <p className='text-xs font-medium uppercase tracking-wide text-gray-500'>
                  Judul
                </p>
                <p className='mt-1 font-semibold text-gray-900'>
                  {caseTitle.trim() || '—'}
                </p>
              </div>
              <div>
                <p className='text-xs font-medium uppercase tracking-wide text-gray-500'>
                  Kesulitan &amp; tahap
                </p>
                <p className='mt-1'>
                  {difficulty || '—'}
                  {stages ? ` · ${stages} tahap (rencana)` : ''}
                </p>
              </div>
              <div>
                <p className='text-xs font-medium uppercase tracking-wide text-gray-500'>
                  Pembuka cerita
                </p>
                <p className='mt-1 whitespace-pre-wrap text-gray-700'>
                  {storyIntro.trim() || '—'}
                </p>
              </div>
              <div>
                <p className='text-xs font-medium uppercase tracking-wide text-gray-500'>
                  Narasi petunjuk
                </p>
                <p className='mt-1 whitespace-pre-wrap text-gray-700'>
                  {clueNarrative.trim() || '—'}
                </p>
              </div>
              <div>
                <p className='text-xs font-medium uppercase tracking-wide text-gray-500'>
                  Tujuan akhir
                </p>
                <p className='mt-1 whitespace-pre-wrap text-gray-700'>
                  {finalObjective.trim() || '—'}
                </p>
              </div>
              <div>
                <p className='text-xs font-medium uppercase tracking-wide text-gray-500'>
                  Puzzle di case
                </p>
                <p className='mt-1'>
                  {Array.isArray(casePuzzles)
                    ? `${casePuzzles.length} puzzle`
                    : 'Memuat…'}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
