import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { TaskPlan, TaskStep, TaskActionType } from '../../core/types/taskTree';

interface ReasoningTreeProps {
  plan: TaskPlan;
  onExecute: (plan: TaskPlan) => void;
  onRevalidate: (plan: TaskPlan) => Promise<boolean>;
}

export const ReasoningTree: React.FC<ReasoningTreeProps> = ({ plan, onExecute, onRevalidate }) => {
  const [steps, setSteps] = useState<TaskStep[]>(plan.steps);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const [isValid, setIsValid] = useState(true);
  
  // Realtime execution states tracking could be done here via IPC listeners, 
  // but for now we rely on the parent or we just show the state provided in the prop

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    
    const items = Array.from(steps);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setSteps(items);
    setIsValid(false); // require revalidation after reorder
  };

  const handleDelete = (id: string) => {
    setSteps(steps.filter(s => s.id !== id));
    setIsValid(false);
  };

  const handleUpdate = (id: string, newDesc: string) => {
    setSteps(steps.map(s => s.id === id ? { ...s, description: newDesc } : s));
    setIsEditing(null);
  };

  const handleAdd = (index: number) => {
    const newStep: TaskStep = {
      id: `step-manual-${Date.now()}`,
      description: 'Langkah baru',
      actionType: 'LOGIC',
      dependencies: [],
      status: 'PENDING'
    };
    const items = Array.from(steps);
    items.splice(index + 1, 0, newStep);
    setSteps(items);
    setIsValid(false);
  };

  const handleValidation = async () => {
    setValidating(true);
    const updatedPlan = { ...plan, steps };
    const ok = await onRevalidate(updatedPlan);
    setIsValid(ok);
    setValidating(false);
    if (!ok) {
      alert("Urutan tidak valid menurut LLM, harap periksa dependensi!");
    }
  };

  const handleExecuteClick = () => {
    onExecute({ ...plan, steps });
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'RUNNING': return 'bg-blue-500 animate-pulse';
      case 'COMPLETED': return 'bg-green-500';
      case 'FAILED': return 'bg-red-500';
      default: return 'bg-gray-600';
    }
  };

  return (
    <div className="p-4 bg-gray-900 rounded-lg shadow-lg">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-white font-bold text-lg">Reasoning Tree</h3>
        <span className="text-xs text-gray-400 truncate w-32" title={plan.originalInstruction}>
          {plan.originalInstruction}
        </span>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="steps">
          {(provided) => (
            <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
              {steps.map((step, index) => (
                <Draggable key={step.id} draggableId={step.id} index={index}>
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className="bg-gray-800 border border-gray-700 p-3 rounded flex flex-col gap-2 relative"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2" {...provided.dragHandleProps}>
                          <span className="text-gray-500 cursor-grab">⋮⋮</span>
                          <span className={`w-3 h-3 rounded-full ${getStatusColor(step.status)}`}></span>
                          
                          {isEditing === step.id ? (
                            <input
                              className="bg-gray-700 text-white text-sm px-2 py-1 rounded w-full outline-none"
                              defaultValue={step.description}
                              onBlur={(e) => handleUpdate(step.id, e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleUpdate(step.id, e.currentTarget.value)}
                              autoFocus
                            />
                          ) : (
                            <span className="text-sm text-gray-200">{step.description}</span>
                          )}
                        </div>
                        
                        <div className="flex gap-2">
                          <button onClick={() => setIsEditing(step.id)} className="text-blue-400 text-xs hover:text-blue-300">Edit</button>
                          <button onClick={() => handleDelete(step.id)} className="text-red-400 text-xs hover:text-red-300">X</button>
                        </div>
                      </div>

                      <div className="flex gap-2 items-center pl-8">
                        <span className="text-xs font-mono text-pink-400 bg-gray-900 px-1 rounded">{step.actionType}</span>
                        {step.targetPredict && <span className="text-xs text-gray-500 truncate max-w-xs">{step.targetPredict}</span>}
                      </div>

                      {/* Add button below */}
                      <button 
                        onClick={() => handleAdd(index)}
                        className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 opacity-0 hover:opacity-100 bg-green-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center shadow-lg transition-opacity"
                        title="Tambah langkah sisipan"
                      >
                        +
                      </button>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      <div className="mt-6 flex justify-end gap-3">
        {!isValid && (
          <button 
            onClick={handleValidation}
            disabled={validating}
            className="px-4 py-2 bg-yellow-600 text-white text-sm font-semibold rounded hover:bg-yellow-500 transition disabled:opacity-50"
          >
            {validating ? 'Memvalidasi...' : 'Re-Validate'}
          </button>
        )}
        <button 
          onClick={handleExecuteClick}
          disabled={!isValid || steps.length === 0}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded hover:bg-blue-500 transition disabled:opacity-50"
        >
          Jalankan Tugas
        </button>
      </div>
    </div>
  );
};
