import { useDrag } from 'react-dnd';
import { Hash, Type, Calendar, Folder } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';

interface FieldItem {
  name: string;
  type: 'dimension' | 'measure';
  dataType: 'string' | 'number' | 'date';
}

interface DataPanelProps {
  fields: FieldItem[];
}

function DraggableField({ field }: { field: FieldItem }) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'FIELD',
    item: field,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  const getIcon = () => {
    if (field.dataType === 'number') return <Hash className="w-4 h-4" />;
    if (field.dataType === 'date') return <Calendar className="w-4 h-4" />;
    return <Type className="w-4 h-4" />;
  };

  const getColor = () => {
    if (field.type === 'measure') return 'text-blue-600';
    return 'text-green-600';
  };

  return (
    <div
      ref={drag}
      className={`flex items-center space-x-2 p-2 rounded cursor-move hover:bg-gray-100 transition-colors ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <div className={getColor()}>{getIcon()}</div>
      <span className="text-gray-900">{field.name}</span>
    </div>
  );
}

export function DataPanel({ fields }: DataPanelProps) {
  const dimensions = fields.filter(f => f.type === 'dimension');
  const measures = fields.filter(f => f.type === 'measure');

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <h2 className="text-gray-900">Data</h2>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Dimensions */}
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <Folder className="w-4 h-4 text-green-600" />
              <h3 className="text-gray-900">Dimensions</h3>
            </div>
            <div className="space-y-1">
              {dimensions.map((field) => (
                <DraggableField key={field.name} field={field} />
              ))}
            </div>
          </div>

          <Separator />

          {/* Measures */}
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <Hash className="w-4 h-4 text-blue-600" />
              <h3 className="text-gray-900">Measures</h3>
            </div>
            <div className="space-y-1">
              {measures.map((field) => (
                <DraggableField key={field.name} field={field} />
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Legend */}
      <div className="p-4 border-t bg-gray-50">
        <p className="text-gray-600 mb-2">Field Types:</p>
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <Type className="w-4 h-4 text-green-600" />
            <span className="text-gray-600">Dimension (categorical)</span>
          </div>
          <div className="flex items-center space-x-2">
            <Hash className="w-4 h-4 text-blue-600" />
            <span className="text-gray-600">Measure (numerical)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
