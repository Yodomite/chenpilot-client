'use client';

import React, { useState } from 'react';
import type { ExecutionTrace, ExecutionStep } from '@/types';
import { ChevronDown, ChevronRight, Brain, Zap, Wrench, CheckCircle, XCircle, Clock, Cpu } from 'lucide-react';

interface ExecutionTraceProps {
  trace: ExecutionTrace;
}

export default function ExecutionTrace({ trace }: ExecutionTraceProps) {
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleStep = (stepId: string) => {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(stepId)) {
      newExpanded.delete(stepId);
    } else {
      newExpanded.add(stepId);
    }
    setExpandedSteps(newExpanded);
  };

  const getStepIcon = (type: ExecutionStep['type']) => {
    switch (type) {
      case 'thought':
        return <Brain className="h-4 w-4 text-purple-400" />;
      case 'action':
        return <Zap className="h-4 w-4 text-blue-400" />;
      case 'tool_call':
        return <Wrench className="h-4 w-4 text-orange-400" />;
      case 'result':
        return <CheckCircle className="h-4 w-4 text-green-400" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-400" />;
      default:
        return <Cpu className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStepColor = (type: ExecutionStep['type']) => {
    switch (type) {
      case 'thought':
        return 'border-purple-500/30 bg-purple-500/10';
      case 'action':
        return 'border-blue-500/30 bg-blue-500/10';
      case 'tool_call':
        return 'border-orange-500/30 bg-orange-500/10';
      case 'result':
        return 'border-green-500/30 bg-green-500/10';
      case 'error':
        return 'border-red-500/30 bg-red-500/10';
      default:
        return 'border-gray-500/30 bg-gray-500/10';
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const renderStep = (step: ExecutionStep, depth: number = 0) => {
    const isStepExpanded = expandedSteps.has(step.id);
    const hasSubsteps = step.substeps && step.substeps.length > 0;

    return (
      <div key={step.id} className={`${depth > 0 ? 'ml-6' : ''}`}>
        <div 
          className={`border rounded-lg p-3 mb-2 cursor-pointer transition-all hover:shadow-md ${getStepColor(step.type)}`}
          onClick={() => hasSubsteps && toggleStep(step.id)}
        >
          <div className="flex items-start gap-3">
            <div className="flex items-center gap-2 flex-1">
              {hasSubsteps && (
                <span className="text-gray-400">
                  {isStepExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </span>
              )}
              {getStepIcon(step.type)}
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-white text-sm">{step.name}</h4>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <Clock className="h-3 w-3" />
                    <span>{formatDuration(step.duration)}</span>
                  </div>
                </div>
                <p className="text-gray-300 text-sm mt-1">{step.description}</p>
              </div>
            </div>
          </div>

          {/* Step Details */}
          {step.details && (
            <div className="mt-3 p-2 bg-black/20 rounded text-xs">
              <pre className="text-gray-300 whitespace-pre-wrap">
                {typeof step.details === 'string' 
                  ? step.details 
                  : JSON.stringify(step.details, null, 2)
                }
              </pre>
            </div>
          )}
        </div>

        {/* Substeps */}
        {hasSubsteps && isStepExpanded && (
          <div className="mt-2">
            {step.substeps!.map(substep => renderStep(substep, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (!trace || !trace.steps || trace.steps.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 border border-gray-700 rounded-lg overflow-hidden">
      {/* Header */}
      <div 
        className="bg-gray-800/50 px-4 py-3 cursor-pointer hover:bg-gray-800/70 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4 text-blue-400" />
            <span className="text-sm font-medium text-white">Execution Trace</span>
            <span className="text-xs text-gray-400">({trace.steps.length} steps)</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <Clock className="h-3 w-3" />
              <span>{formatDuration(trace.totalTime)}</span>
            </div>
            <ChevronDown 
              className={`h-4 w-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
            />
          </div>
        </div>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="p-4 bg-gray-900/30 max-h-96 overflow-y-auto">
          {/* Summary */}
          <div className="mb-4 p-3 bg-gray-800/50 rounded-lg">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Start Time:</span>
                <span className="text-white ml-2">
                  {new Date(trace.startTime).toLocaleTimeString()}
                </span>
              </div>
              <div>
                <span className="text-gray-400">End Time:</span>
                <span className="text-white ml-2">
                  {new Date(trace.endTime).toLocaleTimeString()}
                </span>
              </div>
              <div>
                <span className="text-gray-400">Total Duration:</span>
                <span className="text-white ml-2">{formatDuration(trace.totalTime)}</span>
              </div>
              <div>
                <span className="text-gray-400">Steps:</span>
                <span className="text-white ml-2">{trace.steps.length}</span>
              </div>
            </div>
          </div>

          {/* Steps */}
          <div className="space-y-2">
            {trace.steps.map(step => renderStep(step))}
          </div>
        </div>
      )}
    </div>
  );
}
