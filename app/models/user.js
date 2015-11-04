var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');

var User = db.Model.extend({
  tableName: 'users',
  initialize: function() {
    this.on('creating', function(model, attrs, options){
      // var shasum = bcrypt.createHash('sha1');
      // shasum.update(password);
      // model.set('username', username);
      // model.set('password', shasum.digest('hex'));
    });
  }
});

module.exports = User;

