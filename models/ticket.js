/**
 * Ticket Model
 *
 *
 *
 */

const uuid = require('node-uuid');

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
        payload.conn.query('INSERT INTO Tickets (ID, AllocationDate, State, BatchID) VALUES(? , NOW(), "provisioned", ?);', [ticketID, payload.batchID],
            function (err, result) {

                if (err) {
                    reject(err);

                }
                payload.ticketID = ticketID;
                resolve(payload);

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

        //Build teh payload for passing down the promise chain
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