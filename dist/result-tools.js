export const STRENGTHS = [
  ['unrated', 'Not rated'],
  ['strong', 'Strong'],
  ['moderate', 'Moderate'],
  ['weak', 'Weak'],
];

export const LOSS_REASONS = [
  ['calculation', 'Calculation mistake'],
  ['concept', 'Concept gap'],
  ['careless', 'Careless mistake'],
  ['misread', 'Misread question'],
  ['steps', 'Missing steps or explanation'],
  ['time', 'Ran out of time'],
  ['recall', 'Forgot a fact or formula'],
  ['presentation', 'Presentation, spelling or units'],
  ['other', 'Other reason'],
];

const REVISION_DRILLS={
 calculation:'Redo 3 similar calculations and check each step',
 concept:'Review the concept, then explain it and solve an example without notes',
 careless:'Redo 3 questions using a final answer checklist',
 misread:'Underline the command words and restate what 3 questions ask',
 steps:'Rewrite 2 answers with every step or supporting point',
 time:'Try a short timed set, then review where time went',
 recall:'Recall the key facts or formulas from memory, then check them',
 presentation:'Rewrite 2 answers, checking layout, spelling and units',
 other:'Review the marked answer and practise the correction',
};
export function revisionDrills(result){
 return LOSS_REASONS.filter(([reason])=>result.losses?.[reason]>0)
  .map(([reason,label])=>({reason,label,marks:result.losses[reason],drill:REVISION_DRILLS[reason]}))
  .sort((a,b)=>b.marks-a.marks);
}

export function lessonMatchesSubject(lesson, subject) {
  return subject === 'social'
    ? ['history', 'geo'].includes(lesson.subject)
    : lesson.subject === subject;
}

export function validateResultDetails(result) {
  if (result.upcomingTestId !== undefined
    && (typeof result.upcomingTestId !== 'string' || !/^[A-Za-z0-9 _-]{1,120}$/.test(result.upcomingTestId))) {
    throw Error('Invalid linked test.');
  }
  if (result.lessons !== undefined) {
    if (!Array.isArray(result.lessons) || result.lessons.length > 2000) {
      throw Error('Invalid result lessons.');
    }
    const ids = new Set();
    for (const lesson of result.lessons) {
      if (!lesson || typeof lesson.id !== 'string'
        || !/^[A-Za-z0-9 _-]{1,120}$/.test(lesson.id)
        || ids.has(lesson.id) || typeof lesson.title !== 'string'
        || !lesson.title.trim() || lesson.title.length > 300
        || !lessonMatchesSubject(lesson, result.subject)) {
        throw Error('Selected lessons must belong to the result’s subject.');
      }
      ids.add(lesson.id);
    }
  }

  if (result.losses !== undefined) {
    if (!result.losses || typeof result.losses !== 'object' || Array.isArray(result.losses)) {
      throw Error('Invalid lost-marks breakdown.');
    }
    for (const [reason, marks] of Object.entries(result.losses)) {
      if (!LOSS_REASONS.some(([id]) => id === reason)
        || !Number.isFinite(marks) || marks < 0) {
        throw Error('Enter valid lost marks for each reason.');
      }
    }
    const allocated = Object.values(result.losses).reduce((total, marks) => total + marks, 0);
    if (allocated > result.max - result.mark + 0.000001) {
      throw Error('The breakdown exceeds the marks lost. Check the result or the reason amounts.');
    }
  }
  if (result.errorNote !== undefined
    && (typeof result.errorNote !== 'string' || result.errorNote.length > 1000)) {
    throw Error('Keep the mistake note within 1,000 characters.');
  }
  return result;
}

export function lossSummary(result) {
  const lost = Math.max(0, result.max - result.mark);
  const allocated = Object.values(result.losses || {}).reduce((total, marks) => total + marks, 0);
  return { lost, allocated, unclassified: Math.max(0, lost - allocated) };
}
