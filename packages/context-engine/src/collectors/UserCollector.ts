import { IContextCollector } from '../interfaces/Collector';
import { UserContext } from '../interfaces/ContextTypes';

export class UserCollector implements IContextCollector<UserContext> {
  name = 'UserCollector';
  
  async collect(params: Record<string, any>): Promise<UserContext> {
    return {
      userId: params.userId || 'user_mock',
      roles: ['Professional']
    };
  }
}
