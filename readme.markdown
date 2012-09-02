# unmaintained and dead, use at your own risk :D

# promise

promise is a libary for doing async programming
and it helps you to write generic algorithm's against async code
and gives you a way of doing error handling with the options to fix
the problems from above

examples:

simple implementation of a promise to read a file

    var fs = require("fs");
    var ps = require("promise");
    
    var readFile = function(path) {
      return ps.promise(function(cont) {
        fs.readFile(path, function (err, data) {
          if (err) {
            cont.throwError("file-read.fs", { error: err });
          } else {
            cont(data);
          }
        });
      });
    };
    
    
a use of a generic algorithm like syncArray

    var filePaths = ......; // some array of file paths
    var files = ps.syncArray(map(filePaths, readFile));
   
joining together 2 promises executing in parallel
  
    var res = asyncThing1().joinWith(asyncThing2(), function(a1, a2) {
      return a1 + a2;
    });
   
using the context feture to decide wheter to log some data

    var fetchUserProfile  = function(userId) {
      return http.get("...some url?id=" + userId)
        .maps(parseUser, function(u) { return u.profileUrl; })
        .bind(http.get)
        .interact(function(data, cont) {
          if(cont.context("debug") == true) {
            console.log("fetched user profile: " + data.name);
          }
          cont(data);
        });
     };
    
     ......
    
     var profile = fetchUserProfile(1)
      .context("debug", true);
    
     profile(function(userProfile) {
       ......
     });


catching errors and responding to them

    var refreshProfile = function(oldProfile) {
      return http.get(oldProfile.url)
        .catching("timeout.core", function(error) {
          error.continueWith(oldProfile);
        });
    };
  
  
  









    