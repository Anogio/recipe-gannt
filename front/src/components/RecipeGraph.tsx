"use client";

import React, { useMemo, useRef, useState } from "react";
import styles from "@/app/page.module.css";
import { PlannedStep } from "@/types";

interface RecipeGraphProps {
  steps: PlannedStep[];
  completedSteps: ReadonlySet<string>;
  onToggleStep: (stepId: string) => void;
}

interface PositionedNode {
  step: PlannedStep;
  x: number;
  y: number;
  height: number;
  titleLines: string[];
  ingredientLines: string[];
  status: "completed" | "ready" | "blocked";
}

const NODE_WIDTH = 220;
const COLUMN_GAP = 24;
const ROW_GAP = 26;
const HORIZONTAL_PADDING = 28;
const TOP_PADDING = 6;
const BOTTOM_PADDING = 18;
const MAX_CHARS_PER_LINE = 28;
const TEXT_LINE_HEIGHT = 13;
const MIN_NODE_HEIGHT = 78;
const TITLE_TOP_PADDING = 14;
const TITLE_BASELINE_OFFSET = 9;
const INGREDIENT_GAP = 8;

function splitLongWord(word: string, maxCharsPerLine: number): string[] {
  if (word.length <= maxCharsPerLine) return [word];

  const chunks: string[] = [];
  for (let i = 0; i < word.length; i += maxCharsPerLine) {
    chunks.push(word.slice(i, i + maxCharsPerLine));
  }
  return chunks;
}

function wrapText(text: string, maxCharsPerLine: number): string[] {
  const rawWords = text.trim().split(/\s+/).filter(Boolean);
  if (rawWords.length === 0) return [""];

  const words = rawWords.flatMap((word) => splitLongWord(word, maxCharsPerLine));
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const candidate = currentLine ? `${currentLine} ${word}` : word;
    if (candidate.length <= maxCharsPerLine) {
      currentLine = candidate;
      continue;
    }

    if (currentLine) lines.push(currentLine);
    currentLine = word;
  }

  if (currentLine) lines.push(currentLine);
  return lines;
}

function getNodeHeight(
  titleLineCount: number,
  ingredientLineCount: number,
  hasTimer: boolean
): number {
  const titleHeight = Math.max(1, titleLineCount) * TEXT_LINE_HEIGHT;
  const ingredientHeight = Math.max(0, ingredientLineCount) * TEXT_LINE_HEIGHT;
  const ingredientBlockGap = ingredientLineCount > 0 ? INGREDIENT_GAP : 0;
  const timerBlockHeight = hasTimer ? 20 : 0;
  const computedHeight =
    TITLE_TOP_PADDING +
    titleHeight +
    ingredientBlockGap +
    ingredientHeight +
    12 +
    timerBlockHeight;
  return Math.max(MIN_NODE_HEIGHT, computedHeight);
}

export function RecipeGraph({
  steps,
  completedSteps,
  onToggleStep,
}: RecipeGraphProps) {
  const [tooltip, setTooltip] = useState<{
    step: PlannedStep;
    x: number;
    y: number;
  } | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const panStateRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startScrollLeft: number;
    startScrollTop: number;
    hasDragged: boolean;
    isCaptured: boolean;
  } | null>(null);
  const suppressClickUntilRef = useRef(0);

  const graph = useMemo(() => {
    const stepMap = new Map(steps.map((step) => [step.step_id, step]));
    const indegree = new Map<string, number>();
    const children = new Map<string, string[]>();

    for (const step of steps) {
      indegree.set(step.step_id, 0);
      children.set(step.step_id, []);
    }

    for (const step of steps) {
      for (const depId of step.dependencies) {
        if (!stepMap.has(depId)) continue;
        indegree.set(step.step_id, (indegree.get(step.step_id) ?? 0) + 1);
        children.get(depId)?.push(step.step_id);
      }
    }

    const queue: string[] = [];
    for (const [stepId, value] of indegree.entries()) {
      if (value === 0) queue.push(stepId);
    }

    const levelById = new Map<string, number>();
    for (const rootId of queue) levelById.set(rootId, 0);

    const processed = new Set<string>();
    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) continue;
      processed.add(current);
      const currentLevel = levelById.get(current) ?? 0;

      for (const childId of children.get(current) ?? []) {
        const nextLevel = currentLevel + 1;
        levelById.set(childId, Math.max(levelById.get(childId) ?? 0, nextLevel));

        const nextIndegree = (indegree.get(childId) ?? 0) - 1;
        indegree.set(childId, nextIndegree);
        if (nextIndegree === 0) queue.push(childId);
      }
    }

    for (const step of steps) {
      if (!processed.has(step.step_id) || !levelById.has(step.step_id)) {
        const maxKnown = Math.max(0, ...Array.from(levelById.values()));
        levelById.set(step.step_id, maxKnown + 1);
      }
    }

    const levels = new Map<number, PlannedStep[]>();
    for (const step of steps) {
      const level = levelById.get(step.step_id) ?? 0;
      const list = levels.get(level) ?? [];
      list.push(step);
      levels.set(level, list);
    }

    const sortedLevels = Array.from(levels.entries()).sort((a, b) => a[0] - b[0]);

    let maxCols = 0;
    for (const [, nodes] of sortedLevels) {
      maxCols = Math.max(maxCols, nodes.length);
    }

    const rowHeights = sortedLevels.map(([, levelSteps]) => {
      let rowMax = MIN_NODE_HEIGHT;
      for (const step of levelSteps) {
        const titleLines = wrapText(step.step_name, MAX_CHARS_PER_LINE);
        const ingredientsText = step.ingredients?.join(", ") ?? "";
        const ingredientLines = ingredientsText
          ? wrapText(ingredientsText, MAX_CHARS_PER_LINE)
          : [];
        const nodeHeight = getNodeHeight(
          titleLines.length,
          ingredientLines.length,
          Boolean(step.duration_minute)
        );
        rowMax = Math.max(rowMax, nodeHeight);
      }
      return rowMax;
    });

    const rowYPositions: number[] = [];
    let currentY = TOP_PADDING;
    for (const rowHeight of rowHeights) {
      rowYPositions.push(currentY);
      currentY += rowHeight + ROW_GAP;
    }

    const totalGridWidth =
      (maxCols || 1) * NODE_WIDTH + Math.max(0, (maxCols || 1) - 1) * COLUMN_GAP;

    const positionedNodes: PositionedNode[] = [];
    for (const [rowIndex, [, levelSteps]] of sortedLevels.entries()) {
      const rowWidth =
        levelSteps.length * NODE_WIDTH + Math.max(0, levelSteps.length - 1) * COLUMN_GAP;
      const leftOffset = (totalGridWidth - rowWidth) / 2;
      const rowTop = rowYPositions[rowIndex];

      for (const [columnIndex, step] of levelSteps.entries()) {
        const depsDone = step.dependencies.every((dep) => completedSteps.has(dep));
        const status = completedSteps.has(step.step_id)
          ? "completed"
          : depsDone
            ? "ready"
            : "blocked";

        const titleLines = wrapText(step.step_name, MAX_CHARS_PER_LINE);
        const ingredientsText = step.ingredients?.join(", ") ?? "";
        const ingredientLines = ingredientsText
          ? wrapText(ingredientsText, MAX_CHARS_PER_LINE)
          : [];
        const nodeHeight = getNodeHeight(
          titleLines.length,
          ingredientLines.length,
          Boolean(step.duration_minute)
        );

        positionedNodes.push({
          step,
          x:
            HORIZONTAL_PADDING +
            leftOffset +
            columnIndex * (NODE_WIDTH + COLUMN_GAP),
          y: rowTop,
          height: nodeHeight,
          titleLines,
          ingredientLines,
          status,
        });
      }
    }

    const nodeById = new Map(positionedNodes.map((node) => [node.step.step_id, node]));
    const edges: Array<{ from: PositionedNode; to: PositionedNode }> = [];

    for (const node of positionedNodes) {
      for (const depId of node.step.dependencies) {
        const from = nodeById.get(depId);
        if (!from) continue;
        edges.push({ from, to: node });
      }
    }

    const width = totalGridWidth + HORIZONTAL_PADDING * 2;
    const height =
      rowHeights.reduce((sum, rowHeight) => sum + rowHeight, 0) +
      Math.max(0, rowHeights.length - 1) * ROW_GAP +
      TOP_PADDING +
      BOTTOM_PADDING;

    return {
      nodes: positionedNodes,
      edges,
      width,
      height,
    };
  }, [steps, completedSteps]);

  if (steps.length === 0) return null;

  return (
    <section className={styles.graphContainer}>
      <p className={styles.graphSubtitle}>
        Click a step to mark it as completed
      </p>
      <div className={styles.graphLegend}>
        <span>
          <i className={`${styles.legendDot} ${styles.legendCompleted}`} />
          Completed
        </span>
        <span>
          <i className={`${styles.legendDot} ${styles.legendReady}`} />
          Now
        </span>
        <span>
          <i className={`${styles.legendDot} ${styles.legendBlocked}`} />
          Next up
        </span>
      </div>

      <div
        ref={viewportRef}
        className={`${styles.graphViewport} ${isPanning ? styles.graphViewportDragging : ""}`}
        onPointerDown={(event) => {
          if (!viewportRef.current) return;
          panStateRef.current = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            startScrollLeft: viewportRef.current.scrollLeft,
            startScrollTop: viewportRef.current.scrollTop,
            hasDragged: false,
            isCaptured: false,
          };
        }}
        onPointerMove={(event) => {
          const panState = panStateRef.current;
          if (!panState || !viewportRef.current || panState.pointerId !== event.pointerId) {
            return;
          }

          const deltaX = event.clientX - panState.startX;
          const deltaY = event.clientY - panState.startY;
          if (!panState.hasDragged && (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3)) {
            panState.hasDragged = true;
            panState.isCaptured = true;
            setIsPanning(true);
            viewportRef.current.setPointerCapture(event.pointerId);
          }

          if (!panState.hasDragged) return;

          viewportRef.current.scrollLeft = panState.startScrollLeft - deltaX;
          viewportRef.current.scrollTop = panState.startScrollTop - deltaY;
          event.preventDefault();
        }}
        onPointerUp={(event) => {
          const panState = panStateRef.current;
          if (!panState || !viewportRef.current || panState.pointerId !== event.pointerId) {
            return;
          }
          if (panState.hasDragged) {
            suppressClickUntilRef.current = Date.now() + 180;
          }
          panStateRef.current = null;
          setIsPanning(false);
          if (panState.isCaptured && viewportRef.current.hasPointerCapture(event.pointerId)) {
            viewportRef.current.releasePointerCapture(event.pointerId);
          }
        }}
        onPointerCancel={(event) => {
          panStateRef.current = null;
          setIsPanning(false);
          if (viewportRef.current?.hasPointerCapture(event.pointerId)) {
            viewportRef.current.releasePointerCapture(event.pointerId);
          }
        }}
      >
        <svg
          className={styles.graphSvg}
          viewBox={`0 0 ${graph.width} ${graph.height}`}
          width={graph.width}
          height={graph.height}
          preserveAspectRatio="xMinYMin meet"
          role="img"
          aria-label="Recipe dependency graph"
        >
          <defs>
            <marker
              id="graph-arrow"
              markerWidth="8"
              markerHeight="8"
              refX="7"
              refY="4"
              orient="auto"
            >
              <path d="M0,0 L8,4 L0,8 Z" fill="#8f8f8f" />
            </marker>
          </defs>

          {graph.edges.map((edge, index) => {
            const x1 = edge.from.x + NODE_WIDTH / 2;
            const y1 = edge.from.y + edge.from.height;
            const x2 = edge.to.x + NODE_WIDTH / 2;
            const y2 = edge.to.y;
            const cy1 = y1 + 24;
            const cy2 = y2 - 24;
            return (
              <path
                key={`${edge.from.step.step_id}-${edge.to.step.step_id}-${index}`}
                d={`M ${x1} ${y1} C ${x1} ${cy1}, ${x2} ${cy2}, ${x2} ${y2}`}
                fill="none"
                stroke="#8f8f8f"
                strokeWidth="1.6"
                markerEnd="url(#graph-arrow)"
              />
            );
          })}

          {graph.nodes.map((node) => {
            const className =
              node.status === "completed"
                ? styles.graphNodeCompleted
                : node.status === "ready"
                  ? styles.graphNodeReady
                  : styles.graphNodeBlocked;
            const isClickable = node.status !== "blocked";

            const handleClick = () => {
              if (Date.now() < suppressClickUntilRef.current) return;
              if (!isClickable) return;
              onToggleStep(node.step.step_id);
            };

            return (
              <g
                key={node.step.step_id}
                onClick={handleClick}
                onMouseEnter={(event) => {
                  setTooltip({
                    step: node.step,
                    x: event.clientX + 16,
                    y: event.clientY + 16,
                  });
                }}
                onMouseMove={(event) => {
                  setTooltip((previous) =>
                    previous
                      ? {
                          ...previous,
                          x: event.clientX + 16,
                          y: event.clientY + 16,
                        }
                      : {
                          step: node.step,
                          x: event.clientX + 16,
                          y: event.clientY + 16,
                        }
                  );
                }}
                onMouseLeave={() => setTooltip(null)}
                className={
                  isClickable ? styles.graphNodeClickable : styles.graphNodeBlockedCursor
                }
              >
                <rect
                  className={className}
                  x={node.x}
                  y={node.y}
                  width={NODE_WIDTH}
                  height={node.height}
                  rx={10}
                  ry={10}
                />
                <text
                  className={styles.graphNodeText}
                  x={node.x + 12}
                  y={node.y + TITLE_TOP_PADDING + TITLE_BASELINE_OFFSET}
                >
                  {node.titleLines.map((line, lineIndex) => (
                    <tspan
                      key={`${node.step.step_id}-${lineIndex}`}
                      x={node.x + 12}
                      dy={lineIndex === 0 ? 0 : TEXT_LINE_HEIGHT}
                    >
                      {line}
                    </tspan>
                  ))}
                </text>
                {node.ingredientLines.length > 0 ? (
                  <text
                    className={styles.graphNodeIngredients}
                    x={node.x + 12}
                    y={
                      node.y +
                      TITLE_TOP_PADDING +
                      TITLE_BASELINE_OFFSET +
                      (Math.max(1, node.titleLines.length) - 1) * TEXT_LINE_HEIGHT +
                      INGREDIENT_GAP +
                      TEXT_LINE_HEIGHT
                    }
                  >
                    {node.ingredientLines.map((line, lineIndex) => (
                      <tspan
                        key={`${node.step.step_id}-ingredients-${lineIndex}`}
                        x={node.x + 12}
                        dy={lineIndex === 0 ? 0 : TEXT_LINE_HEIGHT}
                      >
                        {line}
                      </tspan>
                    ))}
                  </text>
                ) : null}
                {node.step.duration_minute ? (
                  <text
                    className={styles.graphNodeMeta}
                    x={node.x + 12}
                    y={node.y + node.height - 12}
                  >
                    {node.step.duration_minute} min
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>
      </div>
      {tooltip ? (
        <div
          className={styles.graphTooltip}
          style={{
            left: tooltip.x,
            top: tooltip.y,
          }}
        >
          <div className={styles.graphTooltipTitle}>{tooltip.step.step_name}</div>
          {tooltip.step.ingredients.length > 0 ? (
            <div className={styles.graphTooltipMeta}>
              {tooltip.step.ingredients.join(", ")}
            </div>
          ) : null}
          {tooltip.step.duration_minute ? (
            <div className={styles.graphTooltipMeta}>
              {tooltip.step.duration_minute} min
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
