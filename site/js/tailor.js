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
    var file_path = $('.add-file input[type="text"]').val();

    var socket = io.connect('http://localhost:8080');

    socket.on("log update", function(data) {
      console.log(data);

      var console_output = new ConsoleOutput();
      console_output.content = escapeHtml(data.data);

      $('.log-area .log').append(console_output.toHtml()).scrollTop($('.log-area .log')[0].scrollHeight);
    });

    socket.emit('request log', { file_path: file_path });
  })
});