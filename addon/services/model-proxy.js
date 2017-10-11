import Service from '@ember/service';
import EmberObject, { set, get } from '@ember/object';
import { getOwner } from '@ember/application';
import { assert } from '@ember/debug';

export default Service.extend({
  _getModelProxy() {
    let app = getOwner(this);
    return app.lookup('util:model-proxy', { singleton: false });
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

    if (model) {
      model.eachAttribute(name => {
        modelProxy.set(name, model.get(name));
      });

      if (relationshipsToProxy && relationshipsToProxy.length > 0) {
        model.eachRelationship((name, descriptor) => {
          if (descriptor.kind === 'hasMany') {
            let hasManyModels = model.get(name);

            if (relationshipsToProxy.includes(name)) {
              let relModelProxies = model.get(name)
                .map(rel => {
                  let relModelProxy = this.createModelProxy(descriptor.type, rel);
                  let inverseKey = model.hasMany(name).hasManyRelationship.inverseKey;
                  get(relModelProxy, 'proxy').set(inverseKey, modelProxy);

                  return relModelProxy;
                });
              hasManyModels = relModelProxies;
              set(hasManyModels, 'isProxy', true);
            }

            modelProxy.set(name, hasManyModels)
          } else {
            let belongsToModel = model.get(name);

            if (relationshipsToProxy.includes(name)) {
              let relModelProxy = this.createModelProxy(name, model.get(name));
              let inverseKey = model.belongsTo(name).belongsToRelationship.inverseKey;
              get(relModelProxy, 'proxy').set(inverseKey, modelProxy);

              belongsToModel = relModelProxy;
            }

            modelProxy.set(name, belongsToModel);
          }
        });
      }
    }
    return modelProxy;
  }
});
