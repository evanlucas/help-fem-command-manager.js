(function() {
  'use strict';

  var _ = require('lodash');

  // ## CommandManager

  // ### CommandManager *constructor*
  // Initializes the command manager.
  //
  //     var CommandManager = require('help-fem-command-manager');
  //     var commandManager = new CommandManager(esbClient);
  //
  //     commandManager.addCommand('client chat event', 'start');
  var CommandManager = function(esbClient) {
    this._esbClient = esbClient;

    // Start with no commands.
    this._commands = {};

    this._registerRestartHandler();
  };

  // ### CommandManager.addCommand
  // Adds the command for the given event to the FEM router.
  //
  //     commandManager.addCommand('client chat event', 'start');
  CommandManager.prototype.addCommand = function(event, command) {
    if (!_.has(this._commands, event)) {
      this._commands[event] = [];
    }

    if (!_.contains(this._commands[event], command)) {
      this._commands[event].push(command);
    }

    this._addCommand(event, command);
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

      // Loop over all of the event/command combinations and call
      // **_addCommand** for each.
      _.each(this._commands, _.bind(function(commands, event) {
        _.each(commands, _.bind(this._addCommand, this, event));
      }, this));
    }, this));
  };

  // Register the command with the FEM router.
  CommandManager.prototype._addCommand = function(event, command) {
    this._esbClient.send('socketIOGroup', {
      uri: 'addValidCommand',
      event: event,
      command: command
    });
  };

  module.exports = CommandManager;
})();
