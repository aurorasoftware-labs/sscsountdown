export const SYLLABUS_VERSION = 20261107;

const english = [
  'Where the Mind is Without Fear', 'The Thief’s Story', 'On Wings of Courage',
  'All the World’s a Stage', 'Joan of Arc', 'The Alchemy of Nature',
  'Animals', 'Three Questions', 'Connecting the Dots', 'The Pulley',
  'Let’s March!', 'Science and Spirituality', 'Night of the Scorpion',
  'The Night I Met Einstein', 'Stephen Hawking', 'The Will to Win',
  'Unbeatable Super Mom—Mary Kom', 'The Concert',
  'A Thing of Beauty is a Joy For Ever', 'The Luncheon', 'World Heritage',
  'The Height of the Ridiculous', 'The Old Man and the Sea: Book Review', 'The Gift of the Magi',
];

const marathi = [
  ['भाग १', 'तू बुद्धी दे'],
  ['भाग १', 'संतवाणी — (अ) अंकिला मी दास तुझा; (आ) योगी सर्वकाळ सुखदाता'],
  ['भाग १', 'शाल'], ['भाग १', 'उपास'],
  ['भाग १ · स्थूलवाचन', 'मोठे होत असलेल्या मुलांनो…'],
  ['भाग २', 'दोन दिवस'], ['भाग २', 'चुडीवाला'],
  ['भाग २', 'फूटप्रिन्ट्स'], ['भाग २', 'ऊर्जाशक्तीचा जागर'],
  ['भाग २ · स्थूलवाचन', 'जाता अस्ताला'],
  ['भाग ३', 'औक्षण'], ['भाग ३', 'रंग साहित्याचे'], ['भाग ३', 'जंगल डायरी'],
  ['भाग ३', 'रंग मजेचे रंग उद्याचे'], ['भाग ३ · स्थूलवाचन', 'जगणं कॅक्टसचं'],
  ['भाग ४', 'हिरवंगार झाडासारखं'], ['भाग ४', 'बीज पेरले गेले'],
  ['भाग ४', 'खरा नागरिक'], ['भाग ४', 'स्वप्न करू साकार'],
  ['भाग ४ · स्थूलवाचन', 'व्युत्पत्ती कोश'], ['भाग ४ · लेखन', 'उपयोजित लेखन'],
];

const hindi = [
  'भारत महिमा', 'लक्ष्मी', 'वाह रे! हमदर्द', 'मन (पूरक पठन)',
  'गोवा: जैसा मैंने देखा', 'गिरिधर नागर', 'खुला आकाश (पूरक पठन)',
  'गजल', 'रीढ़ की हड्डी', 'ठेस (पूरक पठन)', 'कृषक का गान',
  'बरषहिं जलद', 'दो लघुकथाएँ (पूरक पठन)', 'श्रम साधना', 'छापा',
  'ईमानदारी की प्रतिमूर्ति', 'हम इस धरती की संतति हैं (पूरक पठन)',
  'महिला आश्रम', 'अपनी गंध नहीं बेचूँगा', 'जब तक जिंदा रहूँ, लिखता रहूँ',
  'बूढ़ी काकी (पूरक पठन)', 'समता की ओर', 'व्याकरण एवं रचना विभाग तथा भावार्थ',
];

function entry(id, subject, part, title) {
  return {id, subject, part, title};
}

function book(subject, part, titles) {
  return titles.map((title, index) => entry(
    `${subject}-${part.replace(/[^a-z0-9]/gi, '')}-${index}`, subject, part, title,
  ));
}

const oldEnglishPositions = new Map([
  ...english.slice(0, 13).map((title, index) => [title, index]),
  [english[18], 14], [english[19], 15],
]);

export const SYLLABUS = [
  ...english.map((title, index) => entry(
    oldEnglishPositions.has(title)
      ? `english-Kumarbharati-${oldEnglishPositions.get(title)}`
      : `english-index-${index}`,
    'english', `Unit ${Math.floor(index / 6) + 1}`, title,
  )),
  ...marathi.map(([part, title], index) => entry(
    `other-Chooselanguagebook-${index}`, 'other', part, title,
  )),
  ...hindi.map((title, index) => entry(
    `hindi-Checkyourtextbook-${index}`, 'hindi',
    index < 11 ? 'पहली इकाई' : index < 22 ? 'दूसरी इकाई' : 'व्याकरण एवं रचना', title,
  )),
  ...book('science', 'Part 1', [
    'Gravitation', 'Periodic Classification of Elements', 'Chemical Reactions and Equations',
    'Effects of Electric Current', 'Heat', 'Refraction of Light', 'Lenses',
    'Metallurgy', 'Carbon Compounds', 'Space Missions',
  ]),
  ...book('science', 'Part 2', [
    'Heredity and Evolution', 'Life Processes in Living Organisms – Part 1',
    'Life Processes in Living Organisms – Part 2', 'Environmental Management',
    'Towards Green Energy', 'Animal Classification', 'Introduction to Microbiology',
    'Cell Biology and Biotechnology', 'Social Health', 'Disaster Management',
  ]),
  ...book('math', 'Algebra', [
    'Linear Equations in Two Variables', 'Quadratic Equations', 'Arithmetic Progression',
    'Financial Planning', 'Probability', 'Statistics',
  ]),
  ...book('math', 'Geometry', [
    'Similarity', 'Pythagoras Theorem', 'Circle', 'Geometric Constructions',
    'Co-ordinate Geometry', 'Trigonometry', 'Mensuration',
  ]),
  ...book('history', 'History', [
    'Historiography: Development in the West', 'Historiography: Indian Tradition',
    'Applied History', 'History of Indian Arts', 'Mass Media and History',
    'Entertainment and History', 'Sports and History', 'Tourism and History', 'Heritage Management',
  ]),
  ...book('history', 'Political Science', [
    'Working of the Constitution', 'The Electoral Process', 'Political Parties',
    'Social and Political Movements', 'Challenges Faced by Indian Democracy',
  ]),
  ...book('geo', 'Geography', [
    'Field Visit', 'Location and Extent', 'Physiography and Drainage', 'Climate',
    'Natural Vegetation and Wildlife', 'Population', 'Human Settlements',
    'Economy and Occupations', 'Tourism, Transport and Communication',
  ]),
];

export function freshLessons(priorities) {
  return SYLLABUS.map(lesson => ({
    ...lesson, stage: 0, minutes: 45, priority: priorities[lesson.subject],
    draft: false, covered: null, reviewDue: null, reviewCount: 0,
  }));
}

function titleKey(title) {
  return title.normalize('NFC').toLowerCase().replace(/[^\p{L}\p{M}\p{N}]/gu, '');
}

function isOldStarter(lesson) {
  if (/^english-(Kumarbharati|Skills)-\d+$/.test(lesson.id)) return true;
  if (/^(hindi-Checkyourtextbook|other-Chooselanguagebook)-\d+$/.test(lesson.id)) return true;
  return SYLLABUS.some(item => item.id === lesson.id);
}

function isPlaceholder(lesson) {
  return /^Hindi lesson \/ skill \d+ — rename from your book$/.test(lesson.title)
    || /^Other language lesson \/ skill \d+ — rename$/.test(lesson.title);
}

export function migrateSyllabus(state, priorities) {
  if (state.settings.syllabusVersion === SYLLABUS_VERSION) return state;
  const previous = state.lessons;
  const used = new Set();
  const defaults = freshLessons(priorities);
  const take = predicate => {
    const match = previous.find(old => !used.has(old.id) && predicate(old));
    if (match) used.add(match.id);
    return match;
  };
  // Match every known title first, before assigning progress from numbered placeholders.
  const matches = defaults.map(fresh => take(old => old.subject === fresh.subject
    && titleKey(old.title) === titleKey(fresh.title)));
  defaults.forEach((fresh, index) => {
    matches[index] ??= take(old => old.subject === fresh.subject && old.id === fresh.id
      && ((isPlaceholder(old) && old.stage === 0 && !old.covered && !old.reviewDue
        && !old.reviewCount && (!old.strength || old.strength === 'unrated')) || !['english', 'hindi', 'other'].includes(old.subject)));
  });
  const reserved = new Set([...previous, ...(state.archivedLessons || [])].map(old => old.id));
  const lessons = defaults.map((fresh, index) => {
    const match = matches[index];
    if (match) return {...match, part: fresh.part, title: fresh.title, draft: false};
    let id = fresh.id;
    for (let suffix = 1; reserved.has(id); suffix++) id = `index-${suffix}-${fresh.id}`;
    reserved.add(id);
    return {...fresh, id};
  });
  const archive = [...(state.archivedLessons || [])];
  for (const old of previous) {
    if (used.has(old.id)) continue;
    if (isOldStarter(old)) archive.push(old);
    else lessons.push(old);
  }
  state.lessons = lessons;
  state.archivedLessons = archive;
  state.settings.syllabusVersion = SYLLABUS_VERSION;
  return state;
}
