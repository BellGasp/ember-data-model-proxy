import Service, { inject as service } from '@ember/service';
import EmberObject, { get } from '@ember/object';
import { A } from '@ember/array';

// TODO add tests for this service
export default Service.extend({
  store: service(),

  getRealModel(model) {
    if (model && get(model, 'content')) {
      return get(model, 'content');
    }
    return model;
  },

  getDefaultCurrentState() {
    return EmberObject.create({
      isEmpty: false,
      isLoading: false,
      isLoaded: false,
      isDirty: false,
      isSaving: false,
      isDeleted: false,
      isNew: true,
      isValid: true
    });
  },

  getSimpleProperties(modelDefinition) {
    let proto = modelDefinition.proto();
    let properties = Object.keys(proto);

    return properties.filter(property => {
      return !property.startsWith('_') &&
        !proto[property].isClass &&
        !proto[property].isDescriptor &&
        !proto[property].__ember_observes__;
    });
  },

  getObservers(modelDefinition) {
    let proto = modelDefinition.proto();
    let properties = Object.keys(proto);

    return properties.filter(property => {
      return proto[property].__ember_observes__;
    });
  },

  getComputedProperties(modelDefinition) {
    let computedProperties = A();

    modelDefinition.eachComputedProperty((name, descriptor) => {
      if (!(descriptor.isAttribute || descriptor.isRelationship)) {
        computedProperties.addObject(name);
      }
    });

    return computedProperties;
  },

  getMissingDependentProperties(proxy, modelDefinition, computedProperties) {
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
  }
});
