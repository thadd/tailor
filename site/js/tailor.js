//••••••••••••••••••
// Defines an single log file backed by a connection to Node
//••••••••••••••••••
var LogFile = Backbone.Model.extend({
  completeLogData: '',    // All of the log data that we're storing in this object (not necessarily the whole log)
  mostRecentLogData: '',  // The log data we received in the last transmission from Node
  filePath: '',           // The filesystem path of the log file

  initialize: function() {
    _.bindAll(this);

    // Connect to Node
    this.socket = io.connect('http://localhost:7065');

    // Bind to data coming from Node (from its tail process)
    this.socket.on("log update", this.handleLogUpdate);

    // When we set the log path, request the log from Node
    this.on( { "change:filePath": this.requestLogFile } );
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
    // Append to the complete data
    // TODO: Handle overflow
    this.set({completeLogData: this.completeLogData + data.data});

    // Replace the most recent data
    this.set({mostRecentLogData: data.data});
  }
});

// All of the logs the viewer has loaded
var LogSet = Backbone.Collection.extend({
    model: LogFile
});

// The output from a single log file
var LogFileView = Backbone.View.extend({
  className: 'log',
  logId: '',

  initialize: function() {
    _.bindAll(this);

    // When the file path (log location) changes
    this.listenTo(this.model, "change:filePath", this.renderNewLogFile);

    // When we get new log data
    this.listenTo(this.model, "change:mostRecentLogData", this.render);
  },

  renderNewLogFile: function() {
    // Give the DOM element an ID to reference
    this.logId = _.uniqueId('log_');

    // Setup params that will go to template
    var template_parameters = {
      log_id: this.logId,
      log_file_path: this.model.get('filePath')
    }

    // If there were no logs loaded, remove the blank slate tab
    $('.log-tabs .none').remove();
    $('.log-container .none').remove();

    // Add the new log tab and make it active
    $('.log-tabs ul').append(_.template($('#log-file-tab-template').html(), template_parameters));
    $('.log-tabs li').removeClass('active');
    $('.log-tabs .' + this.logId).addClass('active');

    // Add the log output area
    $('.log-container').append(_.template($('#log-output-area-template').html(), template_parameters));
  },

  // New data appended to the log
  render: function() {
    // Add the most recent data, but process it so that ANSI colors get handled properly
    var consoleOutput = new ConsoleOutput();
    consoleOutput.content = _.escape(this.model.get('mostRecentLogData'));

    // Append the new data to the log output field
    $('#' + this.logId + ' .log').append(consoleOutput.toHtml()).scrollTop($('#' + this.logId + ' .log')[0].scrollHeight);
  }
});

// TODO: Handle multiple logs
var LogSetView = Backbone.View.extend({
  // Set up the blank slates for the log tabs and output area
  addBlankSlates: function() {
    $('.log-tabs ul').append(_.template($('#log-file-tab-none-template').html()));
    $('.log-container').append(_.template($('#log-output-area-none-template').html()));
  }
});

$(function() {
  // Focus on the log path on initial page load
  $('.add-file-path-name').focus();

  // Set up the blank slates
  (new LogSetView()).addBlankSlates();

  // Add log file action triggered
  $('.add-file-form').submit(function(event) {

    // Set up the log file
    var file = new LogFile();
    var view = new LogFileView({model: file});

    file.set({filePath: $('.add-file-path-name').val().trim()})

    // Reset the input for the next one
    $('.add-file-path-name').val('');

    // We don't actually submit anything
    event.preventDefault();
  });
});