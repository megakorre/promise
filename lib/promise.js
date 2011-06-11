exports.promisePrototype = {};
exports.continuationPrototype = {};
exports.errorPrototype = {};

var wrapFn = function(f) {
  return function() {
    return f.apply(this, arguments);
  };
};

var extend = function(m1, m2) {
  for(key in m2) {
    m1[key] = m2[key];
  }
};

var linked = function(head, tail) {  
  return {
    head: head,
    tail: tail,
    cons: function(item) {
      return linked(item, this);
    }
  };
};

var assoc = function(m1, m2) {
  var res = {};
  for(key in m1) {
    res[key] = m1[key];
  }
  for(key in m2) {
    res[key] = m2[key];
  }
  return res;
};


var mergeWith = function(obj1, obj2, f) {
  var res = {};
  
  for(key in obj1) {
    res[key] = obj1[key];
  }
  
  for(key in obj2) {
    if(res[key] !== undefined) {
      res[key] = f(obj1[key], obj2[key]);
    } else {
      res[key] = obj2[key];
    }
  }
  return res;
};

exports.promise = function(f) {
  f.__proto__ = exports.promisePrototype;
  
  var promise = function(contParent, cont) {
    var parent = undefined;
    if(cont == undefined) {
      var cont = contParent;
    } else {
      parent = contParent;
    }
    
    var called = false;
    var f = cont;
    cont = function(data) {
      if(called) {
        return cont.throwError("dead-continuation-call.core", {});
      } else {
        called = true;
        try { return f(data); }
        catch(e) {
          cont.throwError("try-catch.core", {
            error: e
          })
        }
      }
    };
    cont.__proto__ = exports.continuationPrototype;
    if(parent != undefined) {
      cont.parent = parent;
    }
    cont.promise = promise;
    try { return promise.fn(cont); }
    catch(e) {
      cont.throwError("try-catch.core", { error: e });
    }
  };
  promise.__proto__ = f;
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
  
  result: function(data) {
    return promise(function(cont) {
      cont(data);
    });
  },
  
  throwable: function(namespace, obj) {
    return promise(function(cont) {
      cont.throwError(namespace, obj);
    });
  },
  
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
  
  
  
  syncArray: function(coll) {
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
    return promise(function(cont) {
      self(cont, function(data) {
        cont(f(data));
      });
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
    arguments.forEach(function(item) {
      curent = curent.map(item);
    });
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















