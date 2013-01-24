var LogFile = Backbone.Model.extend({
  completeLogData: '',
  mostRecentLogData: '',

  initialize: function() {
    _.bindAll(this);

    this.socket = io.connect('http://localhost:8080');
    this.socket.on("log update", this.handleLogUpdate);
  },

  requestLogFile: function(filePath) {
    this.filePath = filePath;
    this.socket.emit('request log', { file_path: filePath });
  },

  handleLogUpdate: function(data) {
    this.set({completeLogData: this.completeLogData + data.data});
    this.set({mostRecentLogData: data.data});
  }
});

var LogFileView = Backbone.View.extend({
  className: 'log',

  initialize: function() {
    _.bindAll(this);

    this.listenTo(this.model, "change:mostRecentLogData", this.render);
  },

  render: function() {
    var consoleOutput = new ConsoleOutput();
    consoleOutput.content = this.escapeHtml(this.model.get('mostRecentLogData'));

    $('.log-area .log').append(consoleOutput.toHtml()).scrollTop($('.log-area .log')[0].scrollHeight);
  },

  escapeHtml: function(string) {
    var entityMap = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': '&quot;',
      "'": '&#39;',
      "/": '&#x2F;'
    }

    return String(string).replace(/[&<>"'\/]/g, function(s) {
      return entityMap[s];
    });
  }
});

$(function() {
  $('.add-file input[type="button"]').click(function() {
    var file = new LogFile();
    var view = new LogFileView({model: file});

    file.requestLogFile( $('.add-file input[type="text"]').val() );

  });
});