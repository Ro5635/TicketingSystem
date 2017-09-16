const express = require('express');
const router = express.Router();

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
        .then(function (htmlString) {
            res.send(htmlString)
        })
        .catch(function (err) {
            // Crawling failed...
        });


    console.log('at: ', accessToken, ' tikID: ', ticketID);



});

// conn.end();
module.exports = router;
