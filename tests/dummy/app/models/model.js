import DS from 'ember-data';
import { computed, observer } from '@ember/object';
import { get, set } from '@ember/object';

const { Model, attr, belongsTo, hasMany } = DS;

export default Model.extend({
  firstName: attr(),
  lastName: attr(),
  middleName: attr(),
  defaultValueTest: attr({ defaultValue: 'test123' }),
  noDefaultValueTest: attr(),

  singleModel: belongsTo('single-model'),
  multipleModels: hasMany('multiple-model'),
  noInverseModels: hasMany('no-inverse-model'),

  fullName: computed('firstName', 'lastName', 'middleName', function () {
    let firstName = get(this, 'firstName');
    let lastName = get(this, 'lastName');
    let middleName = get(this, 'middleName');

    return `${firstName || ''} ${middleName || ''} ${lastName || ''}`;
  }),

  fullNameObserverHasTriggered: false,
  fullNameObserver: observer('firstName', 'lastName', 'middleName', function() {
    set(this, 'fullNameObserverHasTriggered', true);
  })
});
