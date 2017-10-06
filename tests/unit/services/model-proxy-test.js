import { moduleFor, test } from 'ember-qunit';
import EmberObject from '@ember/object';

moduleFor('service:model-proxy', 'Unit | Service | proxy model');

test('it exists', function(assert) {
  let service = this.subject();
  assert.ok(service);
});

test('it can get the proxy-model', function(assert) {
  let object = EmberObject.extend({
    testProperty: 'test'
  });
  this.registry.register('util:proxy-model', object);
  let service = this.subject();
  assert.ok(service);
});
