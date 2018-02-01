var restify = require('restify');
var builder = require('botbuilder');
var botbuilder_azure = require("botbuilder-azure");
var async = require('async');
var requestAPI = require('request');
const RailUrl = 'https://limitless-beyond-94753.herokuapp.com/RailwayAPI';
const FlightUrl = 'https://limitless-beyond-94753.herokuapp.com/FlightAPI';
const header = {
        'Cache-Control': 'no-cache',
        Accept: 'application/json',
        'Content-Type': 'application/json'
};

// Indian Cities Database
const indianCitiesDatabase = require('indian-cities-database');
var cities = indianCitiesDatabase.cities;

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
   console.log('%s listening to %s', server.name, server.url); 
});
// Create chat connector for communicating with the Bot Framework Service
var connector = new builder.ChatConnector({
    appId: process.env.MicrosoftAppId,
    appPassword: process.env.MicrosoftAppPassword,
    openIdMetadata: process.env.BotOpenIdMetadata 
});
// Listen for messages from users 
server.post('/api/messages', connector.listen());
var tableName = 'botdata';
var azureTableClient = new botbuilder_azure.AzureTableClient(tableName, process.env['AzureWebJobsStorage']);
var tableStorage = new botbuilder_azure.AzureBotStorage({ gzipData: false }, azureTableClient);
// Create your bot with a function to receive messages from the user
var bot = new builder.UniversalBot(connector);
bot.set('storage', tableStorage);
// Make sure you add code to validate these fields
var luisAppId = process.env.LuisTrainFlightAppId;
var luisAPIKey = process.env.LuisAPIKey;
var luisAPIHostName = process.env.LuisAPIHostName || 'westus.api.cognitive.microsoft.com';
// const LuisModelUrl = 'https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/a4dde359-60af-473f-9ab1-8736e7d49b3f?subscription-key=079d435b82444f05874465d1fc7dc0c6'
const LuisModelUrl = 'https://' + luisAPIHostName + '/luis/v1/application?id=' + luisAppId + '&subscription-key=' + luisAPIKey; 
// Main dialog with LUIS
var recognizer = new builder.LuisRecognizer(LuisModelUrl);
console.log('RECOGNIZERIS:::'+JSON.stringify(recognizer));
var mySession ='';
var intents = new builder.IntentDialog({ recognizers: [recognizer] })
.matches('greetings', (session) => {
    mySession = session;
    session.beginDialog( 'initial', function (err) {
            if (err) {
                session.send(new builder.Message()
                    .text('This channel does not support this operation: ' + err.message));
            }
        });
    // session.send('Hi, I am Train Flight Bot. I can help you with Train and Flight related assistance.\n 1. Train Services \n 2. Flight Services \n\n (For eg : Train Services)');
})
.matches('servicetype', (session) => {
    session.userData.ServiceType =  session.message.text;   
    switch(session.message.text.toLowerCase()) {
       case "train services":
            // session.send("Choose the train services provided \n 1. Book a Train Ticket \n 2. Cancelled Trains \n 3. Get Station Code \n 4. Train Route \n5. PNR Status \n\n (For eg : Book a Train Ticket)");
            session.beginDialog('showTrainServices', function(err) {
                if(err) {
                    session.send(new builder.Message().text('Error Occurred while sending train response' + err.message));
                }
            });    
            break;
            
       case "flight services":
            session.send("Choose the flight services provided \n 1. Book a Flight Ticket \n 2. Reschedule Flight \n 3. Cancel Flight \n 4. Flight Status \n5. Facilities in Flight \n\n (For eg : Book a Flight Ticket)");
            break;
    }
})
.matches('trainticketbook', (session) => {
    
    session.send(' Sure, Please provide me your Boarding Point');
})

 
 bot.dialog('initial', [
     function(session) {
         session.beginDialog('showDefaultCard',function(err) {
                if(err) {
                    session.send(new builder.Message().text('Error Occurred while sending rich response' + err.message));
                }
            });    
     }
   ]); 

//Card Response
bot.dialog('showDefaultCard', function (session) {
    var msg = new builder.Message(session);
    msg.text('Hi, I am Train Flight Bot. I can help you with Train and Flight related assistance')
    msg.attachmentLayout(builder.AttachmentLayout.carousel)
    msg.attachments([
        new builder.HeroCard(session)
            .title("Train Services")
            .subtitle("Rail Transport")
            .text("Choose an option")
            .images([builder.CardImage.create(session, 'http://cdn.wonderfulengineering.com/wp-content/uploads/2014/05/train-pictures-4.jpg')])
            .buttons([
                builder.CardAction.imBack(session, "Train Services", "Select")
            ])//,
        // new builder.HeroCard(session)
        //     .title("Flight Services")
        //     .subtitle("Flight Transport")
        //     .text("Choose an option")
        //     .images([builder.CardImage.create(session, 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSAfOK3r6LQscu2aLGiMVz8g7Uo6W46nNeQr1kql9GROpvwNS_N')])
        //     .buttons([
        //         builder.CardAction.imBack(session, "Flight Services", "Select")
        //     ])
    ]);
    session.send(msg).endDialog();
}).triggerAction({ matches: /^(show|list)/i });

//Display Train Services
bot.dialog('showTrainServices', [
    function (session) {
        builder.Prompts.choice(session, 'Kindly choose a train service', ['Book a train ticket', 'Check PNR status', 'Cancelled Trains', 'Get Station Code', 'Check Train Route']);
    },
    function(session, results) {
        console.log(results.response.entity);
        session.userData.TrainServiceType = results.response.entity;
        if(session.userData.TrainServiceType === 'Book a train ticket') {
            session.beginDialog('trainBooking_Source', function(err) {
                if(err) {
                    session.send(new builder.Message().text('Error Occurred while triggering train booking' + err.message));
                }
            });
        }
        if(session.userData.TrainServiceType === 'Cancelled Trains') {
            session.beginDialog('cancelledTrains', function(err) {
                if(err) {
                    session.send(new builder.Message().text('Error Occurred while triggering cancelled trains' + err.message));
                }
            });
        }
        if(session.userData.TrainServiceType === 'Get Station Code') {
            session.beginDialog('getStationCode', function(err) {
                if(err) {
                    session.send(new builder.Message().text('Error Occurred while getting station code' + err.message));
                }
            });
        }
        if(session.userData.TrainServiceType === 'Check Train Route') {
            session.beginDialog('getTrainRoute', function(err) {
                if(err) {
                    session.send(new builder.Message().text('Error Occurred while getting station code' + err.message));
                }
            });
        }
        if(session.userData.TrainServiceType === 'Check PNR status') {
            session.beginDialog('getPNRStatus', function(err) {
                if(err) {
                    session.send(new builder.Message().text('Error Occurred while getting station code' + err.message));
                }
            });
        }
        // else {
        //     session.endDialog('I cannot understand your input.');            
        // }        
    }    
]);

//Book a Train Ticket
// bot.dialog('trainBooking', [
//     function(session) {
//        builder.Prompts.text(session, 'Please provide your boarding point');
//     }, function(session, results, next) {                          
//         if(searchCityInDB(results.response, cities) > -1) {
//             session.userData.BoardingPoint = results.response;
//             builder.Prompts.text(session, 'Please provide your destination');
//             next();
//         }
//         else {
//             builder.Prompts.text(session, 'City is not found in our database! Please provide your boarding point!');            
//         }
//         
//     }, function(session, results, next) {
//         session.userData.Destination = results.response;
//         builder.Prompts.time(session, 'Please provide your date of journey');    
//     }, function(session, results) {
//         console.log(results.response.resolution.start.toLocaleString());
//         session.userData.DateOfJourney = results.response.resolution.start.toDateString();
//         builder.Prompts.number(session, 'Please provide total number of passengers');    
//     }, function(session, results, next) {
//         if(results.response > 0) {
//             session.userData.Passengers = results.response;
//             next();
//         }
//         else {
//             builder.Prompts.number(session,'Number of passengers cannot be less than 1. Please provide number of passengers');    
//         }
//     }, function(session, results) {
//         async.parallel([
//         function (callback) {
//             data = {
//                     "IntentName": "TrainIntent.BookTicket",
//                     "BoardingPoint": session.userData.BoardingPoint,
//                     "Destination": session.userData.Destination,
//                     "DateOfTravel": session.userData.DateOfJourney,
//                     "Tickets": session.userData.Passengers
//                 };
//                 
//             var options = {
//                 url: RailUrl,
//                 method: 'POST',
//                 header: header,
//                 body: data,
//                 json: true
//             };
// 
//             requestAPI(options, function (error, resp, body) {
//                 if (error) {
//                     console.dir(error);
//                     return
//                 }
//                 else {
//                     console.log('status code:' + resp.statusCode);
// 
//                     console.log('Inside data process');
//                     callback(false, body);
//                 }
//             });
//         }],
//         function(err, result) {
//             let boardingPoint = session.userData.BoardingPoint;
//             let destination = session.userData.Destination;
//             let dateoftravel = session.userData.DateOfJourney;
//             let tickets = session.userData.Passengers;
//             let ticketno = result[0];
//             var msg = 'Train ticket booking for ' + tickets + ' tickets is successful from ' + boardingPoint + ' - ' + destination + ' on ' + dateoftravel + '. Your ticket number is ' + ticketno;
//             
//             session.endDialog(msg);
//             session.beginDialog('anythingElse',function(err) {
//                 if(err) {
//                     session.send(new builder.Message().text('Error Occurred while sending rich response' + err.message));
//                 }
//             });    
//         });        
//     }
// ]);

bot.dialog('trainBooking_Source', [
    function(session) {
       builder.Prompts.text(session, 'Please enter a boarding point');
    }, function(session, results) {         
        try {
            return checkStations(results.response)
                    .then((res) => {
                        console.log(res);
                        
                        if(res.length > 0) {
                            builder.Prompts.choice(session, 'Select a boarding point', res);   
                        }
                        else {
                            session.send('No station names found... Please try again...');
                            session.beginDialog('anythingElse',function(err) {
                                if(err) {
                                    session.send(new builder.Message().text('Error Occurred while sending rich response' + err.message));
                                }
                            }); 
                        return false;
                        }
                    })
                    .catch(function (err) {
                    console.log('CATCH', err);
                    session.send('No station names found... Please try again...');
                    session.beginDialog('anythingElse',function(err) {
                        if(err) {
                            session.send(new builder.Message().text('Error Occurred while sending rich response' + err.message));
                        }
                    });
                });
        }
        catch(err) {
            console.log(err);
            session.send('No station names found... Please try again...');
            session.beginDialog('anythingElse',function(err) {
                if(err) {
                    session.send(new builder.Message().text('Error Occurred while sending rich response' + err.message));
                }
            });
        }         
         
        // if(searchCityInDB(results.response, cities) > -1) {
        //     session.userData.BoardingPoint = results.response;
        //     builder.Prompts.text(session, 'Please provide your destination');
        // }
        // else {
        //     builder.Prompts.text(session, 'City is not found in our database! Please provide your boarding point!');            
        // }
        
    },
    function(session, results) {
         session.userData.BoardingPoint = results.response.entity;
         session.beginDialog('trainBooking_Destination', function(err) {
                if(err) {
                    session.send(new builder.Message().text('Error Occurred while sending rich response' + err.message));
                }
            });
    }
]);

bot.dialog('trainBooking_Destination', [
    function(session) {
       builder.Prompts.text(session, 'Please enter your destination');
    }, function(session, results) {                     
        try {
            return checkStations(results.response)
                    .then((res) => {
                        console.log(res);
                        
                        if(res.length > 0) {
                            builder.Prompts.choice(session, 'Select a destination', res);   
                        }
                        else {
                            session.send('No station names found... Please try again...');
                            session.beginDialog('anythingElse',function(err) {
                                if(err) {
                                    session.send(new builder.Message().text('Error Occurred while sending rich response' + err.message));
                                }
                            }); 
                        return false;
                        }
                    })
                    .catch(function (err) {
                    console.log('CATCH', err);
                    session.send('No station names found... Please try again...');
                    session.beginDialog('anythingElse',function(err) {
                        if(err) {
                            session.send(new builder.Message().text('Error Occurred while sending rich response' + err.message));
                        }
                    });
                });
        }
        catch(err) {
            console.log(err);
            session.send('No station names found... Please try again...');
            session.beginDialog('anythingElse',function(err) {
                if(err) {
                    session.send(new builder.Message().text('Error Occurred while sending rich response' + err.message));
                }
            });
        }         
    },
    function(session, results) {
         session.userData.Destination = results.response.entity;
         session.beginDialog('trainBooking_Final', function(err) {
                if(err) {
                    session.send(new builder.Message().text('Error Occurred while sending rich response' + err.message));
                }
            });
    }
]);

bot.dialog('trainBooking_Final', [
    function(session) {
        builder.Prompts.time(session, 'Please provide your date of journey');    
    }, function(session, results) {
        session.userData.DateOfJourney = results.response.resolution.start.toDateString();
        builder.Prompts.number(session, 'Please provide total number of passengers');    
    }, function(session, results, next) {
        if(results.response > 0) {
            console.log('total passg');
            session.userData.Passengers = results.response;
            next();
        }
        else {
            builder.Prompts.number(session,'Number of passengers cannot be less than 1. Please provide number of passengers');    
        }
    }, function(session, results) {
        async.parallel([
        function (callback) {
            data = {
                    "IntentName": "TrainIntent.BookTicket",
                    "BoardingPoint": session.userData.BoardingPoint,
                    "Destination": session.userData.Destination,
                    "DateOfTravel": session.userData.DateOfJourney,
                    "Tickets": session.userData.Passengers
                };
                
            var options = {
                url: RailUrl,
                method: 'POST',
                header: header,
                body: data,
                json: true
            };

            requestAPI(options, function (error, resp, body) {
                if (error) {
                    console.dir(error);
                    return
                }
                else {
                    console.log('status code:' + resp.statusCode);

                    console.log('Inside data process');
                    callback(false, body);
                }
            });
        }],
        function(err, result) {
            let boardingPoint = session.userData.BoardingPoint;
            let destination = session.userData.Destination;
            let dateoftravel = session.userData.DateOfJourney;
            let tickets = session.userData.Passengers;
            let ticketno = result[0];
            var msg = 'Train ticket booking for ' + tickets + ' tickets is successful from ' + boardingPoint + ' - ' + destination + ' on ' + dateoftravel + '. Your ticket number is ' + ticketno;
            
            session.endDialog(msg);
            session.beginDialog('anythingElse',function(err) {
                if(err) {
                    session.send(new builder.Message().text('Error Occurred while sending rich response' + err.message));
                }
            });    
        });        
    }
]);

//Cancelled Trains
bot.dialog('cancelledTrains', [
    function(session) {
       builder.Prompts.time(session, 'Please provide the date');
    }, function(session, results) {
        console.log(results.response.resolution.start.toLocaleString());
        let cancelledDate = results.response.resolution.start.toLocaleString();
        // 1/30/2018, 12:00:00 PM
        let objDate = cancelledDate.split(',')[0];
        let objFormatDate = objDate.split('/');
        session.userData.CancelDate = objFormatDate[2].toString() + '-' + objFormatDate[0].toString() + '-' + objFormatDate[1].toString();
        console.log(session.userData.CancelDate);
        async.parallel([
        function (callback) {
            data = {
                    "IntentName": "TrainIntent.CancelIntent",
                    "CancelledDate": session.userData.CancelDate
                };
                
            var options = {
                url: RailUrl,
                method: 'POST',
                header: header,
                body: data,
                json: true
            };

            requestAPI(options, function (error, resp, body) {
                if (error) {
                    console.dir(error);
                    return
                }
                else {
                    console.log('status code:' + resp.statusCode);

                    console.log('Inside data process');
                    callback(false, body);
                }
            });
        }],
        function(err, result) {
            var itemsArr = []; 
            if (result[0][0].response_code != '200') {
                session.send('An error has occurred while making the request... Please try again later...');
                    session.beginDialog('anythingElse',function(err) {
                        if(err) {
                            session.send(new builder.Message().text('Error Occurred while sending rich response' + err.message));
                        }
                    }); 
                return false;
            }
            
            if (result[0][0].total > 0) {
                for (let index = 0; index < 10; index++) {
                    var objcardItemsHeader = new cardItemsHeader();
                    var objcardItemsData = new cardItemsData(); 
                    
                    objcardItemsHeader.text = result[0][0].trains[index].name;
                    objcardItemsData.text = 'Train Number : ' + result[0][0].trains[index].number + ', Source : ' + result[0][0].trains[index].source.name + ' - ' + result[0][0].trains[index].source.code + ', Destination : ' + result[0][0].trains[index].dest.name + ' - ' + result[0][0].trains[index].dest.code + '';
                    itemsArr.push(JSON.parse(JSON.stringify(objcardItemsHeader)));
                    itemsArr.push(JSON.parse(JSON.stringify(objcardItemsData)));
                }
                console.log(itemsArr);
                
                var card = {
                        'contentType': 'application/vnd.microsoft.card.adaptive',
                        'content': {
                            '$schema': 'http://adaptivecards.io/schemas/adaptive-card.json',
                            'type': 'AdaptiveCard',
                            'version': '1.0',
                            'body': [
                                {
                                    'type': 'Container',
                                    'speak': '',
                                    'items': [
                                        {
                                            'type': 'ColumnSet',
                                            'columns': [
                                                {
                                                    'type': 'Column',
                                                    'size': 'auto',
                                                    'items': [
                                                        {
                                                            'type': 'Image',
                                                            'url': 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTc4WvJ2mL6xw2fnEa1_6X6SSuEK5Sez82VebpTZGl_PGiuwzdwZw',
                                                            'size': 'medium',
                                                            'style': 'person'
                                                        }
                                                    ]
                                                },
                                                {
                                                    'type': 'Column',
                                                    'size': 'stretch',
                                                    'items': itemsArr
                                                }
                                            ]
                                        }
                                    ]
                                }
                            ],
                            'actions': [ /* */ ]
                        }
                    };
                    
                    var msg = new builder.Message(session)
                        .addAttachment(card);
                    session.send('List of Cancelled Trains');
                    session.send(msg);
                    session.beginDialog('anythingElse',function(err) {
                        if(err) {
                            session.send(new builder.Message().text('Error Occurred while sending rich response' + err.message));
                        }
                    }); 
            }
        });        
    }
]);

//Get Station Code
bot.dialog('getStationCode', [
    function(session) {
       builder.Prompts.text(session, 'Please provide Station Name');
    }, function(session, results) {
        session.userData.StationName = results.response;
        async.parallel([
        function (callback) {
            data = {
                    "IntentName": "TrainIntent.GetStationCode",
                    "StationName": session.userData.StationName
                };
                
            var options = {
                url: RailUrl,
                method: 'POST',
                header: header,
                body: data,
                json: true
            };

            requestAPI(options, function (error, resp, body) {
                if (error) {
                    console.dir(error);
                    return
                }
                else {
                    console.log('status code:' + resp.statusCode);

                    console.log('Inside data process');
                    if(resp.statusCode == '200') {
                        callback(false, body);
                    }
                    else {
                        session.send('An error occurred while fetching data... Please try again later...');
                    }
                }
            });
        }],
        function(err, result) {
            var message = '';
            if (result[0][0].response_code != '200') {
                session.send('An error has occurred while making the request... Please try again later...');
                    session.beginDialog('anythingElse',function(err) {
                        if(err) {
                            session.send(new builder.Message().text('Error Occurred while sending rich response' + err.message));
                        }
                    }); 
                return false;
            }
            
            if (result[0][0].stations.length > 0) {
                for (let index = 0; index < result[0][0].stations.length; index++) {
                    message += result[0][0].stations[index].code + ' - ' + result[0][0].stations[index].name + ', ';
                }
            }            
            session.send(message);
            
            session.beginDialog('anythingElse',function(err) {
                if(err) {
                    session.send(new builder.Message().text('Error Occurred while sending rich response' + err.message));
                }
            });         
        });        
    }
]);

//Get Train Route
bot.dialog('getTrainRoute', [
    function(session) {
       builder.Prompts.number(session, 'Please provide Train Number');
    }, function(session, results) {
        session.userData.TrainNumber = results.response;
        async.parallel([
        function (callback) {
            data = {
                    "IntentName": "TrainIntent.TrainRoute",
                    "TrainNumber": session.userData.TrainNumber
                };
                
            var options = {
                url: RailUrl,
                method: 'POST',
                header: header,
                body: data,
                json: true
            };

            requestAPI(options, function (error, resp, body) {
                if (error) {
                    console.dir(error);
                    return
                }
                else {
                    console.log('status code:' + resp.statusCode);

                    console.log('Inside data process');
                    if(resp.statusCode == '200') {
                        callback(false, body);
                    }
                    else {
                        session.send('An error occurred while fetching data... Please try again later...');
                    }
                }
            });
        }],
        function(err, result) {
            var message = '';
            if (result[0][0].response_code != '200') {
                session.send('An error has occurred while making the request... Please try again later...');
                    session.beginDialog('anythingElse',function(err) {
                        if(err) {
                            session.send(new builder.Message().text('Error Occurred while sending rich response' + err.message));
                        }
                    }); 
                return false;
            }
            
            if (result[0][0].route.length > 0) {
                for (let index = 0; index < result[0][0].route.length; index++) {
                    message += result[0][0].route[index].station.code + ' - ' + result[0][0].route[index].station.name + ', ';
                }
            }
            session.send(message);
            
            session.beginDialog('anythingElse',function(err) {
                if(err) {
                    session.send(new builder.Message().text('Error Occurred while sending rich response' + err.message));
                }
            });         
        });        
    }
]);

//Get PNR Number
bot.dialog('getPNRStatus', [
    function(session) {
       builder.Prompts.number(session, 'Please provide your PNR number');
    }, function(session, results) {
        session.userData.PNRNumber = results.response;
        async.parallel([
        function (callback) {
            data = {
                    "IntentName": "TrainIntent.PNRStatus",
                    "PNRNumber": session.userData.PNRNumber
                };
                
            var options = {
                url: RailUrl,
                method: 'POST',
                header: header,
                body: data,
                json: true
            };

            requestAPI(options, function (error, resp, body) {
                if (error) {
                    console.dir(error);
                    return
                }
                else {
                    console.log('status code:' + resp.statusCode);

                    console.log('Inside data process');
                    if(resp.statusCode == '200') {
                        console.log(body);
                        callback(false, body);
                    }
                    else {
                        session.send('An error occurred while fetching data... Please try again later...');
                    }
                }
            });
        }],
        function(err, result) {
            var message = '';
            if (result[0][0].response_code == '200') {
                message = "The train " + result[0][0].train.name + " - " + result[0][0].train.number + " from  " + result[0][0].boarding_point.name + " to " + result[0][0].to_station.name + " is scheduled for " + result[0][0].total_passengers + " passenger(s) on " + result[0][0].doj;
            }
            else {
                message = "An error occurred while obtaining PNR Status... Please try again later...";
            }
            session.send(message);
            
            session.beginDialog('anythingElse',function(err) {
                if(err) {
                    session.send(new builder.Message().text('Error Occurred while sending rich response' + err.message));
                }
            });         
        });        
    }
]);

//Default Anything Question
bot.dialog('anythingElse', [
    function (session) {
        builder.Prompts.choice(session, 'Can I help you with anything else?', ['Book a train ticket', 'Check PNR status', 'Cancelled Trains', 'Get Station Code', 'Check Train Route']);
    },
    function(session, results) {
         session.userData.ServiceType =  results.response.entity;
         if(session.userData.ServiceType === 'Book a train ticket') {
            session.beginDialog('trainBooking_Source', function(err) {
                if(err) {
                    session.send(new builder.Message().text('Error Occurred while choosing option' + err.message));
                }
            });
        }
        if(session.userData.ServiceType === 'Check PNR status') {
            session.beginDialog('getPNRStatus', function(err) {
                if(err) {
                    session.send(new builder.Message().text('Error Occurred while choosing option' + err.message));
                }
            });
        }
        if(session.userData.ServiceType === 'Cancelled Trains') {
            session.beginDialog('cancelledTrains', function(err) {
                if(err) {
                    session.send(new builder.Message().text('Error Occurred while choosing option' + err.message));
                }
            });
        }
        if(session.userData.ServiceType === 'Get Station Code') {
            session.beginDialog('getStationCode', function(err) {
                if(err) {
                    session.send(new builder.Message().text('Error Occurred while choosing option' + err.message));
                }
            });
        }
        if(session.userData.ServiceType === 'Check Train Route') {
            session.beginDialog('getTrainRoute', function(err) {
                if(err) {
                    session.send(new builder.Message().text('Error Occurred while choosing option' + err.message));
                }
            });
        }
        
        // if(session.userData.ServiceType === 'Flight Services') {
        //     session.beginDialog('showTrainServices', function(err) {
        //         if(err) {
        //             session.send(new builder.Message().text('Error Occurred while choosing option' + err.message));
        //         }
        //     });
        // }
    }
]);

//Card Items Object
 var cardItemsHeader = function() {
    this.type = 'TextBlock';
    this.text = null;
    this.weight = 'bolder';
    this.isSubtle = true;
};

var cardItemsData = function () {
    this.type = 'TextBlock';
    this.text = null;
    this.wrap = true;
};

//City Data Check
function searchCityInDB (str, strArray) {
    for (var index = 0; index < strArray.length; index++) {
        if (strArray[index].city.toLowerCase().match(str.toLowerCase())) {
            return index;   
        }        
    }
    return -1;
}

function checkStations(str) {
    return new Promise(function(resolve, reject){
        async.parallel([
        function (callback) {
            data = {
                    "IntentName": "TrainIntent.GetStationCode",
                    "StationName": str
                    };
                
            var options = {
                url: RailUrl,
                method: 'POST',
                header: header,
                body: data,
                json: true
            };
        
            requestAPI(options, function (error, resp, body) {
                if (error) {
                    console.dir(error);
                    reject(error);
                    return
                }
                else {
                    console.log('status code:' + resp.statusCode);
        
                    console.log('Inside data process');
                    if(resp.statusCode == '200') {
                        callback(false, body);
                    }
                    else {
                        reject(error);
                    }
                }
            });
        }],
        function(err, result) {
            var message = [];
            
            if (result[0][0].stations.length > 0) {
                for (let index = 0; index < result[0][0].stations.length; index++) {
                    message.push(result[0][0].stations[index].code + ' - ' + result[0][0].stations[index].name);
                }
            }
            // return message; //resolve(message);
            resolve(message);
        });
    })             
}

bot.dialog('/', intents); 
