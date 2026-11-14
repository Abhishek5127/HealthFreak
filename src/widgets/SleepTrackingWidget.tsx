'use no memo';
import React from 'react';
import { FlexWidget, SvgWidget, TextWidget } from 'react-native-android-widget';
import { SleepWidgetData } from './widgetStorage';
import {
  generateMoonSvg,
  generateSunSvg,
  generateBedSvg,
} from './sleepWidgetSvg';

export interface SleepTrackingWidgetProps {
  state?: SleepWidgetData;
  widgetWidth?: number;
  widgetHeight?: number;
}

/**
 * Native Android Home Screen (Phone Desktop) Sleep Tracking Widget.
 *
 * Provides instant 1-tap sleep tracking directly from the phone launcher:
 * - At night: Tap "Going to Bed" to start tracking sleep.
 * - In the morning: Tap "I Woke Up" to complete tracking and view duration & recovery.
 *
 * Fully synchronized in real-time with the in-app HealthFreak sleep tracker.
 */
export function SleepTrackingWidget({
  state,
  widgetWidth,
  widgetHeight,
}: SleepTrackingWidgetProps) {
  const isSleeping = state?.isSleeping ?? false;
  const duration = state?.durationMinutes ?? 0;
  const hours = Math.floor(duration / 60);
  const mins = duration % 60;
  const hasLogged = duration > 0;

  const durationText = hasLogged
    ? hours > 0
      ? `${hours}h ${mins}m`
      : `${mins}m`
    : '0h 0m';

  const bedtimeFormatted = state?.bedtimeIso
    ? new Date(state.bedtimeIso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : '--:--';

  const wakeTimeFormatted = state?.wakeTimeIso
    ? new Date(state.wakeTimeIso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : '--:--';

  const scheduleText = hasLogged && state?.bedtimeIso && state?.wakeTimeIso
    ? `${bedtimeFormatted} → ${wakeTimeFormatted}`
    : 'No sleep logged yet';

  const recoveryScore = state?.recoveryScore ?? 0;

  const moonSvg = generateMoonSvg('#7AE69E', 18);
  const moonWhiteSvg = generateMoonSvg('#FFFFFF', 14);
  const sunSvg = generateSunSvg('#FFFFFF', 15);
  const bedSvg = generateBedSvg('#7AE69E', 15);

  if (isSleeping) {
    // -------------------------------------------------------------
    // ACTIVE NIGHT / SLEEP IN PROGRESS MODE
    // -------------------------------------------------------------
    return (
      <FlexWidget
        style={{
          height: 'match_parent',
          width: 'match_parent',
          backgroundGradient: {
            from: '#16241C',
            to: '#0B120E',
            orientation: 'TL_BR',
          },
          borderColor: '#4B7761',
          borderWidth: 1.8,
          borderRadius: 24,
          padding: 12,
          justifyContent: 'space-between',
        }}
      >
        {/* Header row: Moon indicator + Status */}
        <FlexWidget
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: 'match_parent',
          }}
        >
          <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
            <SvgWidget svg={moonSvg} style={{ width: 18, height: 18 }} />
            <TextWidget
              text="SLEEP IN PROGRESS"
              style={{
                color: '#7AE69E',
                fontSize: 10,
                fontWeight: 'bold',
                marginLeft: 5,
                letterSpacing: 0.5,
              }}
            />
          </FlexWidget>

          <TextWidget
            text="Tracking..."
            style={{
              color: '#A8B5AB',
              fontSize: 10,
            }}
          />
        </FlexWidget>

        {/* Center content */}
        <FlexWidget style={{ width: 'match_parent', marginVertical: 4 }}>
          <TextWidget
            text="Resting Deeply"
            style={{
              color: '#FFFFFF',
              fontSize: 16,
              fontWeight: 'bold',
            }}
          />
          <TextWidget
            text={`Bedtime logged at ${bedtimeFormatted}`}
            style={{
              color: '#A8B5AB',
              fontSize: 11,
              marginTop: 2,
            }}
          />
        </FlexWidget>

        {/* Action Button: I WOKE UP */}
        <FlexWidget
          clickAction="WAKE_UP"
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#4B7761',
            borderColor: '#7AE69E',
            borderWidth: 1,
            borderRadius: 14,
            paddingVertical: 10,
            paddingHorizontal: 16,
            width: 'match_parent',
          }}
        >
          <SvgWidget svg={sunSvg} style={{ width: 15, height: 15 }} />
          <TextWidget
            text="I Woke Up"
            style={{
              color: '#FFFFFF',
              fontSize: 13,
              fontWeight: 'bold',
              marginLeft: 6,
            }}
          />
        </FlexWidget>
      </FlexWidget>
    );
  }

  // ---------------------------------------------------------------
  // NORMAL DAYTIME / AWAKE MODE
  // ---------------------------------------------------------------
  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundGradient: {
          from: '#1E2320',
          to: '#101412',
          orientation: 'TL_BR',
        },
        borderColor: 'rgba(75, 119, 97, 0.4)',
        borderWidth: 1.5,
        borderRadius: 24,
        padding: 12,
        justifyContent: 'space-between',
      }}
    >
      {/* Header row: Bed icon + Recovery Score */}
      <FlexWidget
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: 'match_parent',
        }}
      >
        <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
          <SvgWidget svg={bedSvg} style={{ width: 15, height: 15 }} />
          <TextWidget
            text="SLEEP TRACKER"
            style={{
              color: '#A8B5AB',
              fontSize: 10,
              fontWeight: 'bold',
              marginLeft: 5,
              letterSpacing: 0.5,
            }}
          />
        </FlexWidget>

        <TextWidget
          text={hasLogged ? `${recoveryScore}% Recovery` : 'Target: 8h'}
          style={{
            color: hasLogged ? '#7AE69E' : '#738276',
            fontSize: 10,
            fontWeight: 'bold',
          }}
        />
      </FlexWidget>

      {/* Main duration & schedule */}
      <FlexWidget style={{ width: 'match_parent', marginVertical: 3 }}>
        <TextWidget
          text={durationText}
          style={{
            color: '#FFFFFF',
            fontSize: 22,
            fontWeight: 'bold',
          }}
        />
        <TextWidget
          text={scheduleText}
          style={{
            color: '#A8B5AB',
            fontSize: 11,
            marginTop: 1,
          }}
        />
      </FlexWidget>

      {/* Action Button: GOING TO BED */}
      <FlexWidget
        clickAction="START_SLEEP"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#27382F',
          borderColor: '#4B7761',
          borderWidth: 1.2,
          borderRadius: 14,
          paddingVertical: 9,
          paddingHorizontal: 16,
          width: 'match_parent',
        }}
      >
        <SvgWidget svg={moonWhiteSvg} style={{ width: 14, height: 14 }} />
        <TextWidget
          text="Going to Bed"
          style={{
            color: '#FFFFFF',
            fontSize: 13,
            fontWeight: 'bold',
            marginLeft: 6,
          }}
        />
      </FlexWidget>
    </FlexWidget>
  );
}
