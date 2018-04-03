import FactoryGuy from 'ember-data-factory-guy';

FactoryGuy.define('no-inverse-model', {
  default: {
    firstName: 'firstName',
    lastName: 'lastName',
    middleName: 'some-name'
  }
});
