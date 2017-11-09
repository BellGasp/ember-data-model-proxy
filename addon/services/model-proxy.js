import Service, { inject as service } from '@ember/service';
import EmberObject, { set, get } from '@ember/object';
import { getOwner } from '@ember/application';
import { assert } from '@ember/debug';
import { A } from '@ember/array';

export default Service.extend({
  store: service(),

  _getModelProxy() {
    let app = getOwner(this);
    return app.lookup('util:model-proxy', { singleton: false });
  },

  _getRealModel(model){
    if (model && model.get) {
      return get(model, 'content') || model;
    }
    return model;
  },

  _setupHasManyRelationship(relationship, type, inverseKey, proxy, model, createProxy) {
    let hasManyModels = A();
    if (model) {
      hasManyModels = this._getRealModel(model.get(relationship));
    }

    if (createProxy) {
      if (model) {
        let relModelProxies = model.get(relationship).map(rel => {
          let relModelProxy = this.createModelProxy(type, rel);
          get(relModelProxy, 'proxy').set(inverseKey, proxy);

          return relModelProxy;
        });
        hasManyModels = relModelProxies;
      }

      set(hasManyModels, 'isProxy', true);
    }

    get(proxy, 'proxy').set(relationship, hasManyModels)
  },

  _setupBelongsToRelationship(relationship, type, inverseKey, proxy, model, createProxy) {
    let belongsToModel;
    if (model) {
      belongsToModel = this._getRealModel(model.get(relationship));
    }

    if (createProxy) {
      let underlyingModel = model ? model.get(relationship) : null;
      let relModelProxy = this.createModelProxy(type, underlyingModel);
      get(relModelProxy, 'proxy').set(inverseKey, proxy);

      belongsToModel = relModelProxy;
    }
    get(proxy, 'proxy').set(relationship, belongsToModel);
  },

  _setupRelationship(name, descriptor, modelDefinition, proxy, model, relationshipsToProxy) {
    let store = get(this, 'store');
    let inverseKey = modelDefinition.inverseFor(name, store).name;
    let createProxy = relationshipsToProxy.includes(name);

    if (descriptor.kind === 'hasMany') {
      this._setupHasManyRelationship(name, descriptor.type, inverseKey,
        proxy, model, createProxy);
    } else {
      this._setupBelongsToRelationship(name, descriptor.type, inverseKey,
        proxy, model, createProxy);
    }
  },

  _fillProxyWithModelValues(modelType, proxy, model, relationshipsToProxy) {
    let store = get(this, 'store');
    let modelDefinition = store.modelFor(modelType);

    if (!model) {
      proxy.setUnknownProperty('isNew', true, true);
    }

    modelDefinition.eachAttribute(name => {
      if (model) {
        proxy.setUnknownProperty(name, model.get(name), true);
      }
    });

    modelDefinition.eachRelationship((name, descriptor) =>
      this._setupRelationship(name, descriptor, modelDefinition,
        proxy, model, relationshipsToProxy));
  },

  createModelProxy(modelType, baseModel, ...relationshipsToProxy) {
    assert('A model type must be passed as the first parameter.', modelType);

    let model = this._getRealModel(baseModel);

    let modelProxy = this._getModelProxy();
    modelProxy.setProperties({
      type: modelType,
      proxy: EmberObject.create(),
      model: model
    });

    this._fillProxyWithModelValues(modelType, modelProxy, model, relationshipsToProxy);

    return modelProxy;
  }
});
