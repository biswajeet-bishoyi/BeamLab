"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
var express_1 = __importDefault(require("express"));
var cors_1 = __importDefault(require("cors"));
var helmet_1 = __importDefault(require("helmet"));
var pino_http_1 = __importDefault(require("pino-http"));
var utils_1 = require("@beamlab/utils");
var errorHandler_1 = require("./middleware/errorHandler");
exports.app = (0, express_1.default)();
exports.app.use((0, helmet_1.default)());
exports.app.use((0, cors_1.default)());
exports.app.use(express_1.default.json());
exports.app.use((0, pino_http_1.default)({
    logger: utils_1.logger,
    autoLogging: {
        ignore: function (req) { return req.url === '/health'; }
    }
}));
exports.app.get('/health', function (req, res) {
    res.status(200).json({ status: 'ok' });
});
// 404 Handler
exports.app.use(function (req, res) {
    res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'Route not found' });
});
exports.app.use(errorHandler_1.errorHandler);
