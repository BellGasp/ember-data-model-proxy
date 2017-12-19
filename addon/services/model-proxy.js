import Service, { inject as service } from '@ember/service';
import EmberObject, { set, get } from '@ember/object';
import { getOwner } from '@ember/application';
import { assert } from '@ember/debug';
import { A } from '@ember/array';
import { setProperties } from '@ember/object';
import { addObserver } from '@ember/object/observers';

export default Service.extend({
  store: service(),
  modelExtractor: service(),

  _getModelProxy() {
    let app = getOwner(this);
    return app.lookup('util:model-proxy', { singleton: false });
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

  _setupSimpleProperties(proxy, model, modelDefinition) {
    let modelExtractor = this.get('modelExtractor');
    let properties = modelExtractor.getSimpleProperties(modelDefinition);

    properties.forEach(property =>
      this._addProperty(proxy, model || modelDefinition.proto(), property));
  },

  _setupObservers(proxy, model, modelDefinition) {
    let modelExtractor = this.get('modelExtractor');
    let observers = modelExtractor.getObservers(modelDefinition);

    observers.forEach(observer =>
      this._addObserver(proxy, model || modelDefinition.proto(), observer));
  },

  _setupComputedProperties(proxy, model, modelDefinition) {
    let modelExtractor = this.get('modelExtractor');
    let computedProps = modelExtractor.getComputedProperties(modelDefinition);
    let dependentProps = modelExtractor.getMissingDependentProperties(proxy, modelDefinition, computedProps);

    dependentProps.forEach(property =>
      this._addProperty(proxy, model || modelDefinition.proto(), property));
    computedProps.forEach(computedProperty =>
      this._addComputedProperty(proxy, modelDefinition, computedProperty));
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

      let internalProxy = get(proxy, 'proxy');
      internalProxy.currentState = currentState;
      internalProxy._internalModel.currentState = currentState;
    }
  },

  _setupHasManyRelationship(relationship, type, inverseKey, proxy, model, createProxy) {
    let hasManyModels = A();
    if (model) {
      let modelExtractor = this.get('modelExtractor');
      hasManyModels = modelExtractor.getRealModel(get(model, relationship));
    }

    if (createProxy) {
      if (model) {
        let relModelProxies = get(model, relationship).map(rel => {
          let relModelProxy = this.createModelProxy(type, rel, false);
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
    let belongsToModel = undefined;
    if (createProxy && model) {
      let modelExtractor = this.get('modelExtractor');
      belongsToModel = modelExtractor.getRealModel(get(model, relationship));

      let underlyingModel = model ? get(model, relationship) : null;
      let relModelProxy = this.createModelProxy(type, underlyingModel, false);
      set(get(relModelProxy, 'proxy'), inverseKey, proxy);

      belongsToModel = relModelProxy;
    }
    set(get(proxy, 'proxy'), relationship, belongsToModel);

    if (!get(proxy, 'proxy').hasOwnProperty(relationship)) {
      get(proxy, 'proxy')[relationship] = belongsToModel;
    }
  },

  _setupRelationship(name, descriptor, modelDefinition, proxy, model, proxyRelationships) {
    let store = get(this, 'store');
    let inverseKey = modelDefinition.inverseFor(name, store).name;

    if (descriptor.kind === 'hasMany') {
      this._setupHasManyRelationship(name, descriptor.type, inverseKey,
        proxy, model, proxyRelationships);
    } else {
      this._setupBelongsToRelationship(name, descriptor.type, inverseKey,
        proxy, model, proxyRelationships);
    }
  },

  _setupRelationships(proxy, model, modelDefinition, proxyRelationships) {
    modelDefinition.eachRelationship((name, descriptor) =>
      this._setupRelationship(name, descriptor, modelDefinition,
        proxy, model, proxyRelationships));
  },

  _setupAttributes(proxy, model, modelDefinition) {
    modelDefinition.eachAttribute(name => {
      let value = model ? get(model, name) : '';
      proxy.setUnknownProperty(name, value, true);
    });
  },

  _fillProxyWithModelValues(modelType, proxy, model, proxyRelationships) {
    let store = get(this, 'store');
    let modelDefinition = store.modelFor(modelType);

    this._setupCurrentState(proxy, model, modelDefinition);

    this._setupAttributes(proxy, model, modelDefinition);
    this._setupRelationships(proxy, model, modelDefinition, proxyRelationships);

    this._setupSimpleProperties(proxy, model, modelDefinition);

    this._setupObservers(proxy, model, modelDefinition);
    this._setupComputedProperties(proxy, model, modelDefinition);
  },

  createModelProxy(modelType, baseModel, proxyRelationships = true) {
    assert('A model type must be passed as the first parameter.', modelType);
    let modelExtractor = this.get('modelExtractor');
    let model = modelExtractor.getRealModel(baseModel);
    let modelProxy = this._getModelProxy();

    let currentState = modelExtractor.getDefaultCurrentState();

    setProperties(modelProxy, {
      type: modelType,
      proxy: EmberObject.create({
        currentState,
        _internalModel: EmberObject.create({
          currentState
        }),
      }),
      model: model
    });

    this._fillProxyWithModelValues(modelType, modelProxy, model, proxyRelationships);
    return modelProxy;
  }
});
