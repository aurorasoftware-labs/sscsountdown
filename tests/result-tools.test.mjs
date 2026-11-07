import {test} from 'node:test';
import assert from 'node:assert/strict';
import {seed, validate, recommendations} from '../dist/core.js';
import {lessonMatchesSubject, validateResultDetails, lossSummary} from '../dist/result-tools.js';

function practiceResult() {
  return {
    id: 'result-example', exam: 'Practice 1', subject: 'math', kind: 'Practice',
    date: '2026-11-07', mark: 32, max: 40,
  };
}

test('old results and unrated lessons remain valid', () => {
  const state = seed();
  state.scores.push(practiceResult());
  assert.equal(validate(state), state);
  assert.deepEqual(lossSummary(state.scores[0]), {lost: 8, allocated: 0, unclassified: 8});
});

test('lesson ratings and result diagnostics survive backup restoration', () => {
  const state = seed();
  const lesson = state.lessons.find(l => l.subject === 'math');
  lesson.strength = 'weak';
  state.scores.push({
    ...practiceResult(),
    lessons: [{id: lesson.id, title: lesson.title, subject: 'math'}],
    losses: {calculation: 3, concept: 4}, errorNote: 'Used the wrong formula.',
  });
  const restored = validate(JSON.parse(JSON.stringify(state)));
  assert.equal(restored.lessons.find(l => l.id === lesson.id).strength, 'weak');
  assert.equal(restored.scores[0].lessons[0].title, lesson.title);
  assert.deepEqual(lossSummary(restored.scores[0]), {lost: 8, allocated: 7, unclassified: 1});
  restored.lessons.shift();
  assert.equal(validate(restored), restored, 'Historical result lessons survive deletion from the tracker');
});

test('result subjects constrain lesson selection, including both Social Science books', () => {
  assert.ok(lessonMatchesSubject({subject: 'history'}, 'social'));
  assert.ok(lessonMatchesSubject({subject: 'geo'}, 'social'));
  assert.equal(lessonMatchesSubject({subject: 'science'}, 'social'), false);
  assert.throws(() => validateResultDetails({
    ...practiceResult(), lessons: [{id: 'science-1', title: 'Heat', subject: 'science'}],
  }), /subject/);
});

test('lost marks cannot be negative, non-finite, unknown or exceed the actual loss', () => {
  for (const losses of [
    {calculation: -1}, {concept: NaN}, {other: Infinity}, {invented: 2},
    {calculation: 5, concept: 4},
  ]) assert.throws(() => validateResultDetails({...practiceResult(), losses}));
  assert.throws(() => validateResultDetails({...practiceResult(), mark: 40, losses: {concept: 1}}));
  assert.doesNotThrow(() => validateResultDetails({...practiceResult(), losses: {calculation: 3.5, concept: 4.5}}));
});

test('weak lessons influence next-study recommendations without changing completion stage', () => {
  const state = seed();
  const lesson = state.lessons.find(item => item.title === 'Probability');
  lesson.stage = 4;
  lesson.strength = 'weak';
  assert.ok(recommendations(state).some(item => item.id === lesson.id));
  assert.equal(lesson.stage, 4);
  lesson.strength = 'invalid';
  assert.throws(() => validate(state), /strength/);
});
