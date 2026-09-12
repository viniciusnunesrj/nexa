// Run the actual save handler with controlled persistence and UI state.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const source = ts.createSourceFile('Profile.tsx', readFileSync('src/pages/Profile.tsx', 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let handler;
function visit(node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(source) === 'handleSaveProfile') handler = node.initializer;
  ts.forEachChild(node, visit);
}
visit(source);
assert.ok(handler);
const compiled = ts.transpileModule(`const save = ${handler.getText(source)};`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
let calls = 0;
let finish, fail;
let editing = true;
let loading = false;
const messages = [];
const fields = {};
const dependencies = {
  saving: { current: false }, title: 'Title', bio: 'Bio', avatar: 'https://example.com/a.png',
  setIsSaving: value => { loading = value; }, setIsEditing: value => { editing = value; },
  setTitle: value => { fields.title = value; }, setBio: value => { fields.bio = value; },
  setAvatar: value => { fields.avatar = value; }, notify: (...args) => messages.push(args),
  updateUserProfile: patch => {
    calls++;
    assert.deepEqual(patch, { title: 'Title', bio: 'Bio', avatar: 'https://example.com/a.png' });
    return new Promise((resolve, reject) => { finish = resolve; fail = reject; });
  },
};
const save = new Function(...Object.keys(dependencies), compiled + '\nreturn save;')(...Object.values(dependencies));
const event = { preventDefault() {} };
const pending = save(event);
await save(event);
assert.equal(calls, 1);
assert.equal(editing, true);
assert.equal(loading, true);
assert.equal(messages.length, 0);
fail(new Error('Persistence denied'));
await pending;
assert.equal(editing, true);
assert.equal(loading, false);
assert.deepEqual(messages[0], ['error', 'Não foi possível salvar', 'Persistence denied']);
const retry = save(event);
finish({ bio: 'Confirmed', title: 'Confirmed title', avatar: 'https://example.com/confirmed.png' });
await retry;
assert.equal(editing, false);
assert.equal(loading, false);
assert.equal(fields.bio, 'Confirmed');
assert.equal(messages[1][0], 'success');
console.log('PASS: profile save awaits persistence, blocks duplicate click, retains editing on error, uses confirmed fields');
