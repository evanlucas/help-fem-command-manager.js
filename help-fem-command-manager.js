(function() {
  'use strict';

  var _ = require('lodash');

  // ## CommandManager

  // ### CommandManager *constructor*
  // Initializes the command manager.
  //
  //     var HelpEsb = require('help-esb');
  //     var esbClient = new HelpEsb.Client('tcp://localhost:1234');
  //     esbClient.login('example-name');
  //
  //     var CommandManager = require('help-fem-command-manager');
  //     var commandManager = new CommandManager(esbClient);
  //
  //     commandManager.addCommand('client chat event', 'customer', 'start');
  var CommandManager = function(esbClient) {
    this._esbClient = esbClient;

    // Start with no commands.
    this._commands = {};

    this._registerRestartHandler();
  };

  // ### CommandManager.addCommand
  // Adds the command for the given event to the FEM router.
  //
  //     commandManager.addCommand('client chat event', 'customer', 'start');
  //
  // This supports singular events, roles, and commands but also supports an
  // array of them.  All combinations of them will be added.  For example, the
  // following are equivalent.
  //
  //     commandManager.addCommand('client chat event', 'customer', 'end');
  //     commandManager.addCommand('client chat event', 'user', 'end');
  //     commandManager.addCommand('client chat event', 'manager', 'end');
  //     commandManager.addCommand('client chat event', 'customer', 'message');
  //     commandManager.addCommand('client chat event', 'user', 'message');
  //     commandManager.addCommand('client chat event', 'manager', 'message');
  //
  //     commandManager.addCommand(
  //       'client chat event',
  //       ['customer', 'user', 'manager'],
  //       ['end', 'message']
  //     );
  CommandManager.prototype.addCommand = function(events, roles, commands) {
    events = _.isArray(events) ? events : [events];
    roles = _.isArray(roles) ? roles : [roles];
    commands = _.isArray(commands) ? commands : [commands];

    _.each(events, function(event) {
      _.each(roles, function(role) {
        _.each(commands, _.bind(this._addCommand, this, event, role));
      }, this);
    }, this);
  };

  // ---
  // ### Private Methods

  // Listens for the router to restart and registers the commands anew if it
  // does.
  CommandManager.prototype._registerRestartHandler = function() {
    this._esbClient.subscribe('serviceStartupGroup');
    this._esbClient.on('group.serviceStartupGroup', _.bind(function(message) {
      if (message.get('body.microServiceName').toLowerCase() !== 'router') {
        return;
      }

      // Loop over all of the event/role/command combinations and call
      // **_registerCommand** for each.
      _.each(this._commands, function(cmdsByRole, event) {
        _.each(cmdsByRole, function(cmdList, role) {
          _.each(cmdList, _.bind(this._registerCommand, this, event, role));
        }, this);
      }, this);

    }, this));
  };

  // Adds the singular event/role/command, registering it with FEM.
  CommandManager.prototype._addCommand = function(event, role, command) {
    if (!_.has(this._commands, event)) {
      this._commands[event] = {};
    }

    if (!_.has(this._commands[event], role)) {
      this._commands[event][role] = [];
    }

    if (!_.contains(this._commands[event][role], command)) {
      this._commands[event][role].push(command);
    }

    this._registerCommand(event, role, command);
  };

  // Register the command with the FEM router.
  CommandManager.prototype._registerCommand = function(event, role, command) {
    return this._esbClient.rpcSend('socketIOGroup', {
      uri: 'addValidCommand',
      event: event,
      command: command,
      role: role
    });
  };

  module.exports = CommandManager;
})();
