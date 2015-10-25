angular.module('starter.controllers', ['ionic', 'ngCordova'])

.controller('DashCtrl', function($scope) {})

.controller('ListViewCtrl', function($scope, $rootScope, $ionicPlatform, $ionicModal, $cordovaGeolocation, $cordovaCamera, $ionicPopup, $http) {

  /* MODAL VIEW */
  $ionicModal.fromTemplateUrl('templates/modal-post.html', {
    scope: $scope,
    animation: 'slide-in-up'
  }).then(function(modal) {
    $scope.modal = modal;
  });
  
  $scope.addPost = function() {
    $scope.modal.show();
      var posOptions = {timeout: 10000, enableHighAccuracy: false};
      $cordovaGeolocation.getCurrentPosition(posOptions).then(function(position) {
        alert(position.coords.latitude + ", " + position.coords.longitude);
        var lat = position.coords.latitude;
        var long = position.coords.longitude;

        $scope.formData = new FormData();
        $scope.formData.append("latitude", lat);
        $scope.formData.append("longitude", long);

      }, function(err) {
        console.log(err);
    });
  }

  $scope.closeModal = function() {
    $scope.modal.hide();
  }

  $scope.$on('$destroy', function() {
    $scope.modal.remove();
  });

  $scope.capture = function() {
    var options = {
      quality: 75,
      destinationType: Camera.DestinationType.DATA_URL,
      sourceType: Camera.PictureSourceType.CAMERA,
      encodingType: Camera.EncodingType.JPEG,
      targetWidth: 100,
      targetHeight: 100,
      popoverOptions: CameraPopoverOptions,
      saveToPhotoAlbum: false,
      correctOrientation:true
    };

    $cordovaCamera.getPicture(options).then(function(imageData) {
      var image = document.getElementById('preview-image');
      image.src = "data:image/jpeg;base64," + imageData;
      $scope.formData.append("picture", imageData);
    }, function(err) {
      console.log("Error!");
    });
  };

  $scope.submitPost = function() {
    if($scope.description === "") {
      $ionicPopup.alert({
        template: 'You need to enter a description to submit!',
        title: 'Description needed'
      });
    } else if(!$scope.formData.has("picture")) {
      $ionicPopup.alert({
        template: 'You need to take a picture of the incident!',
        title: 'Image needed'
      });
    } else {
      $http.post("https://localpulse.org/api/1.0/upload", $scope.formData, {
        headers: {'Content-Type': undefined}
      })
      .success(function() {
        $scope.modal.hide();
        $ionicPopup.alert({
          template: 'Your incident was posted.',
          title: 'Success!'
        });
      })
      .error(function() {
        console.log("There was, like an error");
      })
    }
  }
  
  // You can use this entries object in the interim
  // in order to test your list items, which should interact with this
  $rootScope.entries = [];
  
  $ionicPlatform.ready(function() {
    angular.forEach($rootScope.entries, function(value, key) {
      
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
         value.geolocation = response.address.Address + ", " + response.address.City;
      })
      .error(function() {
        value.geolocation = value.latitude 
        + ", " + value.longitude;
      });
    });
    
  });
  
})

.controller('ListDetailCtrl', function($scope) {
  // use $stateParams to grab :id
  // eyy
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
          basemap: "gray",
          center: [ -60, -10 ],
          zoom: 4 
        });
        csv = new CSVLayer("https://localpulse.org/api/1.0/getAll", {
          copyright: "Pulse LLC"
        });
        console.dir(csv)
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
        debugger;
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
