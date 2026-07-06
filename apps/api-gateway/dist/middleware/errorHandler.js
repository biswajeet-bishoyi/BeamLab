"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
var utils_1 = require("@beamlab/utils");
function errorHandler(err, req, res, next) {
    if (err instanceof utils_1.AppError) {
        res.status(err.statusCode).json({
            success: false,
            error: err.errorCode,
            message: err.message,
        });
        return;
    }
    // Unhandled internal errors
    utils_1.logger.error(err, 'Unhandled Exception');
    var internal = new utils_1.InternalError();
    res.status(internal.statusCode).json({
        success: false,
        error: internal.errorCode,
        message: internal.message,
    });
}
