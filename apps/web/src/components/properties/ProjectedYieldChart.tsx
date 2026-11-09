import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { Property } from '../../types/property';
import { formatCurrency, formatPercent } from '../../lib/utils';
import { TrendingUp, DollarSign, Calendar, Info, Layers, RefreshCw, Sparkles } from 'lucide-react';

interface ProjectedYieldChartProps {
  property: Property;
  initialInvestmentEUR?: number;
}

type MetricMode = 'yieldPercent' | 'annualIncome' | 'cumulativeIncome' | 'totalAssetValue';

interface YearDataPoint {
  year: number;
  yearLabel: string;
  yieldPercent: number; // Annual yield percentage e.g. 7.5% -> 9.8%
  annualIncome: number; // Rental income in EUR for that year
  cumulativeIncome: number; // Cumulative rental income in EUR up to that year
  assetValue: number; // Property capital value growth
  totalAssetValue: number; // Property value + cumulative income
}

export const ProjectedYieldChart: React.FC<ProjectedYieldChartProps> = ({
  property,
  initialInvestmentEUR = 1000,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Interactive controls
  const [investmentAmount, setInvestmentAmount] = useState<number>(
    Math.max(property.minimumInvestment || 1000, initialInvestmentEUR)
  );
  const [metricMode, setMetricMode] = useState<MetricMode>('yieldPercent');
  const [annualRentGrowthRate, setAnnualRentGrowthRate] = useState<number>(3.0); // 3% annual rent inflation indexation
  const [appreciationRate, setAppreciationRate] = useState<number>(property.capitalAppreciationYield || 3.5); // % annual capital appreciation
  const [hoveredPoint, setHoveredPoint] = useState<YearDataPoint | null>(null);

  // Sync initial investment when property changes
  useEffect(() => {
    if (initialInvestmentEUR) {
      setInvestmentAmount(Math.max(property.minimumInvestment || 1000, initialInvestmentEUR));
    }
  }, [initialInvestmentEUR, property]);

  // Generate 10-Year Financial Data
  const dataPoints: YearDataPoint[] = useMemo(() => {
    const baseYield = property.estimatedAnnualYield || 7.5;
    const points: YearDataPoint[] = [];

    let currentValuation = investmentAmount;
    let runningCumulativeIncome = 0;

    for (let yr = 1; yr <= 10; yr++) {
      // Rental growth compounds by annualRentGrowthRate
      const rentMultiplier = Math.pow(1 + annualRentGrowthRate / 100, yr - 1);
      const yieldPercent = baseYield * rentMultiplier;
      
      const annualIncome = (investmentAmount * yieldPercent) / 100;
      runningCumulativeIncome += annualIncome;

      // Asset value compounds by appreciationRate
      currentValuation = investmentAmount * Math.pow(1 + appreciationRate / 100, yr);

      points.push({
        year: yr,
        yearLabel: `Year ${yr}`,
        yieldPercent: Number(yieldPercent.toFixed(2)),
        annualIncome: Number(annualIncome.toFixed(2)),
        cumulativeIncome: Number(runningCumulativeIncome.toFixed(2)),
        assetValue: Number(currentValuation.toFixed(2)),
        totalAssetValue: Number((currentValuation + runningCumulativeIncome).toFixed(2)),
      });
    }

    return points;
  }, [property, investmentAmount, annualRentGrowthRate, appreciationRate]);

  // Summary Metrics
  const year1Data = dataPoints[0];
  const year10Data = dataPoints[dataPoints.length - 1];
  const total10YrGain = year10Data.totalAssetValue - investmentAmount;
  const totalReturnPercent = (total10YrGain / investmentAmount) * 100;

  // D3 Rendering Logic
  useEffect(() => {
    if (!svgRef.current || !containerRef.current || dataPoints.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clear previous drawing

    const containerWidth = containerRef.current.clientWidth || 600;
    const height = 320;
    const margin = { top: 25, right: 35, bottom: 40, left: 55 };
    const innerWidth = containerWidth - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    svg
      .attr('width', containerWidth)
      .attr('height', height)
      .attr('viewBox', `0 0 ${containerWidth} ${height}`);

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Helper accessor based on selected metric mode
    const getValue = (d: YearDataPoint) => {
      switch (metricMode) {
        case 'yieldPercent':
          return d.yieldPercent;
        case 'annualIncome':
          return d.annualIncome;
        case 'cumulativeIncome':
          return d.cumulativeIncome;
        case 'totalAssetValue':
          return d.totalAssetValue;
      }
    };

    const formatValueShort = (val: number) => {
      if (metricMode === 'yieldPercent') {
        return `${val.toFixed(1)}%`;
      }
      if (val >= 1000000) {
        return `€${(val / 1000000).toFixed(1)}M`;
      }
      if (val >= 1000) {
        return `€${(val / 1000).toFixed(1)}k`;
      }
      return `€${Math.round(val)}`;
    };

    // Scales
    const xScale = d3
      .scaleLinear()
      .domain([1, 10])
      .range([0, innerWidth]);

    const yMin = d3.min(dataPoints, getValue) || 0;
    const yMax = d3.max(dataPoints, getValue) || 100;
    const yPadding = (yMax - yMin) * 0.15 || 1;

    const yScale = d3
      .scaleLinear()
      .domain([Math.max(0, yMin - yPadding), yMax + yPadding])
      .nice()
      .range([innerHeight, 0]);

    // Grid lines
    const yAxisGrid = d3
      .axisLeft(yScale)
      .ticks(5)
      .tickSize(-innerWidth)
      .tickFormat(() => '');

    g.append('g')
      .attr('class', 'grid-lines')
      .call(yAxisGrid)
      .selectAll('line')
      .attr('stroke', '#E3E8E3')
      .attr('stroke-dasharray', '3,3')
      .attr('stroke-opacity', 0.6);

    g.select('.grid-lines .domain').remove();

    // Area Generator (Gradient Fill)
    const areaGenerator = d3
      .area<YearDataPoint>()
      .x((d) => xScale(d.year))
      .y0(innerHeight)
      .y1((d) => yScale(getValue(d)))
      .curve(d3.curveMonotoneX);

    // Create SVG Gradient
    const defs = svg.append('defs');
    const gradientId = `yield-gradient-${Math.random().toString(36).substring(2, 9)}`;

    const gradient = defs
      .append('linearGradient')
      .attr('id', gradientId)
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');

    gradient
      .append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#27845D')
      .attr('stop-opacity', 0.35);

    gradient
      .append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#27845D')
      .attr('stop-opacity', 0.02);

    // Append Area Path
    g.append('path')
      .datum(dataPoints)
      .attr('fill', `url(#${gradientId})`)
      .attr('d', areaGenerator);

    // Line Generator
    const lineGenerator = d3
      .line<YearDataPoint>()
      .x((d) => xScale(d.year))
      .y((d) => yScale(getValue(d)))
      .curve(d3.curveMonotoneX);

    // Append Line Path
    const path = g
      .append('path')
      .datum(dataPoints)
      .attr('fill', 'none')
      .attr('stroke', '#27845D')
      .attr('stroke-width', 3)
      .attr('d', lineGenerator);

    // Animate Line Drawing
    const totalLength = path.node()?.getTotalLength() || 0;
    path
      .attr('stroke-dasharray', `${totalLength} ${totalLength}`)
      .attr('stroke-dashoffset', totalLength)
      .transition()
      .duration(1000)
      .ease(d3.easeCubicOut)
      .attr('stroke-dashoffset', 0);

    // Append Data Points (Circles)
    g.selectAll('.data-circle')
      .data(dataPoints)
      .enter()
      .append('circle')
      .attr('class', 'data-circle')
      .attr('cx', (d) => xScale(d.year))
      .attr('cy', (d) => yScale(getValue(d)))
      .attr('r', 5)
      .attr('fill', '#FFFFFF')
      .attr('stroke', '#182D2A')
      .attr('stroke-width', 2.5)
      .style('cursor', 'pointer');

    // Axes
    const xAxis = d3
      .axisBottom(xScale)
      .ticks(10)
      .tickFormat((d) => `Yr ${d}`);

    const yAxis = d3
      .axisLeft(yScale)
      .ticks(5)
      .tickFormat((d) => formatValueShort(Number(d)));

    // Render X Axis
    g.append('g')
      .attr('transform', `translate(0, ${innerHeight})`)
      .call(xAxis)
      .selectAll('text')
      .attr('font-size', '11px')
      .attr('font-weight', '600')
      .attr('fill', '#52605C');

    // Render Y Axis
    g.append('g')
      .call(yAxis)
      .selectAll('text')
      .attr('font-size', '11px')
      .attr('font-weight', '600')
      .attr('fill', '#52605C');

    // Style Axes Lines
    g.selectAll('.domain').attr('stroke', '#CBD5E1').attr('stroke-width', 1);
    g.selectAll('.tick line').attr('stroke', '#CBD5E1');

    // Interactive Crosshair & Hover Overlay
    const focusG = g.append('g').style('display', 'none');

    // Vertical line
    const focusLine = focusG
      .append('line')
      .attr('stroke', '#182D2A')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '4,4')
      .attr('y1', 0)
      .attr('y2', innerHeight);

    // Active Highlight Circle
    const focusCircle = focusG
      .append('circle')
      .attr('r', 7)
      .attr('fill', '#B7E36A')
      .attr('stroke', '#182D2A')
      .attr('stroke-width', 3);

    // Value Badge Text
    const focusText = focusG
      .append('text')
      .attr('font-size', '11px')
      .attr('font-weight', '800')
      .attr('fill', '#18211F')
      .attr('text-anchor', 'middle')
      .attr('dy', -12);

    // Transparent Mouse Tracker Rect
    svg
      .append('rect')
      .attr('transform', `translate(${margin.left},${margin.top})`)
      .attr('width', innerWidth)
      .attr('height', innerHeight)
      .attr('fill', 'none')
      .attr('pointer-events', 'all')
      .on('mouseover', () => focusG.style('display', null))
      .on('mouseout', () => {
        focusG.style('display', 'none');
        setHoveredPoint(null);
      })
      .on('mousemove', (event) => {
        const [xm] = d3.pointer(event);
        const xYear = Math.round(xScale.invert(xm));
        const clampedYear = Math.max(1, Math.min(10, xYear));
        const d = dataPoints.find((p) => p.year === clampedYear) || dataPoints[0];

        const cx = xScale(d.year);
        const cy = yScale(getValue(d));

        focusLine.attr('x1', cx).attr('x2', cx);
        focusCircle.attr('cx', cx).attr('cy', cy);
        focusText
          .attr('x', cx)
          .attr('y', cy)
          .text(
            metricMode === 'yieldPercent'
              ? `${d.yieldPercent}%`
              : formatCurrency(getValue(d))
          );

        focusG.style('display', null);
        setHoveredPoint(d);
      });
  }, [dataPoints, metricMode]);

  return (
    <div className="bg-white rounded-3xl border border-[#E3E8E3] p-6 shadow-sm space-y-6">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#27845D] uppercase tracking-wider mb-1">
            <TrendingUp className="w-4 h-4 text-[#27845D]" />
            <span>Financial Projection Model · Long-Term Forecast</span>
          </div>
          <h3 className="text-xl font-black text-[#18211F]">
            10-Year Rental Yield & Capital Growth Projections
          </h3>
          <p className="text-xs text-[#52605C] mt-0.5">
            Dynamic forecasting model calculating CPI indexation, compound rental increases, and SPV asset appreciation.
          </p>
        </div>

        {/* Mode Selector Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 bg-[#F6F7F4] p-1.5 rounded-2xl border border-[#E3E8E3]">
          {[
            { id: 'yieldPercent', label: 'Annual Yield (%)' },
            { id: 'annualIncome', label: 'Annual Payout (€)' },
            { id: 'cumulativeIncome', label: 'Cumulative Yield (€)' },
            { id: 'totalAssetValue', label: 'Total Portfolio (€)' },
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => setMetricMode(m.id as MetricMode)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                metricMode === m.id
                  ? 'bg-[#182D2A] text-white shadow-xs'
                  : 'text-[#52605C] hover:text-[#18211F] hover:bg-gray-200/60'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Highlight Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#F6F7F4] p-3.5 rounded-2xl border border-[#E3E8E3] space-y-0.5">
          <span className="text-[10px] font-bold text-[#69736F] uppercase block">Year 1 Yield</span>
          <div className="text-lg font-black text-[#27845D]">
            {formatPercent(year1Data.yieldPercent)}
          </div>
          <span className="text-[10px] text-[#52605C] block">+{formatCurrency(year1Data.annualIncome)} / yr</span>
        </div>

        <div className="bg-[#F6F7F4] p-3.5 rounded-2xl border border-[#E3E8E3] space-y-0.5">
          <span className="text-[10px] font-bold text-[#69736F] uppercase block">Year 10 Yield</span>
          <div className="text-lg font-black text-[#27845D]">
            {formatPercent(year10Data.yieldPercent)}
          </div>
          <span className="text-[10px] text-[#52605C] block">+{formatCurrency(year10Data.annualIncome)} / yr</span>
        </div>

        <div className="bg-[#F6F7F4] p-3.5 rounded-2xl border border-[#E3E8E3] space-y-0.5">
          <span className="text-[10px] font-bold text-[#69736F] uppercase block">10-Yr Total Yield</span>
          <div className="text-lg font-black text-[#18211F]">
            {formatCurrency(year10Data.cumulativeIncome)}
          </div>
          <span className="text-[10px] text-emerald-700 font-bold block">100% Cash Paid Out</span>
        </div>

        <div className="bg-[#182D2A] text-white p-3.5 rounded-2xl border border-[#182D2A] space-y-0.5">
          <span className="text-[10px] font-bold text-emerald-300 uppercase block">10-Yr Total ROI</span>
          <div className="text-lg font-black text-white">
            {formatPercent(totalReturnPercent)}
          </div>
          <span className="text-[10px] text-emerald-200 block">Valuation: {formatCurrency(year10Data.totalAssetValue)}</span>
        </div>
      </div>

      {/* Interactive Parameters Sliders */}
      <div className="p-4 rounded-2xl bg-[#F6F7F4] border border-[#E3E8E3] grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        
        {/* Slider 1: Simulated Investment Capital */}
        <div>
          <div className="flex justify-between items-center font-bold text-[#18211F] mb-1.5">
            <span>Simulated Investment:</span>
            <span className="text-[#27845D] font-black">{formatCurrency(investmentAmount)}</span>
          </div>
          <input
            type="range"
            min={property.minimumInvestment || 1000}
            max={100000}
            step={1000}
            value={investmentAmount}
            onChange={(e) => setInvestmentAmount(Number(e.target.value))}
            className="w-full accent-[#27845D] cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-[#69736F] mt-1">
            <span>Min: {formatCurrency(property.minimumInvestment || 1000)}</span>
            <span>€100,000</span>
          </div>
        </div>

        {/* Slider 2: Annual Rent Inflation Rate */}
        <div>
          <div className="flex justify-between items-center font-bold text-[#18211F] mb-1.5">
            <span>Annual Rent Growth (CPI):</span>
            <span className="text-[#18211F] font-black">{annualRentGrowthRate}% / yr</span>
          </div>
          <input
            type="range"
            min={0}
            max={8}
            step={0.5}
            value={annualRentGrowthRate}
            onChange={(e) => setAnnualRentGrowthRate(Number(e.target.value))}
            className="w-full accent-[#27845D] cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-[#69736F] mt-1">
            <span>0% (Static)</span>
            <span>8% (High Inflation)</span>
          </div>
        </div>

        {/* Slider 3: Capital Appreciation Rate */}
        <div>
          <div className="flex justify-between items-center font-bold text-[#18211F] mb-1.5">
            <span>Capital Appreciation:</span>
            <span className="text-[#18211F] font-black">{appreciationRate}% / yr</span>
          </div>
          <input
            type="range"
            min={0}
            max={10}
            step={0.5}
            value={appreciationRate}
            onChange={(e) => setAppreciationRate(Number(e.target.value))}
            className="w-full accent-[#27845D] cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-[#69736F] mt-1">
            <span>0% (No Growth)</span>
            <span>10% (Prime Market)</span>
          </div>
        </div>
      </div>

      {/* D3 Chart Canvas Container */}
      <div className="relative" ref={containerRef}>
        <svg ref={svgRef} className="w-full overflow-visible" />

        {/* Hover Detail Panel */}
        {hoveredPoint && (
          <div className="mt-3 p-3.5 bg-[#182D2A] text-white rounded-2xl border border-emerald-500/30 flex flex-wrap items-center justify-between gap-3 text-xs animate-in fade-in duration-150">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#B7E36A] animate-pulse" />
              <span className="font-extrabold text-[#B7E36A] uppercase tracking-wider">{hoveredPoint.yearLabel} Inspection</span>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-emerald-100">
              <div>
                <span className="text-[10px] text-emerald-300/80 block uppercase">Net Yield Rate</span>
                <span className="font-bold text-white text-sm">{formatPercent(hoveredPoint.yieldPercent)}</span>
              </div>
              <div>
                <span className="text-[10px] text-emerald-300/80 block uppercase">Annual Rent Payout</span>
                <span className="font-bold text-white text-sm">+{formatCurrency(hoveredPoint.annualIncome)}</span>
              </div>
              <div>
                <span className="text-[10px] text-emerald-300/80 block uppercase">Total Rental Dividends</span>
                <span className="font-bold text-white text-sm">{formatCurrency(hoveredPoint.cumulativeIncome)}</span>
              </div>
              <div>
                <span className="text-[10px] text-emerald-300/80 block uppercase">Total Portfolio Position</span>
                <span className="font-extrabold text-[#B7E36A] text-sm">{formatCurrency(hoveredPoint.totalAssetValue)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="pt-2 border-t border-[#E3E8E3] flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-[#69736F] gap-2">
        <div className="flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-[#27845D] shrink-0" />
          <span>Interactive D3 rendering engine calculating CPI-indexed rent compounding & SPV asset equity growth.</span>
        </div>
        <span className="font-semibold text-[#18211F]">
          Base Asset: {property.title} ({property.estimatedAnnualYield}% initial yield)
        </span>
      </div>
    </div>
  );
};
