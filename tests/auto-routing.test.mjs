import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import axios from 'axios';
import { imageCard, addImageCard } from '../src/imageCards.js';

const serviceSource = fs.readFileSync(new URL('../src/DataService.js', import.meta.url), 'utf8')
  .replace(/^import .*;\s*$/gm, '').replace('export default DataService;', 'module.exports = DataService;');
function service(fetch) {
  const sandbox = { module: {}, axios, fetch, TextDecoder };
  vm.runInNewContext(serviceSource, sandbox);
  return new sandbox.module.exports('https://lucy.example', 'key');
}
function component() {
  const source = fs.readFileSync(new URL('../src/components/Chat2.vue', import.meta.url), 'utf8');
  const script = source.match(/<script>([\s\S]*?)<\/script>/)[1]
    .replace(/^import .*;\s*$/gm, '').replace('export default', 'module.exports =');
  const sandbox = { module: {}, ChatWindow: {}, useSettingStore: () => ({}), imageCard, addImageCard, console };
  vm.runInNewContext(script, sandbox);
  return sandbox.module.exports;
}
for (const auto of [false, true]) {
  test(`streaming request ${auto ? 'routes automatically' : 'preserves manual choices'}`, async () => {
    let sent;
    const api = service(async (url, options) => {
      assert.equal(url, 'https://lucy.example/ask');
      assert.equal(options.headers['X-API-Key'], 'key');
      sent = JSON.parse(options.body);
      return { ok: true, body: { getReader: () => ({ read: async () => ({ done: true }) }) } };
    });
    for await (const event of api.askQuestionStreaming('Create an image', 'star', 'arla', 'session', 'skinny', ['photo'], auto)) {}
    assert.equal(sent.question, 'Create an image');
    assert.equal(sent.accountName, 'arla');
    assert.equal(sent.conversationId, 'session');
    assert.deepEqual(sent.image_ids, ['photo']);
    assert.equal(sent.stream, true);
    assert.equal(sent.agentName, auto ? 'lucy' : 'star');
    if (auto) {
      assert.equal(sent.routing, 'auto');
      assert.equal('contextName' in sent, false);
    } else {
      assert.equal('routing' in sent, false);
      assert.equal(sent.contextName, 'skinny');
    }
  });
}

test('auto starts unchecked and switching it off restores the manual agent', () => {
  const c = component();
  const state = c.data();
  assert.equal(state.autoRouting, false);
  state.selectedAgent = { name: 'star' };
  assert.equal(c.computed.requestAgentName.call(state), 'star');
  state.autoRouting = true;
  assert.equal(c.computed.requestAgentName.call(state), 'lucy');
  state.autoRouting = false;
  assert.equal(c.computed.requestAgentName.call(state), 'star');
});

test('auto send passes current account and labels the response with the routed specialist', async () => {
  const c = component();
  let args;
  const state = {
    ...c.data(), ...c.methods, autoRouting: true, requestAgentName: 'lucy',
    selectedAgent: { name: 'star' }, contextName: 'skinny', accountName: 'arla',
    selectedSession: { id: 'session' }, responses: [],
    $nextTick: async () => {}, refreshSessions: async () => {},
    dataService: { async *askQuestionStreaming(...values) {
      args = values;
      yield { type: 'action', action: 'request_routing', action_payload: { selected_agent: 'lumia' } };
      yield { type: 'text', content: 'Here is the image' };
      yield { type: 'done', conversation_id: 'session' };
    } },
  };
  await c.methods._sendMessage.call(state, { content: 'Create an image' });
  assert.deepEqual(Array.from(args), ['Create an image', 'lucy', 'arla', 'session', null, null, true]);
  assert.equal(state.responses[1].role, 'lumia');
  assert.equal(state.responses[1].content, 'Here is the image');
  assert.equal(state.selectedAgent.name, 'star');
  assert.equal(state.contextName, 'skinny');
});

for (const storedAgent of ['lucy', '']) {
  test(`empty chat reopens with ${storedAgent || 'missing'} stored agent`, async () => {
    const c = component();
    const state = {
      ...c.data(), ...c.methods, requestAgentName: 'lucy', accountName: 'arla',
      dataService: { getChat: async (sessionId, accountName) => {
        assert.equal(sessionId, 'session');
        assert.equal(accountName, 'arla');
        return { agent_name: storedAgent, messages: [] };
      } },
      _releaseMediaUrls() {}, _hydrateVideoCards: async () => {}, _hydrateImageCards: async () => {},
    };
    await c.methods.loadChat.call(state, 'session');
    assert.equal(state.responses[0].role, 'lucy');
    assert.equal(state.responses[0].content, 'Hello! How can I help you?');
    assert.equal(state.isLoadingChat, false);
  });
}


test('chat history request supplies the owning account and API key', async () => {
  const api = service();
  const chat = { id: 'session', messages: [{ role: 'user', content: 'hello' }] };
  api.apiClient.defaults.adapter = async (config) => {
    assert.equal(config.url, '/chats/session');
    assert.equal(config.params.accountName, 'John & Arla');
    const url = new URL(api.apiClient.getUri(config));
    assert.equal(url.searchParams.get('accountName'), 'John & Arla');
    assert.equal(config.headers['X-API-Key'], 'key');
    return { data: chat, status: 200, statusText: 'OK', headers: {}, config };
  };
  assert.equal(await api.getChat('session', 'John & Arla'), chat);
});

test('chat history requires an account before sending the request', async () => {
  const api = service();
  let calls = 0;
  api.apiClient.defaults.adapter = async () => { calls++; };
  for (const account of [undefined, null, '', '   ']) {
    await assert.rejects(() => api.getChat('session', account), /accountName is required/);
  }
  assert.equal(calls, 0);
});
