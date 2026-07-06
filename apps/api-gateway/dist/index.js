"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var app_1 = require("./app");
var utils_1 = require("@beamlab/utils");
var PORT = process.env.PORT || 3000;
app_1.app.listen(PORT, function () {
    utils_1.logger.info("API Gateway started on port ".concat(PORT));
});
