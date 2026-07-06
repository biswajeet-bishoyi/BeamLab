"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const utils_1 = require("@beamlab/utils");
const PORT = process.env.PORT || 3000;
app_1.app.listen(PORT, () => {
    utils_1.logger.info(`API Gateway started on port ${PORT}`);
});
