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

  _setupHasManyRelationship(relationship, type, inverseKey, proxy, model, createProxy) {
    let hasManyModels = A();
    if (model) {
      hasManyModels = model.get(relationship);
      if (hasManyModels && hasManyModels.get) {
        hasManyModels = hasManyModels.get('content') || hasManyModels;
      }
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
      belongsToModel = model.get(relationship);
      if (belongsToModel && belongsToModel.get) {
        belongsToModel = belongsToModel.get('content') || belongsToModel;
      }
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
    let store = this.get('store');
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
    let store = this.get('store');
    let modelDefinition = store.modelFor(modelType);

    modelDefinition.eachAttribute(name => {
      if (model) {
        proxy.set(name, model.get(name));
      }
    });

    modelDefinition.eachRelationship((name, descriptor) =>
      this._setupRelationship(name, descriptor, modelDefinition,
        proxy, model, relationshipsToProxy));
  },

  createModelProxy(modelType, baseModel, ...relationshipsToProxy) {
    assert('A model type must be passed as the first parameter.', modelType);

    let model = baseModel
    // Need to get the model in itself if it's a proxy (ObjectProxy)
    if (baseModel && baseModel.get) {
      model = baseModel.get('content') || baseModel;
    }

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
