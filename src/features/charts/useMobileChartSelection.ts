import { useCallback, useEffect, useRef, useState } from 'react';
import type { MouseHandlerDataParam } from 'recharts/types/synchronisation/types';

const MOBILE_TOOLTIP_TIMEOUT_MS = 4000;

function toNumericIndex(index: MouseHandlerDataParam['activeTooltipIndex']): number | undefined {
  if (typeof index === 'number') return Number.isInteger(index) ? index : undefined;
  if (typeof index !== 'string' || index.trim() === '') return undefined;

  const parsed = Number(index);
  return Number.isInteger(parsed) ? parsed : undefined;
}

export function useMobileChartSelection<T>(data: readonly T[], isMobile: boolean) {
  const [selectedPoint, setSelectedPoint] = useState<T | undefined>();
  const timerRef = useRef<ReturnType<typeof window.setTimeout> | undefined>(undefined);

  const closeSelection = useCallback(() => {
    setSelectedPoint(undefined);
    if (timerRef.current !== undefined) {
      window.clearTimeout(timerRef.current);
      timerRef.current = undefined;
    }
  }, []);

  const scheduleClose = useCallback(() => {
    if (!isMobile) return;
    if (timerRef.current !== undefined) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(closeSelection, MOBILE_TOOLTIP_TIMEOUT_MS);
  }, [closeSelection, isMobile]);

  const selectFromChartState = useCallback((state: MouseHandlerDataParam) => {
    if (!isMobile) return;

    const index = toNumericIndex(state.activeTooltipIndex);
    const nextPoint = index === undefined ? undefined : data[index];
    if (!nextPoint) return;

    setSelectedPoint(nextPoint);
    scheduleClose();
  }, [data, isMobile, scheduleClose]);

  useEffect(() => {
    if (!isMobile) return undefined;

    const handlePageScroll = () => closeSelection();
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Element && target.closest('.chart')) return;
      closeSelection();
    };

    window.addEventListener('scroll', handlePageScroll, { passive: true });
    window.addEventListener('pointerdown', handlePointerDown, { passive: true });

    return () => {
      window.removeEventListener('scroll', handlePageScroll);
      window.removeEventListener('pointerdown', handlePointerDown);
      closeSelection();
    };
  }, [closeSelection, isMobile]);

  useEffect(() => closeSelection, [closeSelection, data]);

  return { closeSelection, selectedPoint, selectFromChartState };
}
