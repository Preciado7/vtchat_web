/**
 * Nested model support in Backbone.js
 **/

// support amd and common js
(function (root, factory) {
  if (typeof exports === 'object') {
		// CommonJS
		module.exports = factory(require('backbone'), require('underscore'));
	} else if (typeof define === 'function' && define.amd) {
		// AMD
		define(['backbone', 'underscore'], function (b, u) {
			return (root.returnExportsGlobal = factory(b, u));
		});
	} else {
		// Global Variables
		root.returnExportsGlobal = factory(root.Backbone, root._);
	}
}(this, function (Backbone, _) {

    var Model = Backbone.Model,
        Collection = Backbone.Collection;

    Backbone.Model.prototype.setRelation = function(attr, val, options) {
        if(!this.relations || !_.has(this.relations, attr)) {
            return val;
        }
        var relationDef = _.extend({class: Backbone.Model, events: false}, this.relations[attr]);
        var relation = this.attributes[attr];

        if (relation) {
            // Delete previous relation
            if (relationDef.events) {
                relation.off('all', null, this);
            }
            delete relation.parent;
        }

        // Create relation
        options._parent = this;

        if (!(val instanceof Collection) && !(val instanceof Model) && val != null) {
            var relationClass = relationDef.class;
            val = new relationClass(val, options);
        }
        if (val) {
            val.parent = this;
            if (relationDef.events) {
                val.on('all', function() {
                    var args = Array.prototype.slice.call(arguments);
                    args.unshift(attr);
                    this._onRelationEvent.apply(this, args);
                }, this);
            }
        }

        return val;
    };

    Backbone.Model.prototype._onRelationEvent = function(attr, eventName) {
        var args = Array.prototype.slice.call(arguments);
        args.shift();
        if (eventName == 'add' || eventName == 'remove' || eventName == 'update' || eventName == 'reset' ||
            eventName == 'sort') {
            args[0] = 'change:' + attr + ':' + eventName;
            this.trigger.apply(this, args);
            args[0] = 'change:' + attr;
            this.trigger.apply(this, args);
            this.trigger('change', this.attributes[attr]);

            return;
        }

        if (eventName == 'change') {
            args[0] = 'change:' + attr;
            this.trigger.apply(this, args);
            this.trigger('change', args[1]);

            return;
        }

        if (eventName.startsWith('change:')) {
            args[0] = 'change:' + attr + ':' + eventName.slice('change:'.length);
            this.trigger.apply(this, args);

            return;
        }
    };

    Backbone.Model.prototype.set = function(key, val, options) {
        var attr, attrs, unset, changes, silent, changing, prev, current;
        if (key == null) return this;

        // Handle both `"key", value` and `{key: value}` -style arguments.
        if (typeof key === 'object') {
            attrs = key;
            options = val;
        } else {
            (attrs = {})[key] = val;
        }

        options || (options = {});

        // Run validation.
        if (!this._validate(attrs, options)) return false;

        // Extract attributes and options.
        unset           = options.unset;
        silent          = options.silent;
        changes         = [];
        changing        = this._changing;
        this._changing  = true;

        if (!changing) {
            this._previousAttributes = _.clone(this.attributes);
            this.changed = {};
        }
        current = this.attributes, prev = this._previousAttributes;

        // Check for changes of `id`.
        if (this.idAttribute in attrs) this.id = attrs[this.idAttribute];

        // For each `set` attribute, update or delete the current value.
        for (attr in attrs) {
            val = attrs[attr];

            // Inject in the relational lookup
            val = this.setRelation(attr, val, options);

            if (!_.isEqual(current[attr], val)) changes.push(attr);
            if (!_.isEqual(prev[attr], val)) {
                this.changed[attr] = val;
            } else {
                delete this.changed[attr];
            }
            unset ? delete current[attr] : current[attr] = val;
        }

        // Trigger all relevant attribute changes.
        if (!silent) {
            if (changes.length) this._pending = true;
            for (var i = 0, l = changes.length; i < l; i++) {
                this.trigger('change:' + changes[i], this, current[changes[i]], options);
            }
        }

        if (changing) return this;
        if (!silent) {
            while (this._pending) {
                this._pending = false;
                this.trigger('change', this, options);
            }
        }
        this._pending = false;
        this._changing = false;
        return this;
    };

    Backbone.Model.prototype.toJSON = function(options) {
      var attrs = _.clone(this.attributes);

      _.each(this.relations, function(rel, key) {
        if (_.has(attrs, key)) {
            if (attrs[key] != null) {
                attrs[key] = attrs[key].toJSON();
            }
        } else {
            attrs[key] = (new rel()).toJSON();
        }
      });

      return attrs;
    };

    Backbone.Model.prototype.clone = function(options) {
        return new this.constructor(this.toJSON());
    };

    Backbone.Collection.prototype.resetRelations = function(options) {
        _.each(this.models, function(model) {
            _.each(model.relations, function(rel, key) {
                if(model.get(key) instanceof Backbone.Collection) {
                    model.get(key).trigger('reset', model, options);
                }
            });
        })
    };

    Backbone.Collection.prototype.reset = function(models, options) {
      options || (options = {});
      for (var i = 0, l = this.models.length; i < l; i++) {
        this._removeReference(this.models[i]);
      }
      options.previousModels = this.models;
      this._reset();
      this.add(models, _.extend({silent: true}, options));
      if (!options.silent) {
        this.trigger('reset', this, options);
        this.resetRelations(options);
      }
      return this;
    };

    Backbone.Collection.prototype._onModelEvent = function(event, model, collection, options) {
        if (model && model instanceof Backbone.Model) {
            if ((event === 'add' || event === 'remove') && collection !== this) return;
            if (event === 'destroy') this.remove(model, options);
            if (event === 'change') {
                var prevId = this.modelId(model.previousAttributes());
                var id = this.modelId(model.attributes);
                if (prevId !== id) {
                    if (prevId != null) delete this._byId[prevId];
                    if (id != null) this._byId[id] = model;
                }
            }
        }

        this.trigger.apply(this, arguments);
    };

    return Backbone;
}));
