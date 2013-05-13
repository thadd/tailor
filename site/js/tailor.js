$(function() {
  //••••••••••••••••••
  //••••••••••••••••••••••••••••••••••••
  // Models
  //••••••••••••••••••••••••••••••••••••
  //••••••••••••••••••

  //••••••••••••••••••
  // Defines a single log file backed by a connection to Node
  //••••••••••••••••••
  var LogFile = Backbone.Model.extend({
    completeLogData: '',      // All of the log data that we're storing in this object (not necessarily the whole log)
    mostRecentLogData: '',    // The log data we received in the last transmission from Node
    filePath: '',             // The filesystem path of the log file
    active: false,            // Whether the display of the log is currently active

    initialize: function() {
      _.bindAll(this);

      // Set a unique DOM ID
      this.set({domId: _.uniqueId('log_')});

      // Connect to Node
      this.socket = io.connect('http://localhost:7065');

      // Bind to data coming from Node (from its tail process)
      this.socket.on("log update", this.handleLogUpdate);

      // When we set the log path, request the log from Node
      this.on( { "change:filePath": this.requestLogFile } );

      // If the file path is set, request the log file but wait until the next pass of the loop so initializations can finish
      if ( this.has('filePath') ) {
        _.defer(this.requestLogFile);
      }
    },

    // Ask Node to tail a file
    requestLogFile: function() {

      // If we have a valid log path
      if ( this.get('filePath').length > 0 ) {

        // Tell Node which file we want
        this.socket.emit('request log', { file_path: this.get('filePath') });

      }
    },

    // New log data from Node
    handleLogUpdate: function(data) {
      if ( this.get('filePath') == data.file ) {
        // Append to the complete data
        // TODO: Handle overflow
        this.set({completeLogData: this.completeLogData + data.data});

        // Replace the most recent data
        this.set({mostRecentLogData: data.data});
      }
    }
  });

  //••••••••••••••••••
  //••••••••••••••••••••••••••••••••••••
  // Collections
  //••••••••••••••••••••••••••••••••••••
  //••••••••••••••••••

  //••••••••••••••••••
  // All of the logs the viewer has loaded
  //••••••••••••••••••
  var LogSet = Backbone.Collection.extend({
      model: LogFile,

      initialize: function() {
        this.on("change:active", this.activeLogChanged, this);
      },

      // One of the logs changed active state
      activeLogChanged: function(changedLogFile) {

        // We only want to do anything if a log is switching from inactive to active
        if ( changedLogFile.get('active') ) {

          // Get all the *other* log files that didn't change
          _(this.without(changedLogFile)).each(function (logFile) {

            // Set them to inactive (since we can only have one active at a time)
            logFile.set({active: false});
          });

        }
      }
  });

  //••••••••••••••••••
  //••••••••••••••••••••••••••••••••••••
  // Views
  //••••••••••••••••••••••••••••••••••••
  //••••••••••••••••••

  //••••••••••••••••••
  // The output display from a single log file
  //••••••••••••••••••
  var LogFileView = Backbone.View.extend({
    tagName: 'section',
    className: 'log-area',
    template: _.template($('#log-output-area-template').html()),

    initialize: function() {
      _.bindAll(this);

      // When we get new log data
      this.model.on("change:mostRecentLogData", this.renderAdditionalLogData);

      // We the log's active/inactive state changes
      this.model.on("change:active", this.updateActiveState);
    },

    // Create the log area
    render: function() {      
      var logId = this.model.get('domId');

      // Set this view's ID to match the domId on the log
      this.el.id = logId;

      // Fill the view with the template contents
      $(this.el).html(this.template({log_id: logId}));

      return this;
    },

    // New data appended to the log
    renderAdditionalLogData: function() {

      // Add the most recent data, but process it so that ANSI colors get handled properly
      var consoleOutput = new ConsoleOutput();
      consoleOutput.content = _.escape(this.model.get('mostRecentLogData'))

      var output = "";

      splitOnLines = _.escape(this.model.get('mostRecentLogData')).split(/\n/);

      // Wrap all but the last line
      for (var i=0; i < splitOnLines.length-1; i++) {
        output = output + "\n" + "<p>" + splitOnLines[i] + "</p>";
      }

      // See if the last line has anything on it
      if (splitOnLines[splitOnLines.length-1].length > 0) {
        output = output + "\n" + "<p>" + splitOnLines[splitOnLines.length-1] + "</p>";
      }

      // Append the new data to the log output field
      $(this.el).find('.log').append(output).scrollTop($(this.el).find('.log')[0].scrollHeight);

      return this;
    },

    updateActiveState: function() {
      // Add or remove the 'active' class to this element based on the active state of the log file
      if ( this.model.get('active') ) {

        $(this.el).addClass('active');

      } else {

        $(this.el).removeClass('active');

      }
    }
  });

  //••••••••••••••••••
  // The view for all loaded logs
  //••••••••••••••••••
  var LogSetView = Backbone.View.extend({
    model: LogSet,
    logFileViews: [],
    el: $('#logs'),

    events: {
      'click .log-tabs li a .close': 'closeTab',
      'click .log-tabs li a'       : 'activateTab',
      'change .wrap-lines input'   : 'toggleWrap'
    },

    initialize: function() {
      _.bindAll(this);

      // Get things initialized by calling on the whole collection
      this.collection.each(this.add);

      this.collection.on('add', this.add);
      this.collection.on('remove', this.remove);
      this.collection.on('change:active', this.updateActiveStates);
    },

    render: function() {
      // If we have no logs to display, show the blank slates
      if (this.collection.isEmpty()) {

        this.addBlankSlates();

      } else {
        // Remove the blank slates
        this.clearBlankSlates();

        // Add the log output area for each loaded log
        _.each(this.logFileViews, function(logFileView) {

          $(this.el).find('.log-container').append(logFileView.render().el);

        }, this);
      }

      return this;
    },

    // Set up the blank slates for the log tabs and output area
    addBlankSlates: function() {
      $(this.el).find('.log-tabs ul').append(_.template($('#log-file-tab-none-template').html()));
      $(this.el).find('.log-container').append(_.template($('#log-output-area-none-template').html()));
    },

    // Remove the blank slates (because we have logs now)
    clearBlankSlates: function() {
      $(this.el).find('.log-tabs .none').remove();
      $(this.el).find('.log-container .none').remove();
    },

    // Add a single log file view connected to the recently added model
    add: function(logFile) {
      // Collection was empty if the current size is 1 (the 1 is the new model), so get rid of blank slates
      if ( this.collection.size() == 1 ) {
        this.clearBlankSlates();
      }

      // Create the view
      var view = new LogFileView({model: logFile});

      // Add to the list
      this.logFileViews.push(view);

      // Set the log to active. It's safe to assume the user wants the newly created log in the foreground.
      logFile.set({active: true});

      // Add to the container
      $(this.el).find('.log-container').append(view.render().el);
    },

    // Remove a log file from the view
    remove: function(logFile) {
      // Get the view corresponding to the removed log
      var toRemove = _.findWhere(this.logFileViews, {model: logFile});

      // Drop the removed log from the list
      this.logFileViews = _.without(this.logFileViews, toRemove);

      // Remove the removed log's DOM elements
      $(this.el).find('.log-tabs ul li.' + logFile.get('domId')).remove();
      $(this.el).find('.log-container #' + logFile.get('domId')).remove();

      // If we have no more logs, show the blank slates again
      if (this.collection.isEmpty()) {
        this.addBlankSlates();
      }
    },

    // Updates the tabs for the log files to represent the current active states
    updateActiveStates: function(logFile) {
      // We're doing this brute force since it's easy and reliable. Hopefully there's no flicker.

      // Remove all tabs
      $(this.el).find('.log-tabs ul li').remove();

      // Load the tab template
      var tabTemplate = _.template($('#log-file-tab-template').html());

      // Loop over the logs
      _(this.logFileViews).each(function(logFileView) {
        // Get this view's model since we'll need it a few times
        logFile = logFileView.model;

        // Set up the parameters we'll pass to the template
        params = {
          log_id: logFile.get('domId'),
          log_file_path: logFile.get('filePath')
        };

        // Add this tab to the template
        $(this.el).find('.log-tabs ul').append(tabTemplate(params));

        // If this file is active, add the CSS class
        if (logFile.get('active')) {
          $('.' + logFile.get('domId')).addClass('active');
        }
      }, this);
    },

    activateTab: function(event) {
      // Get the DOM ID of the log that was clicked
      var hrefId = $(event.target).attr('href').replace('#','');

      // Find that log and set it to active
      this.collection.where({domId: hrefId})[0].set({active: true});

      // Don't let the browser actually try to follow the link
      event.preventDefault();
    },

    closeTab: function(event) {
      // Get the DOM ID of the log where close was clicked
      var hrefId = $(event.target).parents('a').attr('href').replace('#','');

      // Get the corresponding log file
      var toRemove = this.collection.where({domId: hrefId})[0];

      // Remove the log file from the collection
      this.collection.remove(toRemove);

      // If we removed the active log, make the first one in the list active instead
      if (toRemove.get('active') && ! this.collection.isEmpty()) {
        this.collection.at(0).set({active: true});
      }

      // Don't let the link get the click event
      event.stopPropagation();
    },

    toggleWrap: function(event) {
      var logId = $(event.target).attr('name').replace(/^wrap_/, '#');
      var wrapped = $(event.target).is(":checked");

      if (wrapped) {
        $(logId + " .log").addClass('wrap');
      } else {
        $(logId + " .log").removeClass('wrap');
      }

      $(this.el).find('.log').scrollTop($(this.el).find('.log')[0].scrollHeight);
    }
  });

  //••••••••••••••••••
  //••••••••••••••••••••••••••••••••••••
  // JQuery initializers
  //••••••••••••••••••••••••••••••••••••
  //••••••••••••••••••

  // Focus on the log path on initial page load
  $('.add-file-path-name').focus();

  window.logs = new LogSet();
  window.app = new LogSetView({collection: window.logs });

  window.app.render();

  // Add log file action triggered
  $('.add-file-form').submit(function(event) {

    // Set up the log file
    var file = new LogFile({filePath: $('.add-file-path-name').val().trim()});
    window.logs.add(file);

    // Reset the input for the next one
    $('.add-file-path-name').val('');

    // We don't actually submit anything
    event.preventDefault();
  });
});