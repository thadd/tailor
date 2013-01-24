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

var entityMap = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': '&quot;',
  "'": '&#39;',
  "/": '&#x2F;'
};

function escapeHtml(string) {
  return String(string).replace(/[&<>"'\/]/g, function (s) {
    return entityMap[s];
  });
}

$(function() {
  $('.add-file input[type="button"]').click(function() {
    var file = new LogFile();
    
    file.requestLogFile( $('.add-file input[type="text"]').val() );

    file.on('change:mostRecentLogData', function() {
      console.log("Got a change");

      var consoleOutput = new ConsoleOutput();
      consoleOutput.content = escapeHtml(file.get('mostRecentLogData'));

      $('.log-area .log').append(consoleOutput.toHtml()).scrollTop($('.log-area .log')[0].scrollHeight);
    });
  })
});