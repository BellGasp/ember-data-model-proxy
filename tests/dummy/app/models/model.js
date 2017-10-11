import DS from 'ember-data';

const { Model, attr, belongsTo, hasMany } = DS;

export default Model.extend({
  firstName: attr(),
  lastName: attr(),
  middleName: attr(),

  singleModel: belongsTo('single-model'),
  multipleModels: hasMany('multiple-model')
});
