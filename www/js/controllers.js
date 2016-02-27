angular.module('starter.controllers', ['ionic', 'ngCordova', 'angularMoment'])

.run(function ($http, $rootScope, $ionicPlatform) {
  $rootScope.doRefresh = function(cb) {
    console.log("Refreshed");
    $http.get('http://localpulse.org/api/1.0/getAllJSON').success(function (entries) {

      $rootScope.entries = entries;
      console.log(entries)

      $ionicPlatform.ready(function() {

        angular.forEach(entries, function(value, key) {
          // value.pictures[0]
          var x = value.location.longitude;
          var y = value.location.latitude;

          $http.get("https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/"
                    +"reverseGeocode?location=" + x + "%2C"
                    + y + "&distance=200&outSR=&f=pjson")
          .success(function(response) {
            if (response.error) {
              value.geolocation = value.location.latitude
            + ", " + value.location.longitude;
              return;
            }
            //console.log("https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/"
            //        +"reverseGeocode?location=" + x + "%2C"
            //        + y + "&distance=200&outSR=&f=pjson");
            //console.log(response);
             value.geolocation = response.address.Address + ", " + response.address.City;
          })
          .error(function() {
            value.geolocation = value.location.latitude
            + ", " + value.location.longitude;
          })
          .finally(function() {
            if (cb) {
              cb();
            }
          });
        });
      })
    });
  };

  $rootScope.findEntry = function (objectId) {
    for (var i = 0; i < $rootScope.entries.length; i++) {
      if ($rootScope.entries[i].objectId === objectId) {
        return $rootScope.entries[i];
      }
    }
  };

  $rootScope.vote = function (entry, amt) {
    $http.post("http://localpulse.org/api/1.1/vote/" + entry.objectId, { votes: amt })
      .success(function(response) {
        // entry.votes = response;
      })
      .error(function() {
        console.log("Error voting");
      });
  };
})

.controller('DashCtrl', function($scope) {})

.controller('ListViewCtrl', function($scope, $ionicPlatform, $ionicModal,
  $cordovaGeolocation, $cordovaCamera, $cordovaFileTransfer, $ionicPopup, $http, $rootScope) {

  $ionicPlatform.ready(function() {

    angular.forEach($scope.entries, function(value, key) {

      var x = value.longitude;
      var y = value.latitude;

      $http.get("https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/"
                +"reverseGeocode?location=" + x + "%2C"
                + y + "&distance=200&outSR=&f=pjson")
      .success(function(response) {
        console.log("https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/"
                +"reverseGeocode?location=" + x + "%2C"
                + y + "&distance=200&outSR=&f=pjson");
        console.log(response);
        if (!response.address) return;
        value.geolocation = response.address.Address + ", " + response.address.City;
      })
      .error(function() {
        value.geolocation = value.latitude
        + ", " + value.longitude;
      });
    });

  });
  /* MODAL VIEW */
  $ionicModal.fromTemplateUrl('templates/modal-post.html', {
    scope: $scope,
    animation: 'slide-in-up'
  }).then(function(modal) {
    $scope.modal = modal;
    $scope.problem = {description: ""};
  });

  $scope.addPost = function() {

    $scope.modal.show();

  }

  $scope.closeModal = function() {
    $scope.modal.hide();
  }

  $scope.$on('$destroy', function() {
    $scope.modal.remove();
    $scope.didTakePicture = false;
  });

  $scope.capture = function() {
    $scope.didTakePicture = true;
    var options = {
      quality: 75,
      destinationType: Camera.DestinationType.FILE_URI,
      sourceType: Camera.PictureSourceType.CAMERA,
      encodingType: Camera.EncodingType.JPEG,
      targetWidth: 1000,
      targetHeight: 1000,
      popoverOptions: CameraPopoverOptions,
      saveToPhotoAlbum: false,
      correctOrientation: true
    };

    $cordovaCamera.getPicture(options).then(function(imageData) {
      $scope.formData = {}
      $scope.formData.imageURI = imageData;

      var preview = document.getElementById("preview-image");
      preview.src = imageData;

    }, function(err) {
      console.log("Error!");
    });
  };

  $scope.submitPost = function() {

    var continueToPost = function (position) {
      console.log("Continuing to post!")
      var lat = position.coords.latitude;
      var longi = position.coords.longitude;
      $scope.formData.latitude = lat;
      $scope.formData.longitude = longi;
      if($scope.problem.description === "" || $scope.problem.description === null) {
        console.log("empty description homies");
        $ionicPopup.alert({
          template: 'You need to enter a description to submit!',
          title: 'Description needed'
        });
      } else if(!$scope.didTakePicture) {
        $ionicPopup.alert({
          template: 'You need to take a picture of the incident!',
          title: 'Image needed'
        });
      } else {
        console.log("POSTing the following: \n[latitude]: " + $scope.formData.latitude
          + "\n[longitude]: " + $scope.formData.longitude + "\n[description]: " + $scope.problem.description
          + "\n[picture]: " + $scope.formData.imageURI);
        $cordovaFileTransfer.upload("http://localpulse.org/api/1.0/upload", $scope.formData.imageURI, {
          fileKey: "picture",
          params: {
            longitude: $scope.formData.longitude,
            latitude: $scope.formData.latitude,
            description: $scope.problem.description
          }
        }).then(function(result) {
          $scope.modal.hide();
          $ionicPopup.alert({
            template: 'Your incident was posted.',
            title: 'Success!'
          });
        }, function(err) {
          alert(err);
          console.log(err);
        }, function(progress) {
          console.log(progress);
        }, false);
      }
    }

    var posOptions = {timeout: 10000, enableHighAccuracy: false};
    $cordovaGeolocation.getCurrentPosition(posOptions)
      .then(continueToPost, function(err) {
        console.log(err);
    });
  }

  $scope.upvoteToggle = function(objectId) {

    var entry = $rootScope.findEntry(objectId);
    if (!entry) return;
    entry.didUpvote = entry.didUpvote === undefined ? false : entry.didUpvote;
    var old = entry.votes;
    if (entry.didDownvote) {
      entry.didDownvote = false;
      entry.votes += 2;
    } else if(!entry.didUpvote) {
      entry.votes++;
    } else {
      entry.votes--;
    }
    entry.didUpvote = !entry.didUpvote;
    console.log("Upvoting - " + objectId + " - now we have " + (entry.votes));
    $rootScope.vote(entry, entry.votes - old);
  }

  $scope.downvoteToggle = function(objectId) {

    var entry = $rootScope.findEntry(objectId);
    if (!entry) return;
    entry.didDownvote = entry.didDownvote === undefined ? false : entry.didDownvote;
    var old = entry.votes;
    if (entry.didUpvote) {
      entry.didUpvote = false;
      entry.votes -= 2;
    } else if(!entry.didDownvote) {
      entry.votes--;
    } else {
      entry.votes++;
    }
    entry.didDownvote = !entry.didDownvote;
    console.log("Downvoting - " + objectId + " - now we have " + (entry.votes));
    $rootScope.vote(entry, entry.votes - old);
  }

  $scope.doRefresh = function () {
    $rootScope.doRefresh(function () {
      $scope.$broadcast('scroll.refreshComplete');
    });
  };

  $scope.doRefresh();

})

.controller('ListDetailCtrl', function($scope, $stateParams, $ionicPlatform, $http, $ionicPopup, $rootScope) {
  // use $stateParams to grab :id
  // eyy
  $scope.comment = {data: ""};
  $scope.comments = [];
  $scope.title = "Problem Report";

  console.log($scope.entry);

  $ionicPlatform.ready(function() {
    $scope.buttonTitle = "+ Support";
    if ($rootScope.entries) {
      afterRefresh();
      if ($scope.entry.didUpvote) {
        $scope.buttonTitle = "✓ Supported";
      }
    } else {
      $rootScope.doRefresh(afterRefresh);
    }
    function afterRefresh() {
      $scope.entry = $rootScope.findEntry($stateParams.id);
      $http.get("http://localpulse.org/api/1.0/getComments/" + $scope.entry.objectId)
        .success(function(response) {
          $scope.comments = response;
        })
        .error(function() {
          console.log("Error fetching comments, or there were no comments");
        });
    }
  });

  $scope.upvoteToggle = function() {
    var orig = $scope.entry.votes;
    if (!$scope.entry.didUpvote) {
      $scope.buttonTitle = "✓ Supported";
      $scope.entry.didUpvote = true;
      $scope.entry.votes++;
    } else {
      $scope.buttonTitle = "+ Support";
      $scope.entry.didUpvote = false;
      $scope.entry.votes--;
    }
    $rootScope.vote($scope.entry, $scope.entry.votes - orig);
  }

  $scope.postComment = function() {
    if($scope.comment.data.trim().length === 0) {
      $ionicPopup.alert({
          template: 'You need to enter a comment to post!',
          title: 'Comment content needed'
        });
    } else {
      var payload = JSON.stringify({
          data: $scope.comment.data.trim(),
          UUID: "anonymous"
      });
      $http.post("http://localpulse.org/api/1.0/comment/" + $scope.entry.objectId, payload)
        .success(function(response) {
          $ionicPopup.alert({
            template: 'Your comment was posted!',
            title: 'Success'
          });
          $scope.comments.push({data: $scope.comment.data, createdAt: Date.now()});
          $scope.comment.data = "";
        }).error(function() {
          alert("Error sending your comment. Try again.");
        });
    }
  }
})

.controller('MapsCtrl', function($scope) {
  // needs to deal with ArcGIS
   var map, csv;

      require([
        "esri/map",
        "esri/layers/CSVLayer",
        "esri/Color",
        "esri/symbols/SimpleMarkerSymbol",
        "esri/renderers/SimpleRenderer",
        "esri/InfoTemplate",
        "esri/urlUtils",
        "esri/config",
        "dojo/domReady!"
      ], function(
        Map, CSVLayer, Color, SimpleMarkerSymbol, SimpleRenderer, InfoTemplate, esriConfig, urlUtils
      ) {
        esri.config.defaults.io.corsEnabledServers.push("localpulse.org");
        /*
        urlUtils.addProxyRule({
          proxyUrl: "/proxy/",
          urlPrefix: "earthquake.usgs.gov"
        });
        */
        map = new Map("map", {
          basemap: "topo",
          center: [-118, 34.5],
          zoom: 4
        });
        var csv = new CSVLayer("http://localpulse.org/api/1.0/getAll", {
          copyright: "Pulse LLC"
        });
        var orangeRed = new Color([238, 69, 0, 0.5]); // hex is #ff4500
        var marker = new SimpleMarkerSymbol("solid", 15, null, orangeRed);
        var renderer = new SimpleRenderer(marker);
        renderer.setVisualVariables([{
          "type": "sizeInfo",
           "field": "VOTES",
           "minSize": 10,
           "maxSize": 35,
           "minDataValue": 1,
           "maxDataValue": 20
        }]);
        csv.setRenderer(renderer);
        var template = new InfoTemplate("${description}", "${votes}");
        csv.setInfoTemplate(template);
        map.addLayer(csv);
      });
})

.controller('ChatsCtrl', function($scope, Chats) {
  // With the new view caching in Ionic, Controllers are only called
  // when they are recreated or on app start, instead of every page change.
  // To listen for when this page is active (for example, to refresh data),
  // listen for the $ionicView.enter event:
  //
  //$scope.$on('$ionicView.enter', function(e) {
  //});

  $scope.chats = Chats.all();
  $scope.remove = function(chat) {
    Chats.remove(chat);
  };
})

.controller('ChatDetailCtrl', function($scope, $stateParams, Chats) {
  $scope.chat = Chats.get($stateParams.chatId);
})

.controller('AccountCtrl', function($scope) {
  $scope.settings = {
    enableFriends: true
  };

});
