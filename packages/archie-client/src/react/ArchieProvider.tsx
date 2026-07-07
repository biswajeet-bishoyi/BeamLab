
import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { IArchieClient } from '../interfaces';
import { ArchieConversationState, ArchieMessage, ArchiePlanStep, ArchieExecutionTask } from '../types';

interface ArchieContextValue {
  client: IArchieClient;
  state: ArchieConversationState;
  messages: ArchieMessage[];
  plan: ArchiePlanStep[];
  execution: ArchieExecutionTask[];
}

const ArchieContext = createContext<ArchieContextValue | null>(null);

export const ArchieProvider: React.FC<{ client: IArchieClient, children: React.ReactNode }> = ({ client, children }) => {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    return client.subscribe(() => setTick(t => t + 1));
  }, [client]);

  const value = useMemo(() => ({
    client,
    state: client.getState(),
    messages: client.getMessages(),
    plan: client.getPlan(),
    execution: client.getExecution()
  }), [client, tick]);

  return <ArchieContext.Provider value={value}>{children}</ArchieContext.Provider>;
};

export const useArchie = () => {
  const ctx = useContext(ArchieContext);
  if (!ctx) throw new Error("useArchie must be used within an ArchieProvider");
  return ctx;
};
