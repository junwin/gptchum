import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import axios from 'axios';
import { ref, computed } from 'vue';
import { imageCard, addImageCard } from '../src/imageCards.js';

function component(file = 'Chat2') {
  const source = fs.readFileSync(new URL(`../src/components/${file}.vue`, import.meta.url), 'utf8');
  const script = source.match(/<script>([\s\S]*?)<\/script>/)[1]
    .replace(/^import .*;\s*$/gm, '').replace('export default', 'module.exports =');
  const sandbox = { module: {}, ChatWindow: {}, Menu: {}, useSettingStore: () => ({}),
    imageCard, addImageCard, console: { error() {} }, ref, computed, watch() {}, onMounted() {}, nextTick() {} };
  vm.runInNewContext(script, sandbox);
  return sandbox.module.exports;
}
function state() {
  const c = component();
  return { ...c.data(), ...c.methods, accountName: 'alice', requestAgentName: 'lucy',
    selectedSession: { id: 'chat' }, responses: [], _releaseMediaUrls() {},
    _hydrateVideoCards: async () => {}, _hydrateImageCards: async () => {} };
}
const user = (ids = ['exchange-one'], event_id = 'user-one') => ({ event_id, kind: 'user_message', role: 'user',
  correlation_ids: ids, content: 'Question', utc_timestamp: '2026-10-07T00:00:00Z' });
const remaining = [user(['exchange-two'], 'user-two'), { event_id: 'answer-two', kind: 'assistant_message',
  role: 'assistant', actor: 'star', content: 'Remaining answer', correlation_ids: ['exchange-two'] }];


test('history cards preserve IDs and enable only a single verified user correlation', () => {
  const s = state();
  const card = s._mapMessageToCard(user(), 0);
  assert.equal(card.id, 'user-one');
  assert.equal(card.event_id, 'user-one');
  assert.equal(card.exchangeCorrelationId, 'exchange-one');
  assert.equal(card.accountName, 'alice');
  assert.equal(card.sessionId, 'chat');
  assert.deepEqual(Array.from(card.correlation_ids), ['exchange-one']);
  for (const m of [user([]), user(['one', 'two']), user(['']), user([null]), user(['one'], ''),
    { ...user(), role: 'assistant', kind: 'assistant_message' }]) {
    assert.equal(s._mapMessageToCard(m, 0).exchangeCorrelationId, null);
  }
});

test('API sends an encoded correlation path and owning scope with API key', async () => {
  const source = fs.readFileSync(new URL('../src/DataService.js', import.meta.url), 'utf8')
    .replace(/^import .*;\s*$/gm, '').replace('export default DataService;', 'module.exports = DataService;');
  const sandbox = { module: {}, axios };
  vm.runInNewContext(source, sandbox);
  const api = new sandbox.module.exports('https://lucy.example', 'key');
  api.apiClient.defaults.adapter = async config => {
    assert.equal(config.method, 'delete');
    assert.equal(config.url, '/events/correlation%2F%3F%26');
    assert.equal(config.params.accountName, 'John & Arla');
    assert.equal(config.params.sessionId, 'chat');
    assert.equal(config.headers['X-API-Key'], 'key');
    return { data: { status: 'invalidated' }, status: 200, statusText: 'OK', headers: {}, config };
  };
  assert.equal((await api.deactivateExchange('correlation/?&', 'chat', 'John & Arla')).status, 'invalidated');
  await assert.rejects(api.deactivateExchange('', 'chat', 'alice'), /required/);
});

for (const status of ['invalidated', 'already_invalidated']) {
  test(`${status} reloads the selected chat and removes related tool cards`, async () => {
    const s = state();
    let requests = 0;
    s.dataService = {
      async deactivateExchange(...args) {
        requests++;
        assert.equal(s.isDeletingExchange, true);
        assert.deepEqual(args, ['exchange-one', 'chat', 'alice']);
        return { status };
      },
      async getChat(id, account) {
        assert.equal(id, 'chat'); assert.equal(account, 'alice');
        return { messages: remaining };
      },
    };
    const card = s._mapMessageToCard(user(), 0);
    s.responses = [card, { kind: 'tool_chips', chips: [{ call_id: 'old' }] }, { content: 'Old answer' }];
    s.requestDeleteExchange(card);
    assert.equal(requests, 0); // confirmation precedes any mutation
    await s.confirmDeleteExchange();
    assert.equal(requests, 1);
    assert.equal(s.responses.length, 2);
    assert.equal(s.responses[1].content, 'Remaining answer');
    assert.equal(s.selectedSession.id, 'chat');
    assert.equal(s.showDeleteExchange, false);
    assert.equal(s.isDeletingExchange, false);
  });
}

test('cancel, in-flight operations and stale scope cannot issue a deletion', async () => {
  const s = state();
  s.dataService = { deactivateExchange() { throw new Error('Must not run'); } };
  const card = s._mapMessageToCard(user(), 0);
  for (const flag of ['isSending', 'isLoadingChat', 'isDeletingExchange']) {
    s[flag] = true; s.requestDeleteExchange(card);
    assert.equal(s.showDeleteExchange, false);
    s[flag] = false;
  }
  s.requestDeleteExchange(card);
  s.showDeleteExchange = false; // Cancel
  await s.confirmDeleteExchange();
  s.requestDeleteExchange(card);
  s.selectedSession = { id: 'different' };
  await s.confirmDeleteExchange();
  assert.match(s.deleteExchangeError, /chat changed/);
});

test('API failure retains messages and permits retry; failed reload reports persisted removal', async () => {
  const s = state();
  const old = [s._mapMessageToCard(user(), 0)];
  s.responses = old;
  s.dataService = { async deactivateExchange() { throw { response: { data: { error: 'Exchange running' } } }; } };
  s.requestDeleteExchange(old[0]);
  await s.confirmDeleteExchange();
  assert.equal(s.responses, old);
  assert.equal(s.showDeleteExchange, true);
  assert.equal(s.deleteExchangeError, 'Exchange running');
  assert.equal(s.isDeletingExchange, false);
  s.dataService.deactivateExchange = async () => ({ status: 'already_invalidated' });
  s.dataService.getChat = async () => { throw new Error('Network'); };
  await s.confirmDeleteExchange();
  assert.equal(s.responses, old);
  assert.equal(s.showDeleteExchange, false);
  assert.match(s.historyRefreshError, /removed.*could not be refreshed/);
});

test('completed live request refresh gets persisted identifiers; unsaved content stays visible', async () => {
  const s = state();
  s.responses = [{ content: 'Live question' }];
  s.dataService = { getChat: async () => ({ messages: [user()] }) };
  assert.equal(await s.loadChat('chat', { completedQuestion: 'Question', knownEventIds: [] }), true);
  assert.equal(s.responses[0].exchangeCorrelationId, 'exchange-one');
  const cards = s.responses;
  assert.equal(await s.loadChat('chat', { completedQuestion: 'Unsaved', knownEventIds: ['user-one'] }), false);
  assert.equal(s.responses, cards);
});

test('message menu works by ordinary activation and rechecks busy state', () => {
  const props = { deletionDisabled: false };
  const events = [];
  const ui = component('ChatWindow').setup(props, { emit: (...args) => events.push(args) });
  let toggles = 0;
  ui.messageMenu.value = { toggle: () => toggles++ };
  const card = { exchangeCorrelationId: 'one' };
  ui.openMessageMenu({}, card);
  assert.equal(toggles, 1);
  ui.messageMenuItems.value[0].command();
  assert.equal(events[0][0], 'delete-exchange');
  assert.equal(events[0][1].exchangeCorrelationId, card.exchangeCorrelationId);
  props.deletionDisabled = true;
  ui.messageMenuItems.value[0].command();
  ui.openMessageMenu({}, card);
  assert.equal(events.length, 1);
  assert.equal(toggles, 1);
});

test('a completed stream refreshes stored targeting metadata before the next turn', async () => {
  const s = state();
  s.responses = [];
  s.$nextTick = async () => {};
  let refreshes = 0;
  s.refreshSessions = async options => { assert.equal(options.loadMessages, false); };
  s.dataService = {
    async *askQuestionStreaming() {
      yield { type: 'text', content: 'Answer' };
      yield { type: 'done', conversation_id: 'chat' };
    },
    async getChat() {
      refreshes++;
      return { messages: [user(), { event_id: 'answer-one', kind: 'assistant_message',
        role: 'assistant', actor: 'lucy', content: 'Answer', correlation_ids: ['exchange-one'] }] };
    },
  };
  await s.handleNewMessage({ content: 'Question' });
  assert.equal(refreshes, 1);
  assert.equal(s.responses[0].event_id, 'user-one');
  assert.equal(s.responses[0].exchangeCorrelationId, 'exchange-one');
  assert.equal(s.isSending, false);
});
