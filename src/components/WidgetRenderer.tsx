import type { ReactNode } from 'react';
import type { WidgetData } from '../types/widget';
import { WIDGET_META } from '../constants';
import WidgetWrapper from './WidgetWrapper';
import TimerWidget from './widgets/TimerWidget';
import TimerSettings from './widgets/TimerSettings';
import ClockWidget from './widgets/ClockWidget';
import ClockSettings from './widgets/ClockSettings';
import StopwatchWidget from './widgets/StopwatchWidget';
import TrafficLightWidget from './widgets/TrafficLightWidget';
import NoiseMeterWidget from './widgets/NoiseMeterWidget';
import RandomNameWidget from './widgets/RandomNameWidget';
import GroupMakerWidget from './widgets/GroupMakerWidget';
import PollWidget from './widgets/PollWidget';
import TextWidget from './widgets/TextWidget';
import DrawingWidget from './widgets/DrawingWidget';
import QRCodeWidget from './widgets/QRCodeWidget';
import DiceWidget from './widgets/DiceWidget';
import WorkSymbolsWidget from './widgets/WorkSymbolsWidget';
import CalendarWidget from './widgets/CalendarWidget';
import ImageWidget from './widgets/ImageWidget';
import PomodoroWidget from './widgets/PomodoroWidget';

interface Props {
  widget: WidgetData;
  scaleX: number;
  scaleY: number;
  scaleSize: number;
  onUpdate: (id: string, data: Partial<WidgetData>) => void;
  onRemove: (id: string) => void;
  onBringToFront: (id: string) => void;
  onConfigChange: (id: string, config: Record<string, unknown>) => void;
  isSelected: boolean;
  onSelect: (id: string | null) => void;
}

function renderWidgetContent(
  widget: WidgetData,
  onConfigChange: (config: Record<string, unknown>) => void,
  isSelected: boolean
) {
  switch (widget.type) {
    case 'timer':
      return <TimerWidget config={widget.config} onConfigChange={onConfigChange} />;
    case 'clock':
      return <ClockWidget config={widget.config} onConfigChange={onConfigChange} />;
    case 'stopwatch':
      return <StopwatchWidget />;
    case 'traffic-light':
      return <TrafficLightWidget />;
    case 'noise-meter':
      return <NoiseMeterWidget config={widget.config} onConfigChange={onConfigChange} />;
    case 'random-name':
      return <RandomNameWidget config={widget.config} onConfigChange={onConfigChange} />;
    case 'group-maker':
      return <GroupMakerWidget config={widget.config} onConfigChange={onConfigChange} />;
    case 'poll':
      return <PollWidget config={widget.config} onConfigChange={onConfigChange} />;
    case 'text':
      return <TextWidget config={widget.config} onConfigChange={onConfigChange} />;
    case 'drawing':
      return <DrawingWidget />;
    case 'qr-code':
      return <QRCodeWidget config={widget.config} onConfigChange={onConfigChange} />;
    case 'dice':
      return <DiceWidget />;
    case 'work-symbols':
      return <WorkSymbolsWidget isSelected={isSelected} />;
    case 'calendar':
      return <CalendarWidget config={widget.config} onConfigChange={onConfigChange} isSelected={isSelected} />;
    case 'image':
      return <ImageWidget config={widget.config} onConfigChange={onConfigChange} />;
    case 'pomodoro':
      return <PomodoroWidget config={widget.config} onConfigChange={onConfigChange} />;
    default:
      return <div className="text-slate-400 text-sm">알 수 없는 위젯</div>;
  }
}

export default function WidgetRenderer({
  widget,
  scaleX,
  scaleY,
  scaleSize,
  onUpdate,
  onRemove,
  onBringToFront,
  onConfigChange,
  isSelected,
  onSelect,
}: Props) {
  const meta = WIDGET_META[widget.type];
  const configHandler = (config: Record<string, unknown>) => onConfigChange(widget.id, config);

  // 위젯별 설정 패널
  function getSettingsPanel(): ReactNode | undefined {
    switch (widget.type) {
      case 'timer':
        return <TimerSettings config={widget.config} onConfigChange={configHandler} />;
      case 'clock':
        return <ClockSettings config={widget.config} onConfigChange={configHandler} />;
      default:
        return undefined;
    }
  }

  return (
    <WidgetWrapper
      widget={widget}
      scaleX={scaleX}
      scaleY={scaleY}
      scaleSize={scaleSize}
      onUpdate={onUpdate}
      onRemove={onRemove}
      onBringToFront={onBringToFront}
      title={`${meta.icon} ${meta.label}`}
      settingsPanel={getSettingsPanel()}
      isSelected={isSelected}
      onSelect={onSelect}
      onConfigChange={onConfigChange}
    >
      {renderWidgetContent(widget, configHandler, isSelected)}
    </WidgetWrapper>
  );
}
