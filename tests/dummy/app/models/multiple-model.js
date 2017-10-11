import DS from 'ember-data';

const { Model, attr, belongsTo } = DS;

export default Model.extend({
  firstName: attr(),
  lastName: attr(),
  middleName: attr(),

  model: belongsTo('model')
});
