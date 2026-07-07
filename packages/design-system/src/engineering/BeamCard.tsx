
import * as React from "react"
import { Card, CardHeader, CardTitle, CardContent } from "../core/Card"
import { cn } from "../utils"

export interface BeamCardProps {
  beamId: string;
  section: string;
  length: number;
  yieldStrength: number;
  status: 'optimal' | 'yielding' | 'failed';
  className?: string;
}

export const BeamCard: React.FC<BeamCardProps> = ({ beamId, section, length, yieldStrength, status, className }) => {
  const statusColors = {
    optimal: "text-green-500",
    yielding: "text-yellow-500",
    failed: "text-red-500"
  };

  return (
    <Card className={cn("w-full max-w-sm font-mono text-sm", className)}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg">Beam: {beamId}</CardTitle>
          <span className={cn("font-bold uppercase text-xs", statusColors[status])}>{status}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-1">
        <div className="flex justify-between border-b border-subtle pb-1">
          <span className="text-muted">Section</span>
          <span>{section}</span>
        </div>
        <div className="flex justify-between border-b border-subtle py-1">
          <span className="text-muted">Length (m)</span>
          <span className="tabular-nums">{length.toFixed(2)}</span>
        </div>
        <div className="flex justify-between pt-1">
          <span className="text-muted">Yield (MPa)</span>
          <span className="tabular-nums">{yieldStrength.toFixed(1)}</span>
        </div>
      </CardContent>
    </Card>
  )
}
