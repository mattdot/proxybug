var pbapp = angular.module('proxybug', []);

pbapp.controller('TrafficMonitor', ['$scope', function ($scope) {
    $scope.greeting = 'Hola!';
    $scope.items = [];

    function receiveItem(data) {
        $scope.items.push(data);
        $scope.$apply();
    };

    var topic = 'proxied';
    var socket = io.connect(window.location.protocol + '//' + window.location.host);
    socket.on("proxy_event", function (data) {
        console.log(data);
        receiveItem(data);
    });

    socket.on('connect', function() {
      socket.emit('join', topic);
    });
}]);
