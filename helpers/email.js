/**
 * Email Helper
 *
 * Handles the sending of mail within the node application
 */


const log = require('../helpers/bunyanLogger').getLogger;

const appConfig = require('../appConnectionDetails');
const nodemailer = require('nodemailer');
const ses = require('nodemailer-ses-transport');

const transporter = nodemailer.createTransport(ses({
    accessKeyId: appConfig.AWS_SES_accessKeyId,
    secretAccessKey: appConfig.AWS_SES_secretAccessKey,
    region: "eu-west-1",

}));


exports.sendMail = function (toEmail, emailSubject, emailContent) {
    "use strict";

    return new Promise((resolve, reject) => {

        transporter.sendMail({
            from: 'hello@astonhack.co.uk',
            to: toEmail,
            subject: emailSubject,
            html: emailContent
        }).then(result => {
            log.info('Successfully sent ticket email out to: ' + toEmail);
            resolve(result);

        }).catch(err => {
            log.error('Failed to Email Ticket to: ' + toEmail);
            reject(err);


        })

    });

};