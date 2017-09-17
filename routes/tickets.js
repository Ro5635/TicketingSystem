const express = require('express');
const router = express.Router();

const log = require('../helpers/bunyanLogger').getLogger;
const rp = require('request-promise');
const ticketing = require('../models/ticket');

router.get('/provision', function (req, res, next) {


    const currentBatchID = 1;


    // Check google re-captcha


    ticketing.getTicket(currentBatchID).then(function (ticket) {
        "use strict";
        return res.send({ticket: {id: ticket.ID}});

    })
    .catch(function (err) {
    "use strict";
    return res.send({Error: err});

    });



});


router.post('/assign', function(req, res, next ){
    "use strict";

    //get the authorisation token;
    const accessToken = req.body.mlh_access_token;
    const tokenType = req.body.token_type;
    const ticketID = req.body.ticketID;


    rp('https://my.mlh.io/api/v2/user.json?access_token=' + accessToken)
        .then(function (jsonResponse) {

            console.log(jsonResponse);

            log.info('Valid response received from mymlh.');

            jsonResponse = JSON.parse(jsonResponse);

            // If token was valid
            if(jsonResponse.status === 'OK'){
                // Move ticket state to assigned

                const holderEmail = jsonResponse.data.email;
                const holderMLHID = jsonResponse.data.id;

                ticketing.transitionTicketToAssigned(ticketID, holderEmail, holderMLHID)
                    .then( () => {

                        let jsonAPIResponse = {};
                        jsonAPIResponse.name = jsonResponse.data.first_name + ' ' + jsonResponse.data.last_name;
                        jsonAPIResponse.ticketID = ticketID;
                        jsonAPIResponse.email = holderEmail;

                        res.send(jsonAPIResponse);

                    });


            }else{
                console.log(jsonResponse);
                log.error('Valid response recived from mymlh, BUT without "OK" status.');
                res.status(500).send('MYMLH JSON Response Key "Status" was not equal to "OK" ');

            }



        })
        .catch(function (err) {
            // Failed to get a valid response

            // Was it a bad token
            if(err.statusCode === 401){
                log.error('MLH Token Was Invalid');
                log.error('Bad token passed with tickedID: ' + ticketID);
                log.error(err);

                // Return Access Error
                res.status(401).send({ error : { msg : 'MYMLH Access Token Expired. Please request a new ticket.', redirect : 'https://astonhack.co.uk'}});

            }

        });


    console.log('at: ', accessToken, ' tikID: ', ticketID);



});

// conn.end();
module.exports = router;
