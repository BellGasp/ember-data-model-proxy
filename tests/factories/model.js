import FactoryGuy from 'ember-data-factory-guy';

FactoryGuy.define('model', {
  default: {
    firstName: 'firstName',
    lastName: 'lastName',
    middleName: 'some-name'
  },
  traits: {
    with_single: {
      singleModel: FactoryGuy.belongsTo('single-model')
    },
    with_multiple: {
      multipleModels: FactoryGuy.hasMany('multiple-model', 1)
    }
  }
});
