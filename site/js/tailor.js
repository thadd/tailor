var LogFile = Backbone.Model.extend({
  completeLogData: '',
  mostRecentLogData: '',
  filePath: '',

  initialize: function() {
    _.bindAll(this);

    this.socket = io.connect('http://localhost:7065');
    this.socket.on("log update", this.handleLogUpdate);

    this.on({"change:filePath": this.requestLogFile});
  },

  requestLogFile: function() {
    if ( this.get('filePath').length > 0 ) {
      this.socket.emit('request log', { file_path: this.get('filePath') });
    }
  },

  handleLogUpdate: function(data) {
    this.set({completeLogData: this.completeLogData + data.data});
    this.set({mostRecentLogData: data.data});
  }
});

var LogSet = Backbone.Collection.extend({
    model: LogFile
});

var LogFileView = Backbone.View.extend({
  className: 'log',
  logId: '',

  initialize: function() {
    _.bindAll(this);

    this.listenTo(this.model, "change:filePath", this.renderNewLogFile);
    this.listenTo(this.model, "change:mostRecentLogData", this.render);
  },

  renderNewLogFile: function() {
    this.logId = _.uniqueId('log_');

    var template_parameters = {
      log_id: this.logId,
      log_file_path: this.model.get('filePath')
    }

    $('.log-tabs .none').remove();
    $('.log-tabs ul').append(_.template($('#log-file-tab-template').html(), template_parameters));
  },

  render: function() {
    var consoleOutput = new ConsoleOutput();
    consoleOutput.content = _.escape(this.model.get('mostRecentLogData'));

    $('.log-area .log').append(consoleOutput.toHtml()).scrollTop($('.log-area .log')[0].scrollHeight);
  }
});

var LogSetView = Backbone.View.extend({

});

$(function() {
  $('.add-file-path-name').focus();

  $('.add-file-form').submit(function(event) {
    var file = new LogFile();
    var view = new LogFileView({model: file});

    file.set({filePath: $('.add-file-path-name').val()})

    $('.add-file-path-name').val('');

    event.preventDefault();
  });
});