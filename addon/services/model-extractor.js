import Service, { inject as service } from '@ember/service';
import EmberObject, { get } from '@ember/object';
import { A } from '@ember/array';

// TODO add tests for this service
export default Service.extend({
  store: service(),

  getRealModel(model) {
    if (model && model.hasOwnProperty('content')) {
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
        !(proto[property].toString() === '[COMPUTED PROPERTY]' || proto[property].isDescriptor) &&
        !(proto[property].toString().startsWith('(subclass')) &&
        !(typeof proto[property] === 'function' && proto[property].__ember_observes__);
    });
  },

  getObservers(modelDefinition) {
    let proto = modelDefinition.proto();
    let properties = Object.keys(proto);

    return properties.filter(property => {
      return !property.startsWith('_') &&
        !(proto[property].toString() === '[COMPUTED PROPERTY]' || proto[property].isDescriptor) &&
        !(proto[property].toString().startsWith('(subclass')) &&
        (typeof proto[property] === 'function' && proto[property].__ember_observes__);
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

  getInverseKey(modelDefinition, relationshipName) {
    let inverseKey = modelDefinition.inverseFor(relationshipName, this.get('store'));
    let inverseKeyName = null;

    if (inverseKey) {
       inverseKeyName = inverseKey.name;
    }

    return inverseKeyName;
  }
});
