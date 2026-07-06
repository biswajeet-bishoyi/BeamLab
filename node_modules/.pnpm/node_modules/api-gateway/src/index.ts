import { app } from './app';
import { logger } from '@beamlab/utils';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  logger.info(`API Gateway started on port ${PORT}`);
});
