/**
 * Baobab Cursor Combination
 * ==========================
 *
 * A useful abstraction dealing with cursor's update logical combinations.
 */
var EventEmitter = require('emmett'),
    types = require('./typology.js'),
    helpers = require('./helpers.js');

/**
 * Utilities
 */
function bindCursor(c, cursor) {
  cursor.on('update', c.cursorListener);
}

/**
 * Main Class
 */
function Combination(operator /*, &cursors */) {
  var self = this;

  // Safeguard
  if (arguments.length < 2)
    throw Error('baobab.Combination: not enough arguments.');

  var first = arguments[1],
      rest = helpers.arrayOf(arguments).slice(2);

  if (first instanceof Array) {
    rest = first.slice(1);
    first = first[0];
  }

  if (!types.check(first, 'cursor'))
    throw Error('baobab.Combination: argument should be a cursor.');

  if (operator !== 'or' && operator !== 'and')
    throw Error('baobab.Combination: invalid operator.');

  // Extending event emitter
  EventEmitter.call(this);

  // Properties
  this.cursors = [first];
  this.operators = [];
  this.root = first.root;

  // State
  this.updates = new Array(this.cursors.length);

  // Listeners
  this.cursorListener = function() {
    self.updates[self.cursors.indexOf(this)] = true;
  };

  this.treeListener = function() {
    var shouldFire = self.updates[0],
        i,
        l;

    for (i = 1, l = self.cursors.length; i < l; i++) {
      shouldFire = self.operators[i - 1] === 'or' ?
        shouldFire || self.updates[i] :
        shouldFire && self.updates[i];
    }

    if (shouldFire)
      self.emit('update');

    // Waiting for next update
    self.updates = new Array(self.cursors.length);
  };

  // Initial bindings
  this.root.on('update', this.treeListener);
  bindCursor(this, first);

  // Attaching any other passed cursors
  rest.forEach(function(cursor) {
    this[operator](cursor);
  }, this);
}

helpers.inherits(Combination, EventEmitter);

/**
 * Prototype
 */
Combination.prototype.or = function(cursor) {

  // Safeguard
  if (!types.check(cursor, 'cursor'))
    throw Error('baobab.Combination.or: argument should be a cursor.');

  if (~this.cursors.indexOf(cursor))
    throw Error('baobab.Combination.or: cursor already in combination.');

  this.cursors.push(cursor);
  this.operators.push('or');
  this.updates.length++;
  bindCursor(this, cursor);

  return this;
};

Combination.prototype.and = function(cursor) {

  // Safeguard
  if (!types.check(cursor, 'cursor'))
    throw Error('baobab.Combination.and: argument should be a cursor.');

  if (~this.cursors.indexOf(cursor))
    throw Error('baobab.Combination.and: cursor already in combination.');

  this.cursors.push(cursor);
  this.operators.push('and');
  this.updates.length++;
  bindCursor(this, cursor);

  return this;
};

Combination.prototype.release = function() {

  // Dropping own listeners
  this.unbindAll();

  // Dropping cursors listeners
  this.cursors.forEach(function(cursor) {
    cursor.off('update', this.cursorListener);
  }, this);

  // Dropping tree listener
  this.root.off('update', this.treeListener);

  // Cleaning
  this.cursors = null;
  this.operators = null;
  this.root = null;
  this.updates = null;
};

/**
 * Exporting
 */
module.exports = Combination;
