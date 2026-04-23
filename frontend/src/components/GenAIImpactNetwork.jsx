import React from 'react';
import { motion } from 'framer-motion';
import { Activity, Cpu, Gauge, Pause, Pin, Play, RotateCcw, Sparkles } from 'lucide-react';

const STAGES = [
  { threshold: 0.08, label: 'Signal Capture', detail: 'Behavioral and journal features are normalized into numeric vectors.' },
  { threshold: 0.26, label: 'Feature Encoding', detail: 'Neural channels isolate patterns like stress, impulsivity, and sustained attention.' },
  { threshold: 0.5, label: 'Hybrid Fusion', detail: 'Behavioral and language channels are merged into risk-confidence states.' },
  { threshold: 0.72, label: 'Reasoning Layer', detail: 'Fused signals are translated into explainable pathways and likely outcomes.' },
  { threshold: 0.95, label: 'Clarity Lock', detail: 'Stable pathway map ready for Co-Pilot interpretation and action guidance.' },
];

const NODE_LAYER_LABELS = [
  'Input Layer',
  'Encoder Layer',
  'Fusion Layer',
  'Reasoning Layer',
  'Co-Pilot Layer',
];

const INPUT_NODE_META = [
  { label: 'Focus Difficulty', description: 'Higher value means more sustained-attention friction.' },
  { label: 'Hyperactivity', description: 'Represents restlessness and movement-drive signal.' },
  { label: 'Impulsiveness', description: 'Captures tendency for rapid unplanned actions.' },
  { label: 'Stress Load', description: 'Measures stress amplification on executive control.' },
  { label: 'Attention Drop', description: 'Inverse of attention-span strength.' },
  { label: 'Task Incompletion', description: 'Inverse of task follow-through consistency.' },
  { label: 'Base Confidence', description: 'Model confidence feed from current assessment context.' },
  { label: 'Scenario Delta', description: 'What-if intervention signal impact channel.' },
];

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const sigmoid = (value) => 1 / (1 + Math.exp(-value));

const hashString = (text) => {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return hash >>> 0;
};

const mulberry32 = (seed) => {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const stageForProgress = (progress) => {
  let active = STAGES[0];
  for (const stage of STAGES) {
    if (progress >= stage.threshold) {
      active = stage;
    }
  }
  return active;
};

const interpolateColor = (value) => {
  const t = clamp(value, 0, 1);
  const r = Math.round(120 + (34 - 120) * t);
  const g = Math.round(132 + (211 - 132) * t);
  const b = Math.round(153 + (238 - 153) * t);
  return `rgb(${r}, ${g}, ${b})`;
};

const layerThresholds = [0.02, 0.19, 0.39, 0.61, 0.82];
const edgeThresholds = [0.1, 0.3, 0.51, 0.72];

const layerGate = (layerIndex, progress) => {
  const start = layerThresholds[layerIndex] ?? 0;
  return clamp((progress - start) / 0.2, 0, 1);
};

const edgeGate = (edgeLayerIndex, progress) => {
  const start = edgeThresholds[edgeLayerIndex] ?? 0;
  return clamp((progress - start) / 0.18, 0, 1);
};

const makeNodeMeta = (layer, index) => {
  if (layer === 0) {
    return INPUT_NODE_META[index] || { label: `Input ${index + 1}`, description: 'Raw behavioral signal node.' };
  }
  if (layer === 1) {
    const names = ['Executive Control', 'Restlessness', 'Impulse Gate', 'Stress Amplifier', 'Attention Drift', 'Routine Loss', 'Affect Volatility', 'Cognitive Load', 'Control Instability', 'Context Memory'];
    const label = names[index] || `Encoder ${index + 1}`;
    return { label, description: 'Intermediate latent feature derived from multiple input channels.' };
  }
  if (layer === 2) {
    return { label: `Fusion Channel ${index + 1}`, description: 'Combines behavioral and optional language sub-signals.' };
  }
  if (layer === 3) {
    return { label: `Reasoning Path ${index + 1}`, description: 'Represents coherent explanation path before final output.' };
  }
  const outputLabels = ['Likelihood Output', 'Severity Output', 'Actionability Output'];
  return {
    label: outputLabels[index] || `Output ${index + 1}`,
    description: 'Final neural state consumed by the Co-Pilot explanation layer.',
  };
};

const parseTopDrivers = (result) => {
  const structured = result?.analysis_details?.driver_contributions;
  if (Array.isArray(structured) && structured.length > 0) {
    return structured
      .slice(0, 6)
      .map((item) => ({
        feature: item.feature || 'Unknown',
        impact: Number(item.impact || 0),
        direction: item.direction || 'risk',
      }));
  }

  const scores = result?.behavioral_scores || {};
  const fallback = [
    { feature: 'Focus Difficulty', impact: clamp((10 - Number(scores.focus_level || 5)) / 10, 0, 1), direction: 'risk' },
    { feature: 'Stress Load', impact: clamp((Number(scores.stress_level || 5)) / 10, 0, 1), direction: 'risk' },
    { feature: 'Hyperactivity', impact: clamp((Number(scores.hyperactivity || 5)) / 10, 0, 1), direction: 'risk' },
    { feature: 'Task Completion', impact: clamp((10 - Number(scores.task_completion || 5)) / 10, 0, 1), direction: 'risk' },
  ];
  return fallback;
};

const buildNetworkGraph = (result, copilotBrief, scenarioResult) => {
  const score = result?.behavioral_scores || {};
  const confidence = Number(result?.confidence ?? 0.5);
  const severity = (result?.severity || 'Mild').toLowerCase();
  const scenarioSignal = scenarioResult ? Math.abs(Number(scenarioResult.delta || 0)) * 1.2 : 0;
  const copilotSignal = copilotBrief ? (copilotBrief.source_mode === 'llm' ? 0.16 : 0.08) : 0.03;

  const inputVector = [
    clamp((10 - Number(score.focus_level ?? 5)) / 10, 0, 1),
    clamp(Number(score.hyperactivity ?? 5) / 10, 0, 1),
    clamp(Number(score.impulsiveness ?? 5) / 10, 0, 1),
    clamp(Number(score.stress_level ?? 5) / 10, 0, 1),
    clamp((10 - Number(score.attention_span ?? 5)) / 10, 0, 1),
    clamp((10 - Number(score.task_completion ?? 5)) / 10, 0, 1),
    clamp(confidence + copilotSignal, 0, 1),
    clamp(0.35 + scenarioSignal, 0, 1),
  ];

  const seed = hashString(JSON.stringify({ score, confidence, severity, scenarioSignal, copilotSignal }));
  const rng = mulberry32(seed);

  const layerSizes = [8, 10, 7, 5, 3];
  const width = 1060;
  const height = 320;
  const xPadding = 96;
  const yPadding = 58;

  const nodes = [];
  const layerNodes = [];
  for (let layer = 0; layer < layerSizes.length; layer += 1) {
    const ids = [];
    const x = xPadding + (layer * (width - xPadding * 2)) / (layerSizes.length - 1);
    const count = layerSizes[layer];
    for (let i = 0; i < count; i += 1) {
      const yBase = yPadding + ((i + 1) * (height - yPadding * 2)) / (count + 1);
      const jitter = (rng() - 0.5) * 24;
      const meta = makeNodeMeta(layer, i);
      const node = {
        id: `L${layer}_N${i}`,
        layer,
        index: i,
        x,
        y: yBase + jitter,
        label: meta.label,
        description: meta.description,
      };
      nodes.push(node);
      ids.push(node.id);
    }
    layerNodes.push(ids);
  }

  const edges = [];
  for (let layer = 0; layer < layerNodes.length - 1; layer += 1) {
    const sourceIds = layerNodes[layer];
    const targetIds = layerNodes[layer + 1];

    sourceIds.forEach((sourceId) => {
      let attached = 0;
      targetIds.forEach((targetId) => {
        const chance = layer === 0 ? 0.62 : 0.52;
        if (rng() < chance) {
          edges.push({
            id: `${sourceId}->${targetId}`,
            from: sourceId,
            to: targetId,
            layer,
            weight: (rng() * 2 - 1) * 1.3,
            pulsePhase: rng(),
            pulseSpeed: 0.8 + rng() * 1.45,
          });
          attached += 1;
        }
      });
      if (attached === 0) {
        const fallbackTarget = targetIds[Math.floor(rng() * targetIds.length)];
        edges.push({
          id: `${sourceId}->${fallbackTarget}`,
          from: sourceId,
          to: fallbackTarget,
          layer,
          weight: (rng() * 2 - 1) * 1.3,
          pulsePhase: rng(),
          pulseSpeed: 0.8 + rng() * 1.45,
        });
      }
    });
  }

  const nodeById = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const activations = {};
  layerNodes[0].forEach((id, index) => {
    activations[id] = inputVector[index] ?? 0.5;
  });

  for (let layer = 1; layer < layerNodes.length; layer += 1) {
    layerNodes[layer].forEach((nodeId) => {
      const incoming = edges.filter((edge) => edge.to === nodeId);
      const weighted = incoming.reduce((sum, edge) => sum + (activations[edge.from] || 0.5) * edge.weight, 0);
      const bias = (rng() - 0.5) * 0.55 + confidence * 0.35 + copilotSignal * 0.4;
      activations[nodeId] = sigmoid((weighted / Math.max(1, incoming.length)) * 2 + bias);
    });
  }

  const severityBias = { low: 0.2, mild: 0.35, moderate: 0.56, high: 0.78 };
  const finalIds = layerNodes[layerNodes.length - 1];
  if (finalIds.length >= 3) {
    activations[finalIds[0]] = clamp(activations[finalIds[0]] * 0.5 + confidence * 0.5, 0, 1);
    activations[finalIds[1]] = clamp(activations[finalIds[1]] * 0.45 + (severityBias[severity] ?? 0.35) * 0.55, 0, 1);
    activations[finalIds[2]] = clamp(activations[finalIds[2]] * 0.4 + copilotSignal * 1.6 + 0.18, 0, 1);
  }

  return { nodes, nodeById, edges, activations, layerNodes, width, height };
};

const GenAIImpactNetwork = ({ result, copilotBrief, scenarioResult }) => {
  const containerRef = React.useRef(null);
  const canvasRef = React.useRef(null);
  const progressRef = React.useRef(0);
  const hoveredNodeIdRef = React.useRef(null);
  const pinnedNodeIdRef = React.useRef(null);
  const layerFocusRef = React.useRef('all');
  const lastStatsUpdateRef = React.useRef(0);

  const [progress, setProgress] = React.useState(0);
  const [playing, setPlaying] = React.useState(true);
  const [speed, setSpeed] = React.useState(1);
  const [viewport, setViewport] = React.useState({ width: 980, height: 430 });
  const [hoveredNodeId, setHoveredNodeId] = React.useState(null);
  const [pinnedNodeId, setPinnedNodeId] = React.useState(null);
  const [layerFocus, setLayerFocus] = React.useState('all');
  const [networkStats, setNetworkStats] = React.useState({ synapses: 0, flux: 0 });

  const graph = React.useMemo(
    () => buildNetworkGraph(result, copilotBrief, scenarioResult),
    [result, copilotBrief, scenarioResult]
  );
  const topDrivers = React.useMemo(() => parseTopDrivers(result), [result]);

  const edgeMaps = React.useMemo(() => {
    const incoming = {};
    const outgoing = {};
    graph.edges.forEach((edge) => {
      if (!incoming[edge.to]) incoming[edge.to] = [];
      if (!outgoing[edge.from]) outgoing[edge.from] = [];
      incoming[edge.to].push(edge);
      outgoing[edge.from].push(edge);
    });
    return { incoming, outgoing };
  }, [graph]);

  React.useEffect(() => {
    progressRef.current = progress;
  }, [progress]);
  React.useEffect(() => {
    hoveredNodeIdRef.current = hoveredNodeId;
  }, [hoveredNodeId]);
  React.useEffect(() => {
    pinnedNodeIdRef.current = pinnedNodeId;
  }, [pinnedNodeId]);
  React.useEffect(() => {
    layerFocusRef.current = layerFocus;
  }, [layerFocus]);

  React.useEffect(() => {
    const element = containerRef.current;
    if (!element) return undefined;
    const resizeObserver = new ResizeObserver(() => {
      const rect = element.getBoundingClientRect();
      setViewport({
        width: Math.max(640, Math.floor(rect.width)),
        height: 320,
      });
    });
    resizeObserver.observe(element);
    return () => resizeObserver.disconnect();
  }, []);

  React.useEffect(() => {
    if (!playing) return undefined;
    const timer = setInterval(() => {
      setProgress((current) => {
        const next = clamp(current + 0.0065 * speed, 0, 1);
        if (next >= 1) setPlaying(false);
        return next;
      });
    }, 28);
    return () => clearInterval(timer);
  }, [playing, speed]);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    let rafId = 0;

    const draw = (timestamp) => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const logicalW = viewport.width;
      const logicalH = viewport.height;

      if (canvas.width !== Math.floor(logicalW * dpr) || canvas.height !== Math.floor(logicalH * dpr)) {
        canvas.width = Math.floor(logicalW * dpr);
        canvas.height = Math.floor(logicalH * dpr);
        canvas.style.width = `${logicalW}px`;
        canvas.style.height = `${logicalH}px`;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, logicalW, logicalH);

      const bg = ctx.createLinearGradient(0, 0, logicalW, logicalH);
      bg.addColorStop(0, '#ffffff');
      bg.addColorStop(0.55, '#f8fafc');
      bg.addColorStop(1, '#f1f5f9');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, logicalW, logicalH);

      const scaleX = logicalW / graph.width;
      const scaleY = logicalH / graph.height;
      const p = progressRef.current;
      const inspectedNodeId = pinnedNodeIdRef.current || hoveredNodeIdRef.current;
      const focus = layerFocusRef.current;

      ctx.save();
      ctx.strokeStyle = 'rgba(71, 85, 105, 0.25)';
      ctx.lineWidth = 1.2;
      for (let x = 38; x <= logicalW; x += 58) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, logicalH);
        ctx.stroke();
      }
      for (let y = 28; y <= logicalH; y += 50) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(logicalW, y);
        ctx.stroke();
      }
      ctx.restore();

      let activeSynapses = 0;
      let fluxAccumulator = 0;

      graph.edges.forEach((edge) => {
        const fromNode = graph.nodeById[edge.from];
        const toNode = graph.nodeById[edge.to];
        if (!fromNode || !toNode) return;

        const edgeInFocus =
          focus === 'all' ||
          edge.layer === focus ||
          edge.layer === focus - 1;
        if (!edgeInFocus) return;

        const gate = edgeGate(edge.layer, p);
        if (gate <= 0) return;

        const fromActivation = graph.activations[edge.from] || 0;
        const toActivation = graph.activations[edge.to] || 0;
        const edgeStrength = clamp((fromActivation * 0.6 + toActivation * 0.4) * gate, 0, 1);
        if (edgeStrength <= 0.02) return;

        const x1 = fromNode.x * scaleX;
        const y1 = fromNode.y * scaleY;
        const x2 = toNode.x * scaleX;
        const y2 = toNode.y * scaleY;

        const connectedToInspected = inspectedNodeId && (edge.from === inspectedNodeId || edge.to === inspectedNodeId);
        const alpha = connectedToInspected ? 0.9 : 0.06 + edgeStrength * 0.8;
        const lineWidth = connectedToInspected ? 2.8 : 0.7 + edgeStrength * 2.1;
        ctx.strokeStyle = connectedToInspected ? `rgba(125, 211, 252, ${alpha})` : `rgba(56, 189, 248, ${alpha})`;
        ctx.lineWidth = lineWidth;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        if (edgeStrength > 0.42) activeSynapses += 1;
        fluxAccumulator += edgeStrength;

        if (edgeStrength > 0.38 && gate > 0.42) {
          const t = ((timestamp * 0.00034 * edge.pulseSpeed * speed) + edge.pulsePhase) % 1;
          const pulseX = x1 + (x2 - x1) * t;
          const pulseY = y1 + (y2 - y1) * t;
          const pulseSize = connectedToInspected ? 3.1 : 1.5 + edgeStrength * 1.7;
          ctx.beginPath();
          ctx.fillStyle = connectedToInspected ? 'rgba(186,230,253,0.95)' : `rgba(103, 232, 249, ${0.54 + edgeStrength * 0.3})`;
          ctx.shadowBlur = connectedToInspected ? 16 : 8 + edgeStrength * 14;
          ctx.shadowColor = connectedToInspected ? 'rgba(125,211,252,0.92)' : 'rgba(34, 211, 238, 0.62)';
          ctx.arc(pulseX, pulseY, pulseSize, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      });

      graph.nodes.forEach((node) => {
        const nodeActivation = graph.activations[node.id] || 0;
        const gate = layerGate(node.layer, p);
        const inFocus = focus === 'all' || node.layer === focus;
        const intensity = clamp(nodeActivation * gate * (inFocus ? 1 : 0.35), 0, 1);
        const x = node.x * scaleX;
        const y = node.y * scaleY;
        const radius = 3 + intensity * 7.2;
        const isHovered = node.id === hoveredNodeIdRef.current;
        const isPinned = node.id === pinnedNodeIdRef.current;
        const isInspected = isHovered || isPinned;
        const color = interpolateColor(intensity);

        ctx.beginPath();
        ctx.fillStyle = color;
        ctx.shadowBlur = isInspected ? 26 : 8 + intensity * 22;
        ctx.shadowColor = isInspected ? 'rgba(186,230,253,0.95)' : 'rgba(56, 189, 248, 0.85)';
        ctx.arc(x, y, isInspected ? radius + 1.7 : radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        if (isInspected) {
          ctx.beginPath();
          ctx.lineWidth = 2.1;
          ctx.strokeStyle = isPinned ? 'rgba(186,230,253,0.96)' : 'rgba(125,211,252,0.88)';
          ctx.arc(x, y, radius + 5.2, 0, Math.PI * 2);
          ctx.stroke();
        }
      });

      ctx.save();
      ctx.fillStyle = 'rgba(226, 232, 240, 0.76)';
      ctx.font = '900 10px Outfit, sans-serif';
      ctx.textAlign = 'center';
      NODE_LAYER_LABELS.forEach((label, index) => {
        const x = (96 + (index * (graph.width - 192)) / (NODE_LAYER_LABELS.length - 1)) * scaleX;
        ctx.fillText(label.toUpperCase(), x, logicalH - 10);
      });
      ctx.restore();

      const flux = clamp((fluxAccumulator / Math.max(1, graph.edges.length)) * 100, 0, 100);
      if (timestamp - lastStatsUpdateRef.current > 130) {
        lastStatsUpdateRef.current = timestamp;
        setNetworkStats({
          synapses: activeSynapses,
          flux: Number(flux.toFixed(1)),
        });
      }

      rafId = requestAnimationFrame(draw);
    };

    rafId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafId);
  }, [graph, speed, viewport]);

  const onCanvasMove = (event) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * graph.width;
    const y = ((event.clientY - rect.top) / rect.height) * graph.height;

    let nearest = null;
    let minDistance = Infinity;
    graph.nodes.forEach((node) => {
      const dx = node.x - x;
      const dy = node.y - y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < 18 && distance < minDistance) {
        nearest = node;
        minDistance = distance;
      }
    });
    setHoveredNodeId(nearest ? nearest.id : null);
  };

  const onCanvasClick = () => {
    if (!hoveredNodeId) {
      setPinnedNodeId(null);
      return;
    }
    setPinnedNodeId((current) => (current === hoveredNodeId ? null : hoveredNodeId));
  };

  const activeStage = stageForProgress(progress);
  const confidencePct = Math.round((Number(result?.confidence ?? 0.5)) * 100);
  const copilotBoost = copilotBrief ? (copilotBrief.source_mode === 'llm' ? 18 : 11) : 5;
  const scenarioBoost = scenarioResult ? 9 : 0;
  const clarityIndex = clamp(Math.round(confidencePct * 0.64 + copilotBoost + scenarioBoost), 0, 100);

  const inspectedNodeId = pinnedNodeId || hoveredNodeId;
  const inspectedNode = inspectedNodeId ? graph.nodeById[inspectedNodeId] : null;
  const incomingCount = inspectedNode ? (edgeMaps.incoming[inspectedNode.id]?.length || 0) : 0;
  const outgoingCount = inspectedNode ? (edgeMaps.outgoing[inspectedNode.id]?.length || 0) : 0;
  const inspectedActivation = inspectedNode ? graph.activations[inspectedNode.id] || 0 : null;

  return (
    <div className="rounded-[2.4rem] border border-slate-200 bg-white shadow-[0_18px_50px_-30px_rgba(0,0,0,0.05)] p-7 md:p-9 space-y-7 text-slate-900">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
        <div className="space-y-2 max-w-3xl">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-600">GenAI Impact Lab</p>
          <h3 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Interactive Neural Reasoning Map</h3>
          <p className="text-sm text-slate-600">
            Hover or click any node to inspect what it means, how strong it is, and which flows it controls for the current user input.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setPlaying((value) => !value)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-widest text-indigo-600 hover:bg-indigo-50/50 transition-colors"
          >
            {playing ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            {playing ? 'Pause' : 'Play'}
          </button>
          <button
            onClick={() => {
              setProgress(0);
              setPlaying(true);
              setPinnedNodeId(null);
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-widest text-indigo-600 hover:bg-indigo-50/50 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <LayerButton label="All Layers" active={layerFocus === 'all'} onClick={() => setLayerFocus('all')} />
        {NODE_LAYER_LABELS.map((label, idx) => (
          <LayerButton
            key={label}
            label={label}
            active={layerFocus === idx}
            onClick={() => setLayerFocus(idx)}
          />
        ))}
      </div>

      <div
        ref={containerRef}
        className="rounded-[2rem] border border-slate-200 bg-white overflow-hidden p-3 md:p-4"
      >
        <canvas
          ref={canvasRef}
          className="w-full h-[320px] block rounded-[1.3rem] cursor-crosshair"
          onMouseMove={onCanvasMove}
          onMouseLeave={() => setHoveredNodeId(null)}
          onClick={onCanvasClick}
        />
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <MetricCard icon={<Cpu className="w-4 h-4 text-indigo-600" />} label="Active Synapses" value={String(networkStats.synapses)} help="Strong connections currently propagating signal" />
        <MetricCard icon={<Activity className="w-4 h-4 text-indigo-600" />} label="Signal Flux" value={`${networkStats.flux.toFixed(1)}%`} help="Normalized throughput across active pathways" />
        <MetricCard icon={<Gauge className="w-4 h-4 text-indigo-600" />} label="Clarity Index" value={`${clarityIndex}%`} help="Confidence weighted by Co-Pilot and scenario effects" />
        <MetricCard
          icon={<Sparkles className="w-4 h-4 text-indigo-600" />}
          label="Co-Pilot Mode"
          value={copilotBrief ? copilotBrief.source_mode.toUpperCase() : 'PENDING'}
          help={copilotBrief ? 'Explanation stream active' : 'Generate Co-Pilot brief to activate'}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-indigo-50/50 px-5 py-4">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">Inference Stage</p>
          <p className="text-xl font-black text-slate-900 mt-1">{activeStage.label}</p>
          <p className="text-sm text-slate-600 mt-1">{activeStage.detail}</p>
          <div className="mt-4 h-2 rounded-full bg-slate-200 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-amber-700 via-blue-500 to-cyan-400"
              animate={{ width: `${Math.round(progress * 100)}%` }}
              transition={{ type: 'spring', stiffness: 230, damping: 28 }}
            />
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
            <span>Progress: <span className="font-black text-slate-900">{Math.round(progress * 100)}%</span></span>
            <span>Confidence feed: <span className="font-black text-slate-900">{confidencePct}%</span></span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-indigo-50/50 px-5 py-4 space-y-3">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">Speed Control</p>
          <div className="flex gap-2">
            <SpeedButton speed={speed} value={0.75} onClick={setSpeed} />
            <SpeedButton speed={speed} value={1} onClick={setSpeed} />
            <SpeedButton speed={speed} value={1.35} onClick={setSpeed} />
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={Math.round(progress * 100)}
            onChange={(event) => {
              setPlaying(false);
              setProgress(Number(event.target.value) / 100);
            }}
            className="w-full h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer accent-amber-800"
          />
          <p className="text-xs text-slate-500">
            Click a node to pin it. Click empty canvas to unpin.
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600">Node Inspector</p>
          {!inspectedNode ? (
            <p className="text-sm text-slate-600 mt-2">
              Hover or click any node in the network to inspect meaning, activation strength, and connected pathways.
            </p>
          ) : (
            <div className="mt-2 space-y-2">
              <p className="text-lg font-black text-slate-900 flex items-center gap-2">
                {pinnedNodeId ? <Pin className="w-4 h-4 text-indigo-600" /> : null}
                {inspectedNode.label}
              </p>
              <p className="text-sm text-slate-600">{inspectedNode.description}</p>
              <div className="grid grid-cols-3 gap-2 pt-1">
                <MiniStat label="Layer" value={NODE_LAYER_LABELS[inspectedNode.layer]} />
                <MiniStat label="Activation" value={`${Math.round((inspectedActivation || 0) * 100)}%`} />
                <MiniStat label="Flow" value={`${incomingCount} in / ${outgoingCount} out`} />
              </div>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600">Top Drivers From Current Input</p>
          <div className="mt-2 space-y-3">
            {topDrivers.map((driver) => (
              <div key={driver.feature}>
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-900">{driver.feature}</span>
                  <span className={`font-black ${driver.direction === 'risk' ? 'text-rose-500' : 'text-slate-600'}`}>
                    {(driver.impact * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className={`h-full ${driver.direction === 'risk' ? 'bg-rose-400' : 'bg-emerald-400'}`}
                    style={{ width: `${clamp(driver.impact * 100 * 2.4, 4, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const LayerButton = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-widest border transition-colors ${
      active
        ? 'bg-indigo-600 text-white border-amber-800'
        : 'bg-white text-slate-500 border-slate-200 hover:bg-indigo-50/50'
    }`}
  >
    {label}
  </button>
);

const SpeedButton = ({ speed, value, onClick }) => (
  <button
    onClick={() => onClick(value)}
    className={`rounded-lg px-3 py-1.5 text-[11px] font-black uppercase tracking-widest border ${
      speed === value
        ? 'bg-indigo-600 text-white border-amber-800'
        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
    }`}
  >
    {value.toFixed(2)}x
  </button>
);

const MetricCard = ({ icon, label, value, help }) => (
  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
    <div className="flex items-center justify-between">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600">{label}</p>
      {icon}
    </div>
    <p className="mt-2 text-xl font-black text-slate-900">{value}</p>
    <p className="mt-1 text-xs text-slate-600">{help}</p>
  </div>
);

const MiniStat = ({ label, value }) => (
  <div className="rounded-xl bg-indigo-50/50 border border-slate-200 px-3 py-2">
    <p className="text-[10px] font-black uppercase tracking-[0.15em] text-indigo-600">{label}</p>
    <p className="text-xs font-black text-slate-900 mt-1">{value}</p>
  </div>
);

export default GenAIImpactNetwork;
