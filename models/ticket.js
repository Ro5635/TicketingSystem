/**
 * Ticket Model
 *
 *
 *
 */

const uuid = require('node-uuid');
const log = require('../helpers/bunyanLogger').getLogger;

const mysql = require('mysql');
const conn = mysql.createConnection({
    host: 'db.uk',
    user: 'root',
    password: '5635',
    database: 'astonhack'
});
conn.connect((err) => {
    if (err) throw err;
    console.log('Connected!');
});

/**
 *
 * @param currentBatchID
 * @returns {Promise}
 */
exports.getTicket = function (currentBatchID) {
    "use strict";

    return new Promise(function (resolve, reject) {


        /* Begin transaction */
        conn.beginTransaction(function (err) {
            if (err) {
                return reject(err);
            }


            ticketsRemain(conn, currentBatchID)
                .then(provisionTicket)
                .then(getRemaningTickets)
                .then(remainingTicketsNotNegative)
                .then(createTicket)
                .then(function (payload) {
                    "use strict";
                    payload.conn.commit(function (err) {
                        if (err) {
                            conn.rollback(function () {
                                return reject(err);
                            });
                        }

                        return resolve({ID: payload.ticketID});

                    });
                })
                .catch(function (err) {
                    //The request for a ticket could not be fulfilled
                    "use strict";
                    console.log('About to reject...');
                    conn.rollback();
                    return reject(err);


                });

        });
        /* End transaction */

    });


};

exports.transitionTicketToAssigned = function (ticketID, email, MLHID) {

    return new Promise((resolve, reject) => {
        "use strict";
        transitionTicketState(conn, ticketID, 'ASSIGNED')
            .then( () => {

                updateHolderData(conn, ticketID, email, MLHID)
                    .then(() => {
                        resolve();
                    })
                    .catch( (err) => {
                        reject(err);
                    })


            }).catch( (err) => {

                log.error('Unable to transition ticket to assigned');
                log.error('Fail in processing ticket ID: ' + ticketID);
                if(err !== undefined){
                    log.error(err);

                }

        });

    })

};


function updateHolderData(connection, ticketID, email, MLHID){
    "use strict";
    return new Promise( (resolve, reject) => {

        if(email === undefined || MLHID === undefined) {
            log.error('Attempted to update ticket attendee info with undefined data');
            log.error('email: ' + email + ' and MLHID: ' + MLHID);
            reject();//TO DO

        }

        //Ensure ticketID gets a single ticket
        //TO DO

        connection.query('UPDATE Tickets SET IssuedToEmail = ? , IssuedToMLHID = ? WHERE ID = ?', [email, MLHID, ticketID], function (err, result) {
            if (err) {
                conn.rollback(function () {
                    reject('Unknown Error');
                });
            }

            resolve();// TO DO

        });


    })

}


/**
 * Create the new ticket in the Tickets table
 *
 * @param payload
 *  BatchID
 *  Connection
 * @returns {Promise}
 */
function createTicket(payload) {
    "use strict";


    return new Promise(function (resolve, reject) {

        let ticketID = uuid.v4();

        //Insert a ticket into table
        payload.conn.query('INSERT INTO Tickets (ID, ProvisionDate, State, BatchID) VALUES(? , NOW(), "PROVISIONED", ?);', [ticketID, payload.batchID],
            function (err, result) {

                if (err) {
                    log.error('Failed to create ticket. Insert into table failed.');
                    reject(err);

                }
                payload.ticketID = ticketID;
                resolve(payload);

            });

    });

}


function transitionTicketState(connection, ticketID, toState) {

    return new Promise(function (resolve, reject) {

    // Check TicketID exists
    ticketExists(conn, ticketID).then( () => {
        "use strict";
        connection.query('UPDATE Tickets SET State = ? , AssignedDate = NOW() WHERE ID = ?', [toState, ticketID], function (err, result) {
            if (err) {
                conn.rollback(function () {
                    reject('Unknown Error');
                });
            }

            let payload = {conn: connection};
             resolve(payload);


        });

    }).catch( (err) => {
        "use strict";

        log.error('Unable to transition ticket state to: ' + toState);
        reject(err);
        // TO DO

    })

    });

}

                                                // TO DO reject with error...
function ticketExists(connection, ticketID){
    "use strict";

    return new Promise(function (resolve, reject) {

        connection.query('SELECT COUNT(ID) AS NUMOFMATCHINGID FROM Tickets WHERE ID = ?', [ticketID], function (err, result) {
            if (err) {
                conn.rollback(function () {
                    reject();
                });
            }

            let matchingTicketIDs = result[0]['NUMOFMATCHINGID'];

            if(matchingTicketIDs === 1){
                resolve();

            }else{
                log.error('Invalid TicketID used, Failed ID: ' + ticketID);
                log.error('Found ' + matchingTicketIDs + ' tickets matching supplied ticketID');

                reject(new Error('Ticket Not Found'));

            }



        });

    });
}

/**
 * This ensures that the number of remaining tickets have not been taken negative, if the number of
 * tickets is negative then there is no ticket available for this request. This is required to ensure
 * that tickets for the event are not oversold.
 *
 * @param payload   Promise chain payload
 * @returns {Promise}
 */
function remainingTicketsNotNegative(payload) {
    "use strict";

    return new Promise(function (resolve, reject) {

        getRemaningTickets(payload).then((payload) => {
            if (payload.remainingTickets >= 0) {

                return resolve(payload);

            } else {
                reject('No Tickets Available');
            }
        });
    });

}

function ticketsRemain(connection, batchID) {
    "use strict";

    return new Promise(function (resolve, reject) {

        //Build the payload for passing down the promise chain
        let payload = {conn: connection, batchID: batchID};

        getRemaningTickets(payload).then((payload) => {
            if (payload.remainingTickets > 0) {

                return resolve(payload);
            } else {
                reject('No Tickets Available');
            }
        });

    })
}

/**
 * Provisions a ticket from the ticket batch
 * @param payload
 * @returns {Promise}
 */
function provisionTicket(payload) {
    "use strict";
    let batchID = payload.batchID;
    let connection = payload.conn;

    return new Promise(function (resolve, reject) {

        connection.query('UPDATE TicketBatches SET TicketsRemaining = TicketsRemaining -1 WHERE ID = ?', [batchID], function (err, result) {
            if (err) {
                conn.rollback(function () {
                    return reject('Unknown Error');
                });
            }

            let payload = {conn: connection, batchID: batchID};
            return resolve(payload);


        });

    });

}

/**
 * Gets the number of remaining tickets in the supplied BatchID
 * @param payload
 * @returns {Promise}
 */
function getRemaningTickets(payload) {
    "use strict";
    let batchID = payload.batchID;
    let connection = payload.conn;

    return new Promise(function (resolve, reject) {
        connection.query('SELECT TicketsRemaining FROM TicketBatches WHERE ID = ?', [batchID], function (err, result) {
            if (err) {
                reject('Unknown Error');
            }

            let ticketsRemaing = result[0]['TicketsRemaining'];

            //Can only return one argument from a promise
            resolve({conn: connection, batchID: batchID, remainingTickets: ticketsRemaing});

        });

    });
}