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
        set(proxy, 'currentState.isDirty', true);
        this.notifyPropertyChange('currentState.isDirty');
      }
      this.notifyPropertyChange(property);
    }
  },
  setComputedProperty(name, computedProperty) {
    let proxy = get(this, 'proxy');
    if (proxy) {
      proxy[name] = computedProperty;
    }
  },

  _applyBelongsToChanges(property, inverseKey) {
    let model = get(this, 'model');
    let proxy = get(this, 'proxy');

    let belongsToProxyModel = get(proxy, property);
    let belongsToModel = belongsToProxyModel;

    if (belongsToProxyModel && get(belongsToProxyModel, 'isProxy')) {
      belongsToProxyModel.applyChanges(true, inverseKey);

      belongsToModel = get(belongsToProxyModel, 'model');
    }
    set(model, property, belongsToModel);
  },
  _applyHasManyChanges(property, inverseKey) {
    let model = get(this, 'model');
    let proxy = get(this, 'proxy');
    let arrayToRemove = A();
    let arrayToAdd = A();

    let hasManyArrayProxy = get(proxy, property);
    let modelArray = get(model, property);

    hasManyArrayProxy.forEach(hasManyProxy => {
      let hasManyModel = hasManyProxy;

      if (hasManyModel && get(hasManyProxy, 'isProxy')) {
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
    }

    model = get(model, 'content') || model;

    let store = get(this, 'store');
    let modelDefinition = store.modelFor(modelType);

    modelDefinition.eachAttribute(name => {
      if (proxy.hasOwnProperty(name)) {
        set(model, name, get(proxy, name));
      }
    });

    if (applyRelationships) {
      modelDefinition.eachRelationship((name, descriptor) => {
        if (!ignoredRelationships.includes(name)) {
          let inverseConfig = modelDefinition.inverseFor(name, store);

          if (inverseConfig) {
            let inverseKey = inverseConfig.name;

            if (proxy.hasOwnProperty(name)) {
              if (descriptor.kind === 'belongsTo') {
                this._applyBelongsToChanges(name, inverseKey);
              } else if (descriptor.kind === 'hasMany') {
                this._applyHasManyChanges(name, inverseKey);
              }
            }
          }
        }
      });
    }

    set(proxy, 'currentState.isDirty', false);
    this.notifyPropertyChange('currentState.isDirty');
  },
  discardChanges() {},

  save(options) {
    this.applyChanges();
    let model = get(this, 'model');
    if (model) {
      return model.save(options);
    }

    let type = get(this, 'type');
    let store = get(this, 'store');

    model = store.createRecord(type);
    set(this, 'model', model);

    this.applyChanges();
    return model.save(options);
  },
  deleteRecord() {
    let proxy = get(this, 'proxy');

    set(proxy, 'isDeleted', true);
    this.notifyPropertyChange('isDeleted');

    set(proxy, 'currentState.isDirty', true);
    this.notifyPropertyChange('currentState.isDirty');
  }
});
