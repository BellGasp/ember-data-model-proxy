import Service from '@ember/service';
import EmberObject from '@ember/object';
import { getOwner } from '@ember/application';

export default Service.extend({
  _getModelProxy() {
    let app = getOwner(this);
    return app.lookup('util:model-proxy', { singleton: false });
  },
  createModelProxy(modelType, model, relationshipsToProxy) {
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
          if (relationshipsToProxy.includes(name)) {
            if (descriptor.kind === 'hasMany') {

              let relModelProxies = model.get(name)
                .map(rel => {
                  let relModelProxy = this.createModelProxy(descriptor.type, rel);
                  let inverseKey = model.hasMany(name).hasManyRelationship.inverseKey;
                  relModelProxy.set(inverseKey, modelProxy);
                  return relModelProxy;
                });
              modelProxy.set(name, relModelProxies);
            } else {

              let relModelProxy = this.createModelProxy(name, model.get(name));
              let inverseKey = model.belongsTo(name).hasManyRelationship.inverseKey;
              relModelProxy.set(inverseKey, modelProxy);
              modelProxy.set(name, relModelProxy);
            }
          }
        });
      }
    }
    return modelProxy;
  }
});
