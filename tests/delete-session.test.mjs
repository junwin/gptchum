import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../src/components/Chat2.vue', import.meta.url), 'utf8');
const script = source.match(/<script>([\s\S]*?)<\/script>/)[1]
  .replace(/^import .*;\s*$/gm, '').replace('export default', 'module.exports =');
const sandbox = { module: {}, ChatWindow: {}, Menu: {} };
vm.runInNewContext(script, sandbox);
const component = sandbox.module.exports;
function state() {
  const s = { ...component.data(), ...component.methods, accountName: 'alice',
    selectedSession: { id: 'current' }, sessions: [{ id: 'current' }, { id: 'old' }],
    responses: [{ content: 'Keep this conversation' }], dataService: { deleteChat: async () => ({ ok: true }) } };
  for (const [name, getter] of Object.entries(component.computed)) {
    Object.defineProperty(s, name, { get: () => getter.call(s) });
  }
  return s;
}

test('current session is disabled in the menu and rejected by the handler', async () => {
  const s = state();
  s.dataService.deleteChat = () => assert.fail('must not delete current session');
  s.menuSession = s.selectedSession;
  assert.equal(s.sessionMenuItems[0].disabled, true);
  s.sessionMenuItems[0].command();
  assert.equal(s.showDeleteSession, false);
  s.requestDeleteSession({ id: 'old' });
  s.selectedSession = { id: 'old' }; // selection changed after the menu opened
  await s.confirmDeleteSession();
  assert.match(s.deleteSessionError, /current session/);
});

test('confirmation deletes the scoped session and preserves current conversation', async () => {
  const s = state();
  const selected = s.selectedSession, messages = s.responses;
  let calls = 0;
  s.dataService.deleteChat = async (...args) => {
    calls++;
    assert.deepEqual(args, ['old', 'alice']);
    assert.equal(s.isDeletingSession, true);
    s.selectSession({ id: 'old' });
    assert.equal(s.selectedSession, selected);
    return { ok: true };
  };
  s.requestDeleteSession({ id: 'old' });
  assert.equal(calls, 0);
  await s.confirmDeleteSession();
  assert.equal(calls, 1);
  assert.deepEqual(s.sessions.map(x => x.id), ['current']);
  assert.equal(s.selectedSession, selected);
  assert.equal(s.responses, messages);
  assert.equal(s.showDeleteSession, false);
  assert.equal(s.isDeletingSession, false);
});

test('cancel, busy operations and changed connection never delete', async () => {
  const s = state();
  s.dataService.deleteChat = () => assert.fail('must not delete');
  for (const flag of ['isSending', 'isLoading', 'isLoadingChat', 'isDeletingExchange', 'isDeletingSession']) {
    s[flag] = true;
    s.requestDeleteSession({ id: 'old' });
    assert.equal(s.showDeleteSession, false);
    s[flag] = false;
  }
  s.requestDeleteSession({ id: 'old' });
  s.showDeleteSession = false;
  await s.confirmDeleteSession();
  s.requestDeleteSession({ id: 'old' });
  s.isSending = true;
  await s.confirmDeleteSession();
  s.isSending = false;
  s.accountName = 'bob';
  await s.confirmDeleteSession();
  assert.match(s.deleteSessionError, /account or server changed/);
  s.accountName = 'alice';
  s.dataService = { deleteChat: () => assert.fail('changed service') };
  await s.confirmDeleteSession();
  assert.match(s.deleteSessionError, /account or server changed/);
});

test('failure retains the list and supports retry', async () => {
  const s = state(), sessions = s.sessions;
  s.dataService.deleteChat = async () => { throw { response: { data: { error: 'Server unavailable' } } }; };
  s.requestDeleteSession({ id: 'old' });
  await s.confirmDeleteSession();
  assert.equal(s.sessions, sessions);
  assert.equal(s.deleteSessionError, 'Server unavailable');
  assert.equal(s.showDeleteSession, true);
  assert.equal(s.isDeletingSession, false);
  s.dataService.deleteChat = async () => ({ ok: false });
  await s.confirmDeleteSession();
  assert.equal(s.sessions, sessions);
  s.dataService.deleteChat = async () => ({ ok: true });
  await s.confirmDeleteSession();
  assert.equal(s.showDeleteSession, false);
});

test('API encodes session ID and supplies the owning account', async () => {
  let request;
  const apiSource = fs.readFileSync(new URL('../src/DataService.js', import.meta.url), 'utf8')
    .replace(/^import .*;\s*$/gm, '').replace('export default DataService;', 'module.exports = DataService;');
  const context = { module: {}, axios: { create: () => ({
    delete: async (...args) => { request = args; return { data: { ok: true } }; },
    interceptors: { request: { use() {} } }
  }) } };
  vm.runInNewContext(apiSource, context);
  const api = new context.module.exports('https://lucy.example', 'key');
  assert.equal((await api.deleteChat('old/?&', 'John & Arla')).ok, true);
  assert.equal(request[0], '/chats/old%2F%3F%26');
  assert.equal(request[1].params.accountName, 'John & Arla');
  await assert.rejects(api.deleteChat('', 'alice'), /required/);
  await assert.rejects(api.deleteChat('old', ''), /required/);
});
