/**
   Promise Tests
   ..... ..ssss. ... .. ..
*/

var ar = require("../lib/promise");

var sys = require('sys');
require("../vendor/color");

var tests = [];

var it = function(s, t) {
  tests.push([s, t]);
};

global.arTest = {
  activeInformation: "",
  
  clearLog: function() {
    this.activeInformation = "";
    this.dirs = [];
  },
  
  log: function(text) {
    this.activeInformation += "\n" + text;
    this.activeInformation += "\n-----------------------".blue;
  },
  
  printLog: function() {
    sys.puts(this.activeInformation);
    this.dirs.forEach(function(item) {
      console.log("------------------------".green);
      console.dir(item);
      console.log("------------------------".green);
    });
  },
  
  dirs: [],
  dir: function(o) {
    this.dirs.push(o);
  }
};

var runTests = function() {
  var error = function(info, name, f, extra) {
    failed++;
    sys.puts(name.underline.red + "\n");
    sys.puts(info.blue);
    if(extra != undefined) sys.puts(extra);
    arTest.printLog();
    //sys.puts(f.toString());
    sys.puts("\n==============================".green);
  };
  
  sys.puts("\n====== running tests =======".green);
  var failed = 0;
  for(var i = 0; i < tests.length; i++) {
    try {
      var worked = false;
      var msg;
      if(!tests[i][1](function(b, _msg) {
        worked = b;
        msg = _msg || "";
      })) {
        if(worked) { 
          arTest.clearLog();
          continue; }
        if(msg != "") console.log("msg: " + msg);
        error("test failed: ", tests[i][0], tests[i][1]);
      }
    } catch(e) {
      error("test crashed: ", tests[i][0], tests[i][1], e.stack + "\n" + e + "\n");
      console.log(e);
    }
    arTest.clearLog();
  }
  console.log("\n tests run: " + (tests.length + "").blue + ", tests failed: " + (failed + "").blue + "\n");
};

global.it = it;

var promise = require("../lib/promise").promise;
var ps = require("../lib/promise");

it("knows how to do a simple promise", function(cont) {
  var called = false;
  var p = promise(function(cb) {
    cb("hello world");
  });
  
  p(function(data) {
    if(data == "hello world") {
      called = true;
    }
  });
  return called;
});

it("knows how to do a simple bind", function(cont) {
  var c = promise(function(cb) {
    cb("hello dude");
  });
  var p = promise(function(cb) {
    cb("hello world");
  }).bind(function(data) {
    return c;
  });
  
  var called = false;
  p(function(data) {
    if(data == "hello dude") {
      called = true;
    }
  });
  return called;
});

it("knows how to create a interacting bind", function() {
  var c = ps.result(1);
  var b = c.bind(function(data) {
    return ps.result(data + 2);
  });
  
  var called = false;
  b(function(a) {
    if(a == 3) {
      called = true;
    }
  });
  return called;
});

it("kows how to do a simple map", function() {
  var c = ps.result(1);
  var b = c.map(function(data) {
    return data + 2;
  });
  
  var called = false;
  b(function(d) {
    if(d == 3) called = true;
  });
  return called;
});

it("can use the maps function", function() {
  var p = ps.result(1)
    .maps(function(i) { return i + 1; },
          function(i) { return i + 1; },
          function(i) { return i + 1; },
          function(i) { return i + 1; });
  var called = false;
  p(function(u) {
    if(u == 5) {
      called = true;
    }
  });
  return called;
});

it("can catch a simple error", function() {
  var withError = promise(function(cont) {
    cont.throwError("test.test", {
      errorData: 23
    });
  });
  
  var called = false;
  var withCatchedError = withError
    .catching("test.test", function(err) {
      if(err.errorData == 23) called = true;
    });

  withCatchedError(function(data) {
    
  });
  
  return called;
});

it("can continue from an error with a custom value", function() {
  var withError = promise(function(cont) {
    cont.throwError("test.test", {
      errorData: 23
    });
  });
  
  var called = false;
  var withCatchedError = withError
    .catching("test.test", function(err) {
      err.continueWith(42);
    });

  withCatchedError(function(data) {
    if(data == 42) {
      called = true;
    }
  });
  
  return called;
});

it("can catch errors multiple catchers", function() {
  var withError = promise(function(cont) {
    cont.throwError("test.test", {
      errorData: 23
    });
  });
  
  var called = false;
  var withCatchedError = withError
    .catching("wont.catch.anny", function(err) {
      err.iDontCatchAnny();
    })
    .bind(function(data) {
      return noLogicImplemented(data);
    })
    .catching("test.test", function(err) {
      called = true;
    });
  
  withCatchedError(function(data) {
    
  });
  return called;
});

it("can use the bind syntax for throwing errors", function() {
  var p = ps.result(42);
  
  var called = false;
  var c = p.bind(function(data) {
    if(data == 42) {
      return ps.throwable("wrongdata", { errorData: data });
    }
  }).catching("wrongdata", function(err) {
    if(err.errorData == 42) {
      called = true;
    }
  });
  c(function() {
    
  });
  return called;
});

it("crashes if the continuation is called more then once", function() {
  var called = false;
  var p = promise(function(cont) {
    cont("once");
    cont("twice");
  }).catching("dead-continuation-call.core", function(error) {
    called = true;
  });
  
  p(function(data) {
  });
  
  return called;
});

it("can use syncMap", function() {
  
  var p = ps.syncMap({
    sup: ps.result(42),
    dude: ps.result(41)
  });
  
  var called = false;
  p(function(d) {
    if(d.sup == 42 && d.dude == 41) {
      called = true;
    }
  });
  return called;
});

it("can handle errors from syncMap", function() {
  var p = 
    ps.syncMap({
      sup: ps.throwable("error1", { data: 1 }),
      dude: ps.throwable("error2", { data: 3 })
    })
    .catching("error1", function(e) {
      e.continueWith(e.data + 1);
    })
    .catching("error1", function(e) {
      e.continueWith(e.data + 3);
    })
    .catching("error2", function(e) {
      e.continueWith(e.data + 1);
    });
  
  var called = false;
  p(function(data) {
    if((data.sup + data.dude) == 6) {
      called = true;
    }
  });
  return called;
});


it("can use syncArray", function() {
  var p = ps.syncArray([
    ps.result(42),
    ps.result(41)
  ]);
  
  var called = false;
  p(function(d) {
    if(d[0] == 42 && d[1] == 41) {
      called = true;
    }
  });
  return called;
});

it("can handle errors from syncArray", function() {
  var p = 
    ps.syncArray([
      ps.throwable("error1", { data: 1 }),
      ps.throwable("error2", { data: 3 })
    ])
    .catching("error1", function(e) {
      e.continueWith(e.data + 1);
    })
    .catching("error1", function(e) {
      e.continueWith(e.data + 3);
    })
    .catching("error2", function(e) {
      e.continueWith(e.data + 1);
    });
  
  var called = false;
  p(function(data) {
    if((data[0] + data[1]) == 6) {
      called = true;
    }
  });
  return called;
});

it("can use a context", function() {
  var p = 
    promise(function(cont) {
      cont(cont.context("test"));
    })
    .context("test", "hello world");
  
  var called = false;
  p(function(data) {
    if(data == "hello world") {
      called = true;
    }
  });
  return called;
});

it("can get a promise of the context", function() {
  var called = false;
  var p = 
    ps.result(42)
    .interact(function(data, cont) {
      if(cont.context("source") == "client") {
        called = true;
      }
      cont(data + 2);
    })
    .context("source", "client");
  
  p(function() {
    
  });  
  
  return called;
});

runTests();
























