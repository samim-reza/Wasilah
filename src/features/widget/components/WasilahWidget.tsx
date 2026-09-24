/**
 * The home-screen widget.
 *
 * Rendered by `react-native-android-widget`, which turns this tree into a
 * bitmap and a set of tap areas for the launcher. That imposes real limits
 * worth knowing before editing: only this library's elements exist here
 * (FlexWidget, TextWidget, ImageWidget, OverlapWidget), there is no state, no
 * hook, no effect and no touch handling beyond `clickAction`, and it redraws
 * only when the app or Android asks. Treat it as a picture that occasionally
 * changes, not as a screen.
 *
 * What it shows, from the back forward: a scene for this moment (the sunset,
 * the rain, the new crescent), a dark scrim so text stays readable over any
 * of them, the dua occasion for the hour, and the streak. Tapping the words
 * opens that dua; tapping anywhere else opens the app.
 *
 * Sizes are in dp and come from Android via `widgetInfo`. Below roughly two
 * cells wide the middle line is dropped, because two clipped words are worse
 * than none.
 */
// The React Compiler must leave this file alone. It rewrites components to
// use its memo-cache hook, and the widget library calls this component as a
// plain function — outside React, in a headless task with no renderer — so
// that hook throws "Invalid hook call" and the widget draws nothing at all.
// This directive is what the library's own error message asks for.
'use no memo';

import { FlexWidget, ImageWidget, OverlapWidget, TextWidget } from 'react-native-android-widget';

import type { WidgetModel } from '../services/widgetModel';
import type { WidgetScene } from '../services/widgetScene';

export interface WasilahWidgetProps {
  model: WidgetModel;
  /** Widget width in dp. */
  width: number;
  /** Widget height in dp. */
  height: number;
}

/**
 * `require` rather than a computed path: Metro bundles only what it can see
 * statically, and this table is the whole set. The @2x/@3x files beside each
 * one are picked up automatically for denser screens.
 */
const scenes: Record<WidgetScene, number> = {
  dawn: require('../../../../assets/widget/dawn.png'),
  day: require('../../../../assets/widget/day.png'),
  sunset: require('../../../../assets/widget/sunset.png'),
  night: require('../../../../assets/widget/night.png'),
  moon: require('../../../../assets/widget/moon.png'),
  rain: require('../../../../assets/widget/rain.png'),
  cold: require('../../../../assets/widget/cold.png'),
  mosque: require('../../../../assets/widget/mosque.png'),
};

const RADIUS = 24;
const WHITE = '#FFFFFF';
const CREAM = '#FFEBD2';

/** Narrower than this and the middle line has no room to say anything. */
const COMPACT_WIDTH = 200;
const COMPACT_HEIGHT = 120;

export function WasilahWidget({ model, width, height }: WasilahWidgetProps) {
  const compact = width < COMPACT_WIDTH || height < COMPACT_HEIGHT;
  const duaUri = model.occasionId ? `wasilah://dua/${model.occasionId}` : null;

  return (
    <OverlapWidget
      style={{ height: 'match_parent', width: 'match_parent', borderRadius: RADIUS }}
      clickAction="OPEN_APP"
    >
      <ImageWidget
        image={scenes[model.scene]}
        imageWidth={width}
        imageHeight={height}
        radius={RADIUS}
        resizeMode="cover"
      />

      {/* The scrim: transparent at the top, dark at the bottom, so the sky
          shows through where the picture lives and the text sits where the
          picture is darkest anyway. */}
      <FlexWidget
        style={{
          height: 'match_parent',
          width: 'match_parent',
          borderRadius: RADIUS,
          backgroundGradient: { from: '#00000014', to: '#000000B8', orientation: 'TOP_BOTTOM' },
          flexDirection: 'column',
          justifyContent: 'space-between',
          paddingHorizontal: 14,
          paddingVertical: 12,
        }}
      >
        <TextWidget
          text={model.title.toUpperCase()}
          maxLines={1}
          truncate="END"
          style={{ fontSize: 10, color: CREAM, letterSpacing: 0.6, fontWeight: '600' }}
        />

        {!compact &&
          (model.arabic ? (
            <TextWidget
              text={model.arabic}
              maxLines={2}
              truncate="END"
              clickAction={duaUri ? 'OPEN_URI' : undefined}
              clickActionData={duaUri ? { uri: duaUri } : undefined}
              style={{
                fontSize: 19,
                color: WHITE,
                fontFamily: 'Amiri-Regular',
                textAlign: 'right',
                width: 'match_parent',
              }}
            />
          ) : (
            <TextWidget
              text={model.line}
              maxLines={2}
              truncate="END"
              clickAction={duaUri ? 'OPEN_URI' : undefined}
              clickActionData={duaUri ? { uri: duaUri } : undefined}
              style={{ fontSize: 13, color: WHITE, fontWeight: 'bold', width: 'match_parent' }}
            />
          ))}

        <FlexWidget
          style={{
            width: 'match_parent',
            flexDirection: 'row',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
          }}
        >
          <FlexWidget style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
            <TextWidget
              text={String(model.currentStreak)}
              style={{ fontSize: compact ? 24 : 28, color: WHITE, fontWeight: 'bold' }}
            />
            <TextWidget
              text={model.streakLabel}
              style={{ fontSize: 11, color: CREAM, marginLeft: 6, marginBottom: 5 }}
            />
          </FlexWidget>

          {model.status !== '' && (
            <FlexWidget
              style={{
                backgroundColor: model.minimumMet ? '#FFFFFF33' : '#0F6B5CE6',
                borderRadius: 12,
                paddingHorizontal: 10,
                paddingVertical: 5,
              }}
            >
              <TextWidget
                text={model.minimumMet ? `✓ ${model.status}` : model.status}
                maxLines={1}
                truncate="END"
                style={{ fontSize: 11, color: WHITE, fontWeight: '600' }}
              />
            </FlexWidget>
          )}
        </FlexWidget>
      </FlexWidget>
    </OverlapWidget>
  );
}
