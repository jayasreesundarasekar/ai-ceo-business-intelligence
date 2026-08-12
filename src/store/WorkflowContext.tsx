import { createContext, useContext, useReducer, useCallback, type ReactNode } from 'react';
import type { WorkflowResult, WorkflowContextType } from '../types';
import { runWorkflow } from '../lib/workflowEngine';

const WorkflowContext = createContext<WorkflowContextType | null>(null);

type Action =
  | { type: 'SET_PROCESSING'; payload: boolean }
  | { type: 'SET_WORKFLOW'; payload: WorkflowResult }
  | { type: 'RESET' };

interface State {
  workflow: WorkflowResult | null;
  isProcessing: boolean;
  workflows: WorkflowResult[];
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_PROCESSING':
      return { ...state, isProcessing: action.payload };
    case 'SET_WORKFLOW':
      return {
        ...state,
        workflow: action.payload,
        isProcessing: false,
        workflows: [action.payload, ...state.workflows],
      };
    case 'RESET':
      return { workflow: null, isProcessing: false, workflows: state.workflows };
    default:
      return state;
  }
}

export function WorkflowProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    workflow: null,
    isProcessing: false,
    workflows: [],
  });

  const triggerWorkflow = useCallback(async (slackMessage: string) => {
    dispatch({ type: 'SET_PROCESSING', payload: true });
    try {
      const result = await runWorkflow(slackMessage);
      dispatch({ type: 'SET_WORKFLOW', payload: result });
    } catch {
      dispatch({ type: 'SET_PROCESSING', payload: false });
    }
  }, []);

  const resetWorkflow = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  return (
    <WorkflowContext.Provider
      value={{
        workflow: state.workflow,
        isProcessing: state.isProcessing,
        triggerWorkflow,
        resetWorkflow,
        workflows: state.workflows,
      }}
    >
      {children}
    </WorkflowContext.Provider>
  );
}

export function useWorkflow(): WorkflowContextType {
  const ctx = useContext(WorkflowContext);
  if (!ctx) {
    throw new Error('useWorkflow must be used within a WorkflowProvider');
  }
  return ctx;
}
