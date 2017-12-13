import Service, { inject as service } from '@ember/service';
import EmberObject, { set, get } from '@ember/object';
import { getOwner } from '@ember/application';
import { assert } from '@ember/debug';
import { A } from '@ember/array';
import { setProperties } from '@ember/object';
import { addObserver } from '@ember/object/observers';

export default Service.extend({
  store: service(),

  _getModelProxy() {
    let app = getOwner(this);
    return app.lookup('util:model-proxy', { singleton: false });
  },

  _getRealModel(model) {
    if (model && get(model, 'content')) {
      return get(model, 'content');
    }
    return model;
  },

  _setupCurrentState(proxy, model) {
    if (model) {
      var currentState = EmberObject.create({
        isEmpty: get(model, 'currentState.isEmpty'),
        isLoading: get(model, 'currentState.isLoading'),
        isLoaded: get(model, 'currentState.isLoaded'),
        isDirty: get(model, 'currentState.isDirty'),
        isSaving: get(model, 'currentState.isSaving'),
        isDeleted: get(model, 'currentState.isDeleted'),
        isNew: get(model, 'currentState.isNew'),
        isValid: get(model, 'currentState.isValid')
      });
    } else {
      currentState = EmberObject.create({
        isEmpty: false,
        isLoading: false,
        isLoaded: false,
        isDirty: false,
        isSaving: false,
        isDeleted: false,
        isNew: true,
        isValid: true
      });
    }

    let internalProxy = get(proxy, 'proxy');
    internalProxy.currentState = currentState;
    internalProxy._internalModel.currentState = currentState;
  },
  _addObserver(proxy, model, propertyName) {
    let observer = model[propertyName];
    let observedProperties = observer.__ember_observes__;
    let internalProxy = get(proxy, 'proxy');

    observedProperties.forEach(property => {
      addObserver(internalProxy, property, internalProxy, model[propertyName]);
    });
  },
  _addProperty(proxy, model, propertyName) {
    let propertyValue = model[propertyName];
    get(proxy, 'proxy')[propertyName] = propertyValue;
  },
  _addComputedProperty(proxy, modelDefinition, name) {
    let computedProperty = modelDefinition.proto()[name];
    proxy.setComputedProperty(name, computedProperty);
  },

  _getSimpleProperties(modelDefinition) {
    let proto = modelDefinition.proto();
    let properties = Object.keys(proto);

    return properties.filter(property => {
      return !property.startsWith('_') &&
        !proto[property].isClass &&
        !proto[property].isDescriptor &&
        !proto[property].__ember_observes__;
    });
  },
  _getObservers(modelDefinition) {
    let proto = modelDefinition.proto();
    let properties = Object.keys(proto);

    return properties.filter(property => {
      return proto[property].__ember_observes__;
    });
  },
  _getComputedProperties(modelDefinition) {
    let computedProperties = A();

    modelDefinition.eachComputedProperty((name, descriptor) => {
      if (!(descriptor.isAttribute || descriptor.isRelationship)) {
        computedProperties.addObject(name);
      }
    });

    return computedProperties;
  },

  _getMissingDependentProperties(proxy, modelDefinition, computedProperties) {
    let modelProto = modelDefinition.proto();

    return computedProperties.map(computedProperty => {
      let dependentKeys = modelProto[computedProperty]._dependentKeys;

      if (dependentKeys) {
        return dependentKeys.map(key => {
          let firstKey = key.split('.')[0];

          if (!get(proxy, 'proxy').hasOwnProperty(firstKey)) {
            return firstKey;
          }
        });
      }
    })
    .reduce((accumulator, keys) => A(accumulator.concat(keys)), A())
    .uniq()
    .filter(key => key);
  },

  _setupSimpleProperties(proxy, model, modelDefinition) {
    let properties = this._getSimpleProperties(modelDefinition);

    properties.forEach(property =>
      this._addProperty(proxy, model || modelDefinition.proto(), property));
  },
  _setupObservers(proxy, model, modelDefinition) {
    let observers = this._getObservers(modelDefinition);

    observers.forEach(observer =>
      this._addObserver(proxy, model || modelDefinition.proto(), observer));
  },
  _setupComputedProperties(proxy, model, modelDefinition) {
    let computedProps = this._getComputedProperties(modelDefinition);
    let dependentProps = this._getMissingDependentProperties(proxy, modelDefinition, computedProps);

    dependentProps.forEach(property =>
      this._addProperty(proxy, model || modelDefinition.proto(), property));
    computedProps.forEach(computedProperty =>
      this._addComputedProperty(proxy, modelDefinition, computedProperty));
  },

  _setupHasManyRelationship(relationship, type, inverseKey, proxy, model, createProxy) {
    let hasManyModels = A();
    if (model) {
      hasManyModels = this._getRealModel(get(model, relationship));
    }

    if (createProxy) {
      if (model) {
        let relModelProxies = get(model, relationship).map(rel => {
          let relModelProxy = this.createModelProxy(type, rel);
          set(get(relModelProxy, 'proxy'), inverseKey, proxy);

          return relModelProxy;
        });
        hasManyModels = relModelProxies;
      }

      set(hasManyModels, 'isProxy', true);
    }

    set(get(proxy, 'proxy'), relationship, hasManyModels)
  },

  _setupBelongsToRelationship(relationship, type, inverseKey, proxy, model, createProxy) {
    let belongsToModel;
    if (model) {
      belongsToModel = this._getRealModel(get(model, relationship));
    }

    if (createProxy) {
      let underlyingModel = model ? get(model, relationship) : null;
      let relModelProxy = this.createModelProxy(type, underlyingModel);
      set(get(relModelProxy, 'proxy'), inverseKey, proxy);

      belongsToModel = relModelProxy;
    }
    set(get(proxy, 'proxy'), relationship, belongsToModel);
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
  _setupRelationships(proxy, model, modelDefinition, relationshipsToProxy) {
    modelDefinition.eachRelationship((name, descriptor) =>
      this._setupRelationship(name, descriptor, modelDefinition,
        proxy, model, relationshipsToProxy));
  },
  _setupAttributes(proxy, model, modelDefinition) {
    modelDefinition.eachAttribute(name => {
      let value = model ? get(model, name) : '';
      proxy.setUnknownProperty(name, value, true);
    });
  },

  _fillProxyWithModelValues(modelType, proxy, model, relationshipsToProxy) {
    let store = get(this, 'store');
    let modelDefinition = store.modelFor(modelType);

    this._setupCurrentState(proxy, model, modelDefinition);

    this._setupAttributes(proxy, model, modelDefinition);
    this._setupRelationships(proxy, model, modelDefinition, relationshipsToProxy);

    this._setupSimpleProperties(proxy, model, modelDefinition);

    this._setupObservers(proxy, model, modelDefinition);
    this._setupComputedProperties(proxy, model, modelDefinition);
  },

  createModelProxy(modelType, baseModel, ...relationshipsToProxy) {
    assert('A model type must be passed as the first parameter.', modelType);

    let model = this._getRealModel(baseModel);

    let modelProxy = this._getModelProxy();
    setProperties(modelProxy, {
      type: modelType,
      proxy: EmberObject.create({
        _internalModel: EmberObject.create()
      }),
      model: model
    });

    this._fillProxyWithModelValues(modelType, modelProxy, model, relationshipsToProxy);

    return modelProxy;
  }
});
