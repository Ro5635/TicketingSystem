const express = require('express');
const router = express.Router();


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


// conn.end();
module.exports = router;
