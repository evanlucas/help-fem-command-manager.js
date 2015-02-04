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
  CommandManager.prototype.addCommand = function(event, role, command) {
    if (!_.has(this._commands, event)) {
      this._commands[event] = {};
    }

    if (!_.has(this._commands[event], role)) {
      this._commands[event][role] = [];
    }

    if (!_.contains(this._commands[event][role], command)) {
      this._commands[event][role].push(command);
    }

    this._addCommand(event, command, role);
  };

  // ---
  // ### Private Methods

  // Listens for the router to restart and registers the commands anew if it
  // does.
  CommandManager.prototype._registerRestartHandler = function() {
    this._esbClient.subscribe('serviceStartupGroup');
    this._esbClient.on('group.serviceStartupGroup', _.bind(function(message) {
      if (message.body.microServiceName.toLowerCase() !== 'router') {
        return;
      }

      // Loop over all of the event/role/command combinations and call
      // **_addCommand** for each.
      _.each(this._commands, _.bind(function(cmdsByRole, event) {
        _.each(cmdsByRole, _.bind(function(cmdList, role) {
          _.each(cmdList, _.bind(this._addCommand, this, event, role));
        }, this));
      }, this));

    }, this));
  };

  // Register the command with the FEM router.
  CommandManager.prototype._addCommand = function(event, role, command) {
    this._esbClient.send('socketIOGroup', {
      uri: 'addValidCommand',
      event: event,
      command: command,
      role: role
    });
  };

  module.exports = CommandManager;
})();
