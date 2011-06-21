/***

    Promise JS

    
    
**/

(function(exports) {

exports.promisePrototype = {};
exports.continuationPrototype = {};
exports.errorPrototype = {};


/*
  Creates a wrapper function
  to avoid anny mutation on incoming functions
*/
var wrapFn = function(f) {
  return function() {
    return f.apply(this, arguments);
  };
};

/*
  takes a map witch it extends with keys from the second
  map
*/
var extend = function(m1, m2) {
  for(key in m2) {
    m1[key] = m2[key];
  }
};

/**
   se extend:
   assoc wont mutate the original object
*/
var assoc = function(m1, m2) {
  var res = {};
  extend(res, m1);
  extend(res, m2);
  return res;
};

/*
  the promise function creates a promise
  by taking a function that resives a continuation
  witch it will call with the data that whas promised

  note the continuation is not the subscribing function it
  has methods and deals with errors and context.

  
*/
exports.promise = function(f) {
  var promise = function(contParent, f) {

    var parent = undefined; // argument shuffeling for nicer api
    if(f == undefined) {
      var f = contParent; } 
    else { parent = contParent;}
      
    var called = false; // state for error handeling
    var cont = function(data) {
      if(called) {
        return cont.throwError("dead-continuation-call.core", {});
      } else {
        called = true;
        try { return f(data); }
        catch(e) {
          cont.throwError("try-catch.core", {
            error: e
          });
        }
      }
    };
    cont.__proto__ = exports.continuationPrototype;
    if(parent != undefined) {
      cont.parent = parent;
    }
    cont.promise = promise;
    try { return promise.fn(cont); } // the call of the provided function
    catch(e) {
      cont.throwError("try-catch.core", { error: e });
    }
  };
  promise.__proto__ = exports.promisePrototype;
  promise.fn = f;  
  return promise;
};

var promise = exports.promise;

extend(exports, {
  
  terminateProssesWith: function(error) {
    console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
    console.log("! Application Terminated becuse of uncatched error !");
    console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n");
    console.log("Uncatched Error: " + error.name);
    console.dir(error);
    console.log();
    process.exit();
  },
  
  /* wrapps a value in a promise */
  result: function(data) {
    return promise(function(cont) {
      cont(data);
    });
  },
  
  /* gives you a promise witch will throw an error  */
  error: function(name, obj) {
    return this.throwable(name, obj);
  },

  throwable: function(namespace, obj) {
    return promise(function(cont) {
      cont.throwError(namespace, obj);
    });
  },
  
  /*
    takes a map of promise values
    and gives you a promis of a map
    with the values of the promises in the map

    esentialy wait for all
   */
  syncMap: function(map) {
    return promise(function(cont) {
      var resultMap = {};
      var mapItemCount = Object.keys(map).length;
      var completedCount = 0;
      for(key in map) {
        (function() {
          var k = key;
          map[k](cont, function(data) {
            resultMap[k] = data;
            completedCount++;
            if(completedCount == mapItemCount) {
              cont(resultMap);
            }
          });
        })();
      }
    });
  },
  
  /* takes a function and some arguments and returns you a function
     witch will use your argument as the first args */
  cur: function(f) {
    var args = arguments.length > 1 ? arguments.slice(1) : [];
    return function() {
      return f.apply(this, args.concat(arguments));
    };
  },

  sync: function(coll, args) {
    if(coll.constructor === Array) {
      return exports.syncArray(coll, args);
    } else {
      return exports.syncMap(coll, args);
    }
  },
  
  /* TODO: write tests forthis  */
  
  syncArrayScramble: function(coll) {
    return promise(function(cont) {
      resultArray = [];
      for(var i = 0; i < coll.length; i++) {
        coll[i] (cont, function(data) {
          resultArray.push(data);
          if(resultArray.length == coll.length) {
            cont(resultArray);
          }
        });
      }
    });
  },

  /*
    same as sync map but takes an array of promises
    and returns a promise that will wait for all of them
    and give you an array of values (order is maintained)
   */
  syncArray: function(coll, args) {
    args = args || {};
    if(args.ordered != undefined && args.ordered == false) {
      return exports.syncArrayScramble(coll);
    }

    return promise(function(cont) {
      var resultArray = new Array(coll.length);
      var completedCount = 0;
      for(var i = 0; i < coll.length; i++) {
        (function() {
          var z = i;
          coll[z](cont, function(data) {
            resultArray[z] = data;
            completedCount++;
            if(completedCount == coll.length) {
              cont(resultArray);
            }
          });
        })();
      }
    });
  }
});

extend(exports.promisePrototype, {
  
  context: function(name, val) {
    var self = this;
    return promise(function(cont) {
      return self(cont.withContext(name, val), function(data) {
        return cont(data);
      });
    });
  },
  
  interact: function(f) {
    return this.bind(function(data) {
      return promise(function(cont) {
        return f(data, cont);
      });
    });
  },
  
  map: function(f) {
    var self = this;
    return this.bind(function(data) {
      try { return exports.result(f(data)); }
      catch(e) {
        return exports.throwable("try-catch.core", { error: e });
      }
    });
  },
  
  bind: function(f) {
    var self = this;
    return promise(function(cont) {
      return self(cont, function(data) {
        return f(data)(cont, function(data) {
          cont(data);
        });
      });
    });
  },
  
  joinWith: function(p2, f) {
    var p1 = this;
    return promise(function(cont) {
      var p1d = undefined;
      var p2d = undefined;
      
      var go = function() {
        if(p1d != undefined && p2d != undefined) {
          try { cont(f(p1d, p2d)); }
          catch(e) {
            cont.throwError("try-catch.core", {
              error: e
            });
          }
        }
      };
      
      p1(cont, function(data) {
        p1d = data;
        go();
      });
      
      p2(cont, function(data) {
        p2d = data;
        go();
      });
    });
  },
  
  maps: function() {
    var curent = this;
    for(i in arguments) {
      curent = curent.map(arguments[i]);
    }
    return curent;
  },
  
  timeout: function(time) {
    var self = this;
    return promise(function(cont) {
      var timedOut = false;
      var completed = false;
      setTimeout(function() {
        if(!completed) {
          timedOut = true;
          cont.throwError("timeout.core", {});
        }
      }, time);
      
      self(cont, function(data) {
        if(!timedOut) {
          cont(data);
        }
      });
    });
  },
  
  catching: function(namespace, catcher) {
    var self = this;
    return promise(function(cont) {
      return self(cont.withCatcher(namespace, catcher), function(data) {
        return cont(data);
      });
    });
  }
});



extend(exports.continuationPrototype, {
  
  withCatcher: function(namespace, catcher) {
    var catchers = this.catchers || {};
    var cont = wrapFn(this);
    cont.__proto__ = exports.continuationPrototype;
    cont.parent = this;
    var c = {};
    c[namespace] = catcher;
    cont.catchers = assoc(catchers, c);
    return cont;
  },
  
  withContext: function(name, val) {
    var contextMap = this.contextMap || {};
    var cont = wrapFn(this);
    cont.__proto__ = exports.continuationPrototype;
    cont.parent = this;
    var c = {};
    c[name] = val;
    cont.contextMap = assoc(contextMap, c);
    return cont;
  },
  
  context: function(name) {
    if(this.contextMap != undefined && this.contextMap[name] != undefined) {
      return this.contextMap[name];
    } else {
      if(this.parent != undefined) {
        return this.parent.context(name);
      } else {
        return undefined;
      }
    }
  },
  
  /**
    a1 -> catcher -> a2
  */
  throwError: function(namespace, opts) {
    var error = {};
    extend(error, opts);
    error.__proto__ = exports.errorPrototype;
    error.name = namespace;
    error.continuation = this;
    
    var searchThis = function(e) {
      var catchers = e.catchers || {};
      if(catchers[namespace] != undefined) {
        catchers[namespace](error);
      } else {
        if(e.parent != undefined) {
          searchThis(e.parent);
        } else {
          exports.terminateProssesWith(error);
        }
      }
    };
    searchThis(this);
  },
  
  timeout: function(info) {
    return this.throwError("timeout.core", info);
  }
});

extend(exports.errorPrototype, {
  continueWith: function(value) {
    this.continuation(value);
  }
});


}) ((function() {

 if(typeof exports !== "undefined") {
   return exports; 
 }
 
 window.ps = {};
 return window.ps;

})());















