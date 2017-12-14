import { moduleFor, test } from 'ember-qunit';
import { make, manualSetup } from 'ember-data-factory-guy';
import { run } from '@ember/runloop';

moduleFor('service:model-proxy', 'Unit | Service | Model proxy', {
  needs: [
    'service:model-extractor',
    'util:model-proxy',
    'model:model',
    'model:single-model',
    'model:multiple-model'
  ],
  beforeEach() {
    manualSetup(this.container);
  },
});

test('it exists', function(assert) {
  let service = this.subject();
  assert.ok(service);
});

test('it can get the model-proxy', function(assert) {
  let service = this.subject();
  let modelProxy = service._getModelProxy();
  assert.ok(modelProxy);
});

test('it can get the model-proxy not as a singleton', function(assert) {
  let service = this.subject();
  let modelProxy = service._getModelProxy();
  let modelProxy2 = service._getModelProxy();

  assert.ok(modelProxy);
  assert.ok(modelProxy2);
  assert.notEqual(modelProxy, modelProxy2);
});

test('throws assert if no model type is passed to create', function(assert) {
  let service = this.subject();
  assert.throws(service.createModelProxy, 'A model type must be passed as the first parameter.');
});

test('it can create a model proxy without model', function(assert) {
  let service = this.subject();
  let proxy = service.createModelProxy('model');

  assert.ok(proxy.get('proxy'));
  assert.equal(proxy.get('type'), 'model');
  assert.notOk(proxy.get('model'));
  assert.equal(proxy.get('proxy.isNew'), true);
});

test('it can create a model proxy with model', function(assert) {
  let service = this.subject();
  let model = make('model', { firstName: 'some-firstName' });
  let proxy = service.createModelProxy('model', model);

  assert.ok(proxy.get('model'));
  assert.equal(proxy.get('model.firstName'), 'some-firstName');
});

test('it can create a model proxy with model without setting hasDirtyAttributes', function(assert) {
  let service = this.subject();
  let model = make('model', { firstName: 'some-firstName' });
  let proxy = service.createModelProxy('model', model);

  assert.ok(proxy.get('model'));
  assert.equal(proxy.get('model.firstName'), 'some-firstName');
  assert.equal(proxy.get('hasDirtyAttributes'), false);
});

test('it can create a model proxy with model and belongsTo relationship', function(assert) {
  let service = this.subject();
  let model = make('model', 'with_single', { firstName: 'some-firstName' });
  let proxy = service.createModelProxy('model', model, 'singleModel');

  assert.ok(proxy.get('model'));
  assert.equal(proxy.get('model.firstName'), 'some-firstName');
  assert.ok(proxy.get('singleModel'));
  assert.equal(proxy.get('singleModel.isProxy'), true);

  // without .content it checks with the ObjectProxy around the model instead of the model itself
  assert.equal(proxy.get('singleModel.model'), model.get('singleModel.content'));
});

test('it can create a model proxy with model and hasMany relationship', function(assert) {
  let service = this.subject();
  let model = make('model', 'with_multiple', { firstName: 'some-firstName' });
  let proxy = service.createModelProxy('model', model, 'multipleModels');

  assert.ok(proxy.get('model'));
  assert.equal(proxy.get('model.firstName'), 'some-firstName');
  assert.ok(proxy.get('multipleModels'));
  assert.equal(proxy.get('multipleModels.isProxy'), true);
  assert.equal(proxy.get('multipleModels.length'), 1);

  assert.equal(proxy.get('multipleModels.firstObject.model'),
    model.get('multipleModels.firstObject'));
});

test('it can create a model proxy without model and hasMany relationship', function(assert) {
  let service = this.subject();
  let proxy = service.createModelProxy('model', null, 'multipleModels');
  let multipleModel = service.createModelProxy('multiple-model');
  multipleModel.set('firstName', 'some-firstName');

  assert.ok(proxy.get('multipleModels'));
  assert.notOk(proxy.get('model'));
  assert.equal(proxy.get('multipleModels.isProxy'), true);
  assert.equal(proxy.get('multipleModels.length'), 0);

  proxy.get('multipleModels').addObject(multipleModel);

  assert.equal(proxy.get('multipleModels.length'), 1);
  assert.equal(proxy.get('multipleModels.firstObject.firstName'), 'some-firstName');
});

test('it can create a model proxy with model and computed property', function(assert) {
  let service = this.subject();
  let model = make('model', {
    firstName: 'first',
    middleName: 'middle',
    lastName: 'last'
  });
  let proxy = service.createModelProxy('model', model);

  assert.equal(proxy.get('model.fullName'), 'first middle last');
  assert.equal(proxy.get('fullName'), 'first middle last');

  proxy.set('firstName', 'other-first');

  assert.equal(proxy.get('model.fullName'), 'first middle last');
  assert.equal(proxy.get('fullName'), 'other-first middle last');
});

test('it can create a model proxy without model and computed property', function(assert) {
  let service = this.subject();
  let proxy = service.createModelProxy('model', null);

  assert.notOk(proxy.get('model'));
  assert.equal(proxy.get('fullName'), '  ');

  proxy.setProperties({
    firstName: 'firstName',
    middleName: 'middleName',
    lastName: 'lastName'
  });

  assert.notOk(proxy.get('model.fullName'));
  assert.equal(proxy.get('fullName'), 'firstName middleName lastName');
});

test('it can create a model proxy without model and observer', function(assert) {
  let service = this.subject();
  let proxy = service.createModelProxy('model', null);

  assert.notOk(proxy.get('model'));
  assert.equal(proxy.get('fullNameObserverHasTriggered'), false);

  run(() => proxy.setProperties({
    firstName: 'firstName',
    middleName: 'middleName',
    lastName: 'lastName'
  }));

  assert.notOk(proxy.get('model.fullName'));
  assert.equal(proxy.get('fullName'), 'firstName middleName lastName');
  assert.equal(proxy.get('fullNameObserverHasTriggered'), true);
});
