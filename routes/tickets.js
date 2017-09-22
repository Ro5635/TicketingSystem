const express = require('express');
const router = express.Router();


const log = require('../helpers/bunyanLogger').getLogger;
const rp = require('request-promise');
const ticketing = require('../models/ticket');

const PRIVATE_KEY = require('../appConnectionDetails').googleRecapchaPrivKey;




router.post('/provision', function (req, res, next) {

    const currentBatchID = 1;


    // Check google re-captcha
    const googleToken = req.body.googleToken;

    if(!googleToken){
        // Token must be supplied for a ticket to be provisioned, stops the spamming of the API.
        // Send Error
        return res.status(400).send({Error : {msg : 'Please Complete The Google reCAPTCHA'}});

    }

    // Test the google reCAPTCHA

    const options = {
        method: 'POST',
        uri: 'https://www.google.com/recaptcha/api/siteverify',
        body: {
            some: 'secret=' + PRIVATE_KEY + '&response=' + googleToken
        },
        json: true
    };

    rp(options)
        .then(function (jsonResponse) {
            "use strict";

            console.log('RESPONSE: ', jsonResponse);

        }).catch( err => {
            "use strict";

    });



    ticketing.getTicket(currentBatchID).then(function (ticket) {
        "use strict";
        return res.send({ticket: {id: ticket.ID}});

    })
        .catch(function (err) {
            "use strict";
            return res.send({error: {msg: err}});

        });


});


router.post('/assign', function (req, res, next) {
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
            if (jsonResponse.status === 'OK') {
                // Move ticket state to assigned

                const holderEmail = jsonResponse.data.email;
                const holderMLHID = jsonResponse.data.id;


                // Check email does not already have a ticket
                ticketing.isEmailAssignedToTicket(holderEmail)
                    .then(emailIsAssigned => {

                        return new Promise((resolve, reject) => {

                            if (emailIsAssigned) {
                                // Email can only have a single ticket
                                reject({msg: 'Email already associated with a ticket. You only need one ticket!'});

                            } else {

                                resolve();

                            }

                        });


                    })
                    .then(() => ticketing.transitionTicketToAssigned(ticketID, holderEmail, holderMLHID))
                    .then(() => {

                        let jsonAPIResponse = {};
                        jsonAPIResponse.name = jsonResponse.data.first_name + ' ' + jsonResponse.data.last_name;
                        jsonAPIResponse.ticketID = ticketID;
                        jsonAPIResponse.email = holderEmail;

                        res.send(jsonAPIResponse);

                    })
                    .catch(err => {

                        log.error('There was an error assigning ticket');
                        log.error(err);

                        if (!err.msg) {
                            err.msg = 'Error, Failed To Assign Ticket';
                        }

                        // Send the error response
                        res.status(400).send({error: {msg: err.msg}});


                    });


            } else {
                console.log(jsonResponse);
                log.error('Valid response received from mymlh, BUT without "OK" status.');
                res.status(500).send('MYMLH JSON Response Key "Status" was not equal to "OK"; Error Communicating with MLH.');

            }


        })
        .catch(function (err) {
            // Failed to get a valid response

            // Was it a bad token
            if (err.statusCode === 401) {
                log.error('MLH Token Was Invalid');
                log.error('Bad token passed with tickedID: ' + ticketID);
                log.error(err);

                // Return Access Error
                res.status(401).send({
                    error: {
                        msg: 'MYMLH Access Token Expired. Please request a new ticket.',
                        redirect: 'https://astonhack.co.uk'
                    }
                });

            } else {
                // Not an MLH access Error
                log.error('Error');
                log.error(err);
                // Return Access Error
                if (err.msg) {
                    log.error('An Invalid Request Was Made');
                    res.status(400).send({error: {msg: err.msg}});

                } else {
                    log.error('An Invalid Request Was Made');
                    res.status(400).send({error: {msg: 'Error, Invalid Request'}});

                }
            }

        });


    console.log('at: ', accessToken, ' tikID: ', ticketID);


});

// conn.end();
module.exports = router;
