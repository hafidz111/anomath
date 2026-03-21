export const TEACHER_DEMO_CLASSES = [
  { id: 1, name: 'Math Warriors 7A', students: 32, avgScore: 89, code: 'MW7A-2024', active: 28 },
  { id: 2, name: 'Anomath 7B', students: 28, avgScore: 85, code: 'ANO7B-2024', active: 25 },
  { id: 3, name: 'Number Ninjas 8A', students: 35, avgScore: 91, code: 'NN8A-2024', active: 32 },
  { id: 4, name: 'Equation Experts 8B', students: 29, avgScore: 83, code: 'EE8B-2024', active: 26 },
];

export function getTeacherClassById(classId) {
  const id = Number(classId);
  return TEACHER_DEMO_CLASSES.find((c) => c.id === id) ?? null;
}

export function capDiff(difficulty) {
  if (!difficulty) return '';
  return difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
}

export function groupCasesByClass(apiCases, classList = TEACHER_DEMO_CLASSES) {
  const buckets = Object.fromEntries(classList.map((c) => [String(c.id), []]));
  apiCases.forEach((c, i) => {
    const cls = classList[i % classList.length];
    buckets[String(cls.id)].push({
      id: c.id,
      title: c.title,
      puzzle_count: c.puzzle_count ?? 0,
      difficulty: capDiff(c.difficulty),
    });
  });
  return buckets;
}
