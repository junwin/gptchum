import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import axios from 'axios';
const serviceSource = fs.readFileSync(new URL('../src/DataService.js', import.meta.url), 'utf8')
  .replace(/^import .*;\s*$/gm, '').replace('export default DataService;', 'module.exports = DataService;');
const serviceSandbox = { module: {}, axios, URL, fetch: (...args) => globalThis.fetch(...args) };
vm.runInNewContext(serviceSource, serviceSandbox);
const DataService = serviceSandbox.module.exports;

function component() {
  const source = fs.readFileSync(new URL('../src/components/Chat2.vue', import.meta.url), 'utf8');
  const script = source.match(/<script>([\s\S]*?)<\/script>/)[1]
    .replace(/^import .*;\s*$/gm, '').replace('export default', 'module.exports =');
  const sandbox = { module: {}, ChatWindow: {}, useSettingStore: () => ({}),
    URL: { createObjectURL: () => 'blob:stored-image', revokeObjectURL: () => {} }, console };
  vm.runInNewContext(script, sandbox);
  return { methods: sandbox.module.exports.methods, sandbox };
}

test('image downloads use the Lucy base URL and API key', async (t) => {
  const previous = globalThis.fetch;
  t.after(() => { globalThis.fetch = previous; });
  const blob = new Blob(['png']);
  globalThis.fetch = async (url, options) => {
    assert.equal(url, 'https://lucy.example/download/image/123?accountName=john');
    assert.equal(options.headers['X-API-Key'], 'test-key');
    return { ok: true, blob: async () => blob };
  };
  const service = new DataService('https://lucy.example', 'test-key');
  assert.equal(await service.downloadImage('/download/image/123?accountName=john'), blob);
  await assert.rejects(() => service.downloadImage('https://other.example/image.png'), /Lucy server/);
});

test('stored images hydrate while inline images remain available', async () => {
  const { methods } = component();
  const context = { dataService: { downloadImage: async url => {
    assert.equal(url, '/download/image/123?accountName=john'); return new Blob(['png']);
  } } };
  const card = { kind: 'image', image_url: '/download/image/123?accountName=john' };
  await methods._hydrateImageCard.call(context, card);
  assert.equal(card.image_url, 'blob:stored-image');
  assert.equal(card.remote_url, '/download/image/123?accountName=john');
  assert.equal(card.loading, false);
  const inline = { kind: 'image', image_url: 'data:image/png;base64,abc' };
  await methods._hydrateImageCard.call(context, inline);
  assert.equal(inline.image_url, 'data:image/png;base64,abc');
});

test('download errors appear on the image card', async () => {
  const { methods } = component();
  const card = { kind: 'image', image_url: '/download/image/123' };
  await methods._hydrateImageCard.call({ dataService: { downloadImage: async () => { throw new Error('Unauthorized'); } } }, card);
  assert.equal(card.error, 'Unauthorized');
  assert.equal(card.loading, false);
});

test('history mapping preserves stored URL and blob URLs are released', () => {
  const { methods, sandbox } = component();
  const context = { _parseContent: JSON.parse, selectedAgent: { name: 'lucy' } };
  const card = methods._mapMessageToCard.call(context, {
    kind: 'generated_image', content: JSON.stringify({ image_url: '/download/image/123', alt: 'A hill' })
  }, 0);
  assert.equal(card.image_url, '/download/image/123');
  assert.equal(card.alt, 'A hill');
  let revoked;
  sandbox.URL.revokeObjectURL = url => { revoked = url; };
  methods._releaseMediaUrls.call({}, [{ kind: 'image', image_url: 'blob:old' }]);
  assert.equal(revoked, 'blob:old');
});
