import EmberObject from '@ember/object';
import { get, set } from '@ember/object';
import { inject as service } from '@ember/service';
import Evented from '@ember/object/evented';
import { A } from '@ember/array';

export default EmberObject.extend(Evented, {
  model: null,
  proxy: null,
  type: null,

  isProxy: true,

  store: service(),

  unknownProperty(property) {
    let proxy = get(this, 'proxy');
    if (proxy && proxy.hasOwnProperty(property)) {
      return get(proxy, property);
    }
    let model = get(this, 'model')
    if (model) {
      return get(model, property);
    }
  },
  setUnknownProperty(property, value, initialSet) {
    let proxy = get(this, 'proxy');
    if (proxy) {
      set(proxy, property, value);
      if (!get(proxy, 'hasDirtyAttributes') && !initialSet) {
        set(proxy, 'hasDirtyAttributes', true);
        this.notifyPropertyChange('hasDirtyAttributes');
      }
      this.notifyPropertyChange(property);
    }
  },

  _applyBelongsToChanges(property, inverseKey) {
    let model = get(this, 'model');
    let proxy = get(this, 'proxy');

    let belongsToProxyModel = get(proxy, property);
    let belongsToModel = belongsToProxyModel;

    if (get(belongsToProxyModel, 'isProxy')) {
      belongsToProxyModel.applyChanges(true, inverseKey);

      belongsToModel = get(belongsToProxyModel, 'model');
    }
    model.set(property, belongsToModel);
  },
  _applyHasManyChanges(property, inverseKey) {
    let model = get(this, 'model');
    let proxy = get(this, 'proxy');
    let arrayToRemove = A();
    let arrayToAdd = A();

    let hasManyArrayProxy = get(proxy, property);
    let modelArray = model.get(property);

    hasManyArrayProxy.forEach(hasManyProxy => {
      let hasManyModel = hasManyProxy;

      if (get(hasManyProxy, 'isProxy')) {
        hasManyProxy.applyChanges(true, inverseKey);

        hasManyModel = get(hasManyProxy, 'model');
      }

      if (!modelArray.includes(hasManyModel)) {
        arrayToAdd.addObject(hasManyModel);
      }
    });

    let hasManyArrayProxyModels = hasManyArrayProxy.map(item => {
      if (get(item, 'isProxy')) {
        return get(item, 'model');
      }
      return item;
    });

    modelArray.forEach(hasManyModel => {
      if (!hasManyArrayProxyModels.includes(hasManyModel)) {
        arrayToRemove.addObject(hasManyModel);
      }
    });

    arrayToRemove.forEach(item => modelArray.removeObject(item));
    arrayToAdd.forEach(item => modelArray.addObject(item));
  },

  applyChanges(applyRelationships = true, ...ignoredRelationships) {
    let model = get(this, 'model');
    let proxy = get(this, 'proxy');
    if (!proxy) {
      return;
    }

    if (get(proxy, 'isDeleted')) {
      if (model) {
        model.deleteRecord();
      }
      return;
    }

    let modelType = get(this, 'type');
    if (!model && modelType) {
      model = get(this, 'store').createRecord(modelType);
      set(this, 'model', model);
      delete get(this, 'proxy').isNew;
    }

    model = get(model, 'content') || model;

    let store = get(this, 'store');
    let modelDefinition = store.modelFor(modelType);

    modelDefinition.eachAttribute(name => {
      if (proxy.hasOwnProperty(name)) {
        model.set(name, get(proxy, name));
      }
    });
    if (applyRelationships) {
      modelDefinition.eachRelationship((name, descriptor) => {
        if (!ignoredRelationships.includes(name)) {
          let inverseKey = modelDefinition.inverseFor(name, store).name;

          if (descriptor.kind === 'belongsTo' && proxy.hasOwnProperty(name)) {
            this._applyBelongsToChanges(name, inverseKey);
          } else if (descriptor.kind === 'hasMany' && proxy.hasOwnProperty(name)) {
            this._applyHasManyChanges(name, inverseKey);
          }
        }
      });
    }

    set(proxy, 'hasDirtyAttributes', false);
    this.notifyPropertyChange('hasDirtyAttributes');
  },
  discardChanges() {},

  save(options) {
    this.applyChanges();

    let model = get(this, 'model');
    return model.save(options);
  },
  deleteRecord() {
    let proxy = get(this, 'proxy');

    set(proxy, 'isDeleted', true);
    this.notifyPropertyChange('isDeleted');

    set(proxy, 'hasDirtyAttributes', true);
    this.notifyPropertyChange('hasDirtyAttributes');
  }
});
