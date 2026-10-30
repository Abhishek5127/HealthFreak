import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, {
  Path,
  Defs,
  LinearGradient,
  Stop,
  Circle,
  Line,
} from 'react-native-svg';
import { Colors } from '../../theme/colors';
import { Typography } from '../../theme/typography';

interface MetricLineChartProps {
  data: number[]; // 7 values
  labels?: string[];
  height?: number;
  width?: number;
  color?: string;
  unit?: string;
}

export const MetricLineChart: React.FC<MetricLineChartProps> = ({
  data = [3200, 4100, 5600, 4800, 6200, 7400, 8100],
  labels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
  height = 160,
  width = 320,
  color = '#FF715F',
  unit = 'steps',
}) => {
  const paddingX = 24;
  const paddingTop = 20;
  const paddingBottom = 30;

  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingTop - paddingBottom;

  const minVal = Math.min(...data) * 0.85;
  const maxVal = Math.max(...data) * 1.1;
  const range = maxVal - minVal || 1;

  // Calculate points
  const points = data.map((val, idx) => {
    const x = paddingX + (idx / (data.length - 1)) * chartWidth;
    const y = paddingTop + chartHeight - ((val - minVal) / range) * chartHeight;
    return { x, y, val };
  });

  // Construct smooth curve path
  let pathD = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const curr = points[i];
    const next = points[i + 1];
    const cp1x = curr.x + (next.x - curr.x) / 2;
    const cp1y = curr.y;
    const cp2x = curr.x + (next.x - curr.x) / 2;
    const cp2y = next.y;
    pathD += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${next.x} ${next.y}`;
  }

  // Construct fill path
  const lastPoint = points[points.length - 1];
  const firstPoint = points[0];
  const fillD = `${pathD} L ${lastPoint.x} ${height - paddingBottom} L ${firstPoint.x} ${height - paddingBottom} Z`;

  return (
    <View style={styles.container}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={color} stopOpacity="0.32" />
            <Stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </LinearGradient>
        </Defs>

        {/* Horizontal grid guide lines */}
        <Line
          x1={paddingX}
          y1={paddingTop + chartHeight * 0.25}
          x2={width - paddingX}
          y2={paddingTop + chartHeight * 0.25}
          stroke="#262D27"
          strokeWidth="1"
          strokeDasharray="4 4"
        />
        <Line
          x1={paddingX}
          y1={paddingTop + chartHeight * 0.65}
          x2={width - paddingX}
          y2={paddingTop + chartHeight * 0.65}
          stroke="#262D27"
          strokeWidth="1"
          strokeDasharray="4 4"
        />

        {/* Gradient area under line */}
        <Path d={fillD} fill="url(#chartGradient)" />

        {/* Smooth line */}
        <Path
          d={pathD}
          fill="none"
          stroke={color}
          strokeWidth="3.2"
          strokeLinecap="round"
        />

        {/* Data points */}
        {points.map((pt, i) => {
          const isLatest = i === points.length - 1;
          return (
            <Circle
              key={i}
              cx={pt.x}
              cy={pt.y}
              r={isLatest ? 5.5 : 3.5}
              fill={isLatest ? Colors.textPrimary : color}
              stroke={Colors.surfaceCard}
              strokeWidth={isLatest ? 2.5 : 1.5}
            />
          );
        })}
      </Svg>

      {/* Day Labels below chart */}
      <View style={[styles.labelsRow, { paddingHorizontal: paddingX }]}>
        {labels.map((lbl, idx) => (
          <Text
            key={idx}
            style={[
              styles.dayLabel,
              idx === labels.length - 1 && styles.dayLabelActive,
            ]}
          >
            {lbl}
          </Text>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 12,
  },
  labelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 4,
  },
  dayLabel: {
    color: Colors.textMuted,
    fontSize: Typography.fontSizes.xs,
    fontFamily: Typography.fontFamilies.sansMedium,
  },
  dayLabelActive: {
    color: Colors.coralCTA,
    fontFamily: Typography.fontFamilies.sansBold,
  },
});

