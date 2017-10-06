import modelProxy from 'dummy/utils/model-proxy';
import { module, test } from 'qunit';

module('Unit | Utility | Model proxy');

test('it works', function(assert) {
  let result = modelProxy.create();
  assert.ok(result);
});

test('it sets value in proxy', function(assert) {
  let proxy = modelProxy.create();
  proxy.set('proxy', { firstName: '' });
  proxy.set('model', { firstName: 'test' });

  proxy.set('firstName', 'some-name');

  assert.equal(proxy.get('proxy.firstName'), 'some-name');
  assert.equal(proxy.get('model.firstName'), 'test');
});

test('it gets value in proxy', function(assert) {
  let proxy = modelProxy.create();
  proxy.set('proxy', { firstName: '' });
  proxy.set('model', { firstName: 'test' });

  proxy.set('firstName', 'some-name');

  assert.equal(proxy.get('firstName'), 'some-name');
});

test('it gets value in model if not in proxy', function(assert) {
  let proxy = modelProxy.create();
  proxy.set('proxy', { firstName: '' });
  proxy.set('model', { firstName: 'test', lastName: 'some-lastname' });

  assert.equal(proxy.get('lastName'), 'some-lastname');
});

test('it updates model with proxy properties on applyChange', function(assert) {
  let proxy = modelProxy.create();
  proxy.set('proxy', { firstName: '' });
  proxy.set('model', { firstName: 'test' });

  proxy.set('firstName', 'some-name');

  assert.equal(proxy.get('proxy.firstName'), 'some-name');
  assert.equal(proxy.get('model.firstName'), 'test');

  proxy.applyChanges();

  assert.equal(proxy.get('model.firstName'), 'some-name');
});
