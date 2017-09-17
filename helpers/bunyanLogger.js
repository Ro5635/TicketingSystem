/**
 *  Bunyan Logger
 */
const Logger = require('bunyan');

exports.getLogger =  new Logger({
    name: 'AstonHackTicketSystem',
    streams: [
        {
            level: 'debug',
            stream: process.stdout
        },
        {
            level: 'trace',
            path: 'Event.log'
        }
    ],
    // serializers: {
    //     req: Logger.stdSerializers.req,
    //     res: restify.bunyan.serializers.response,
    // },
});