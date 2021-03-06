/**
 * Baobab React Mixins
 * ====================
 *
 * Compilation of react mixins designed to deal with cursors integration.
 */
var types = require('./typology.js'),
    Combination = require('./combination.js');

module.exports = {
  baobab: function(baobab) {
    return {

      // Run Baobab mixin first to allow mixins to access cursors
      mixins: [{
        getInitialState: function() {

          // Binding baobab to instance
          this.tree = baobab;
          this.__type = null;

          // Is there any cursors to create?
          if (this.cursor && this.cursors)
            throw Error('baobab.mixin: you cannot have both ' +
                        '`component.cursor` and `component.cursors`. Please ' +
                        'make up your mind.');

          // Making update handler
          this.__updateHandler = (function() {
            this.setState(this.__getCursorData());
          }).bind(this);

          if (this.cursor) {
            if (!types.check(this.cursor, 'string|number|array|cursor'))
              throw Error('baobab.mixin.cursor: invalid data (cursor, string or array).');

            if (!types.check(this.cursor, 'cursor'))
              this.cursor = baobab.select(this.cursor);

            this.__getCursorData = (function() {
              return {cursor: this.cursor.get()};
            }).bind(this);
            this.__type = 'single';
          }
          else if (this.cursors) {
            if (!types.check(this.cursors, 'object|array'))
              throw Error('baobab.mixin.cursor: invalid data (object or array).');

            if (types.check(this.cursors, 'array')) {
              this.cursors = this.cursors.map(function(path) {
                return types.check(path, 'cursor') ? path : baobab.select(path);
              });

              this.__getCursorData = (function() {
                return {cursors: this.cursors.map(function(cursor) {
                  return cursor.get();
                })};
              }).bind(this);
              this.__type = 'array';
            }
            else {
              for (var k in this.cursors) {
                if (!types.check(this.cursors[k], 'cursor'))
                  this.cursors[k] = baobab.select(this.cursors[k]);
              }

              this.__getCursorData = (function() {
                var d = {};
                for (k in this.cursors)
                  d[k] = this.cursors[k].get();
                return {cursors: d};
              }).bind(this);
              this.__type = 'object';
            }
          }

          return this.__getCursorData();
        },
        componentDidMount: function() {
          if (this.__type === 'single') {
            this.cursor.on('update', this.__updateHandler);
          }
          else if (this.__type === 'array') {
            this.__combination = new Combination('or', this.cursors);
            this.__combination.on('update', this.__updateHandler);
          }
          else if (this.__type === 'object') {
            this.__combination = new Combination(
              'or',
              Object.keys(this.cursors).map(function(k) {
                return this.cursors[k];
              }, this)
            );
            this.__combination.on('update', this.__updateHandler);
          }
        },
        componentWillUnmount: function() {
          if (this.__type === 'single') {
            this.cursor.off('update', this.__updateHandler);
          }
          else {
            this.__combination.release();
          }
        }
      }].concat(baobab.options.mixins)
    };
  },
  cursor: function(cursor) {
    return {

      // Run cursor mixin first to allow mixins to access cursors
      mixins: [{
        getInitialState: function() {

          // Binding cursor to instance
          this.cursor = cursor;

          // Making update handler
          this.__updateHandler = (function() {
            this.setState({cursor: this.cursor.get()});
          }).bind(this);

          return {cursor: this.cursor.get()};
        },
        componentDidMount: function() {

          // Listening to updates
          this.cursor.on('update', this.__updateHandler);
        },
        componentWillUnmount: function() {

          // Unbinding handler
          this.cursor.off('update', this.__updateHandler);
        }
      }].concat(cursor.root.options.mixins)
    };
  }
};
