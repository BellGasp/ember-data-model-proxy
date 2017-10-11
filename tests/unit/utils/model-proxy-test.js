import { moduleFor, test } from 'ember-qunit';
import { make, manualSetup } from 'ember-data-factory-guy';
import { run } from '@ember/runloop';
import { A } from '@ember/array';

moduleFor('util:model-proxy', 'Unit | Utility | Model proxy', {
  needs: ['model:model', 'model:single-model', 'model:multiple-model'],
  beforeEach() {
    manualSetup(this.container);
    this.createModelProxy = (type, proxy, model) => {
      let modelProxy = this.container.lookup('util:model-proxy', { singleton: false });
      modelProxy.setProperties({
        type,
        proxy,
        model
      });
      return modelProxy;
    }
  },
});

test('it works', function(assert) {
  let result = this.createModelProxy('model');
  assert.ok(result);
});

test('it sets value in proxy', function(assert) {
  let model = make('model', { firstName: 'test' });
  let proxy = this.createModelProxy('model', { firstName: '' }, model);

  proxy.set('firstName', 'some-name');

  assert.equal(proxy.get('proxy.firstName'), 'some-name');
  assert.equal(proxy.get('model.firstName'), 'test');
});

test('it gets value in proxy', function(assert) {
  let model = make('model', { firstName: 'test' });
  let proxy = this.createModelProxy('model', { firstName: 'some-name' }, model);

  assert.equal(proxy.get('firstName'), 'some-name');
});

test('it gets value in proxy of proxy', function(assert) {
  let model = make('model', { firstName: 'test' });
  let secondProxy = this.createModelProxy('model', { testValue: 'some-test-value' });
  let proxy = this.createModelProxy('model', { firstName: 'some-name', secondProxy }, model);

  assert.equal(proxy.get('secondProxy.testValue'), 'some-test-value');
});

test('it gets value in model if not in proxy', function(assert) {
  let model = make('model', { lastName: 'lastName' });
  let proxy = this.createModelProxy('model', { firstName: '' }, model);

  assert.equal(proxy.get('lastName'), 'lastName');
});

test('it updates model with proxy properties on applyChange', function(assert) {
  let model = make('model', { firstName: 'test' });
  let proxy = this.createModelProxy('model', { firstName: '' }, model);

  proxy.set('firstName', 'some-name');

  assert.equal(proxy.get('proxy.firstName'), 'some-name');
  assert.equal(proxy.get('model.firstName'), 'test');

  run(() => proxy.applyChanges());

  assert.equal(proxy.get('model.firstName'), 'some-name');
});

test('it updates model with proxy deletion on applyChange', function(assert) {
  let model = make('model', { firstName: 'test' });
  let proxy = this.createModelProxy('model', { firstName: '' }, model);

  proxy.deleteRecord();
  
  assert.equal(proxy.get('proxy.isDeleted'), true);
  assert.equal(proxy.get('model.isDeleted'), false);

  run(() => proxy.applyChanges());

  assert.equal(proxy.get('model.isDeleted'), true);
});

test('it sets value in proxy and creates models on applyChanges', function(assert) {
  let proxy = this.createModelProxy('model', { firstName: '' });

  proxy.set('firstName', 'some-name');

  assert.equal(proxy.get('proxy.firstName'), 'some-name');
  assert.equal(proxy.get('model'), null);

  run(() => proxy.applyChanges());

  assert.equal(proxy.get('model.firstName'), 'some-name');
});

test('it updates belongsTo model property with proxy relationships on applyChange',
function(assert) {
  let model = make('model', 'with_single');
  let singleModel = this.createModelProxy('single-model',
    { firstName: 'single-model-firstName' },
    model.get('singleModel'));

  let proxy = this.createModelProxy('model', { firstName: '', singleModel }, model);

  proxy.set('singleModel.firstName', 'some-name');

  assert.equal(proxy.get('proxy.singleModel.firstName'), 'some-name');
  assert.equal(proxy.get('model.singleModel.firstName'), 'firstName');

  run(() => proxy.applyChanges());

  assert.equal(proxy.get('model.singleModel.firstName'), 'some-name');
});

test('it updates belongsTo model with proxy relationships on applyChange',
function(assert) {
  let model = make('model', 'with_single');
  let singleModel = this.createModelProxy('single-model',
    { firstName: 'single-model-firstName' },
    model.get('singleModel'));
  let otherSingleModel = this.createModelProxy('single-model',
    { firstName: 'other-model-firstName' });

  let proxy = this.createModelProxy('model', { firstName: '', singleModel }, model);

  proxy.set('singleModel', otherSingleModel);

  assert.equal(proxy.get('proxy.singleModel.firstName'), 'other-model-firstName');
  assert.equal(proxy.get('model.singleModel.firstName'), 'firstName');
  let singleModelRef = proxy.get('model.singleModel');

  run(() => proxy.applyChanges());

  assert.equal(proxy.get('model.singleModel.firstName'), 'other-model-firstName');
  assert.notEqual(proxy.get('model.singleModel'), singleModelRef);
  assert.equal(singleModelRef.get('firstName'), 'firstName');
});

test('it updates hasMany model property with proxy relationships on applyChange',
function(assert) {
  let model = make('model', 'with_multiple');

  let multipleModel = this.createModelProxy('multiple-model',
    { firstName: 'multiple-model-firstName' },
    model.get('multipleModels.firstObject'));

  let proxy = this.createModelProxy('model',
    { firstName: '', multipleModels: A([multipleModel]) },
    model);

  proxy.get('multipleModels.firstObject').set('firstName', 'some-name');

  assert.equal(proxy.get('proxy.multipleModels.firstObject.firstName'), 'some-name');
  assert.equal(proxy.get('model.multipleModels.firstObject.firstName'), 'firstName');

  run(() => proxy.applyChanges());

  assert.equal(proxy.get('model.multipleModels.firstObject.firstName'), 'some-name');
});

test('it updates hasMany model array with proxy relationships on applyChange',
function(assert) {
  let model = make('model', 'with_multiple');

  let multipleModel = this.createModelProxy('multiple-model',
    { firstName: 'some-firstName' },
    model.get('multipleModels.firstObject'));

  let proxy = this.createModelProxy('model',
    { firstName: '', multipleModels: A([multipleModel]) },
    model);

  let secondMultipleModel = this.createModelProxy('multiple-model',
    { firstName: '2nd-some-firstName' });

  assert.equal(proxy.get('proxy.multipleModels.firstObject.firstName'), 'some-firstName');
  assert.equal(proxy.get('model.multipleModels.firstObject.firstName'), 'firstName');
  assert.equal(proxy.get('model.multipleModels.length'), 1);

  proxy.get('multipleModels').addObject(secondMultipleModel);

  run(() => proxy.applyChanges());

  assert.equal(proxy.get('model.multipleModels.firstObject.firstName'), 'some-firstName');
  assert.equal(proxy.get('model.multipleModels.length'), 2);
  assert.equal(proxy.get('model.multipleModels.lastObject.firstName'), '2nd-some-firstName');

  proxy.get('multipleModels').removeObject(multipleModel);

  run(() => proxy.applyChanges());

  assert.equal(proxy.get('model.multipleModels.length'), 1);
  assert.equal(proxy.get('model.multipleModels.firstObject.firstName'), '2nd-some-firstName');
});
