import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/src/components/ui/card';

interface StatCardProps {
  title: string;
  description: string;
  value: string;
  delta?: {
    value: string;
    intent: 'up' | 'down' | 'steady';
  };
}

const deltaStyles = {
  up: 'text-success',
  down: 'text-danger',
  steady: 'text-slate-400'
};

const deltaPrefixes = {
  up: '▲',
  down: '▼',
  steady: '■'
};

export function StatCard({ title, description, value, delta }: StatCardProps) {
  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between">
          <span className="text-3xl font-semibold text-slate-100">{value}</span>
          {delta ? (
            <span className={`text-sm font-medium ${deltaStyles[delta.intent]}`}>
              {deltaPrefixes[delta.intent]} {delta.value}
            </span>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
