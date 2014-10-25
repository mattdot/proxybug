var pbapp = angular.module('proxybug', []);

pbapp.controller('TrafficMonitor', ['$scope', function ($scope) {
    $scope.greeting = 'Hola!';
    $scope.items = [
        {
            request: {
                url: "http://foo.com/the/path/to/the/file.html",
                method: "GET"
            },
            response: {
                contentType: "text/html",
                status: "200",
                size: "12345KB"
            }
        },
        {
            request: {
                url: "http://foo.com/some/other/file.png",
                method: "GET"
            },
            response: {
                contentType: "image/png",
                status: "200",
                size: "12345KB"
            }
        }
    ];

    function receiveItem(data) {
        $scope.items.push(data);

    };

    var socket = io('http://proxybug-dev.cloudapp.net');
    socket.on('news', function (data) {
        console.log(data);
        receiveItem(data);
        $scope.$apply();
    });

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
}]);