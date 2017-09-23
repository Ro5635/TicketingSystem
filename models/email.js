/**
 * Email Model
 *
 * Handles the sending of mail within the node application
 */


const log = require('../helpers/bunyanLogger').getLogger;
const mailHelper = require('../helpers/email');


exports.sendTicketMail = function (toEmail, toName) {
    "use strict";

    return new Promise((resolve, reject) => {

        // Get the email content with the name embedded
        const emailContent = require('../appConnectionDetails').emailText(toName);

        mailHelper.sendMail(toEmail, 'AstonHack Ticket', emailContent)
            .then( result => {

                log.status('Ticket Email Sent Successfully');
                resolve(result);

            })
            .catch( err => {
                reject(err);

            })

    });

};