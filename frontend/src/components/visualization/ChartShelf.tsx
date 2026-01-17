import { useDrop } from 'react-dnd';
import { X } from 'lucide-react';
import { Badge } from '../ui/badge';

interface FieldItem {
  name: string;
  type: 'dimension' | 'measure';
  dataType: 'string' | 'number' | 'date';
}

interface ChartConfig {
  columns: FieldItem[];
  rows: FieldItem[];
  color?: FieldItem;
  size?: FieldItem;
}

interface ChartShelfProps {
  config: ChartConfig;
  onUpdateConfig: (updates: Partial<ChartConfig>) => void;
  fields: FieldItem[];
}

interface DropZoneProps {
  label: string;
  items: FieldItem[];
  onDrop: (field: FieldItem) => void;
  onRemove: (index: number) => void;
  accept?: 'dimension' | 'measure' | 'both';
  maxItems?: number;
}

function DropZone({ label, items, onDrop, onRemove, accept = 'both', maxItems }: DropZoneProps) {
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: 'FIELD',
    drop: (field: FieldItem) => {
      if (maxItems && items.length >= maxItems) return;
      if (accept !== 'both' && field.type !== accept) return;
      onDrop(field);
    },
    canDrop: (field: FieldItem) => {
      if (maxItems && items.length >= maxItems) return false;
      if (accept !== 'both' && field.type !== accept) return false;
      return true;
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  }));

  const getBgColor = () => {
    if (isOver && canDrop) return 'bg-blue-100 border-blue-400';
    if (isOver && !canDrop) return 'bg-red-100 border-red-400';
    if (items.length > 0) return 'bg-white border-gray-300';
    return 'bg-gray-50 border-gray-300';
  };

  return (
    <div className="flex items-start space-x-2">
      <div className="w-24 pt-2">
        <span className="text-gray-700">{label}:</span>
      </div>
      <div
        ref={drop}
        className={`flex-1 min-h-[40px] border-2 border-dashed rounded p-2 transition-colors ${getBgColor()}`}
      >
        {items.length === 0 ? (
          <p className="text-gray-400">Drop field here</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {items.map((item, index) => (
              <Badge
                key={`${item.name}-${index}`}
                variant={item.type === 'measure' ? 'default' : 'secondary'}
                className="flex items-center space-x-1 cursor-pointer hover:opacity-80"
              >
                <span>{item.name}</span>
                <X
                  className="w-3 h-3 ml-1"
                  onClick={() => onRemove(index)}
                />
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function ChartShelf({ config, onUpdateConfig, fields }: ChartShelfProps) {
  const handleDropColumn = (field: FieldItem) => {
    onUpdateConfig({ columns: [...config.columns, field] });
  };

  const handleDropRow = (field: FieldItem) => {
    onUpdateConfig({ rows: [...config.rows, field] });
  };

  const handleDropColor = (field: FieldItem) => {
    onUpdateConfig({ color: field });
  };

  const handleDropSize = (field: FieldItem) => {
    onUpdateConfig({ size: field });
  };

  const handleRemoveColumn = (index: number) => {
    const newColumns = config.columns.filter((_, i) => i !== index);
    onUpdateConfig({ columns: newColumns });
  };

  const handleRemoveRow = (index: number) => {
    const newRows = config.rows.filter((_, i) => i !== index);
    onUpdateConfig({ rows: newRows });
  };

  const handleRemoveColor = () => {
    onUpdateConfig({ color: undefined });
  };

  const handleRemoveSize = () => {
    onUpdateConfig({ size: undefined });
  };

  return (
    <div className="p-4 space-y-3">
      {/* Columns Shelf */}
      <DropZone
        label="Columns"
        items={config.columns}
        onDrop={handleDropColumn}
        onRemove={handleRemoveColumn}
      />

      {/* Rows Shelf */}
      <DropZone
        label="Rows"
        items={config.rows}
        onDrop={handleDropRow}
        onRemove={handleRemoveRow}
      />

      {/* Additional Properties */}
      <div className="flex space-x-4">
        {/* Color */}
        <div className="flex-1">
          <DropZone
            label="Color"
            items={config.color ? [config.color] : []}
            onDrop={handleDropColor}
            onRemove={handleRemoveColor}
            maxItems={1}
          />
        </div>

        {/* Size */}
        <div className="flex-1">
          <DropZone
            label="Size"
            items={config.size ? [config.size] : []}
            onDrop={handleDropSize}
            onRemove={handleRemoveSize}
            maxItems={1}
            accept="measure"
          />
        </div>
      </div>
    </div>
  );
}
