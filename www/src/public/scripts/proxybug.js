﻿var pbapp = angular.module('proxybug', []);

pbapp.controller('TrafficMonitor', ['$scope', function ($scope) {
    $scope.greeting = 'Hola!';
    $scope.items = [];

    function receiveItem(data) {
        $scope.items.push(data);
        $scope.$apply();
    };

    var socket = io.connect(window.location.protocol + '//' + window.location.host);
    socket.on('news', function (data) {
        console.log(data);
        receiveItem(data);
    });

/*
    setInterval(function () {
        receiveItem({
            request: {
                url: "http://foo.com/some/other/file.png",
                method: "GET"
            },
            response: {
                contentType: "image/png",
                status: "200",
                size: "12345KB"
            }
        });
    }, 5500);
*/
}]);