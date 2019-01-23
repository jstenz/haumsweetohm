// Script simulant le réseau des laumios

var mqtt = require('mqtt')
var client  = mqtt.connect('mqtt://localhost')

function subscribe( client, topic ) {
    client.subscribe(topic, function (err) {
        console.log('subscribe ' + topic + ' : ' + (err || 'No error'));
    })
}

client.on('connect', function () {
    console.log('connection...');
    subscribe(client, 'laumio/all/discover');
    subscribe(client, 'laumio/laumio1/discover');
})

client.on('message', function (topic, message) {
    // message is Buffer
    console.log(topic + ' : ' + message.toString())
    client.publish('laumio/status/advertise', 'laumio1');
})
