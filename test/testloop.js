
var spawn = require("child_process").spawn;
var fs = require("fs");
var prevtime = 0;

var runTests = function() {
  console.log("test file changed running tests...");
  var ch = spawn("node", ["test/runtests.js"]);

  ch.stdout.on("data", function(data, err) {
    process.stdout.write(data);
  });

  ch.stdout.on("end", function(data) {
    console.log(data);
  })
};

fs.watchFile("./lib/promise.js", function() {
  runTests();
});

fs.watchFile("./test/runtests.js", function() {    
  runTests();
});




