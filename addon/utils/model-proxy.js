import EmberObject from '@ember/object';
import { get, set } from '@ember/object';
import { inject as service } from '@ember/service';
import Evented from '@ember/object/evented';

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
  setUnknownProperty(property, value) {
    let proxy = get(this, 'proxy');
    if (proxy) {
      set(proxy, property, value);
      if (!get(proxy, 'hasDirtyAttributes')) {
        set(proxy, 'hasDirtyAttributes', true);
        this.notifyPropertyChange('hasDirtyAttributes');
      }
      this.notifyPropertyChange(property);
    }
  },

  applyChanges() {
    let model = get(this, 'model');
    let proxy = get(this, 'proxy');
    if (!model || !proxy) {
      return;
    }
    if (get(proxy, 'hasDirtyAttributes')) {
      if (get(proxy, 'isDeleted')) {
        model.deleteRecord();
      }

      model.eachAttribute(name => {
        if (proxy.hasOwnProperty(name)) {
          model.set(name, proxy.get(name));
        }
      });

      model.eachRelationship((name, descriptor) => {
        if (descriptor.kind === 'belongsTo' && proxy.hasOwnProperty(name)) {
          model.set(name, proxy.get(name));
        }
      });

      set(proxy, 'hasDirtyAttributes', false);
      this.notifyPropertyChange('hasDirtyAttributes');
    }
  },
  discardChanges() {},

  save(options) {
    let model = get(this, 'model');
    if (model) {
      this.applyChanges();
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

    set(proxy, 'hasDirtyAttributes', true);
    this.notifyPropertyChange('hasDirtyAttributes');
  }
});
