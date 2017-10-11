# ember-data-model-proxy
[![npm version](https://badge.fury.io/js/ember-data-model-proxy.svg)](https://badge.fury.io/js/ember-data-model-proxy)
[![Ember Observer Score](https://emberobserver.com/badges/ember-data-model-proxy.svg)](https://emberobserver.com/addons/ember-data-model-proxy)
[![Build Status](https://travis-ci.org/BellGasp/ember-data-model-proxy.svg?branch=master)](https://travis-ci.org/BellGasp/ember-data-model-proxy)
[![Code Climate](https://codeclimate.com/github/BellGasp/ember-data-model-proxy/badges/gpa.svg)](https://codeclimate.com/github/BellGasp/ember-data-model-proxy)


## Description
This ember addon provides the means to create/delete/edit ember-data models through a proxy, without applying the changes to the model itself. The model-proxy can then apply the changes to the model at a later date.

## Installation

Like most ember addons, simply run `ember install ember-data-model-proxy` and you should be all set.

## Docs
### Utils
#### Model-Proxy
This is the model-proxy object in itself. It has all the functions/objects specific to it.

##### applyChanges
This applies the changes of the model-proxy to the model itself. It doesn't save the model though, it simply applies the modifications.
It will go through each attribute/relationship of the model and update it with the value present in the proxy. It won't add new attributes not present in the model definition that were set in the proxy.

It receives only a single parameter, `applyChangesToRelationships`, which is `true` by default.
This makes it so that every relationships that is proxied on the model will also have the applyChanges method called on them.

If the underlying model doesn't not exists, it will create one using the `store` and the model type that was passed to create the model-proxy.

##### save
This method calls applyChanges and then saves the current underlying model. It does not call the save of each relationship though, so you still need to call those manually. If requested enough, it can be changed to save the relationships too, but that behaviour would not be intuitive IMO.

##### set/get
The model-proxy uses the `(set)unknownProperty` functions exposed by ember to get/set the values in the proxy object without impacting the model.
Any call to `model-proxy.set` will set the values in an underlying `proxy` object. Be careful not to set/get values present in the model-proxy itself though, because it will set/get those instead. For example, since "proxy" is the name of the underlying object containing the changes, calling `model-proxy.set('proxy', 'some-value')` will cause a whole lot of things to break. But eh, if you want to break it, that's the easy way to do it.

### Services
#### Model-Proxy
The model-proxy service makes it easy to create model-proxies, with or without relationships.
The main method it exposes is the `CreateModelProxy()` method:

##### CreateModelProxy
| Parameters | Type | Description |
|---|:-------------:|:------:|:-------------:|
| type | string (required) | Type of the model on which the proxy is based. This is usually the name of an ember-data model |
| model | model | Base ember-data model to which the modifications will be applied. (Also initial state) |
| relationships | string[] | Relationships for which proxy-models will be created too. |
|||||
| returns | model-proxy | Returns a new model-proxy object |

Here, it's possible to pass only the type (`service.createModelProxy('address-model')` for example), which will result in a model-proxy with no base model. It can still be interacted with as usual, but now if you call `applyChanges` on that model-proxy, a record will be created using the type that was initially passed.

It's also possible to add multiple relationships for which to create model-proxies. This will result in the proxy having a model-proxy for a belongsTo or an array of model-proxies in the case of an hasMany.
For example, `service.createModelProxy('house', model, 'floors', 'address')`.
This will create model-proxies for each floors, and for the address. The name that are passed are the name of the relationships in the model.


For more information on using ember-cli, visit [https://ember-cli.com/](https://ember-cli.com/).
