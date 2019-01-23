const fs = require('fs');
var mqtt = require('mqtt');
var client  = mqtt.connect('mqtt://localhost');
//var client = mqtt.connect('mqtt://mpd.lan');
const Koa = require('koa');
const router = require('koa-router')();
const serve = require('koa-serve');
const bodyParser = require('koa-bodyparser');
const app = new Koa();

var anim = {
    'Clignote': [
        ['fill', 200, 255, 255, 255],
        ['fill', 200,   0,   0,   0],
        ['fill', 200, 255, 255, 255],
        ['fill', 200,   0,   0,   0],
        ['fill', 200, 255, 255, 255],
        ['fill', 200,   0,   0,   0]
    ],
    'Arc-en-ciel': [
        ['animate_rainbow', 1000]
    ],
    'Radar': [
        ['set_column',   0, 0, 255, 0, 0],
        ['set_column',   0, 0, 170, 0, 1],
        ['set_column',   0, 0,  85, 0, 2],
        ['set_column', 500, 0,   0, 0, 3],

        ['set_column',   0, 0, 255, 0, 3],
        ['set_column',   0, 0, 170, 0, 0],
        ['set_column',   0, 0,  85, 0, 1],
        ['set_column', 500, 0,   0, 0, 2],

        ['set_column',   0, 0, 255, 0, 2],
        ['set_column',   0, 0, 170, 0, 3],
        ['set_column',   0, 0,  85, 0, 0],
        ['set_column', 500, 0,   0, 0, 1],

        ['set_column',   0, 0, 255, 0, 1],
        ['set_column',   0, 0, 170, 0, 2],
        ['set_column',   0, 0,  85, 0, 3],
        ['set_column', 500, 0,   0, 0, 0],

        ['set_column',   0, 0, 255, 0, 0],
        ['set_column',   0, 0, 170, 0, 1],
        ['set_column',   0, 0,  85, 0, 2],
        ['set_column', 500, 0,   0, 0, 3],

        ['set_column',   0, 0, 255, 0, 3],
        ['set_column',   0, 0, 170, 0, 0],
        ['set_column',   0, 0,  85, 0, 1],
        ['set_column', 500, 0,   0, 0, 2],

        ['set_column',   0, 0, 255, 0, 2],
        ['set_column',   0, 0, 170, 0, 3],
        ['set_column',   0, 0,  85, 0, 0],
        ['set_column', 500, 0,   0, 0, 1],

        ['set_column',   0, 0, 255, 0, 1],
        ['set_column',   0, 0, 170, 0, 2],
        ['set_column',   0, 0,  85, 0, 3],
        ['set_column', 500, 0,   0, 0, 0]
    ]
}

var volume = 0;
const listTopic = {
    'laumio/status/advertise' : function(message){
        if(message == 'discover') return;
        console.log('Ajout de "'+message+'"');
        groupDB['0'].push(message);
    },
    'capteur_bp/switch/led1/state' : function(message){
        console.log(scenarioDB['Bouton1']);
        if(!scenarioDB['Bouton1'])return;
        display(groupDB[scenarioDB['Bouton1'].group], anim[scenarioDB['Bouton1'].action]);
    },
    'capteur_bp/switch/led2/state' : function(message){
        if(!scenarioDB['Bouton2'])return;
        display(groupDB[scenarioDB['Bouton2'].group], anim[scenarioDB['Bouton2'].action]);
    },
    'capteur_bp/switch/led3/state' : function(message){
        if(!scenarioDB['Bouton3'])return;
        display(groupDB[scenarioDB['Bouton3'].group], anim[scenarioDB['Bouton3'].action]);
    },
    'capteur_bp/switch/led4/state' : function(message){
        if(!scenarioDB['Bouton4'])return;
        display(groupDB[scenarioDB['Bouton4'].group], anim[scenarioDB['Bouton4'].action]);
    },
    'remote/prev/state' : function(message){
        client.publish('music/control/previous', '');
    },
    'remote/next/state' : function(message){
        client.publish('music/control/next', '');
    },
    'remote/playp/state' : function(message){
        client.publish('music/control/toggle', '');
    },
    'remote/minus/state' : function(message){
        if (volume > 0) volume -= 5;
        client.publish('music/control/setvol', volume);
    },
    'remote/plus/state' : function(message){
        if (volume < 100) volume += 5;
        client.publish('music/control/setvol', volume);
    }
};

function display(targets, parameters) {
    if (!parameters || parameters.length == 0) return; // Condition d'arret.
    var cur = parameters[0];
    var out = '';
    var type = cur[0];
    var wait = cur[1];
    switch(type) {
        case 'fill': out = ", 'rgb': ["+cur[2]+","+cur[3]+","+cur[4]+"]"; break;
        case 'set_ring': out = ", 'ring': "+cur[5]+", 'rgb': ["+cur[2]+","+cur[3]+","+cur[4]+"]"; break;
        case 'set_column': out = ", 'column': "+cur[5]+", 'rgb': ["+cur[2]+","+cur[3]+","+cur[4]+"]"; break;
        case 'set_pixel': out = ", 'led': "+cur[5]+", 'rgb': ["+cur[2]+","+cur[3]+","+cur[4]+"]"; break;
        case 'color_wipe': out = ", 'duration': "+wait+", 'rgb': ["+cur[2]+","+cur[3]+","+cur[4]+"]"; break;
        default: break;
    }
    console.log("SEND {'command': '" + type + "'" + out + "}");
    (targets || []).forEach(laumioId => {
        console.log('ID : ' + laumioId);
        client.publish('laumio/' + laumioId + '/json', "{'command': '" + type + "'" + out + "}");
    });
    if (wait > 0) {
        setTimeout(display, wait, targets, parameters.slice(1));
    } else {
        display(targets, parameters.slice(1));
    }
}

client.on('connect', function () {
    console.log('connection...');
    for (key in listTopic) {((key) => {
        client.subscribe(key, (err) => {
            console.log('subscribe to "' + key + '" : ' + (err || 'No error'));
            if (!err && key == 'laumio/status/advertise') {
                console.log('Detecting laumio...');
                client.publish('laumio/all/discover', '');
            }
        });
    })(key);}
});

client.on('message', function (topic, message) {
    message = message.toString();
    console.log(topic + ' : ' + message);
    if (listTopic[topic] != undefined) {
        listTopic[topic](message);
    } else {
        console.log('Unknow topic : ' + topic + ' => ' + message);
    }
});

/// SERVEUR INTERFACE GRAPHIQUE UTILISATEUR ///

router.get('/', index)
    .get('/groupe', getGroupe)
    .get('/scenario/:id', getScenario)
    .post('/setgroupe', setGroup)
    .post('/setscenario', setScenario);

app.use(bodyParser());
app.use(router.routes());
app.use(router.allowedMethods());
app.use(serve('static'));

var groupDB = [[]];
var scenarioDB = {};

function index(ctx) {
    ctx.body = '...';
}

function getGroupe(ctx) {
    ctx.body = JSON.stringify(groupDB);
}

function getScenario(ctx) {
    ctx.body = JSON.stringify(scenarioDB);
}

function setGroup(ctx) {
    var n = 1;
    ctx.request.body.data.forEach(grp => {
        groupDB[n++] = grp;
    })
    ctx.redirect('/');
}

function setScenario(ctx) {
    console.log(ctx.request.body.event);
    console.log(ctx.request.body.group);
    console.log(ctx.request.body.action);
    scenarioDB[ctx.request.body.event] = {
        'group': ctx.request.body.group,
        'action': ctx.request.body.action
    }
    ctx.redirect('/');
}

app.listen(3000);
